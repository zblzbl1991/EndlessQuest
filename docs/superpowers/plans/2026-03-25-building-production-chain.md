# 建筑生产链与经济循环重设计 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立建筑自动生产链和资源消耗闭环，让放置类玩法形成"采集→加工→消费→成长"的完整经济循环。

**Architecture:** 新增 ProductionSystem 处理自动生产队列逻辑，修改 ResourceEngine 加入仓库上限，修改 sectStore.tickAll 集成队列结算和突破消耗。数据层面新增 recipes.ts 配置表，修改 sect.ts 类型定义。

**Tech Stack:** React 19, TypeScript 5.9, Zustand 5, Vitest

**Spec:** `docs/superpowers/specs/2026-03-25-building-production-chain-design.md`

---

## File Structure Overview

| File | Action | Responsibility |
|---|---|---|
| `src/types/sect.ts` | Modify | 新增 ProductionQueue, ResourceCaps 接口；Building 新增 productionQueue 字段 |
| `src/data/recipes.ts` | **Create** | 自动生产配方静态配置表 |
| `src/data/buildings.ts` | Modify | 升级成本改为指数曲线；新增仓库上限函数 |
| `src/systems/building/ProductionSystem.ts` | **Create** | 自动生产队列核心引擎 |
| `src/systems/economy/ResourceEngine.ts` | Modify | 新增 calcResourceCaps()、clampResources() |
| `src/systems/economy/AlchemySystem.ts` | Modify | 不变（手动炼制保留，自动配方在 recipes.ts） |
| `src/systems/economy/ForgeSystem.ts` | Modify | 不变（同理） |
| `src/systems/cultivation/CultivationEngine.ts` | Modify | 修复 tick() 未传入 technique 的 bug |
| `src/systems/roguelike/EventSystem.ts` | Modify | 修复 itemRewards 永远为空的 bug |
| `src/stores/sectStore.ts` | Modify | tickAll 集成队列、突破消耗、坊市兑换、仓库上限、生产加成 |
| `src/stores/adventureStore.ts` | Modify | 探索补给消耗逻辑 |
| `src/pages/BuildingsPage.tsx` | Modify | 加工层 UI：进度条、配方选择 |
| `src/__tests__/ProductionSystem.test.ts` | **Create** | ProductionSystem 单元测试 |
| `src/__tests__/ResourceEngine.test.ts` | Modify | 仓库上限相关测试 |
| `src/__tests__/BuildingSystem.test.ts` | Modify | 指数成本曲线测试 |
| `src/__tests__/stores.test.ts` | Modify |突破消耗、坊市兑换、队列 tick 测试 |

---

### Task 1: 类型定义扩展

**Files:**
- Modify: `src/types/sect.ts`

- [ ] **Step 1: 新增 ProductionQueue 和 ResourceCaps 接口**

在 `src/types/sect.ts` 的 `Resources` 接口之后、`Building` 接口之前添加：

```typescript
/** 自动生产队列状态（仅加工层建筑使用） */
export interface ProductionQueue {
  recipeId: string | null  // 当前生产配方 ID，null 表示空闲
  progress: number         // 当前累积进度（秒）
}

/** 资源仓库上限（运行时计算，不持久化） */
export interface ResourceCaps {
  spiritEnergy: number
  herb: number
  ore: number
}
```

- [ ] **Step 2: Building 接口新增 productionQueue 字段**

在 `Building` 接口中添加 `productionQueue`：

```typescript
export interface Building {
  type: BuildingType
  level: number
  unlocked: boolean
  productionQueue: ProductionQueue
}
```

- [ ] **Step 3: 运行类型检查**

Run: `npx tsc --noEmit`
Expected: errors in files that create Building objects without productionQueue（预期错误，Task 2/3 会修复）

- [ ] **Step 4: Commit**

```bash
git add src/types/sect.ts
git commit -m "feat(types): add ProductionQueue and ResourceCaps interfaces"
```

---

### Task 2: 生产配方数据表

**Files:**
- Create: `src/data/recipes.ts`
- Create: `src/__tests__/recipes.test.ts`

- [ ] **Step 1: 定义 AutoRecipe 接口和配方数据**

创建 `src/data/recipes.ts`：

```typescript
export interface AutoRecipe {
  id: string
  name: string
  buildingType: 'alchemyFurnace' | 'forge'
  minLevel: number
  /** 每秒消耗的资源 */
  inputPerSec: Partial<{ spiritStone: number; herb: number; ore: number }>
  /** 总原料成本（用于显示和平衡校验） */
  totalCost: { spiritStone: number; herb: number; ore: number }
  /** 生产一个成品所需秒数 */
  productionTime: number
  /** 产出的物品类型标识（用于 lookup） */
  productType: string
}

export const AUTO_RECIPES: AutoRecipe[] = [
  // === 丹炉配方 ===
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
    id: 'foundation_pill',
    name: '筑基丹',
    buildingType: 'alchemyFurnace',
    minLevel: 3,
    inputPerSec: { herb: 0.5, spiritStone: 2 },
    totalCost: { spiritStone: 120, herb: 30, ore: 0 },
    productionTime: 60,
    productType: 'consumable',
  },
  {
    id: 'golden_core_pill',
    name: '金丹丹',
    buildingType: 'alchemyFurnace',
    minLevel: 5,
    inputPerSec: { herb: 0.5, spiritStone: 5 },
    totalCost: { spiritStone: 600, herb: 60, ore: 0 },
    productionTime: 120,
    productType: 'consumable',
  },
  {
    id: 'nascent_soul_pill',
    name: '元婴丹',
    buildingType: 'alchemyFurnace',
    minLevel: 7,
    inputPerSec: { herb: 1.0, spiritStone: 10 },
    totalCost: { spiritStone: 3000, herb: 300, ore: 0 },
    productionTime: 300,
    productType: 'consumable',
  },
  {
    id: 'spirit_transformation_pill',
    name: '化神丹',
    buildingType: 'alchemyFurnace',
    minLevel: 8,
    inputPerSec: { herb: 1.5, spiritStone: 20 },
    totalCost: { spiritStone: 10000, herb: 750, ore: 0 },
    productionTime: 500,
    productType: 'consumable',
  },
  // === 锻造坊配方 ===
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
    id: 'forge_spirit',
    name: '灵品装备',
    buildingType: 'forge',
    minLevel: 3,
    inputPerSec: { ore: 0.5, spiritStone: 2 },
    totalCost: { spiritStone: 120, herb: 0, ore: 30 },
    productionTime: 60,
    productType: 'equipment',
  },
  {
    id: 'forge_immortal',
    name: '仙品装备',
    buildingType: 'forge',
    minLevel: 5,
    inputPerSec: { ore: 1.0, spiritStone: 5 },
    totalCost: { spiritStone: 600, herb: 0, ore: 120 },
    productionTime: 120,
    productType: 'equipment',
  },
  {
    id: 'forge_divine',
    name: '神品装备',
    buildingType: 'forge',
    minLevel: 7,
    inputPerSec: { ore: 2.0, spiritStone: 15 },
    totalCost: { spiritStone: 4500, herb: 0, ore: 600 },
    productionTime: 300,
    productType: 'equipment',
  },
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
```

- [ ] **Step 2: 写配方数据测试**

创建 `src/__tests__/recipes.test.ts`：

```typescript
import { describe, it, expect } from 'vitest'
import { AUTO_RECIPES, getAutoRecipeById, getAutoRecipesForBuilding } from '../data/recipes'

describe('AUTO_RECIPES', () => {
  it('has at least 10 recipes', () => {
    expect(AUTO_RECIPES.length).toBeGreaterThanOrEqual(10)
  })

  it('each recipe has required fields', () => {
    for (const recipe of AUTO_RECIPES) {
      expect(recipe.id).toBeTruthy()
      expect(recipe.name).toBeTruthy()
      expect(['alchemyFurnace', 'forge']).toContain(recipe.buildingType)
      expect(recipe.minLevel).toBeGreaterThanOrEqual(1)
      expect(recipe.productionTime).toBeGreaterThan(0)
      expect(recipe.productType).toBeTruthy()
    }
  })

  it('input per second × production time matches total cost within tolerance', () => {
    for (const recipe of AUTO_RECIPES) {
      const herbPerSec = recipe.inputPerSec.herb ?? 0
      const stonePerSec = recipe.inputPerSec.spiritStone ?? 0
      const orePerSec = recipe.inputPerSec.ore ?? 0
      expect(herbPerSec * recipe.productionTime).toBeCloseTo(recipe.totalCost.herb, 0)
      expect(stonePerSec * recipe.productionTime).toBeCloseTo(recipe.totalCost.spiritStone, 0)
      expect(orePerSec * recipe.productionTime).toBeCloseTo(recipe.totalCost.ore, 0)
    }
  })
})

describe('getAutoRecipeById', () => {
  it('returns recipe by id', () => {
    const recipe = getAutoRecipeById('hp_potion')
    expect(recipe).toBeDefined()
    expect(recipe!.name).toBe('回血丹')
  })

  it('returns undefined for unknown id', () => {
    expect(getAutoRecipeById('nonexistent')).toBeUndefined()
  })
})

describe('getAutoRecipesForBuilding', () => {
  it('filters by building type and level', () => {
    const furnaceLv1 = getAutoRecipesForBuilding('alchemyFurnace', 1)
    expect(furnaceLv1.length).toBeGreaterThanOrEqual(2)
    expect(furnaceLv1.every(r => r.buildingType === 'alchemyFurnace' && r.minLevel <= 1)).toBe(true)
  })

  it('returns more recipes at higher levels', () => {
    const lv1 = getAutoRecipesForBuilding('alchemyFurnace', 1)
    const lv8 = getAutoRecipesForBuilding('alchemyFurnace', 8)
    expect(lv8.length).toBeGreaterThan(lv1.length)
  })
})
```

- [ ] **Step 3: 运行测试**

Run: `npx vitest run src/__tests__/recipes.test.ts`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add src/data/recipes.ts src/__tests__/recipes.test.ts
git commit -m "feat(data): add auto-production recipe table with tests"
```

---

### Task 3: 修复现有 Building 初始化和升级成本

**Files:**
- Modify: `src/stores/sectStore.ts` (createInitialState, upgradeBuilding)
- Modify: `src/data/buildings.ts` (upgradeCost, 新增 calcResourceCaps)
- Modify: `src/__tests__/BuildingSystem.test.ts`

- [ ] **Step 1: 修改 buildings.ts 升级成本为指数曲线**

在 `src/data/buildings.ts` 中：

1. 修改所有 `upgradeCost` 函数，从 `(lv) => ({ spiritStone: X * lv })` 改为 `(lv) => ({ spiritStone: Math.round(X * Math.pow(lv, 1.3)) })`

2. 新增 `calcResourceCaps` 函数：

```typescript
import type { ResourceCaps } from '../types/sect'

/**
 * 根据建筑等级计算资源仓库上限（运行时计算，不存储）
 */
export function calcResourceCaps(spiritFieldLevel: number, spiritMineLevel: number): ResourceCaps {
  return {
    spiritEnergy: 500 + spiritFieldLevel * 300,
    herb: 200 + spiritFieldLevel * 100,
    ore: 200 + spiritMineLevel * 100,
  }
}
```

- [ ] **Step 2: 修改 sectStore createInitialState 为每个 Building 加上 productionQueue**

在 `src/stores/sectStore.ts` 的 `createInitialState()` 中，所有 building 对象添加：

```typescript
productionQueue: { recipeId: null, progress: 0 }
```

- [ ] **Step 3: 运行现有 BuildingSystem 测试**

Run: `npx vitest run src/__tests__/BuildingSystem.test.ts`
Expected: 成本相关断言会 FAIL（因为成本公式改了）

- [ ] **Step 4: 更新 BuildingSystem 测试以匹配新成本公式**

修改 `src/__tests__/BuildingSystem.test.ts` 中涉及具体成本的断言：
- `expect(result.cost.spiritStone).toBe(100)` → `expect(result.cost.spiritStone).toBeCloseTo(100)`（level 1 不变）
- `expect(result.cost.spiritStone).toBe(160)` → `expect(result.cost.spiritStone).toBeCloseTo(Math.round(80 * Math.pow(2, 1.3)))`
- `expect(result.cost.spiritStone).toBe(0)` → 保持 0（level 0 不变）

- [ ] **Step 5: 运行测试**

Run: `npx vitest run src/__tests__/BuildingSystem.test.ts`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add src/data/buildings.ts src/stores/sectStore.ts src/__tests__/BuildingSystem.test.ts
git commit -m "feat(buildings): exponential upgrade cost + resource caps + productionQueue init"
```

---

### Task 4: ProductionSystem 核心引擎

**Files:**
- Create: `src/systems/building/ProductionSystem.ts`
- Create: `src/__tests__/ProductionSystem.test.ts`

- [ ] **Step 1: 写 ProductionSystem 失败测试**

创建 `src/__tests__/ProductionSystem.test.ts`：

```typescript
import { describe, it, expect } from 'vitest'
import {
  tickProductionQueue,
  calcOfflineProduction,
  canStartRecipe,
} from '../systems/building/ProductionSystem'
import type { ProductionQueue } from '../types/sect'
import type { Resources } from '../types/sect'

const resources = (h = 100, s = 1000, o = 100): Resources => ({
  spiritStone: s, spiritEnergy: 0, herb: h, ore: o,
})

describe('tickProductionQueue', () => {
  it('does nothing when recipeId is null', () => {
    const queue: ProductionQueue = { recipeId: null, progress: 0 }
    const result = tickProductionQueue(queue, resources(), 1, false)
    expect(result.progress).toBe(0)
    expect(result.consumed).toEqual({ spiritStone: 0, herb: 0, ore: 0 })
    expect(result.completed).toBe(false)
  })

  it('accumulates progress when resources available', () => {
    const queue: ProductionQueue = { recipeId: 'hp_potion', progress: 0 }
    const result = tickProductionQueue(queue, resources(100), 1, false)
    // hp_potion: herb 0.25/s, progress += 1s, total 20s needed
    expect(result.progress).toBe(1)
    expect(result.consumed.herb).toBeCloseTo(0.25)
    expect(result.completed).toBe(false)
  })

  it('pauses when resources insufficient', () => {
    const queue: ProductionQueue = { recipeId: 'hp_potion', progress: 0 }
    const result = tickProductionQueue(queue, resources(0), 1, false)
    expect(result.progress).toBe(0)
    expect(result.consumed.herb).toBe(0)
    expect(result.completed).toBe(false)
  })

  it('completes when progress reaches production time', () => {
    const queue: ProductionQueue = { recipeId: 'hp_potion', progress: 19 }
    const result = tickProductionQueue(queue, resources(100), 1, false)
    expect(result.completed).toBe(true)
    expect(result.progress).toBe(0) // reset after completion
  })

  it('pauses when vaultFull is true', () => {
    const queue: ProductionQueue = { recipeId: 'hp_potion', progress: 5 }
    const result = tickProductionQueue(queue, resources(100), 1, true)
    expect(result.progress).toBe(5) // no change
    expect(result.consumed.herb).toBe(0) // no consumption
    expect(result.completed).toBe(false)
  })

  it('respects deltaSec > 1', () => {
    const queue: ProductionQueue = { recipeId: 'hp_potion', progress: 0 }
    const result = tickProductionQueue(queue, resources(100), 5, false)
    // herb 0.25 * 5 = 1.25 consumed
    expect(result.consumed.herb).toBeCloseTo(1.25)
    expect(result.progress).toBe(5)
  })
})

describe('calcOfflineProduction', () => {
  it('estimates production count using net rate', () => {
    const queue: ProductionQueue = { recipeId: 'hp_potion', progress: 0 }
    // herb 0.25/s, 20s per item, 100 herb available, 600s offline
    const result = calcOfflineProduction(queue, resources(100), 600, 50)
    // max from herbs: 100/0.25=400s -> 400/20=20 items
    // max from time: 600/20=30 items
    // max from vault: 50
    expect(result.itemsProduced).toBe(20)
    expect(result.herbsConsumed).toBeCloseTo(100)
  })

  it('returns 0 when recipeId is null', () => {
    const queue: ProductionQueue = { recipeId: null, progress: 0 }
    const result = calcOfflineProduction(queue, resources(), 600, 50)
    expect(result.itemsProduced).toBe(0)
  })

  it('caps by vault slots', () => {
    const queue: ProductionQueue = { recipeId: 'hp_potion', progress: 0 }
    const result = calcOfflineProduction(queue, resources(1000), 600, 2)
    expect(result.itemsProduced).toBe(2)
  })
})

describe('canStartRecipe', () => {
  it('returns true when building level meets requirement', () => {
    expect(canStartRecipe('hp_potion', 1)).toBe(true)
  })

  it('returns false when building level too low', () => {
    expect(canStartRecipe('foundation_pill', 2)).toBe(false)
  })

  it('returns false for unknown recipe', () => {
    expect(canStartRecipe('nonexistent', 8)).toBe(false)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/__tests__/ProductionSystem.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: 实现 ProductionSystem**

创建 `src/systems/building/ProductionSystem.ts`：

```typescript
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

/**
 * 在线 tick：每秒调用一次，推进生产进度
 */
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

  // Check if resources are sufficient for this tick
  const herbCost = (recipe.inputPerSec.herb ?? 0) * deltaSec
  const stoneCost = (recipe.inputPerSec.spiritStone ?? 0) * deltaSec
  const oreCost = (recipe.inputPerSec.ore ?? 0) * deltaSec

  if (
    resources.herb < herbCost ||
    resources.spiritStone < stoneCost ||
    resources.ore < oreCost
  ) {
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
    consumed: {
      spiritStone: stoneCost,
      spiritEnergy: 0,
      herb: herbCost,
      ore: oreCost,
    },
    completed: false,
  }
}

/**
 * 离线估算：用净速率计算产出数量（不逐 tick 模拟）
 */
export function calcOfflineProduction(
  queue: ProductionQueue,
  resources: Resources,
  offlineSeconds: number,
  vaultFreeSlots: number
): OfflineResult {
  const empty: OfflineResult = { itemsProduced: 0, consumed: { spiritStone: 0, spiritEnergy: 0, herb: 0, ore: 0 } }

  if (!queue.recipeId) return empty

  const recipe = getAutoRecipeById(queue.recipeId)
  if (!recipe) return empty

  // Calculate max items producible from each constraint
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
    consumed: {
      spiritStone: items * stonePerItem,
      spiritEnergy: 0,
      herb: items * herbPerItem,
      ore: items * orePerItem,
    },
  }
}

/**
 * 检查建筑等级是否满足配方要求
 */
export function canStartRecipe(recipeId: string, buildingLevel: number): boolean {
  const recipe = getAutoRecipeById(recipeId)
  if (!recipe) return false
  return buildingLevel >= recipe.minLevel
}
```

- [ ] **Step 4: 运行测试**

Run: `npx vitest run src/__tests__/ProductionSystem.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/systems/building/ProductionSystem.ts src/__tests__/ProductionSystem.test.ts
git commit -m "feat(production): implement ProductionSystem with tick and offline calc"
```

---

### Task 5: ResourceEngine 仓库上限

**Files:**
- Modify: `src/systems/economy/ResourceEngine.ts`
- Modify: `src/__tests__/ResourceEngine.test.ts`

- [ ] **Step 1: 写仓库上限失败测试**

在 `src/__tests__/ResourceEngine.test.ts` 末尾添加：

```typescript
import { clampResources } from '../systems/economy/ResourceEngine'

describe('clampResources', () => {
  it('does not clamp when below caps', () => {
    const resources = { spiritStone: 100, spiritEnergy: 200, herb: 50, ore: 30 }
    const caps = { spiritEnergy: 500, herb: 200, ore: 200 }
    const result = clampResources(resources, caps)
    expect(result.spiritEnergy).toBe(200)
    expect(result.herb).toBe(50)
    expect(result.ore).toBe(30)
    expect(result.spiritStone).toBe(100) // no cap
  })

  it('clamps resources to caps', () => {
    const resources = { spiritStone: 9999, spiritEnergy: 800, herb: 300, ore: 250 }
    const caps = { spiritEnergy: 500, herb: 200, ore: 200 }
    const result = clampResources(resources, caps)
    expect(result.spiritEnergy).toBe(500)
    expect(result.herb).toBe(200)
    expect(result.ore).toBe(200)
    expect(result.spiritStone).toBe(9999) // no cap
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/__tests__/ResourceEngine.test.ts`
Expected: FAIL — clampResources not exported

- [ ] **Step 3: 实现 clampResources**

在 `src/systems/economy/ResourceEngine.ts` 中添加：

```typescript
import type { ResourceCaps } from '../../types/sect'

/**
 * 将资源截断到仓库上限（灵石不限制）
 */
export function clampResources(resources: Resources, caps: ResourceCaps): Resources {
  return {
    spiritStone: resources.spiritStone,
    spiritEnergy: Math.min(resources.spiritEnergy, caps.spiritEnergy),
    herb: Math.min(resources.herb, caps.herb),
    ore: Math.min(resources.ore, caps.ore),
  }
}
```

- [ ] **Step 4: 运行测试**

Run: `npx vitest run src/__tests__/ResourceEngine.test.ts`
Expected: ALL PASS（包括新增和原有测试）

- [ ] **Step 5: Commit**

```bash
git add src/systems/economy/ResourceEngine.ts src/__tests__/ResourceEngine.test.ts
git commit -m "feat(economy): add clampResources for resource caps"
```

---

### Task 6: 修复 CultivationEngine technique bug

**Files:**
- Modify: `src/systems/cultivation/CultivationEngine.ts`
- Modify: `src/__tests__/CultivationEngine.test.ts`

- [ ] **Step 1: 写失败测试**

在 `src/__tests__/CultivationEngine.test.ts` 中添加测试，验证 technique 的 cultivationRate 加成被应用：

```typescript
import { calcCultivationRate } from '../systems/cultivation/CultivationEngine'
import type { Character, Technique } from '../types/sect'

// 需要检查现有测试中是否已有此断言

it('calcCultivationRate applies technique cultivationRate bonus', () => {
  const character: Character = {
    id: '1', name: 'test', quality: 'common', realm: 0, realmStage: 0,
    cultivation: 0, baseStats: { hp: 100, attack: 10, defense: 5, speed: 5 },
    inventory: [], equipment: {}, status: 'cultivating', injuryTimer: 0,
    techniqueId: null, comprehension: 0, _comprehensionTarget: null,
  }
  const technique: Technique = {
    id: 'test_tech', name: 'Test', description: '', maxComprehension: 100,
    cultivationRate: 1.5, // +50% bonus
    realms: [0, 1, 2], comprehensionBonus: 0, rarity: 'common',
  }
  const rate = calcCultivationRate(character, technique)
  const baseRate = calcCultivationRate(character, null)
  expect(rate).toBeCloseTo(baseRate * 1.5)
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/__tests__/CultivationEngine.test.ts`
Expected: FAIL（technique 参数未使用时两值相等）

- [ ] **Step 3: 修复 tick() 传入 technique**

在 `src/systems/cultivation/CultivationEngine.ts` 的 `tick()` 函数中，找到调用 `calcCultivationRate(character, null)` 的行，将 `null` 改为传入 technique 参数。需要同步修改 `tick` 函数签名以接收 technique。

- [ ] **Step 4: 运行测试**

Run: `npx vitest run src/__tests__/CultivationEngine.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/systems/cultivation/CultivationEngine.ts src/__tests__/CultivationEngine.test.ts
git commit -m "fix: pass technique to calcCultivationRate in tick()"
```

---

### Task 7: 修复 EventSystem 装备掉落 bug

**Files:**
- Modify: `src/systems/roguelike/EventSystem.ts`
- Modify: `src/__tests__/RoguelikeEngine.test.ts`（如涉及）

- [ ] **Step 1: 在 EventSystem 的 combat victory 和 boss victory 分支添加装备掉落**

在 `src/systems/roguelike/EventSystem.ts` 的 `resolveEvent()` 中：

1. Combat victory（普通战斗胜利）：按概率掉落凡品/灵品装备
2. Boss victory：按概率掉落灵品/仙品装备
3. 需要 import `generateEquipment` 和 `FORGE_SLOTS`

掉落逻辑：
```typescript
// combat victory - 15% chance to drop equipment
if (Math.random() < 0.15) {
  const quality = Math.random() < 0.7 ? 'common' : 'spirit'
  const slot = FORGE_SLOTS[Math.floor(Math.random() * FORGE_SLOTS.length)]
  itemRewards.push(generateEquipment(slot, quality))
}

// boss victory - 40% chance to drop equipment
if (Math.random() < 0.4) {
  const quality = Math.random() < 0.6 ? 'spirit' : 'immortal'
  const slot = FORGE_SLOTS[Math.floor(Math.random() * FORGE_SLOTS.length)]
  itemRewards.push(generateEquipment(slot, quality))
}
```

- [ ] **Step 2: 运行现有测试**

Run: `npx vitest run src/__tests__/RoguelikeEngine.test.ts`
Expected: PASS（原有测试不应被破坏，但掉落是随机的，测试需 mock 或接受概率）

- [ ] **Step 3: Commit**

```bash
git add src/systems/roguelike/EventSystem.ts
git commit -m "fix: add equipment drops to dungeon combat and boss victories"
```

---

### Task 8: sectStore.tickAll 集成生产队列和仓库上限

**Files:**
- Modify: `src/stores/sectStore.ts` (tickAll method)
- Modify: `src/__tests__/stores.test.ts`

这是最大的一步。需要：

1. 在 `tickAll` 开头计算 `resourceCaps`
2. 在 `tickAll` 中遍历加工层建筑（丹炉、锻造坊），调用 `tickProductionQueue`
3. 将生产消耗从 resources 扣除
4. 产出完成时，将成品添加到 vault
5. 最后用 `clampResources` 限制资源不超过上限
6. 修复 `ProductionBonuses` bug（从功法/弟子计算实际加成传入 `calcResourceRates`）

- [ ] **Step 1: 写失败测试**

在 `src/__tests__/stores.test.ts` 添加：

```typescript
describe('tickAll with production queue', () => {
  it('should auto-produce items when queue is active', async () => {
    const { useSectStore } = await import('../stores/sectStore')
    const store = useSectStore.getState()

    // Set up: unlock alchemyFurnace at level 1, set recipe, give herbs
    // ... (具体实现需要根据现有测试模式编写)
  })

  it('should pause production when resources insufficient', async () => {
    // ...
  })

  it('should clamp resources to caps', async () => {
    // ...
  })
})
```

- [ ] **Step 2: 修改 tickAll 方法**

在 `sectStore.ts` 的 `tickAll` 中：

```typescript
tickAll: (deltaSec: number) => {
  // ... existing setup code ...

  // 1. Calculate resource caps
  const caps = calcResourceCaps(sfLevel, smLevel)

  // 2. Tick production queues for processing buildings
  const processingTypes: BuildingType[] = ['alchemyFurnace', 'forge']
  let totalConsumed = { spiritStone: 0, spiritEnergy: 0, herb: 0, ore: 0 }

  for (const bType of processingTypes) {
    const building = sect.buildings.find(b => b.type === bType)
    if (!building || !building.unlocked || building.level === 0) continue
    if (!building.productionQueue.recipeId) continue

    const vaultFull = sect.vault.length >= sect.maxVaultSlots
    const result = tickProductionQueue(
      building.productionQueue,
      sect.resources,
      deltaSec,
      vaultFull
    )

    totalConsumed.spiritStone += result.consumed.spiritStone
    totalConsumed.herb += result.consumed.herb
    totalConsumed.ore += result.consumed.ore

    // Update progress
    building.productionQueue.progress = result.progress

    // If completed, produce item and add to vault
    if (result.completed) {
      const recipe = getAutoRecipeById(building.productionQueue.recipeId!)
      if (recipe && sect.vault.length < sect.maxVaultSlots) {
        const item = produceItemFromRecipe(recipe, building.level)
        if (item) {
          sect.vault.push(item)
        }
      }
    }
  }

  // 3. Calculate resource rates with ACTUAL bonuses (fix dead code)
  // ... existing rate calculation, but compute real bonuses ...

  // 4. Apply production minus queue consumption
  // ... existing resource update logic, then subtract totalConsumed * deltaSec ...

  // 5. Clamp resources
  sect.resources = clampResources(sect.resources, caps)

  // ... rest of existing tickAll ...
}
```

- [ ] **Step 3: 添加 produceItemFromRecipe 辅助函数**

在 `sectStore.ts` 或单独的 helper 中，根据配方 ID 和建筑等级生成对应物品。复用现有 `craftPotion`（AlchemySystem）和 `forgeEquipment`（ForgeSystem）的逻辑。

- [ ] **Step 4: 运行测试**

Run: `npx vitest run src/__tests__/stores.test.ts`
Expected: ALL PASS（新增 + 现有）

- [ ] **Step 5: Commit**

```bash
git add src/stores/sectStore.ts src/__tests__/stores.test.ts
git commit -m "feat(store): integrate production queue and resource caps into tickAll"
```

---

### Task 9: 境界突破消耗丹药 + 灵石

**Files:**
- Modify: `src/stores/sectStore.ts` (attemptBreakthrough)
- Modify: `src/__tests__/stores.test.ts`
- Modify: `src/data/realms.ts` (breakthroughExtra 解析)

- [ ] **Step 1: 定义突破消耗映射**

在 `src/data/realms.ts` 或新的常量中定义：

```typescript
export const BREAKTHROUGH_COSTS: Record<number, { pillId: string; spiritStone: number }> = {
  1: { pillId: 'foundation_pill', spiritStone: 500 },   // 练气→筑基
  2: { pillId: 'golden_core_pill', spiritStone: 2000 }, // 筑基→金丹
  3: { pillId: 'nascent_soul_pill', spiritStone: 8000 }, // 金丹→元婴
  4: { pillId: 'spirit_transformation_pill', spiritStone: 30000 }, // 元婴→化神
}
```

- [ ] **Step 2: 写失败测试**

```typescript
describe('attemptBreakthrough costs', () => {
  it('should consume pill and spiritStone when breaking through', async () => {
    // Setup: character at max cultivation, vault has pill, enough stones
    // Call attemptBreakthrough
    // Assert: pill removed from vault, spiritStone deducted
  })

  it('should fail without required pill', async () => {
    // Setup: character ready but no pill in vault
    // Call attemptBreakthrough
    // Assert: returns failure reason mentioning pill
  })
})
```

- [ ] **Step 3: 修改 attemptBreakthrough**

在 `sectStore.ts` 的 `attemptBreakthrough` 方法开头，检查并消耗突破丹 + 灵石：

```typescript
// Check breakthrough cost (for realm transitions that require pills)
const cost = BREAKTHROUGH_COSTS[targetRealmIndex]
if (cost) {
  const hasPill = sect.vault.some(item => item.type === 'consumable' && item.id === cost.pillId)
  if (!hasPill) return { success: false, reason: `缺少${getAutoRecipeById(cost.pillId)?.name}` }
  if (sect.resources.spiritStone < cost.spiritStone) return { success: false, reason: '灵石不足' }

  // Consume pill from vault
  const pillIndex = sect.vault.findIndex(item => item.type === 'consumable' && item.id === cost.pillId)
  sect.vault.splice(pillIndex, 1)
  sect.resources.spiritStone -= cost.spiritStone
}

// ... proceed with existing breakthrough logic (tribulation combat etc.) ...
```

注意：需要给 consumable items 确定合适的标识字段。现有 `Consumable` 接口通过 `effect.type` 区分，可能需要在配方数据中建立 pill ID 与 Consumable 的映射。

- [ ] **Step 4: 运行测试**

Run: `npx vitest run src/__tests__/stores.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/stores/sectStore.ts src/data/realms.ts src/__tests__/stores.test.ts
git commit -m "feat: breakthrough consumes pill + spiritStone"
```

---

### Task 10: 坊市资源兑换

**Files:**
- Modify: `src/stores/sectStore.ts` (新增 exchangeResources action)
- Modify: `src/__tests__/stores.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
describe('exchangeResources', () => {
  it('should exchange spiritStone to herb at 1:2 rate', async () => {
    // 100 spiritStone -> 200 herb
  })

  it('should exchange herb to spiritStone at 3:1 rate with loss', async () => {
    // 300 herb -> 100 spiritStone (loss formula applied)
  })

  it('should reject if insufficient source resource', async () => {
    // 50 herb trying to sell -> should fail (need 300 for 100 stone)
  })
})
```

- [ ] **Step 2: 实现 exchangeResources action**

```typescript
exchangeResources: (from: ResourceType, to: ResourceType, amount: number) => {
  const sect = get().sect
  const marketLevel = getBuildingLevel(sect, 'market')
  const lossRate = Math.max(0.3, 0.667 - 0.05 * marketLevel)

  // Calculate received amount
  let received: number
  if (from === 'spiritStone') {
    received = amount * 2 // 1:2 buy rate
  } else {
    received = Math.floor(amount * (1 - lossRate) / 3) // sell with loss
  }

  if (sect.resources[from as keyof Resources] < amount) {
    return { success: false, reason: '资源不足' }
  }

  const newResources = { ...sect.resources }
  ;(newResources as any)[from] -= amount
  ;(newResources as any)[to] += received

  set({ sect: { ...sect, resources: newResources } })
  return { success: true, received }
}
```

- [ ] **Step 3: 运行测试**

Run: `npx vitest run src/__tests__/stores.test.ts`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add src/stores/sectStore.ts src/__tests__/stores.test.ts
git commit -m "feat(market): add resource exchange with loss formula"
```

---

### Task 11: 探索补给消耗

**Files:**
- Modify: `src/stores/adventureStore.ts` (startRun)
- Modify: `src/__tests__/stores.test.ts` 或 adventureStore 测试

- [ ] **Step 1: 定义补给等级和消耗**

```typescript
const EXPEDITION_SUPPLIES = {
  basic: { spiritStone: 50, items: [] },
  enhanced: { spiritStone: 200, items: [{ id: 'hp_potion', count: 2 }] },
  luxury: { spiritStone: 500, items: [{ id: 'hp_potion', count: 5 }, { id: 'breakthrough_pill', count: 1 }] },
} as const
```

- [ ] **Step 2: 修改 startRun 加入补给检查和消耗**

在 `adventureStore.ts` 的 `startRun` 中，新增 `supplyLevel` 参数：
- 检查灵石 + vault 中是否有足够的丹药
- 消耗灵石 + 从 vault 移除丹药
- luxury 补给给予 1.5x 奖励倍率

- [ ] **Step 3: 运行测试**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add src/stores/adventureStore.ts
git commit -m "feat(adventure): add expedition supply system"
```

---

### Task 12: BuildingsPage 加工层 UI

**Files:**
- Modify: `src/pages/BuildingsPage.tsx`

- [ ] **Step 1: 在丹炉和锻造坊的建筑卡片中新增生产队列 UI**

对于加工层建筑（alchemyFurnace、forge），在现有升级按钮下方新增：

1. **当前生产状态**：
   - 空闲时显示"未设置生产配方"
   - 运行中显示：配方名称 + 进度条（progress / productionTime）
2. **配方选择按钮**：点击弹出已解锁配方列表（底部抽屉）
3. **手动炼制/锻造按钮**：保留现有功能

- [ ] **Step 2: 新增配方选择底部抽屉组件**

```tsx
// RecipeDrawer - 底部抽屉，显示已解锁配方列表
// 每个配方显示：名称、原料消耗/秒、生产时间
// 选中后调用 store 的 setProductionRecipe action
```

- [ ] **Step 3: 新增 sectStore action**

```typescript
setProductionRecipe: (buildingType: BuildingType, recipeId: string | null) => {
  // Validate recipe can be started at current building level
  // Set productionQueue.recipeId = recipeId, progress = 0
}
```

- [ ] **Step 4: 浏览器验证**

Run: `npm run dev`
手动验证：
- 点击丹炉卡片，看到"未设置生产配方"
- 点击配方选择，选择"回血丹"
- 看到进度条开始推进
- 灵草消耗中

- [ ] **Step 5: Commit**

```bash
git add src/pages/BuildingsPage.tsx src/stores/sectStore.ts
git commit -m "feat(ui): add production queue UI to processing buildings"
```

---

### Task 13: 离线生产结算

**Files:**
- Modify: `src/stores/sectStore.ts` (离线 catch-up 逻辑)
- Modify: `src/App.tsx`（如有离线结算入口）

- [ ] **Step 1: 在离线 catch-up 中集成 calcOfflineProduction**

在 `sectStore` 或 `App.tsx` 的离线结算路径中，对加工层建筑调用 `calcOfflineProduction`：

```typescript
// For each processing building:
const offlineResult = calcOfflineProduction(queue, resources, offlineSeconds, vaultFreeSlots)
// Deduct consumed resources
// Add produced items to vault
```

- [ ] **Step 2: 测试离线结算**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 3: Commit**

```bash
git add src/stores/sectStore.ts src/App.tsx
git commit -m "feat: integrate offline production estimation into catch-up logic"
```

---

### Task 14: 全量测试 + 类型检查

**Files:** 无新文件

- [ ] **Step 1: 运行全量测试**

Run: `npx vitest run`
Expected: ALL PASS（所有 18+ 测试文件）

- [ ] **Step 2: 运行类型检查**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: 运行构建**

Run: `npm run build`
Expected: Build 成功

- [ ] **Step 4: Commit (如有修复)**

```bash
git add -A
git commit -m "fix: resolve test/build issues from production chain integration"
```
