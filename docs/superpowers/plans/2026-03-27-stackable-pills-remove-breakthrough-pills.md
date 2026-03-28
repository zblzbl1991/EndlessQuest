# 丹药叠加 + 移除突破丹 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 将丹药改为按 recipeId 可叠加存储，移除突破丹配方和消耗逻辑，大幅提高大境界突破灵石消耗。

**Architecture:** 引入 `ItemStack { item: AnyItem, quantity: number }` 包装类型，将 `Sect.vault` 和 `Character.backpack` 从 `AnyItem[]` 改为 `ItemStack[]`。所有物品操作改为操作 ItemStack。消耗品按 recipeId 叠加，非消耗品 quantity 始终为 1。

**Tech Stack:** TypeScript, Zustand, IndexedDB (idb)

---

### Task 1: 新增 ItemStack 类型和工具函数

**Files:**
- Modify: `src/types/item.ts:47-52` — 新增 ItemStack, 修改 InventoryState
- Create: `src/systems/item/ItemStackUtils.ts` — 叠加/拆分/移除工具函数
- Test: `src/__tests__/ItemStackUtils.test.ts`

- [x] **Step 1: 在 `src/types/item.ts` 中新增 ItemStack 类型**

在 `AnyItem` 定义之后（行 47 之后），新增：

```typescript
/** A stackable wrapper for items. Consumables with the same recipeId stack; others always have quantity 1. */
export interface ItemStack {
  item: AnyItem
  quantity: number
}

/** Helper: create an ItemStack from an AnyItem, defaulting quantity to 1 */
export function toItemStack(item: AnyItem, quantity: number = 1): ItemStack {
  return { item, quantity }
}

/** Helper: check if an ItemStack holds a consumable with a recipeId (stackable) */
export function isStackable(stack: ItemStack): boolean {
  return stack.item.type === 'consumable' && 'recipeId' in stack.item && !!(stack.item as Consumable).recipeId
}

/** Helper: get the recipeId of a stack's item, or null */
export function getRecipeId(stack: ItemStack): string | null {
  return stack.item.type === 'consumable' ? (stack.item as Consumable).recipeId ?? null : null
}
```

- [x] **Step 2: 更新 `src/types/sect.ts` 中 vault 类型**

将 `src/types/sect.ts` 中 `vault: AnyItem[]` 改为 `vault: ItemStack[]`。

- [x] **Step 3: 更新 `src/types/character.ts` 中 backpack 类型**

将 `src/types/character.ts` 中 `backpack: AnyItem[]` 改为 `backpack: ItemStack[]`。

- [x] **Step 4: 创建 `src/systems/item/ItemStackUtils.ts`**

```typescript
import type { AnyItem, Consumable, ItemStack } from '../types'

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
 * Add multiple of the same item to stacks. Requires recipeId for stacking.
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
```

- [x] **Step 5: 编写测试 `src/__tests__/ItemStackUtils.test.ts`**

```typescript
import { addItemToStacks, addItemQuantityToStacks, removeStackAtIndex, removeConsumablesByRecipeId, countConsumablesByRecipeId, migrateToItemStacks } from '../systems/item/ItemStackUtils'
import type { Consumable } from '../types'

function makeConsumable(id: string, recipeId?: string): Consumable {
  return { id, name: 'test', quality: 'common', type: 'consumable', description: '', sellPrice: 10, effect: { type: 'hp', value: 10 }, recipeId }
}

function makeEquipment(id: string) {
  return { id, name: 'sword', quality: 'common', type: 'equipment' as const, description: '', sellPrice: 50, slot: 'weapon' as const, stats: { attack: 10, defense: 0 }, enhanceLevel: 0, refinementStats: null, setId: null }
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
      const result = migrateToItemStacks(old as any)
      expect(result).toHaveLength(2)
      expect(result[0].quantity).toBe(1)
      expect(result[0].item.id).toBe('a')
    })

    it('should pass through already-migrated data', () => {
      const already = [{ item: makeConsumable('a', 'hp'), quantity: 5 }]
      const result = migrateToItemStacks(already as any)
      expect(result).toHaveLength(1)
      expect(result[0].quantity).toBe(5)
    })
  })
})
```

- [x] **Step 6: 运行测试确认通过**

Run: `npx vitest run src/__tests__/ItemStackUtils.test.ts`
Expected: all tests PASS

- [x] **Step 7: Commit**

```bash
git add src/types/item.ts src/types/sect.ts src/types/character.ts src/systems/item/ItemStackUtils.ts src/__tests__/ItemStackUtils.test.ts
git commit -m "feat(items): add ItemStack type and stack utility functions"
```

---

### Task 2: 更新 SectStore 接口和物品操作

**Files:**
- Modify: `src/stores/sectStore.ts:88-137` (interface), `:150-169` (produceItemFromRecipe), `:428-512` (item transfer actions)

- [x] **Step 1: 更新 SectStore 接口中的物品操作签名**

修改 `src/stores/sectStore.ts` 行 109-114 的 Item transfer 部分接口：

```typescript
  // Item transfer
  transferItemToCharacter(characterId: string, vaultIndex: number): boolean
  transferItemToVault(characterId: string, backpackIndex: number): boolean
  addToVault(item: AnyItem): boolean
  sellItem(vaultIndex: number): boolean
  removeVaultItem(vaultIndex: number): ItemStack | null
```

注意：`removeVaultItem` 返回类型从 `AnyItem | null` 改为 `ItemStack | null`。

- [x] **Step 2: 添加 import**

在 `src/stores/sectStore.ts` 顶部添加：

```typescript
import { addItemToStacks, removeStackAtIndex, addItemQuantityToStacks, removeConsumablesByRecipeId, migrateToItemStacks } from '../systems/item/ItemStackUtils'
import type { ItemStack } from '../types'
```

- [x] **Step 3: 重写 `addToVault` (行 476-483)**

```typescript
    addToVault: (item) => {
      const { sect } = get()
      const isConsumableWithRecipe = item.type === 'consumable' && (item as Consumable).recipeId
      // For stackable items, don't count against maxSlots if already exists
      if (!isConsumableWithRecipe && sect.vault.length >= sect.maxVaultSlots) return false
      if (isConsumableWithRecipe) {
        const existing = sect.vault.findIndex(
          s => s.item.type === 'consumable' && (s.item as Consumable).recipeId === (item as Consumable).recipeId
        )
        if (existing === -1 && sect.vault.length >= sect.maxVaultSlots) return false
      }
      const newVault = addItemToStacks(sect.vault, item)
      set((s) => ({ sect: { ...s.sect, vault: newVault } }))
      return true
    },
```

- [x] **Step 4: 重写 `transferItemToCharacter` (行 428-450)**

```typescript
    transferItemToCharacter: (characterId, vaultIndex) => {
      const { sect } = get()
      const char = sect.characters.find((c) => c.id === characterId)
      if (!char) return false
      const stack = sect.vault[vaultIndex]
      if (!stack) return false
      // Check backpack capacity for non-stackable or new stackable
      const isStackable = stack.item.type === 'consumable' && (stack.item as Consumable).recipeId
      if (isStackable) {
        const existingBp = char.backpack.findIndex(
          s => s.item.type === 'consumable' && (s.item as Consumable).recipeId === (stack.item as Consumable).recipeId
        )
        if (existingBp === -1 && char.backpack.length >= char.maxBackpackSlots) return false
      } else {
        if (char.backpack.length >= char.maxBackpackSlots) return false
      }
      const { stacks: newVault, removed } = removeStackAtIndex(sect.vault, vaultIndex)
      if (!removed) return false
      const newBackpack = addItemToStacks(char.backpack, removed.item)
      set((s) => ({
        sect: {
          ...s.sect,
          vault: newVault,
          characters: s.sect.characters.map((c) =>
            c.id === characterId ? { ...c, backpack: newBackpack } : c
          ),
        },
      }))
      return true
    },
```

- [x] **Step 5: 重写 `transferItemToVault` (行 452-474)**

```typescript
    transferItemToVault: (characterId, backpackIndex) => {
      const { sect } = get()
      const char = sect.characters.find((c) => c.id === characterId)
      if (!char) return false
      const stack = char.backpack[backpackIndex]
      if (!stack) return false
      const isStackable = stack.item.type === 'consumable' && (stack.item as Consumable).recipeId
      if (isStackable) {
        const existing = sect.vault.findIndex(
          s => s.item.type === 'consumable' && (s.item as Consumable).recipeId === (stack.item as Consumable).recipeId
        )
        if (existing === -1 && sect.vault.length >= sect.maxVaultSlots) return false
      } else {
        if (sect.vault.length >= sect.maxVaultSlots) return false
      }
      const { stacks: newBackpack, removed } = removeStackAtIndex(char.backpack, backpackIndex)
      if (!removed) return false
      const newVault = addItemToStacks(sect.vault, removed.item)
      set((s) => ({
        sect: {
          ...s.sect,
          vault: newVault,
          characters: s.sect.characters.map((c) =>
            c.id === characterId ? { ...c, backpack: newBackpack } : c
          ),
        },
      }))
      return true
    },
```

- [x] **Step 6: 重写 `sellItem` (行 485-501)**

```typescript
    sellItem: (vaultIndex) => {
      const { sect } = get()
      const stack = sect.vault[vaultIndex]
      if (!stack) return false
      const { stacks: newVault, removed } = removeStackAtIndex(sect.vault, vaultIndex)
      if (!removed) return false
      set((s) => ({
        sect: {
          ...s.sect,
          vault: newVault,
          resources: { ...s.sect.resources, spiritStone: s.sect.resources.spiritStone + removed.item.sellPrice },
        },
      }))
      return true
    },
```

- [x] **Step 7: 重写 `removeVaultItem` (行 503-512)**

```typescript
    removeVaultItem: (vaultIndex) => {
      const { sect } = get()
      const { stacks: newVault, removed } = removeStackAtIndex(sect.vault, vaultIndex)
      if (removed) {
        set((s) => ({ sect: { ...s.sect, vault: newVault } }))
      }
      return removed
    },
```

- [x] **Step 8: 重写 `sellCharacterItem` (行 638-661)**

```typescript
    sellCharacterItem: (characterId, backpackIndex) => {
      const { sect } = get()
      const char = sect.characters.find((c) => c.id === characterId)
      if (!char) return false
      const stack = char.backpack[backpackIndex]
      if (!stack) return false
      const { stacks: newBackpack, removed } = removeStackAtIndex(char.backpack, backpackIndex)
      if (!removed) return false
      set((s) => ({
        sect: {
          ...s.sect,
          characters: s.sect.characters.map((c) =>
            c.id === characterId ? { ...c, backpack: newBackpack } : c
          ),
          resources: { ...s.sect.resources, spiritStone: s.sect.resources.spiritStone + removed.item.sellPrice },
        },
      }))
      return true
    },
```

- [x] **Step 9: 重写 `produceItemFromRecipe` (行 154-169)**

改为返回 `ItemStack` 并使用 `addItemQuantityToStacks`：

```typescript
function produceItemAsStack(recipe: AutoRecipe, buildingLevel: number): ItemStack | null {
  if (recipe.productType === 'consumable') {
    const alchemyRecipe = ALCHEMY_RECIPES.find(r => r.id === recipe.id)
    if (!alchemyRecipe) return null
    const item = craftPotionAlchemy(alchemyRecipe, buildingLevel)
    if (item) item.recipeId = recipe.id
    return item ? { item, quantity: 1 } : null
  }
  if (recipe.productType === 'equipment') {
    const forgeRecipe = FORGE_RECIPES.find(r => r.id === recipe.id)
    if (!forgeRecipe) return null
    const slot = FORGE_SLOTS[Math.floor(Math.random() * FORGE_SLOTS.length)]
    const item = generateEquipment(slot, forgeRecipe.quality)
    return item ? { item, quantity: 1 } : null
  }
  return null
}
```

- [x] **Step 10: 更新 `craftPotion` store action (行 1006-1020)**

`craftPotion` 中调用 `addToVault(potion)` 不需要改，因为 addToVault 现在内部处理叠加。但需要确保 `produceItemFromRecipe` 不再被直接使用（改为使用 `produceItemAsStack`）。

搜索所有 `produceItemFromRecipe` 调用并替换为 `produceItemAsStack`。

- [x] **Step 11: 更新 `equipItem` action (行 433-452 附近)**

`equipItem` 从 `char.backpack[backpackIndex]` 取值后，现在得到的是 `ItemStack`，需要从中取 `.item` 来检查是否是 Equipment。调整逻辑：

```typescript
    equipItem: (characterId, backpackIndex, slotIndex) => {
      const { sect } = get()
      const char = sect.characters.find((c) => c.id === characterId)
      if (!char) return false
      const stack = char.backpack[backpackIndex]
      if (!stack || stack.item.type !== 'equipment') return false
      const item = stack.item as Equipment
      // ... rest of logic uses `item` instead of casting from AnyItem
      // remove from backpack uses removeStackAtIndex
    },
```

- [x] **Step 12: 运行现有测试确认编译通过**

Run: `npx tsc --noEmit`
Expected: type errors pointing to remaining AnyItem[] usage sites (these are fixed in later tasks)

- [x] **Step 13: Commit**

```bash
git add src/stores/sectStore.ts
git commit -m "refactor(store): migrate item operations to ItemStack"
```

---

### Task 3: 更新 tickAll 中的生产和突破逻辑

**Files:**
- Modify: `src/stores/sectStore.ts:797-962` (tickAll production + breakthrough)

- [x] **Step 1: 更新 `tickAll` 生产队列逻辑 (行 797-837)**

将 `newVault` 的操作从直接 push 改为使用 ItemStack：

行 799 改为:
```typescript
    const newVault = [...sect.vault]
```
（这里 vault 已经是 ItemStack[] 了，spread 拷贝即可）

行 807: `vaultFreeSlots` 计算需要考虑叠加 — 可叠加物品不增加 slot 数量。但为简化起见，保持 `newVault.length` 检查不变（叠加物品已合并，length 就是实际占用格数）。

行 814-819 (离线模式): 替换 `newVault.push(item)` 为:
```typescript
            const stack = produceItemAsStack(recipe, building.level)
            if (stack) {
              newVault = addItemQuantityToStacks(newVault, stack.item, stack.quantity)
            }
```
注意 `newVault` 需要从 `const` 改为 `let`。

行 829-834 (在线模式): 同样替换:
```typescript
          if (result.completed) {
            const recipe = getAutoRecipeById(building.productionQueue.recipeId!)
            if (recipe) {
              const stack = produceItemAsStack(recipe, building.level)
              if (stack) {
                newVault = addItemQuantityToStacks(newVault, stack.item, stack.quantity)
              }
            }
          }
```

- [x] **Step 2: 更新 `tickAll` 大境界突破逻辑 (行 889-931)**

移除丹药检查和消耗，只检查灵石：

```typescript
        if (cost) {
          // Major realm transition requires spiritStone only
          if (sect.resources.spiritStone - breakthroughStoneCost < cost.spiritStone) {
            // Cannot breakthrough: insufficient stones - skip
          } else {
            breakthroughStoneCost += cost.spiritStone
            const failureRate = calcBreakthroughFailureRate(updatedChar)
            const btResult = performBreakthrough(updatedChar, failureRate)
            // ... rest unchanged
          }
        }
```

删除行 891-901 的丹药相关代码（`hasPill`, `pillIndex`, `newVault.splice`）。

- [x] **Step 3: 运行测试**

Run: `npx vitest run src/__tests__/stores.test.ts --reporter=verbose`
Expected: breakthrough tests fail (they expect pill consumption) — this is expected, fixed in Task 6

- [x] **Step 4: Commit**

```bash
git add src/stores/sectStore.ts
git commit -m "refactor(tickAll): use ItemStack in production, remove pill from breakthrough"
```

---

### Task 4: 移除突破丹数据

**Files:**
- Modify: `src/data/realms.ts:82-90` (BREAKTHROUGH_COSTS)
- Modify: `src/data/recipes.ts:12-23` (AUTO_RECIPES)
- Modify: `src/systems/economy/AlchemySystem.ts:35-38` (ALCHEMY_RECIPES)
- Modify: `src/data/realms.ts` REALMS 数组中的 `breakthroughExtra` 文字

- [x] **Step 1: 更新 `BREAKTHROUGH_COSTS`**

修改 `src/data/realms.ts` 行 82-90:

```typescript
export const BREAKTHROUGH_COSTS: Record<number, { spiritStone: number }> = {
  1: { spiritStone: 3000 },       // 炼气->筑基
  2: { spiritStone: 15000 },      // 筑基->金丹
  3: { spiritStone: 80000 },      // 金丹->元婴
  4: { spiritStone: 350000 },     // 元婴->化神
}
```

- [x] **Step 2: 从 `AUTO_RECIPES` 中移除突破丹配方**

从 `src/data/recipes.ts` 中删除以下 4 项：
- `foundation_pill` (行 15)
- `golden_core_pill` (行 16)
- `nascent_soul_pill` (行 17)
- `spirit_transformation_pill` (行 18)

- [x] **Step 3: 从 `ALCHEMY_RECIPES` 中移除突破丹**

从 `src/systems/economy/AlchemySystem.ts` 中删除 `breakthrough_pill` 配方（行 35-38）。

- [x] **Step 4: 更新 REALMS 中的 `breakthroughExtra` 文字**

修改 `src/data/realms.ts` 中各境界的 `breakthroughExtra`：
- 筑基期: `'筑基丹 x1'` → `'需消耗大量灵石'`
- 金丹期: `'金丹劫'` → `'金丹劫 + 灵石'`
- 元婴期: `'元婴劫'` → `'元婴劫 + 灵石'`
- 化神期: `'天劫（3阶段战斗）'` → `'天劫 + 灵石'`

- [x] **Step 5: 运行构建确认无编译错误**

Run: `npx tsc --noEmit`
Expected: 可能有引用 `cost.pillId` 的类型错误 — 这些在 Task 3 已经修复

- [x] **Step 6: Commit**

```bash
git add src/data/realms.ts src/data/recipes.ts src/systems/economy/AlchemySystem.ts
git commit -m "feat(balance): remove breakthrough pills, increase spirit stone costs"
```

---

### Task 5: 更新 SaveSystem 存档兼容

**Files:**
- Modify: `src/systems/save/SaveSystem.ts:69-75` (saveGame vault write)
- Modify: `src/systems/save/SaveSystem.ts:119` (loadGame vault read)

- [x] **Step 1: 更新 `saveGame` vault 写入 (行 69-75)**

vault 现在是 `ItemStack[]`，写入 IDB 时需要展开为可序列化格式。keyPath 改为用 `${index}` 或保持 `item.id` 但加入 quantity：

最简方案：保持 vault store 的 keyPath 为 `id`，存入整个 `ItemStack` 对象（IDB structured clone 支持）：

```typescript
// Write vault items
const vaultStore = tx.objectStore('vault')
for (const i of sect.vault) await vaultStore.put({ id: i.item.id, ...i })  // ensure id field
const vaultKeys = await vaultStore.getAllKeys()
const vaultItemIds = new Set(sect.vault.map(s => s.item.id))
for (const k of vaultKeys) {
  if (!vaultItemIds.has(k as string)) await vaultStore.delete(k)
}
```

- [x] **Step 2: 更新 `loadGame` vault 读取 (行 119)**

加入迁移逻辑：

```typescript
const rawVault = await db.getAll('vault')
const vault = migrateToItemStacks(rawVault)
```

- [x] **Step 3: 更新 `loadGame` 中 characters 的 backpack 迁移 (行 117)**

```typescript
const rawCharacters = await db.getAll('characters') as Sect['characters']
const characters = rawCharacters.map(c => ({
  ...c,
  backpack: migrateToItemStacks(c.backpack),
}))
```

- [x] **Step 4: 运行存档测试**

Run: `npx vitest run src/__tests__/SaveSystem.test.ts`
Expected: 存档测试可能需要适配新的 ItemStack 格式

- [x] **Step 5: Commit**

```bash
git add src/systems/save/SaveSystem.ts
git commit -m "feat(save): migrate save system to ItemStack format with backward compat"
```

---

### Task 6: 更新 adventureStore 物品引用

**Files:**
- Modify: `src/stores/adventureStore.ts:143-160` (countVaultItemsByRecipeId, removeVaultItemsByRecipeId)

- [x] **Step 1: 重写 `countVaultItemsByRecipeId`**

```typescript
function countVaultItemsByRecipeId(recipeId: string): number {
  const { sect } = useSectStore.getState()
  return sect.vault.reduce((sum, s) => {
    if (s.item.type === 'consumable' && (s.item as Consumable).recipeId === recipeId) {
      return sum + s.quantity
    }
    return sum
  }, 0)
}
```

- [x] **Step 2: 重写 `removeVaultItemsByRecipeId`**

不再使用 `removeVaultItem(idx)` 逐个删除，改为直接操作 vault：

```typescript
function removeVaultItemsByRecipeId(recipeId: string, count: number): number {
  const { sect } = useSectStore.getState()
  let remaining = count
  const newVault = [...sect.vault]
  for (let i = newVault.length - 1; i >= 0 && remaining > 0; i--) {
    const s = newVault[i]
    if (s.item.type === 'consumable' && (s.item as Consumable).recipeId === recipeId) {
      if (s.quantity <= remaining) {
        remaining -= s.quantity
        newVault.splice(i, 1)
      } else {
        newVault[i] = { ...s, quantity: s.quantity - remaining }
        remaining = 0
      }
    }
  }
  if (newVault.length !== sect.vault.length) {
    useSectStore.setState(s => ({ sect: { ...s.sect, vault: newVault } }))
  }
  return count - remaining
}
```

- [x] **Step 3: 更新 adventureStore 中其他 vault 物品引用**

搜索 `sect.vault` 在 adventureStore 中的所有使用，确保都通过 `.item` 访问物品属性。

- [x] **Step 4: Commit**

```bash
git add src/stores/adventureStore.ts
git commit -m "refactor(adventure): update vault operations for ItemStack"
```

---

### Task 7: 更新 UI 组件

**Files:**
- Modify: `src/pages/VaultPage.tsx` (vault + backpack 渲染)
- Modify: `src/pages/BuildingsPage.tsx` (内嵌 vault)
- Modify: `src/pages/CharactersPage.tsx` (背包渲染)

- [x] **Step 1: 更新 `VaultPage.tsx` vault 渲染**

在 VaultTab 中，vault 现在是 `ItemStack[]`。修改渲染：

```tsx
// vault.map 改为 stack.map，传递 stack.item 给 ItemCard
{vault.map((stack, idx) => (
  <div key={stack.item.id + '-' + idx} className={styles.itemWrapper}>
    <ItemCard item={stack.item} selected={selectedIndex === idx} onClick={...} />
    {stack.quantity > 1 && <span className={styles.quantityBadge}>x{stack.quantity}</span>}
  </div>
))}
```

详情面板中使用 `vault[selectedIndex].item` 代替 `vault[selectedIndex]` 获取物品属性。

- [x] **Step 2: 更新 `VaultPage.tsx` BackpackTab**

同样适配弟子背包从 `AnyItem[]` 到 `ItemStack[]`：

```tsx
{char.backpack.map((stack, idx) => (
  <div key={stack.item.id + '-' + idx}>
    <ItemCard item={stack.item} ... />
    {stack.quantity > 1 && <span>x{stack.quantity}</span>}
  </div>
))}
```

- [x] **Step 3: 更新 `BuildingsPage.tsx` 内嵌 VaultTab**

同样适配（行 630-648 附近的 vault 渲染）。

- [x] **Step 4: 更新 `CharactersPage.tsx` 背包渲染**

CharacterDetail 中背包渲染（行 349-393），适配 `char.backpack` 为 `ItemStack[]`。

- [x] **Step 5: 运行构建确认无错误**

Run: `npx vite build`
Expected: build succeeds

- [x] **Step 6: Commit**

```bash
git add src/pages/VaultPage.tsx src/pages/BuildingsPage.tsx src/pages/CharactersPage.tsx
git commit -m "feat(ui): display item quantity badges for stackable consumables"
```

---

### Task 8: 更新测试

**Files:**
- Modify: `src/__tests__/stores.test.ts`
- Modify: `src/__tests__/ProductionSystem.test.ts`
- Modify: `src/__tests__/types.test.ts`

- [x] **Step 1: 更新 `stores.test.ts` 中的 item transfer 测试**

主要修改点：
- `makeConsumable` helper 不变
- vault 初始化改为 `[{ item: makeConsumable(...), quantity: 1 }]`
- 断言 `vault[0]` 时改为 `vault[0].item`
- 突破测试（行 640-735）：移除丹药相关断言，只检查灵石消耗
- 生产测试（行 1356-1478）：vault item 改为 ItemStack 结构
- 冒险补给测试（行 1590-1746）：使用 ItemStack 格式

- [x] **Step 2: 更新 `types.test.ts`**

Sect 类型中 `vault` 字段改为 `ItemStack[]` 类型断言。

- [x] **Step 3: 运行全部测试**

Run: `npx vitest run`
Expected: all tests PASS

- [x] **Step 4: Commit**

```bash
git add src/__tests__/stores.test.ts src/__tests__/types.test.ts
git commit -m "test: update tests for ItemStack migration and pill removal"
```

---

### Task 9: 最终验证

- [x] **Step 1: 运行完整测试套件**

Run: `npx vitest run`
Expected: all tests PASS

- [x] **Step 2: 运行构建**

Run: `npx vite build`
Expected: build succeeds, no TypeScript errors

- [x] **Step 3: Commit (if any remaining fixes)**

```bash
git add -A
git commit -m "fix: final cleanup for stackable pills feature"
```
