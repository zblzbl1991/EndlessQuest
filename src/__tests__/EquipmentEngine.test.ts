import {
  getEffectiveStats,
  attemptEnhance,
  refineEquipment,
  calcEquipmentStats,
  getEquipmentRecommendationForCharacter,
  getEquipmentTendency,
} from '../systems/equipment/EquipmentEngine'
import { generateEquipment } from '../systems/item/ItemGenerator'
import type { Character } from '../types/character'
import type { Equipment } from '../types/item'

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'char_test',
    name: 'Test Disciple',
    title: 'disciple',
    quality: 'common',
    realm: 2,
    realmStage: 0,
    cultivation: 0,
    baseStats: { hp: 100, atk: 15, def: 8, spd: 10, crit: 0.05, critDmg: 1.5 },
    cultivationStats: { spiritPower: 40, maxSpiritPower: 40, comprehension: 12, spiritualRoot: 12, fortune: 8 },
    learnedTechniques: ['qingxin'],
    equippedGear: [],
    equippedSkills: [],
    backpack: [],
    maxBackpackSlots: 20,
    petIds: [],
    talents: [],
    status: 'idle',
    injuryTimer: 0,
    createdAt: 0,
    totalCultivation: 0,
    specialties: [],
    assignedBuilding: null,
    cultivationPath: 'none',
    fateTags: [],
    ...overrides,
  }
}

function makeEquipment(overrides: Partial<Equipment> = {}): Equipment {
  return {
    id: 'eq_test',
    name: 'Test Weapon',
    quality: 'spirit',
    type: 'equipment',
    slot: 'weapon',
    description: 'Test item',
    sellPrice: 100,
    enhanceLevel: 0,
    refinementStats: [],
    setId: null,
    stats: { hp: 0, atk: 20, def: 0, spd: 2, crit: 0.05, critDmg: 0.15 },
    ...overrides,
  }
}

describe('EquipmentEngine', () => {
  it('should return base stats at +0', () => {
    const item = generateEquipment('weapon', 'common')
    const eff = getEffectiveStats(item)
    expect(eff.atk).toBe(item.stats.atk)
  })

  it('should enhance stats at +10 (+50%)', () => {
    const item = generateEquipment('weapon', 'common')
    item.enhanceLevel = 10
    const eff = getEffectiveStats(item)
    // +10 = 1 + 10*0.05 = 1.5x
    expect(eff.atk).toBe(Math.floor(item.stats.atk * 1.5))
  })

  it('should include refinement stats', () => {
    const item = generateEquipment('armor', 'spirit')
    item.refinementStats = [{ hp: 10 }]
    const eff = getEffectiveStats(item)
    expect(eff.hp).toBe(item.stats.hp + 10)
  })

  it('should always succeed enhancement at +5 or below', () => {
    const item = generateEquipment('head', 'common')
    let allSuccess = true
    for (let i = 0; i < 20; i++) {
      const result = attemptEnhance(item)
      if (!result.success) allSuccess = false
      item.enhanceLevel = 0 // reset
    }
    expect(allSuccess).toBe(true)
  })

  it('should cap enhancement at +15', () => {
    const item = generateEquipment('weapon', 'common')
    item.enhanceLevel = 15
    const result = attemptEnhance(item)
    expect(result.success).toBe(false)
    expect(result.newLevel).toBe(15)
  })

  it('should calculate correct enhance cost', () => {
    const item = generateEquipment('armor', 'spirit')
    item.enhanceLevel = 5
    const result = attemptEnhance(item)
    // nextLevel = 6, cost = (6+1) * 1.8 * 50 = 630
    expect(result.cost.spiritStone).toBe(630)
  })

  it('should add refinement stat', () => {
    const item = generateEquipment('boots', 'common')
    const result = refineEquipment(item)
    expect(result.success).toBe(true)
    expect(result.cost.spiritStone).toBeGreaterThan(0)
    const key = Object.keys(result.newStat)[0]
    expect(result.newStat[key as keyof typeof result.newStat]).toBeGreaterThan(0)
  })

  it('should sum stats from multiple equipped items', () => {
    const weapon = generateEquipment('weapon', 'common')
    const armor = generateEquipment('armor', 'common')
    weapon.id = 'w1'
    armor.id = 'a1'

    const equippedGear = ['a1', null, null, null, null, 'w1', null, null, null]
    const items = [weapon, armor]
    const getById = (id: string) => items.find((i) => i.id === id)

    const total = calcEquipmentStats(equippedGear, items, getById)
    expect(total.hp).toBe(getEffectiveStats(armor).hp)
    expect(total.atk).toBe(getEffectiveStats(weapon).atk)
  })

  it('should recommend path-aligned gear', () => {
    const character = makeCharacter({ cultivationPath: 'sword', specialties: [{ type: 'combat', level: 2 }] })
    const weapon = makeEquipment({ slot: 'weapon' })

    const rec = getEquipmentRecommendationForCharacter(character, weapon)

    expect(rec.status).toBe('recommended')
    expect(rec.label).toBe('推荐')
    expect(rec.direction).toContain('输出')
  })

  it('should mark mismatched defensive gear as not recommended when it leans offense', () => {
    const character = makeCharacter({ cultivationPath: 'body', specialties: [] })
    const mismatchedArmor = makeEquipment({
      slot: 'armor',
      stats: { hp: 0, atk: 30, def: 0, spd: 0, crit: 0.08, critDmg: 0.2 },
    })

    const rec = getEquipmentRecommendationForCharacter(character, mismatchedArmor)

    expect(rec.status).toBe('notRecommended')
    expect(rec.label).toBe('不推荐')
    expect(rec.reasons.length).toBeGreaterThanOrEqual(1)
  })

  it('should summarize general equipment tendency', () => {
    const item = makeEquipment({
      slot: 'boots',
      stats: { hp: 0, atk: 0, def: 0, spd: 18, crit: 0, critDmg: 0 },
    })

    const rec = getEquipmentTendency(item)

    expect(rec.direction).toContain('速度')
    expect(rec.label).toBeDefined()
  })
})
