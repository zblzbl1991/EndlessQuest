# Type Safety

> Type safety patterns in this project.

---

## Overview

TypeScript strict mode is enabled with `noUnusedLocals` and `noUnusedParameters`. All types are centralized in `src/types/` with a barrel re-export. Type-only imports are used consistently throughout the codebase.

---

## Type Organization

### Directory structure

```
src/types/
├── index.ts          # Barrel re-exports (export type + export)
├── character.ts      # Character, CharacterQuality, CharacterStatus, etc.
├── sect.ts           # Sect, Resources, BuildingType, ArchiveMilestoneId, etc.
├── item.ts           # Item, Equipment, Consumable, AnyItem, etc.
├── adventure.ts      # DungeonRun, AdventureReport, etc.
├── skill.ts          # Element (wuxing), COUNTER_MAP, ELEMENT_NAMES, ActiveSkill
├── talent.ts         # Talent (legacy), TalentAffix, TalentAffixInstance, TalentAffixEffect
├── technique.ts      # Technique, TechniqueScroll
├── runBuild.ts       # RunBuild types
├── destiny.ts        # FateGridId, FateGridDef, FateGridEffects, FateGridCategory
└── randomEvent.ts    # RandomEventDef, RandomEventEffect, RandomEventResult, etc.
```

### Barrel re-export pattern

`src/types/index.ts` uses `export type` for type-only re-exports and `export` for runtime values:

```ts
export type { Character, CharacterQuality, CharacterStatus } from './character'
export type { Sect, Resources, BuildingType } from './sect'
export { ELEMENT_NAMES, COUNTER_MAP } from './skill'
export { SUPPLY_COSTS } from './adventure'
```

### Store types are separate

Store interfaces live alongside the store, not in `src/types/`:

```ts
// src/stores/sectStore/types.ts
export interface SectStore { ... }
```

---

## Type-Only Imports

Always use `import type` for type-only imports:

```ts
// Good — type-only import
import type { Character } from '../../types/character'

// Good — inline type import when mixing with values
import { generateCharacter, type CharacterQuality } from '../../systems/character/CharacterEngine'

// Bad — importing type as value
import { Character } from '../../types/character'
```

### Lazy type imports for circular dependency avoidance

```ts
// src/stores/sectStore/types.ts
addPet(pet: import('../../systems/pet/PetSystem').Pet): void
```

---

## Common Type Patterns

### Union types with string literals

Used extensively for domain enumerations:

```ts
export type CharacterQuality = 'common' | 'spirit' | 'immortal' | 'divine' | 'chaos'
export type CharacterStatus = 'idle' | 'adventuring' | 'patrolling' | 'resting' | 'injured' | 'training' | 'recovering'
export type EquipSlot = 'head' | 'armor' | 'bracer' | 'belt' | 'boots' | 'weapon' | 'accessory1' | 'accessory2' | 'talisman'
export type RealmStage = 0 | 1 | 2 | 3
```

### Discriminated union types

Item hierarchy uses a `type` discriminant:

```ts
export interface Item {
  id: string
  name: string
  quality: ItemQuality
  type: 'equipment' | 'consumable' | 'material' | 'techniqueScroll'
  // ...
}

export interface Equipment extends Item { type: 'equipment'; slot: EquipSlot; stats: ItemStats }
export interface Consumable extends Item { type: 'consumable'; effect: { type: string; value: number } }
export interface Material extends Item { type: 'material'; category: 'herb' | 'ore' | 'other' }
export interface TechniqueScroll extends Item { type: 'techniqueScroll'; techniqueId: string }

export type AnyItem = Equipment | Consumable | Material | TechniqueScroll
```

### Constant maps alongside types

Runtime maps are co-located with their type definitions:

```ts
export type Element = 'metal' | 'wood' | 'earth' | 'water' | 'fire' | 'neutral'

export const ELEMENT_NAMES: Record<Element, string> = {
  metal: '金', wood: '木', earth: '土', water: '水', fire: '火', neutral: '无'
}

export const COUNTER_MAP: Partial<Record<Element, Element>> = {
  metal: 'wood',    // 金克木
  wood: 'earth',    // 木克土
  earth: 'water',   // 土克水
  water: 'fire',    // 水克火
  fire: 'metal',    // 火克金
}
```

> **Warning**: Element was migrated from a 3-element system (fire/ice/lightning) to wuxing (5-element). When adding new content that references elements, use the wuxing set only. The old values (`ice`, `lightning`, `healing`) no longer exist in the type union.

### Override pattern for test factories

```ts
function makeUnit(overrides: Partial<CombatUnit> & { id: string; name: string; team: 'ally' | 'enemy' }): CombatUnit {
  return {
    maxHp: 100, hp: 100, atk: 15, def: 8, spd: 10,
    ...overrides,
  }
}
```

Uses `Partial<T> & Required<Pick<T, ...>>` to require essential fields while making others optional.

### Effect definition pattern for character traits

When defining character-level traits that affect multiple systems, use a flat effects interface with optional fields:

```ts
export interface FateGridEffects {
  cultivationSpeedModifier?: number
  attackModifier?: number
  breakthroughSuccessBonus?: number
  // ... each field is optional, meaning "no effect"
}

export interface FateGridDef {
  id: FateGridId
  name: string
  category: FateGridCategory
  rarity: FateGridRarity
  effects: FateGridEffects
}
```

Consumer systems use query functions that return `0` when the character has no trait:

```ts
export function getCultivationSpeedModifier(character: Character): number {
  if (!character.fateGrid) return 0
  return getFateGridDef(character.fateGrid).effects.cultivationSpeedModifier ?? 0
}
```

**Why**: Optional fields + query functions that default to `0` means every system can safely call the query without null checks, and new effects can be added to `FateGridEffects` without touching consumer code.

### Data table extension pattern

When extending a data table (e.g., techniques, talents, fate grids, skills), the type union and data entries must stay in sync:

1. **Extend union type** in `src/types/` — add new literal values
2. **Add data entries** in `src/data/` — match the interface exactly
3. **Update tests** — hardcoded counts, ID lists, and distribution assertions must all be updated

```ts
// 1. types/destiny.ts — extend union
export type FateGridId = 'existing1' | 'existing2' | ... | 'newId'

// 2. data/fateGrids.ts — add matching entry
export const FATE_GRIDS: Record<FateGridId, FateGridDef> = {
  // ... existing entries
  newId: {
    id: 'newId',
    name: '新命格名',
    category: 'cultivation',
    rarity: 'rare',
    description: '叙事描述',
    effects: { cultivationSpeedModifier: 0.15 },
  },
}
```

**Common mistake**: Adding data entries without extending the union type (or vice versa) causes typecheck errors. Always update both together.

---

## Validation

- **No runtime validation library** (no Zod, Yup, etc.)
- **Validation in store actions**: guard clauses check conditions and return early
- **Type guards**: `isEquipment(item)`, `isConsumable(item)` based on discriminant
- **Boundary validation**: only at system boundaries (user input in components, external data on load)
- **Internal code trusts types**: no redundant runtime checks between trusted modules

### Normalization on load

Save data is normalized on load to prevent corruption:

```ts
normalizeFiniteNumber(value)   // prevents NaN/Infinity
normalizeResources(resources)  // ensures all resource fields are valid numbers
```

### New field migration pattern for Character

When adding new fields to the `Character` interface, follow this checklist:

| Location | What to update |
|----------|---------------|
| `src/types/character.ts` | Add field to `Character` interface |
| `src/systems/character/CharacterEngine.ts` | Add default in `generateCharacter()` return |
| `src/systems/save/SaveSystem.ts` | Add `normalizeFiniteNumber((c as any).field, default)` in character load map |
| `src/stores/sectStore/testHelpers.ts` or test fixtures | Add to all `makeCharacter()` / `makeUnit()` factories |
| UI components displaying character data | Use `character.field ?? default` for safety |

Example (adding `level` and `xp`):

```ts
// types/character.ts
export interface Character {
  // ... existing fields
  level: number
  xp: number
}

// CharacterEngine.ts generateCharacter()
return {
  // ... existing fields
  level: 1,
  xp: 0,
}

// SaveSystem.ts loadGame() character map
level: normalizeFiniteNumber((c as any).level, 1),
xp: normalizeFiniteNumber((c as any).xp, 0),
```

**Key rule**: Always use `(c as any).field` for reading new fields from old saves, with a sensible default. `normalizeFiniteNumber` prevents NaN/Infinity corruption.

### Global type migration pattern (union value replacement)

When replacing values in a shared union type (e.g., changing `Element` from `ice|lightning|fire` to wuxing), the migration must touch ALL consumers in one coordinated pass:

**Checklist (in order):**
1. Update the type definition in `src/types/` (union + constants)
2. Update data tables using those values (`src/data/` files)
3. Update system functions with logic tied to old values (`src/systems/`)
4. Update all test fixtures and test assertions (`src/__tests__/`)
5. Update UI components that switch on old values
6. Run `npx tsc -b` — type errors reveal missed consumers
7. Run `npx vitest run` — test failures reveal hardcoded old values

**Gotcha**: Test files are excluded from `tsconfig.json` (`"exclude": ["src/__tests__"]`), so `tsc -b` will NOT catch type errors in test files. You must run `vitest` to find stale test values.

```ts
// Wrong — tsc won't catch this in test files
const c = { element: 'ice' }  // 'ice' no longer in Element union

// Correct — run vitest to find these
npx vitest run  // will fail on type mismatch at runtime
```

### Structured effect union types

For systems with diverse effect types (talent affixes, item bonuses), use a discriminated union with `type` field:

```ts
// types/talent.ts
export type TalentAffixEffect =
  | { type: 'flatStat'; stat: TalentStat; minValue: number; maxValue: number }
  | { type: 'elementDamage'; element: string; minValue: number; maxValue: number }
  | { type: 'modifier'; target: string; minValue: number; maxValue: number }

// Data: define templates with ranges
const affix = {
  effects: [{ type: 'flatStat', stat: 'atk', minValue: 2, maxValue: 5 }]
}

// Instance: resolved to fixed values at generation time
interface TalentAffixInstance {
  resolvedEffects: Array<{ type: string; value: number; stat?: string }>
}
```

**Why**: Template → Instance separation means data definitions have ranges for randomization, while runtime instances have fixed values. The `type` discriminant lets consumers pattern-match safely.

**Common mistake**: When iterating `TalentAffixEffect` union members, not all variants have `minValue`/`maxValue` at the top level (e.g., `conditional` has `effect.minValue`). Use `'minValue' in eff` guard or cast with `(eff as any).minValue` in migration code.

---

## Store Type Definition

The `SectStore` interface defines all state shape and action signatures in one file:

```ts
// src/stores/sectStore/types.ts
import type { Character, CharacterQuality, CharacterStatus } from '../../types/character'
import type { Sect, Resources, BuildingType, AnyItem } from '../../types'

export interface SectStore {
  // State
  sect: Sect
  shopState: ShopState

  // Character actions
  addCharacter(quality: CharacterQuality): Character | null
  removeCharacter(id: string): boolean

  // Resource actions
  spendResource(type: keyof Resources, amount: number): boolean
  addResource(type: keyof Resources, amount: number): void

  // ... all actions from all slices
}
```

---

## Forbidden Patterns

1. **`any` type** — Never use `any`. Use `unknown` if type is truly unknown, or define a proper type
2. **Type assertions (`as`)** — Avoid except in test helpers with `as const`
3. **Non-null assertions (`!`)** — Avoid; use proper null checks or optional chaining
4. **`@ts-ignore` / `@ts-expect-error`** — Not used; fix the type instead
5. **Runtime type checks in internal code** — Trust TypeScript; only validate at boundaries
6. **Enums** — Use string literal union types instead (e.g., `'common' | 'spirit'`)
7. **Namespace imports** — Not used; use ES module imports

---

## tsconfig Strictness

```json
{
  "strict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noFallthroughCasesInSwitch": true,
  "target": "ES2020",
  "module": "ESNext",
  "jsx": "react-jsx"
}
```

Type checking command: `npx tsc -b`
