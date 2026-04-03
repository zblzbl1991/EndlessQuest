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
├── sect.ts           # Sect, Resources, BuildingType, etc.
├── item.ts           # Item, Equipment, Consumable, AnyItem, etc.
├── adventure.ts      # DungeonRun, AdventureReport, etc.
├── skill.ts          # Skill, Element, active skill definitions
├── talent.ts         # Talent definitions
├── technique.ts      # Technique, TechniqueScroll
└── runBuild.ts       # RunBuild types
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
export type Element = 'fire' | 'ice' | 'lightning' | 'healing' | 'neutral'

export const ELEMENT_NAMES: Record<Element, string> = {
  fire: '火', ice: '冰', lightning: '雷', healing: '治愈', neutral: '无'
}
```

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
