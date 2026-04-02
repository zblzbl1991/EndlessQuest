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
  rollRecruitQuality,
} from '../systems/character/CharacterEngine'
import { observeBuildingLevel, resetObservedBuildingLevels } from '../data/buildings'
import type { CharacterQuality } from '../types/character'
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

// --- Tests ---

describe('CharacterEngine', () => {
  beforeEach(() => {
    resetObservedBuildingLevels()
  })

  describe('generateCharacter', () => {
    it('should generate common character with correct quality', () => {
      const c = generateCharacter('common')
      expect(c.quality).toBe('common')
      // Base stats vary ±20% around base values; rare talents can boost cultivation stats.
      expect(c.baseStats.hp).toBeGreaterThanOrEqual(80)
      expect(c.baseStats.hp).toBeLessThanOrEqual(150)
      expect(c.cultivationStats.spiritualRoot).toBeGreaterThanOrEqual(8)
      expect(c.cultivationStats.spiritualRoot).toBeLessThanOrEqual(17)
      expect(c.cultivationStats.comprehension).toBeGreaterThanOrEqual(8)
      expect(c.cultivationStats.comprehension).toBeLessThanOrEqual(17)
      expect(c.cultivationStats.fortune).toBeGreaterThanOrEqual(4)
      expect(c.cultivationStats.fortune).toBeLessThanOrEqual(11)
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
      expect(c.equippedSkills).toHaveLength(5)
      expect(c.equippedSkills[0]).toBe('sword_qi')
      expect(c.learnedTechniques).toEqual(['qingxin'])
      expect(c.petIds).toEqual([])
    })

    it('should start without a cultivation path before the breakthrough choice', () => {
      const c = generateCharacter('divine')
      expect(c.cultivationPath).toBe('none')
    })

    it('should roll specialties based on character quality', () => {
      const common = generateCharacter('common')
      const immortal = generateCharacter('immortal')
      const divine = generateCharacter('divine')

      expect(common.specialties).toEqual([])
      expect(immortal.specialties).toHaveLength(1)
      expect(divine.specialties.length).toBeGreaterThanOrEqual(1)
    })

    it('should not bias recruits from observed building levels anymore', () => {
      observeBuildingLevel('forge', 4)
      observeBuildingLevel('alchemyFurnace', 3)
      observeBuildingLevel('scriptureHall', 3)

      const c = generateCharacter('common')

      expect(c.learnedTechniques).toEqual(['qingxin'])
      expect(c.specialties).toEqual([])
    })

    it('should bias recruits toward the active sect route identity', () => {
      const c = generateCharacter('divine', 'sword')

      expect(c.learnedTechniques).toEqual(['qingxin'])
      expect(c.specialties.some((spec) => spec.type === 'combat')).toBe(true)
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
      const result = calcCharacterTotalStats(c, c.learnedTechniques, (id) => (id === 'eq_1' ? eq : undefined))
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
      expect(result.crit).toBeCloseTo(c.baseStats.crit, 3)
    })

    it('should apply cultivation path bonuses to total stats', () => {
      const c = generateCharacter('common')
      c.cultivationPath = 'sword'
      const result = calcCharacterTotalStats(c, c.learnedTechniques, () => undefined)

      expect(result.atk).toBe(Math.floor((c.baseStats.atk + 2) * 1.2))
      expect(result.spd).toBe(Math.floor((c.baseStats.spd + 1) * 1.1))
    })
  })

  describe('getMaxCharacters', () => {
    it('should return 10 for sect level 1 (5 + 1*5)', () => {
      expect(getMaxCharacters(1)).toBe(10)
    })

    it('should return 15 for sect level 2 (5 + 2*5)', () => {
      expect(getMaxCharacters(2)).toBe(15)
    })

    it('should return 20 for sect level 3', () => {
      expect(getMaxCharacters(3)).toBe(20)
    })

    it('should return 30 for sect level 5', () => {
      expect(getMaxCharacters(5)).toBe(30)
    })

    it('should return 55 for sect level 10 (5 + 10*5)', () => {
      expect(getMaxCharacters(10)).toBe(55)
    })

    it('should clamp level 0 to level 1, returning 10', () => {
      expect(getMaxCharacters(0)).toBe(10)
    })

    it('should clamp level 15 to level 10, returning 55', () => {
      expect(getMaxCharacters(15)).toBe(55)
    })
  })

  describe('getMaxSimultaneousRuns', () => {
    it('should return 1 for level 1', () => {
      expect(getMaxSimultaneousRuns(1)).toBe(1)
    })

    it('should return 2 for level 2', () => {
      expect(getMaxSimultaneousRuns(2)).toBe(2)
    })

    it('should return 3 for level 3', () => {
      expect(getMaxSimultaneousRuns(3)).toBe(3)
    })

    it('should return 4 for level 4', () => {
      expect(getMaxSimultaneousRuns(4)).toBe(4)
    })

    it('should return 5 for level 5', () => {
      expect(getMaxSimultaneousRuns(5)).toBe(5)
    })

    it('should return 10 for level 10', () => {
      expect(getMaxSimultaneousRuns(10)).toBe(10)
    })

    it('should clamp level 0 to level 1, returning 1', () => {
      expect(getMaxSimultaneousRuns(0)).toBe(1)
    })

    it('should clamp level 15 to level 10, returning 10', () => {
      expect(getMaxSimultaneousRuns(15)).toBe(10)
    })
  })

  describe('calcSectLevel', () => {
    it('should return 1 for mainHall 0 (clamped)', () => {
      expect(calcSectLevel(0)).toBe(1)
    })

    it('should return 1 for mainHall 1', () => {
      expect(calcSectLevel(1)).toBe(1)
    })

    it('should return 2 for mainHall 2', () => {
      expect(calcSectLevel(2)).toBe(2)
    })

    it('should return 3 for mainHall 3', () => {
      expect(calcSectLevel(3)).toBe(3)
    })

    it('should return 5 for mainHall 5', () => {
      expect(calcSectLevel(5)).toBe(5)
    })

    it('should return 8 for mainHall 8', () => {
      expect(calcSectLevel(8)).toBe(8)
    })

    it('should return 10 for mainHall 10', () => {
      expect(calcSectLevel(10)).toBe(10)
    })

    it('should return 10 for mainHall 15 (clamped)', () => {
      expect(calcSectLevel(15)).toBe(10)
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
      const ids = c.talents.map((t) => t.id)
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
  it('spirit at level 1 (requires 3)', () => expect(isQualityUnlocked('spirit', 1)).toBe(false))
  it('spirit at level 2 (requires 3)', () => expect(isQualityUnlocked('spirit', 2)).toBe(false))
  it('spirit at level 3', () => expect(isQualityUnlocked('spirit', 3)).toBe(true))
  it('immortal at level 5 (requires 6)', () => expect(isQualityUnlocked('immortal', 5)).toBe(false))
  it('immortal at level 6', () => expect(isQualityUnlocked('immortal', 6)).toBe(true))
  it('divine at level 8 (requires 9)', () => expect(isQualityUnlocked('divine', 8)).toBe(false))
  it('divine at level 9', () => expect(isQualityUnlocked('divine', 9)).toBe(true))
  it('chaos always locked', () => expect(isQualityUnlocked('chaos', 10)).toBe(false))
})

describe('getAvailableQualities', () => {
  it('level 1 should return [common]', () => expect(getAvailableQualities(1)).toEqual(['common']))
  it('level 2 should return [common]', () => expect(getAvailableQualities(2)).toEqual(['common']))
  it('level 3 should return [common, spirit]', () => expect(getAvailableQualities(3)).toEqual(['common', 'spirit']))
  it('level 5 should return [common, spirit]', () => expect(getAvailableQualities(5)).toEqual(['common', 'spirit']))
  it('level 6 should return [common, spirit, immortal]', () =>
    expect(getAvailableQualities(6)).toEqual(['common', 'spirit', 'immortal']))
  it('level 9 should return [common, spirit, immortal, divine]', () =>
    expect(getAvailableQualities(9)).toEqual(['common', 'spirit', 'immortal', 'divine']))
  it('level 10 should return [common, spirit, immortal, divine]', () =>
    expect(getAvailableQualities(10)).toEqual(['common', 'spirit', 'immortal', 'divine']))
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

describe('rollRecruitQuality', () => {
  it('should always return common for sect level 1', () => {
    for (let i = 0; i < 100; i++) {
      expect(rollRecruitQuality(1)).toBe('common')
    }
  })

  it('should always return common for sect level 2', () => {
    for (let i = 0; i < 100; i++) {
      expect(rollRecruitQuality(2)).toBe('common')
    }
  })

  it('should mostly return common but occasionally spirit at level 3', () => {
    let spiritCount = 0
    const n = 1000
    for (let i = 0; i < n; i++) {
      const q = rollRecruitQuality(3)
      expect(q === 'common' || q === 'spirit').toBe(true)
      if (q === 'spirit') spiritCount++
    }
    // ~15% chance of spirit
    expect(spiritCount).toBeGreaterThan(n * 0.05)
    expect(spiritCount).toBeLessThan(n * 0.3)
  })

  it('should occasionally roll spirit at level 5 but never immortal', () => {
    let spiritCount = 0
    const n = 1000
    for (let i = 0; i < n; i++) {
      const q = rollRecruitQuality(5)
      expect(q === 'common' || q === 'spirit').toBe(true)
      if (q === 'spirit') spiritCount++
    }
    expect(spiritCount).toBeGreaterThan(n * 0.05)
    expect(spiritCount).toBeLessThan(n * 0.3)
  })

  it('should roll spirit and immortal at level 6 but never divine', () => {
    let spiritCount = 0
    let immortalCount = 0
    const n = 1000
    for (let i = 0; i < n; i++) {
      const q = rollRecruitQuality(6)
      expect(q === 'common' || q === 'spirit' || q === 'immortal').toBe(true)
      if (q === 'spirit') spiritCount++
      if (q === 'immortal') immortalCount++
    }
    expect(spiritCount).toBeGreaterThan(0)
    expect(immortalCount).toBeGreaterThan(0)
  })

  it('should roll all unlocked qualities including divine at level 9', () => {
    const qualities = new Set<CharacterQuality>()
    const n = 2000
    for (let i = 0; i < n; i++) {
      const q = rollRecruitQuality(9)
      expect(q === 'common' || q === 'spirit' || q === 'immortal' || q === 'divine').toBe(true)
      qualities.add(q)
    }
    expect(qualities.has('common')).toBe(true)
    expect(qualities.has('spirit')).toBe(true)
    expect(qualities.has('immortal')).toBe(true)
    expect(qualities.has('divine')).toBe(true)
  })

  it('should return common as the most frequent quality at level 10', () => {
    const counts: Record<string, number> = { common: 0, spirit: 0, immortal: 0, divine: 0 }
    const n = 2000
    for (let i = 0; i < n; i++) {
      const q = rollRecruitQuality(10)
      counts[q] = (counts[q] ?? 0) + 1
    }
    expect(counts['common']).toBeGreaterThan(counts['spirit'])
    expect(counts['spirit']).toBeGreaterThan(counts['immortal'])
  })
})
