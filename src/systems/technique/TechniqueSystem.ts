import type { Character } from '../../types/character'
import type { Technique, TechniqueTier } from '../../types/technique'
import { TECHNIQUE_TIER_ORDER } from '../../types/technique'
import { TECHNIQUES } from '../../data/techniquesTable'

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
 * Tier ceiling for breakthrough comprehension: realm index maps to max tier.
 */
const REALM_TIER_CEILING: TechniqueTier[] = [
  'mortal', 'spirit', 'immortal', 'divine', 'chaos',
]

/**
 * Attempt breakthrough comprehension. Returns technique ID or null.
 *
 * Requires character.cultivationStats.comprehension >= technique.requirements.minComprehension
 * for a technique to be a candidate.
 */
export function tryComprehendOnBreakthrough(
  character: { learnedTechniques: string[]; realm: number; cultivationStats: { comprehension: number } },
  techniqueCodex: string[],
  isMajor: boolean,
  randomFn: () => number = Math.random,
): string | null {
  const chance = isMajor ? 0.40 : 0.15
  if (randomFn() >= chance) return null

  const maxTier = REALM_TIER_CEILING[Math.min(character.realm, 4)]
  const maxTierIdx = TECHNIQUE_TIER_ORDER.indexOf(maxTier)

  // Filter: unlocked in codex + not yet learned + tier <= ceiling + comprehension requirement met
  const candidates = TECHNIQUES.filter((t) => {
    if (!techniqueCodex.includes(t.id)) return false
    if (character.learnedTechniques.includes(t.id)) return false
    const tierIdx = TECHNIQUE_TIER_ORDER.indexOf(t.tier)
    if (tierIdx > maxTierIdx) return false
    if (character.cultivationStats.comprehension < t.requirements.minComprehension) return false
    return true
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
