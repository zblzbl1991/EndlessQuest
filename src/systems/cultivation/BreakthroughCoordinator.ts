import type { Character, GrowthMultipliers, MilestoneSnapshot, RealmStage } from '../../types/character'
import { canBreakthrough, breakthrough as performBreakthrough, calcBreakthroughFailureRate } from './CultivationEngine'
import { shouldTriggerTribulation, resolveTribulation } from './TribulationSystem'
import { tryComprehendOnBreakthrough } from '../technique/TechniqueSystem'
import { REALMS, getBreakthroughResourceCost, getRealmName } from '../../data/realms'
import { getTechniqueById } from '../../data/techniquesTable'
import { needsCultivationPathChoice } from '../character/CultivationPathSystem'
import type { PathEffectMap } from '../sect/SectPathEffects'
import { getMultEffect } from '../sect/SectPathEffects'

/**
 * Seed initial comprehension when a new technique is learned.
 * Dungeon-found techniques start at 15%.
 */
function seedComprehension(existingComprehension: Record<string, number>, techniqueId: string): Record<string, number> {
  const technique = getTechniqueById(techniqueId)
  const starterComp = technique?.origin === 'starter' ? 30 : 15
  return { ...existingComprehension, [techniqueId]: starterComp }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * 5-level breakthrough outcome gradient:
 * - great_success: skip a sub-level, extra stat bonus
 * - success: normal breakthrough, realm+1
 * - blocked: failure but character stays alive, cultivation reset to 70%
 * - injured: failure, character enters injured status with injuryTimer
 * - fallen: character death (only possible on major realm tribulation breakthroughs)
 */
export type BreakthroughOutcome = 'great_success' | 'success' | 'blocked' | 'injured' | 'fallen'

export interface BreakthroughCost {
  spiritStone: number
  spiritEnergy: number
  herb: number
}

export interface BreakthroughEvent {
  type: 'breakthrough_success' | 'breakthrough_failure' | 'breakthrough_comprehension'
  message: string
}

export interface BreakthroughResult {
  /** The character after breakthrough attempt (may have new realm/stage, or be unchanged) */
  updatedChar: Character
  /** Events to emit */
  events: BreakthroughEvent[]
  /** Resource costs consumed (only if breakthrough was attempted) */
  resourceCost: BreakthroughCost
  /** Whether the breakthrough resulted in character death (legacy compat: true iff outcome === 'fallen') */
  died: boolean
  /** 5-level outcome of the breakthrough attempt */
  outcome: BreakthroughOutcome
  /** For 'blocked': fraction of cultivation to keep (0.7 = keep 70%) */
  cultivationResetFraction: number
  /** For 'injured': injury timer in seconds */
  injuryTimer: number
  /** Comprehended technique ID (if breakthrough triggered comprehension) */
  comprehendedTechniqueId: string | null
  /** Number of breakthrough attempts made */
  attemptsCount: number
  /** Number of successful breakthroughs */
  successesCount: number
  /** Whether a tribulation success milestone was unlocked */
  unlockedTribulationMilestone: boolean
  /** Target realm name for the breakthrough attempt (used for offline accumulator tracking) */
  targetRealmName: string | null
  /** Whether the breakthrough was successful (used for offline accumulator tracking) */
  breakthroughSuccess: boolean | null
}

// ---...--- Outcome Probabilities ---...---

// Base probabilities for the outcome gradient
// Must sum to 1.0
const OUTCOME_WEIGHTS = {
  great_success: 0.1,
  success: 0.5,
  blocked: 0.2,
  injured: 0.15,
  fallen: 0.05,
}

/** Injury duration in seconds for 'injured' outcome */
const INJURY_DURATION_SECS = 300 // 5 minutes

/** Cultivation retention fraction for 'blocked' outcome */
const BLOCKED_CULTIVATION_FRACTION = 0.7

/**
 * Roll a breakthrough outcome.
 * For minor breakthroughs, 'fallen' is not possible -- it becomes 'injured' instead.
 * Risk reduction from resources is applied here.
 */
function rollBreakthroughOutcome(isMajorBreakthrough: boolean, riskReduction: number = 0): BreakthroughOutcome {
  const roll = Math.random()

  // Apply risk reduction: shift probability from fallen/injured toward success/blocked
  const reduction = Math.min(riskReduction, 0.15) // Cap at 15% reduction
  const adjustedWeights = {
    great_success: OUTCOME_WEIGHTS.great_success,
    success: OUTCOME_WEIGHTS.success + reduction * 0.5,
    blocked: OUTCOME_WEIGHTS.blocked + reduction * 0.3,
    injured: OUTCOME_WEIGHTS.injured - reduction * 0.2,
    fallen: isMajorBreakthrough ? OUTCOME_WEIGHTS.fallen - reduction * 0.3 : 0,
  }

  // For minor breakthroughs, fallen weight goes to injured
  if (!isMajorBreakthrough) {
    adjustedWeights.injured += adjustedWeights.fallen
    adjustedWeights.fallen = 0
  }

  // Normalize
  const total =
    adjustedWeights.great_success +
    adjustedWeights.success +
    adjustedWeights.blocked +
    adjustedWeights.injured +
    adjustedWeights.fallen
  const w = {
    great_success: adjustedWeights.great_success / total,
    success: adjustedWeights.success / total,
    blocked: adjustedWeights.blocked / total,
    injured: adjustedWeights.injured / total,
    fallen: adjustedWeights.fallen / total,
  }

  if (roll < w.great_success) return 'great_success'
  if (roll < w.great_success + w.success) return 'success'
  if (roll < w.great_success + w.success + w.blocked) return 'blocked'
  if (roll < w.great_success + w.success + w.blocked + w.injured) return 'injured'
  return 'fallen'
}

/**
 * Build a milestone snapshot key from realm + stage.
 */
function milestoneKey(realm: number, stage: number): string {
  return `${realm}-${stage}`
}

/**
 * Save a milestone snapshot of character stats at the moment of breakthrough.
 */
function saveMilestoneSnapshot(char: Character, realm: number, stage: number): Record<string, MilestoneSnapshot> {
  const snapshots = { ...(char.milestoneSnapshots ?? {}) }
  snapshots[milestoneKey(realm, stage)] = {
    hp: char.baseStats.hp,
    atk: char.baseStats.atk,
    def: char.baseStats.def,
    spd: char.baseStats.spd,
    spiritualRoot: char.cultivationStats.spiritualRoot,
    comprehension: char.cultivationStats.comprehension,
  }
  return snapshots
}

// ---------------------------------------------------------------------------
// processBreakthrough — pure function extracted from tickSlice
// ---------------------------------------------------------------------------

/**
 * Create a no-change result with all new fields populated.
 */
function noChangeResult(char: Character): BreakthroughResult {
  return {
    updatedChar: char,
    events: [],
    resourceCost: { spiritStone: 0, spiritEnergy: 0, herb: 0 },
    died: false,
    outcome: 'success',
    cultivationResetFraction: 1,
    injuryTimer: 0,
    comprehendedTechniqueId: null,
    attemptsCount: 0,
    successesCount: 0,
    unlockedTribulationMilestone: false,
    targetRealmName: null,
    breakthroughSuccess: null,
  }
}

/**
 * Apply a successful breakthrough: update realm/stage, save milestone snapshot.
 * Returns updated character and event list.
 */
function applySuccessfulBreakthrough(
  char: Character,
  newRealm: number,
  newStage: RealmStage,
  newStats: import('../../types/character').BaseStats,
  isGreatSuccess: boolean,
  techniqueCodex: string[],
  isMajor: boolean
): { updatedChar: Character; events: BreakthroughEvent[]; comprehendedId: string | null } {
  const nextName = getRealmName(newRealm, newStage)
  const events: BreakthroughEvent[] = []

  if (isGreatSuccess) {
    events.push({
      type: 'breakthrough_success',
      message: `${char.name} 天地感应，灵力暴涨，一跃突破至 ${nextName}！`,
    })
  } else if (isMajor) {
    events.push({
      type: 'breakthrough_success',
      message: `天雷散去，${char.name} 气息一变，周身灵力涌动，成功踏入${nextName}！`,
    })
  } else {
    events.push({
      type: 'breakthrough_success',
      message: `${char.name} 修为精进，突破至 ${nextName}`,
    })
  }

  // Save milestone snapshot before applying new stats
  const snapshots = saveMilestoneSnapshot(char, newRealm, newStage)

  let updatedChar: Character = {
    ...char,
    realm: newRealm,
    realmStage: newStage,
    cultivation: 0,
    baseStats: newStats,
    milestoneSnapshots: snapshots,
  }

  // Breakthrough comprehension
  const comprehendedId = tryComprehendOnBreakthrough(updatedChar, techniqueCodex, isMajor)
  if (comprehendedId) {
    updatedChar = {
      ...updatedChar,
      learnedTechniques: [...updatedChar.learnedTechniques, comprehendedId],
      techniqueComprehension: seedComprehension(updatedChar.techniqueComprehension ?? {}, comprehendedId),
    }
    const compName = getTechniqueById(comprehendedId)?.name ?? comprehendedId
    events.push({
      type: 'breakthrough_comprehension',
      message: `${updatedChar.name} 豁然开朗，顿悟了 ${compName} 之妙`,
    })
  }

  return { updatedChar, events, comprehendedId }
}

/**
 * Process a breakthrough attempt for a character.
 *
 * Pure function: takes character + resources + context, returns result.
 * Does NOT emit events or mutate store state -- caller applies results.
 *
 * Uses a 5-level outcome gradient:
 * - great_success (~10%): normal breakthrough + extra stat bonus
 * - success (~50%): normal breakthrough
 * - blocked (~20%): cultivation reset to 70%, can retry
 * - injured (~15%): character enters injured status
 * - fallen (~5%): character death (major realm tribulation only)
 */
export function processBreakthrough(
  char: Character,
  availableSpiritStone: number,
  availableSpiritEnergy: number,
  techniqueCodex: string[],
  currentCostAccumulator: { spiritStone: number; spiritEnergy: number; herb?: number },
  pathEffects?: PathEffectMap,
  growthMultipliers?: GrowthMultipliers,
  availableHerb?: number
): BreakthroughResult {
  const noChange = noChangeResult(char)

  // Guard: must be able to breakthrough
  if (!canBreakthrough(char)) return noChange

  // If character needs a cultivation path choice, skip breakthrough
  if (needsCultivationPathChoice(char)) return noChange

  // Determine if this is a major realm breakthrough (max stage -> new realm)
  const currentRealm = REALMS[char.realm]
  const isMajorBreakthrough = char.realmStage >= currentRealm.stages.length - 1
  const cost = getBreakthroughResourceCost(char.realm, char.realmStage)

  // Apply sect path breakthroughCost multiplier (e.g. pill path -20%)
  const btCostMult = pathEffects ? getMultEffect(pathEffects, 'breakthroughCost') : 1
  const adjustedSpiritStoneCost = Math.floor(cost.spiritStone * btCostMult)

  // Herb cost (not affected by path cost multiplier — herbs are always consumed in full)
  const herbCost = cost.herb ?? 0
  const accumulatedHerb = currentCostAccumulator.herb ?? 0

  // Check resources
  if (
    availableSpiritStone - currentCostAccumulator.spiritStone < adjustedSpiritStoneCost ||
    availableSpiritEnergy - currentCostAccumulator.spiritEnergy < cost.spiritEnergy
  ) {
    return noChange
  }

  // Check herb availability if there is a herb cost
  if (herbCost > 0 && (availableHerb ?? 0) - accumulatedHerb < herbCost) {
    return noChange
  }

  const resourceCost = { spiritStone: adjustedSpiritStoneCost, spiritEnergy: cost.spiritEnergy, herb: herbCost }

  // ---...--- Tribulation Check (major realm only) ---...---
  if (isMajorBreakthrough && shouldTriggerTribulation(char.realm, char.realmStage)) {
    const tribResult = resolveTribulation(char)

    if (!tribResult.success) {
      // Tribulation failed -- use gradient outcome, not automatic death
      const outcome = rollBreakthroughOutcome(true)
      const targetName = getRealmName(char.realm + 1, 0)

      switch (outcome) {
        case 'fallen': {
          const msg = tribResult.severe
            ? `${char.name} 未能扛过天劫，雷光之中当场身死道消`
            : `${char.name} 功力不济，未能渡过天劫，身死道消`
          return {
            updatedChar: char,
            events: [{ type: 'breakthrough_failure', message: msg }],
            resourceCost,
            died: true,
            outcome: 'fallen',
            cultivationResetFraction: 0,
            injuryTimer: 0,
            comprehendedTechniqueId: null,
            attemptsCount: 0,
            successesCount: 0,
            unlockedTribulationMilestone: false,
            targetRealmName: targetName,
            breakthroughSuccess: false,
          }
        }
        case 'injured': {
          const timer = tribResult.injuryTimer ?? INJURY_DURATION_SECS
          return {
            updatedChar: { ...char, cultivation: 0 },
            events: [
              {
                type: 'breakthrough_failure',
                message: `${char.name} 渡劫失利，灵力反噬受伤，需休养恢复`,
              },
            ],
            resourceCost,
            died: false,
            outcome: 'injured',
            cultivationResetFraction: 0,
            injuryTimer: timer,
            comprehendedTechniqueId: null,
            attemptsCount: 0,
            successesCount: 0,
            unlockedTribulationMilestone: false,
            targetRealmName: targetName,
            breakthroughSuccess: false,
          }
        }
        case 'blocked':
          return {
            updatedChar: {
              ...char,
              cultivation: Math.floor(char.cultivation * BLOCKED_CULTIVATION_FRACTION),
            },
            events: [
              {
                type: 'breakthrough_failure',
                message: `${char.name} 天劫未至而先怯，突破受阻，修为回退`,
              },
            ],
            resourceCost,
            died: false,
            outcome: 'blocked',
            cultivationResetFraction: BLOCKED_CULTIVATION_FRACTION,
            injuryTimer: 0,
            comprehendedTechniqueId: null,
            attemptsCount: 0,
            successesCount: 0,
            unlockedTribulationMilestone: false,
            targetRealmName: targetName,
            breakthroughSuccess: false,
          }
        default: {
          // great_success or success on tribulation failure -- rare but possible (breakthrough even after trib hit)
          const failureRate = calcBreakthroughFailureRate(char)
          const btResult = performBreakthrough(char, failureRate, growthMultipliers)
          if (btResult.success) {
            const { updatedChar, events, comprehendedId } = applySuccessfulBreakthrough(
              char,
              btResult.newRealm,
              btResult.newStage,
              btResult.newStats,
              outcome === 'great_success',
              techniqueCodex,
              true
            )
            return {
              updatedChar,
              events,
              resourceCost,
              died: false,
              outcome,
              cultivationResetFraction: 1,
              injuryTimer: 0,
              comprehendedTechniqueId: comprehendedId,
              attemptsCount: 1,
              successesCount: 1,
              unlockedTribulationMilestone: outcome === 'great_success' || outcome === 'success',
              targetRealmName: getRealmName(btResult.newRealm, btResult.newStage),
              breakthroughSuccess: true,
            }
          }
          // Shouldn't happen but fall through to injured
          return {
            updatedChar: { ...char, cultivation: 0 },
            events: [{ type: 'breakthrough_failure', message: `${char.name} 渡劫后突破失败` }],
            resourceCost,
            died: false,
            outcome: 'injured',
            cultivationResetFraction: 0,
            injuryTimer: INJURY_DURATION_SECS,
            comprehendedTechniqueId: null,
            attemptsCount: 1,
            successesCount: 0,
            unlockedTribulationMilestone: false,
            targetRealmName: targetName,
            breakthroughSuccess: false,
          }
        }
      }
    }

    // Tribulation succeeded -- proceed with gradient outcome for the breakthrough itself
  }

  // ---...--- Standard Breakthrough with Gradient ---...---
  const outcome = rollBreakthroughOutcome(isMajorBreakthrough)

  switch (outcome) {
    case 'great_success':
    case 'success': {
      const failureRate = calcBreakthroughFailureRate(char)
      const btResult = performBreakthrough(char, failureRate, growthMultipliers)
      if (!btResult.success) {
        // Breakthrough engine rejected (shouldn't happen at this point but guard)
        return noChange
      }

      const { updatedChar, events, comprehendedId } = applySuccessfulBreakthrough(
        char,
        btResult.newRealm,
        btResult.newStage,
        btResult.newStats,
        outcome === 'great_success',
        techniqueCodex,
        isMajorBreakthrough
      )

      return {
        updatedChar,
        events,
        resourceCost,
        died: false,
        outcome,
        cultivationResetFraction: 1,
        injuryTimer: 0,
        comprehendedTechniqueId: comprehendedId,
        attemptsCount: 1,
        successesCount: 1,
        unlockedTribulationMilestone: isMajorBreakthrough && shouldTriggerTribulation(char.realm, char.realmStage),
        targetRealmName: getRealmName(btResult.newRealm, btResult.newStage),
        breakthroughSuccess: true,
      }
    }

    case 'blocked': {
      const targetName = isMajorBreakthrough
        ? getRealmName(char.realm + 1, 0)
        : getRealmName(char.realm, (char.realmStage + 1) as RealmStage)
      return {
        updatedChar: {
          ...char,
          cultivation: Math.floor(char.cultivation * BLOCKED_CULTIVATION_FRACTION),
        },
        events: [
          {
            type: 'breakthrough_failure',
            message: `${char.name} 突破受阻，修为回退，可再次尝试`,
          },
        ],
        resourceCost,
        died: false,
        outcome: 'blocked',
        cultivationResetFraction: BLOCKED_CULTIVATION_FRACTION,
        injuryTimer: 0,
        comprehendedTechniqueId: null,
        attemptsCount: 1,
        successesCount: 0,
        unlockedTribulationMilestone: false,
        targetRealmName: targetName,
        breakthroughSuccess: false,
      }
    }

    case 'injured': {
      const targetName = isMajorBreakthrough
        ? getRealmName(char.realm + 1, 0)
        : getRealmName(char.realm, (char.realmStage + 1) as RealmStage)
      return {
        updatedChar: { ...char, cultivation: 0 },
        events: [
          {
            type: 'breakthrough_failure',
            message: `${char.name} 突破失利，灵力反噬受伤，需休养恢复`,
          },
        ],
        resourceCost,
        died: false,
        outcome: 'injured',
        cultivationResetFraction: 0,
        injuryTimer: INJURY_DURATION_SECS,
        comprehendedTechniqueId: null,
        attemptsCount: 1,
        successesCount: 0,
        unlockedTribulationMilestone: false,
        targetRealmName: targetName,
        breakthroughSuccess: false,
      }
    }

    case 'fallen': {
      // Only possible on major breakthroughs; rollBreakthroughOutcome guarantees this
      const targetName = getRealmName(char.realm + 1, 0)
      return {
        updatedChar: char,
        events: [
          {
            type: 'breakthrough_failure',
            message: `${char.name} 突破关口功亏一篑，灵力溃散而亡`,
          },
        ],
        resourceCost,
        died: true,
        outcome: 'fallen',
        cultivationResetFraction: 0,
        injuryTimer: 0,
        comprehendedTechniqueId: null,
        attemptsCount: 1,
        successesCount: 0,
        unlockedTribulationMilestone: false,
        targetRealmName: targetName,
        breakthroughSuccess: false,
      }
    }
  }
}
