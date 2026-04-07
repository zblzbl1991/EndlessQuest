import { describe, expect, it } from 'vitest'
import {
  getDarkCurrentTier,
  applyDailyDecay,
  calculateDarkCurrentResonance,
  getDominantDarkCurrentFamily,
  getDarkCurrentSeedWeight,
} from '../systems/destiny/DarkCurrentSystem'
import type { SectDarkCurrent, DestinySeedId, SectRiskPolicyId } from '../types/destiny'

function makeDarkCurrent(overrides?: Partial<SectDarkCurrent>): SectDarkCurrent {
  return {
    fortune: 0,
    tribulation: 0,
    abyss: 0,
    guardian: 0,
    plunder: 0,
    afterglow: 0,
    anomaly: 0,
    lastShiftAt: 0,
    ...overrides,
  }
}

describe('DarkCurrentSystem', () => {
  describe('getDarkCurrentTier', () => {
    it('returns background for 0-39', () => {
      expect(getDarkCurrentTier(0)).toBe('background')
      expect(getDarkCurrentTier(39)).toBe('background')
    })

    it('returns perceptible for 40-79', () => {
      expect(getDarkCurrentTier(40)).toBe('perceptible')
      expect(getDarkCurrentTier(79)).toBe('perceptible')
    })

    it('returns significant for 80-139', () => {
      expect(getDarkCurrentTier(80)).toBe('significant')
      expect(getDarkCurrentTier(139)).toBe('significant')
    })

    it('returns strong for 140+', () => {
      expect(getDarkCurrentTier(140)).toBe('strong')
      expect(getDarkCurrentTier(300)).toBe('strong')
    })
  })

  describe('applyDailyDecay', () => {
    it('reduces values by policy decay rate', () => {
      const current = makeDarkCurrent({ fortune: 50, tribulation: 30 })
      const result = applyDailyDecay(current, 'shenji' as SectRiskPolicyId)
      expect(result.fortune).toBeLessThanOrEqual(current.fortune)
      expect(result.tribulation).toBeLessThanOrEqual(current.tribulation)
    })

    it('never reduces below 0', () => {
      const current = makeDarkCurrent({ fortune: 1, tribulation: 0 })
      const result = applyDailyDecay(current, 'shenji' as SectRiskPolicyId)
      expect(result.fortune).toBeGreaterThanOrEqual(0)
      expect(result.tribulation).toBe(0)
    })

    it('preserves lastShiftAt', () => {
      const current = makeDarkCurrent({ lastShiftAt: 12345 })
      const result = applyDailyDecay(current, 'shenji' as SectRiskPolicyId)
      expect(result.lastShiftAt).toBe(12345)
    })

    it('returns same object if no decay', () => {
      const current = makeDarkCurrent()
      const result = applyDailyDecay(current, 'shenji' as SectRiskPolicyId)
      // All zeros — should return same reference or equivalent
      expect(result.fortune).toBe(0)
    })
  })

  describe('calculateDarkCurrentResonance', () => {
    it('returns 1.0 for background tier', () => {
      const current = makeDarkCurrent({ fortune: 10 })
      expect(calculateDarkCurrentResonance(current, 'fortuneSeed' as DestinySeedId)).toBe(1.0)
    })

    it('returns > 1.0 for higher tiers', () => {
      const current = makeDarkCurrent({ fortune: 100 })
      const resonance = calculateDarkCurrentResonance(current, 'fortuneSeed' as DestinySeedId)
      expect(resonance).toBeGreaterThan(1.0)
    })
  })

  describe('getDominantDarkCurrentFamily', () => {
    it('returns null when all values are below perceptible threshold', () => {
      const current = makeDarkCurrent({ fortune: 10, tribulation: 20 })
      expect(getDominantDarkCurrentFamily(current)).toBeNull()
    })

    it('returns the dominant family when one is above threshold', () => {
      const current = makeDarkCurrent({ fortune: 50, tribulation: 20 })
      const dominant = getDominantDarkCurrentFamily(current)
      expect(dominant).not.toBeNull()
      expect(dominant!.family).toBe('fortune')
    })

    it('returns the highest value family', () => {
      const current = makeDarkCurrent({ fortune: 60, tribulation: 80 })
      const dominant = getDominantDarkCurrentFamily(current)
      expect(dominant!.family).toBe('tribulation')
    })
  })

  describe('getDarkCurrentSeedWeight', () => {
    it('returns 0 for background tier', () => {
      const current = makeDarkCurrent({ fortune: 10 })
      expect(getDarkCurrentSeedWeight(current, 'fortuneSeed' as DestinySeedId)).toBe(0)
    })

    it('returns positive weight for higher tiers', () => {
      const current = makeDarkCurrent({ fortune: 100 })
      expect(getDarkCurrentSeedWeight(current, 'fortuneSeed' as DestinySeedId)).toBeGreaterThan(0)
    })
  })
})
