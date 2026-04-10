import { TECHNIQUES, getTechniqueById } from '../data/techniquesTable'
import {
  buildCharacterSkillLoadout,
  getCombatStyleProfile,
  MAX_CHARACTER_SKILL_SLOTS,
  syncCharacterSkillLoadout,
} from '../data/activeSkills'
import { ELEMENT_NAMES, COUNTER_MAP, getElementMultiplier } from '../data/skills'
import { createCharacterCombatUnit, createCombatUnitFromEnemy } from '../data/enemies'
import { QUALITY_COLORS } from '../data/items'
import { getSpiritFieldRate, BUILDING_DEFS } from '../data/buildings'
import { getMinorBreakthroughCost } from '../data/realms'
import type { Character } from '../types/character'

// ─── Techniques Table ────────────────────────────────────────────────

describe('Techniques Table', () => {
  it('should define exactly 30 techniques', () => {
    expect(TECHNIQUES).toHaveLength(30)
  })

  it('should have correct tier distribution', () => {
    const mortal = TECHNIQUES.filter((t) => t.tier === 'mortal')
    const spirit = TECHNIQUES.filter((t) => t.tier === 'spirit')
    const immortal = TECHNIQUES.filter((t) => t.tier === 'immortal')
    const divine = TECHNIQUES.filter((t) => t.tier === 'divine')
    const chaos = TECHNIQUES.filter((t) => t.tier === 'chaos')
    expect(mortal).toHaveLength(6)
    expect(spirit).toHaveLength(8)
    expect(immortal).toHaveLength(8)
    expect(divine).toHaveLength(6)
    expect(chaos).toHaveLength(2)
  })

  it('should have all original technique IDs', () => {
    const ids = TECHNIQUES.map((t) => t.id)
    const original = [
      'qingxin',
      'lieyan',
      'houtu',
      'fentian',
      'xuanbing',
      'leiyu',
      'leishen',
      'bumiejinshen',
      'jiuzhuan',
      'wanjianguizong',
      'taishang',
      'hunduntiangong',
    ]
    for (const id of original) {
      expect(ids).toContain(id)
    }
  })

  it('should have qingxin as neutral with balanced bonuses', () => {
    const t = getTechniqueById('qingxin')!
    expect(t).toBeDefined()
    expect(t.element).toBe('neutral')
    expect(t.bonuses).toHaveLength(4)
    expect(t.requirements.minRealm).toBe(0)
    expect(t.requirements.minComprehension).toBe(5)
  })

  it('should have lieyan with fire element and atk bonus', () => {
    const t = getTechniqueById('lieyan')!
    expect(t.element).toBe('fire')
    expect(t.bonuses).toEqual([
      { type: 'atk', value: 5 },
      { type: 'crit', value: 0.02 },
    ])
  })

  it('should have hunduntiangong as chaos tier with many bonuses', () => {
    const t = getTechniqueById('hunduntiangong')!
    expect(t.tier).toBe('chaos')
    expect(t.element).toBe('neutral')
    expect(t.bonuses).toHaveLength(6)
    expect(t.requirements.minRealm).toBe(4)
    expect(t.requirements.minComprehension).toBe(30)
  })

  it('should have wanjianguizong as divine tier with high atk bonus', () => {
    const t = getTechniqueById('wanjianguizong')!
    expect(t.tier).toBe('divine')
    expect(t.bonuses.some((b) => b.type === 'atk' && b.value === 25)).toBe(true)
  })

  it('should have taishang with water element and balanced bonuses', () => {
    const t = getTechniqueById('taishang')!
    expect(t.element).toBe('water')
    expect(t.bonuses.some((b) => b.type === 'atk' && b.value === 15)).toBe(true)
  })

  it('should have leishen with metal element', () => {
    const t = getTechniqueById('leishen')!
    expect(t.element).toBe('metal')
    expect(t.bonuses.some((b) => b.type === 'spd' && b.value === 12)).toBe(true)
  })

  it('should have bumiejinshen with high hp and def bonuses', () => {
    const t = getTechniqueById('bumiejinshen')!
    expect(t.element).toBe('neutral')
    expect(t.bonuses.some((b) => b.type === 'hp' && b.value === 80)).toBe(true)
    expect(t.bonuses.some((b) => b.type === 'def' && b.value === 15)).toBe(true)
  })

  it('getTechniqueById should return undefined for unknown ID', () => {
    expect(getTechniqueById('nonexistent')).toBeUndefined()
  })

  it('lieyan has atk+5 and crit+0.02 bonuses', () => {
    const t = getTechniqueById('lieyan')!
    expect(t.bonuses).toHaveLength(2)
    expect(t.bonuses[0]).toEqual({ type: 'atk', value: 5 })
    expect(t.bonuses[1]).toEqual({ type: 'crit', value: 0.02 })
  })

  it('fentian has three bonuses', () => {
    const t = getTechniqueById('fentian')!
    expect(t.bonuses).toHaveLength(3)
    expect(t.bonuses[0]).toEqual({ type: 'atk', value: 12 })
    expect(t.bonuses[1]).toEqual({ type: 'crit', value: 0.03 })
    expect(t.bonuses[2]).toEqual({ type: 'critDmg', value: 0.1 })
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
    expect(getElementMultiplier('neutral', 'water')).toBe(1.0)
    expect(getElementMultiplier('neutral', 'metal')).toBe(1.0)
    expect(getElementMultiplier('neutral', 'neutral')).toBe(1.0)
  })

  it('getElementMultiplier should return 1.0 for any attacker vs neutral defender', () => {
    expect(getElementMultiplier('fire', 'neutral')).toBe(1.0)
    expect(getElementMultiplier('water', 'neutral')).toBe(1.0)
    expect(getElementMultiplier('metal', 'neutral')).toBe(1.0)
  })

  it('should preserve wuxing counter relationships', () => {
    // metal counters wood
    expect(getElementMultiplier('metal', 'wood')).toBe(1.5)
    expect(getElementMultiplier('wood', 'metal')).toBe(0.75)
    // wood counters earth
    expect(getElementMultiplier('wood', 'earth')).toBe(1.5)
    expect(getElementMultiplier('earth', 'wood')).toBe(0.75)
    // earth counters water
    expect(getElementMultiplier('earth', 'water')).toBe(1.5)
    expect(getElementMultiplier('water', 'earth')).toBe(0.75)
    // water counters fire
    expect(getElementMultiplier('water', 'fire')).toBe(1.5)
    expect(getElementMultiplier('fire', 'water')).toBe(0.75)
    // fire counters metal
    expect(getElementMultiplier('fire', 'metal')).toBe(1.5)
    expect(getElementMultiplier('metal', 'fire')).toBe(0.75)
    // same element = 1.0
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
      learnedTechniques: [],
      equippedGear: [null, null, null, null, null, null, null, null, null],
      equippedSkills: [null, null, null, null, null],
      backpack: [],
      maxBackpackSlots: 20,
      petIds: [],
      talents: [],
      status: 'idle',
      injuryTimer: 0,
      createdAt: Date.now(),
      totalCultivation: 0,
      specialties: [],
      assignedBuilding: null,
      cultivationPath: 'none',
      ...overrides,
    }
  }

  it('should create combat unit from character with auto skill loadout', () => {
    const char = makeTestCharacter()
    const unit = createCharacterCombatUnit(char, [])
    const synced = syncCharacterSkillLoadout(char)
    expect(unit.id).toBe('test_char_1')
    expect(unit.name).toBe('测试角色')
    expect(unit.team).toBe('ally')
    expect(unit.hp).toBe(100)
    expect(unit.atk).toBe(15)
    expect(unit.element).toBe('neutral')
    expect(unit.spiritPower).toBe(50)
    expect(unit.maxSpiritPower).toBe(50)
    expect(unit.skills).toHaveLength(synced.equippedSkills.filter(Boolean).length)
    expect(unit.skills[0]?.id).toBe(synced.equippedSkills[0])
  })

  it('should apply technique bonuses to baseStats', () => {
    const char = makeTestCharacter()
    // lieyan bonuses: atk+5, crit+0.02
    const unit = createCharacterCombatUnit(char, ['lieyan'])
    expect(unit.hp).toBe(100) // no hp bonus from lieyan
    expect(unit.atk).toBe(20) // 15 + 5
    expect(unit.def).toBe(8) // no def bonus
    expect(unit.spd).toBe(10) // no spd bonus
    expect(unit.crit).toBe(0.07) // 0.05 + 0.02
  })

  it('should set element from technique', () => {
    const char = makeTestCharacter()
    const unit = createCharacterCombatUnit(char, ['lieyan'])
    expect(unit.element).toBe('fire')
  })

  it('should apply bonuses from all learned techniques', () => {
    // qingxin: hp+10, atk+2, def+2, spd+1
    // lieyan: atk+5, crit+0.02
    const char = makeTestCharacter()
    const unit = createCharacterCombatUnit(char, ['qingxin', 'lieyan'])
    expect(unit.hp).toBe(110) // 100 + 10
    expect(unit.atk).toBe(22) // 15 + 2 + 5
    expect(unit.def).toBe(10) // 8 + 2
    expect(unit.spd).toBe(11) // 10 + 1
    expect(unit.crit).toBe(0.07) // 0.05 + 0.02
  })

  it('should use equippedSkills for skills list', () => {
    const char = makeTestCharacter({
      equippedSkills: ['sword_qi', 'fire_palm', null, null, null],
    })
    const unit = createCharacterCombatUnit(char, [])
    expect(unit.skills).toHaveLength(2)
    expect(unit.skills[0].id).toBe('sword_qi')
    expect(unit.skills[1].id).toBe('fire_palm')
  })

  it('should build a coherent automatic skill loadout from combat style profile', () => {
    const char = makeTestCharacter({
      cultivationPath: 'sword',
      learnedTechniques: ['qingxin', 'lieyan'],
      specialties: [{ type: 'combat', level: 1 }],
    })

    const profile = getCombatStyleProfile(char)
    const loadout = buildCharacterSkillLoadout(char)
    const synced = syncCharacterSkillLoadout(char)

    expect(profile.styleId).toBe('sword-burst')
    expect(profile.styleName).toContain('剑')
    expect(loadout).toHaveLength(MAX_CHARACTER_SKILL_SLOTS)
    expect(loadout[0]).toBe('sword_qi')
    expect(synced.equippedSkills).toHaveLength(MAX_CHARACTER_SKILL_SLOTS)
    expect(synced.equippedSkills[0]).toBe('sword_qi')
  })

  it('should keep empty skill slots compatible with learned-technique builds', () => {
    const char = makeTestCharacter({
      learnedTechniques: ['qingxin', 'fentian'],
      equippedSkills: [null, null, null, null, null],
    })
    const unit = createCharacterCombatUnit(char, ['qingxin', 'fentian'])
    const synced = syncCharacterSkillLoadout(char)
    expect(unit.skills).toHaveLength(synced.equippedSkills.filter(Boolean).length)
    expect(unit.skills[0]?.id).toBe(synced.equippedSkills[0])
    expect(unit.element).toBe('fire')
    expect(unit.atk).toBe(29)
  })

  it('should use cultivationStats spiritPower/maxSpiritPower', () => {
    const char = makeTestCharacter({
      cultivationStats: { spiritPower: 30, maxSpiritPower: 80, comprehension: 10, spiritualRoot: 10, fortune: 5 },
    })
    const unit = createCharacterCombatUnit(char, [])
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
  it('should define 8 building types', () => {
    expect(BUILDING_DEFS).toHaveLength(8)
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

// ─── Realms (minorBreakthroughCost) ────────────────────────────────

describe('Realms data', () => {
  it('getMinorBreakthroughCost returns correct cost for valid realm/stage', () => {
    expect(getMinorBreakthroughCost(0, 0)).toBe(50)
    expect(getMinorBreakthroughCost(0, 1)).toBe(120)
    expect(getMinorBreakthroughCost(0, 2)).toBe(300)
    expect(getMinorBreakthroughCost(1, 0)).toBe(180)
    expect(getMinorBreakthroughCost(2, 1)).toBe(5000)
    expect(getMinorBreakthroughCost(3, 2)).toBe(100000)
    expect(getMinorBreakthroughCost(4, 0)).toBe(100000)
  })

  it('getMinorBreakthroughCost returns Infinity for invalid realm', () => {
    expect(getMinorBreakthroughCost(99, 0)).toBe(Infinity)
    expect(getMinorBreakthroughCost(-1, 0)).toBe(Infinity)
  })

  it('getMinorBreakthroughCost returns Infinity for out-of-bounds stage', () => {
    expect(getMinorBreakthroughCost(0, 3)).toBe(Infinity)
    expect(getMinorBreakthroughCost(0, 10)).toBe(Infinity)
  })
})
