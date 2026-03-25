import { describe, it, expect } from 'vitest'
import { ALCHEMY_RECIPES, canCraft, craftPotion, getAvailableRecipes } from '../systems/economy/AlchemySystem'

describe('ALCHEMY_RECIPES', () => {
  it('has at least 3 recipes', () => {
    expect(ALCHEMY_RECIPES.length).toBeGreaterThanOrEqual(3)
  })
  it('each recipe has required fields', () => {
    for (const recipe of ALCHEMY_RECIPES) {
      expect(recipe.id).toBeTruthy()
      expect(recipe.name).toBeTruthy()
      expect(typeof recipe.minFurnaceLevel).toBe('number')
      expect(typeof recipe.cost.herb).toBe('number')
      expect(recipe.product.quality).toBeTruthy()
    }
  })
})

describe('canCraft', () => {
  it('returns false if not enough herbs', () => {
    expect(canCraft(ALCHEMY_RECIPES[0], { herb: 0, spiritStone: 0 })).toBe(false)
  })
  it('returns false if furnace level too low', () => {
    const highRecipe = ALCHEMY_RECIPES.find(r => r.minFurnaceLevel > 1)!
    expect(canCraft(highRecipe, { herb: 999, spiritStone: 999 }, 0)).toBe(false)
  })
  it('returns true when requirements met', () => {
    const recipe = ALCHEMY_RECIPES[0]
    expect(canCraft(recipe, { herb: recipe.cost.herb + 1, spiritStone: (recipe.cost.spiritStone ?? 0) + 1 }, 1)).toBe(true)
  })
})

describe('craftPotion', () => {
  it('returns null if cannot craft', () => {
    expect(craftPotion(ALCHEMY_RECIPES[0], 0)).toBe(null)
  })
  it('returns a consumable item when crafted', () => {
    const result = craftPotion(ALCHEMY_RECIPES[0], 3)
    expect(result).not.toBeNull()
    expect(result!.type).toBe('consumable')
  })
})

describe('getAvailableRecipes', () => {
  it('filters by furnace level', () => {
    const all = getAvailableRecipes(10)
    const filtered = getAvailableRecipes(1)
    expect(filtered.length).toBeLessThanOrEqual(all.length)
    expect(filtered.length).toBeGreaterThan(0)
  })
})
