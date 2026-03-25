import type { Consumable } from '../../types/item'

export interface AlchemyRecipe {
  id: string
  name: string
  description: string
  minFurnaceLevel: number
  cost: { herb: number; spiritStone?: number }
  product: {
    name: string
    description: string
    quality: 'common' | 'spirit' | 'immortal'
    effect: { type: string; value: number }
    sellPrice: number
  }
}

export const ALCHEMY_RECIPES: AlchemyRecipe[] = [
  { id: 'hp_potion', name: '回血丹', description: '恢复20%最大生命', minFurnaceLevel: 1,
    cost: { herb: 5 },
    product: { name: '回血丹', description: '服用后恢复20%最大生命', quality: 'common',
      effect: { type: 'hp_percent', value: 20 }, sellPrice: 10 } },
  { id: 'spirit_potion', name: '灵气丹', description: '恢复50灵气', minFurnaceLevel: 1,
    cost: { herb: 8 },
    product: { name: '灵气丹', description: '服用后恢复50灵气', quality: 'common',
      effect: { type: 'spirit', value: 50 }, sellPrice: 15 } },
  { id: 'hp_potion_plus', name: '大回血丹', description: '恢复40%最大生命', minFurnaceLevel: 3,
    cost: { herb: 12, spiritStone: 50 },
    product: { name: '大回血丹', description: '服用后恢复40%最大生命', quality: 'spirit',
      effect: { type: 'hp_percent', value: 40 }, sellPrice: 30 } },
  { id: 'spirit_potion_plus', name: '大灵气丹', description: '恢复150灵气', minFurnaceLevel: 3,
    cost: { herb: 15, spiritStone: 80 },
    product: { name: '大灵气丹', description: '服用后恢复150灵气', quality: 'spirit',
      effect: { type: 'spirit', value: 150 }, sellPrice: 40 } },
  { id: 'breakthrough_pill', name: '突破丹', description: '突破成功率+20%', minFurnaceLevel: 5,
    cost: { herb: 25, spiritStone: 200 },
    product: { name: '突破丹', description: '突破时使用，成功率+20%', quality: 'immortal',
      effect: { type: 'breakthrough_bonus', value: 20 }, sellPrice: 100 } },
]

let _idCounter = 0

export function canCraft(recipe: AlchemyRecipe, resources: { herb: number; spiritStone: number }, furnaceLevel: number = 0): boolean {
  if (furnaceLevel < recipe.minFurnaceLevel) return false
  if (resources.herb < recipe.cost.herb) return false
  if (recipe.cost.spiritStone && resources.spiritStone < recipe.cost.spiritStone) return false
  return true
}

export function craftPotion(recipe: AlchemyRecipe, furnaceLevel: number = 0): Consumable | null {
  if (furnaceLevel < recipe.minFurnaceLevel) return null
  return {
    id: `potion_${recipe.id}_${Date.now()}_${++_idCounter}`,
    name: recipe.product.name,
    quality: recipe.product.quality,
    type: 'consumable',
    description: recipe.product.description,
    sellPrice: recipe.product.sellPrice,
    effect: recipe.product.effect,
  }
}

export function getAvailableRecipes(furnaceLevel: number): AlchemyRecipe[] {
  return ALCHEMY_RECIPES.filter((r) => r.minFurnaceLevel <= furnaceLevel)
}
