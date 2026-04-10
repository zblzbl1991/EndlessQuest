import { describe, it, expect } from 'vitest'
import { generateGrowthMultipliers, getDefaultGrowthMultipliers } from '../systems/character/GrowthMultiplierSystem'

describe('GrowthMultiplierSystem', () => {
  describe('getDefaultGrowthMultipliers', () => {
    it('returns all 1.0', () => {
      const gm = getDefaultGrowthMultipliers()
      expect(gm.hp).toBe(1)
      expect(gm.atk).toBe(1)
      expect(gm.def).toBe(1)
      expect(gm.spd).toBe(1)
      expect(gm.crit).toBe(1)
      expect(gm.critDmg).toBe(1)
    })
  })

  describe('generateGrowthMultipliers', () => {
    it('generates values in common quality range (0.6~1.3, sum 4.0~6.5)', () => {
      for (let i = 0; i < 100; i++) {
        const gm = generateGrowthMultipliers('common')
        const values = [gm.hp, gm.atk, gm.def, gm.spd, gm.crit, gm.critDmg]
        const sum = values.reduce((a, b) => a + b, 0)

        for (const v of values) {
          expect(v).toBeGreaterThanOrEqual(0.59)
          expect(v).toBeLessThanOrEqual(1.31)
        }
        expect(sum).toBeGreaterThanOrEqual(3.99)
        expect(sum).toBeLessThanOrEqual(6.51)
      }
    })

    it('generates values in chaos quality range (0.8~1.7, sum 6.0~8.5)', () => {
      for (let i = 0; i < 100; i++) {
        const gm = generateGrowthMultipliers('chaos')
        const values = [gm.hp, gm.atk, gm.def, gm.spd, gm.crit, gm.critDmg]
        const sum = values.reduce((a, b) => a + b, 0)

        for (const v of values) {
          expect(v).toBeGreaterThanOrEqual(0.79)
          expect(v).toBeLessThanOrEqual(1.71)
        }
        expect(sum).toBeGreaterThanOrEqual(5.99)
        expect(sum).toBeLessThanOrEqual(8.51)
      }
    })

    it('produces all six stat keys', () => {
      const gm = generateGrowthMultipliers('spirit')
      expect(gm).toHaveProperty('hp')
      expect(gm).toHaveProperty('atk')
      expect(gm).toHaveProperty('def')
      expect(gm).toHaveProperty('spd')
      expect(gm).toHaveProperty('crit')
      expect(gm).toHaveProperty('critDmg')
    })
  })
})
