import type { ProductionQueue, Resources } from '../../types/sect'
import { getAutoRecipeById } from '../../data/recipes'

export interface TickResult {
  progress: number
  consumed: Resources
  completed: boolean
}

export interface OfflineResult {
  itemsProduced: number
  consumed: Resources
}

export function tickProductionQueue(
  queue: ProductionQueue,
  resources: Resources,
  deltaSec: number,
  vaultFull: boolean
): TickResult {
  const empty: TickResult = {
    progress: queue.progress,
    consumed: { spiritStone: 0, spiritEnergy: 0, herb: 0, ore: 0 },
    completed: false,
  }
  if (!queue.recipeId) return empty
  if (vaultFull) return empty
  const recipe = getAutoRecipeById(queue.recipeId)
  if (!recipe) return empty

  const herbCost = (recipe.inputPerSec.herb ?? 0) * deltaSec
  const stoneCost = (recipe.inputPerSec.spiritStone ?? 0) * deltaSec
  const oreCost = (recipe.inputPerSec.ore ?? 0) * deltaSec

  if (resources.herb < herbCost || resources.spiritStone < stoneCost || resources.ore < oreCost) {
    return empty
  }

  let newProgress = queue.progress + deltaSec

  if (newProgress >= recipe.productionTime) {
    return {
      progress: 0,
      consumed: {
        spiritStone: (recipe.inputPerSec.spiritStone ?? 0) * recipe.productionTime,
        spiritEnergy: 0,
        herb: (recipe.inputPerSec.herb ?? 0) * recipe.productionTime,
        ore: (recipe.inputPerSec.ore ?? 0) * recipe.productionTime,
      },
      completed: true,
    }
  }

  return {
    progress: newProgress,
    consumed: { spiritStone: stoneCost, spiritEnergy: 0, herb: herbCost, ore: oreCost },
    completed: false,
  }
}

export function calcOfflineProduction(
  queue: ProductionQueue,
  resources: Resources,
  offlineSeconds: number,
  vaultFreeSlots: number
): OfflineResult {
  const empty: OfflineResult = {
    itemsProduced: 0,
    consumed: { spiritStone: 0, spiritEnergy: 0, herb: 0, ore: 0 },
  }
  if (!queue.recipeId) return empty
  const recipe = getAutoRecipeById(queue.recipeId)
  if (!recipe) return empty

  const herbPerItem = (recipe.inputPerSec.herb ?? 0) * recipe.productionTime
  const stonePerItem = (recipe.inputPerSec.spiritStone ?? 0) * recipe.productionTime
  const orePerItem = (recipe.inputPerSec.ore ?? 0) * recipe.productionTime

  const maxFromHerbs = herbPerItem > 0 ? Math.floor(resources.herb / herbPerItem) : Infinity
  const maxFromStone = stonePerItem > 0 ? Math.floor(resources.spiritStone / stonePerItem) : Infinity
  const maxFromOre = orePerItem > 0 ? Math.floor(resources.ore / orePerItem) : Infinity
  const maxFromTime = Math.floor(offlineSeconds / recipe.productionTime)
  const maxFromVault = vaultFreeSlots

  const items = Math.max(0, Math.min(maxFromHerbs, maxFromStone, maxFromOre, maxFromTime, maxFromVault))
  return {
    itemsProduced: items,
    consumed: { spiritStone: items * stonePerItem, spiritEnergy: 0, herb: items * herbPerItem, ore: items * orePerItem },
  }
}

export function canStartRecipe(recipeId: string, buildingLevel: number): boolean {
  const recipe = getAutoRecipeById(recipeId)
  if (!recipe) return false
  return buildingLevel >= recipe.minLevel
}
