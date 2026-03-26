import type { Character, BaseStats } from '../../types/character'
import type { Technique, TechniqueTier } from '../../types/technique'
import { TECHNIQUE_TIER_ORDER } from '../../types/technique'
import { getBonusThresholds, TECHNIQUES } from '../../data/techniquesTable'

/**
 * Tier speed multipliers for comprehension gain.
 * Higher tier = slower comprehension.
 */
const TIER_MULTIPLIER: Record<TechniqueTier, number> = {
  mortal: 1.0,
  spirit: 0.7,
  immortal: 0.4,
  divine: 0.2,
  chaos: 0.1,
}

/**
 * Get the comprehension effect tier for a given comprehension level.
 *
 * 0-29   -> 0.3
 * 30-69  -> 0.7
 * 70-100 -> 1.0
 */
export function getComprehensionEffect(comprehension: number): number {
  if (comprehension >= 70) return 1.0
  if (comprehension >= 30) return 0.7
  return 0.3
}

/**
 * Get active fixed bonuses for a technique based on current comprehension level.
 * Re-exports the logic from techniquesTable but uses the comprehension thresholds.
 */
export function getActiveBonuses(
  technique: Technique,
  comprehension: number,
): Array<{ type: string; value: number }> {
  const thresholds = getBonusThresholds(technique)
  return technique.fixedBonuses.filter((_, i) => comprehension >= thresholds[i])
}

/**
 * Check if a character meets the requirements to learn a technique.
 */
export function canLearnTechnique(character: Character, technique: Technique): boolean {
  return (
    character.realm >= technique.requirements.minRealm &&
    character.cultivationStats.comprehension >= technique.requirements.minComprehension
  )
}

/**
 * Tick comprehension for a single character.
 *
 * @returns { gained, failed } — gained is the delta (can be negative on failure),
 *          failed indicates if a comprehension setback occurred.
 */
export function tickComprehension(
  character: Character,
  technique: Technique,
  deltaSec: number,
): { gained: number; failed: boolean } {
  // Skip if already maxed
  if (character.techniqueComprehension >= 100) {
    return { gained: 0, failed: false }
  }

  const baseRate = 0.1 // %/s
  const comprehensionBonus = character.cultivationStats.comprehension / 10
  const tierMultiplier = TIER_MULTIPLIER[technique.tier]

  let gained = baseRate * comprehensionBonus * tierMultiplier * deltaSec

  // Failure check: only for difficulty >= 3
  let failed = false
  const difficulty = technique.comprehensionDifficulty
  if (difficulty >= 3) {
    const failChance = 0.02 * difficulty * (1 - character.cultivationStats.comprehension / 100)
    if (Math.random() < failChance) {
      failed = true
      gained = -(1 + Math.random() * 2)
    }
  }

  // Clamp result
  const newComprehension = Math.max(0, Math.min(100, character.techniqueComprehension + gained))

  return {
    gained: newComprehension - character.techniqueComprehension,
    failed,
  }
}

/**
 * Batch comprehension tick for all cultivating characters.
 *
 * @returns Map of character.id -> { gained, failed }
 */
export function tickAllComprehension(
  characters: Character[],
  getTechniqueById: (id: string) => Technique | undefined,
  deltaSec: number,
): Map<string, { gained: number; failed: boolean }> {
  const results = new Map<string, { gained: number; failed: boolean }>()

  for (const char of characters) {
    // Skip non-cultivating characters
    if (char.status !== 'cultivating') continue

    // Skip characters without a technique
    if (!char.currentTechnique) continue

    // Skip characters at 100% comprehension
    if (char.techniqueComprehension >= 100) continue

    const technique = getTechniqueById(char.currentTechnique)
    if (!technique) continue

    results.set(char.id, tickComprehension(char, technique, deltaSec))
  }

  return results
}

/**
 * Calculate offline comprehension gain (deterministic, expected value).
 *
 * Uses expected value accounting for failure probability and average setback.
 */
export function calcOfflineComprehension(
  character: Character,
  technique: Technique,
  seconds: number,
): number {
  // Skip if already maxed
  if (character.techniqueComprehension >= 100) return 100

  const baseRate = 0.1
  const comprehensionBonus = character.cultivationStats.comprehension / 10
  const tierMultiplier = TIER_MULTIPLIER[technique.tier]

  const normalGainPerSec = baseRate * comprehensionBonus * tierMultiplier

  const difficulty = technique.comprehensionDifficulty
  let expectedGainPerSec = normalGainPerSec

  if (difficulty >= 3) {
    const failChance = 0.02 * difficulty * (1 - character.cultivationStats.comprehension / 100)
    const avgBacktrack = 2 // midpoint of 1-3
    expectedGainPerSec = normalGainPerSec - (failChance * avgBacktrack)
  }

  const newComprehension = Math.max(0, Math.min(100, character.techniqueComprehension + expectedGainPerSec * seconds))

  return newComprehension
}

/**
 * Apply technique growth modifiers to base stats.
 *
 * At comprehension 0 (effect = 0.3), growth is slightly modified.
 * At comprehension 100 (effect = 1.0), growth is fully modified.
 *
 * Formula: base * (1 + (modifier - 1) * effect)
 */
export function applyTechniqueGrowth(
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
 * Tier ceiling for breakthrough comprehension: realm index maps to max tier.
 */
const REALM_TIER_CEILING: TechniqueTier[] = [
  'mortal', 'spirit', 'immortal', 'divine', 'chaos',
]

/**
 * Attempt breakthrough comprehension. Returns technique ID or null.
 */
export function tryComprehendOnBreakthrough(
  character: { learnedTechniques: string[]; realm: number },
  techniqueCodex: string[],
  isMajor: boolean,
  randomFn: () => number = Math.random,
): string | null {
  const chance = isMajor ? 0.40 : 0.15
  if (randomFn() >= chance) return null

  const maxTier = REALM_TIER_CEILING[Math.min(character.realm, 4)]
  const maxTierIdx = TECHNIQUE_TIER_ORDER.indexOf(maxTier)

  // Filter: unlocked in codex + not yet learned + tier <= ceiling
  const candidates = TECHNIQUES.filter((t) => {
    if (!techniqueCodex.includes(t.id)) return false
    if (character.learnedTechniques.includes(t.id)) return false
    const tierIdx = TECHNIQUE_TIER_ORDER.indexOf(t.tier)
    return tierIdx <= maxTierIdx
  })

  if (candidates.length === 0) return null
  return candidates[Math.floor(randomFn() * candidates.length)].id
}

/**
 * Pick a technique for the ancient_cave adventure event based on floor number.
 */
export function pickTechniqueForFloor(
  floorNumber: number,
  randomFn: () => number = Math.random,
): string {
  const roll = randomFn()
  let tier: TechniqueTier

  if (floorNumber <= 5) {
    tier = roll < 0.7 ? 'mortal' : 'spirit'
  } else if (floorNumber <= 10) {
    tier = roll < 0.7 ? 'spirit' : 'immortal'
  } else {
    tier = roll < 0.7 ? 'immortal' : 'divine'
  }

  const pool = TECHNIQUES.filter((t) => t.tier === tier)
  return pool[Math.floor(randomFn() * pool.length)].id
}
