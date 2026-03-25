import { AUTO_RECIPES, getAutoRecipeById, getAutoRecipesForBuilding } from '../data/recipes'

describe('AUTO_RECIPES', () => {
  it('should have at least 10 recipes', () => {
    expect(AUTO_RECIPES.length).toBeGreaterThanOrEqual(10)
  })

  it('should have all required fields on every recipe', () => {
    for (const recipe of AUTO_RECIPES) {
      expect(recipe.id).toBeTruthy()
      expect(recipe.name).toBeTruthy()
      expect(['alchemyFurnace', 'forge']).toContain(recipe.buildingType)
      expect(recipe.minLevel).toBeGreaterThanOrEqual(1)
      expect(recipe.productionTime).toBeGreaterThan(0)
      expect(recipe.productType).toBeTruthy()
      expect(recipe.totalCost).toBeDefined()
      expect(typeof recipe.totalCost.spiritStone).toBe('number')
      expect(typeof recipe.totalCost.herb).toBe('number')
      expect(typeof recipe.totalCost.ore).toBe('number')
    }
  })

  it('should have cost consistency: inputPerSec * productionTime approximately equals totalCost', () => {
    for (const recipe of AUTO_RECIPES) {
      const resources = ['spiritStone', 'herb', 'ore'] as const
      for (const res of resources) {
        const rate = recipe.inputPerSec[res]
        if (rate !== undefined && rate > 0) {
          const expected = rate * recipe.productionTime
          const actual = recipe.totalCost[res]
          // Allow 1% tolerance for rounding
          expect(actual).toBeCloseTo(expected, 0)
        } else if (rate === 0 || rate === undefined) {
          // If no input rate, totalCost for this resource should be 0
          expect(recipe.totalCost[res]).toBe(0)
        }
      }
    }
  })

  it('should split recipes between alchemyFurnace and forge', () => {
    const alchemy = AUTO_RECIPES.filter(r => r.buildingType === 'alchemyFurnace')
    const forge = AUTO_RECIPES.filter(r => r.buildingType === 'forge')
    expect(alchemy.length).toBeGreaterThanOrEqual(4)
    expect(forge.length).toBeGreaterThanOrEqual(3)
  })

  it('should have unique IDs', () => {
    const ids = AUTO_RECIPES.map(r => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('getAutoRecipeById', () => {
  it('should return recipe for valid ID', () => {
    const recipe = getAutoRecipeById('hp_potion')
    expect(recipe).toBeDefined()
    expect(recipe!.name).toBe('回血丹')
  })

  it('should return undefined for unknown ID', () => {
    const recipe = getAutoRecipeById('nonexistent')
    expect(recipe).toBeUndefined()
  })

  it('should return undefined for empty string', () => {
    const recipe = getAutoRecipeById('')
    expect(recipe).toBeUndefined()
  })
})

describe('getAutoRecipesForBuilding', () => {
  it('should return only alchemyFurnace recipes for alchemyFurnace type', () => {
    const recipes = getAutoRecipesForBuilding('alchemyFurnace', 10)
    for (const r of recipes) {
      expect(r.buildingType).toBe('alchemyFurnace')
    }
  })

  it('should return only forge recipes for forge type', () => {
    const recipes = getAutoRecipesForBuilding('forge', 10)
    for (const r of recipes) {
      expect(r.buildingType).toBe('forge')
    }
  })

  it('should filter by minLevel', () => {
    const allForge = getAutoRecipesForBuilding('forge', 10)
    const lowLevelForge = getAutoRecipesForBuilding('forge', 1)
    // Level 1 should have fewer recipes than level 10
    expect(lowLevelForge.length).toBeLessThan(allForge.length)
    // All returned recipes should have minLevel <= 1
    for (const r of lowLevelForge) {
      expect(r.minLevel).toBeLessThanOrEqual(1)
    }
  })

  it('should return empty for building with no recipes below level', () => {
    const recipes = getAutoRecipesForBuilding('alchemyFurnace', 0)
    expect(recipes.length).toBe(0)
  })
})
