import { describe, it, expect } from 'vitest'
import { generateLoot, type LootResult } from '../systems/roguelike/LootSystem'
import type { LootEntry } from '../data/enemies'

const testLootTable: LootEntry[] = [
  { type: 'spiritStone', weight: 40, minAmount: 10, maxAmount: 20 },
  { type: 'herb', weight: 30, minAmount: 5, maxAmount: 10 },
  { type: 'ore', weight: 20, minAmount: 2, maxAmount: 5 },
  { type: 'equipment', weight: 10, quality: 'common' },
]

describe('generateLoot', () => {
  it('returns the correct number of drops based on dropsPerFight', () => {
    const result = generateLoot(testLootTable, 2, 3)
    expect(result.length).toBe(2)
  })

  it('returns drops with correct structure', () => {
    const result = generateLoot(testLootTable, 1, 1)
    for (const drop of result) {
      expect(drop).toHaveProperty('type')
      expect(drop).toHaveProperty('amount')
    }
  })

  it('resource drops have amounts scaled by floor', () => {
    const results: LootResult[][] = []
    for (let i = 0; i < 50; i++) {
      results.push(generateLoot(testLootTable, 3, 5))
    }
    const resourceDrops = results.flat().filter(d => d.type === 'spiritStone')
    // With floor=5, minAmount=10, amounts should be >= 10*5 = 50
    for (const drop of resourceDrops) {
      expect(drop.amount).toBeGreaterThanOrEqual(50)
    }
  })

  it('equipment drops have amount 1 and quality info', () => {
    const results: LootResult[][] = []
    for (let i = 0; i < 100; i++) {
      results.push(generateLoot(testLootTable, 3, 1))
    }
    const equipDrops = results.flat().filter(d => d.type === 'equipment')
    expect(equipDrops.length).toBeGreaterThan(0)
    for (const drop of equipDrops) {
      expect(drop.amount).toBe(1)
      expect(drop.quality).toBeDefined()
    }
  })

  it('petCapture drops have amount 1', () => {
    const petTable: LootEntry[] = [
      { type: 'petCapture', weight: 100 },
    ]
    const result = generateLoot(petTable, 1, 1)
    expect(result[0].type).toBe('petCapture')
    expect(result[0].amount).toBe(1)
  })

  it('empty loot table returns empty array', () => {
    const result = generateLoot([], 2, 1)
    expect(result).toEqual([])
  })
})
