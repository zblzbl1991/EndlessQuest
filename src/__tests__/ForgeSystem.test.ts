import { describe, expect, it } from 'vitest'
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
    const highRecipe = FORGE_RECIPES.find((recipe) => recipe.minForgeLevel > 1)!
    expect(canForge(highRecipe, { ore: 9999, spiritStone: 9999 }, 0)).toBe(false)
  })

  it('returns true when requirements met', () => {
    const recipe = FORGE_RECIPES[0]
    expect(canForge(recipe, { ore: recipe.cost.ore + 1, spiritStone: recipe.cost.spiritStone + 1 }, 3)).toBe(true)
  })

  it('returns false when a legacy recipe is missing required materials', () => {
    const recipe = FORGE_RECIPES.find((r) => r.id === 'forge_guixu_weapon')!
    expect(canForge(recipe, { ore: 9999, spiritStone: 9999 }, 7, { 归墟潮晶: 1, 渊息残片: 1 })).toBe(false)
  })

  it('returns false when a recipe is gated behind a missing milestone', () => {
    const recipe = FORGE_RECIPES.find((r) => r.id === 'forge_guixu_armor')!
    expect(canForge(recipe, { ore: 9999, spiritStone: 9999 }, 8, { 归墟潮晶: 3, 渊息残片: 2 })).toBe(false)
    expect(
      canForge(recipe, { ore: 9999, spiritStone: 9999 }, 8, { 归墟潮晶: 3, 渊息残片: 2 }, ['legacyForgePair'])
    ).toBe(true)
  })
})

describe('forgeEquipment', () => {
  it('returns null if cannot forge', () => {
    expect(forgeEquipment(FORGE_RECIPES[0], 0, 0)).toBe(null)
  })

  it('returns an equipment item on success', () => {
    const recipe = FORGE_RECIPES.find((r) => r.successRate >= 1)!
    const result = forgeEquipment(recipe, 3, 0)
    expect(result).not.toBeNull()
    expect(result!.type).toBe('equipment')
  })

  it('uses the forced slot for legacy forge recipes', () => {
    const recipe = FORGE_RECIPES.find((r) => r.id === 'forge_guixu_talisman')!
    const result = forgeEquipment(recipe, 7, 1)
    expect(result).not.toBeNull()
    expect(result!.slot).toBe('talisman')
    expect(result!.quality).toBe('chaos')
  })

  it('uses the armor slot for the third guixu relic recipe', () => {
    const recipe = FORGE_RECIPES.find((r) => r.id === 'forge_guixu_armor')!
    const result = forgeEquipment(recipe, 8, 1)
    expect(result).not.toBeNull()
    expect(result!.slot).toBe('armor')
    expect(result!.quality).toBe('chaos')
  })
})

describe('getAvailableForgeRecipes', () => {
  it('filters by forge level', () => {
    const all = getAvailableForgeRecipes(10)
    const filtered = getAvailableForgeRecipes(1)
    expect(filtered.length).toBeLessThanOrEqual(all.length)
  })
})
