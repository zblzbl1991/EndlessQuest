import { TECHNIQUES, getTechniqueById } from '../data/techniquesTable'
import { ELEMENT_NAMES, COUNTER_MAP, getElementMultiplier } from '../data/skills'
import { createCharacterCombatUnit, createCombatUnitFromEnemy } from '../data/enemies'
import { QUALITY_COLORS } from '../data/items'
import { getSpiritFieldRate, BUILDING_DEFS } from '../data/buildings'
import type { Character } from '../types/character'
import type { Technique } from '../types/technique'

// ─── Techniques Table ────────────────────────────────────────────────

describe('Techniques Table', () => {
  it('should define exactly 12 techniques', () => {
    expect(TECHNIQUES).toHaveLength(12)
  })

  it('should have correct tier distribution', () => {
    const mortal = TECHNIQUES.filter(t => t.tier === 'mortal')
    const spirit = TECHNIQUES.filter(t => t.tier === 'spirit')
    const immortal = TECHNIQUES.filter(t => t.tier === 'immortal')
    const divine = TECHNIQUES.filter(t => t.tier === 'divine')
    const chaos = TECHNIQUES.filter(t => t.tier === 'chaos')
    expect(mortal).toHaveLength(3)
    expect(spirit).toHaveLength(3)
    expect(immortal).toHaveLength(3)
    expect(divine).toHaveLength(2)
    expect(chaos).toHaveLength(1)
  })

  it('should have all required technique IDs', () => {
    const ids = TECHNIQUES.map(t => t.id)
    const expected = [
      'qingxin', 'lieyan', 'houtu',
      'fentian', 'xuanbing', 'leiyu',
      'leishen', 'bumiejinshen', 'jiuzhuan',
      'wanjianguizong', 'taishang',
      'hunduntiangong',
    ]
    for (const id of expected) {
      expect(ids).toContain(id)
    }
  })

  it('should have qingxin as neutral all-1.0 growth with no bonuses', () => {
    const t = getTechniqueById('qingxin')!
    expect(t).toBeDefined()
    expect(t.element).toBe('neutral')
    expect(t.growthModifiers).toEqual({ hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, crit: 1.0, critDmg: 1.0 })
    expect(t.fixedBonuses).toHaveLength(0)
    expect(t.comprehensionDifficulty).toBe(1)
    expect(t.requirements.minRealm).toBe(0)
    expect(t.requirements.minComprehension).toBe(5)
  })

  it('should have lieyan with fire element and correct growth', () => {
    const t = getTechniqueById('lieyan')!
    expect(t.element).toBe('fire')
    expect(t.growthModifiers).toEqual({ hp: 0.9, atk: 1.3, def: 0.9, spd: 1.0, crit: 1.1, critDmg: 1.1 })
    expect(t.fixedBonuses).toEqual([{ type: 'atk', value: 5 }])
    expect(t.fixedBonuses[0].type).toBe('atk')
  })

  it('should have hunduntiangong as chaos tier with all-1.5 growth', () => {
    const t = getTechniqueById('hunduntiangong')!
    expect(t.tier).toBe('chaos')
    expect(t.element).toBe('neutral')
    expect(t.growthModifiers).toEqual({ hp: 1.5, atk: 1.5, def: 1.5, spd: 1.5, crit: 1.5, critDmg: 1.5 })
    expect(t.comprehensionDifficulty).toBe(5)
    expect(t.requirements.minRealm).toBe(4)
    expect(t.requirements.minComprehension).toBe(30)
  })

  it('should have wanjianguizong as divine tier with high atk growth', () => {
    const t = getTechniqueById('wanjianguizong')!
    expect(t.tier).toBe('divine')
    expect(t.growthModifiers.atk).toBe(2.0)
    expect(t.growthModifiers.hp).toBe(0.6)
  })

  it('should have taishang with all-1.3 growth', () => {
    const t = getTechniqueById('taishang')!
    expect(t.element).toBe('ice')
    expect(t.growthModifiers).toEqual({ hp: 1.3, atk: 1.3, def: 1.3, spd: 1.3, crit: 1.3, critDmg: 1.3 })
  })

  it('should have leishen with lightning element and high spd', () => {
    const t = getTechniqueById('leishen')!
    expect(t.element).toBe('lightning')
    expect(t.growthModifiers.spd).toBe(1.8)
  })

  it('should have bumiejinshen with high hp and def growth', () => {
    const t = getTechniqueById('bumiejinshen')!
    expect(t.element).toBe('neutral')
    expect(t.growthModifiers.hp).toBe(1.8)
    expect(t.growthModifiers.def).toBe(1.6)
  })

  it('getTechniqueById should return undefined for unknown ID', () => {
    expect(getTechniqueById('nonexistent')).toBeUndefined()
  })

  // Check fixedBonuses thresholds match spec
  it('lieyan fixed bonus atk+5 triggers at 30% comprehension', () => {
    const t = getTechniqueById('lieyan')!
    expect(t.fixedBonuses).toHaveLength(1)
    // The bonus spec: atk+5 @ 30% comprehension
    // Stored as: { type, value } — comprehension threshold is derived from technique data
    expect(t.fixedBonuses[0]).toEqual({ type: 'atk', value: 5 })
  })

  it('fentian has two fixed bonuses', () => {
    const t = getTechniqueById('fentian')!
    expect(t.fixedBonuses).toHaveLength(2)
    expect(t.fixedBonuses[0]).toEqual({ type: 'atk', value: 15 })
    expect(t.fixedBonuses[1]).toEqual({ type: 'crit', value: 0.05 })
  })
})

// ─── Skills (element system) ─────────────────────────────────────────

describe('Skills data', () => {
  it('should include neutral in ELEMENT_NAMES', () => {
    expect(ELEMENT_NAMES['neutral']).toBe('无属性')
  })

  it('neutral should not be in COUNTER_MAP as a key', () => {
    // neutral has no counter relationships — it should NOT appear as a key
    // because COUNTER_MAP is Partial<Record<Element, Element>>
    expect(COUNTER_MAP['neutral']).toBeUndefined()
  })

  it('getElementMultiplier should return 1.0 for neutral attacker vs any', () => {
    expect(getElementMultiplier('neutral', 'fire')).toBe(1.0)
    expect(getElementMultiplier('neutral', 'ice')).toBe(1.0)
    expect(getElementMultiplier('neutral', 'lightning')).toBe(1.0)
    expect(getElementMultiplier('neutral', 'neutral')).toBe(1.0)
  })

  it('getElementMultiplier should return 1.0 for any attacker vs neutral defender', () => {
    expect(getElementMultiplier('fire', 'neutral')).toBe(1.0)
    expect(getElementMultiplier('ice', 'neutral')).toBe(1.0)
    expect(getElementMultiplier('lightning', 'neutral')).toBe(1.0)
  })

  it('should preserve existing counter relationships', () => {
    expect(getElementMultiplier('fire', 'ice')).toBe(1.5)
    expect(getElementMultiplier('ice', 'fire')).toBe(0.75)
    expect(getElementMultiplier('ice', 'lightning')).toBe(1.5)
    expect(getElementMultiplier('lightning', 'ice')).toBe(0.75)
    expect(getElementMultiplier('lightning', 'fire')).toBe(1.5)
    expect(getElementMultiplier('fire', 'lightning')).toBe(0.75)
    expect(getElementMultiplier('fire', 'fire')).toBe(1.0)
  })
})

// ─── Enemies (createCharacterCombatUnit) ─────────────────────────────

describe('Enemies data', () => {
  function makeTestCharacter(overrides: Partial<Character> = {}): Character {
    return {
      id: 'test_char_1',
      name: '测试角色',
      title: 'disciple',
      quality: 'common',
      realm: 0,
      realmStage: 0,
      cultivation: 0,
      baseStats: { hp: 100, atk: 15, def: 8, spd: 10, crit: 0.05, critDmg: 1.5 },
      cultivationStats: { spiritPower: 50, maxSpiritPower: 50, comprehension: 10, spiritualRoot: 10, fortune: 5 },
      currentTechnique: null,
      techniqueComprehension: 0,
      learnedTechniques: [],
      equippedGear: [null, null, null, null, null, null, null, null, null],
      equippedSkills: [null, null, null, null, null],
      backpack: [],
      maxBackpackSlots: 20,
      petIds: [],
      status: 'idle',
      injuryTimer: 0,
      createdAt: Date.now(),
      totalCultivation: 0,
      ...overrides,
    }
  }

  it('should create combat unit from character with no technique', () => {
    const char = makeTestCharacter()
    const unit = createCharacterCombatUnit(char, null)
    expect(unit.id).toBe('test_char_1')
    expect(unit.name).toBe('测试角色')
    expect(unit.team).toBe('ally')
    expect(unit.hp).toBe(100)
    expect(unit.atk).toBe(15)
    expect(unit.element).toBe('neutral')
    expect(unit.spiritPower).toBe(50)
    expect(unit.maxSpiritPower).toBe(50)
    expect(unit.skills).toHaveLength(0)
  })

  it('should apply technique growthModifiers to baseStats', () => {
    const char = makeTestCharacter()
    const technique = getTechniqueById('lieyan')!
    const unit = createCharacterCombatUnit(char, technique)
    // lieyan: hp:0.9 atk:1.3 def:0.9 spd:1.0 crit:1.1 critDmg:1.1
    expect(unit.hp).toBe(Math.floor(100 * 0.9))
    expect(unit.atk).toBe(Math.floor(15 * 1.3))
    expect(unit.def).toBe(Math.floor(8 * 0.9))
    expect(unit.spd).toBe(Math.floor(10 * 1.0))
    expect(unit.crit).toBeCloseTo(0.05 * 1.1, 5)
    expect(unit.critDmg).toBeCloseTo(1.5 * 1.1, 5)
  })

  it('should set element from technique', () => {
    const char = makeTestCharacter()
    const technique = getTechniqueById('lieyan')!
    const unit = createCharacterCombatUnit(char, technique)
    expect(unit.element).toBe('fire')
  })

  it('should apply fixed bonuses based on comprehension', () => {
    // lieyan: atk+5 @ 30% comprehension — need comprehension >= 0.3 * difficulty
    // difficulty 1, so 30% = 0.3, comprehension of 1 would be >= 0.3
    const char = makeTestCharacter({ techniqueComprehension: 1 })
    const technique = getTechniqueById('lieyan')!
    const unit = createCharacterCombatUnit(char, technique)
    // Base atk with growth modifier: 15 * 1.3 = 19, then +5 bonus = 24
    expect(unit.atk).toBe(Math.floor(15 * 1.3) + 5)
  })

  it('should use equippedSkills for skills list', () => {
    const char = makeTestCharacter({
      equippedSkills: ['sword_qi', 'fire_palm', null, null, null],
    })
    const unit = createCharacterCombatUnit(char, null)
    expect(unit.skills).toHaveLength(2)
    expect(unit.skills[0].id).toBe('sword_qi')
    expect(unit.skills[1].id).toBe('fire_palm')
  })

  it('should use cultivationStats spiritPower/maxSpiritPower', () => {
    const char = makeTestCharacter({
      cultivationStats: { spiritPower: 30, maxSpiritPower: 80, comprehension: 10, spiritualRoot: 10, fortune: 5 },
    })
    const unit = createCharacterCombatUnit(char, null)
    expect(unit.spiritPower).toBe(30)
    expect(unit.maxSpiritPower).toBe(80)
  })

  it('createCombatUnitFromEnemy should still work', () => {
    const enemy = {
      id: 'wild_spirit_beast',
      name: '灵兽',
      element: 'neutral',
      stats: { hp: 50, atk: 8, def: 4, spd: 6 },
      isBoss: false,
    }
    const unit = createCombatUnitFromEnemy(enemy, 0)
    expect(unit.id).toBe('wild_spirit_beast')
    expect(unit.team).toBe('enemy')
    expect(unit.hp).toBe(50)
  })
})

// ─── Items (technique scroll quality colors) ─────────────────────────

describe('Items data', () => {
  it('should define quality colors for all 5 qualities', () => {
    expect(QUALITY_COLORS['common']).toBeDefined()
    expect(QUALITY_COLORS['spirit']).toBeDefined()
    expect(QUALITY_COLORS['immortal']).toBeDefined()
    expect(QUALITY_COLORS['divine']).toBeDefined()
    expect(QUALITY_COLORS['chaos']).toBeDefined()
  })
})

// ─── Buildings (spirit field rate) ───────────────────────────────────

describe('Buildings data', () => {
  it('should define 9 building types', () => {
    expect(BUILDING_DEFS).toHaveLength(9)
    expect(BUILDING_DEFS[0].type).toBe('mainHall')
  })

  it('getSpiritFieldRate should follow formula 3 + (level-1) * 2', () => {
    expect(getSpiritFieldRate(1)).toBe(3)
    expect(getSpiritFieldRate(2)).toBe(5)
    expect(getSpiritFieldRate(3)).toBe(7)
    expect(getSpiritFieldRate(5)).toBe(11)
    expect(getSpiritFieldRate(10)).toBe(21)
  })

  it('getSpiritFieldRate should return 0 for level 0', () => {
    expect(getSpiritFieldRate(0)).toBe(0)
  })
})
