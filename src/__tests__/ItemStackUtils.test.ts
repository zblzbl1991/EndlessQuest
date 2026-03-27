import { addItemToStacks, addItemQuantityToStacks, removeStackAtIndex, removeConsumablesByRecipeId, countConsumablesByRecipeId, migrateToItemStacks } from '../systems/item/ItemStackUtils'
import type { Consumable } from '../types'

function makeConsumable(id: string, recipeId?: string): Consumable {
  return { id, name: 'test', quality: 'common', type: 'consumable', description: '', sellPrice: 10, effect: { type: 'hp', value: 10 }, recipeId }
}

function makeEquipment(id: string) {
  return { id, name: 'sword', quality: 'common', type: 'equipment' as const, description: '', sellPrice: 50, slot: 'weapon' as const, stats: { hp: 0, atk: 10, def: 0, spd: 0, crit: 0, critDmg: 0 }, enhanceLevel: 0, refinementStats: null, setId: null }
}

describe('ItemStackUtils', () => {
  describe('addItemToStacks', () => {
    it('should stack consumables with same recipeId', () => {
      const stacks = [{ item: makeConsumable('a', 'hp_potion'), quantity: 2 }]
      const result = addItemToStacks(stacks, makeConsumable('b', 'hp_potion'))
      expect(result).toHaveLength(1)
      expect(result[0].quantity).toBe(3)
    })

    it('should create new entry for different recipeId', () => {
      const stacks = [{ item: makeConsumable('a', 'hp_potion'), quantity: 2 }]
      const result = addItemToStacks(stacks, makeConsumable('b', 'spirit_potion'))
      expect(result).toHaveLength(2)
    })

    it('should not stack consumables without recipeId', () => {
      const stacks = [{ item: makeConsumable('a'), quantity: 1 }]
      const result = addItemToStacks(stacks, makeConsumable('b'))
      expect(result).toHaveLength(2)
    })

    it('should not stack equipment', () => {
      const stacks = [{ item: makeEquipment('sword1'), quantity: 1 }]
      const result = addItemToStacks(stacks, makeEquipment('sword2'))
      expect(result).toHaveLength(2)
    })
  })

  describe('addItemQuantityToStacks', () => {
    it('should add multiple to existing stack', () => {
      const stacks = [{ item: makeConsumable('a', 'hp'), quantity: 3 }]
      const result = addItemQuantityToStacks(stacks, makeConsumable('b', 'hp'), 5)
      expect(result).toHaveLength(1)
      expect(result[0].quantity).toBe(8)
    })
  })

  describe('removeStackAtIndex', () => {
    it('should decrement quantity for stackable items', () => {
      const stacks = [{ item: makeConsumable('a', 'hp'), quantity: 3 }]
      const { stacks: result, removed } = removeStackAtIndex(stacks, 0)
      expect(result).toHaveLength(1)
      expect(result[0].quantity).toBe(2)
      expect(removed?.quantity).toBe(1)
    })

    it('should remove entire entry when quantity becomes 0', () => {
      const stacks = [{ item: makeEquipment('sword'), quantity: 1 }]
      const { stacks: result, removed } = removeStackAtIndex(stacks, 0)
      expect(result).toHaveLength(0)
      expect(removed?.item.id).toBe('sword')
    })

    it('should return null for out-of-bounds index', () => {
      const stacks = [{ item: makeEquipment('sword'), quantity: 1 }]
      const { removed } = removeStackAtIndex(stacks, 5)
      expect(removed).toBeNull()
    })
  })

  describe('removeConsumablesByRecipeId', () => {
    it('should remove across multiple stacks', () => {
      const stacks = [
        { item: makeConsumable('a', 'hp'), quantity: 3 },
        { item: makeConsumable('b', 'spirit'), quantity: 5 },
        { item: makeConsumable('c', 'hp'), quantity: 2 },
      ]
      const { stacks: result, removed } = removeConsumablesByRecipeId(stacks, 'hp', 4)
      expect(removed).toBe(4)
      expect(countConsumablesByRecipeId(result, 'hp')).toBe(1)
    })
  })

  describe('countConsumablesByRecipeId', () => {
    it('should sum quantities across stacks', () => {
      const stacks = [
        { item: makeConsumable('a', 'hp'), quantity: 3 },
        { item: makeConsumable('b', 'hp'), quantity: 7 },
      ]
      expect(countConsumablesByRecipeId(stacks, 'hp')).toBe(10)
      expect(countConsumablesByRecipeId(stacks, 'spirit')).toBe(0)
    })
  })

  describe('migrateToItemStacks', () => {
    it('should wrap AnyItem[] as ItemStack[]', () => {
      const old = [makeConsumable('a', 'hp'), makeEquipment('sword')]
      const result = migrateToItemStacks(old as unknown[])
      expect(result).toHaveLength(2)
      expect(result[0].quantity).toBe(1)
      expect(result[0].item.id).toBe('a')
    })

    it('should pass through already-migrated data', () => {
      const already = [{ item: makeConsumable('a', 'hp'), quantity: 5 }]
      const result = migrateToItemStacks(already as unknown[])
      expect(result).toHaveLength(1)
      expect(result[0].quantity).toBe(5)
    })
  })
})
