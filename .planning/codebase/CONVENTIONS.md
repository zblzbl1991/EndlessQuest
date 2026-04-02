# Coding Conventions

**Analysis Date:** 2026-04-02

## Naming Patterns

**Files:**
- Components: PascalCase `.tsx` - `CharacterCard.tsx`, `PageHeader.tsx`, `RunBuildSummary.tsx`
- Systems/engines: PascalCase `.ts` - `CombatEngine.ts`, `CharacterEngine.ts`, `CultivationEngine.ts`
- Stores: camelCase `.ts` - `sectStore/index.ts`, `adventureStore.ts`, `gameStore.ts`
- Store slices: camelCase `Slice.ts` - `characterSlice.ts`, `tickSlice.ts`, `buildingSlice.ts`
- Types: camelCase `.ts` - `character.ts`, `item.ts`, `adventure.ts`
- Data tables: camelCase `.ts` - `realms.ts`, `techniquesTable.ts`, `buildings.ts`
- CSS Modules: PascalCase `.module.css` co-located with component - `CharacterCard.module.css`
- Test files: PascalCase `.test.ts` or `.test.tsx` - `CombatEngine.test.ts`, `SectPage.test.tsx`
- Utility files: camelCase `.ts` - `format.ts`

**Functions:**
- Exported functions: camelCase - `generateCharacter()`, `simulateCombat()`, `calcSectLevel()`
- Private/internal functions: camelCase - `applyVariance()`, `randomPick()`, `mergeSpecialtyLevels()`
- Component functions: PascalCase default export - `export default function SectPage()`
- Store action creators: camelCase prefixed with `create` - `createCharacterSlice`, `createTickSlice`
- Factory helpers in tests: camelCase prefixed with `make` - `makeUnit()`, `makeEquipment()`, `makeConsumable()`

**Variables:**
- Constants: UPPER_SNAKE_CASE for module-level constants - `QUALITY_STATS`, `SECT_LEVEL_TABLE`, `SURNAMES`
- Regular variables: camelCase - `spiritFieldLevel`, `heroRate`, `dungeonName`
- Private module counters: underscore prefix - `_idCounter`, `_runCounter`

**Types:**
- Interfaces: PascalCase - `Character`, `CombatUnit`, `AdventureReport`
- Type aliases: PascalCase - `CharacterQuality`, `CultivationPath`, `EventType`
- Union type members: camelCase strings - `'common' | 'spirit' | 'immortal'`
- Store type: PascalCase with `Store` suffix - `SectStore`, `AdventureStore`, `GameStore`

**CSS:**
- CSS custom properties: `--category-variant` - `--color-accent`, `--space-md`, `--radius-sm`
- CSS Module class names: camelCase - `.sectionTitle`, `.resourceCard`, `.heroSection`
- Component-local style maps: UPPER_SNAKE_CASE Records - `QUALITY_BORDER`, `QUALITY_NAMES`, `PATH_ICON_NAMES`

## Code Style

**Formatting:**
- Prettier with settings in `.prettierrc`
- Single quotes, no semicolons, 2-space indent, trailing comma ES5, 120 char print width
- Run: `npm run format`
- Check: `npm run format:check`

**Linting:**
- ESLint 9 with flat config in `eslint.config.js`
- `typescript-eslint` recommended + React Hooks plugin
- Key rules:
  - `@typescript-eslint/no-unused-vars`: warn, args starting with `_` ignored
  - `@typescript-eslint/no-explicit-any`: warn
  - `no-empty`: off
- Run: `npm run lint`
- Pre-commit: Husky + lint-staged runs eslint --fix + prettier --write on `src/**/*.{ts,tsx,css}`

**TypeScript:**
- Strict mode enabled in `tsconfig.json`
- `noUnusedLocals: true`, `noUnusedParameters: true`
- Target ES2020, module ESNext
- JSX: `react-jsx` (no need for React import in JSX files)
- Path alias: `@/*` maps to `src/*` (configured but rarely used; most imports use relative paths)
- Test files excluded from `tsconfig.json` via `"exclude": ["src/__tests__"]`

## Import Organization

**Order (observed pattern):**
1. React imports - `import { useMemo } from 'react'`
2. External packages - `import { create } from 'zustand'`, `import { Link } from 'react-router-dom'`
3. Type imports (using `import type`) - `import type { Character } from '../../types/character'`
4. Internal stores - `import { useSectStore } from '../stores/sectStore'`
5. Internal systems - `import { generateCharacter } from '../../systems/character/CharacterEngine'`
6. Internal data - `import { BUILDING_DEFS } from '../../data/buildings'`
7. Internal components - `import PageHeader from '../components/common/PageHeader'`
8. CSS Modules - `import styles from './SectPage.module.css'`

**Type import convention:**
- Use `import type { ... }` for type-only imports consistently
- Inline `import type` for single types from modules that also have values: `import type { Pet } from '../../systems/pet/PetSystem'`

**Path Aliases:**
- `@/*` maps to `src/*` in tsconfig but rarely used in practice
- Prefer relative paths: `'../../types/character'`, `'../stores/sectStore'`

## Error Handling

**Patterns:**
- Guard clauses returning `null`, `false`, or early returns for invalid states
- Store actions return result objects: `{ success: boolean; reason: string }` for UI-facing operations
- `boolean` return for simple success/failure: `addCharacter()` returns `Character | null`
- No try/catch in store/system code; errors propagate to the caller
- Top-level `ErrorBoundary` component wraps all routes in `App.tsx`
- Save loading wrapped in try/catch with `console.error` in `App.tsx`

**Result objects:**
```typescript
// Canonical pattern for operations that can fail with a user-visible reason
tryUpgradeBuilding(type: BuildingType): { success: boolean; reason: string }
canRecruit(quality: CharacterQuality): { allowed: boolean; reason: string }
exchangeResources(from, to, amount): { success: boolean; received?: number; reason?: string }
enhanceItem(characterId, backpackIndex): { success: boolean; newLevel: number; cost: { spiritStone: number; ore: number } }
```

**Validation pattern:**
- Check conditions sequentially, return early on failure
- Mutate state only after all validation passes
- Example in `src/stores/sectStore/characterSlice.ts` `addCharacter()`: check quality unlock, character cap, spirit stone cost, then deduct and create

## Logging

**Framework:** Custom event log store (`src/stores/eventLogStore.ts`)

**Patterns:**
- `emitEvent(type, message, data?)` for game events - standalone function usable outside React
- Event types: `breakthrough_success`, `recruit`, `adventure_start`, `milestone`, etc.
- Events stored in `useEventLogStore` with cap of 200 entries (newest first)
- Events also persisted to history via `addHistoryEntry()` in `src/systems/save/HistoryStore.ts`
- `console.error` for infrastructure errors (save load failures)

## Comments

**When to Comment:**
- Section separators using `// ---...--- Section Name ---...---` pattern
- JSDoc `/** */` for exported public API functions describing purpose and behavior
- Inline comments explaining "why" for non-obvious game mechanics calculations
- TODO/FIXME not actively used; issues tracked in specs

**JSDoc/TSDoc:**
- Used on exported functions that serve as public API for systems
- Example in `src/systems/character/CharacterEngine.ts`:
  ```typescript
  /** Return the cultivation stats associated with a given character quality. */
  export function getQualityStats(quality: CharacterQuality)
  
  /** Generate a new character with the given quality. */
  export function generateCharacter(quality: CharacterQuality, activeRoute?: SectRouteId | null): Character
  ```
- Type-only imports consistently annotated with `import type`

## Function Design

**Size:** Functions range from small pure helpers to large store methods. System functions tend to be focused and pure; store slices contain the longest functions (`tickAll` is the largest).

**Parameters:**
- Destructured parameters for React components: `{ character, onClick }`
- Positional parameters for system functions: `generateCharacter(quality, activeRoute)`
- Optional parameters at the end with defaults: `startRun(dungeonId, characterIds, supplyLevel = 'basic', tacticalPreset = 'balanced')`
- Override objects use `Partial<T> & Required<Pick<T, ...>>` pattern for test helpers: `makeUnit(overrides: Partial<CombatUnit> & { id: string; name: string; team: 'ally' | 'enemy' })`

**Return Values:**
- Store mutations: return `void` or the created/affected entity
- Queries: return the value directly or `null`/`undefined` if not found
- Operations: return `boolean` for simple success, result object for detailed outcomes
- Combat/results: return structured objects with full data (`CombatResult`, `AdventureReport`)

## Module Design

**Exports:**
- Components: `export default function Name()` - one component per file
- Systems: named exports for each function - `export function simulateCombat()`
- Types: re-exported from barrel `src/types/index.ts`
- Stores: named hook export + type re-export - `export const useSectStore = ...` and `export type { SectStore }`
- Data: named exports for tables and lookup functions

**Barrel Files:**
- `src/types/index.ts` re-exports all types from sub-modules
- Store `index.ts` composes slices and exports the hook
- No barrel files for components or systems (direct imports)

**Store Slice Pattern (Zustand):**
- Each slice is a separate file in `src/stores/sectStore/` named `*Slice.ts`
- Type: `StateCreator<SectStore, [], [], Partial<SectStore>>`
- Slices are composed via spread in `src/stores/sectStore/index.ts`:
  ```typescript
  export const useSectStore = create<SectStore>()(
    (...a) => ({
      ...createInitialSlice(...a),
      ...createCharacterSlice(...a),
      ...createBuildingSlice(...a),
      // ... more slices
    }) as SectStore
  )
  ```
- All slices share the same `SectStore` type defined in `src/stores/sectStore/types.ts`
- Each store has a `reset()` action that restores initial state

**CSS Modules:**
- One `.module.css` file per component, co-located in the same directory
- Import as `styles` and reference via `styles.className`
- Theme variables from `src/styles/theme.css` used throughout
- Global styles in `src/styles/globals.css`

---

*Convention analysis: 2026-04-02*
