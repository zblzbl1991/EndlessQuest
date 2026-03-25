# Economy & Building System Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up dead resources, fix formula bugs, give all 6 empty buildings real gameplay effects (buffs + feature unlocks), and visualize resource flows.

**Architecture:** Centralized `BuildingEffects` module calculates all building buffs. Each building provides percentage buffs at all levels and unlocks a feature panel at Lv3. New systems (Alchemy, Forge, Study, GroupTransmission) are self-contained engine modules integrated into BuildingsPage.

**Tech Stack:** React 19, TypeScript 5.9, Zustand 5, CSS Modules, Vite 8

**Spec:** `docs/superpowers/specs/2026-03-25-economy-building-design.md`

---

### Task 1: Clean up dead resources from types

**Files:**
- Modify: `src/types/sect.ts` (lines 9, 16-19)
- Test: `src/__tests__/ResourceEngine.test.ts`

- [ ] **Step 1: Update ResourceType and Resources**

Remove `fairyJade`, `scrollFragment`, `heavenlyTreasure`, `beastSoul` from `ResourceType` union and `Resources` interface in `src/types/sect.ts`:

```typescript
export type ResourceType = 'spiritStone' | 'spiritEnergy' | 'herb' | 'ore'

export interface Resources {
  spiritStone: number
  spiritEnergy: number
  herb: number
  ore: number
}
```

- [ ] **Step 2: Remove dead resources from adventure types**

In `src/types/adventure.ts`, update `RouteOption.reward` to remove `fairyJade`:

```typescript
reward: { spiritStone: number; herb: number; ore: number }
```

- [ ] **Step 3: Remove dead categories from Material type**

In `src/types/item.ts`, update `Material.category` to remove `beastSoul` and `scroll`:

```typescript
category: 'herb' | 'ore' | 'other'
```

- [ ] **Step 4: Run tests, expect failures**

Run: `npx vitest run --reporter=verbose 2>&1 | head -80`
Expected: Type errors in files referencing removed types

- [ ] **Step 5: Fix all compilation errors from removal**

Fix all references to removed resource types across the codebase:
- `src/stores/sectStore.ts` — remove from `createInitialState()` resources object
- `src/stores/adventureStore.ts` — remove from `emptyResources()`, reward accumulation in `selectRoute`
- `src/systems/roguelike/EventSystem.ts` — remove `fairyJade` from all `reward` objects
- `src/systems/roguelike/MapGenerator.ts` — remove `fairyJade` from all `reward` objects
- `src/systems/trade/TradeSystem.ts` — change `ShopItem.currency` type to `'spiritStone'`

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run --reporter=verbose`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: remove dead resource types (fairyJade, scrollFragment, heavenlyTreasure, beastSoul)"
```

---

### Task 2: Fix spirit energy formula inconsistency

**Files:**
- Modify: `src/systems/economy/ResourceEngine.ts` (lines 34-54, 61-64)
- Modify: `src/data/buildings.ts` (import path fix)
- Test: `src/__tests__/ResourceEngine.test.ts`

- [ ] **Step 1: Delete duplicate getSpiritFieldRate from ResourceEngine.ts**

Remove lines 55-65 from `src/systems/economy/ResourceEngine.ts` (the duplicate `getSpiritFieldRate` function).

- [ ] **Step 2: Fix calcResourceRates to use getSpiritFieldRate**

Replace the spirit energy calculation in `calcResourceRates` to use the authoritative formula from `buildings.ts`:

```typescript
import { getSpiritFieldRate } from '../../data/buildings'

export function calcResourceRates(
  buildingLevels: BuildingLevels,
  bonuses: ProductionBonuses = { techniqueMultiplier: 1, discipleMultiplier: 1 }
): ResourceRates {
  const sfLevel = buildingLevels.spiritField
  const totalMult = bonuses.techniqueMultiplier * bonuses.discipleMultiplier

  // Spirit energy: uses getSpiritFieldRate for accelerating growth
  const spiritEnergy = getSpiritFieldRate(sfLevel) * totalMult

  // Herb: 0.1 per spirit field level
  const herb = 0.1 * sfLevel * totalMult

  return { spiritEnergy, herb, ore: 0, spiritStone: 0 }
}
```

- [ ] **Step 3: Remove dead getBuildingMultiplier function**

Delete the `getBuildingMultiplier` helper from `ResourceEngine.ts` (no longer used).

- [ ] **Step 4: Update ResourceEngine.test.ts**

Add test that verifies `calcResourceRates` and `getSpiritFieldRate` produce the same spirit energy values:

```typescript
test('calcResourceRates spirit energy matches getSpiritFieldRate', () => {
  for (let level = 0; level <= 10; level++) {
    const rates = calcResourceRates({ spiritField: level, mainHall: 1 })
    expect(rates.spiritEnergy).toBe(getSpiritFieldRate(level))
  }
})
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run --reporter=verbose`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "fix: unify spirit energy formula between UI display and actual tick calculation"
```

---

### Task 3: Create BuildingEffects module

**Files:**
- Create: `src/systems/economy/BuildingEffects.ts`
- Test: `src/__tests__/BuildingEffects.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/BuildingEffects.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  getBuildingLevel,
  getMarketBuff,
  getAlchemyBuff,
  getForgeBuff,
  getScriptureBuff,
  getRecruitBuff,
  getTrainingBuff,
  getTrainingSpeedMult,
  getEnhanceSuccessBonus,
  getEnhanceCostReduction,
  getRecruitCostMult,
  getComprehensionSpeedMult,
  getPotionEffectMult,
  getForgeUnlockLevel,
  getAlchemyUnlockLevel,
  getStudyUnlockLevel,
  getTargetedRecruitUnlockLevel,
  getGroupTransmissionUnlockLevel,
  getMarketUnlockLevel,
} from '../systems/economy/BuildingEffects'

const buildings = (overrides: Record<string, number>) =>
  Object.entries(overrides).map(([type, level]) => ({ type: type as any, level, unlocked: level > 0 }))

describe('getBuildingLevel', () => {
  it('returns 0 for missing building', () => {
    expect(getBuildingLevel([], 'market')).toBe(0)
  })
  it('returns correct level', () => {
    const b = buildings({ market: 3, forge: 5 })
    expect(getBuildingLevel(b, 'market')).toBe(3)
    expect(getBuildingLevel(b, 'forge')).toBe(5)
  })
})

describe('market buffs', () => {
  it('refresh count = 1 + marketLevel', () => {
    expect(getMarketBuff(0).dailyRefreshCount).toBe(1)
    expect(getMarketBuff(3).dailyRefreshCount).toBe(4)
  })
  it('quality cap = marketLevel', () => {
    expect(getMarketBuff(0).qualityCapIndex).toBe(0)
    expect(getMarketBuff(5).qualityCapIndex).toBe(5)
  })
  it('unlock at level 3', () => {
    expect(getMarketUnlockLevel()).toBe(3)
  })
})

describe('alchemy buffs', () => {
  it('potion effect = 1 + 0.2 * level', () => {
    expect(getAlchemyBuff(0).potionEffectMult).toBe(1)
    expect(getAlchemyBuff(1).potionEffectMult).toBe(1.2)
    expect(getAlchemyBuff(5).potionEffectMult).toBe(2.0)
  })
  it('unlock at level 3', () => {
    expect(getAlchemyUnlockLevel()).toBe(3)
  })
})

describe('forge buffs', () => {
  it('success bonus = 0.1 * level', () => {
    expect(getForgeBuff(0).successBonus).toBe(0)
    expect(getForgeBuff(3).successBonus).toBe(0.3)
  })
  it('cost reduction = 0.1 * level capped at 0.7', () => {
    expect(getForgeBuff(3).costReduction).toBe(0.3)
    expect(getForgeBuff(8).costReduction).toBe(0.7)
  })
  it('unlock at level 3', () => {
    expect(getForgeUnlockLevel()).toBe(3)
  })
})

describe('scripture buffs', () => {
  it('comprehension speed = 1 + 0.15 * level', () => {
    expect(getScriptureBuff(0).comprehensionMult).toBe(1)
    expect(getScriptureBuff(2).comprehensionMult).toBe(1.3)
    expect(getScriptureBuff(8).comprehensionMult).toBe(2.2)
  })
  it('unlock at level 3', () => {
    expect(getStudyUnlockLevel()).toBe(3)
  })
})

describe('recruitment buffs', () => {
  it('cost mult = max(0.4, 1 - 0.1 * level)', () => {
    expect(getRecruitBuff(0).costMult).toBe(1)
    expect(getRecruitBuff(3).costMult).toBe(0.7)
    expect(getRecruitBuff(6).costMult).toBe(0.4)
  })
  it('unlock at level 3', () => {
    expect(getTargetedRecruitUnlockLevel()).toBe(3)
  })
})

describe('training buffs', () => {
  it('speed mult = 1 + 0.1 * level', () => {
    expect(getTrainingBuff(0).speedMult).toBe(1)
    expect(getTrainingBuff(3).speedMult).toBe(1.3)
  })
  it('unlock at level 3', () => {
    expect(getGroupTransmissionUnlockLevel()).toBe(3)
  })
})
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx vitest run src/__tests__/BuildingEffects.test.ts --reporter=verbose`
Expected: FAIL — module not found

- [ ] **Step 3: Write BuildingEffects.ts**

Create `src/systems/economy/BuildingEffects.ts`:

```typescript
import type { BuildingType } from '../../types/sect'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getBuildingLevel(buildings: { type: BuildingType; level: number }[], type: BuildingType): number {
  return buildings.find((b) => b.type === type)?.level ?? 0
}

// ---------------------------------------------------------------------------
// Market (坊市)
// ---------------------------------------------------------------------------

export interface MarketBuff {
  dailyRefreshCount: number // base 1 + marketLevel
  qualityCapIndex: number   // 0-8, maps to DAILY_QUALITY_BY_MARKET_LEVEL keys
}

export function getMarketBuff(marketLevel: number): MarketBuff {
  return {
    dailyRefreshCount: 1 + marketLevel,
    qualityCapIndex: marketLevel,
  }
}

export function getMarketUnlockLevel(): number {
  return 3
}

// ---------------------------------------------------------------------------
// Alchemy (丹炉)
// ---------------------------------------------------------------------------

export interface AlchemyBuff {
  potionEffectMult: number // 1 + 0.2 * level
}

export function getAlchemyBuff(alchemyLevel: number): AlchemyBuff {
  return {
    potionEffectMult: 1 + 0.2 * alchemyLevel,
  }
}

export function getAlchemyUnlockLevel(): number {
  return 3
}

// ---------------------------------------------------------------------------
// Forge (炼器坊)
// ---------------------------------------------------------------------------

export interface ForgeBuff {
  successBonus: number    // +0.1 per level (added to base success rate)
  costReduction: number   // -0.1 per level, capped at -0.7
}

export function getForgeBuff(forgeLevel: number): ForgeBuff {
  return {
    successBonus: 0.1 * forgeLevel,
    costReduction: Math.min(0.7, 0.1 * forgeLevel),
  }
}

export function getForgeUnlockLevel(): number {
  return 3
}

// ---------------------------------------------------------------------------
// Scripture Hall (藏经阁)
// ---------------------------------------------------------------------------

export interface ScriptureBuff {
  comprehensionMult: number // 1 + 0.15 * level
}

export function getScriptureBuff(scriptureLevel: number): ScriptureBuff {
  return {
    comprehensionMult: 1 + 0.15 * scriptureLevel,
  }
}

export function getStudyUnlockLevel(): number {
  return 3
}

// ---------------------------------------------------------------------------
// Recruitment Pavilion (聚仙台)
// ---------------------------------------------------------------------------

export interface RecruitBuff {
  costMult: number // max(0.4, 1 - 0.1 * level)
}

export function getRecruitBuff(recruitLevel: number): RecruitBuff {
  return {
    costMult: Math.max(0.4, 1 - 0.1 * recruitLevel),
  }
}

export function getTargetedRecruitUnlockLevel(): number {
  return 3
}

// ---------------------------------------------------------------------------
// Training Hall (传功殿)
// ---------------------------------------------------------------------------

export interface TrainingBuff {
  speedMult: number // 1 + 0.1 * level
}

export function getTrainingBuff(trainingLevel: number): TrainingBuff {
  return {
    speedMult: 1 + 0.1 * trainingLevel,
  }
}

export function getGroupTransmissionUnlockLevel(): number {
  return 3
}

// ---------------------------------------------------------------------------
// Convenience: applied multipliers for direct use in engines
// ---------------------------------------------------------------------------

export function getTrainingSpeedMult(buildings: { type: BuildingType; level: number }[]): number {
  return getTrainingBuff(getBuildingLevel(buildings, 'trainingHall')).speedMult
}

export function getEnhanceSuccessBonus(buildings: { type: BuildingType; level: number }[]): number {
  return getForgeBuff(getBuildingLevel(buildings, 'forge')).successBonus
}

export function getEnhanceCostReduction(buildings: { type: BuildingType; level: number }[]): number {
  return getForgeBuff(getBuildingLevel(buildings, 'forge')).costReduction
}

export function getRecruitCostMult(buildings: { type: BuildingType; level: number }[]): number {
  return getRecruitBuff(getBuildingLevel(buildings, 'recruitmentPavilion')).costMult
}

export function getComprehensionSpeedMult(buildings: { type: BuildingType; level: number }[]): number {
  return getScriptureBuff(getBuildingLevel(buildings, 'scriptureHall')).speedMult
}

export function getPotionEffectMult(buildings: { type: BuildingType; level: number }[]): number {
  return getAlchemyBuff(getBuildingLevel(buildings, 'alchemyFurnace')).potionEffectMult
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/__tests__/BuildingEffects.test.ts --reporter=verbose`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add BuildingEffects module with buff calculations for all 6 buildings"
```

---

### Task 4: Create AlchemySystem

**Files:**
- Create: `src/systems/economy/AlchemySystem.ts`
- Test: `src/__tests__/AlchemySystem.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/AlchemySystem.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { ALCHEMY_RECIPES, canCraft, craftPotion, getAvailableRecipes } from '../systems/economy/AlchemySystem'

describe('ALCHEMY_RECIPES', () => {
  it('has at least 3 recipes', () => {
    expect(ALCHEMY_RECIPES.length).toBeGreaterThanOrEqual(3)
  })
  it('each recipe has required fields', () => {
    for (const recipe of ALCHEMY_RECIPES) {
      expect(recipe.id).toBeTruthy()
      expect(recipe.name).toBeTruthy()
      expect(typeof recipe.minFurnaceLevel).toBe('number')
      expect(typeof recipe.cost.herb).toBe('number')
      expect(recipe.product.type).toBe('consumable')
    }
  })
})

describe('canCraft', () => {
  it('returns false if not enough herbs', () => {
    expect(canCraft(ALCHEMY_RECIPES[0], { herb: 0, spiritStone: 0 })).toBe(false)
  })
  it('returns false if furnace level too low', () => {
    const highRecipe = ALCHEMY_RECIPES.find(r => r.minFurnaceLevel > 1)!
    expect(canCraft(highRecipe, { herb: 999, spiritStone: 999 }, 0)).toBe(false)
  })
  it('returns true when requirements met', () => {
    const recipe = ALCHEMY_RECIPES[0]
    expect(canCraft(recipe, { herb: recipe.cost.herb + 1, spiritStone: (recipe.cost.spiritStone ?? 0) + 1 }, 1)).toBe(true)
  })
})

describe('craftPotion', () => {
  it('returns null if cannot craft', () => {
    expect(craftPotion(ALCHEMY_RECIPES[0], 0)).toBe(null)
  })
  it('returns a consumable item when crafted', () => {
    const result = craftPotion(ALCHEMY_RECIPES[0], 3)
    expect(result).not.toBeNull()
    expect(result!.type).toBe('consumable')
  })
})

describe('getAvailableRecipes', () => {
  it('filters by furnace level', () => {
    const all = getAvailableRecipes(10)
    const filtered = getAvailableRecipes(1)
    expect(filtered.length).toBeLessThanOrEqual(all.length)
    expect(filtered.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run tests, verify failure**

Run: `npx vitest run src/__tests__/AlchemySystem.test.ts --reporter=verbose`

- [ ] **Step 3: Write AlchemySystem.ts**

Create `src/systems/economy/AlchemySystem.ts`:

```typescript
import type { Consumable } from '../../types/item'

// ---------------------------------------------------------------------------
// Recipe definitions
// ---------------------------------------------------------------------------

export interface AlchemyRecipe {
  id: string
  name: string
  description: string
  minFurnaceLevel: number
  cost: { herb: number; spiritStone?: number }
  product: {
    name: string
    description: string
    quality: 'common' | 'spirit' | 'immortal'
    effect: { type: string; value: number }
    sellPrice: number
  }
}

export const ALCHEMY_RECIPES: AlchemyRecipe[] = [
  {
    id: 'hp_potion',
    name: '回血丹',
    description: '恢复20%最大生命',
    minFurnaceLevel: 1,
    cost: { herb: 5 },
    product: {
      name: '回血丹',
      description: '服用后恢复20%最大生命',
      quality: 'common',
      effect: { type: 'hp_percent', value: 20 },
      sellPrice: 10,
    },
  },
  {
    id: 'spirit_potion',
    name: '灵气丹',
    description: '恢复50灵气',
    minFurnaceLevel: 1,
    cost: { herb: 8 },
    product: {
      name: '灵气丹',
      description: '服用后恢复50灵气',
      quality: 'common',
      effect: { type: 'spirit', value: 50 },
      sellPrice: 15,
    },
  },
  {
    id: 'hp_potion_plus',
    name: '大回血丹',
    description: '恢复40%最大生命',
    minFurnaceLevel: 3,
    cost: { herb: 12, spiritStone: 50 },
    product: {
      name: '大回血丹',
      description: '服用后恢复40%最大生命',
      quality: 'spirit',
      effect: { type: 'hp_percent', value: 40 },
      sellPrice: 30,
    },
  },
  {
    id: 'spirit_potion_plus',
    name: '大灵气丹',
    description: '恢复150灵气',
    minFurnaceLevel: 3,
    cost: { herb: 15, spiritStone: 80 },
    product: {
      name: '大灵气丹',
      description: '服用后恢复150灵气',
      quality: 'spirit',
      effect: { type: 'spirit', value: 150 },
      sellPrice: 40,
    },
  },
  {
    id: 'breakthrough_pill',
    name: '突破丹',
    description: '突破成功率+20%',
    minFurnaceLevel: 5,
    cost: { herb: 25, spiritStone: 200 },
    product: {
      name: '突破丹',
      description: '突破时使用，成功率+20%',
      quality: 'immortal',
      effect: { type: 'breakthrough_bonus', value: 20 },
      sellPrice: 100,
    },
  },
]

let _idCounter = 0

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function canCraft(
  recipe: AlchemyRecipe,
  resources: { herb: number; spiritStone: number },
  furnaceLevel: number = 0,
): boolean {
  if (furnaceLevel < recipe.minFurnaceLevel) return false
  if (resources.herb < recipe.cost.herb) return false
  if (recipe.cost.spiritStone && resources.spiritStone < recipe.cost.spiritStone) return false
  return true
}

export function craftPotion(recipe: AlchemyRecipe, furnaceLevel: number = 0): Consumable | null {
  if (furnaceLevel < recipe.minFurnaceLevel) return null

  return {
    id: `potion_${recipe.id}_${Date.now()}_${++_idCounter}`,
    name: recipe.product.name,
    quality: recipe.product.quality,
    type: 'consumable',
    description: recipe.product.description,
    sellPrice: recipe.product.sellPrice,
    effect: recipe.product.effect,
  }
}

export function getAvailableRecipes(furnaceLevel: number): AlchemyRecipe[] {
  return ALCHEMY_RECIPES.filter((r) => r.minFurnaceLevel <= furnaceLevel)
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/__tests__/AlchemySystem.test.ts --reporter=verbose`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add AlchemySystem with potion recipes and crafting"
```

---

### Task 5: Create ForgeSystem

**Files:**
- Create: `src/systems/economy/ForgeSystem.ts`
- Test: `src/__tests__/ForgeSystem.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/ForgeSystem.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { FORGE_RECIPES, canForge, forgeEquipment, getAvailableForgeRecipes } from '../systems/economy/ForgeSystem'

describe('FORGE_RECIPES', () => {
  it('has at least 4 recipes (one per quality)', () => {
    expect(FORGE_RECIPES.length).toBeGreaterThanOrEqual(4)
  })
})

describe('canForge', () => {
  it('returns false if not enough ore', () => {
    const recipe = FORGE_RECIPES[0]
    expect(canForge(recipe, { ore: 0, spiritStone: 0 }, 0)).toBe(false)
  })
  it('returns false if forge level too low', () => {
    const highRecipe = FORGE_RECIPES.find(r => r.minForgeLevel > 1)!
    expect(canForge(highRecipe, { ore: 9999, spiritStone: 9999 }, 0)).toBe(false)
  })
  it('returns true when requirements met', () => {
    const recipe = FORGE_RECIPES[0]
    expect(canForge(recipe, { ore: recipe.cost.ore + 1, spiritStone: recipe.cost.spiritStone + 1 }, 3)).toBe(true)
  })
})

describe('forgeEquipment', () => {
  it('returns null if cannot forge', () => {
    expect(forgeEquipment(FORGE_RECIPES[0], 0, 0)).toBe(null)
  })
  it('returns an equipment item', () => {
    const result = forgeEquipment(FORGE_RECIPES[0], 3, 0)
    expect(result).not.toBeNull()
    expect(result!.type).toBe('equipment')
  })
})

describe('getAvailableForgeRecipes', () => {
  it('filters by forge level', () => {
    const all = getAvailableForgeRecipes(10)
    const filtered = getAvailableForgeRecipes(1)
    expect(filtered.length).toBeLessThanOrEqual(all.length)
  })
})
```

- [ ] **Step 2: Run tests, verify failure**

Run: `npx vitest run src/__tests__/ForgeSystem.test.ts --reporter=verbose`

- [ ] **Step 3: Write ForgeSystem.ts**

Create `src/systems/economy/ForgeSystem.ts`:

```typescript
import type { Equipment, ItemQuality, EquipSlot } from '../../types/item'
import { generateEquipment } from '../item/ItemGenerator'
import { getEnhanceRate } from '../../data/items'

// ---------------------------------------------------------------------------
// Recipe definitions
// ---------------------------------------------------------------------------

export interface ForgeRecipe {
  id: string
  name: string
  minForgeLevel: number
  quality: ItemQuality
  cost: { ore: number; spiritStone: number }
  successRate: number  // base success rate (0-1), modified by forge building buff
}

export const FORGE_RECIPES: ForgeRecipe[] = [
  {
    id: 'forge_common',
    name: '锻造凡品装备',
    minForgeLevel: 3,
    quality: 'common',
    cost: { ore: 20, spiritStone: 50 },
    successRate: 1.0,
  },
  {
    id: 'forge_spirit',
    name: '锻造灵品装备',
    minForgeLevel: 3,
    quality: 'spirit',
    cost: { ore: 80, spiritStone: 200 },
    successRate: 0.8,
  },
  {
    id: 'forge_immortal',
    name: '锻造仙品装备',
    minForgeLevel: 5,
    quality: 'immortal',
    cost: { ore: 300, spiritStone: 1000 },
    successRate: 0.5,
  },
  {
    id: 'forge_divine',
    name: '锻造神品装备',
    minForgeLevel: 7,
    quality: 'divine',
    cost: { ore: 1000, spiritStone: 5000 },
    successRate: 0.25,
  },
]

const FORGE_SLOTS: EquipSlot[] = [
  'head', 'armor', 'bracer', 'belt', 'boots',
  'weapon', 'accessory1', 'accessory2', 'talisman',
]

let _idCounter = 0

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function canForge(
  recipe: ForgeRecipe,
  resources: { ore: number; spiritStone: number },
  forgeLevel: number,
): boolean {
  if (forgeLevel < recipe.minForgeLevel) return false
  if (resources.ore < recipe.cost.ore) return false
  if (resources.spiritStone < recipe.cost.spiritStone) return false
  return true
}

export function forgeEquipment(
  recipe: ForgeRecipe,
  forgeLevel: number,
  forgeBuffSuccessBonus: number,  // from BuildingEffects.getForgeBuff
): Equipment | null {
  if (forgeLevel < recipe.minForgeLevel) return null

  const effectiveRate = Math.min(1, recipe.successRate + forgeBuffSuccessBonus)
  if (Math.random() > effectiveRate) return null

  const slot = FORGE_SLOTS[Math.floor(Math.random() * FORGE_SLOTS.length)]
  return generateEquipment(slot, recipe.quality)
}

export function getAvailableForgeRecipes(forgeLevel: number): ForgeRecipe[] {
  return FORGE_RECIPES.filter((r) => r.minForgeLevel <= forgeLevel)
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/__tests__/ForgeSystem.test.ts --reporter=verbose`

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add ForgeSystem with equipment crafting recipes"
```

---

### Task 6: Integrate building buffs into existing engines

**Files:**
- Modify: `src/stores/sectStore.ts` (tickAll, enhanceItem, addCharacter, learnTechnique)
- Modify: `src/systems/equipment/EquipmentEngine.ts` (attemptEnhance — accept optional buff params)
- Test: `src/__tests__/stores.test.ts` (existing integration tests)

- [ ] **Step 1: Add building buff imports to sectStore.ts**

Add at top of `src/stores/sectStore.ts`:

```typescript
import { getTrainingSpeedMult, getEnhanceSuccessBonus, getEnhanceCostReduction, getRecruitCostMult, getComprehensionSpeedMult } from '../systems/economy/BuildingEffects'
```

- [ ] **Step 2: Apply training speed buff in tickAll**

In `tickAll`, after calculating cultivation rate, apply training hall multiplier. The `cultivationTick` call passes `effectiveSpirit` but the rate is calculated inside `CultivationEngine.tick()`. We need to apply the buff to the gained cultivation:

Find the line where `cultivationGained` is used and multiply:

```typescript
const trainingMult = getTrainingSpeedMult(sect.buildings)
// ...
const result = cultivationTick(char, effectiveSpirit, deltaSec)
// Apply training hall speed multiplier
const gained = result.cultivationGained * trainingMult
```

- [ ] **Step 3: Apply comprehension speed buff in tickAll**

In the comprehension tick section, multiply the comprehension gained by scripture hall buff:

```typescript
const compMult = getComprehensionSpeedMult(sect.buildings)
// ...
updatedChar = {
  ...updatedChar,
  techniqueComprehension: Math.max(0, Math.min(100,
    updatedChar.techniqueComprehension + compResult.gained * compMult
  )),
}
```

- [ ] **Step 4: Apply forge buffs to enhanceItem**

In `enhanceItem`, apply forge building buffs to enhance success rate and cost:

```typescript
// Before calling attemptEnhance:
const { successBonus, costReduction } = getForgeBuff(
  getBuildingLevel(sect.buildings, 'forge')
)

// Modify enhance cost display to show reduction
// The actual attemptEnhance uses base rates; we override success:
const baseResult = attemptEnhance(item)
// Apply forge success bonus
const effectiveRate = Math.min(1, getEnhanceRate(baseResult.newLevel === item.enhanceLevel ? item.enhanceLevel + 1 : item.enhanceLevel) + successBonus)
// Note: attemptEnhance already rolls internally, so we need to re-roll with buff
```

Actually, the better approach is to pass buff parameters to `attemptEnhance`. Modify `EquipmentEngine.attemptEnhance` to accept optional `successBonus` and `costReduction`:

```typescript
// EquipmentEngine.ts
export function attemptEnhance(item: Equipment, successBonus = 0, costReduction = 0): EnhanceResult {
  // ...
  const rate = Math.min(1, getEnhanceRate(nextLevel) + successBonus)
  const cost = {
    spiritStone: Math.floor((nextLevel + 1) * qualityMult * 50 * (1 - costReduction)),
    ore: Math.floor((nextLevel + 1) * qualityMult * 5 * (1 - costReduction)),
  }
  const success = Math.random() < rate
  // ...
}
```

Then in sectStore's `enhanceItem`:

```typescript
const forgeBuff = getForgeBuff(getBuildingLevel(sect.buildings, 'forge'))
const result = attemptEnhance(item, forgeBuff.successBonus, forgeBuff.costReduction)
```

- [ ] **Step 5: Apply recruit cost reduction in addCharacter**

In `addCharacter`, multiply cost by recruitment pavilion buff:

```typescript
const baseCost = getRecruitCost(quality)
const costMult = getRecruitCostMult(sect.buildings)
const cost = Math.floor(baseCost * costMult)
```

- [ ] **Step 6: Run all tests**

Run: `npx vitest run --reporter=verbose`
Expected: All pass (existing tests should still pass since buffs default to 0/1)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: integrate building buffs into cultivation, enhance, recruit, and comprehension"
```

---

### Task 7: Update building data with effect descriptions

**Files:**
- Modify: `src/data/buildings.ts`

- [ ] **Step 1: Add effectText function to buildings.ts**

Add a function that returns the current effect text for a building based on its level:

```typescript
import { getMarketBuff, getAlchemyBuff, getForgeBuff, getScriptureBuff, getRecruitBuff, getTrainingBuff } from '../systems/economy/BuildingEffects'
import type { Building } from '../types/sect'

export function getBuildingEffectText(building: Building): string {
  if (!building.unlocked || building.level === 0) return ''

  switch (building.type) {
    case 'mainHall':
      return `宗门等级 ${Math.ceil(building.level / 2)}`
    case 'spiritField':
      return `灵气 +${getSpiritFieldRate(building.level)}/s · 灵草 +${(0.1 * building.level).toFixed(1)}/s`
    case 'market': {
      const buff = getMarketBuff(building.level)
      return `刷新 ${buff.dailyRefreshCount}次/日`
    }
    case 'alchemyFurnace': {
      const buff = getAlchemyBuff(building.level)
      return `丹药效果 +${Math.round((buff.potionEffectMult - 1) * 100)}%`
    }
    case 'forge': {
      const buff = getForgeBuff(building.level)
      return `强化成功率 +${Math.round(buff.successBonus * 100)}% · 消耗 -${Math.round(buff.costReduction * 100)}%`
    }
    case 'scriptureHall': {
      const buff = getScriptureBuff(building.level)
      return `领悟速度 +${Math.round((buff.comprehensionMult - 1) * 100)}%`
    }
    case 'recruitmentPavilion': {
      const buff = getRecruitBuff(building.level)
      return `招募费用 -${Math.round((1 - buff.costMult) * 100)}%`
    }
    case 'trainingHall': {
      const buff = getTrainingBuff(building.level)
      return `修炼速度 +${Math.round((buff.speedMult - 1) * 100)}%`
    }
    default:
      return ''
  }
}

export function getBuildingUnlockText(building: Building): string {
  if (building.unlocked) return ''
  switch (building.type) {
    case 'market':
      return building.level >= 3 ? '' : '解锁后将获得：商店刷新+1'
    case 'alchemyFurnace':
      return building.level >= 3 ? '' : '解锁后将获得：丹药效果+20%'
    case 'forge':
      return building.level >= 3 ? '' : '解锁后将获得：强化成功率+10%'
    case 'scriptureHall':
      return building.level >= 3 ? '' : '解锁后将获得：领悟速度+15%'
    case 'recruitmentPavilion':
      return building.level >= 3 ? '' : '解锁后将获得：招募费用-10%'
    case 'trainingHall':
      return building.level >= 3 ? '' : '解锁后将获得：修炼速度+10%'
    default:
      return ''
  }
}
```

- [ ] **Step 2: Run build to verify no errors**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add building effect text display helpers"
```

---

### Task 8: Update BuildingsPage UI with effect display and feature panels

**Files:**
- Modify: `src/pages/BuildingsPage.tsx`
- Modify: `src/pages/BuildingsPage.module.css`
- Create: `src/components/building/AlchemyPanel.tsx`
- Create: `src/components/building/ForgePanel.tsx`
- Create: `src/components/building/StudyPanel.tsx`

- [ ] **Step 1: Update BuildingsTab to show effect text**

In `BuildingsPage.tsx`, update the building card to show effect text using `getBuildingEffectText`:

Replace the existing `{spiritRate > 0 && ...}` block with:

```tsx
import { getBuildingEffectText, getBuildingUnlockText } from '../data/buildings'
// ...
{(() => {
  const effectText = getBuildingEffectText(building)
  return effectText && <div className={styles.buildingEffect}>{effectText}</div>
})()}
{!isUnlocked && (() => {
  const unlockText = getBuildingUnlockText(building)
  return unlockText && <div className={styles.buildingUnlockPreview}>{unlockText}</div>
})()}
```

- [ ] **Step 2: Create AlchemyPanel component**

Create `src/components/building/AlchemyPanel.tsx` — a panel that shows available alchemy recipes, lets the player craft potions using herbs. Requires `alchemyFurnace.level >= 3`. Each recipe card shows: name, cost (herb + optional spiritStone), effect, and a craft button. On craft, deduct resources and add consumable to vault.

- [ ] **Step 3: Create ForgePanel component**

Create `src/components/building/ForgePanel.tsx` — shows forge recipes filtered by forge level, lets player craft equipment using ore + spiritStone. Requires `forge.level >= 3`. Shows success rate, cost, and quality. On craft: deduct resources, roll success, add equipment to vault on success.

- [ ] **Step 4: Create StudyPanel component**

Create `src/components/building/StudyPanel.tsx` — shows a "参悟功法" button costing `100 * sectLevel` spiritStone. On click: generate random technique scroll matching highest character realm, add to vault. Requires `scriptureHall.level >= 3`.

- [ ] **Step 5: Add store actions for crafting and studying**

Add to `SectStore` interface and implementation:

```typescript
// In sectStore
craftPotion(recipeId: string): { success: boolean; reason: string }
forgeEquipment(recipeId: string): { success: boolean; reason: string; item?: Equipment }
studyTechnique(): { success: boolean; reason: string; item?: TechniqueScroll }
```

- [ ] **Step 6: Add new tabs to BuildingsPage**

Add conditional tabs for unlocked building features. When a building reaches Lv3+, show its feature tab:

```typescript
type TabKey = 'buildings' | 'recruit' | 'vault' | 'alchemy' | 'forge' | 'study'
```

Only show alchemy/forge/study tabs when the corresponding building is unlocked AND level >= 3.

- [ ] **Step 7: Add CSS for new panels**

Add styles in `BuildingsPage.module.css` for alchemy/forge/study panels, recipe cards, and craft buttons. Follow the existing ink-wash theme.

- [ ] **Step 8: Run build**

Run: `npx vite build`
Expected: No errors

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add alchemy, forge, and study panels to BuildingsPage"
```

---

### Task 9: Add group transmission and targeted recruitment

**Files:**
- Modify: `src/stores/sectStore.ts`
- Create: `src/components/building/TransmissionPanel.tsx`

- [ ] **Step 1: Add group transmission store action**

Add to sectStore:

```typescript
groupTransmission(): { success: boolean; reason: string; charactersUpdated: number }
```

Implementation:
- Cost: 50 spiritEnergy per cultivating character
- Effect: instant cultivation = 10% of next realm's requirement for each participant
- Cooldown: tracked in store state (lastTransmissionTime)
- Requires trainingHall.level >= 3

- [ ] **Step 2: Add targeted recruitment store action**

Modify `addCharacter` or add new action:

```typescript
targetedRecruit(minQuality: CharacterQuality): Character | null
```

Implementation:
- Cost: 2x normal recruit cost + 10 herb
- Guaranteed quality >= minQuality
- Requires recruitmentPavilion.level >= 3

- [ ] **Step 3: Create TransmissionPanel component**

Simple panel with "集体传功" button. Shows cost (50 spiritEnergy per disciple), effect, and cooldown timer.

- [ ] **Step 4: Add targeted recruit option to RecruitTab**

Add a "定向招募" section in RecruitTab when recruitmentPavilion.level >= 3. Shows quality selector and extra herb cost.

- [ ] **Step 5: Run build and tests**

Run: `npx vitest run && npx vite build`

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add group transmission and targeted recruitment"
```

---

### Task 10: Wire market building into shop

**Files:**
- Modify: `src/pages/BuildingsPage.tsx`
- Create: `src/components/building/MarketPanel.tsx`
- Modify: `src/stores/sectStore.ts`

- [ ] **Step 1: Add market state to store**

Add to SectStore:

```typescript
shopState: ShopState | null
initShop(marketLevel: number): void
refreshShop(): void
buyFromShop(shopItemIndex: number): { success: boolean; reason: string }
```

Implementation uses existing `TradeSystem.createShopState` and `generateDailyItems`. Track lastRefreshTime and dailyRefreshCount.

- [ ] **Step 2: Create MarketPanel component**

Shows fixed items + daily items. Daily items refresh based on marketLevel. Buy adds to vault.

- [ ] **Step 3: Add market tab to BuildingsPage**

Show when market.level >= 3.

- [ ] **Step 4: Run build**

Run: `npx vite build`

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: wire market building into shop system"
```

---

### Task 11: Update TopBar with full resource display

**Files:**
- Modify: `src/components/common/TopBar.tsx`
- Modify: `src/components/common/TopBar.module.css`

- [ ] **Step 1: Show all 4 resources in TopBar**

Update `TopBar.tsx` to display spiritStone, spiritEnergy, herb, and ore:

```tsx
<header className={styles.topBar}>
  <div className={styles.title}>{sect.name}</div>
  <div className={styles.resources}>
    <ResourceItem label="灵石" value={Math.floor(sect.resources.spiritStone)} />
    <ResourceItem label="灵气" value={Math.floor(sect.resources.spiritEnergy)} />
    <ResourceItem label="灵草" value={Math.floor(sect.resources.herb)} />
    <ResourceItem label="矿材" value={Math.floor(sect.resources.ore)} />
  </div>
</header>
```

- [ ] **Step 2: Update CSS for compact resource items**

Add styles for small resource badges. On mobile, show 2 resources max. On desktop, show all 4 in the sidebar.

- [ ] **Step 3: Run build**

Run: `npx vite build`

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: show all 4 resources in TopBar"
```

---

### Task 12: Update ResourceRate component with herb/ore rates

**Files:**
- Modify: `src/components/common/ResourceRate.tsx`
- Modify: `src/components/common/ResourceRate.module.css`

- [ ] **Step 1: Extend ResourceRate to show herb rate**

Add herb production rate display (from spirit field):

```tsx
const herbRate = sfLevel > 0 ? 0.1 * sfLevel : 0
```

- [ ] **Step 2: Add ore rate placeholder**

Show "(冒险获取)" for ore since it has no passive production.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: show herb/ore rates in ResourceRate component"
```

---

### Task 13: Update existing tests and add integration tests

**Files:**
- Modify: `src/__tests__/ResourceEngine.test.ts`
- Modify: `src/__tests__/BuildingSystem.test.ts`
- Modify: `src/__tests__/stores.test.ts`

- [ ] **Step 1: Update ResourceEngine tests**

Remove any tests referencing dead resources (fairyJade, etc.). Update tests that check `calcResourceRates` to use the new unified formula.

- [ ] **Step 2: Update stores.test.ts**

Remove tests referencing dead resources. Add tests for new store actions (craftPotion, forgeEquipment, studyTechnique, groupTransmission, targetedRecruit).

- [ ] **Step 3: Update BuildingSystem tests**

Add tests for building effect text generation.

- [ ] **Step 4: Run full test suite**

Run: `npx vitest run --reporter=verbose`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "test: update existing tests and add integration tests for new features"
```

---

### Task 14: Final build verification and cleanup

**Files:**
- Various

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run --reporter=verbose`
Expected: All pass

- [ ] **Step 2: Run build**

Run: `npx vite build`
Expected: No errors or warnings

- [ ] **Step 3: Remove any remaining references to dead resources**

Search for `fairyJade`, `scrollFragment`, `heavenlyTreasure`, `beastSoul` across the entire codebase:

Run: `grep -r "fairyJade\|scrollFragment\|heavenlyTreasure\|beastSoul" src/`
Expected: No results

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup and build verification"
```
