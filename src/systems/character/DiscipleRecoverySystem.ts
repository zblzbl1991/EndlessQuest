import type { CharacterQuality } from '../../types/character'

const RECOVERY_DAY_RANGES: Record<CharacterQuality, readonly [number, number]> = {
  common: [1, 3],
  spirit: [2, 4],
  immortal: [3, 6],
  divine: [5, 8],
  chaos: [6, 10],
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

export { RECOVERY_DAY_RANGES }
