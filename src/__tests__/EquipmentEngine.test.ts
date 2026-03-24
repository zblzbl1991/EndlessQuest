import { getEffectiveStats, attemptEnhance, refineEquipment, calcEquipmentStats } from '../systems/equipment/EquipmentEngine'
import type { Equipment } from '../types/item'
import { generateEquipment } from '../systems/item/ItemGenerator'

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
    const getById = (id: string) => items.find(i => i.id === id)

    const total = calcEquipmentStats(equippedGear, items, getById)
    expect(total.hp).toBe(getEffectiveStats(armor).hp)
    expect(total.atk).toBe(getEffectiveStats(weapon).atk)
  })
})
