# P1: 弟子特长与建筑指派 + 宗门赋税 + 闭关系统 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a specialty system where disciples can be assigned to buildings for production bonuses, implement passive spirit stone tax from the main hall, and add a seclusion mechanic that trades spirit stones for faster cultivation.

**Architecture:** New `SpecialtySystem.ts` generates specialties and calculates building bonuses. New fields on `Character` type for specialties and building assignment. Tax calculation added to `ResourceEngine`. Seclusion status handled in `sectStore tickAll()`. All three are independent features that share `tickAll` modifications.

**Tech Stack:** TypeScript, Vitest, Zustand

**Spec:** `docs/superpowers/specs/2026-03-27-gameplay-enrichment.md` (sections P1-1, P1-2, P1-3)

---

### Task 1: Character 类型扩展

**Files:**
- Modify: `src/types/character.ts`

- [ ] **Step 1: Add specialty types and new Character fields**

In `src/types/character.ts`, add after existing type definitions:

```typescript
export type SpecialtyType =
  | 'alchemy'
  | 'forging'
  | 'mining'
  | 'herbalism'
  | 'comprehension'
  | 'combat'
  | 'fortune'
  | 'leadership'

export interface Specialty {
  type: SpecialtyType
  level: 1 | 2 | 3
}
```

Update `CharacterStatus` to add `'secluded'`:

```typescript
export type CharacterStatus = 'idle' | 'cultivating' | 'adventuring' | 'patrolling' | 'injured' | 'resting' | 'training' | 'secluded'
```

Add new fields to `Character` interface:

```typescript
export interface Character {
  // ...existing fields
  specialties: Specialty[]
  assignedBuilding: string | null  // BuildingType | null
}
```

Use `string | null` instead of `BuildingType | null` to avoid circular import (BuildingType is defined in `types/sect.ts` which imports Character).

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: Errors in files that create `Character` objects — they now need the new fields. This is expected and will be fixed in subsequent tasks.

- [ ] **Step 3: Do NOT commit yet** — wait until Character creation sites are updated.

---

### Task 2: 存档迁移与新字段默认值

**Files:**
- Modify: `src/systems/save/SaveSystem.ts`
- Modify: `src/systems/character/CharacterEngine.ts`

- [ ] **Step 1: Add defaults to character generation**

In `src/systems/character/CharacterEngine.ts`, find `generateCharacter()` and add the new fields to the returned character object:

```typescript
// In the return statement of generateCharacter():
return {
  // ...existing fields
  specialties: [],          // Will be populated by rollSpecialties below
  assignedBuilding: null,
}
```

Add specialty rolling at the end of `generateCharacter()`, after talents are applied:

```typescript
import { rollSpecialties } from './SpecialtySystem'

// At end of generateCharacter, after talent application:
const specialties = rollSpecialties(quality)
return {
  // ...existing fields
  specialties,
  assignedBuilding: null,
}
```

- [ ] **Step 2: Add save migration for new fields**

In `src/systems/save/SaveSystem.ts`, find where characters are loaded from IndexedDB. After loading each character, add migration:

```typescript
// After loading character data from IDB:
if (!character.specialties) character.specialties = []
if (character.assignedBuilding === undefined) character.assignedBuilding = null
```

Search for where characters are deserialized — look for patterns like `character = raw` or character object construction from saved data.

- [ ] **Step 3: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors (all Character creation sites now have the new fields)

- [ ] **Step 4: Run existing tests**

Run: `npx vitest run --pool=forks --testTimeout=30000`
Expected: ALL PASS (tests that create Character objects should still work since we added defaults)

- [ ] **Step 5: Commit**

```bash
git add src/types/character.ts src/systems/character/CharacterEngine.ts src/systems/save/SaveSystem.ts
git commit -m "feat(character): add specialties, assignedBuilding, secluded status"
```

---

### Task 3: SpecialtySystem 特长生成与计算

**Files:**
- Create: `src/systems/character/SpecialtySystem.ts`
- Create: `src/data/specialties.ts`
- Test: `src/__tests__/SpecialtySystem.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/SpecialtySystem.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { rollSpecialties, getSpecialtyBonus, getBuildingBonus } from '../systems/character/SpecialtySystem'
import type { Specialty } from '../types/character'

describe('rollSpecialties', () => {
  it('common quality always returns empty array', () => {
    for (let i = 0; i < 100; i++) {
      const result = rollSpecialties('common')
      expect(result).toEqual([])
    }
  })

  it('spirit quality returns 0-1 specialties', () => {
    for (let i = 0; i < 100; i++) {
      const result = rollSpecialties('spirit')
      expect(result.length).toBeLessThanOrEqual(1)
      expect(result.length).toBeGreaterThanOrEqual(0)
    }
  })

  it('immortal quality always returns exactly 1 specialty', () => {
    for (let i = 0; i < 100; i++) {
      const result = rollSpecialties('immortal')
      expect(result.length).toBe(1)
      expect(result[0].type).toBeDefined()
      expect([1, 2, 3]).toContain(result[0].level)
    }
  })

  it('chaos quality returns 1-2 specialties', () => {
    for (let i = 0; i < 100; i++) {
      const result = rollSpecialties('chaos')
      expect(result.length).toBeGreaterThanOrEqual(1)
      expect(result.length).toBeLessThanOrEqual(2)
    }
  })

  it('specialty types are valid', () => {
    const validTypes = ['alchemy', 'forging', 'mining', 'herbalism', 'comprehension', 'combat', 'fortune', 'leadership']
    for (let i = 0; i < 200; i++) {
      const result = rollSpecialties('chaos')
      for (const s of result) {
        expect(validTypes).toContain(s.type)
      }
    }
  })
})

describe('getSpecialtyBonus', () => {
  it('returns correct bonus values for each level', () => {
    const spec: Specialty = { type: 'alchemy', level: 1 }
    expect(getSpecialtyBonus(spec.type, spec.level)).toBe(0.15)

    spec.level = 2
    expect(getSpecialtyBonus(spec.type, spec.level)).toBe(0.30)

    spec.level = 3
    expect(getSpecialtyBonus(spec.type, spec.level)).toBe(0.50)
  })

  it('returns different values for different specialty types', () => {
    const alchemy = getSpecialtyBonus('alchemy', 1)
    const combat = getSpecialtyBonus('combat', 1)
    expect(alchemy).not.toBe(combat)
  })
})

describe('getBuildingBonus', () => {
  it('returns 1.0 when no specialties match', () => {
    const specialties: Specialty[] = [
      { type: 'combat', level: 2 },
      { type: 'fortune', level: 1 },
    ]
    expect(getBuildingBonus('alchemyFurnace', specialties)).toBeCloseTo(1.0)
  })

  it('returns bonus when matching specialty exists', () => {
    const specialties: Specialty[] = [
      { type: 'alchemy', level: 2 },
    ]
    const bonus = getBuildingBonus('alchemyFurnace', specialties)
    expect(bonus).toBeCloseTo(1.30) // 1 + 0.30
  })

  it('takes highest level when multiple same-type specialties', () => {
    const specialties: Specialty[] = [
      { type: 'alchemy', level: 1 },
      { type: 'alchemy', level: 3 },
    ]
    const bonus = getBuildingBonus('alchemyFurnace', specialties)
    expect(bonus).toBeCloseTo(1.50) // 1 + 0.50 (level 3 wins)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/SpecialtySystem.test.ts --pool=forks --testTimeout=30000`
Expected: FAIL — module not found

- [ ] **Step 3: Create specialty data**

Create `src/data/specialties.ts`:

```typescript
import type { SpecialtyType } from '../types/character'

/** Maps specialty type to its corresponding building type (null if passive) */
export const SPECIALTY_BUILDING_MAP: Record<SpecialtyType, string | null> = {
  alchemy: 'alchemyFurnace',
  forging: 'forge',
  mining: 'spiritMine',
  herbalism: 'spiritField',
  comprehension: 'scriptureHall',
  combat: null,
  fortune: null,
  leadership: null,
}

/** Bonus values per specialty type and level */
export const SPECIALTY_BONUS_TABLE: Record<SpecialtyType, Record<number, number>> = {
  alchemy: { 1: 0.15, 2: 0.30, 3: 0.50 },
  forging: { 1: 0.10, 2: 0.20, 3: 0.35 },
  mining: { 1: 0.10, 2: 0.20, 3: 0.35 },
  herbalism: { 1: 0.10, 2: 0.20, 3: 0.35 },
  comprehension: { 1: 0.15, 2: 0.30, 3: 0.50 },
  combat: { 1: 0.05, 2: 0.10, 3: 0.20 },
  fortune: { 1: 0.10, 2: 0.20, 3: 0.35 },
  leadership: { 1: 1, 2: 1, 3: 1.05 }, // team size +1 at all levels, +5% team stats at lv3
}

/** All possible specialty types */
export const ALL_SPECIALTY_TYPES: SpecialtyType[] = [
  'alchemy', 'forging', 'mining', 'herbalism',
  'comprehension', 'combat', 'fortune', 'leadership',
]
```

- [ ] **Step 4: Implement SpecialtySystem**

Create `src/systems/character/SpecialtySystem.ts`:

```typescript
import type { CharacterQuality, Specialty, SpecialtyType } from '../../types/character'
import { SPECIALTY_BONUS_TABLE, SPECIALTY_BUILDING_MAP, ALL_SPECIALTY_TYPES } from '../../data/specialties'

interface SpecialtyConfig {
  minCount: number
  maxCount: number
  probability: number  // chance to roll at least 1
  level2Chance: number
  level3Chance: number
}

const QUALITY_SPECIALTY_CONFIG: Record<CharacterQuality, SpecialtyConfig> = {
  common: { minCount: 0, maxCount: 0, probability: 0, level2Chance: 0, level3Chance: 0 },
  spirit: { minCount: 0, maxCount: 1, probability: 0.5, level2Chance: 0.20, level3Chance: 0 },
  immortal: { minCount: 1, maxCount: 1, probability: 1.0, level2Chance: 0.30, level3Chance: 0.05 },
  divine: { minCount: 1, maxCount: 2, probability: 1.0, level2Chance: 0.40, level3Chance: 0.10 },
  chaos: { minCount: 1, maxCount: 2, probability: 1.0, level2Chance: 0.50, level3Chance: 0.20 },
}

export function rollSpecialties(quality: CharacterQuality): Specialty[] {
  const config = QUALITY_SPECIALTY_CONFIG[quality]
  if (Math.random() > config.probability) return []

  const count = config.minCount + Math.floor(Math.random() * (config.maxCount - config.minCount + 1))
  const usedTypes = new Set<SpecialtyType>()
  const specialties: Specialty[] = []

  for (let i = 0; i < count; i++) {
    const available = ALL_SPECIALTY_TYPES.filter(t => !usedTypes.has(t))
    if (available.length === 0) break

    const type = available[Math.floor(Math.random() * available.length)]
    usedTypes.add(type)

    let level: 1 | 2 | 3 = 1
    if (Math.random() < config.level3Chance) {
      level = 3
    } else if (Math.random() < config.level2Chance) {
      level = 2
    }

    specialties.push({ type, level })
  }

  return specialties
}

export function getSpecialtyBonus(type: SpecialtyType, level: number): number {
  return SPECIALTY_BONUS_TABLE[type]?.[level] ?? 0
}

/**
 * Calculate the multiplier bonus for a building from a list of specialties.
 * Returns 1.0 + sum of matching bonuses. Same-type takes highest level.
 */
export function getBuildingBonus(buildingType: string, specialties: Specialty[]): number {
  let bonus = 0
  const bestPerType = new Map<SpecialtyType, number>()

  for (const spec of specialties) {
    const current = bestPerType.get(spec.type) ?? 0
    if (spec.level > current) {
      bestPerType.set(spec.type, spec.level)
    }
  }

  for (const [type, level] of bestPerType) {
    if (SPECIALTY_BUILDING_MAP[type] === buildingType) {
      bonus += getSpecialtyBonus(type, level)
    }
  }

  return 1 + bonus
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/__tests__/SpecialtySystem.test.ts --pool=forks --testTimeout=30000`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add src/data/specialties.ts src/systems/character/SpecialtySystem.ts src/__tests__/SpecialtySystem.test.ts
git commit -m "feat(specialty): implement specialty generation and building bonus calculation"
```

---

### Task 4: 建筑指派 Store Actions

**Files:**
- Modify: `src/stores/sectStore.ts`
- Test: `src/__tests__/stores.test.ts` (update existing tests)

- [ ] **Step 1: Add assignToBuilding and unassignFromBuilding actions**

In `src/stores/sectStore.ts`, add to the store interface and implementation:

```typescript
// In the store interface:
assignToBuilding: (characterId: string, buildingType: string) => void
unassignFromBuilding: (characterId: string) => void

// Implementation:
assignToBuilding: (characterId, buildingType) => {
  set((state) => {
    const character = state.sect.characters.find(c => c.id === characterId)
    if (!character) return state
    if (character.status !== 'idle' && character.status !== 'cultivating') return state

    // Check max 3 per building
    const assigned = state.sect.characters.filter(
      c => c.assignedBuilding === buildingType
    )
    if (assigned.length >= 3) return state

    character.status = 'training'
    character.assignedBuilding = buildingType
    return state
  })
},

unassignFromBuilding: (characterId) => {
  set((state) => {
    const character = state.sect.characters.find(c => c.id === characterId)
    if (!character) return state
    if (character.status !== 'training' || !character.assignedBuilding) return state

    character.assignedBuilding = null
    character.status = 'idle'
    return state
  })
},
```

- [ ] **Step 2: Update tickAll to skip training characters in cultivation loop**

In `tickAll`, the character processing loop should skip `training` status characters (they don't cultivate, don't advance injury timer):

Find the loop `for (const character of characters)` and add to the conditions that skip non-cultivating characters:

```typescript
// Characters that are not actively doing anything time-sensitive
if (character.status === 'training' || character.status === 'idle') {
  // idle characters auto-start cultivating (handled elsewhere)
  // training characters are assigned to buildings, do nothing
  continue
}
```

**Note:** Read the existing code carefully. The current logic may handle `idle` by setting it to `cultivating`. Ensure `training` is excluded from this auto-assignment.

- [ ] **Step 3: Run all tests**

Run: `npx vitest run --pool=forks --testTimeout=30000`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add src/stores/sectStore.ts
git commit -m "feat(specialty): add building assignment actions to sectStore"
```

---

### Task 5: 资源产出应用特长加成

**Files:**
- Modify: `src/stores/sectStore.ts` (tickAll resource calculation)

- [ ] **Step 1: Apply specialty bonuses to resource rates in tickAll**

In `tickAll`, after calculating `rates` from `calcResourceRates`, apply specialty multipliers from assigned disciples:

```typescript
import { getBuildingBonus } from '../systems/character/SpecialtySystem'

// After: const rates = calcResourceRates(buildingLevels, bonuses)

// Collect specialties from characters assigned to each building
const assignedSpecialties = (buildingType: string) => {
  return state.sect.characters
    .filter(c => c.assignedBuilding === buildingType)
    .flatMap(c => c.specialties)
}

const miningBonus = getBuildingBonus('spiritMine', assignedSpecialties('spiritMine'))
const fieldBonus = getBuildingBonus('spiritField', assignedSpecialties('spiritField'))

// Apply bonuses to rates
rates.spiritStone *= miningBonus
rates.ore *= miningBonus
rates.spiritEnergy *= fieldBonus
rates.herb *= fieldBonus
```

**Important:** The `state` reference may need to be the `get()` result. Read the existing tickAll code to understand how `state` / `set()` are used. The specialty lookup should read from the current state snapshot at the beginning of tickAll.

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run all tests**

Run: `npx vitest run --pool=forks --testTimeout=30000`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add src/stores/sectStore.ts
git commit -m "feat(specialty): apply specialty bonuses to resource production"
```

---

### Task 6: 宗门赋税

**Files:**
- Modify: `src/systems/economy/ResourceEngine.ts`
- Modify: `src/stores/sectStore.ts` (tickAll)

- [ ] **Step 1: Add tax calculation to ResourceEngine**

In `src/systems/economy/ResourceEngine.ts`, add a new function:

```typescript
/**
 * Calculate sect tax (spirit stone income from main hall).
 * Formula: sectLevel * discipleCount * 0.5 per second
 */
export function calcTaxRate(sectLevel: number, discipleCount: number): number {
  return sectLevel * discipleCount * 0.5
}
```

- [ ] **Step 2: Apply tax in tickAll**

In `src/stores/sectStore.ts` tickAll, after the resource rates calculation:

```typescript
import { calcTaxRate } from '../systems/economy/ResourceEngine'

// Calculate tax
const sectLevel = calcSectLevel(mainHallLevel)
const discipleCount = characters.length
const taxRate = calcTaxRate(sectLevel, discipleCount)
const taxProduced = taxRate * deltaSec
spiritStone += taxProduced
```

**Note:** `calcSectLevel` is already used in tickAll near the end. You may need to move the call earlier or use the value from the existing calculation. Read the code to find where `sectLevel` is already computed.

- [ ] **Step 3: Run all tests**

Run: `npx vitest run --pool=forks --testTimeout=30000`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add src/systems/economy/ResourceEngine.ts src/stores/sectStore.ts
git commit -m "feat(economy): add sect tax from main hall"
```

---

### Task 7: 闭关系统

**Files:**
- Modify: `src/stores/sectStore.ts`

- [ ] **Step 1: Add seclusion actions**

In `src/stores/sectStore.ts`, add to store interface and implementation:

```typescript
// In store interface:
startSeclusion: (characterId: string) => void
stopSeclusion: (characterId: string) => void

// Implementation:
startSeclusion: (characterId) => {
  set((state) => {
    const character = state.sect.characters.find(c => c.id === characterId)
    if (!character) return state
    if (character.status !== 'cultivating') return state

    // Max 3 secluded at once
    const secludedCount = state.sect.characters.filter(c => c.status === 'secluded').length
    if (secludedCount >= 3) return state

    character.status = 'secluded'
    return state
  })
},

stopSeclusion: (characterId) => {
  set((state) => {
    const character = state.sect.characters.find(c => c.id === characterId)
    if (!character || character.status !== 'secluded') return state

    character.status = 'cultivating'
    return state
  })
},
```

- [ ] **Step 2: Handle secluded characters in tickAll cultivation loop**

In the character processing loop of `tickAll`, add handling for `secluded` status alongside `cultivating`:

```typescript
if (character.status === 'secluded') {
  const stoneCost = 10 * (character.realm + 1) * deltaSec
  if (newResources.spiritStone >= stoneCost) {
    newResources.spiritStone -= stoneCost
    const effectiveSpirit = 2 * spiritRatio * deltaSec
    cultivationTick(character, effectiveSpirit * 2.5)
    // Auto-breakthrough check (same as cultivating)
    if (canBreakthrough(character)) {
      // ... same breakthrough logic as cultivating
    }
  } else {
    character.status = 'cultivating'
  }
}
```

**Important:** The seclusion character should also be counted in `cultivatingCount` for spirit energy consumption purposes since they use spirit stones instead. Actually, NO — seclusion doesn't consume spirit energy. So do NOT count secluded characters in the spirit consumption calculation. They only consume spirit stones.

Re-read the tickAll code to understand exactly where spirit consumption is calculated and make sure secluded characters are excluded from spirit energy consumption but still get cultivation ticks.

- [ ] **Step 3: Run all tests**

Run: `npx vitest run --pool=forks --testTimeout=30000`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add src/stores/sectStore.ts
git commit -m "feat(cultivation): add seclusion system (spirit stone → cultivation speed)"
```

---

### Task 8: UI 更新 — StatusBadge、CharactersPage 筛选、建筑指派

**Files:**
- Modify: `src/components/common/StatusBadge.tsx`
- Modify: `src/pages/CharactersPage.tsx`
- Modify: `src/pages/BuildingsPage.tsx`

- [ ] **Step 1: Update StatusBadge for new statuses**

In `src/components/common/StatusBadge.tsx`, add mappings for `secluded` and update `training`:

```typescript
// Update the status label mapping:
const STATUS_LABELS: Record<string, string> = {
  cultivating: '修炼中',
  adventuring: '冒险中',
  patrolling: '派遣中',
  idle: '空闲',
  injured: '受伤',
  resting: '休息中',
  training: '研习中',     // Changed from '修炼中'
  secluded: '闭关中',     // New
}
```

- [ ] **Step 2: Update CharactersPage filter tabs**

In `src/pages/CharactersPage.tsx`, update `FILTER_TABS`:

```typescript
const FILTER_TABS: { key: FilterTab; label: string; match: (s: CharacterStatus) => boolean }[] = [
  { key: 'all', label: '全部', match: () => true },
  { key: 'cultivating', label: '修炼中', match: (s) => s === 'cultivating' || s === 'secluded' },
  { key: 'adventuring', label: '冒险中', match: (s) => s === 'adventuring' || s === 'patrolling' },
  { key: 'resting', label: '休息', match: (s) => s === 'resting' || s === 'idle' || s === 'injured' },
]
```

Note: `training` (研习中) is now separate from cultivating. It falls under "全部" but not any specific filter tab. This is intentional — assigned disciples are visible in "全部" view.

- [ ] **Step 3: Add seclusion and assignment buttons to CharacterDetail**

In `src/pages/CharactersPage.tsx`, in the `CharacterDetail` component:

Add "闭关" button (visible when status is `cultivating`):
```tsx
{character.status === 'cultivating' && (
  <button className={styles.actionBtn} onClick={() => startSeclusion(character.id)}>
    闭关
  </button>
)}
{character.status === 'secluded' && (
  <button className={styles.actionBtn} onClick={() => stopSeclusion(character.id)}>
    停止闭关
  </button>
)}
{character.status === 'training' && character.assignedBuilding && (
  <button className={styles.actionBtn} onClick={() => unassignFromBuilding(character.id)}>
    撤回指派
  </button>
)}
```

Add store imports:
```typescript
const startSeclusion = useSectStore((s) => s.startSeclusion)
const stopSeclusion = useSectStore((s) => s.stopSeclusion)
const assignToBuilding = useSectStore((s) => s.assignToBuilding)
const unassignFromBuilding = useSectStore((s) => s.unassignFromBuilding)
```

- [ ] **Step 4: Add tax display to BuildingsPage**

In `src/pages/BuildingsPage.tsx`, in the mainHall building card, display tax income:

```tsx
{building.type === 'mainHall' && (
  <div className={styles.buildingEffect}>
    赋税收入: +{calcTaxRate(sectLevel, characters.length).toFixed(1)}/秒
  </div>
)}
```

Import `calcTaxRate` from `../../systems/economy/ResourceEngine`.

- [ ] **Step 5: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Run all tests**

Run: `npx vitest run --pool=forks --testTimeout=30000`
Expected: ALL PASS

- [ ] **Step 7: Run production build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 8: Commit**

```bash
git add src/components/common/StatusBadge.tsx src/pages/CharactersPage.tsx src/pages/BuildingsPage.tsx
git commit -m "feat(ui): add seclusion, assignment UI and update status labels"
```

---

### Task 9: 最终验证

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run --pool=forks --testTimeout=30000`
Expected: ALL PASS

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: Build succeeds
