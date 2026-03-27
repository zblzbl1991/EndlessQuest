import type { AnyItem, Consumable, ItemStack } from '../../types'

/**
 * Add an item to an ItemStack array with stacking logic.
 * - Consumables with recipeId: stack into existing matching entry
 * - Everything else: new entry with quantity 1
 * Returns the updated array (does NOT mutate input).
 */
export function addItemToStacks(stacks: ItemStack[], item: AnyItem): ItemStack[] {
  const rid = item.type === 'consumable' ? (item as Consumable).recipeId : null
  if (rid) {
    const existing = stacks.findIndex(
      s => s.item.type === 'consumable' && (s.item as Consumable).recipeId === rid
    )
    if (existing !== -1) {
      const next = [...stacks]
      next[existing] = { ...next[existing], quantity: next[existing].quantity + 1 }
      return next
    }
  }
  return [...stacks, { item, quantity: 1 }]
}

/**
 * Add multiple of the same item to stacks.
 */
export function addItemQuantityToStacks(stacks: ItemStack[], item: AnyItem, quantity: number): ItemStack[] {
  if (quantity <= 0) return stacks
  const rid = item.type === 'consumable' ? (item as Consumable).recipeId : null
  if (rid) {
    const existing = stacks.findIndex(
      s => s.item.type === 'consumable' && (s.item as Consumable).recipeId === rid
    )
    if (existing !== -1) {
      const next = [...stacks]
      next[existing] = { ...next[existing], quantity: next[existing].quantity + quantity }
      return next
    }
  }
  return [...stacks, { item, quantity }]
}

/**
 * Remove one item at index. For consumables with recipeId, decrement quantity.
 * Returns { stacks, removed: ItemStack | null }.
 */
export function removeStackAtIndex(stacks: ItemStack[], index: number): { stacks: ItemStack[]; removed: ItemStack | null } {
  if (index < 0 || index >= stacks.length) return { stacks, removed: null }
  const target = stacks[index]
  const rid = target.item.type === 'consumable' ? (target.item as Consumable).recipeId : null
  if (rid && target.quantity > 1) {
    const next = [...stacks]
    next[index] = { ...next[index], quantity: next[index].quantity - 1 }
    return { stacks: next, removed: { ...target, quantity: 1 } }
  }
  return { stacks: stacks.filter((_, i) => i !== index), removed: target }
}

/**
 * Remove N consumable items matching a recipeId. Returns new stacks and number removed.
 */
export function removeConsumablesByRecipeId(stacks: ItemStack[], recipeId: string, count: number): { stacks: ItemStack[]; removed: number } {
  let remaining = count
  const next = [...stacks]
  for (let i = next.length - 1; i >= 0 && remaining > 0; i--) {
    const s = next[i]
    if (s.item.type === 'consumable' && (s.item as Consumable).recipeId === recipeId) {
      if (s.quantity <= remaining) {
        remaining -= s.quantity
        next.splice(i, 1)
      } else {
        next[i] = { ...s, quantity: s.quantity - remaining }
        remaining = 0
      }
    }
  }
  return { stacks: next, removed: count - remaining }
}

/**
 * Count total quantity of consumable items matching a recipeId.
 */
export function countConsumablesByRecipeId(stacks: ItemStack[], recipeId: string): number {
  return stacks.reduce((sum, s) => {
    if (s.item.type === 'consumable' && (s.item as Consumable).recipeId === recipeId) {
      return sum + s.quantity
    }
    return sum
  }, 0)
}

/**
 * Migrate old AnyItem[] to ItemStack[]. Wraps each item as { item, quantity: 1 }.
 * If already ItemStack[] (has .item and .quantity properties), returns as-is.
 */
export function migrateToItemStacks(data: unknown[]): ItemStack[] {
  if (!data || data.length === 0) return []
  const first = data[0]
  if (first && typeof first === 'object' && 'item' in first && 'quantity' in first) {
    return data as ItemStack[]
  }
  return (data as AnyItem[]).map(item => ({ item, quantity: 1 }))
}
