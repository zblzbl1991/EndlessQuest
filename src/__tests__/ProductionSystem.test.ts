import { describe, it, expect } from 'vitest'
import {
  tickProductionQueue,
  calcOfflineProduction,
  canStartRecipe,
} from '../systems/building/ProductionSystem'
import type { ProductionQueue, Resources } from '../types/sect'

const emptyResources: Resources = { spiritStone: 0, spiritEnergy: 0, herb: 0, ore: 0 }

// hp_potion recipe: herb 0.25/sec, productionTime 20s, minLevel 1
// foundation_pill recipe: herb 0.5/sec, spiritStone 2/sec, productionTime 60s, minLevel 3

describe('tickProductionQueue', () => {
  it('null recipeId returns no-op', () => {
    const queue: ProductionQueue = { recipeId: null, progress: 0 }
    const result = tickProductionQueue(queue, emptyResources, 1, false)
    expect(result.progress).toBe(0)
    expect(result.consumed).toEqual(emptyResources)
    expect(result.completed).toBe(false)
  })

  it('accumulates progress and consumes herbs', () => {
    const queue: ProductionQueue = { recipeId: 'hp_potion', progress: 0 }
    const resources: Resources = { spiritStone: 0, spiritEnergy: 0, herb: 100, ore: 0 }
    const result = tickProductionQueue(queue, resources, 5, false)
    expect(result.progress).toBe(5)
    expect(result.consumed.herb).toBeCloseTo(0.25 * 5) // 1.25
    expect(result.completed).toBe(false)
  })

  it('pauses when resources insufficient', () => {
    const queue: ProductionQueue = { recipeId: 'hp_potion', progress: 0 }
    const resources: Resources = { spiritStone: 0, spiritEnergy: 0, herb: 0.1, ore: 0 }
    const result = tickProductionQueue(queue, resources, 1, false)
    // herb needed: 0.25 * 1 = 0.25, but only 0.1 available
    expect(result.progress).toBe(0)
    expect(result.consumed).toEqual(emptyResources)
    expect(result.completed).toBe(false)
  })

  it('completes when progress >= productionTime and resets progress to 0', () => {
    const queue: ProductionQueue = { recipeId: 'hp_potion', progress: 18 } // 18/20, need 2 more
    const resources: Resources = { spiritStone: 0, spiritEnergy: 0, herb: 100, ore: 0 }
    const result = tickProductionQueue(queue, resources, 5, false)
    expect(result.progress).toBe(0)
    expect(result.completed).toBe(true)
    // consumed should be total for one production cycle, not deltaSec
    expect(result.consumed.herb).toBeCloseTo(0.25 * 20) // 5 herbs total
  })

  it('pauses when vaultFull', () => {
    const queue: ProductionQueue = { recipeId: 'hp_potion', progress: 0 }
    const resources: Resources = { spiritStone: 0, spiritEnergy: 0, herb: 100, ore: 0 }
    const result = tickProductionQueue(queue, resources, 1, true)
    expect(result.progress).toBe(0)
    expect(result.consumed).toEqual(emptyResources)
    expect(result.completed).toBe(false)
  })

  it('respects deltaSec > 1', () => {
    const queue: ProductionQueue = { recipeId: 'hp_potion', progress: 0 }
    const resources: Resources = { spiritStone: 0, spiritEnergy: 0, herb: 100, ore: 0 }
    const result = tickProductionQueue(queue, resources, 10, false)
    expect(result.progress).toBe(10)
    expect(result.consumed.herb).toBeCloseTo(0.25 * 10) // 2.5
    expect(result.completed).toBe(false)
  })
})

describe('calcOfflineProduction', () => {
  it('estimates items using net rate, caps by herbs/time/vault', () => {
    const queue: ProductionQueue = { recipeId: 'hp_potion', progress: 0 }
    const resources: Resources = { spiritStone: 0, spiritEnergy: 0, herb: 15, ore: 0 }
    // hp_potion: 5 herbs/item, 20s/item
    // maxFromHerbs: floor(15/5) = 3
    // maxFromTime: floor(100/20) = 5
    // maxFromVault: 10
    // result = min(3, Inf, Inf, 5, 10) = 3
    const result = calcOfflineProduction(queue, resources, 100, 10)
    expect(result.itemsProduced).toBe(3)
    expect(result.consumed.herb).toBeCloseTo(15)
  })

  it('null recipeId returns 0 items', () => {
    const queue: ProductionQueue = { recipeId: null, progress: 0 }
    const resources: Resources = { spiritStone: 1000, spiritEnergy: 0, herb: 100, ore: 0 }
    const result = calcOfflineProduction(queue, resources, 100, 10)
    expect(result.itemsProduced).toBe(0)
    expect(result.consumed).toEqual(emptyResources)
  })

  it('caps by vault slots', () => {
    const queue: ProductionQueue = { recipeId: 'hp_potion', progress: 0 }
    const resources: Resources = { spiritStone: 0, spiritEnergy: 0, herb: 100, ore: 0 }
    // maxFromHerbs: floor(100/5) = 20
    // maxFromTime: floor(100/20) = 5
    // maxFromVault: 2
    // result = min(20, Inf, Inf, 5, 2) = 2
    const result = calcOfflineProduction(queue, resources, 100, 2)
    expect(result.itemsProduced).toBe(2)
    expect(result.consumed.herb).toBeCloseTo(10)
  })
})

describe('canStartRecipe', () => {
  it('returns true when level sufficient', () => {
    expect(canStartRecipe('hp_potion', 1)).toBe(true)
    expect(canStartRecipe('foundation_pill', 3)).toBe(true)
    expect(canStartRecipe('foundation_pill', 10)).toBe(true)
  })

  it('returns false when level too low', () => {
    expect(canStartRecipe('foundation_pill', 2)).toBe(false)
    expect(canStartRecipe('golden_core_pill', 4)).toBe(false)
  })

  it('returns false for unknown recipe', () => {
    expect(canStartRecipe('nonexistent_recipe', 10)).toBe(false)
    expect(canStartRecipe('', 10)).toBe(false)
  })
})
