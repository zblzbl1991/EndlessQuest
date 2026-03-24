// src/__tests__/ItemGenerator.test.ts
import { generateEquipment, generateRandomEquipment, getEnhanceCost } from '../systems/item/ItemGenerator'

describe('ItemGenerator', () => {
  it('should generate a common weapon with appropriate stats', () => {
    const item = generateEquipment('weapon', 'common')
    expect(item.type).toBe('equipment')
    expect(item.slot).toBe('weapon')
    expect(item.quality).toBe('common')
    expect(item.stats.atk).toBeGreaterThan(0)
    expect(item.enhanceLevel).toBe(0)
    expect(item.refinementStats).toHaveLength(0)
  })

  it('should scale stats by quality', () => {
    const common = generateEquipment('weapon', 'common')
    const spirit = generateEquipment('weapon', 'spirit')
    // spirit weapon should have roughly 1.8x the atk of common
    // Allow 20% variance from random
    const ratio = spirit.stats.atk / common.stats.atk
    expect(ratio).toBeGreaterThan(1.2)
    expect(ratio).toBeLessThan(2.8)
  })

  it('should generate valid equipment for all slots', () => {
    const slots = ['head', 'armor', 'bracer', 'belt', 'boots', 'weapon', 'accessory1', 'accessory2', 'talisman'] as const
    for (const slot of slots) {
      const item = generateEquipment(slot, 'spirit')
      expect(item.slot).toBe(slot)
      expect(item.stats.hp + item.stats.atk + item.stats.def + item.stats.spd).toBeGreaterThan(0)
    }
  })

  it('should generate names with quality prefix', () => {
    const common = generateEquipment('weapon', 'common')
    const spirit = generateEquipment('weapon', 'spirit')
    expect(common.name).toContain('剑')
    expect(spirit.name).toContain('灵')
  })

  it('should calculate enhance cost based on quality and level', () => {
    const item = generateEquipment('armor', 'spirit')
    const cost = getEnhanceCost(item, 5)
    expect(cost.spiritStone).toBe(6 * 1.8 * 50) // (5+1) * 1.8 * 50
    expect(cost.ore).toBe(6 * 1.8 * 5)
  })

  it('should generate random equipment within quality range', () => {
    // Generate 100 items, all should be common (max quality = common)
    let allCommon = true
    for (let i = 0; i < 100; i++) {
      const item = generateRandomEquipment('common')
      if (item.quality !== 'common') allCommon = false
    }
    expect(allCommon).toBe(true)
  })

  it('should have positive sell price', () => {
    const item = generateEquipment('head', 'immortal')
    expect(item.sellPrice).toBeGreaterThan(0)
  })
})
