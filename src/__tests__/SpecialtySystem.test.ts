import { describe, it, expect } from 'vitest'
import {
  rollSpecialties,
  getSpecialtyBonus,
  getBuildingBonus,
  getPrimaryRole,
  getRecommendedAssignment,
  getRoleLabel,
} from '../systems/character/SpecialtySystem'
import type { Character, Specialty } from '../types/character'

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

// --- Role helper tests ---

function makeCharacter(specialties: Specialty[]): Character {
  return {
    id: 'test_1',
    name: 'Test Disciple',
    title: 'disciple',
    quality: 'immortal',
    realm: 3,
    realmStage: 0,
    cultivation: 0,
    baseStats: { hp: 100, atk: 15, def: 8, spd: 10, crit: 0.05, critDmg: 1.5 },
    cultivationStats: { spiritPower: 0, maxSpiritPower: 100, comprehension: 10, spiritualRoot: 10, fortune: 5 },
    learnedTechniques: [],
    equippedGear: [],
    equippedSkills: [],
    backpack: [],
    maxBackpackSlots: 10,
    petIds: [],
    talents: [],
    status: 'idle',
    injuryTimer: 0,
    createdAt: Date.now(),
    totalCultivation: 0,
    specialties,
    assignedBuilding: null,
    fateTags: [],
  }
}

describe('getPrimaryRole', () => {
  it('should return "alchemy" for alchemy specialty', () => {
    const char = makeCharacter([{ type: 'alchemy', level: 1 }])
    expect(getPrimaryRole(char)).toBe('alchemy')
  })

  it('should return "combat" for combat specialty', () => {
    const char = makeCharacter([{ type: 'combat', level: 1 }])
    expect(getPrimaryRole(char)).toBe('combat')
  })

  it('should return "fortune" for fortune specialty', () => {
    const char = makeCharacter([{ type: 'fortune', level: 1 }])
    expect(getPrimaryRole(char)).toBe('fortune')
  })

  it('should return the first specialty when multiple exist', () => {
    const char = makeCharacter([
      { type: 'alchemy', level: 2 },
      { type: 'combat', level: 1 },
    ])
    expect(getPrimaryRole(char)).toBe('alchemy')
  })

  it('should return null for character with no specialties', () => {
    const char = makeCharacter([])
    expect(getPrimaryRole(char)).toBeNull()
  })

  it('should return "mining" for mining specialty', () => {
    const char = makeCharacter([{ type: 'mining', level: 1 }])
    expect(getPrimaryRole(char)).toBe('mining')
  })

  it('should return "herbalism" for herbalism specialty', () => {
    const char = makeCharacter([{ type: 'herbalism', level: 1 }])
    expect(getPrimaryRole(char)).toBe('herbalism')
  })
})

describe('getRecommendedAssignment', () => {
  it('should return "alchemyFurnace" for alchemy specialty', () => {
    const char = makeCharacter([{ type: 'alchemy', level: 1 }])
    expect(getRecommendedAssignment(char)).toBe('alchemyFurnace')
  })

  it('should return "spiritMine" for mining specialty', () => {
    const char = makeCharacter([{ type: 'mining', level: 1 }])
    expect(getRecommendedAssignment(char)).toBe('spiritMine')
  })

  it('should return "spiritField" for herbalism specialty', () => {
    const char = makeCharacter([{ type: 'herbalism', level: 1 }])
    expect(getRecommendedAssignment(char)).toBe('spiritField')
  })

  it('should return "forge" for forging specialty', () => {
    const char = makeCharacter([{ type: 'forging', level: 1 }])
    expect(getRecommendedAssignment(char)).toBe('forge')
  })

  it('should return "scriptureHall" for comprehension specialty', () => {
    const char = makeCharacter([{ type: 'comprehension', level: 1 }])
    expect(getRecommendedAssignment(char)).toBe('scriptureHall')
  })

  it('should return "adventure" for combat specialty', () => {
    const char = makeCharacter([{ type: 'combat', level: 1 }])
    expect(getRecommendedAssignment(char)).toBe('adventure')
  })

  it('should return "adventure" for fortune specialty', () => {
    const char = makeCharacter([{ type: 'fortune', level: 1 }])
    expect(getRecommendedAssignment(char)).toBe('adventure')
  })

  it('should return null for character with no specialties', () => {
    const char = makeCharacter([])
    expect(getRecommendedAssignment(char)).toBeNull()
  })

  it('should use first specialty for assignment when multiple exist', () => {
    const char = makeCharacter([
      { type: 'mining', level: 1 },
      { type: 'alchemy', level: 2 },
    ])
    expect(getRecommendedAssignment(char)).toBe('spiritMine')
  })
})

describe('getRoleLabel', () => {
  it('should return "炼丹" for alchemy', () => {
    expect(getRoleLabel('alchemy')).toBe('炼丹')
  })

  it('should return "战斗" for combat', () => {
    expect(getRoleLabel('combat')).toBe('战斗')
  })

  it('should return "探险" for fortune', () => {
    expect(getRoleLabel('fortune')).toBe('探险')
  })

  it('should return "锻造" for forging', () => {
    expect(getRoleLabel('forging')).toBe('锻造')
  })

  it('should return "采矿" for mining', () => {
    expect(getRoleLabel('mining')).toBe('采矿')
  })

  it('should return "采药" for herbalism', () => {
    expect(getRoleLabel('herbalism')).toBe('采药')
  })

  it('should return "参悟" for comprehension', () => {
    expect(getRoleLabel('comprehension')).toBe('参悟')
  })

  it('should return "统领" for leadership', () => {
    expect(getRoleLabel('leadership')).toBe('统领')
  })

  it('should return empty string for unknown role', () => {
    expect(getRoleLabel('unknown')).toBe('')
  })
})
