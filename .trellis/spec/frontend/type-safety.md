# Type Safety

> Type safety patterns in this project.

---

## Overview

TypeScript 5.9 in strict mode. All source code is TypeScript (`ts`/`tsx`). The type system is used extensively — union types for enums, interfaces for entities, `Record<K, V>` for maps. No runtime validation library (no Zod/Yup) — runtime validation is done via guard clauses and early returns.

---

## Type Organization

### Location

All shared types live in `src/types/`:

```
types/
├── character.ts      # Character, CharacterQuality, CharacterStatus, etc.
├── technique.ts      # Technique, TechniqueTier
├── skill.ts          # ActiveSkill, Element, SkillCategory
├── item.ts           # Item, Equipment, Consumable, AnyItem, ItemStack
├── sect.ts           # Sect, Building, Resources, ResourceType
├── adventure.ts      # DungeonRun, AdventureReport, Enemy, etc.
├── talent.ts         # Talent, TalentEffect
├── runBuild.ts       # AdventureRunConfig
└── index.ts          # Barrel re-export (ONLY barrel file in the project)
```

### Barrel Re-export

`src/types/index.ts` re-exports everything. This is the **only barrel file** — no other barrel files exist:

```tsx
export type { Character, CharacterQuality, CharacterStatus } from './character'
export type { Technique, TechniqueTier } from './technique'
export { TECHNIQUE_TIER_NAMES } from './technique'  // value exports alongside types
```

### Import Conventions

- Use `import type { ... }` for type-only imports
- Prefer relative paths over `@/*` alias
- Inline `import type` for single types mixed with value imports:

```tsx
import type { CharacterQuality } from '../../types/character'
import { getRealmName } from '../../data/realms'
```

---

## Common Patterns

### Union Types for Enums

Use string literal union types instead of TypeScript `enum`:

```tsx
export type CharacterQuality = 'common' | 'spirit' | 'immortal' | 'divine' | 'chaos'
export type CharacterStatus = 'idle' | 'adventuring' | 'patrolling' | 'resting' | 'injured' | 'training' | 'recovering'
export type CultivationPath = 'none' | 'sword' | 'body' | 'alchemy' | 'beast' | 'formation' | 'void'
export type BuildingType = 'mainHall' | 'spiritField' | 'library' | 'alchemyLab' | 'forge' | 'market'
export type RealmStage = 0 | 1 | 2 | 3
```

### Interfaces for Entities

Use `interface` for domain entities:

```tsx
export interface Character {
  id: string
  name: string
  title: CharacterTitle
  quality: CharacterQuality
  realm: number
  // ... 20+ fields
}
```

### Record for Mappings

Use `Record<K, V>` for style maps, label maps, and data lookups:

```tsx
const QUALITY_NAMES: Record<CharacterQuality, string> = {
  common: '凡',
  spirit: '灵',
  immortal: '仙',
  divine: '神',
  chaos: '混沌',
}
```

### Result Objects for Operations

Store actions and system functions return structured result objects:

```tsx
interface OpResult {
  success: boolean
  reason: string
}

// Or with additional data
interface EnhanceResult {
  success: boolean
  newLevel: number
  cost: { spiritStone: number; ore: number }
}
```

### Override Pattern for Test Helpers

Use `Partial<T> & Required<Pick<T, ...>>` for test factory overrides:

```tsx
function makeUnit(overrides: Partial<CombatUnit> & { id: string; name: string; team: 'ally' | 'enemy' }): CombatUnit {
  return {
    hp: 100,
    maxHp: 100,
    // ... defaults
    ...overrides,
  }
}
```

---

## Store Types

### SectStore Type

All slices share the `SectStore` interface defined in `src/stores/sectStore/types.ts`:

```tsx
export interface SectStore {
  sect: Sect
  shopState: ShopState | null

  // Character management
  addCharacter(quality: CharacterQuality): Character | null
  removeCharacter(id: string): void
  // ...

  reset(): void
}
```

### Slice Type

Each slice has this signature:

```tsx
StateCreator<SectStore, [], [], Partial<SectStore>>
```

---

## Runtime Validation

No validation library. Validation is done via:

1. **Guard clauses** — Check conditions, return early
2. **Type narrowing** — `if` checks on discriminated unions
3. **Boundary validation** — Only validate at system boundaries (user input, external data)
4. **No internal validation** — Trust internal code and framework guarantees

### Save Data Integrity

On load, data is normalized to prevent corruption:

```tsx
normalizeFiniteNumber(value)
normalizeResources(resources)
```

---

## Forbidden Patterns

1. **No `any`** — Use unknown or proper types
2. **No `enum`** — Use string literal union types
3. **No type assertions (`as`)** — Use type guards or narrow properly (except the one `as SectStore` in store composition)
4. **No non-null assertions (`!`)** — Use optional chaining or guard clauses
5. **No `@ts-ignore` / `@ts-expect-error`** — Fix the type error properly
6. **No barrel files** except `src/types/index.ts`

---

## tsconfig Settings

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

Tests are excluded from compilation: `"exclude": ["src/__tests__"]`
