import type { Character, BaseStats, RealmStage, GrowthMultipliers } from '../../types/character'
import { REALMS, getCultivationNeeded } from '../../data/realms'
import { getTechniqueById } from '../../data/techniquesTable'
import { getCultivationSpeedModifier, getBreakthroughSuccessBonus } from '../destiny/DestinySystem'

// Base cultivation rate: 修为 per second
const BASE_CULTIVATION_RATE = 5

// Spirit energy cost per second during cultivation
const SPIRIT_COST_PER_SECOND = 2

// Realm difficulty multipliers (higher realms = harder to cultivate)
const REALM_CULTIVATION_MULT = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5]

// Stat growth per sub-level as fraction of major realm growth
const SUBLEVEL_STAT_FRACTION = 0.15

// Major realm stat multiplier
const MAJOR_REALM_STAT_MULT = 1.8

export interface TickResult {
  cultivationGained: number
  spiritSpent: number
  comprehensionGrowth: Record<string, number>
}

export interface BreakthroughResult {
  success: boolean
  newRealm: number
  newStage: RealmStage
  newStats: BaseStats
  oldStats: BaseStats
}

/**
 * Get the effective tribulation power for a realm at a given stage.
 * If the realm has tribulationStages, returns the stage-specific value.
 * Otherwise falls back to tribulationPower (default 0).
 */
function getTribulationPower(realmIndex: number, stage: RealmStage): number {
  const realm = REALMS[realmIndex]
  if (!realm) return 0
  if (realm.tribulationStages && realm.tribulationStages[stage] !== undefined) {
    return realm.tribulationStages[stage]
  }
  return realm.tribulationPower ?? 0
}

/**
 * Check if the next breakthrough would be a major realm transition.
 */
export function isMajorRealmBreakthrough(realm: number, stage: RealmStage): boolean {
  const r = REALMS[realm]
  if (!r) return false
  return stage + 1 >= r.stages.length
}

/**
 * Calculate the failure rate (0~1) for a breakthrough attempt.
 *
 * Sub-level:  5% + tribulationPower × 15%
 * Major realm: 10% + target tribulationPower × 25%
 */
export function calcBreakthroughFailureRate(character: Character): number {
  const major = isMajorRealmBreakthrough(character.realm, character.realmStage)
  if (major) {
    // Use target realm's tribulation power
    const targetPower = getTribulationPower(character.realm + 1, 0)
    return Math.max(0, 0.1 + targetPower * 0.25 - getBreakthroughSuccessBonus(character))
  }
  // Sub-level: use current realm's tribulation power at next stage
  const nextStage = (character.realmStage + 1) as RealmStage
  const power = getTribulationPower(character.realm, nextStage)
  return Math.max(0, 0.05 + power * 0.15 - getBreakthroughSuccessBonus(character))
}

/**
 * Calculate cultivation rate per second for a character.
 *
 * rootBonus: exponential scaling on spiritualRoot — (root / 10) ^ 0.85
 *   high-root characters benefit from accelerating returns.
 * compBonus: linear scaling on comprehension — 1 + (comp - 10) * 0.015
 *   comprehension directly boosts cultivation efficiency.
 * Together, a chaos disciple (~3.7x) cultivates far faster than common (1x).
 */
export function calcCultivationRate(character: Character, learnedTechniques: string[]): number {
  const spiritualRoot = character.cultivationStats.spiritualRoot
  const comprehension = character.cultivationStats.comprehension
  const rootBonus = Math.pow(spiritualRoot / 10, 0.85)
  const compBonus = 1 + (comprehension - 10) * 0.015
  const realmMult = REALM_CULTIVATION_MULT[character.realm] ?? 0.5

  let rate = BASE_CULTIVATION_RATE * rootBonus * compBonus * realmMult

  // Sum cultivationRate bonuses from all learned techniques, scaled by comprehension
  for (const techId of learnedTechniques) {
    const technique = getTechniqueById(techId)
    if (!technique) continue
    const cultivationBonus = technique.bonuses.find((b) => b.type === 'cultivationRate')
    if (cultivationBonus) {
      const compScale = calcComprehensionScale(character.techniqueComprehension?.[techId])
      rate *= 1 + cultivationBonus.value * compScale
    }
  }

  rate *= Math.max(0.2, 1 + getCultivationSpeedModifier(character))

  return rate
}

export function calcSpiritCostPerSecond(): number {
  return SPIRIT_COST_PER_SECOND
}

export function canCultivate(spiritEnergy: number): boolean {
  return spiritEnergy >= SPIRIT_COST_PER_SECOND
}

/**
 * Calculate the comprehension scale factor for a technique bonus.
 * - comprehension 0-99: linear scale (comprehension / 100)
 * - comprehension 100: 1.1 (10% mastery bonus)
 * - undefined or missing: 1.0 (full bonus for backward compatibility / migration)
 */
export function calcComprehensionScale(comprehension: number | undefined): number {
  if (comprehension === undefined) return 1.0
  if (comprehension >= 100) return 1.1
  return comprehension / 100
}

// Base comprehension growth per tick per technique
const BASE_COMPREHENSION_GROWTH = 0.1

/**
 * Calculate comprehension growth for a character's learned techniques during a tick.
 * Growth rate: baseGrowth * (1 + comprehension / 200) per technique per tick.
 * Only techniques below 100% comprehension grow.
 */
export function calcComprehensionGrowth(character: Character): Record<string, number> {
  const growth: Record<string, number> = {}
  const compStat = character.cultivationStats.comprehension
  const growthMultiplier = 1 + compStat / 200

  for (const techId of character.learnedTechniques) {
    const currentComp = character.techniqueComprehension?.[techId]
    if (currentComp === undefined || currentComp >= 100) continue

    const increment = BASE_COMPREHENSION_GROWTH * growthMultiplier
    growth[techId] = Math.min(100 - currentComp, increment)
  }

  return growth
}

/**
 * Tick cultivation for a single character.
 * Returns cultivation gained and spirit energy spent.
 */
export function tick(
  character: Character,
  spiritEnergyAvailable: number,
  deltaSec: number,
  learnedTechniques: string[] = []
): TickResult {
  if (spiritEnergyAvailable <= 0) {
    return { cultivationGained: 0, spiritSpent: 0, comprehensionGrowth: {} }
  }

  const rate = calcCultivationRate(character, learnedTechniques)
  // Scale cultivation proportionally to available spirit energy
  const spiritScale = Math.min(1, spiritEnergyAvailable / (SPIRIT_COST_PER_SECOND * deltaSec))
  const gained = rate * deltaSec * spiritScale
  const spent = Math.min(spiritEnergyAvailable, SPIRIT_COST_PER_SECOND * deltaSec)

  // Comprehension grows only during cultivation ticks (and only when spirit is available)
  const comprehensionGrowth = spiritScale > 0 ? calcComprehensionGrowth(character) : {}

  return { cultivationGained: gained, spiritSpent: spent, comprehensionGrowth }
}

/**
 * Check if a character can breakthrough.
 * Requires enough cultivation AND not being at the max stage of the last realm.
 * Optionally checks if the player has enough spirit stones.
 */
export function canBreakthrough(
  character: Character,
  costs?: { spiritStone?: number; spiritEnergy?: number },
  availableResources?: { spiritStone: number; spiritEnergy: number }
): boolean {
  const realm = REALMS[character.realm]
  if (!realm) return false

  // Cannot breakthrough if at the max stage of the last realm
  const isLastRealm = character.realm >= REALMS.length - 1
  const maxStage = realm.stages.length - 1
  if (isLastRealm && character.realmStage >= maxStage) {
    return false
  }

  const needed = getCultivationNeeded(character.realm, character.realmStage)
  if (character.cultivation < needed) return false

  if (costs && availableResources) {
    if (costs.spiritStone !== undefined && availableResources.spiritStone < costs.spiritStone) {
      return false
    }
    if (costs.spiritEnergy !== undefined && availableResources.spiritEnergy < costs.spiritEnergy) {
      return false
    }
  }

  return true
}

/**
 * Calculate base stat growth for a breakthrough.
 */
function calcStatGrowth(
  currentStats: BaseStats,
  isMajorRealm: boolean,
  growthMultipliers?: GrowthMultipliers
): BaseStats {
  const gm = growthMultipliers ?? { hp: 1, atk: 1, def: 1, spd: 1 }

  if (isMajorRealm) {
    return {
      hp: Math.floor(currentStats.hp * MAJOR_REALM_STAT_MULT * gm.hp),
      atk: Math.floor(currentStats.atk * MAJOR_REALM_STAT_MULT * gm.atk),
      def: Math.floor(currentStats.def * MAJOR_REALM_STAT_MULT * gm.def),
      spd: Math.floor(currentStats.spd * MAJOR_REALM_STAT_MULT * gm.spd),
      crit: Math.min(currentStats.crit, 0.75),
      critDmg: currentStats.critDmg,
    }
  }

  // Sub-level: ~15% growth toward next major realm stats
  const nextRealmStats: BaseStats = {
    hp: Math.floor(currentStats.hp * MAJOR_REALM_STAT_MULT * gm.hp),
    atk: Math.floor(currentStats.atk * MAJOR_REALM_STAT_MULT * gm.atk),
    def: Math.floor(currentStats.def * MAJOR_REALM_STAT_MULT * gm.def),
    spd: Math.floor(currentStats.spd * MAJOR_REALM_STAT_MULT * gm.spd),
    crit: currentStats.crit,
    critDmg: currentStats.critDmg,
  }

  const growth = (target: number, current: number) => {
    const diff = target - current
    return current + Math.floor(diff * SUBLEVEL_STAT_FRACTION)
  }

  return {
    hp: growth(nextRealmStats.hp, currentStats.hp),
    atk: growth(nextRealmStats.atk, currentStats.atk),
    def: growth(nextRealmStats.def, currentStats.def),
    spd: growth(nextRealmStats.spd, currentStats.spd),
    crit: currentStats.crit,
    critDmg: currentStats.critDmg,
  }
}

/**
 * Attempt breakthrough for a character.
 *
 * failureRate: probability of failure (0~1). On failure, realm/stage stay the same
 * and the caller should reset cultivation to 0.
 */
export function breakthrough(
  character: Character,
  failureRate: number = 0,
  growthMultipliers?: GrowthMultipliers
): BreakthroughResult {
  if (!canBreakthrough(character)) {
    return {
      success: false,
      newRealm: character.realm,
      newStage: character.realmStage,
      oldStats: { ...character.baseStats },
      newStats: { ...character.baseStats },
    }
  }

  // Roll for failure
  if (failureRate > 0 && Math.random() < failureRate) {
    return {
      success: false,
      newRealm: character.realm,
      newStage: character.realmStage,
      oldStats: { ...character.baseStats },
      newStats: { ...character.baseStats },
    }
  }

  const oldStats = { ...character.baseStats }
  const realm = REALMS[character.realm]
  const nextStage = (character.realmStage + 1) as RealmStage
  const isMajorRealm = nextStage >= realm.stages.length

  const newStats = calcStatGrowth(oldStats, isMajorRealm, growthMultipliers)

  return {
    success: true,
    newRealm: isMajorRealm ? character.realm + 1 : character.realm,
    newStage: isMajorRealm ? 0 : nextStage,
    oldStats,
    newStats,
  }
}
