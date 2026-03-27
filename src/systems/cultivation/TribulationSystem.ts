import type { Character } from '../../types/character'
import { REALMS } from '../../data/realms'

export interface TribulationResult {
  success: boolean
  severe?: boolean
  injuryTimer?: number
}

/**
 * Check if a breakthrough should trigger tribulation.
 * Only major realm breakthroughs to realms with tribulationPower trigger.
 */
export function shouldTriggerTribulation(realm: number, realmStage: number): boolean {
  // Only major realm breakthroughs (stage 3 → next realm)
  if (realmStage !== 3) return false

  const targetRealm = realm + 1
  if (targetRealm >= REALMS.length) return false

  const power = REALMS[targetRealm].tribulationPower
  return power !== undefined && power !== null && power > 0
}

/**
 * Resolve tribulation outcome for a character attempting major realm breakthrough.
 */
export function resolveTribulation(character: Character): TribulationResult {
  const targetRealm = character.realm + 1
  const realmData = REALMS[targetRealm]
  const power = realmData.tribulationPower ?? 0
  const baseFailRate = 0.10 + power * 0.25

  // Character attributes reduce failure rate
  const spiritRootBonus = character.cultivationStats.spiritualRoot * 0.005
  const comprehensionBonus = character.cultivationStats.comprehension * 0.003

  const failRate = Math.max(0, baseFailRate - spiritRootBonus - comprehensionBonus)

  // Huashen special: stage multiplier increases tribulation difficulty
  let stageMultiplier = 1.0
  if (character.realm === 4) {
    const currentRealmData = REALMS[character.realm]
    if (currentRealmData.tribulationStages) {
      stageMultiplier = currentRealmData.tribulationStages[character.realmStage] ?? 1.0
    }
  }
  const finalFailRate = Math.min(0.95, failRate * stageMultiplier)

  if (Math.random() >= finalFailRate) {
    return { success: true }
  }

  // Failure: 10% chance of severe outcome
  const severe = Math.random() < 0.10
  return {
    success: false,
    severe,
    injuryTimer: severe ? 120 : 60,
  }
}
