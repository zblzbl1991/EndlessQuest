import { describe, it, expect } from 'vitest'
import { ENEMY_TEMPLATES } from '../data/enemies'

describe('Enemy loot tables', () => {
  it('every enemy template has a lootTable array', () => {
    for (const enemy of ENEMY_TEMPLATES) {
      expect(Array.isArray(enemy.lootTable)).toBe(true)
      expect(enemy.lootTable.length).toBeGreaterThan(0)
    }
  })

  it('every enemy template has dropsPerFight between 1 and 3', () => {
    for (const enemy of ENEMY_TEMPLATES) {
      expect(enemy.dropsPerFight).toBeGreaterThanOrEqual(1)
      expect(enemy.dropsPerFight).toBeLessThanOrEqual(3)
    }
  })

  it('loot entries have required fields', () => {
    for (const enemy of ENEMY_TEMPLATES) {
      for (const entry of enemy.lootTable) {
        expect(['spiritStone', 'herb', 'ore', 'equipment', 'consumable', 'petCapture']).toContain(entry.type)
        expect(entry.weight).toBeGreaterThan(0)
      }
    }
  })

  it('resource entries have minAmount and maxAmount', () => {
    for (const enemy of ENEMY_TEMPLATES) {
      for (const entry of enemy.lootTable) {
        if (entry.type === 'spiritStone' || entry.type === 'herb' || entry.type === 'ore') {
          expect(entry.minAmount).toBeDefined()
          expect(entry.maxAmount).toBeDefined()
          expect(entry.maxAmount!).toBeGreaterThanOrEqual(entry.minAmount!)
        }
      }
    }
  })

  it('equipment entries have quality field', () => {
    for (const enemy of ENEMY_TEMPLATES) {
      for (const entry of enemy.lootTable) {
        if (entry.type === 'equipment') {
          expect(entry.quality).toBeDefined()
          expect(['common', 'spirit', 'immortal', 'divine', 'chaos']).toContain(entry.quality)
        }
      }
    }
  })

  it('wild_spirit_beast has expected loot table', () => {
    const beast = ENEMY_TEMPLATES.find(e => e.id === 'wild_spirit_beast')!
    const weights = beast.lootTable.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] ?? 0) + e.weight
      return acc
    }, {} as Record<string, number>)
    expect(weights.spiritStone).toBe(40)
    expect(weights.herb).toBe(25)
    expect(weights.ore).toBe(15)
    expect(weights.equipment).toBe(13) // 10 common + 3 spirit
    expect(weights.petCapture).toBe(2)
  })

  it('spirit_boss has higher total weight and better drops', () => {
    const boss = ENEMY_TEMPLATES.find(e => e.id === 'spirit_boss')!
    const totalWeight = boss.lootTable.reduce((s, e) => s + e.weight, 0)
    expect(totalWeight).toBeGreaterThan(85) // richer table
    const hasDivine = boss.lootTable.some(e => e.type === 'equipment' && e.quality === 'divine')
    expect(hasDivine).toBe(true)
  })
})
