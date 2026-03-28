import {
  generateCharacter,
  getQualityStats,
  calcCharacterTotalStats,
  getMaxCharacters,
  getMaxSimultaneousRuns,
  calcSectLevel,
  getRecruitCost,
  isQualityUnlocked,
  getAvailableQualities,
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
    bonuses: [{ type: 'hp', value: 10 }],
    requirements: { minRealm: 0, minComprehension: 0 },
    ...overrides,
  }
}

// --- Tests ---

describe('CharacterEngine', () => {
  describe('generateCharacter', () => {
    it('should generate common character with correct quality', () => {
      const c = generateCharacter('common')
      expect(c.quality).toBe('common')
      // Base stats vary ±20% around base values
      expect(c.baseStats.hp).toBeGreaterThanOrEqual(80)
      expect(c.baseStats.hp).toBeLessThanOrEqual(120)
      expect(c.cultivationStats.spiritualRoot).toBeGreaterThanOrEqual(8)
      expect(c.cultivationStats.spiritualRoot).toBeLessThanOrEqual(12)
      expect(c.cultivationStats.comprehension).toBeGreaterThanOrEqual(8)
      expect(c.cultivationStats.comprehension).toBeLessThanOrEqual(12)
      expect(c.cultivationStats.fortune).toBeGreaterThanOrEqual(4)
      expect(c.cultivationStats.fortune).toBeLessThanOrEqual(6)
    })

    it('should generate spirit character with higher base stats', () => {
      const c = generateCharacter('spirit')
      expect(c.quality).toBe('spirit')
      // spiritualRoot base 15 ±18% => ~12-18, talent can add up to +8
      expect(c.cultivationStats.spiritualRoot).toBeGreaterThanOrEqual(12)
      // comprehension base 13 ±18% => ~11-15, talent can add up to +5
      expect(c.cultivationStats.comprehension).toBeGreaterThanOrEqual(11)
      // fortune base 8 ±18% => ~7-9, talent can add up to +5
      expect(c.cultivationStats.fortune).toBeGreaterThanOrEqual(7)
    })

    it('should generate divine character with high stats', () => {
      const c = generateCharacter('divine')
      // spiritualRoot base 28 ±12% => ~24-31, talent can add up to +8
      expect(c.cultivationStats.spiritualRoot).toBeGreaterThanOrEqual(24)
      // comprehension base 25 ±12% => ~22-28, talent can add up to +5
      expect(c.cultivationStats.comprehension).toBeGreaterThanOrEqual(22)
      // fortune base 18 ±12% => ~16-20, talent can add up to +5
      expect(c.cultivationStats.fortune).toBeGreaterThanOrEqual(16)
    })

    it('should assign unique IDs', () => {
      const ids = new Set<string>()
      for (let i = 0; i < 100; i++) {
        ids.add(generateCharacter('common').id)
      }
      expect(ids.size).toBe(100)
    })

    it('should have empty backpack, no gear, default technique learned', () => {
      const c = generateCharacter('common')
      expect(c.backpack).toEqual([])
      expect(c.equippedGear).toEqual([])
      expect(c.equippedSkills).toEqual([])
      expect(c.learnedTechniques).toEqual(['qingxin'])
      expect(c.petIds).toEqual([])
    })

    it('should have status idle', () => {
      const c = generateCharacter('common')
      expect(c.status).toBe('idle')
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
    it('should return base stats + default technique when no equipment', () => {
      const c = generateCharacter('common')
      const result = calcCharacterTotalStats(c, c.learnedTechniques, () => undefined)
      // default technique qingxin: hp +10, atk +2, def +2, spd +1
      expect(result.hp).toBe(c.baseStats.hp + 10)
      expect(result.atk).toBe(c.baseStats.atk + 2)
      expect(result.def).toBe(c.baseStats.def + 2)
      expect(result.spd).toBe(c.baseStats.spd + 1)
    })

    it('should add equipment stats', () => {
      const c = generateCharacter('common')
      c.equippedGear = ['eq_1']
      const eq = makeEquipment({ hp: 50, atk: 10 })
      const result = calcCharacterTotalStats(c, c.learnedTechniques, (id) => id === 'eq_1' ? eq : undefined)
      // base + qingxin bonuses + equipment
      expect(result.hp).toBe(c.baseStats.hp + 10 + 50)
      expect(result.atk).toBe(c.baseStats.atk + 2 + 10)
      expect(result.def).toBe(c.baseStats.def + 2)
    })

    it('should sum flat bonuses from all learned techniques', () => {
      const c = generateCharacter('common')
      // qingxin: hp +10, atk +2, def +2, spd +1
      // lieyan: atk +5, crit +0.02
      c.learnedTechniques = ['qingxin', 'lieyan']
      const result = calcCharacterTotalStats(c, c.learnedTechniques, () => undefined)
      expect(result.hp).toBe(c.baseStats.hp + 10)
      expect(result.atk).toBe(c.baseStats.atk + 2 + 5)
      expect(result.def).toBe(c.baseStats.def + 2)
      expect(result.spd).toBe(c.baseStats.spd + 1)
      expect(result.crit).toBeCloseTo(c.baseStats.crit + 0.02, 3)
    })

    it('should return base stats when no techniques learned', () => {
      const c = generateCharacter('common')
      c.learnedTechniques = []
      const result = calcCharacterTotalStats(c, c.learnedTechniques, () => undefined)
      expect(result.hp).toBe(c.baseStats.hp)
      expect(result.atk).toBe(c.baseStats.atk)
      expect(result.def).toBe(c.baseStats.def)
      expect(result.spd).toBe(c.baseStats.spd)
      expect(result.crit).toBe(c.baseStats.crit)
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

describe('generateCharacter with variance', () => {
  it('should generate common character with stats within ±20% range', () => {
    for (let i = 0; i < 50; i++) {
      const c = generateCharacter('common')
      // Base stats can be boosted by talents (e.g., +30 hp from busizun, +15 hp from xianti)
      expect(c.baseStats.hp).toBeGreaterThanOrEqual(80)
      expect(c.baseStats.atk).toBeGreaterThanOrEqual(12)
      expect(c.cultivationStats.spiritualRoot).toBeGreaterThanOrEqual(8)
      expect(c.cultivationStats.maxSpiritPower).toBeGreaterThanOrEqual(80)
      expect(c.cultivationStats.spiritPower).toBe(0)
    }
  })

  it('should generate divine character with stats within ±12% range', () => {
    for (let i = 0; i < 50; i++) {
      const c = generateCharacter('divine')
      // hp base 100 ±12% => 88-112, talent can add up to +45
      expect(c.baseStats.hp).toBeGreaterThanOrEqual(88)
      // spiritualRoot base 28 ±12% => ~24-31, talent can add up to +8
      expect(c.cultivationStats.spiritualRoot).toBeGreaterThanOrEqual(24)
    }
  })

  it('should have talents array on every character', () => {
    const c = generateCharacter('common')
    expect(Array.isArray(c.talents)).toBe(true)
  })

  it('should not have duplicate talents', () => {
    for (let i = 0; i < 100; i++) {
      const c = generateCharacter('immortal')
      const ids = c.talents.map(t => t.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})

describe('getRecruitCost', () => {
  it('should return correct costs', () => {
    expect(getRecruitCost('common')).toBe(100)
    expect(getRecruitCost('spirit')).toBe(500)
    expect(getRecruitCost('immortal')).toBe(2000)
    expect(getRecruitCost('divine')).toBe(8000)
  })

  it('should return 0 for chaos (not directly recruitable)', () => {
    expect(getRecruitCost('chaos')).toBe(0)
  })
})

describe('isQualityUnlocked', () => {
  it('common at level 1', () => expect(isQualityUnlocked('common', 1)).toBe(true))
  it('spirit at level 1', () => expect(isQualityUnlocked('spirit', 1)).toBe(false))
  it('spirit at level 2', () => expect(isQualityUnlocked('spirit', 2)).toBe(true))
  it('immortal at level 3', () => expect(isQualityUnlocked('immortal', 3)).toBe(true))
  it('divine at level 4', () => expect(isQualityUnlocked('divine', 4)).toBe(true))
  it('chaos always locked', () => expect(isQualityUnlocked('chaos', 5)).toBe(false))
})

describe('getAvailableQualities', () => {
  it('level 1 should return [common]', () => expect(getAvailableQualities(1)).toEqual(['common']))
  it('level 2 should return [common, spirit]', () => expect(getAvailableQualities(2)).toEqual(['common', 'spirit']))
  it('level 4 should return [common, spirit, immortal, divine]', () => expect(getAvailableQualities(4)).toEqual(['common', 'spirit', 'immortal', 'divine']))
  it('level 5+ should also return [common, spirit, immortal, divine]', () => expect(getAvailableQualities(5)).toEqual(['common', 'spirit', 'immortal', 'divine']))
})

describe('chaos upgrade from divine', () => {
  it('should occasionally produce chaos quality when recruiting divine', () => {
    let chaosCount = 0
    const n = 2000
    for (let i = 0; i < n; i++) {
      const c = generateCharacter('divine')
      if (c.quality === 'chaos') chaosCount++
    }
    expect(chaosCount).toBeGreaterThan(0)
    expect(chaosCount).toBeLessThan(n * 0.05)
  })
})

describe('talent weight distribution', () => {
  it('common quality: ~40% should have exactly 1 talent', () => {
    let countWithTalent = 0
    const n = 500
    for (let i = 0; i < n; i++) {
      const c = generateCharacter('common')
      if (c.talents.length >= 1) countWithTalent++
    }
    expect(countWithTalent).toBeGreaterThan(n * 0.25)
    expect(countWithTalent).toBeLessThan(n * 0.55)
  })

  it('divine quality: all should have at least 1 talent', () => {
    for (let i = 0; i < 100; i++) {
      const c = generateCharacter('divine')
      expect(c.talents.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('talent rarity distribution should follow weights', () => {
    const rarityCounts = { common: 0, rare: 0, epic: 0 }
    for (let i = 0; i < 500; i++) {
      const c = generateCharacter('immortal')
      for (const t of c.talents) {
        rarityCounts[t.rarity]++
      }
    }
    const total = rarityCounts.common + rarityCounts.rare + rarityCounts.epic
    if (total > 0) {
      expect(rarityCounts.common / total).toBeGreaterThan(0.3)
      expect(rarityCounts.rare / total).toBeGreaterThan(0.2)
      if (rarityCounts.epic > 0) {
        expect(rarityCounts.epic / total).toBeLessThan(0.3)
      }
    }
  })
})
