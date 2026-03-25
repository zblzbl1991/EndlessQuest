import type { Equipment, ItemQuality, EquipSlot } from '../../types/item'
import { generateEquipment } from '../item/ItemGenerator'

export interface ForgeRecipe {
  id: string
  name: string
  minForgeLevel: number
  quality: ItemQuality
  cost: { ore: number; spiritStone: number }
  successRate: number
}

export const FORGE_RECIPES: ForgeRecipe[] = [
  { id: 'forge_common', name: '锻造凡品装备', minForgeLevel: 3, quality: 'common',
    cost: { ore: 20, spiritStone: 50 }, successRate: 1.0 },
  { id: 'forge_spirit', name: '锻造灵品装备', minForgeLevel: 3, quality: 'spirit',
    cost: { ore: 80, spiritStone: 200 }, successRate: 0.8 },
  { id: 'forge_immortal', name: '锻造仙品装备', minForgeLevel: 5, quality: 'immortal',
    cost: { ore: 300, spiritStone: 1000 }, successRate: 0.5 },
  { id: 'forge_divine', name: '锻造神品装备', minForgeLevel: 7, quality: 'divine',
    cost: { ore: 1000, spiritStone: 5000 }, successRate: 0.25 },
]

const FORGE_SLOTS: EquipSlot[] = [
  'head', 'armor', 'bracer', 'belt', 'boots',
  'weapon', 'accessory1', 'accessory2', 'talisman',
]

export function canForge(recipe: ForgeRecipe, resources: { ore: number; spiritStone: number }, forgeLevel: number): boolean {
  if (forgeLevel < recipe.minForgeLevel) return false
  if (resources.ore < recipe.cost.ore) return false
  if (resources.spiritStone < recipe.cost.spiritStone) return false
  return true
}

export function forgeEquipment(recipe: ForgeRecipe, forgeLevel: number, forgeBuffSuccessBonus: number): Equipment | null {
  if (forgeLevel < recipe.minForgeLevel) return null
  const effectiveRate = Math.min(1, recipe.successRate + forgeBuffSuccessBonus)
  if (Math.random() > effectiveRate) return null
  const slot = FORGE_SLOTS[Math.floor(Math.random() * FORGE_SLOTS.length)]
  return generateEquipment(slot, recipe.quality)
}

export function getAvailableForgeRecipes(forgeLevel: number): ForgeRecipe[] {
  return FORGE_RECIPES.filter((r) => r.minForgeLevel <= forgeLevel)
}
