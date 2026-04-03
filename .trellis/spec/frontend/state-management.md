# State Management

> How state is managed in this project.

---

## Overview

State is managed with **Zustand** using a sliced store pattern. There is no server state (pure client-side app with IndexedDB persistence). All game state flows from a single `Sect` aggregate root.

---

## Store Inventory

| Store | File | Purpose |
|-------|------|---------|
| `useSectStore` | `src/stores/sectStore/index.ts` | Main game state (characters, buildings, resources, items, pets, vault) |
| `useAdventureStore` | `src/stores/adventureStore.ts` | Dungeon runs, reports, dispatches |
| `useGameStore` | `src/stores/gameStore.ts` | Meta state (saveSlot, isPaused, dayProgress) |
| `useEventLogStore` | `src/stores/eventLogStore.ts` | Event log (200 events max, newest first) |

---

## SectStore Slice Architecture

The main store (`useSectStore`) is decomposed into 12 slices composed via object spread:

| Slice | File | Key Actions |
|-------|------|-------------|
| `createInitialSlice` | `initial.ts` | Owns `sect` and `shopState` base state |
| `createCharacterSlice` | `characterSlice.ts` | addCharacter, removeCharacter, sacrificeCharacter, promoteCharacter, setCharacterStatus, chooseCultivationPath |
| `createBuildingSlice` | `buildingSlice.ts` | upgradeBuilding, expandBuilding, setProductionRecipe, assignToBuilding, autoAssignToBuilding |
| `createResourceSlice` | `resourceSlice.ts` | spendResource, addResource, exchangeResources |
| `createItemSlice` | `itemSlice.ts` | transferItemToCharacter, transferItemToVault, addToVault, sellItem, equipItem, unequipItem, enhanceItem |
| `createTechniqueSlice` | `techniqueSlice.ts` | unlockCodexEntry, unlockCodexAndLearn, craftPotion, forgeEquipment, studyTechnique |
| `createPetSlice` | `petSlice.ts` | addPet, removePet, assignPet, unassignPet |
| `createTickSlice` | `tickSlice.ts` | tickAll (main game loop — cultivation, production, breakthroughs) |
| `createShopSlice` | `shopSlice.ts` | initShop, buyFromShop, refreshDailyShop |
| `createSectPathSlice` | `sectPathSlice.ts` | chooseSectPath, unlockPathNode, resetSectPath, setActiveRoute |
| `createLegacySlice` | `legacySlice.ts` | performAscension |
| `createMiscSlice` | `miscSlice.ts` | healCharacter, clearOfflineAccumulator, reset |

### Slice Composition

```tsx
// src/stores/sectStore/index.ts
export const useSectStore = create<SectStore>()(
  (...a) =>
    ({
      ...createInitialSlice(...a),
      ...createCharacterSlice(...a),
      ...createBuildingSlice(...a),
      // ... all 12 slices
    }) as SectStore
)
```

### Slice Type Signature

Every slice follows this type:

```tsx
export const createXxxSlice: StateCreator<SectStore, [], [], Partial<SectStore>> = (set, _get) => ({
  actionName: (param: Type) => {
    // validation
    // mutation via set()
    // return value
  },
})
```

---

## State Mutation Pattern

Store actions use Zustand's `set()` with immutable updates:

```tsx
spendResource: (type: keyof Resources, amount: number) => {
  const { sect } = _get()
  if (sect.resources[type] < amount) return false
  set((s) => ({
    sect: {
      ...s.sect,
      resources: { ...s.sect.resources, [type]: s.sect.resources[type] - amount },
    },
  }))
  return true
},
```

### Return value conventions

| Scenario | Return Type | Example |
|----------|-------------|---------|
| Simple success/failure | `boolean` | `spendResource()` returns `true`/`false` |
| Create with result | `Entity \| null` | `addCharacter()` returns `Character` or `null` |
| Detailed outcome | `{ success: boolean; reason: string }` | UI-facing operations |
| No meaningful result | `void` | `tickAll()`, `reset()` |

### Validation pattern

Check conditions sequentially, return early on failure, mutate only after all validation passes:

```tsx
addCharacter: (quality) => {
  const { sect } = _get()
  // 1. Check quality unlock
  if (!isQualityUnlocked(quality, sect.sectPath)) return null
  // 2. Check character cap
  if (sect.characters.length >= maxCharacters) return null
  // 3. Check cost
  if (sect.resources.spiritStone < cost) return null
  // 4. All validation passed — mutate
  const character = generateCharacter(quality, sect.activeRoute)
  set((s) => ({ sect: { ...s.sect, characters: [...s.sect.characters, character] } }))
  return character
},
```

---

## Cross-Store Communication

Stores communicate by calling `.getState()` on other stores:

```tsx
// In tickSlice.ts
const gameState = useGameStore.getState()
useAdventureStore.getState().runAutomation(autoRunConfig)

// In adventureStore.ts
const { sect } = useSectStore.getState()
useSectStore.setState((s) => ({ sect: { ...s.sect, stats: { ... } } }))
```

---

## State Categories

| Category | Where | Example |
|----------|-------|---------|
| Global game state | `useSectStore` | `sect.characters`, `sect.buildings`, `sect.resources` |
| Session/adventure state | `useAdventureStore` | `runs`, `reports` |
| Meta/session state | `useGameStore` | `isPaused`, `dayProgress` |
| Event history | `useEventLogStore` | `events` (capped at 200) |
| Local UI state | Component `useState` | Modal visibility, toast messages |
| Derived state | Component `useMemo` | Aggregated stats, filtered lists |

### No server state

This is a pure client-side app. There is no server, no API calls, no React Query / SWR. All data lives in IndexedDB via the save system.

---

## Store Interface

All state and action types are defined in one place:

```tsx
// src/stores/sectStore/types.ts (127 lines)
export interface SectStore {
  // State
  sect: Sect
  shopState: ShopState
  offlineAccumulator: number

  // Actions (grouped by domain)
  addCharacter(quality: CharacterQuality): Character | null
  spendResource(type: keyof Resources, amount: number): boolean
  // ...
}
```

---

## Auto-Save

A Zustand subscription detects `sect` reference changes, debounces 500ms, then writes all entity stores to IndexedDB in a single transaction. Triggers on: state change, `visibilitychange`, `beforeunload`.

---

## Common Mistakes

1. **Mutating state directly** — Always use `set()` with immutable spread patterns
2. **Reading state without selectors** — Components must use `useSectStore((s) => s.field)`
3. **Putting logic in components** — Business logic belongs in store actions or system functions
4. **Creating new stores for small state** — Add a slice to SectStore or use local `useState`
5. **Forgetting to update `types.ts`** — Every new slice action must be added to the `SectStore` interface
