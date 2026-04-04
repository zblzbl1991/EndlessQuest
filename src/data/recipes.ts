export interface AutoRecipe {
  id: string
  name: string
  buildingType: 'alchemyFurnace' | 'forge'
  minLevel: number
  inputPerSec: Partial<{ spiritStone: number; herb: number; ore: number }>
  totalCost: { spiritStone: number; herb: number; ore: number }
  productionTime: number
  productType: string
}

export const AUTO_RECIPES: AutoRecipe[] = [
  // --- Alchemy Recipes ---
  {
    id: 'hp_potion',
    name: '回血丹',
    buildingType: 'alchemyFurnace',
    minLevel: 1,
    inputPerSec: { herb: 0.25 },
    totalCost: { spiritStone: 0, herb: 5, ore: 0 },
    productionTime: 20,
    productType: 'consumable',
  },
  {
    id: 'spirit_potion',
    name: '灵气丹',
    buildingType: 'alchemyFurnace',
    minLevel: 1,
    inputPerSec: { herb: 0.4 },
    totalCost: { spiritStone: 0, herb: 10, ore: 0 },
    productionTime: 25,
    productType: 'consumable',
  },
  {
    id: 'refined_herb',
    name: '精炼灵草',
    buildingType: 'alchemyFurnace',
    minLevel: 2,
    inputPerSec: { herb: 1.33, spiritStone: 0.67 },
    totalCost: { spiritStone: 10, herb: 20, ore: 0 },
    productionTime: 15,
    productType: 'material',
  },

  // --- Forge Recipes ---
  {
    id: 'refined_ore',
    name: '精炼矿石',
    buildingType: 'forge',
    minLevel: 2,
    inputPerSec: { ore: 1.0, spiritStone: 0.67 },
    totalCost: { spiritStone: 10, herb: 0, ore: 15 },
    productionTime: 15,
    productType: 'material',
  },
  {
    id: 'spirit_ingot',
    name: '灵锭',
    buildingType: 'forge',
    minLevel: 4,
    inputPerSec: { spiritStone: 1.0 },
    totalCost: { spiritStone: 30, herb: 0, ore: 0 },
    productionTime: 30,
    productType: 'material',
  },
  {
    id: 'forge_common',
    name: '凡品装备',
    buildingType: 'forge',
    minLevel: 3,
    inputPerSec: { ore: 0.2, spiritStone: 0.5 },
    totalCost: { spiritStone: 15, herb: 0, ore: 6 },
    productionTime: 30,
    productType: 'equipment',
  },
  {
    id: 'forge_spirit_offensive',
    name: '灵品利器',
    buildingType: 'forge',
    minLevel: 3,
    inputPerSec: { ore: 0.3, spiritStone: 2.5 },
    totalCost: { spiritStone: 150, herb: 0, ore: 18 },
    productionTime: 60,
    productType: 'equipment',
  },
  {
    id: 'forge_spirit_defensive',
    name: '灵品重甲',
    buildingType: 'forge',
    minLevel: 3,
    inputPerSec: { ore: 0.5, spiritStone: 1.5 },
    totalCost: { spiritStone: 90, herb: 0, ore: 30 },
    productionTime: 60,
    productType: 'equipment',
  },
  {
    id: 'forge_immortal_offensive',
    name: '仙品利器',
    buildingType: 'forge',
    minLevel: 5,
    inputPerSec: { spiritStone: 4.5 },
    totalCost: { spiritStone: 540, herb: 0, ore: 0 },
    productionTime: 120,
    productType: 'equipment',
  },
  {
    id: 'forge_immortal_defensive',
    name: '仙品重甲',
    buildingType: 'forge',
    minLevel: 5,
    inputPerSec: { spiritStone: 4.0 },
    totalCost: { spiritStone: 480, herb: 0, ore: 0 },
    productionTime: 120,
    productType: 'equipment',
  },
  {
    id: 'forge_divine_offensive',
    name: '神品利器',
    buildingType: 'forge',
    minLevel: 7,
    inputPerSec: { spiritStone: 12.0 },
    totalCost: { spiritStone: 3600, herb: 0, ore: 0 },
    productionTime: 300,
    productType: 'equipment',
  },
  {
    id: 'forge_divine_defensive',
    name: '神品重甲',
    buildingType: 'forge',
    minLevel: 7,
    inputPerSec: { spiritStone: 11.0 },
    totalCost: { spiritStone: 3300, herb: 0, ore: 0 },
    productionTime: 300,
    productType: 'equipment',
  },
]

export function getAutoRecipeById(id: string): AutoRecipe | undefined {
  return AUTO_RECIPES.find((r) => r.id === id)
}

export function getAutoRecipesForBuilding(
  buildingType: 'alchemyFurnace' | 'forge',
  buildingLevel: number
): AutoRecipe[] {
  return AUTO_RECIPES.filter((r) => r.buildingType === buildingType && r.minLevel <= buildingLevel)
}
