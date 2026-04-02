import type { CharacterQuality } from '../../types/character'
import type { CasualtyTolerance } from '../../types/sect'

const RECOVERY_DAY_RANGES: Record<CharacterQuality, readonly [number, number]> = {
  common: [1, 3],
  spirit: [2, 4],
  immortal: [3, 6],
  divine: [5, 8],
  chaos: [6, 10],
}

const FAILURE_RECOVERY_CHANCES: Record<CasualtyTolerance, number> = {
  conservative: 0.4,
  balanced: 0.25,
  risky: 0.15,
}

export function getRecoveryDaysForQuality(quality: CharacterQuality): number {
  const [minDays, maxDays] = RECOVERY_DAY_RANGES[quality]
  return minDays + Math.floor(Math.random() * (maxDays - minDays + 1))
}

export function tickRecoveryDays(
  currentDays: number,
  elapsedDays: number
): {
  remainingDays: number
  recovered: boolean
} {
  const remainingDays = Math.max(0, currentDays - elapsedDays)
  return {
    remainingDays,
    recovered: remainingDays === 0,
  }
}

export function resolveAdventureFailureOutcome(
  quality: CharacterQuality,
  casualtyTolerance: CasualtyTolerance
): {
  outcome: 'recovering' | 'sacrificed'
  recoveryDays: number
} {
  if (Math.random() < FAILURE_RECOVERY_CHANCES[casualtyTolerance]) {
    return {
      outcome: 'recovering',
      recoveryDays: getRecoveryDaysForQuality(quality),
    }
  }

  return {
    outcome: 'sacrificed',
    recoveryDays: 0,
  }
}

export { FAILURE_RECOVERY_CHANCES, RECOVERY_DAY_RANGES }
