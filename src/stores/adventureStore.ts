import { create } from 'zustand'
import type {
  Dungeon,
  DungeonRun,
  DungeonFloor,
  Resources,
  AnyItem,
  BlessingId,
  TacticalPreset,
  AdventureRunConfig,
  AdventureReport,
  AdventureReportSummary,
} from '../types'
import { SUPPLY_COSTS } from '../types/adventure'
import type { SupplyLevel } from '../types/adventure'
import { useSectStore } from './sectStore'
import { emitEvent } from './eventLogStore'
import { DUNGEONS } from '../data/events'
import { generateDungeonRun } from '../systems/roguelike/MapGenerator'
import { resolveEvent } from '../systems/roguelike/EventSystem'
import type { CombatUnit } from '../systems/combat/CombatEngine'
import { createCharacterCombatUnit } from '../data/enemies'
import { getMaxSimultaneousRuns } from '../systems/character/CharacterEngine'
import { DISPATCH_MISSIONS } from '../data/missions'
import { generatePet, tryCapturePet } from '../systems/pet/PetSystem'
import type { PetQuality } from '../systems/pet/PetSystem'
import {
  applyRunCombatModifiers,
  applyRunRecovery,
  applyRunRewardModifiers,
  getShopCostMultiplier,
  pickBlessingOptions,
  pickRelicReward,
} from '../systems/roguelike/RunBuildSystem'
import { resolveAutomatedRun } from '../systems/roguelike/AutoRunEngine'
import { getArchiveMilestoneDef, unlockArchiveMilestone } from '../data/archiveMilestones'
import { BLESSINGS } from '../data/blessings'
import { RELICS } from '../data/relics'

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

export interface DispatchState {
  characterId: string
  missionId: string
  progress: number
  duration: number
}

export interface AdventureStore {
  /** All currently active dungeon runs, keyed by run id (Record for JSON serialization) */
  activeRuns: Record<string, DungeonRun>

  /** Recent automation report summaries */
  reports: AdventureReportSummary[]

  /** Full automation reports keyed by id */
  reportDetails: Record<string, AdventureReport>

  /** The dungeon definitions available */
  dungeons: Dungeon[]

  /** Previously completed dungeon IDs */
  completedDungeons: string[]

  /** Active dispatch missions */
  dispatches: DispatchState[]

  // Actions
  startRun(
    dungeonId: string,
    characterIds: string[],
    supplyLevel?: SupplyLevel,
    tacticalPreset?: TacticalPreset
  ): DungeonRun | null
  selectRoute(runId: string, routeIndex: number): boolean
  chooseBlessing(runId: string, blessingId: BlessingId): boolean
  advanceFloor(runId: string): { success: boolean; message: string }
  retreat(runId: string): void
  idleTick(runId: string, deltaSec: number): void
  tickAllIdle(deltaSec: number): void
  completeRun(runId: string, eventData?: Record<string, unknown>): void
  failRun(runId: string, eventData?: Record<string, unknown>): void
  getRun(id: string): DungeonRun | undefined
  getReport(id: string): AdventureReport | undefined
  getMaxSimultaneousRuns(): number
  reset(): void
  runAutomation(config: AdventureRunConfig): AdventureReport | null

  // Dispatch
  startDispatch(characterId: string, missionId: string): void
  tickDispatches(deltaSec: number): void
  collectDispatchReward(characterId: string): void
  getActiveDispatchCount(): number

  // Shop
  buyFromShop(runId: string, offerIndex: number): void
  closeShop(runId: string): void

  // Pet
  attemptPetCapture(runId: string): boolean
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Seconds per floor in idle mode */
const FLOOR_TICK_SECONDS = 10
const REPORT_LIMIT = 30

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _runCounter = 0

function generateRunId(): string {
  return 'run_' + Date.now() + '_' + ++_runCounter
}

/** Find a dungeon by its ID */
function findDungeon(dungeonId: string): Dungeon | undefined {
  return DUNGEONS.find((d) => d.id === dungeonId)
}

/** Pick safest route index (lowest risk) from a floor */
function pickSafestRoute(floor: DungeonFloor): number {
  const riskOrder: Record<string, number> = { low: 0, medium: 1, high: 2 }
  return floor.routes.reduce(
    (best, route, idx) =>
      (riskOrder[route.riskLevel] ?? 2) < (riskOrder[floor.routes[best].riskLevel] ?? 2) ? idx : best,
    0
  )
}

/** Empty Resources object */
function emptyResources(): Resources {
  return {
    spiritStone: 0,
    spiritEnergy: 0,
    herb: 0,
    ore: 0,
  }
}

function summarizeReport(report: AdventureReport): AdventureReportSummary {
  return {
    id: report.id,
    dungeonId: report.dungeonId,
    teamCharacterIds: [...report.teamCharacterIds],
    strategy: report.config.automationStrategy,
    tacticalPreset: report.config.tacticalPreset,
    startedAt: report.startedAt,
    finishedAt: report.finishedAt,
    result: report.result,
    floorsCleared: report.floorsCleared,
    rewards: { ...report.rewards },
    itemRewardCount: report.itemRewards.length,
  }
}

/** Deposit resources into sectStore via addResource */
function depositResourcesToSect(resources: Resources): void {
  const sectStore = useSectStore.getState()
  for (const [key, value] of Object.entries(resources)) {
    if (value > 0) {
      sectStore.addResource(key as keyof Resources, value)
    }
  }
}

/** Deposit resources at a given fraction (truncated) */
function depositFractionResourcesToSect(resources: Resources, fraction: number): void {
  const sectStore = useSectStore.getState()
  for (const [key, value] of Object.entries(resources)) {
    const amount = Math.floor(value * fraction)
    if (amount > 0) {
      sectStore.addResource(key as keyof Resources, amount)
    }
  }
}

/** Deposit item rewards into sectStore vault */
function depositItemsToVault(items: AnyItem[]): void {
  const sectStore = useSectStore.getState()
  for (const item of items) {
    sectStore.addToVault(item)
  }
}

/** Get the sect's effective level from mainHall building */
function getSectLevel(): number {
  const { sect } = useSectStore.getState()
  const mainHall = sect.buildings.find((b) => b.type === 'mainHall')
  const mainHallLevel = mainHall?.level ?? 1
  // Derive sect level from mainHall level (matches CharacterEngine.calcSectLevel)
  const table = [1, 3, 5, 8, 10]
  let level = 1
  for (let i = 0; i < table.length; i++) {
    if (mainHallLevel >= table[i]) level = i + 1
    else break
  }
  return level
}

/** Set character to resting with a recovery timer (reuses injuryTimer) */
function setCharacterResting(charId: string, timerSec: number): void {
  const sectStore = useSectStore.getState()
  sectStore.setCharacterStatus(charId, 'resting', { injuryTimer: timerSec })
}

function unlockSectMilestone(id: 'firstDungeonClear'): void {
  const { sect } = useSectStore.getState()
  const nextMilestones = unlockArchiveMilestone(sect.archiveMilestones, id)
  if (nextMilestones.length === sect.archiveMilestones.length) return

  const def = getArchiveMilestoneDef(id)
  useSectStore.setState((s) => ({
    sect: {
      ...s.sect,
      archiveMilestones: nextMilestones,
    },
  }))
  emitEvent('milestone', `宗门里程碑达成：${def.title}`)
}

/** Count vault items matching a given recipeId */
function countVaultItemsByRecipeId(recipeId: string): number {
  const { sect } = useSectStore.getState()
  return sect.vault.reduce((sum, s) => {
    if (s.item.type === 'consumable' && (s.item as any).recipeId === recipeId) {
      return sum + s.quantity
    }
    return sum
  }, 0)
}

/** Remove N items from vault matching a given recipeId. Returns number actually removed. */
function removeVaultItemsByRecipeId(recipeId: string, count: number): number {
  const { sect } = useSectStore.getState()
  let remaining = count
  const newVault = [...sect.vault]
  for (let i = newVault.length - 1; i >= 0 && remaining > 0; i--) {
    const s = newVault[i]
    if (s.item.type === 'consumable' && (s.item as any).recipeId === recipeId) {
      if (s.quantity <= remaining) {
        remaining -= s.quantity
        newVault.splice(i, 1)
      } else {
        newVault[i] = { ...s, quantity: s.quantity - remaining }
        remaining = 0
      }
    }
  }
  if (newVault.length !== sect.vault.length) {
    useSectStore.setState((s) => ({ sect: { ...s.sect, vault: newVault } }))
  }
  return count - remaining
}

/** Build CombatUnits from alive team members in a run */
function buildAliveTeamUnits(run: DungeonRun): CombatUnit[] {
  const { sect } = useSectStore.getState()
  const units: CombatUnit[] = []

  for (const charId of run.teamCharacterIds) {
    const memberState = run.memberStates[charId]
    if (!memberState || memberState.status === 'dead') continue

    const character = sect.characters.find((c) => c.id === charId)
    if (!character) continue

    const unit = createCharacterCombatUnit(character, character.learnedTechniques)
    const tunedUnit = applyRunCombatModifiers(unit, run.blessings ?? [], run.relics ?? [])
    // Override HP with current member state HP (not max)
    tunedUnit.hp = memberState.currentHp
    tunedUnit.maxHp = memberState.maxHp
    tunedUnit.preset = run.tacticalPreset ?? 'balanced'
    units.push(tunedUnit)
  }

  return units
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const useAdventureStore = create<AdventureStore>((set, get) => ({
  activeRuns: {},
  reports: [],
  reportDetails: {},
  dungeons: DUNGEONS,
  completedDungeons: [],
  dispatches: [],

  startRun: (dungeonId, characterIds, supplyLevel = 'basic', tacticalPreset = 'balanced') => {
    const state = get()
    const dungeon = findDungeon(dungeonId)
    if (!dungeon) return null

    // 1. Check active run count
    const maxRuns = state.getMaxSimultaneousRuns()
    if (Object.keys(state.activeRuns).length >= maxRuns) return null

    // 2. Check team size (1-5)
    if (characterIds.length < 1 || characterIds.length > 5) return null

    const sectStore = useSectStore.getState()
    const { sect } = sectStore

    // 3. Check and consume supply costs
    const supplyCost = SUPPLY_COSTS[supplyLevel]

    // 3a. Check spirit stone cost
    if (sect.resources.spiritStone < supplyCost.spiritStone) return null

    // 3b. Check vault item costs
    for (const [recipeId, requiredCount] of Object.entries(supplyCost.vaultItems)) {
      if (countVaultItemsByRecipeId(recipeId) < requiredCount) return null
    }

    // 3c. Consume spirit stones
    sectStore.spendResource('spiritStone', supplyCost.spiritStone)

    // 3d. Consume vault items
    for (const [recipeId, requiredCount] of Object.entries(supplyCost.vaultItems)) {
      removeVaultItemsByRecipeId(recipeId, requiredCount)
    }

    // 4. Validate each character
    const memberStates: DungeonRun['memberStates'] = {}
    for (const charId of characterIds) {
      const character = sect.characters.find((c) => c.id === charId)
      if (!character) return null

      // Check status: must be idle or resting (not adventuring)
      if (character.status !== 'idle' && character.status !== 'resting') return null

      // Check not already in another run
      for (const run of Object.values(state.activeRuns)) {
        if (run.teamCharacterIds.includes(charId)) return null
      }

      // Build combat unit for HP calculation
      const unit = createCharacterCombatUnit(character, character.learnedTechniques)

      memberStates[charId] = {
        currentHp: unit.maxHp,
        maxHp: unit.maxHp,
        status: 'alive',
      }
    }

    // 6. Set all character statuses to 'adventuring'
    for (const charId of characterIds) {
      sectStore.setCharacterStatus(charId, 'adventuring')
    }

    // 7. Generate dungeon floors
    const floors = generateDungeonRun(dungeon)

    // 8. Create run
    const runId = generateRunId()
    const run: DungeonRun = {
      id: runId,
      dungeonId,
      teamCharacterIds: [...characterIds],
      currentFloor: 1,
      floors,
      memberStates,
      totalRewards: emptyResources(),
      itemRewards: [],
      eventLog: [{ timestamp: Date.now(), message: `进入${dungeon.name}` }],
      status: 'active',
      floorTimer: 0,
      supplyLevel,
      rewardMultiplier: supplyCost.rewardMultiplier,
      pendingShopOffers: [],
      tacticalPreset,
      blessings: [],
      relics: [],
      branchTags: [],
      pendingBlessingOptions: [],
    }

    set((s) => ({
      activeRuns: { ...s.activeRuns, [runId]: run },
    }))

    // Update adventure stats on sect store
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        stats: {
          ...s.sect.stats,
          totalAdventureRuns: s.sect.stats.totalAdventureRuns + 1,
          totalSpiritStoneSpent: s.sect.stats.totalSpiritStoneSpent + supplyCost.spiritStone,
        },
      },
    }))

    emitEvent('adventure_start', `队伍进入秘境 ${dungeon.name}`)

    return run
  },

  runAutomation: (config) => {
    const state = get()
    const dungeon = findDungeon(config.dungeonId)
    if (!dungeon) return null

    const startedRun = state.startRun(
      config.dungeonId,
      config.teamCharacterIds,
      config.supplyLevel ?? 'basic',
      config.tacticalPreset ?? 'balanced'
    )
    if (!startedRun) return null

    const { sect } = useSectStore.getState()
    const baseTeamUnits = config.teamCharacterIds
      .map((charId) => {
        const character = sect.characters.find((c) => c.id === charId)
        return character ? createCharacterCombatUnit(character, character.learnedTechniques) : null
      })
      .filter((unit): unit is CombatUnit => unit !== null)

    if (baseTeamUnits.length !== config.teamCharacterIds.length) {
      get().retreat(startedRun.id)
      return null
    }

    const report = resolveAutomatedRun({
      run: startedRun,
      dungeon,
      automationStrategy: config.automationStrategy,
      baseTeamUnits,
    })

    const finalRun: DungeonRun = {
      ...startedRun,
      currentFloor: report.floorsCleared + 1,
      memberStates: Object.fromEntries(
        Object.entries(report.finalMemberStates).map(([id, state]) => [id, { ...state }])
      ),
      totalRewards: { ...report.rewards },
      itemRewards: [...report.itemRewards],
      status: 'active',
    }

    set((s) => ({
      activeRuns: {
        ...s.activeRuns,
        [startedRun.id]: finalRun,
      },
    }))

    const reportEventData = {
      reportId: report.id,
      dungeonId: report.dungeonId,
      result: report.result,
      floorsCleared: report.floorsCleared,
    }

    if (report.result === 'completed') {
      get().completeRun(startedRun.id, reportEventData)
    } else if (report.result === 'failed') {
      get().failRun(startedRun.id, reportEventData)
    } else {
      get().retreat(startedRun.id)
      emitEvent('adventure_fail', `秘境 ${dungeon.name} 撤退`, reportEventData)
    }

    const summary = summarizeReport(report)
    set((s) => {
      const nextReports = [summary, ...s.reports.filter((existing) => existing.id !== summary.id)].slice(
        0,
        REPORT_LIMIT
      )
      const nextDetails = { ...s.reportDetails, [report.id]: report }
      const keepIds = new Set(nextReports.map((item) => item.id))
      for (const id of Object.keys(nextDetails)) {
        if (!keepIds.has(id)) delete nextDetails[id]
      }

      return {
        reports: nextReports,
        reportDetails: nextDetails,
      }
    })

    return report
  },

  selectRoute: (runId, routeIndex) => {
    const state = get()
    const run = state.activeRuns[runId]
    if (!run || run.status !== 'active') return false

    const floor = run.floors[run.currentFloor - 1]
    if (!floor) return false

    if (routeIndex < 0 || routeIndex >= floor.routes.length) return false

    // Get alive team
    const aliveUnits = buildAliveTeamUnits(run)
    if (aliveUnits.length === 0) {
      get().failRun(runId)
      return false
    }

    const route = floor.routes[routeIndex]
    const newMemberStates = { ...run.memberStates }
    const newRewards = { ...run.totalRewards }
    const newItemRewards = [...run.itemRewards]
    const newLog = [...run.eventLog]
    let newShopOffers = run.pendingShopOffers ?? []
    let newBlessingOptions = [...(run.pendingBlessingOptions ?? [])]
    const newBlessings = [...(run.blessings ?? [])]
    const newRelics = [...(run.relics ?? [])]
    const newBranchTags = run.branchTags.includes(route.riskLevel)
      ? [...run.branchTags]
      : [...run.branchTags, route.riskLevel]

    const addScaledReward = (reward: Resources) => {
      const modified = applyRunRewardModifiers(reward, newBlessings, newRelics)
      newRewards.spiritStone += Math.floor(modified.spiritStone * (run.rewardMultiplier ?? 1))
      newRewards.spiritEnergy += Math.floor(modified.spiritEnergy * (run.rewardMultiplier ?? 1))
      newRewards.herb += Math.floor(modified.herb * (run.rewardMultiplier ?? 1))
      newRewards.ore += Math.floor(modified.ore * (run.rewardMultiplier ?? 1))
    }

    // Resolve all events on the route
    let statBattles = 0
    let statVictories = 0
    let statKills = 0
    for (const event of route.events) {
      // Rebuild alive team from updated states
      const currentUnits = buildAliveTeamUnits({ ...run, memberStates: newMemberStates })
      if (currentUnits.length === 0) break

      const result = resolveEvent(event, currentUnits, run.currentFloor)

      // Track combat stats
      if (result.combatResult) {
        statBattles++
        if (result.success) {
          statVictories++
          // Count dead enemies (hp <= 0) from combat result
          statKills += result.combatResult.enemyHp.filter((hp) => hp <= 0).length
        }
      }
      // Apply HP changes to member states
      for (const charId of run.teamCharacterIds) {
        const hpChange = result.hpChanges[charId]
        if (hpChange === undefined) continue
        const ms = newMemberStates[charId]
        if (!ms || ms.status === 'dead') continue

        ms.currentHp = Math.max(0, Math.min(ms.maxHp, ms.currentHp + hpChange))
        if (ms.currentHp <= 0) {
          ms.status = 'dead'
        } else if (ms.currentHp < ms.maxHp * 0.3) {
          ms.status = 'wounded'
        }
      }

      addScaledReward({ ...result.reward, spiritEnergy: 0 })

      // Accumulate item rewards
      for (const item of result.itemRewards) {
        newItemRewards.push(item)
      }

      // Handle technique reward (cross-store)
      if (result.techniqueReward) {
        const sectStore = useSectStore.getState()
        const firstAliveCharId = run.teamCharacterIds.find((cid) => newMemberStates[cid]?.status !== 'dead')
        if (firstAliveCharId) {
          sectStore.unlockCodexAndLearn(result.techniqueReward.techniqueId, firstAliveCharId)
        }
      }

      // Store shop offers for UI
      if (result.shopOffers && result.shopOffers.length > 0) {
        newShopOffers = result.shopOffers
      }

      // Log entry
      newLog.push({
        timestamp: Date.now(),
        message: result.message,
      })
    }

    addScaledReward({ ...route.reward, spiritEnergy: 0 })

    for (const charId of run.teamCharacterIds) {
      const memberState = newMemberStates[charId]
      if (!memberState || memberState.status === 'dead') continue

      memberState.currentHp = applyRunRecovery(memberState.currentHp, memberState.maxHp, newBlessings, newRelics)

      if (memberState.currentHp < memberState.maxHp * 0.3) {
        memberState.status = 'wounded'
      } else {
        memberState.status = 'alive'
      }
    }

    // Update combat stats on sect store
    if (statBattles > 0) {
      useSectStore.setState((s) => ({
        sect: {
          ...s.sect,
          stats: {
            ...s.sect.stats,
            totalBattles: s.sect.stats.totalBattles + statBattles,
            totalVictories: s.sect.stats.totalVictories + statVictories,
            totalKills: s.sect.stats.totalKills + statKills,
          },
        },
      }))
    }

    // Check if all members are dead
    const allDead = run.teamCharacterIds.every((cid) => newMemberStates[cid]?.status === 'dead')
    if (allDead) {
      // Update run state before failing
      set((s) => ({
        activeRuns: {
          ...s.activeRuns,
          [runId]: {
            ...s.activeRuns[runId]!,
            memberStates: newMemberStates,
            totalRewards: newRewards,
            itemRewards: newItemRewards,
            eventLog: newLog,
            pendingShopOffers: newShopOffers,
            blessings: newBlessings,
            relics: newRelics,
            branchTags: newBranchTags,
            pendingBlessingOptions: newBlessingOptions,
          },
        },
      }))
      get().failRun(runId)
      return false
    }

    // Increment currentFloor
    const nextFloor = run.currentFloor + 1

    // If next floor exceeds total floors, complete the run
    if (nextFloor > run.floors.length) {
      const relicReward = pickRelicReward(newRelics)
      if (relicReward) {
        newRelics.push(relicReward)
        newLog.push({
          timestamp: Date.now(),
          message: `获得遗物：${RELICS[relicReward].name}`,
        })
      }

      set((s) => ({
        activeRuns: {
          ...s.activeRuns,
          [runId]: {
            ...s.activeRuns[runId]!,
            currentFloor: nextFloor,
            memberStates: newMemberStates,
            totalRewards: newRewards,
            itemRewards: newItemRewards,
            eventLog: newLog,
            pendingShopOffers: newShopOffers,
            blessings: newBlessings,
            relics: newRelics,
            branchTags: newBranchTags,
            pendingBlessingOptions: newBlessingOptions,
          },
        },
      }))
      get().completeRun(runId)
      return true
    }

    if (nextFloor % 2 === 1 && newBlessings.length < 4 && newBlessingOptions.length === 0) {
      newBlessingOptions = pickBlessingOptions(newBlessings)
      if (newBlessingOptions.length > 0) {
        newLog.push({
          timestamp: Date.now(),
          message: '感悟到新的机缘，可择一祝福。',
        })
      }
    }

    // Update run with new floor and states
    set((s) => ({
      activeRuns: {
        ...s.activeRuns,
        [runId]: {
          ...s.activeRuns[runId]!,
          currentFloor: nextFloor,
          memberStates: newMemberStates,
          totalRewards: newRewards,
          itemRewards: newItemRewards,
          eventLog: newLog,
          pendingShopOffers: newShopOffers,
          blessings: newBlessings,
          relics: newRelics,
          branchTags: newBranchTags,
          pendingBlessingOptions: newBlessingOptions,
        },
      },
    }))

    return true
  },

  chooseBlessing: (runId, blessingId) => {
    const run = get().activeRuns[runId]
    if (!run) return false
    if (!(run.pendingBlessingOptions ?? []).includes(blessingId)) return false

    const nextBlessings = run.blessings.includes(blessingId) ? run.blessings : [...run.blessings, blessingId]
    const nextLog = [...run.eventLog, { timestamp: Date.now(), message: `获得祝福：${BLESSINGS[blessingId].name}` }]

    set((s) => ({
      activeRuns: {
        ...s.activeRuns,
        [runId]: {
          ...s.activeRuns[runId]!,
          blessings: nextBlessings,
          pendingBlessingOptions: [],
          eventLog: nextLog,
        },
      },
    }))

    return true
  },

  advanceFloor: (runId) => {
    const state = get()
    const run = state.activeRuns[runId]
    if (!run || run.status !== 'active') {
      return { success: false, message: '无法前进：未找到进行中的秘境' }
    }

    // Check if there are alive members
    const hasAlive = run.teamCharacterIds.some((cid) => run.memberStates[cid]?.status !== 'dead')
    if (!hasAlive) {
      get().failRun(runId)
      return { success: false, message: '队伍已全军覆没' }
    }

    // Check if already at or past the end
    if (run.currentFloor > run.floors.length) {
      return { success: false, message: '已到达最后一层' }
    }

    // Auto-pick safest route and resolve
    const floor = run.floors[run.currentFloor - 1]
    if (!floor) {
      return { success: false, message: '楼层不存在' }
    }

    const safestIdx = pickSafestRoute(floor)
    const success = state.selectRoute(runId, safestIdx)

    if (success) {
      return { success: true, message: '前进成功' }
    }

    // selectRoute handles failRun internally if needed
    return { success: false, message: '前进失败' }
  },

  retreat: (runId) => {
    const state = get()
    const run = state.activeRuns[runId]
    if (!run || run.status !== 'active') return

    // 1. Deposit 50% of totalRewards
    depositFractionResourcesToSect(run.totalRewards, 0.5)

    // 2. Deposit all itemRewards to vault
    depositItemsToVault(run.itemRewards)

    // 3. Set member character statuses: alive -> idle, wounded/dead -> resting
    const sectStore = useSectStore.getState()
    for (const charId of run.teamCharacterIds) {
      const memberState = run.memberStates[charId]
      if (!memberState) continue

      if (memberState.status === 'alive' || memberState.status === 'wounded') {
        sectStore.setCharacterStatus(charId, 'idle')
      } else {
        // Dead characters go to resting with 60s recovery
        setCharacterResting(charId, 60)
      }
    }

    // 4. Remove run
    set((s) => {
      const newRuns = { ...s.activeRuns }
      delete newRuns[runId]
      return { activeRuns: newRuns }
    })
  },

  idleTick: (runId, deltaSec) => {
    const state = get()
    const run = state.activeRuns[runId]
    if (!run || run.status !== 'active') return

    // Check if any alive member is below 30% HP -> retreat
    for (const charId of run.teamCharacterIds) {
      const ms = run.memberStates[charId]
      if (!ms || ms.status === 'dead') continue
      if (ms.currentHp < ms.maxHp * 0.3) {
        get().retreat(runId)
        return
      }
    }

    // Check if there are alive members
    const hasAlive = run.teamCharacterIds.some((cid) => run.memberStates[cid]?.status !== 'dead')
    if (!hasAlive) {
      get().failRun(runId)
      return
    }

    // Check if we've cleared all floors
    if (run.currentFloor > run.floors.length) {
      get().completeRun(runId)
      return
    }

    // Accumulate floor timer
    const newTimer = (run.floorTimer ?? 0) + deltaSec
    if (newTimer < FLOOR_TICK_SECONDS) {
      set((s) => ({
        activeRuns: {
          ...s.activeRuns,
          [runId]: { ...s.activeRuns[runId]!, floorTimer: newTimer },
        },
      }))
      return
    }

    // Reset timer and advance floor
    set((s) => ({
      activeRuns: {
        ...s.activeRuns,
        [runId]: { ...s.activeRuns[runId]!, floorTimer: 0 },
      },
    }))

    // Auto-pick safest route and advance
    const floor = run.floors[run.currentFloor - 1]
    if (!floor) return

    const safestIdx = pickSafestRoute(floor)
    state.selectRoute(runId, safestIdx)
  },

  tickAllIdle: (deltaSec) => {
    get().tickDispatches(deltaSec)
    // Auto-collect completed dispatches
    const completed = get().dispatches.filter((d) => d.progress >= d.duration)
    for (const dispatch of completed) {
      get().collectDispatchReward(dispatch.characterId)
    }
    const state = get()
    for (const runId of Object.keys(state.activeRuns)) {
      state.idleTick(runId, deltaSec)
    }
  },

  completeRun: (runId, eventData = {}) => {
    const state = get()
    const run = state.activeRuns[runId]
    if (!run || run.status !== 'active') return

    const dungeonName = DUNGEONS.find((d) => d.id === run.dungeonId)?.name ?? run.dungeonId
    emitEvent('adventure_complete', `秘境 ${dungeonName} 通关`, eventData)
    unlockSectMilestone('firstDungeonClear')

    // Update stats: adventure completion + max floor
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        stats: {
          ...s.sect.stats,
          totalAdventureCompletions: s.sect.stats.totalAdventureCompletions + 1,
          maxFloorCleared: Math.max(s.sect.stats.maxFloorCleared, run.currentFloor - 1),
        },
      },
    }))

    // 1. Deposit 100% of totalRewards
    depositResourcesToSect(run.totalRewards)

    // 2. Deposit all itemRewards to vault
    depositItemsToVault(run.itemRewards)

    // 3. Set character statuses: alive/wounded -> idle, dead -> resting
    const sectStore = useSectStore.getState()
    for (const charId of run.teamCharacterIds) {
      const memberState = run.memberStates[charId]
      if (!memberState) continue

      if (memberState.status === 'alive' || memberState.status === 'wounded') {
        sectStore.setCharacterStatus(charId, 'idle')
      } else {
        setCharacterResting(charId, 60)
      }
    }

    // 4. Add to completed dungeons
    set((s) => {
      const newRuns = { ...s.activeRuns }
      delete newRuns[runId]
      return {
        activeRuns: newRuns,
        completedDungeons: s.completedDungeons.includes(run.dungeonId)
          ? s.completedDungeons
          : [...s.completedDungeons, run.dungeonId],
      }
    })
  },

  failRun: (runId, eventData = {}) => {
    const state = get()
    const run = state.activeRuns[runId]
    if (!run || run.status !== 'active') return

    const dungeonName = DUNGEONS.find((d) => d.id === run.dungeonId)?.name ?? run.dungeonId
    emitEvent('adventure_fail', `秘境 ${dungeonName} 失败`, eventData)

    // Update stats: adventure failure
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        stats: {
          ...s.sect.stats,
          totalAdventureFailures: s.sect.stats.totalAdventureFailures + 1,
        },
      },
    }))

    // 1. Deposit 50% of totalRewards
    depositFractionResourcesToSect(run.totalRewards, 0.5)

    // 2. Deposit all itemRewards to vault
    depositItemsToVault(run.itemRewards)

    // 3. Set ALL characters to resting (barely escaped)
    for (const charId of run.teamCharacterIds) {
      setCharacterResting(charId, 60)
    }

    // 4. Remove run
    set((s) => {
      const newRuns = { ...s.activeRuns }
      delete newRuns[runId]
      return { activeRuns: newRuns }
    })
  },

  startDispatch: (characterId, missionId) => {
    const mission = DISPATCH_MISSIONS.find((m) => m.id === missionId)
    if (!mission) return

    const state = get()
    if (state.dispatches.length >= 5) return
    if (state.dispatches.some((d) => d.characterId === characterId)) return

    const { sect } = useSectStore.getState()
    const char = sect.characters.find((c) => c.id === characterId)
    if (!char) return
    if (char.status !== 'idle') return

    useSectStore.getState().setCharacterStatus(characterId, 'patrolling')

    set((s) => ({
      dispatches: [
        ...s.dispatches,
        {
          characterId,
          missionId,
          progress: 0,
          duration: mission.duration,
        },
      ],
    }))
  },

  tickDispatches: (deltaSec: number) => {
    set((s) => ({
      dispatches: s.dispatches.map((d) => (d.progress >= d.duration ? d : { ...d, progress: d.progress + deltaSec })),
    }))
  },

  collectDispatchReward: (characterId: string) => {
    const state = get()
    const dispatchIndex = state.dispatches.findIndex((d) => d.characterId === characterId)
    if (dispatchIndex === -1) return

    const dispatch = state.dispatches[dispatchIndex]
    const mission = DISPATCH_MISSIONS.find((m) => m.id === dispatch.missionId)
    if (!mission || dispatch.progress < dispatch.duration) return

    // Apply rewards
    const resources: Resources = { spiritStone: 0, spiritEnergy: 0, herb: 0, ore: 0 }
    for (const reward of mission.rewards) {
      switch (reward.type) {
        case 'spiritStone':
          resources.spiritStone += reward.amount
          break
        case 'herb':
          resources.herb += reward.amount
          break
        case 'ore':
          resources.ore += reward.amount
          break
      }
    }
    depositResourcesToSect(resources)
    emitEvent('dispatch_complete', `派遣任务「${mission.name}」完成`)

    // Return character to idle
    useSectStore.getState().setCharacterStatus(characterId, 'idle')

    // Remove dispatch
    set((s) => ({
      dispatches: s.dispatches.filter((_, i) => i !== dispatchIndex),
    }))
  },

  getActiveDispatchCount: () => {
    return get().dispatches.length
  },

  buyFromShop: (runId: string, offerIndex: number) => {
    const run = get().activeRuns[runId]
    if (!run) return
    const offers = run.pendingShopOffers
    if (!offers || offerIndex >= offers.length) return

    const offer = offers[offerIndex]
    const finalCost = Math.floor(offer.cost * getShopCostMultiplier(run.relics ?? []))
    if (run.totalRewards.spiritStone < finalCost) return

    // Deduct cost
    const newRewards = { ...run.totalRewards, spiritStone: run.totalRewards.spiritStone - finalCost }
    const newMemberStates = { ...run.memberStates }
    const newLog = [...run.eventLog]

    if (offer.effect === 'heal') {
      for (const charId of run.teamCharacterIds) {
        const ms = newMemberStates[charId]
        if (!ms || ms.status === 'dead') continue
        const healAmount = Math.floor(ms.maxHp * offer.value)
        ms.currentHp = Math.min(ms.maxHp, ms.currentHp + healAmount)
      }
      newLog.push({ timestamp: Date.now(), message: `使用了${offer.name}，恢复生命` })
    } else if (offer.effect === 'skip') {
      // Skip current floor by advancing
      newLog.push({ timestamp: Date.now(), message: `使用了${offer.name}，跳过当前层` })
    }

    // Remove used offer
    const newOffers = [...offers]
    newOffers.splice(offerIndex, 1)

    set((s) => ({
      activeRuns: {
        ...s.activeRuns,
        [runId]: {
          ...s.activeRuns[runId]!,
          totalRewards: newRewards,
          memberStates: newMemberStates,
          eventLog: newLog,
          pendingShopOffers: newOffers,
        },
      },
    }))

    // If skip effect, advance the floor
    if (offer.effect === 'skip') {
      const nextFloor = run.currentFloor + 1
      if (nextFloor > run.floors.length) {
        get().completeRun(runId)
      } else {
        set((s) => ({
          activeRuns: {
            ...s.activeRuns,
            [runId]: {
              ...s.activeRuns[runId]!,
              currentFloor: nextFloor,
            },
          },
        }))
      }
    }
  },

  closeShop: (runId: string) => {
    const run = get().activeRuns[runId]
    if (!run) return
    set((s) => ({
      activeRuns: {
        ...s.activeRuns,
        [runId]: {
          ...s.activeRuns[runId]!,
          pendingShopOffers: [],
        },
      },
    }))
  },

  attemptPetCapture: (runId: string) => {
    const run = get().activeRuns[runId]
    if (!run) return false

    // Get the first alive team member's fortune stat
    const { sect } = useSectStore.getState()
    const firstAliveCharId = run.teamCharacterIds.find((cid) => run.memberStates[cid]?.status !== 'dead')
    if (!firstAliveCharId) return false

    const character = sect.characters.find((c) => c.id === firstAliveCharId)
    if (!character) return false

    const fortune = character.cultivationStats.fortune
    const floor = run.currentFloor

    // Determine pet quality based on floor depth
    const qualityTable: PetQuality[] = ['common', 'spirit', 'immortal', 'divine']
    const qualityIndex = floor < 3 ? 0 : floor < 6 ? 1 : floor < 9 ? 2 : 3
    const quality = qualityTable[qualityIndex]

    const success = tryCapturePet(fortune, quality)
    if (success) {
      const pet = generatePet(quality)
      useSectStore.getState().addPet(pet)

      // Update pet capture stats
      useSectStore.setState((s) => ({
        sect: {
          ...s.sect,
          stats: {
            ...s.sect.stats,
            totalPetCaptures: s.sect.stats.totalPetCaptures + 1,
          },
        },
      }))

      // Log the capture
      const newLog = [...run.eventLog, { timestamp: Date.now(), message: `成功捕获了 ${pet.name}！` }]
      set((s) => ({
        activeRuns: {
          ...s.activeRuns,
          [runId]: {
            ...s.activeRuns[runId]!,
            eventLog: newLog,
          },
        },
      }))
    } else {
      const newLog = [...run.eventLog, { timestamp: Date.now(), message: '灵兽捕获失败，灵兽逃走了...' }]
      set((s) => ({
        activeRuns: {
          ...s.activeRuns,
          [runId]: {
            ...s.activeRuns[runId]!,
            eventLog: newLog,
          },
        },
      }))
    }

    return success
  },

  getRun: (id) => {
    return get().activeRuns[id]
  },

  getReport: (id) => {
    return get().reportDetails[id]
  },

  getMaxSimultaneousRuns: () => {
    const level = getSectLevel()
    return getMaxSimultaneousRuns(level)
  },

  reset: () =>
    set({
      activeRuns: {},
      reports: [],
      reportDetails: {},
      completedDungeons: [],
      dispatches: [],
    }),
}))

// ---------------------------------------------------------------------------
// Backward-compatible helper
// ---------------------------------------------------------------------------

function isDungeonUnlocked(dungeon: Dungeon, playerRealm: number, playerStage: number): boolean {
  return (
    playerRealm > dungeon.unlockRealm || (playerRealm === dungeon.unlockRealm && playerStage >= dungeon.unlockStage)
  )
}

export { isDungeonUnlocked }
