import { describe, it, expect } from 'vitest'
import { rollSpecialties, getSpecialtyBonus, getBuildingBonus } from '../systems/character/SpecialtySystem'
import type { Specialty } from '../types/character'

describe('rollSpecialties', () => {
  it('common quality always returns empty array', () => {
    for (let i = 0; i < 100; i++) {
      const result = rollSpecialties('common')
      expect(result).toEqual([])
    }
  })

  it('spirit quality returns 0-1 specialties', () => {
    for (let i = 0; i < 100; i++) {
      const result = rollSpecialties('spirit')
      expect(result.length).toBeLessThanOrEqual(1)
      expect(result.length).toBeGreaterThanOrEqual(0)
    }
  })

  it('immortal quality always returns exactly 1 specialty', () => {
    for (let i = 0; i < 100; i++) {
      const result = rollSpecialties('immortal')
      expect(result.length).toBe(1)
      expect(result[0].type).toBeDefined()
      expect([1, 2, 3]).toContain(result[0].level)
    }
  })

  it('chaos quality returns 1-2 specialties', () => {
    for (let i = 0; i < 100; i++) {
      const result = rollSpecialties('chaos')
      expect(result.length).toBeGreaterThanOrEqual(1)
      expect(result.length).toBeLessThanOrEqual(2)
    }
  })

  it('specialty types are valid', () => {
    const validTypes = ['alchemy', 'forging', 'mining', 'herbalism', 'comprehension', 'combat', 'fortune', 'leadership']
    for (let i = 0; i < 200; i++) {
      const result = rollSpecialties('chaos')
      for (const s of result) {
        expect(validTypes).toContain(s.type)
      }
    }
  })
})

describe('getSpecialtyBonus', () => {
  it('returns correct bonus values for each level', () => {
    const spec: Specialty = { type: 'alchemy', level: 1 }
    expect(getSpecialtyBonus(spec.type, spec.level)).toBe(0.15)

    spec.level = 2
    expect(getSpecialtyBonus(spec.type, spec.level)).toBe(0.30)

    spec.level = 3
    expect(getSpecialtyBonus(spec.type, spec.level)).toBe(0.50)
  })

  it('returns different values for different specialty types', () => {
    const alchemy = getSpecialtyBonus('alchemy', 1)
    const combat = getSpecialtyBonus('combat', 1)
    expect(alchemy).not.toBe(combat)
  })
})

describe('getBuildingBonus', () => {
  it('returns 1.0 when no specialties match', () => {
    const specialties: Specialty[] = [
      { type: 'combat', level: 2 },
      { type: 'fortune', level: 1 },
    ]
    expect(getBuildingBonus('alchemyFurnace', specialties)).toBeCloseTo(1.0)
  })

  it('returns bonus when matching specialty exists', () => {
    const specialties: Specialty[] = [
      { type: 'alchemy', level: 2 },
    ]
    const bonus = getBuildingBonus('alchemyFurnace', specialties)
    expect(bonus).toBeCloseTo(1.30) // 1 + 0.30
  })

  it('takes highest level when multiple same-type specialties', () => {
    const specialties: Specialty[] = [
      { type: 'alchemy', level: 1 },
      { type: 'alchemy', level: 3 },
    ]
    const bonus = getBuildingBonus('alchemyFurnace', specialties)
    expect(bonus).toBeCloseTo(1.50) // 1 + 0.50 (level 3 wins)
  })
})
