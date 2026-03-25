import type { Character, BaseStats, RealmStage } from '../../types/character'
import type { Technique } from '../../types/technique'
import { REALMS, getCultivationNeeded } from '../../data/realms'
import { getComprehensionEffect, getActiveBonuses } from '../technique/TechniqueSystem'

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
}

export interface BreakthroughResult {
  success: boolean
  newRealm: number
  newStage: RealmStage
  newStats: BaseStats
  oldStats: BaseStats
}

/**
 * Calculate cultivation rate per second for a character.
 *
 * Takes optional technique into account for cultivationRate bonus.
 */
export function calcCultivationRate(character: Character, technique: Technique | null): number {
  const spiritualRoot = character.cultivationStats.spiritualRoot
  const rootBonus = 1 + (spiritualRoot - 10) * 0.02 // base 10 = +0%, each point +2%
  const realmMult = REALM_CULTIVATION_MULT[character.realm] ?? 0.5

  let rate = BASE_CULTIVATION_RATE * rootBonus * realmMult

  // Apply cultivationRate bonus from technique's fixed bonuses
  if (technique) {
    const activeBonuses = getActiveBonuses(technique, character.techniqueComprehension)
    const cultivationBonus = activeBonuses.find(b => b.type === 'cultivationRate')
    if (cultivationBonus) {
      rate *= (1 + cultivationBonus.value)
    }
  }

  return rate
}

export function calcSpiritCostPerSecond(): number {
  return SPIRIT_COST_PER_SECOND
}

export function canCultivate(spiritEnergy: number): boolean {
  return spiritEnergy >= SPIRIT_COST_PER_SECOND
}

/**
 * Tick cultivation for a single character.
 * Returns cultivation gained and spirit energy spent.
 */
export function tick(
  character: Character,
  spiritEnergyAvailable: number,
  deltaSec: number,
  technique: Technique | null = null,
): TickResult {
  if (!canCultivate(spiritEnergyAvailable)) {
    return { cultivationGained: 0, spiritSpent: 0 }
  }

  const rate = calcCultivationRate(character, technique)
  const gained = rate * deltaSec
  const spent = SPIRIT_COST_PER_SECOND * deltaSec

  return { cultivationGained: gained, spiritSpent: spent }
}

/**
 * Check if a character can breakthrough.
 * Requires enough cultivation AND not being at the max stage of the last realm.
 */
export function canBreakthrough(character: Character): boolean {
  const realm = REALMS[character.realm]
  if (!realm) return false

  // Cannot breakthrough if at the max stage of the last realm
  const isLastRealm = character.realm >= REALMS.length - 1
  const maxStage = realm.stages.length - 1
  if (isLastRealm && character.realmStage >= maxStage) {
    return false
  }

  const needed = getCultivationNeeded(character.realm, character.realmStage)
  return character.cultivation >= needed
}

/**
 * Calculate base stat growth for a breakthrough.
 */
function calcStatGrowth(currentStats: BaseStats, isMajorRealm: boolean): BaseStats {
  if (isMajorRealm) {
    return {
      hp: Math.floor(currentStats.hp * MAJOR_REALM_STAT_MULT),
      atk: Math.floor(currentStats.atk * MAJOR_REALM_STAT_MULT),
      def: Math.floor(currentStats.def * MAJOR_REALM_STAT_MULT),
      spd: Math.floor(currentStats.spd * MAJOR_REALM_STAT_MULT),
      crit: Math.min(currentStats.crit, 0.75),
      critDmg: currentStats.critDmg,
    }
  }

  // Sub-level: ~15% growth toward next major realm stats
  const nextRealmStats: BaseStats = {
    hp: Math.floor(currentStats.hp * MAJOR_REALM_STAT_MULT),
    atk: Math.floor(currentStats.atk * MAJOR_REALM_STAT_MULT),
    def: Math.floor(currentStats.def * MAJOR_REALM_STAT_MULT),
    spd: Math.floor(currentStats.spd * MAJOR_REALM_STAT_MULT),
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
 * Apply technique growth modifiers to base stats growth.
 * Uses comprehension level to scale the effect.
 */
function applyTechniqueGrowthToStats(
  baseGrowth: BaseStats,
  technique: Technique,
  comprehension: number,
): BaseStats {
  const effect = getComprehensionEffect(comprehension)
  const gm = technique.growthModifiers

  return {
    hp: baseGrowth.hp * (1 + (gm.hp - 1) * effect),
    atk: baseGrowth.atk * (1 + (gm.atk - 1) * effect),
    def: baseGrowth.def * (1 + (gm.def - 1) * effect),
    spd: baseGrowth.spd * (1 + (gm.spd - 1) * effect),
    crit: baseGrowth.crit * (1 + (gm.crit - 1) * effect),
    critDmg: baseGrowth.critDmg * (1 + (gm.critDmg - 1) * effect),
  }
}

/**
 * Attempt breakthrough for a character.
 *
 * If a technique is provided and the character has comprehension > 0,
 * stat growth is modified by the technique's growth modifiers.
 */
export function breakthrough(
  character: Character,
  technique: Technique | null,
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

  const oldStats = { ...character.baseStats }
  const realm = REALMS[character.realm]
  const nextStage = (character.realmStage + 1) as RealmStage
  const isMajorRealm = nextStage >= realm.stages.length

  let baseGrowth = calcStatGrowth(oldStats, isMajorRealm)

  // Apply technique growth modifiers if technique is provided
  if (technique && character.techniqueComprehension > 0) {
    baseGrowth = applyTechniqueGrowthToStats(baseGrowth, technique, character.techniqueComprehension)
  }

  return {
    success: true,
    newRealm: isMajorRealm ? character.realm + 1 : character.realm,
    newStage: isMajorRealm ? 0 : nextStage,
    oldStats,
    newStats: baseGrowth,
  }
}
