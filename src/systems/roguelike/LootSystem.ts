import type { LootEntry } from '../../data/enemies'
import type { CharacterQuality } from '../../types/character'

export interface LootResult {
  type: string
  amount: number
  quality?: CharacterQuality
  recipeId?: string
}

/**
 * Generate loot drops from a loot table.
 */
export function generateLoot(
  lootTable: LootEntry[],
  dropsPerFight: number,
  floor: number,
): LootResult[] {
  if (lootTable.length === 0) return []

  const results: LootResult[] = []

  for (let i = 0; i < dropsPerFight; i++) {
    const entry = weightedRandom(lootTable)
    if (!entry) continue

    switch (entry.type) {
      case 'spiritStone':
      case 'herb':
      case 'ore': {
        const min = (entry.minAmount ?? 1) * floor
        const max = (entry.maxAmount ?? 1) * floor
        results.push({
          type: entry.type,
          amount: Math.floor(Math.random() * (max - min + 1)) + min,
        })
        break
      }
      case 'equipment': {
        results.push({
          type: 'equipment',
          amount: 1,
          quality: entry.quality,
        })
        break
      }
      case 'consumable': {
        results.push({
          type: 'consumable',
          amount: 1,
          recipeId: entry.recipeId,
        })
        break
      }
      case 'petCapture': {
        results.push({
          type: 'petCapture',
          amount: 1,
        })
        break
      }
    }
  }

  return results
}

function weightedRandom(table: LootEntry[]): LootEntry | null {
  const totalWeight = table.reduce((sum, e) => sum + e.weight, 0)
  if (totalWeight <= 0) return null

  let roll = Math.random() * totalWeight
  for (const entry of table) {
    roll -= entry.weight
    if (roll <= 0) return entry
  }
  return table[table.length - 1]
}
