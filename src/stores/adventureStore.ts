import { create } from 'zustand'
import type {
  Dungeon,
  DungeonRun,
  DungeonFloor,
  Resources,
  AnyItem,
  Consumable,
  BlessingId,
  TacticalPreset,
  AdventureRunConfig,
  AdventureReport,
  AdventureReportSummary,
  AdventureMemberReturnRecord,
} from '../types'
import { SUPPLY_COSTS } from '../types/adventure'
import type { SupplyLevel } from '../types/adventure'
import { useSectStore } from './sectStore'
import { useGameStore } from './gameStore'
import { emitEvent } from './eventLogStore'
import { DUNGEONS } from '../data/events'
import { generateDungeonRun } from '../systems/roguelike/MapGenerator'
import { resolveEvent } from '../systems/roguelike/EventSystem'
import type { CombatUnit } from '../systems/combat/CombatEngine'
import { createCharacterCombatUnit } from '../data/enemies'
import { getMaxSimultaneousRuns } from '../systems/character/CharacterEngine'
import { resolveAdventureFailureOutcome } from '../systems/character/DiscipleRecoverySystem'
import { DISPATCH_MISSIONS } from '../data/missions'
import { generatePet, tryCapturePet, collectPetCombatUnits } from '../systems/pet/PetSystem'
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
import { BLESSING_DEFS } from '../data/blessings'
import { RELIC_DEFS } from '../data/relics'
import { getTechniqueById } from '../data/techniquesTable'
import {
  buildAdventureResultMessage,
  buildTechniqueUnlockMessage,
  isLegacyDungeonId,
  isLegacyTechniqueId,
} from '../data/legacyFlavor'
import { resolveLegacyExpeditionOutcome } from '../data/legacyExpeditions'
import {
  calcAdventureRouteCombatBonus,
  calcAdventureRouteRewardBonus,
  calcPetCaptureRouteBonus,
} from '../systems/sect/SectRouteSystem'
import { getRunBuildBiasContext } from '../systems/roguelike/RunBuildContext'
import { calcSectLevel } from '../systems/character/CharacterEngine'
import { getTechniqueCodexCapacity } from '../systems/technique/TechniqueSystem'
import { getPathEffects } from '../data/sectPaths'
import { buildPathEffectMap, getCombatEffects as getCombatEffectsFromMap } from '../systems/sect/SectPathEffects'
import { autoEquipForDungeon } from '../systems/equipment/AutoEquipSystem'
import type { AutoEquipResult } from '../systems/equipment/AutoEquipSystem'
import { calcEquipmentStats } from '../systems/equipment/EquipmentEngine'
import type { Equipment } from '../types/item'
import { findEquipmentById } from './sectStore/initial'
import { calcDungeonGrowth } from '../systems/character/DungeonGrowthSystem'
import { applyCharacterExperience } from '../data/levelSystem'
import { adjustTemplateConfidence } from '../systems/adventure/TemplateConfidenceSystem'
import { getTemplateRiskHook } from '../data/expeditionTemplates'

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
  retreat(runId: string): Record<string, AdventureMemberReturnRecord> | null
  idleTick(runId: string, deltaSec: number): void
  tickAllIdle(deltaSec: number): void
  completeRun(runId: string, eventData?: Record<string, unknown>): Record<string, AdventureMemberReturnRecord> | null
  failRun(runId: string, eventData?: Record<string, unknown>): Record<string, AdventureMemberReturnRecord> | null
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

function buildLegacyAdventureEventData(
  dungeon: Dungeon | undefined,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  if (!dungeon) return extra

  return {
    ...extra,
    legacyDungeonId: dungeon.legacyUnlockId ?? undefined,
    isLegacyEncounter: Boolean(dungeon.legacyUnlockId || isLegacyDungeonId(dungeon.id)),
  }
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
    riskTier: report.riskTier,
    templateId: report.templateId,
    confidenceBefore: report.confidenceBefore,
    confidenceAfter: report.confidenceAfter,
  }
}

function applyRouteRewardModifiers(reward: Resources): Resources {
  const routeId = useSectStore.getState().sect.activeRoute

  return {
    spiritStone: Math.floor(reward.spiritStone * calcAdventureRouteRewardBonus(routeId, 'spiritStone')),
    spiritEnergy: Math.floor(reward.spiritEnergy * calcAdventureRouteRewardBonus(routeId, 'spiritEnergy')),
    herb: Math.floor(reward.herb * calcAdventureRouteRewardBonus(routeId, 'herb')),
    ore: Math.floor(reward.ore * calcAdventureRouteRewardBonus(routeId, 'ore')),
  }
}

function mergeResources(base: Resources, extra: Partial<Resources>): Resources {
  return {
    spiritStone: base.spiritStone + (extra.spiritStone ?? 0),
    spiritEnergy: base.spiritEnergy + (extra.spiritEnergy ?? 0),
    herb: base.herb + (extra.herb ?? 0),
    ore: base.ore + (extra.ore ?? 0),
  }
}

function appendLegacyReportEntries(
  report: AdventureReport,
  entries: ReturnType<typeof resolveLegacyExpeditionOutcome>['reportEntries']
): AdventureReport['steps'] {
  if (entries.length === 0) return report.steps

  return [
    ...report.steps,
    ...entries.map((entry, index) => ({
      id: `legacy_step_${report.id}_${index + 1}`,
      type: entry.type,
      timestamp: report.finishedAt + index + 1,
      floor: entry.floor,
      summary: entry.summary,
      detail: entry.detail,
    })),
  ]
}

function applyRouteCombatModifiers(unit: CombatUnit): CombatUnit {
  const routeBonus = calcAdventureRouteCombatBonus(useSectStore.getState().sect.activeRoute)
  return {
    ...unit,
    atk: Math.floor(unit.atk * routeBonus.atk),
    def: Math.floor(unit.def * routeBonus.def),
    spd: Math.floor(unit.spd * routeBonus.spd),
  }
}

/** Read the petPower multiplier from sect path effects (beast path node 2). Default 1. */
function getPetPowerMultiplier(): number {
  const { sect } = useSectStore.getState()
  const effects = getPathEffects(sect.sectPath, sect.unlockedPathNodeIds)
  return effects.find((e) => e.type === 'petPower')?.value ?? 1
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

function formatDungeonLevelUpMessage(
  name: string,
  level: number,
  statBoost: { hp: number; atk: number; def: number }
): string {
  return `${name}历练有成，升至 Lv.${level}（气血 +${statBoost.hp} / 攻击 +${statBoost.atk} / 防御 +${statBoost.def}）`
}

function settleRunMembers(run: DungeonRun): Record<string, AdventureMemberReturnRecord> {
  const sectStore = useSectStore.getState()
  const outcomes: Record<string, AdventureMemberReturnRecord> = {}

  for (const charId of run.teamCharacterIds) {
    const memberState = run.memberStates[charId]
    if (!memberState) continue

    if (memberState.status === 'dead') {
      sectStore.sacrificeCharacter(charId, { source: 'adventure', reason: 'Fell inside the dungeon.' })
      outcomes[charId] = { outcome: 'sacrificed' }
    } else {
      sectStore.setCharacterStatus(charId, 'idle')
      outcomes[charId] = { outcome: 'returned' }
    }
  }

  return outcomes
}

function settleFailedRunMembers(run: DungeonRun): Record<string, AdventureMemberReturnRecord> {
  const sectStore = useSectStore.getState()
  const casualtyTolerance = sectStore.sect.automationSettings.casualtyTolerance
  const outcomes: Record<string, AdventureMemberReturnRecord> = {}

  for (const charId of run.teamCharacterIds) {
    const memberState = run.memberStates[charId]
    const character = sectStore.sect.characters.find((item) => item.id === charId)
    if (!memberState || !character) continue

    if (memberState.status === 'dead') {
      sectStore.sacrificeCharacter(charId, { source: 'adventure', reason: 'Failed to return from the dungeon.' })
      outcomes[charId] = { outcome: 'sacrificed' }
      continue
    }

    const failureOutcome = resolveAdventureFailureOutcome(character.quality, casualtyTolerance)
    if (failureOutcome.outcome === 'recovering') {
      sectStore.setCharacterRecovering(charId, failureOutcome.recoveryDays)
      outcomes[charId] = { outcome: 'recovering', recoveryDays: failureOutcome.recoveryDays }
      emitEvent(
        'adventure_fail',
        `${character.name} returned badly wounded and must rest for ${failureOutcome.recoveryDays} days.`,
        {
          characterId: charId,
          recoveryDays: failureOutcome.recoveryDays,
        }
      )
      continue
    }

    sectStore.sacrificeCharacter(charId, { source: 'adventure', reason: 'Failed to return from the dungeon.' })
    outcomes[charId] = { outcome: 'sacrificed' }
  }

  return outcomes
}

/** Deposit item rewards into sectStore vault */
function depositItemsToVault(items: AnyItem[]): void {
  const sectStore = useSectStore.getState()
  for (const item of items) {
    sectStore.addToVault(item)
  }
}

/** Execute auto-equip: move best vault items to character equipped slots */
function executeAutoEquip(characterIds: string[]): AutoEquipResult | null {
  const { sect } = useSectStore.getState()
  const result = autoEquipForDungeon(characterIds, sect.characters, sect.vault)
  if (Object.keys(result.assignments).length === 0) return null

  const sectStore = useSectStore.getState()
  for (const [charId, slots] of Object.entries(result.assignments)) {
    for (const { slotIndex, itemId } of slots) {
      // Find item in vault
      const vaultIdx = sectStore.sect.vault.findIndex((s) => s.item.type === 'equipment' && s.item.id === itemId)
      if (vaultIdx === -1) continue

      // Transfer vault 闂?character backpack
      if (!sectStore.transferItemToCharacter(charId, vaultIdx)) continue

      // Re-read state after transfer
      const char = useSectStore.getState().sect.characters.find((c) => c.id === charId)
      if (!char) continue

      // Find item in backpack
      const bpIdx = char.backpack.findIndex((s) => s.item.id === itemId)
      if (bpIdx === -1) continue

      // Equip from backpack to slot
      sectStore.equipItem(charId, bpIdx, slotIndex)
    }
  }

  return result
}

/** Return auto-equipped items from character slots back to vault */
function returnAutoEquippedItems(run: DungeonRun): void {
  if (!run.autoEquipAssignments) return
  const sectStore = useSectStore.getState()

  for (const [charId, slots] of Object.entries(run.autoEquipAssignments)) {
    for (const { slotIndex, itemId } of slots) {
      // Unequip from slot 闂?backpack
      if (!sectStore.unequipItem(charId, slotIndex)) continue

      // Re-read character after unequip
      const char = useSectStore.getState().sect.characters.find((c) => c.id === charId)
      if (!char) continue

      // Find the specific item in backpack
      const bpIdx = char.backpack.findIndex((s) => s.item.id === itemId)
      if (bpIdx === -1) continue

      // Transfer backpack 闂?vault
      sectStore.transferItemToVault(charId, bpIdx)
    }
  }
}

/** Apply comprehension growth and stat boosts to surviving characters */
function applyDungeonGrowth(
  report: AdventureReport,
  run: DungeonRun
): AdventureReport['dungeonGrowthApplied'] | undefined {
  const sectStore = useSectStore.getState()
  const growthApplied: NonNullable<AdventureReport['dungeonGrowthApplied']> = {}
  let anyGrowth = false

  // Apply comprehension growth
  if (report.comprehensionGrowth) {
    for (const [charId, techGrowth] of Object.entries(report.comprehensionGrowth)) {
      const memberState = report.finalMemberStates[charId]
      if (!memberState || memberState.status === 'dead') continue

      const character = sectStore.sect.characters.find((c) => c.id === charId)
      if (!character) continue

      const newComprehension = { ...character.techniqueComprehension }
      for (const [techId, growth] of Object.entries(techGrowth)) {
        newComprehension[techId] = Math.min(100, (newComprehension[techId] ?? 0) + growth)
      }

      // Directly update character in store
      useSectStore.setState((s) => ({
        sect: {
          ...s.sect,
          characters: s.sect.characters.map((c) =>
            c.id === charId ? { ...c, techniqueComprehension: newComprehension } : c
          ),
        },
      }))
      anyGrowth = true
    }
  }

  // Apply stat/cultivation growth for completed runs
  if (report.result === 'completed' || report.result === 'retreated') {
    for (const charId of run.teamCharacterIds) {
      const memberState = report.finalMemberStates[charId]
      if (!memberState || memberState.status === 'dead') continue

      const character = useSectStore.getState().sect.characters.find((c) => c.id === charId)
      if (!character) continue

      const growth = calcDungeonGrowth(report.floorsCleared, character.quality)

      // Only apply stat boost for completed runs
      const statBoost = report.result === 'completed' ? growth.statBoost : { hp: 0, atk: 0, def: 0 }
      const totalStatBoost = statBoost.hp + statBoost.atk + statBoost.def
      const grownCharacter = {
        ...character,
        baseStats: {
          ...character.baseStats,
          hp: character.baseStats.hp + statBoost.hp,
          atk: character.baseStats.atk + statBoost.atk,
          def: character.baseStats.def + statBoost.def,
        },
        totalCultivation: character.totalCultivation + growth.cultivationGain,
      }
      const levelResult = applyCharacterExperience(grownCharacter, growth.cultivationGain)

      useSectStore.setState((s) => ({
        sect: {
          ...s.sect,
          characters: s.sect.characters.map((c) => (c.id === charId ? levelResult.character : c)),
        },
      }))

      if (levelResult.levelsGained > 0) {
        emitEvent(
          'milestone',
          formatDungeonLevelUpMessage(levelResult.character.name, levelResult.character.level, levelResult.statBoost)
        )
      }

      growthApplied[charId] = {
        statBoost: totalStatBoost,
        cultivationGain: growth.cultivationGain,
        xpGained: levelResult.xpGained,
        levelsGained: levelResult.levelsGained,
        levelAfter: levelResult.character.level,
        statGain: levelResult.statBoost,
      }
      anyGrowth = true
    }
  }

  return anyGrowth ? growthApplied : undefined
}

/** Apply dungeon growth for manual run path (selectRoute 闂?completeRun/retreat). */
function applyManualRunGrowth(run: DungeonRun, result: 'completed' | 'retreated'): void {
  const sectStore = useSectStore.getState()

  // Apply comprehension growth
  if (run.accumulatedComprehensionGrowth) {
    for (const [charId, techGrowth] of Object.entries(run.accumulatedComprehensionGrowth)) {
      const memberState = run.memberStates[charId]
      if (!memberState || memberState.status === 'dead') continue

      const character = sectStore.sect.characters.find((c) => c.id === charId)
      if (!character) continue

      const newComprehension = { ...character.techniqueComprehension }
      for (const [techId, growth] of Object.entries(techGrowth)) {
        newComprehension[techId] = Math.min(100, (newComprehension[techId] ?? 0) + growth)
      }

      useSectStore.setState((s) => ({
        sect: {
          ...s.sect,
          characters: s.sect.characters.map((c) =>
            c.id === charId ? { ...c, techniqueComprehension: newComprehension } : c
          ),
        },
      }))
    }
  }

  // Apply stat/cultivation growth for completed runs
  if (result === 'completed') {
    for (const charId of run.teamCharacterIds) {
      const memberState = run.memberStates[charId]
      if (!memberState || memberState.status === 'dead') continue

      const character = useSectStore.getState().sect.characters.find((c) => c.id === charId)
      if (!character) continue

      const growth = calcDungeonGrowth(run.currentFloor - 1, character.quality)
      const grownCharacter = {
        ...character,
        baseStats: {
          ...character.baseStats,
          hp: character.baseStats.hp + growth.statBoost.hp,
          atk: character.baseStats.atk + growth.statBoost.atk,
          def: character.baseStats.def + growth.statBoost.def,
        },
        totalCultivation: character.totalCultivation + growth.cultivationGain,
      }
      const levelResult = applyCharacterExperience(grownCharacter, growth.cultivationGain)

      useSectStore.setState((s) => ({
        sect: {
          ...s.sect,
          characters: s.sect.characters.map((c) => (c.id === charId ? levelResult.character : c)),
        },
      }))

      if (levelResult.levelsGained > 0) {
        emitEvent(
          'milestone',
          formatDungeonLevelUpMessage(levelResult.character.name, levelResult.character.level, levelResult.statBoost)
        )
      }
    }
  }
}

function unlockSectMilestone(
  id: 'firstDungeonClear' | 'firstDungeonLevel10' | 'adventureRuns10' | 'firstPetCapture' | 'guixuRiftFirstClear'
): void {
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
  emitEvent('milestone', `Milestone reached: ${def.title}`)
}

/** Count vault items matching a given recipeId */
function countVaultItemsByRecipeId(recipeId: string): number {
  const { sect } = useSectStore.getState()
  return sect.vault.reduce((sum, s) => {
    if (s.item.type === 'consumable' && (s.item as Consumable).recipeId === recipeId) {
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
    if (s.item.type === 'consumable' && (s.item as Consumable).recipeId === recipeId) {
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

/** Get combat effects from sect path for use in combat unit creation and simulation. */
function getSectCombatEffects(): import('../systems/sect/SectPathEffects').SectPathCombatEffects {
  const { sect } = useSectStore.getState()
  const effectMap = buildPathEffectMap(sect.sectPath, sect.unlockedPathNodeIds)
  return getCombatEffectsFromMap(effectMap)
}

/** Build CombatUnits from alive team members and their pets in a run */
function buildAliveTeamUnits(run: DungeonRun): CombatUnit[] {
  const { sect } = useSectStore.getState()
  const units: CombatUnit[] = []

  const aliveCharacters: { id: string; petIds: string[] }[] = []

  const sectCombatEffects = getSectCombatEffects()

  for (const charId of run.teamCharacterIds) {
    const memberState = run.memberStates[charId]
    if (!memberState || memberState.status === 'dead') continue

    const character = sect.characters.find((c) => c.id === charId)
    if (!character) continue

    // Compute equipment stats from character's equipped gear
    const eqStats = calcEquipmentStats(
      character.equippedGear,
      [],
      (id: string) => findEquipmentById(sect, id) as Equipment | undefined
    )

    const unit = createCharacterCombatUnit(character, character.learnedTechniques, sectCombatEffects, eqStats)
    const tunedUnit = applyRouteCombatModifiers(applyRunCombatModifiers(unit, run.blessings ?? [], run.relics ?? []))
    // Override HP with current member state HP (not max)
    tunedUnit.hp = memberState.currentHp
    tunedUnit.maxHp = memberState.maxHp
    tunedUnit.preset = run.tacticalPreset ?? 'balanced'
    units.push(tunedUnit)

    aliveCharacters.push({ id: character.id, petIds: character.petIds })
  }

  // Append pet combat units for alive characters
  const petPowerMult = getPetPowerMultiplier()
  const petUnits = collectPetCombatUnits(aliveCharacters, sect.pets, petPowerMult)
  for (const petUnit of petUnits) {
    const tunedPet = applyRouteCombatModifiers(applyRunCombatModifiers(petUnit, run.blessings ?? [], run.relics ?? []))
    tunedPet.preset = run.tacticalPreset ?? 'balanced'
    units.push(tunedPet)
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

    // 3e. Auto-equip: assign best vault items to characters
    const autoEquipResult = executeAutoEquip(characterIds)

    // Re-read sect after mutations (spendResource, executeAutoEquip, ticks)
    const currentSect = useSectStore.getState().sect

    // 4. Validate each character
    const memberStates: DungeonRun['memberStates'] = {}
    for (const charId of characterIds) {
      const character = currentSect.characters.find((c) => c.id === charId)
      if (!character) return null

      // Check status: must be idle or resting (not adventuring)
      if (character.status !== 'idle' && character.status !== 'resting') return null

      // Check not already in another run
      for (const run of Object.values(state.activeRuns)) {
        if (run.teamCharacterIds.includes(charId)) return null
      }

      // Re-read character after auto-equip (stats may have changed)
      const charAfterEquip = useSectStore.getState().sect.characters.find((c) => c.id === charId) ?? character
      const eqStats = calcEquipmentStats(
        charAfterEquip.equippedGear,
        [],
        (id: string) => findEquipmentById(useSectStore.getState().sect, id) as Equipment | undefined
      )
      const unit = createCharacterCombatUnit(charAfterEquip, charAfterEquip.learnedTechniques, undefined, eqStats)

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
      eventLog: [{ timestamp: Date.now(), message: `Dungeon started: ${dungeon.name}` }],
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
      autoEquipAssignments: autoEquipResult?.assignments,
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

    emitEvent('adventure_start', `Expedition departed for dungeon ${dungeon.name}`)

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
        if (!character) return null
        const eqStats = calcEquipmentStats(
          character.equippedGear,
          [],
          (id: string) => findEquipmentById(useSectStore.getState().sect, id) as Equipment | undefined
        )
        return applyRouteCombatModifiers(
          createCharacterCombatUnit(character, character.learnedTechniques, undefined, eqStats)
        )
      })
      .filter((unit): unit is CombatUnit => unit !== null)

    if (baseTeamUnits.length !== config.teamCharacterIds.length) {
      get().retreat(startedRun.id)
      return null
    }

    // Append pet combat units for the team
    const teamCharacters = config.teamCharacterIds
      .map((charId) => sect.characters.find((c) => c.id === charId))
      .filter((c): c is NonNullable<typeof c> => c !== null && c !== undefined)
    const petPowerMult = getPetPowerMultiplier()
    const petUnits = collectPetCombatUnits(
      teamCharacters.map((c) => ({ id: c.id, petIds: c.petIds })),
      sect.pets,
      petPowerMult
    )
    for (const petUnit of petUnits) {
      baseTeamUnits.push(applyRouteCombatModifiers(petUnit))
    }

    const rawReport = resolveAutomatedRun({
      run: startedRun,
      dungeon,
      automationStrategy: config.automationStrategy,
      baseTeamUnits,
    })
    const firstLegacyClear = rawReport.result === 'completed' && !state.completedDungeons.includes(config.dungeonId)
    const legacyOutcome = resolveLegacyExpeditionOutcome({
      dungeonId: config.dungeonId,
      result: rawReport.result,
      floorsCleared: rawReport.floorsCleared,
      isFirstClear: firstLegacyClear,
    })
    const report: AdventureReport = {
      ...rawReport,
      rewards: mergeResources(applyRouteRewardModifiers(rawReport.rewards), legacyOutcome.bonusResources),
      itemRewards: [...rawReport.itemRewards, ...legacyOutcome.bonusItems],
      steps: appendLegacyReportEntries(rawReport, legacyOutcome.reportEntries),
    }

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

    const reportEventData = buildLegacyAdventureEventData(dungeon, {
      reportId: report.id,
      dungeonId: report.dungeonId,
      result: report.result,
      floorsCleared: report.floorsCleared,
    })

    let postRunMemberOutcomes: Record<string, AdventureMemberReturnRecord> | null = null

    if (report.result === 'completed') {
      postRunMemberOutcomes = get().completeRun(startedRun.id, reportEventData)
    } else if (report.result === 'failed') {
      postRunMemberOutcomes = get().failRun(startedRun.id, reportEventData)
    } else {
      postRunMemberOutcomes = get().retreat(startedRun.id)
      emitEvent('adventure_fail', buildAdventureResultMessage(dungeon.id, 'retreated', dungeon.name), reportEventData)
    }

    if (legacyOutcome.milestoneMessage) {
      emitEvent(
        'milestone',
        legacyOutcome.milestoneMessage,
        buildLegacyAdventureEventData(dungeon, { reportId: report.id })
      )
    }

    // Apply dungeon growth to surviving characters
    const dungeonGrowthApplied = applyDungeonGrowth(report, startedRun)

    const finalizedReport: AdventureReport = postRunMemberOutcomes
      ? {
          ...report,
          postRunMemberOutcomes,
          dungeonGrowthApplied,
        }
      : { ...report, dungeonGrowthApplied }

    // Update template confidence after run completion
    const activeTemplateId = useSectStore.getState().sect.automationSettings.activeTemplateId
    const currentConfidence = useSectStore.getState().sect.automationSettings.templateConfidence ?? []
    const currentGameDay = useGameStore.getState().currentGameDay
    const confidenceBefore = currentConfidence.find((e) => e.templateId === activeTemplateId)?.score ?? 50
    const isSuccess = finalizedReport.result === 'completed'
    const updatedConfidence = adjustTemplateConfidence(
      currentConfidence,
      activeTemplateId ?? '',
      isSuccess,
      currentGameDay
    )
    const confidenceAfter = updatedConfidence.find((e) => e.templateId === activeTemplateId)?.score ?? 50

    // Add risk/confidence fields to finalized report
    const riskHook = activeTemplateId ? getTemplateRiskHook(activeTemplateId) : null
    const reportWithConfidence: AdventureReport = {
      ...finalizedReport,
      riskTier: riskHook
        ? useSectStore.getState().sect.automationSettings.expeditionTemplates.find((t) => t.id === activeTemplateId)
            ?.riskTier
        : undefined,
      templateId: activeTemplateId ?? undefined,
      confidenceBefore,
      confidenceAfter,
    }

    // Persist confidence update to sect store
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        automationSettings: {
          ...s.sect.automationSettings,
          templateConfidence: updatedConfidence,
        },
      },
    }))

    const summary = summarizeReport(reportWithConfidence)
    set((s) => {
      const nextReports = [summary, ...s.reports.filter((existing) => existing.id !== summary.id)].slice(
        0,
        REPORT_LIMIT
      )
      const nextDetails = { ...s.reportDetails, [reportWithConfidence.id]: reportWithConfidence }
      const keepIds = new Set(nextReports.map((item) => item.id))
      for (const id of Object.keys(nextDetails)) {
        if (!keepIds.has(id)) delete nextDetails[id]
      }

      return {
        reports: nextReports,
        reportDetails: nextDetails,
      }
    })

    return reportWithConfidence
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
      const modified = applyRouteRewardModifiers(applyRunRewardModifiers(reward, newBlessings, newRelics))
      const mult = run.rewardMultiplier ?? 1
      newRewards.spiritStone += Math.floor((modified.spiritStone || 0) * mult)
      newRewards.spiritEnergy += Math.floor((modified.spiritEnergy || 0) * mult)
      newRewards.herb += Math.floor((modified.herb || 0) * mult)
      newRewards.ore += Math.floor((modified.ore || 0) * mult)
    }

    // Resolve all events on the route
    let statBattles = 0
    let statVictories = 0
    let statKills = 0
    const accumulatedComprehension = run.accumulatedComprehensionGrowth ?? {}

    // Compute team average fortune for random event bias
    const { sect: fortuneSect } = useSectStore.getState()
    const teamCharacters = run.teamCharacterIds
      .map((charId) => fortuneSect.characters.find((c) => c.id === charId))
      .filter((c): c is NonNullable<typeof c> => c !== null && c !== undefined)
    const teamFortune =
      teamCharacters.length > 0
        ? teamCharacters.reduce((sum, c) => sum + c.cultivationStats.fortune, 0) / teamCharacters.length
        : undefined

    for (const event of route.events) {
      // Rebuild alive team from updated states
      const currentUnits = buildAliveTeamUnits({ ...run, memberStates: newMemberStates })
      if (currentUnits.length === 0) break

      const result = resolveEvent(event, currentUnits, run.currentFloor, teamFortune)

      // Track combat stats
      if (result.combatResult) {
        statBattles++
        if (result.success) {
          statVictories++
          // Count dead enemies (hp <= 0) from combat result
          statKills += result.combatResult.enemyHp.filter((hp) => hp <= 0).length
        }
      }

      // Accumulate comprehension growth from combat
      if (result.comprehensionGrowth) {
        for (const [charId, techGrowth] of Object.entries(result.comprehensionGrowth)) {
          if (!accumulatedComprehension[charId]) accumulatedComprehension[charId] = {}
          for (const [techId, growth] of Object.entries(techGrowth)) {
            accumulatedComprehension[charId][techId] = (accumulatedComprehension[charId][techId] ?? 0) + growth
          }
        }
      }

      // Codex discovery: monster encounter/kill and equipment
      if (result.enemyTemplateId) {
        const sectStore = useSectStore.getState()
        sectStore.encounterMonster(result.enemyTemplateId)
        if (result.success) {
          sectStore.killMonster(result.enemyTemplateId)
        }
      }
      if (result.equipmentCodexDiscoveries) {
        const sectStore = useSectStore.getState()
        for (const disc of result.equipmentCodexDiscoveries) {
          sectStore.discoverEquipment(disc.setId, disc.quality)
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
        const scriptureLevel =
          sectStore.sect.buildings.find((building) => building.type === 'scriptureHall')?.level ?? 0
        const discoveredId = result.techniqueReward.techniqueId
        const codexCapacity = getTechniqueCodexCapacity(scriptureLevel)

        if (discoveredId && sectStore.unlockCodexEntry(discoveredId)) {
          const techniqueName = getTechniqueById(discoveredId)?.name ?? discoveredId
          newLog.push({
            timestamp: Date.now(),
            message: `A fragment of ${techniqueName} surfaced from the dungeon depths.`,
          })
          emitEvent('technique_unlocked', buildTechniqueUnlockMessage(discoveredId, techniqueName, 'adventure'), {
            techniqueId: discoveredId,
            legacyTechniqueId: isLegacyTechniqueId(discoveredId) ? discoveredId : undefined,
          })
        } else if (sectStore.sect.techniqueCodex.length >= codexCapacity) {
          newLog.push({
            timestamp: Date.now(),
            message: '?????????????????????????',
          })
        } else {
          newLog.push({
            timestamp: Date.now(),
            message: '???????????????????????',
          })
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
            accumulatedComprehensionGrowth: accumulatedComprehension,
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
          message: `A relic emerges from the deepest chamber: ${RELIC_DEFS[relicReward].name}`,
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
            accumulatedComprehensionGrowth: accumulatedComprehension,
          },
        },
      }))
      get().completeRun(runId)
      return true
    }

    if (nextFloor % 2 === 1 && newBlessings.length < 4 && newBlessingOptions.length === 0) {
      newBlessingOptions = pickBlessingOptions(newBlessings, 3, Math.random, getRunBuildBiasContext())
      if (newBlessingOptions.length > 0) {
        newLog.push({
          timestamp: Date.now(),
          message: 'A new blessing resonance is felt within the dungeon. Choose one to accept.',
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
          accumulatedComprehensionGrowth: accumulatedComprehension,
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
    const nextLog = [
      ...run.eventLog,
      { timestamp: Date.now(), message: `Blessing accepted: ${BLESSING_DEFS[blessingId].name}` },
    ]

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
      return { success: false, message: 'Cannot advance: no active run found.' }
    }

    // Check if there are alive members
    const hasAlive = run.teamCharacterIds.some((cid) => run.memberStates[cid]?.status !== 'dead')
    if (!hasAlive) {
      get().failRun(runId)
      return { success: false, message: 'The entire team has fallen.' }
    }

    // Check if already at or past the end
    if (run.currentFloor > run.floors.length) {
      return { success: false, message: 'The expedition has already reached the final floor.' }
    }

    // Auto-pick safest route and resolve
    const floor = run.floors[run.currentFloor - 1]
    if (!floor) {
      return { success: false, message: 'Current floor data is missing.' }
    }

    const safestIdx = pickSafestRoute(floor)
    const success = state.selectRoute(runId, safestIdx)

    if (success) {
      return { success: true, message: 'Advanced to the next floor.' }
    }

    // selectRoute handles failRun internally if needed
    return { success: false, message: 'Advance failed.' }
  },

  retreat: (runId) => {
    const state = get()
    const run = state.activeRuns[runId]
    if (!run || run.status !== 'active') return null
    const legacyOutcome = resolveLegacyExpeditionOutcome({
      dungeonId: run.dungeonId,
      result: 'retreated',
      floorsCleared: Math.max(0, run.currentFloor - 1),
      isFirstClear: false,
    })
    const settledRun: DungeonRun = {
      ...run,
      totalRewards: mergeResources(run.totalRewards, legacyOutcome.bonusResources),
      itemRewards: [...run.itemRewards, ...legacyOutcome.bonusItems],
      branchTags: [...new Set([...(run.branchTags ?? []), ...legacyOutcome.branchTags])],
    }

    // 1. Deposit 50% of totalRewards
    depositFractionResourcesToSect(settledRun.totalRewards, 0.5)

    // 2. Deposit all itemRewards to vault
    depositItemsToVault(settledRun.itemRewards)

    // 3. Survivors return to idle; dead disciples are removed with partial refund
    const outcomes = settleRunMembers(settledRun)

    // 3b. Return auto-equipped items to vault
    returnAutoEquippedItems(settledRun)

    // 3c. Apply dungeon growth for manual run path (comprehension only for retreat)
    applyManualRunGrowth(settledRun, 'retreated')

    // 4. Remove run
    set((s) => {
      const newRuns = { ...s.activeRuns }
      delete newRuns[runId]
      return { activeRuns: newRuns }
    })

    return outcomes
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
    if (!run || run.status !== 'active') return null

    const dungeon = findDungeon(run.dungeonId)
    const dungeonName = dungeon?.name ?? run.dungeonId
    const firstLegacyClear = !state.completedDungeons.includes(run.dungeonId)
    const legacyOutcome = resolveLegacyExpeditionOutcome({
      dungeonId: run.dungeonId,
      result: 'completed',
      floorsCleared: Math.max(0, run.currentFloor - 1),
      isFirstClear: firstLegacyClear,
    })
    const settledRun: DungeonRun = {
      ...run,
      totalRewards: mergeResources(run.totalRewards, legacyOutcome.bonusResources),
      itemRewards: [...run.itemRewards, ...legacyOutcome.bonusItems],
      branchTags: [...new Set([...(run.branchTags ?? []), ...legacyOutcome.branchTags])],
    }
    emitEvent(
      'adventure_complete',
      buildAdventureResultMessage(run.dungeonId, 'completed', dungeonName),
      buildLegacyAdventureEventData(dungeon, eventData)
    )
    unlockSectMilestone('firstDungeonClear')
    if (firstLegacyClear && run.dungeonId === 'guixuRift') {
      unlockSectMilestone('guixuRiftFirstClear')
    }

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

    // Floor depth milestone
    if (run.currentFloor - 1 >= 10) {
      unlockSectMilestone('firstDungeonLevel10')
    }

    // Adventure runs count milestone
    {
      const { sect } = useSectStore.getState()
      if (sect.stats.totalAdventureCompletions >= 10) {
        unlockSectMilestone('adventureRuns10')
      }
    }
    // 1. Deposit 100% of totalRewards
    depositResourcesToSect(settledRun.totalRewards)

    // 2. Deposit all itemRewards to vault
    depositItemsToVault(settledRun.itemRewards)

    // 3. Survivors return to idle; dead disciples are removed with partial refund
    const outcomes = settleRunMembers(settledRun)

    // 3b. Return auto-equipped items to vault
    returnAutoEquippedItems(settledRun)

    // 3c. Apply dungeon growth for manual run path
    applyManualRunGrowth(settledRun, 'completed')

    if (legacyOutcome.milestoneMessage && typeof eventData.reportId !== 'string') {
      emitEvent(
        'milestone',
        legacyOutcome.milestoneMessage,
        buildLegacyAdventureEventData(dungeon, { legacyFirstClear: true })
      )
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

    return outcomes
  },

  failRun: (runId, eventData = {}) => {
    const state = get()
    const run = state.activeRuns[runId]
    if (!run || run.status !== 'active') return null

    const dungeon = findDungeon(run.dungeonId)
    const dungeonName = dungeon?.name ?? run.dungeonId
    emitEvent(
      'adventure_fail',
      buildAdventureResultMessage(run.dungeonId, 'failed', dungeonName),
      buildLegacyAdventureEventData(dungeon, eventData)
    )

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

    // 3. Failed runs resolve into sacrifice or recovery
    const outcomes = settleFailedRunMembers(run)

    // 3b. Return auto-equipped items to vault
    returnAutoEquippedItems(run)

    // 4. Remove run
    set((s) => {
      const newRuns = { ...s.activeRuns }
      delete newRuns[runId]
      return { activeRuns: newRuns }
    })

    return outcomes
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
    emitEvent('dispatch_complete', `${mission.name} is complete, and the disciple has returned.`)

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
      newLog.push({ timestamp: Date.now(), message: `Used ${offer.name}, the team stabilizes.` })
    } else if (offer.effect === 'skip') {
      // Skip current floor by advancing
      newLog.push({ timestamp: Date.now(), message: `Used ${offer.name}, this floor is skipped.` })
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

    const routeCaptureBonus = calcPetCaptureRouteBonus(sect.activeRoute)
    const adjustedFortune = fortune + Math.round(routeCaptureBonus / 0.02)
    const success = tryCapturePet(adjustedFortune, quality)
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

      // First pet capture milestone
      unlockSectMilestone('firstPetCapture')

      // Log the capture
      const newLog = [...run.eventLog, { timestamp: Date.now(), message: `Pet captured: ${pet.name} joins the sect.` }]
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
      const newLog = [
        ...run.eventLog,
        {
          timestamp: Date.now(),
          message: 'The spirit beast broke free before it could be captured.',
        },
      ]
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
    const { sect } = useSectStore.getState()
    const mainHall = sect.buildings.find((b) => b.type === 'mainHall')
    const level = calcSectLevel(mainHall?.level ?? 1)
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

function isDungeonUnlocked(
  dungeon: Dungeon,
  playerRealm: number,
  playerStage: number,
  unlockedLegacyDungeonIds: string[] = []
): boolean {
  const realmUnlocked =
    playerRealm > dungeon.unlockRealm || (playerRealm === dungeon.unlockRealm && playerStage >= dungeon.unlockStage)

  if (!realmUnlocked) return false
  if (!dungeon.legacyUnlockId) return true

  return unlockedLegacyDungeonIds.includes(dungeon.legacyUnlockId)
}

export { isDungeonUnlocked }
