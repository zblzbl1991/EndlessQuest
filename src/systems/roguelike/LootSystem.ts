import type { LootEntry } from '../../data/enemies'
import type { CharacterQuality } from '../../types/character'

export interface LootResult {
  type: string
  amount: number
  quality?: CharacterQuality
  /** material 掉落的类别与品阶（V2.1 工单 08）。 */
  category?: 'herb' | 'ore'
  tier?: number
  recipeId?: string
}

/**
 * 掉落品阶（V2.1 工单 08）= f(层数进度 × 世界层)：1-4 阶（下/中/上/极品）。
 * 世界层 = 秘境解锁境界 ≥ 真仙（9）取 1，否则 0——同一秘境越深品阶越高，
 * 仙界秘境整体高 1 阶。
 */
export function resolveLootTier(floor: number, totalLayers: number, dungeonUnlockRealm: number): number {
  const worldLayer = dungeonUnlockRealm >= 9 ? 1 : 0
  const progress = totalLayers > 0 ? Math.min(1, Math.max(0, floor / totalLayers)) : 0
  let tier = 1 + worldLayer
  if (progress >= 0.4) tier += 1
  if (progress >= 0.7) tier += 1
  return Math.min(4, tier)
}

/**
 * Generate loot drops from a loot table.
 */
export function generateLoot(
  lootTable: LootEntry[],
  dropsPerFight: number,
  floor: number,
  dungeon?: { totalLayers: number; unlockRealm: number }
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
      case 'material': {
        const min = entry.minAmount ?? 1
        const max = entry.maxAmount ?? min
        results.push({
          type: 'material',
          amount: Math.floor(Math.random() * (max - min + 1)) + min,
          category: entry.category ?? 'herb',
          tier: dungeon ? resolveLootTier(floor, dungeon.totalLayers, dungeon.unlockRealm) : 1,
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
