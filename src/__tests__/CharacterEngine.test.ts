import {
  generateCharacter,
  getQualityStats,
  calcCharacterTotalStats,
  getMaxCharacters,
  getMaxSimultaneousRuns,
  calcSectLevel,
} from '../systems/character/CharacterEngine'
import type { CharacterQuality } from '../types/character'
import type { Technique } from '../types/technique'
import type { Equipment } from '../types/item'

// --- Test helpers ---

function makeEquipment(overrides: Partial<Equipment['stats']> = {}): Equipment {
  return {
    id: 'eq_1',
    name: 'Test Sword',
    quality: 'common',
    type: 'equipment',
    slot: 'weapon',
    description: 'A test weapon',
    sellPrice: 10,
    enhanceLevel: 0,
    refinementStats: [],
    setId: null,
    stats: { hp: 0, atk: 0, def: 0, spd: 0, crit: 0, critDmg: 0, ...overrides },
  }
}

function makeTechnique(overrides: Partial<Technique> = {}): Technique {
  return {
    id: 'tech_1',
    name: 'Test Technique',
    description: 'A test technique',
    tier: 'mortal',
    element: 'neutral',
    growthModifiers: { hp: 0.1, atk: 0.1, def: 0.1, spd: 0.1, crit: 0.01, critDmg: 0.1 },
    fixedBonuses: [],
    requirements: { minRealm: 0, minComprehension: 0 },
    comprehensionDifficulty: 50,
    ...overrides,
  }
}

// --- Tests ---

describe('CharacterEngine', () => {
  describe('generateCharacter', () => {
    it('should generate common character with correct base stats', () => {
      const c = generateCharacter('common')
      expect(c.quality).toBe('common')
      expect(c.baseStats).toEqual({ hp: 100, atk: 15, def: 8, spd: 10, crit: 0.05, critDmg: 1.5 })
      expect(c.cultivationStats.spiritualRoot).toBe(10)
      expect(c.cultivationStats.comprehension).toBe(10)
      expect(c.cultivationStats.fortune).toBe(5)
    })

    it('should generate spirit character with higher spiritualRoot (15)', () => {
      const c = generateCharacter('spirit')
      expect(c.quality).toBe('spirit')
      expect(c.cultivationStats.spiritualRoot).toBe(15)
      expect(c.cultivationStats.comprehension).toBe(13)
      expect(c.cultivationStats.fortune).toBe(8)
    })

    it('should generate divine character with spiritualRoot 28', () => {
      const c = generateCharacter('divine')
      expect(c.cultivationStats.spiritualRoot).toBe(28)
      expect(c.cultivationStats.comprehension).toBe(25)
      expect(c.cultivationStats.fortune).toBe(18)
    })

    it('should assign unique IDs', () => {
      const ids = new Set<string>()
      for (let i = 0; i < 100; i++) {
        ids.add(generateCharacter('common').id)
      }
      expect(ids.size).toBe(100)
    })

    it('should have empty backpack, no technique, no gear', () => {
      const c = generateCharacter('common')
      expect(c.backpack).toEqual([])
      expect(c.currentTechnique).toBeNull()
      expect(c.equippedGear).toEqual([])
      expect(c.equippedSkills).toEqual([])
      expect(c.learnedTechniques).toEqual([])
      expect(c.petIds).toEqual([])
    })

    it('should have status cultivating', () => {
      const c = generateCharacter('common')
      expect(c.status).toBe('cultivating')
    })
  })

  describe('getQualityStats', () => {
    const qualities: CharacterQuality[] = ['common', 'spirit', 'immortal', 'divine', 'chaos']
    const expected: Record<CharacterQuality, { spiritualRoot: number; comprehension: number; fortune: number }> = {
      common: { spiritualRoot: 10, comprehension: 10, fortune: 5 },
      spirit: { spiritualRoot: 15, comprehension: 13, fortune: 8 },
      immortal: { spiritualRoot: 20, comprehension: 18, fortune: 12 },
      divine: { spiritualRoot: 28, comprehension: 25, fortune: 18 },
      chaos: { spiritualRoot: 35, comprehension: 30, fortune: 25 },
    }

    for (const q of qualities) {
      it(`should return correct stats for ${q}`, () => {
        expect(getQualityStats(q)).toEqual(expected[q])
      })
    }
  })

  describe('calcCharacterTotalStats', () => {
    it('should return base stats when no equipment or technique', () => {
      const c = generateCharacter('common')
      const result = calcCharacterTotalStats(c, null, () => undefined)
      expect(result).toEqual(c.baseStats)
    })

    it('should add equipment stats', () => {
      const c = generateCharacter('common')
      c.equippedGear = ['eq_1']
      const eq = makeEquipment({ hp: 50, atk: 10 })
      const result = calcCharacterTotalStats(c, null, (id) => id === 'eq_1' ? eq : undefined)
      expect(result.hp).toBe(150)
      expect(result.atk).toBe(25)
      expect(result.def).toBe(8) // unchanged
    })

    it('should apply technique growth modifiers at full comprehension', () => {
      const c = generateCharacter('common')
      c.techniqueComprehension = 80 // 70-100 => effect 1.0
      const tech = makeTechnique({ growthModifiers: { hp: 0.2, atk: 0.1, def: 0.05, spd: 0, crit: 0.01, critDmg: 0.1 } })
      const result = calcCharacterTotalStats(c, tech, () => undefined)
      // base hp=100, growth=100*0.2=20 => total 120
      expect(result.hp).toBe(120)
      // base atk=15, growth=15*0.1=1.5 => total 16.5
      expect(result.atk).toBe(16.5)
      // base def=8, growth=8*0.05=0.4 => total 8.4
      expect(result.def).toBe(8.4)
    })

    it('should apply technique growth modifiers at partial comprehension (30%)', () => {
      const c = generateCharacter('common')
      c.techniqueComprehension = 30 // 30-70 => effect 0.7
      const tech = makeTechnique({ growthModifiers: { hp: 0.2, atk: 0.1, def: 0.05, spd: 0, crit: 0.01, critDmg: 0.1 } })
      const result = calcCharacterTotalStats(c, tech, () => undefined)
      // hp: 100 + 100*0.2*0.7 = 100 + 14 = 114
      expect(result.hp).toBe(114)
      // atk: 15 + 15*0.1*0.7 = 15 + 1.05 = 16.05
      expect(result.atk).toBeCloseTo(16.05, 5)
    })

    it('should apply technique flat bonuses based on comprehension threshold', () => {
      const c = generateCharacter('common')
      c.techniqueComprehension = 80
      const tech = makeTechnique({
        growthModifiers: { hp: 0, atk: 0, def: 0, spd: 0, crit: 0, critDmg: 0 },
        fixedBonuses: [
          { type: 'atk', value: 5 },   // unlocked at comprehension 30
          { type: 'hp', value: 100 },   // unlocked at comprehension 70
          { type: 'crit', value: 0.02 }, // unlocked at comprehension 100 — should NOT apply at 80
        ],
      })
      const result = calcCharacterTotalStats(c, tech, () => undefined)
      // base atk=15, bonus 5 = 20
      expect(result.atk).toBe(20)
      // base hp=100, bonus 100 = 200
      expect(result.hp).toBe(200)
      // crit bonus 0.02 not applied because 80 < 100
      expect(result.crit).toBe(0.05)
    })
  })

  describe('getMaxCharacters', () => {
    it('should return 5 for sect level 1', () => {
      expect(getMaxCharacters(1)).toBe(5)
    })

    it('should return 30 for sect level 5', () => {
      expect(getMaxCharacters(5)).toBe(30)
    })
  })

  describe('getMaxSimultaneousRuns', () => {
    it('should return 1 for level 1-2', () => {
      expect(getMaxSimultaneousRuns(1)).toBe(1)
      expect(getMaxSimultaneousRuns(2)).toBe(1)
    })

    it('should return 2 for level 3-4', () => {
      expect(getMaxSimultaneousRuns(3)).toBe(2)
      expect(getMaxSimultaneousRuns(4)).toBe(2)
    })

    it('should return 3 for level 5', () => {
      expect(getMaxSimultaneousRuns(5)).toBe(3)
    })
  })

  describe('calcSectLevel', () => {
    it('should return 1 for mainHall 1', () => {
      expect(calcSectLevel(1)).toBe(1)
    })

    it('should return 2 for mainHall 3', () => {
      expect(calcSectLevel(3)).toBe(2)
    })

    it('should return 5 for mainHall 10', () => {
      expect(calcSectLevel(10)).toBe(5)
    })
  })
})
