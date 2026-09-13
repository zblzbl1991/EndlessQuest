import type { Character, GrowthMultipliers, MilestoneSnapshot, RealmStage } from '../../types/character'
import {
  canBreakthrough,
  breakthrough as performBreakthrough,
  calcBreakthroughFailureRate,
  applyGreatSuccessStats,
} from './CultivationEngine'
import { resolveTribulation } from './TribulationSystem'
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
 * Breakthrough outcomes (§5.2 / §5.4):
 * - great_success: major breakthrough survived the tribulation with 天地感应 —
 *   normal advance + one extra sub-level stat step (10% of survivors)
 * - success: normal breakthrough
 * - blocked: failure, retryable — minor failures keep ALL cultivation (§5.2),
 *   lost tribulations keep 70%
 * - injured: failure with injuryTimer (lost tribulation only)
 * - fallen: death — only possible when breaking INTO 渡劫期 (target ≥ 8)
 */
export type BreakthroughOutcome = 'great_success' | 'success' | 'blocked' | 'injured' | 'fallen'

export interface BreakthroughCost {
  spiritStone: number
  spiritEnergy: number
  herb: number
}

export interface BreakthroughEvent {
  type: 'breakthrough_success' | 'breakthrough_failure' | 'breakthrough_comprehension' | 'breakthrough_blocked'
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

/**
 * Failure-mode distribution when a major breakthrough's tribulation is LOST
 * (fractions of failures). 身死 only exists when breaking INTO 渡劫期
 * (target realm ≥ 8) or beyond — earlier realms fold it into 受伤 (§5.4).
 */
const FAILURE_OUTCOME_WEIGHTS = {
  blocked: 0.5,
  injured: 0.375,
  fallen: 0.125,
}

/** Chance that a tribulation-surviving major breakthrough is a great_success. */
const GREAT_SUCCESS_RATE = 0.1

/** Injury duration in seconds for 'injured' outcome */
const INJURY_DURATION_SECS = 300 // 5 minutes

/** Cultivation retention fraction for 'blocked' outcome */
const BLOCKED_CULTIVATION_FRACTION = 0.7

/**
 * Roll how a lost tribulation manifests. The tribulation roll itself already
 * decided that the breakthrough FAILS — this only picks the failure flavor.
 */
function rollMajorFailureOutcome(targetRealm: number): BreakthroughOutcome {
  const roll = Math.random()
  if (roll < FAILURE_OUTCOME_WEIGHTS.blocked) return 'blocked'
  if (roll < FAILURE_OUTCOME_WEIGHTS.blocked + FAILURE_OUTCOME_WEIGHTS.injured) return 'injured'
  return targetRealm >= 8 ? 'fallen' : 'injured'
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

  // Great-success grants one extra sub-level stat step on top of the advance
  const finalStats = isGreatSuccess ? applyGreatSuccessStats(newStats) : newStats

  let updatedChar: Character = {
    ...char,
    realm: newRealm,
    realmStage: newStage,
    cultivation: 0,
    baseStats: finalStats,
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
 * Minor breakthroughs (§5.2): a single ~90% success roll; failure keeps ALL
 * cultivation and only spends resources.
 *
 * Major breakthroughs (§5.4): the tribulation roll is the ONLY success check
 * (legacy breakthrough bonus feeds into it). A lost tribulation becomes
 * blocked (~50%) / injured (~37.5%) / fallen (~12.5%, target realm ≥ 8 only);
 * a survived one always breaks through, with a 10% great_success bonus.
 */
export function processBreakthrough(
  char: Character,
  availableSpiritStone: number,
  _availableSpiritEnergy: number,
  techniqueCodex: string[],
  currentCostAccumulator: { spiritStone: number; spiritEnergy: number; herb?: number },
  pathEffects?: PathEffectMap,
  growthMultipliers?: GrowthMultipliers,
  availableHerb?: number,
  legacyBreakthroughBonus: number = 0
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
  const remainingStone = availableSpiritStone - currentCostAccumulator.spiritStone
  const blockedResources: string[] = []
  if (remainingStone < adjustedSpiritStoneCost) blockedResources.push('灵石')

  if (blockedResources.length > 0) {
    const targetName = isMajorBreakthrough
      ? getRealmName(char.realm + 1, 0)
      : getRealmName(char.realm, (char.realmStage + 1) as RealmStage)
    return {
      ...noChange,
      events: [
        {
          type: 'breakthrough_blocked' as const,
          message: `${char.name} 修为已满，但${blockedResources.join('、')}不足，无法突破至${targetName}`,
        },
      ],
      targetRealmName: targetName,
      breakthroughSuccess: false,
    }
  }

  // Check herb availability if there is a herb cost
  if (herbCost > 0 && (availableHerb ?? 0) - accumulatedHerb < herbCost) {
    const targetName = isMajorBreakthrough
      ? getRealmName(char.realm + 1, 0)
      : getRealmName(char.realm, (char.realmStage + 1) as RealmStage)
    return {
      ...noChange,
      events: [
        {
          type: 'breakthrough_blocked' as const,
          message: `${char.name} 修为已满，但灵草不足，无法突破至${targetName}`,
        },
      ],
      targetRealmName: targetName,
      breakthroughSuccess: false,
    }
  }

  const resourceCost = { spiritStone: adjustedSpiritStoneCost, spiritEnergy: 0, herb: herbCost }

  // ---...--- Minor Breakthrough (§5.2): single 90% roll ---...---
  if (!isMajorBreakthrough) {
    const failRate = calcBreakthroughFailureRate(char, legacyBreakthroughBonus)
    if (Math.random() < failRate) {
      // Failure keeps ALL cultivation; resources are still spent (§5.2).
      // The engine-layer performBreakthrough must NOT roll again on retry.
      return {
        updatedChar: char,
        events: [
          {
            type: 'breakthrough_failure',
            message: `${char.name} 冲击小境界未成，灵力回拢，修为完好保留`,
          },
        ],
        resourceCost,
        died: false,
        outcome: 'blocked',
        cultivationResetFraction: 1,
        injuryTimer: 0,
        comprehendedTechniqueId: null,
        attemptsCount: 1,
        successesCount: 0,
        unlockedTribulationMilestone: false,
        targetRealmName: getRealmName(char.realm, (char.realmStage + 1) as RealmStage),
        breakthroughSuccess: false,
      }
    }

    const btResult = performBreakthrough(char, 0, growthMultipliers)
    if (!btResult.success) {
      // Unreachable (the roll above already decided success) — kept defensive.
      return {
        ...noChange,
        events: [
          {
            type: 'breakthrough_failure',
            message: `${char.name} 冲击关口未成，灵力回拢，修为完好保留`,
          },
        ],
        outcome: 'blocked',
        cultivationResetFraction: 1,
        attemptsCount: 1,
        breakthroughSuccess: false,
      }
    }

    const { updatedChar, events, comprehendedId } = applySuccessfulBreakthrough(
      char,
      btResult.newRealm,
      btResult.newStage,
      btResult.newStats,
      false,
      techniqueCodex,
      false
    )
    return {
      updatedChar,
      events,
      resourceCost,
      died: false,
      outcome: 'success',
      cultivationResetFraction: 1,
      injuryTimer: 0,
      comprehendedTechniqueId: comprehendedId,
      attemptsCount: 1,
      successesCount: 1,
      unlockedTribulationMilestone: false,
      targetRealmName: getRealmName(btResult.newRealm, btResult.newStage),
      breakthroughSuccess: true,
    }
  }

  // ---...--- Major Breakthrough (§5.4): the tribulation roll IS the success roll ---...---
  const tribResult = resolveTribulation(char, legacyBreakthroughBonus)

  if (!tribResult.success) {
    const outcome = rollMajorFailureOutcome(char.realm + 1)
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
          attemptsCount: 1,
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
          attemptsCount: 1,
          successesCount: 0,
          unlockedTribulationMilestone: false,
          targetRealmName: targetName,
          breakthroughSuccess: false,
        }
      }
      default: {
        // blocked: cultivation retained at 70%, retryable
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
          attemptsCount: 1,
          successesCount: 0,
          unlockedTribulationMilestone: false,
          targetRealmName: targetName,
          breakthroughSuccess: false,
        }
      }
    }
  }

  // Tribulation survived — the breakthrough holds. Roll for great_success,
  // which grants one extra sub-level stat step (P2-7).
  const isGreatSuccess = Math.random() < GREAT_SUCCESS_RATE
  const btResult = performBreakthrough(char, 0, growthMultipliers)
  if (!btResult.success) {
    // Unreachable: canBreakthrough passed and the tribulation already decided.
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
      targetRealmName: getRealmName(char.realm + 1, 0),
      breakthroughSuccess: false,
    }
  }

  const { updatedChar, events, comprehendedId } = applySuccessfulBreakthrough(
    char,
    btResult.newRealm,
    btResult.newStage,
    btResult.newStats,
    isGreatSuccess,
    techniqueCodex,
    true
  )

  return {
    updatedChar,
    events,
    resourceCost,
    died: false,
    outcome: isGreatSuccess ? 'great_success' : 'success',
    cultivationResetFraction: 1,
    injuryTimer: 0,
    comprehendedTechniqueId: comprehendedId,
    attemptsCount: 1,
    successesCount: 1,
    unlockedTribulationMilestone: true,
    targetRealmName: getRealmName(btResult.newRealm, btResult.newStage),
    breakthroughSuccess: true,
  }
}
