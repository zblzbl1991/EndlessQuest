import { describe, it, expect } from 'vitest'
import { FORGE_RECIPES, canForge, forgeEquipment, getAvailableForgeRecipes } from '../systems/economy/ForgeSystem'

describe('FORGE_RECIPES', () => {
  it('has at least 4 recipes', () => {
    expect(FORGE_RECIPES.length).toBeGreaterThanOrEqual(4)
  })
})

describe('canForge', () => {
  it('returns false if not enough ore', () => {
    const recipe = FORGE_RECIPES[0]
    expect(canForge(recipe, { ore: 0, spiritStone: 0 }, 0)).toBe(false)
  })
  it('returns false if forge level too low', () => {
    const highRecipe = FORGE_RECIPES.find(r => r.minForgeLevel > 1)!
    expect(canForge(highRecipe, { ore: 9999, spiritStone: 9999 }, 0)).toBe(false)
  })
  it('returns true when requirements met', () => {
    const recipe = FORGE_RECIPES[0]
    expect(canForge(recipe, { ore: recipe.cost.ore + 1, spiritStone: recipe.cost.spiritStone + 1 }, 3)).toBe(true)
  })
})

describe('forgeEquipment', () => {
  it('returns null if cannot forge', () => {
    expect(forgeEquipment(FORGE_RECIPES[0], 0, 0)).toBe(null)
  })
  it('returns an equipment item on success', () => {
    // Use recipe with 100% success rate
    const recipe = FORGE_RECIPES.find(r => r.successRate >= 1)!
    const result = forgeEquipment(recipe, 3, 0)
    expect(result).not.toBeNull()
    expect(result!.type).toBe('equipment')
  })
})

describe('getAvailableForgeRecipes', () => {
  it('filters by forge level', () => {
    const all = getAvailableForgeRecipes(10)
    const filtered = getAvailableForgeRecipes(1)
    expect(filtered.length).toBeLessThanOrEqual(all.length)
  })
})
