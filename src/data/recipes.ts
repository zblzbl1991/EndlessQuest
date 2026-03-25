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
  { id: 'hp_potion', name: '回血丹', buildingType: 'alchemyFurnace', minLevel: 1, inputPerSec: { herb: 0.25 }, totalCost: { spiritStone: 0, herb: 5, ore: 0 }, productionTime: 20, productType: 'consumable' },
  { id: 'spirit_potion', name: '灵气丹', buildingType: 'alchemyFurnace', minLevel: 1, inputPerSec: { herb: 0.4 }, totalCost: { spiritStone: 0, herb: 10, ore: 0 }, productionTime: 25, productType: 'consumable' },
  { id: 'foundation_pill', name: '筑基丹', buildingType: 'alchemyFurnace', minLevel: 3, inputPerSec: { herb: 0.5, spiritStone: 2 }, totalCost: { spiritStone: 120, herb: 30, ore: 0 }, productionTime: 60, productType: 'consumable' },
  { id: 'golden_core_pill', name: '金丹丹', buildingType: 'alchemyFurnace', minLevel: 5, inputPerSec: { herb: 0.5, spiritStone: 5 }, totalCost: { spiritStone: 600, herb: 60, ore: 0 }, productionTime: 120, productType: 'consumable' },
  { id: 'nascent_soul_pill', name: '元婴丹', buildingType: 'alchemyFurnace', minLevel: 7, inputPerSec: { herb: 1.0, spiritStone: 10 }, totalCost: { spiritStone: 3000, herb: 300, ore: 0 }, productionTime: 300, productType: 'consumable' },
  { id: 'spirit_transformation_pill', name: '化神丹', buildingType: 'alchemyFurnace', minLevel: 8, inputPerSec: { herb: 1.5, spiritStone: 20 }, totalCost: { spiritStone: 10000, herb: 750, ore: 0 }, productionTime: 500, productType: 'consumable' },
  { id: 'forge_common', name: '凡品装备', buildingType: 'forge', minLevel: 3, inputPerSec: { ore: 0.2, spiritStone: 0.5 }, totalCost: { spiritStone: 15, herb: 0, ore: 6 }, productionTime: 30, productType: 'equipment' },
  { id: 'forge_spirit', name: '灵品装备', buildingType: 'forge', minLevel: 3, inputPerSec: { ore: 0.5, spiritStone: 2 }, totalCost: { spiritStone: 120, herb: 0, ore: 30 }, productionTime: 60, productType: 'equipment' },
  { id: 'forge_immortal', name: '仙品装备', buildingType: 'forge', minLevel: 5, inputPerSec: { ore: 1.0, spiritStone: 5 }, totalCost: { spiritStone: 600, herb: 0, ore: 120 }, productionTime: 120, productType: 'equipment' },
  { id: 'forge_divine', name: '神品装备', buildingType: 'forge', minLevel: 7, inputPerSec: { ore: 2.0, spiritStone: 15 }, totalCost: { spiritStone: 4500, herb: 0, ore: 600 }, productionTime: 300, productType: 'equipment' },
]

export function getAutoRecipeById(id: string): AutoRecipe | undefined {
  return AUTO_RECIPES.find(r => r.id === id)
}

export function getAutoRecipesForBuilding(
  buildingType: 'alchemyFurnace' | 'forge',
  buildingLevel: number
): AutoRecipe[] {
  return AUTO_RECIPES.filter(r => r.buildingType === buildingType && r.minLevel <= buildingLevel)
}
