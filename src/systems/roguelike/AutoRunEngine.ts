import type {
  AdventureReport,
  AdventureReportStep,
  AdventureReportStepType,
  AutomationStrategy,
  BlessingId,
  Dungeon,
  DungeonEvent,
  DungeonRun,
  MemberState,
  RelicId,
  Resources,
} from '../../types'
import type { CombatUnit } from '../combat/CombatEngine'
import { useSectStore } from '../../stores/sectStore'
import { BLESSING_DEFS } from '../../data/blessings'
import { RELIC_DEFS } from '../../data/relics'
import type { DiscipleMutationId, MutationCharacterProfile } from '../../data/discipleMutations'
import { getDiscipleMutationDef, pickDiscipleMutation } from '../../data/discipleMutations'
import type { RunBuildBiasContext } from '../../types/runBuild'
import { getRunBuildBiasContext } from './RunBuildContext'
import type { EventResult } from './EventSystem'
import { resolveEvent } from './EventSystem'
import {
  applyMutationCombatModifiers,
  applyMutationRewardModifiers,
  applyRunCombatModifiers,
  applyRunRecovery,
  applyRunRewardModifiers,
  getShopCostMultiplier,
  pickBlessingOptions,
  pickRelicReward,
} from './RunBuildSystem'
import {
  pickAutomationBlessing,
  pickAutomationRoute,
  pickAutomationShopOffer,
  shouldAttemptPetCapture,
  shouldRetreat,
  type AutomationContext,
} from './AutoRunPolicy'

interface PetCaptureOutcome {
  attempted: boolean
  success: boolean
  petName?: string
}

export interface ResolveAutomatedRunInput {
  run: DungeonRun
  dungeon: Dungeon
  automationStrategy: AutomationStrategy
  baseTeamUnits: CombatUnit[]
  now?: () => number
  resolveEventFn?: (
    event: DungeonEvent,
    team: CombatUnit[],
    floorNumber: number,
    teamFortune?: number,
    dungeonId?: string
  ) => EventResult
  pickBlessingOptionsFn?: (ownedBlessings: BlessingId[]) => BlessingId[]
  pickRelicRewardFn?: (ownedRelics: RelicId[]) => RelicId | null
  petCaptureFn?: (context: { strategy: AutomationStrategy; floor: number; run: DungeonRun }) => PetCaptureOutcome
  teamMutationProfiles?: Record<string, MutationCharacterProfile>
}

function cloneMemberStates(memberStates: Record<string, MemberState>): Record<string, MemberState> {
  return Object.fromEntries(Object.entries(memberStates).map(([id, state]) => [id, { ...state }]))
}

function buildTeamSnapshot(run: DungeonRun, baseTeamUnits: CombatUnit[]): AdventureReport['teamSnapshot'] {
  const liveCharacters = useSectStore.getState().sect.characters

  return Object.fromEntries(
    run.teamCharacterIds.map((charId) => {
      const character = liveCharacters.find((item) => item.id === charId)
      const unit = baseTeamUnits.find((item) => item.id === charId)

      return [
        charId,
        {
          name: character?.name ?? unit?.name ?? charId,
          quality: character?.quality ?? 'common',
          realm: character?.realm ?? 0,
          realmStage: character?.realmStage ?? 0,
        },
      ]
    })
  )
}

/** Compute the average fortune of the team characters. */
function computeTeamFortune(characterIds: string[]): number | undefined {
  const characters = useSectStore.getState().sect.characters
  const teamChars = characterIds
    .map((id) => characters.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => c !== null && c !== undefined)
  if (teamChars.length === 0) return undefined
  return teamChars.reduce((sum, c) => sum + c.cultivationStats.fortune, 0) / teamChars.length
}

function buildTeamUnits(
  run: DungeonRun,
  baseTeamUnits: CombatUnit[],
  discipleMutations: Record<string, DiscipleMutationId[]>
): CombatUnit[] {
  const petIds = new Set(baseTeamUnits.filter((u) => !run.teamCharacterIds.includes(u.id)).map((u) => u.id))

  return baseTeamUnits
    .filter((unit) => run.teamCharacterIds.includes(unit.id) || petIds.has(unit.id))
    .map((unit) => {
      // Pet units are not tracked in memberStates; they always use base stats
      if (petIds.has(unit.id)) {
        return {
          ...unit,
          buffs: [],
          shield: 0,
          preset: run.tacticalPreset,
        }
      }
      const memberState = run.memberStates[unit.id]
      const withMutation = applyMutationCombatModifiers(unit, discipleMutations[unit.id] ?? [])
      const withBlessingRelic = applyRunCombatModifiers(
        {
          ...withMutation,
          hp: memberState?.currentHp ?? unit.hp,
          maxHp: memberState?.maxHp ?? unit.maxHp,
        },
        run.blessings,
        run.relics
      )
      return {
        ...withBlessingRelic,
        buffs: [],
        shield: 0,
        preset: run.tacticalPreset,
      }
    })
    .filter((unit) => unit.hp > 0)
}

function collectTeamMutationProfiles(
  run: DungeonRun,
  provided: Record<string, MutationCharacterProfile> = {}
): Record<string, MutationCharacterProfile> {
  const fallbackCharacters = useSectStore.getState().sect.characters
  return Object.fromEntries(
    run.teamCharacterIds.flatMap((charId) => {
      const providedProfile = provided[charId]
      if (providedProfile) return [[charId, providedProfile]]

      const character = fallbackCharacters.find((item) => item.id === charId)
      if (!character) return []

      return [
        [
          charId,
          {
            cultivationPath: character.cultivationPath,
            specialties: character.specialties.map((specialty) => ({ type: specialty.type })),
            fateTags: [...character.fateTags],
          },
        ],
      ]
    })
  )
}

function collectAliveMutationIds(
  run: DungeonRun,
  discipleMutations: Record<string, DiscipleMutationId[]>
): DiscipleMutationId[] {
  return run.teamCharacterIds.flatMap((charId) =>
    run.memberStates[charId]?.status === 'dead' ? [] : (discipleMutations[charId] ?? [])
  )
}

function maybeGrantMutation(
  run: DungeonRun,
  discipleMutations: Record<string, DiscipleMutationId[]>,
  teamMutationProfiles: Record<string, MutationCharacterProfile>,
  biasContext: RunBuildBiasContext,
  rng: () => number = Math.random
): { targetId: string; mutationId: DiscipleMutationId } | null {
  const candidates = run.teamCharacterIds
    .filter((charId) => run.memberStates[charId]?.status !== 'dead')
    .sort((a, b) => (discipleMutations[a]?.length ?? 0) - (discipleMutations[b]?.length ?? 0))

  for (const charId of candidates) {
    const profile = teamMutationProfiles[charId]
    if (!profile) continue
    const owned = discipleMutations[charId] ?? []
    if (owned.length >= 2) continue

    const mutationId = pickDiscipleMutation(profile, owned, rng, biasContext)
    if (!mutationId) continue

    return { targetId: charId, mutationId }
  }

  return null
}

function buildContext(run: DungeonRun): AutomationContext {
  const activeMembers = run.teamCharacterIds
    .map((id) => run.memberStates[id])
    .filter((state): state is MemberState => Boolean(state) && state.status !== 'dead')

  if (activeMembers.length === 0) {
    return {
      averageHpRatio: 0,
      lowestHpRatio: 0,
      currentRewards: { ...run.totalRewards },
      currentFloor: run.currentFloor,
      totalFloors: run.floors.length,
      blessings: [...run.blessings],
      relics: [...run.relics],
    }
  }

  const ratios = activeMembers.map((state) => state.currentHp / state.maxHp)
  const averageHpRatio = ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length

  return {
    averageHpRatio,
    lowestHpRatio: Math.min(...ratios),
    currentRewards: { ...run.totalRewards },
    currentFloor: run.currentFloor,
    totalFloors: run.floors.length,
    blessings: [...run.blessings],
    relics: [...run.relics],
  }
}

function addRewards(target: Resources, reward: Partial<Resources>): void {
  target.spiritStone += reward.spiritStone ?? 0
  target.spiritEnergy += reward.spiritEnergy ?? 0
  target.herb += reward.herb ?? 0
  target.ore += reward.ore ?? 0
}

function nextStepIdFactory() {
  let counter = 0
  return () => `step_${++counter}`
}

export function resolveAutomatedRun(input: ResolveAutomatedRunInput): AdventureReport {
  const now = input.now ?? Date.now
  const resolveEventFn = input.resolveEventFn ?? resolveEvent
  const biasContext = getRunBuildBiasContext()
  const pickBlessingOptionsFn =
    input.pickBlessingOptionsFn ?? ((owned) => pickBlessingOptions(owned, 3, Math.random, biasContext))
  const pickRelicRewardFn = input.pickRelicRewardFn ?? ((owned) => pickRelicReward(owned))
  const petCaptureFn =
    input.petCaptureFn ??
    (() => ({
      attempted: false,
      success: false,
    }))

  const stepId = nextStepIdFactory()
  const steps: AdventureReportStep[] = []
  const startedAt = now()
  const teamMutationProfiles = collectTeamMutationProfiles(input.run, input.teamMutationProfiles)
  const discipleMutations: Record<string, DiscipleMutationId[]> = Object.fromEntries(
    input.run.teamCharacterIds.map((charId) => [charId, []])
  )
  const teamSnapshot = buildTeamSnapshot(input.run, input.baseTeamUnits)
  const teamFortune = computeTeamFortune(input.run.teamCharacterIds)

  const run: DungeonRun = {
    ...input.run,
    teamCharacterIds: [...input.run.teamCharacterIds],
    floors: input.run.floors.map((floor) => ({
      ...floor,
      routes: floor.routes.map((route) => ({
        ...route,
        events: route.events.map((event) => ({ ...event })),
        reward: { ...route.reward },
      })),
    })),
    memberStates: cloneMemberStates(input.run.memberStates),
    totalRewards: { ...input.run.totalRewards },
    itemRewards: [...input.run.itemRewards],
    eventLog: [...input.run.eventLog],
    pendingShopOffers: [...(input.run.pendingShopOffers ?? [])],
    blessings: [...(input.run.blessings ?? [])],
    relics: [...(input.run.relics ?? [])],
    branchTags: [...(input.run.branchTags ?? [])],
    pendingBlessingOptions: [...(input.run.pendingBlessingOptions ?? [])],
  }

  const pushStep = (
    type: AdventureReportStepType,
    summary: string,
    detail: string,
    decisionReason?: string,
    meta?: Record<string, unknown>
  ) => {
    steps.push({
      id: stepId(),
      type,
      timestamp: now(),
      floor: run.currentFloor <= run.floors.length ? run.currentFloor : run.floors.length,
      summary,
      detail,
      decisionReason,
      snapshot: {
        teamHp: Object.fromEntries(
          run.teamCharacterIds.map((id) => {
            const state = run.memberStates[id]
            return [id, { currentHp: state.currentHp, maxHp: state.maxHp, status: state.status }]
          })
        ),
        rewards: { ...run.totalRewards },
        blessings: [...run.blessings],
        relics: [...run.relics],
        branchTags: [...run.branchTags],
        discipleMutations: Object.fromEntries(
          Object.entries(discipleMutations).map(([charId, mutationIds]) => [charId, [...mutationIds]])
        ),
      },
      meta,
    })
  }

  pushStep(
    'run_started',
    `开始探索 ${input.dungeon.name}`,
    `以${input.automationStrategy}策略进入${input.dungeon.name}`
  )

  let result: AdventureReport['result'] = 'completed'

  while (run.currentFloor <= run.floors.length) {
    const floor = run.floors[run.currentFloor - 1]
    if (!floor) break

    pushStep('floor_started', `第 ${run.currentFloor} 层开始`, `队伍进入第 ${run.currentFloor} 层。`)

    const currentContext = buildContext(run)
    const routeIndex = pickAutomationRoute(input.automationStrategy, floor, currentContext)
    const route = floor.routes[routeIndex] ?? floor.routes[0]

    pushStep(
      'route_considered',
      '评估路线',
      floor.routes
        .map((candidate) => `${candidate.name}（${candidate.riskLevel}风险，灵石${candidate.reward.spiritStone}）`)
        .join(' / ')
    )

    if (!run.branchTags.includes(route.riskLevel)) {
      run.branchTags.push(route.riskLevel)
    }

    pushStep(
      'route_selected',
      `选择路线：${route.name}`,
      route.description,
      `${input.automationStrategy === 'steady' ? '守成' : input.automationStrategy === 'combat' ? '争锋' : '寻机'}策略下选择${route.riskLevel === 'low' ? '低' : route.riskLevel === 'medium' ? '中' : '高'}风险路线`
    )

    for (const event of route.events) {
      const teamUnits = buildTeamUnits(run, input.baseTeamUnits, discipleMutations)
      if (teamUnits.length === 0) {
        result = 'failed'
        pushStep('run_failed', '探索失败', '队伍已无可继续战斗的成员。')
        break
      }

      const eventResult = resolveEventFn(event, teamUnits, run.currentFloor, teamFortune, run.dungeonId)

      // Build meta for the step; include full boss combat data when applicable
      const stepMeta: Record<string, unknown> = { success: eventResult.success }
      if (event.type === 'boss') {
        stepMeta.eventType = 'boss'
        stepMeta.combatResult = eventResult.combatResult
        stepMeta.bossUnit = eventResult.bossUnitSnapshot
        stepMeta.teamUnits = eventResult.teamUnitSnapshots
      }

      pushStep('event_resolved', `事件：${event.type}`, eventResult.message, undefined, stepMeta)

      let memberStateChanged = false
      for (const charId of run.teamCharacterIds) {
        const hpChange = eventResult.hpChanges[charId]
        const memberState = run.memberStates[charId]
        if (hpChange === undefined || !memberState || memberState.status === 'dead') continue

        memberState.currentHp = Math.max(0, Math.min(memberState.maxHp, memberState.currentHp + hpChange))
        memberState.status =
          memberState.currentHp <= 0 ? 'dead' : memberState.currentHp < memberState.maxHp * 0.3 ? 'wounded' : 'alive'
        memberStateChanged = true
      }

      if (memberStateChanged) {
        pushStep('member_state_changed', '队伍状态变化', '事件结算后，队伍生命与状态已更新。')
      }

      const eventReward = applyMutationRewardModifiers(
        applyRunRewardModifiers(
          {
            spiritStone: eventResult.reward.spiritStone,
            spiritEnergy: 0,
            herb: eventResult.reward.herb,
            ore: eventResult.reward.ore,
          },
          run.blessings,
          run.relics
        ),
        collectAliveMutationIds(run, discipleMutations)
      )
      addRewards(run.totalRewards, eventReward)
      run.itemRewards.push(...eventResult.itemRewards)

      if (
        eventReward.spiritStone > 0 ||
        eventReward.herb > 0 ||
        eventReward.ore > 0 ||
        eventResult.itemRewards.length > 0
      ) {
        pushStep(
          'reward_gained',
          '获得奖励',
          `灵石 +${eventReward.spiritStone}，灵草 +${eventReward.herb}，灵矿 +${eventReward.ore}`
        )
      }

      if (eventResult.shopOffers && eventResult.shopOffers.length > 0) {
        const shopIndex = pickAutomationShopOffer(
          input.automationStrategy,
          eventResult.shopOffers,
          buildContext(run),
          getShopCostMultiplier(run.relics)
        )

        if (shopIndex !== null) {
          const offer = eventResult.shopOffers[shopIndex]
          const finalCost = Math.floor(offer.cost * getShopCostMultiplier(run.relics))
          run.totalRewards.spiritStone -= finalCost

          if (offer.effect === 'heal') {
            for (const charId of run.teamCharacterIds) {
              const memberState = run.memberStates[charId]
              if (!memberState || memberState.status === 'dead') continue
              const healAmount = Math.floor(memberState.maxHp * offer.value)
              memberState.currentHp = Math.min(memberState.maxHp, memberState.currentHp + healAmount)
              memberState.status = memberState.currentHp < memberState.maxHp * 0.3 ? 'wounded' : 'alive'
            }
          }

          pushStep(
            'shop_decision',
            `购买游商物品：${offer.name}`,
            offer.description,
            `${input.automationStrategy}策略自动购买`
          )
        } else {
          pushStep('shop_decision', '放弃游商交易', '当前策略判断无需购买游商物品。')
        }
      }

      if (eventResult.petCaptureAvailable) {
        const attempt = shouldAttemptPetCapture(input.automationStrategy, buildContext(run))
        if (attempt) {
          const petResult = petCaptureFn({ strategy: input.automationStrategy, floor: run.currentFloor, run })
          pushStep(
            'pet_decision',
            petResult.success ? '尝试捕获灵兽成功' : '尝试捕获灵兽',
            petResult.success ? `成功捕获 ${petResult.petName ?? '灵兽'}` : '尝试后未能捕获灵兽。',
            `${input.automationStrategy}策略允许在当前状态下尝试捕获`
          )
        } else {
          pushStep('pet_decision', '放弃捕获灵兽', '当前策略判断队伍状态不适合分心捕获。')
        }
      }

      if (eventResult.mutationTrigger) {
        const granted = maybeGrantMutation(run, discipleMutations, teamMutationProfiles, biasContext)
        if (granted) {
          discipleMutations[granted.targetId] = [...(discipleMutations[granted.targetId] ?? []), granted.mutationId]
          const mutationDef = getDiscipleMutationDef(granted.mutationId)
          pushStep(
            'auto_choice_made',
            `弟子异变：${mutationDef.name}`,
            mutationDef.summary,
            `本次${eventResult.mutationTrigger}触发了更贴合该弟子 build 的局内异变`,
            { targetId: granted.targetId, mutationId: granted.mutationId }
          )
        }
      }

      const allDead = run.teamCharacterIds.every((id) => run.memberStates[id]?.status === 'dead')
      if (allDead) {
        result = 'failed'
        pushStep('run_failed', '探索失败', '本层战斗后队伍已全灭。')
        break
      }
    }

    if (result === 'failed') break

    const routeReward = applyMutationRewardModifiers(
      applyRunRewardModifiers(
        { spiritStone: route.reward.spiritStone, spiritEnergy: 0, herb: route.reward.herb, ore: route.reward.ore },
        run.blessings,
        run.relics
      ),
      collectAliveMutationIds(run, discipleMutations)
    )
    addRewards(run.totalRewards, routeReward)
    pushStep(
      'reward_gained',
      '结算层奖励',
      `灵石 +${routeReward.spiritStone}，灵草 +${routeReward.herb}，灵矿 +${routeReward.ore}`
    )

    for (const charId of run.teamCharacterIds) {
      const memberState = run.memberStates[charId]
      if (!memberState || memberState.status === 'dead') continue
      memberState.currentHp = applyRunRecovery(memberState.currentHp, memberState.maxHp, run.blessings, run.relics)
      memberState.status = memberState.currentHp < memberState.maxHp * 0.3 ? 'wounded' : 'alive'
    }

    const nextFloor = run.currentFloor + 1
    if (nextFloor <= run.floors.length && nextFloor % 2 === 1 && run.blessings.length < 4) {
      const blessingOptions = pickBlessingOptionsFn(run.blessings)
      if (blessingOptions.length > 0) {
        const selectedBlessing = pickAutomationBlessing(input.automationStrategy, blessingOptions)
        if (!run.blessings.includes(selectedBlessing)) {
          run.blessings.push(selectedBlessing)
        }
        pushStep(
          'blessing_decision',
          `选择祝福：${BLESSING_DEFS[selectedBlessing].name}`,
          BLESSING_DEFS[selectedBlessing].description,
          `${input.automationStrategy}策略自动选择祝福`
        )
      }
    }

    run.currentFloor = nextFloor

    if (run.currentFloor > run.floors.length) {
      const relicReward = pickRelicRewardFn(run.relics)
      if (relicReward && !run.relics.includes(relicReward)) {
        run.relics.push(relicReward)
        pushStep('auto_choice_made', `获得遗物：${RELIC_DEFS[relicReward].name}`, RELIC_DEFS[relicReward].description)
      }
      result = 'completed'
      pushStep('run_completed', '探索完成', `${input.dungeon.name} 已完成结算。`)
      break
    }

    if (shouldRetreat(input.automationStrategy, buildContext(run))) {
      result = 'retreated'
      pushStep('run_retreated', '主动撤退', `${input.automationStrategy}策略判断当前队伍状态需要回撤。`)
      break
    }
  }

  const finishedAt = now()

  return {
    id: `report_${run.id}`,
    config: {
      dungeonId: run.dungeonId,
      teamCharacterIds: [...run.teamCharacterIds],
      supplyLevel: run.supplyLevel,
      tacticalPreset: run.tacticalPreset,
      automationStrategy: input.automationStrategy,
    },
    dungeonId: run.dungeonId,
    teamCharacterIds: [...run.teamCharacterIds],
    startedAt,
    finishedAt,
    result,
    floorsCleared: result === 'completed' ? run.floors.length : run.currentFloor,
    rewards: { ...run.totalRewards },
    itemRewards: [...run.itemRewards],
    finalMemberStates: cloneMemberStates(run.memberStates),
    teamSnapshot,
    discipleMutations: Object.fromEntries(
      Object.entries(discipleMutations).map(([charId, mutationIds]) => [charId, [...mutationIds]])
    ),
    steps,
  }
}
