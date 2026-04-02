# State Management

> How state is managed in this project.

---

## Overview

Zustand 5 is the sole state management solution. All mutable game state lives in Zustand stores. No Redux, no Context API for state, no React Query (no server). The architecture follows a **pure-function systems + mutable stores** pattern: systems compute results, stores apply them.

---

## State Categories

### Global State (Zustand Stores)

All game state is global and lives in 4 stores:

| Store | File | Purpose |
|-------|------|---------|
| `SectStore` | `src/stores/sectStore/` | Main game state — sect, characters, buildings, resources, pets, vault, tick |
| `AdventureStore` | `src/stores/adventureStore.ts` | Dungeon run lifecycle — active runs, report data |
| `GameStore` | `src/stores/gameStore.ts` | Session state — loaded flag, online time, game started |
| `EventLogStore` | `src/stores/eventLogStore.ts` | Event log (capped at 200 entries) |

### Local State (React useState)

Used only for ephemeral UI state within a single component:

- Modal visibility (`showModal: boolean`)
- Loading states (`isLoaded: boolean`)
- Form inputs (draft values before committing to store)

**Rule**: If state persists across page navigation or affects game logic, it belongs in a store.

### No Server State

Pure client-side SPA. All data in IndexedDB. No API calls, no caching layer, no React Query.

---

## SectStore Architecture (Main Store)

### Slice Pattern

SectStore is composed from 13 slices using Zustand's `StateCreator` pattern:

```tsx
// src/stores/sectStore/index.ts
export const useSectStore = create<SectStore>()(
  (...a) =>
    ({
      ...createInitialSlice(...a),
      ...createCharacterSlice(...a),
      ...createBuildingSlice(...a),
      ...createResourceSlice(...a),
      ...createItemSlice(...a),
      ...createTechniqueSlice(...a),
      ...createPetSlice(...a),
      ...createTickSlice(...a),
      ...createShopSlice(...a),
      ...createSectPathSlice(...a),
      ...createLegacySlice(...a),
      ...createMiscSlice(...a),
    }) as SectStore
)
```

### Slices

| Slice | File | Responsibilities |
|-------|------|-----------------|
| `initial` | `initial.ts` | Initial state factory |
| `character` | `characterSlice.ts` | Add/remove/promote characters |
| `building` | `buildingSlice.ts` | Upgrade buildings, assign characters |
| `resource` | `resourceSlice.ts` | Spend/add resources, exchange |
| `item` | `itemSlice.ts` | Vault ops, equip/unequip, enhance |
| `technique` | `techniqueSlice.ts` | Codex unlock, technique learning |
| `pet` | `petSlice.ts` | Pet management, assignment |
| `tick` | `tickSlice.ts` | Main game loop tick (1-second interval) |
| `shop` | `shopSlice.ts` | Shop init, buy, refresh |
| `sectPath` | `sectPathSlice.ts` | Sect path selection, node unlock |
| `legacy` | `legacySlice.ts` | Ascension logic |
| `misc` | `miscSlice.ts` | Automation settings, offline accumulator |

### Slice Type Signature

Each slice follows this type:

```tsx
import type { StateCreator } from 'zustand'
import type { SectStore } from './types'

export const createXxxSlice: StateCreator<SectStore, [], [], Partial<SectStore>> = (set, get) => ({
  // actions...
})
```

All slices share the same `SectStore` type defined in `src/stores/sectStore/types.ts`.

---

## When to Use Global State

State belongs in a store when:

1. **Multiple components** need the same data
2. **Game logic** depends on it (tick loop, systems)
3. **Persistence** is needed (auto-saved to IndexedDB)
4. **Cross-page** access is required

---

## Store Action Conventions

### Return Types

| Scenario | Return Type | Example |
|----------|-------------|---------|
| Simple success/failure | `boolean` | `upgradeBuilding(type): boolean` |
| Detailed outcome | `{ success: boolean; reason: string }` | `buyFromShop(index, isDaily)` |
| Created entity | `Entity \| null` | `addCharacter(quality): Character \| null` |
| Complex result | Structured object | `enhanceItem(...): { success: boolean; newLevel: number; cost: ... }` |
| No meaningful return | `void` | `setCharacterStatus(id, status)` |

### Mutation Pattern

Check conditions sequentially, return early on failure, mutate only after all validation passes:

```tsx
addCharacter: (quality) => {
  const { sect } = get()

  // 1. Guard: check quality unlock
  if (!isQualityUnlocked(quality, sect.level)) return null

  // 2. Guard: check character cap
  if (sect.characters.length >= getMaxCharacters(sect.level)) return null

  // 3. Guard: check cost
  if (sect.resources.spiritStone < cost) return null

  // 4. All checks passed — mutate state
  set((s) => ({
    sect: {
      ...s.sect,
      characters: [...s.sect.characters, character],
      resources: { ...s.sect.resources, spiritStone: s.sect.resources.spiritStone - cost },
    },
  }))

  return character
}
```

### Immutable Updates

Always spread when updating nested objects:

```tsx
set((s) => ({
  sect: {
    ...s.sect,
    characters: [...s.sect.characters, newChar],  // array spread
    resources: { ...s.sect.resources, spiritStone: newVal },  // object spread
  },
}))
```

---

## Persistence

### Auto-Save

Zustand subscription detects `sect` reference changes, debounces 500ms, writes to IndexedDB:

```tsx
// src/systems/save/startAutoSave.ts
const unsubscribe = useSectStore.subscribe(() => {
  // debounced write to IndexedDB
})
```

### Save Triggers

- Store mutation (debounced 500ms)
- `visibilitychange` (tab switch)
- `beforeunload` (page close)

### Each Store Has `reset()`

All stores provide a `reset()` action that restores initial state.

---

## Event Logging

Game events are emitted via `emitEvent()` (standalone function usable outside React):

```tsx
import { emitEvent } from '../eventLogStore'

emitEvent('recruit', `招收弟子 ${character.name}`)
emitEvent('breakthrough_success', `${name} 突破至 ${realmName}`)
```

Events are stored in `useEventLogStore` (cap 200, newest first) and also persisted to history.

---

## Common Mistakes

1. **Don't mutate state directly** — Always use `set()` with spread
2. **Don't read store without selector** — Use `useSectStore((s) => s.field)` in components
3. **Don't put game logic in store actions** — Delegate to pure functions in `src/systems/`
4. **Don't create new stores without reason** — Most state belongs in `SectStore`
5. **Don't forget to call `reset()`** when starting a new game
6. **Don't mix concerns** — Resources have a single global source in SectStore (no duplication)
