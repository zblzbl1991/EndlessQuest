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
| `useEventLogStore` | `src/stores/eventLogStore.ts` | Event log (500 events max, newest first, consecutive adventure events auto-merged) |

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
| `createTickSlice` | `tickSlice.ts` | tickAll (main game loop — cultivation, production, breakthroughs, auto-run gating) |
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
| Event history | `useEventLogStore` | `events` (capped at 500, auto-merged) |
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

## Tick-Driven Re-render Performance

`tickAll` fires every 1 second and replaces the entire `sect` object via `set({ sect: newSect })`. This means **every component subscribed to `useSectStore((s) => s.sect)` re-renders once per second**, regardless of which fields changed.

### Why fine-grained selectors don't help

Since `tickAll` creates a new `sect` with new nested references (`characters`, `resources`, `buildings`, `vault`), even `useSectStore((s) => s.sect.characters)` detects a reference change every tick. Narrow selectors only help if the slice truly wasn't replaced.

### Defense: useMemo for expensive derivations

Any component subscribed to `sect` must wrap expensive computations in `useMemo`. "Expensive" means any of:
- Iterating arrays (`filter`, `reduce`, `find` inside `.map()`)
- Calling system functions (`getActiveSynergies`, `calcEffectiveCultivationRate`, `buildCharacterSkillLoadout`)
- Sorting or transforming data

```tsx
// Good — computation only runs when buildings actually change reference
const activeSynergies = useMemo(() => getActiveSynergies(sect.buildings), [sect.buildings])

// Bad — re-runs O(synergies * requirements * buildings) every second
const activeSynergies = getActiveSynergies(sect.buildings)
```

### Defense: Hoist shared computations to parent

When multiple child components need the same derived value, compute once in the parent and pass via props:

```tsx
// Parent
const activeSynergies = useMemo(() => getActiveSynergies(sect.buildings), [sect.buildings])
const autoAssignableCount = useMemo(() => /* ... */, [sect.buildings, sect.characters])

return <BuildingsTab activeSynergies={activeSynergies} autoAssignableCount={autoAssignableCount} />

// Child — receives via props, no duplicate computation
function BuildingsTab({ activeSynergies, autoAssignableCount }: Props) { ... }
```

### Defense: Hoist static data to module level

When a computation depends only on static data (not game state), compute once at module level:

```tsx
// Good — computed once when module loads
const UNIQUE_SYNERGIES = SYNERGIES.filter((s, i) => SYNERGIES.findIndex((o) => o.id === s.id) === i)

// Bad — O(n²) dedup runs every render
const uniqueSynergies = SYNERGIES.filter((s, i) => SYNERGIES.findIndex((o) => o.id === s.id) === i)
```

---

## Auto-Save

A Zustand subscription detects `sect` reference changes, debounces 500ms, then writes all entity stores to IndexedDB in a single transaction. Triggers on: state change, `visibilitychange`, `beforeunload`.

---

## Tick-Loop Day Counter Gating

The `tickAll` elapsed-days loop runs recovery and auto-recruit every game day, but expensive operations (auto dungeon runs) are gated by `sect.autoRunDayCounter`. Only when the counter reaches the threshold (currently 5) does the auto-run trigger, then the counter resets.

### Pattern

```tsx
for (let day = 0; day < elapsedDays; day++) {
  // 1. Every-day operations: recovery, auto-recruit
  set((state) => ({
    sect: {
      ...state.sect,
      autoRunDayCounter: (state.sect.autoRunDayCounter ?? 0) + 1,
      characters: /* recovery logic */,
    },
  }))

  // Auto-recruit runs every day
  while (shouldAutoRecruit({...})) { ... }

  // 2. Gated operations: only every N days
  const currentState = get()
  if ((currentState.sect.autoRunDayCounter ?? 0) >= 5) {
    const autoRunConfig = buildAutomationRunConfig({...})
    if (autoRunConfig) useAdventureStore.getState().runAutomation(autoRunConfig)
    set((state) => ({ sect: { ...state.sect, autoRunDayCounter: 0 } }))
  }
}
```

### Adding New Gated Features

When adding new tick-gated features:
1. Add a counter field to `Sect` interface + `initial.ts` + `SaveMeta` migration
2. Increment in the day loop (same `set()` call as existing counter)
3. Check threshold before triggering, reset after
4. Always use `?? 0` fallback for save compatibility

---

## Cross-Store Mutation Gotcha

When a store action calls another store's mutating actions, the calling store's `getState()` still returns the **pre-mutation snapshot**. You must re-read `getState()` after any cross-store mutation to see updated state.

### Wrong

```tsx
// adventureStore.ts — inside startRun()
const sectStore = useSectStore.getState()
sectStore.spendResource('spiritStone', cost)
// BUG: sect still has old spiritStone count
const character = sectStore.sect.characters.find(c => c.id === charId)
```

### Correct

```tsx
// adventureStore.ts — inside startRun()
const sectStore = useSectStore.getState()
sectStore.spendResource('spiritStone', cost)

// Re-read after mutation
const currentSect = useSectStore.getState().sect
const character = currentSect.characters.find(c => c.id === charId)
```

This applies to any sequence where:
1. Store A calls Store B's mutating action (`spendResource`, `setCharacterStatus`, `equipItem`, etc.)
2. Store A then needs to read Store B's updated state

The Zustand `set()` call updates the store immediately, but the local variable holding the old snapshot is stale.

---

## Temporary Resource Assignment Pattern

When items must be temporarily moved between containers (vault → character → vault) for a dungeon run:

### Lifecycle

1. **Assign**: Before run starts, use `autoEquipForDungeon()` to plan, then execute via `transferItemToCharacter()` + `equipItem()`
2. **Store plan**: Save the assignment plan on the run object (`DungeonRun.autoEquipAssignments`)
3. **Return**: After run ends (complete/fail/retreat), use `unequipItem()` + `transferItemToVault()` to return items

### Implementation

```tsx
// 1. Plan (pure function, no mutations)
const autoEquipResult = autoEquipForDungeon(characterIds, characters, vault)

// 2. Execute mutations sequentially
for (const [charId, slots] of Object.entries(autoEquipResult.assignments)) {
  for (const { slotIndex, itemId } of slots) {
    const vaultIdx = sect.vault.findIndex(s => s.item.id === itemId)
    sectStore.transferItemToCharacter(charId, vaultIdx)  // vault → backpack
    // Re-read after mutation!
    const char = useSectStore.getState().sect.characters.find(c => c.id === charId)
    const bpIdx = char.backpack.findIndex(s => s.item.id === itemId)
    sectStore.equipItem(charId, bpIdx, slotIndex)  // backpack → slot
  }
}

// 3. Save plan for later return
run.autoEquipAssignments = autoEquipResult.assignments

// 4. After run ends — return items
for (const [charId, slots] of Object.entries(run.autoEquipAssignments)) {
  for (const { slotIndex, itemId } of slots) {
    sectStore.unequipItem(charId, slotIndex)  // slot → backpack
    const char = useSectStore.getState().sect.characters.find(c => c.id === charId)
    const bpIdx = char.backpack.findIndex(s => s.item.id === itemId)
    sectStore.transferItemToVault(charId, bpIdx)  // backpack → vault
  }
}
```

### Key Rules

- Always re-read `getState()` after each mutation step (transfer → find → equip)
- Save the assignment plan so items can be returned even if the run fails
- Call `returnAutoEquippedItems()` in ALL exit paths: `completeRun`, `failRun`, and `retreat`

---

## Dungeon Growth System Contracts

### `calcDungeonGrowth(floorsCleared, quality)`

Returns permanent stat boosts for surviving characters after a dungeon run.

**File**: `src/systems/character/DungeonGrowthSystem.ts`

**Signature**:
```tsx
function calcDungeonGrowth(
  floorsCleared: number,
  quality: CharacterQuality
): {
  statBoost: { hp: number; atk: number; def: number }
  cultivationGain: number
}
```

**Formulas**:
- HP boost: `floor(floors * 3 * qualityMultiplier)`
- ATK/DEF boost: `floor(floors * 1 * qualityMultiplier)`
- Cultivation: `floor(floors * 10 * qualityMultiplier)`
- Quality multipliers: common=1.0, uncommon=1.2, rare=1.5, epic=2.0, legendary=2.5

### Application Rules

| Run Result | Stat Boost | Cultivation | Comprehension |
|------------|-----------|-------------|---------------|
| Completed  | Yes       | Yes         | Yes           |
| Retreated  | No        | No          | Yes           |
| Failed     | No        | No          | Only from events before death |

### Comprehension Accumulation

Comprehension growth (+2 per technique per combat) accumulates across all events in a run:

- **Automation path**: `AutoRunEngine` accumulates into `report.comprehensionGrowth`, applied via `applyDungeonGrowth()`
- **Manual path**: `selectRoute()` accumulates into `run.accumulatedComprehensionGrowth`, applied via `applyManualRunGrowth()`
- Applied only to surviving characters (status !== 'dead')
- Capped at 100 per technique

---

## Equipment Ownership Contract

### Core Rule: Backpack is the single source of truth

Equipment items are always stored in `character.backpack[]`. The `equippedGear: (string | null)[]` array is an **index** that references backpack items by ID — it is NOT a separate storage location.

```
backpack: [{ item: { id: "sword_01", type: "equipment", ... } }, ...]
equippedGear: [null, null, null, null, null, "sword_01", null, null, null]
                                           ↑ references backpack item
```

### Why this matters

The previous implementation removed items from backpack on equip, treating `equippedGear` IDs as pointers to objects that no longer existed. All lookup functions (`findEquipmentById` in both `EquipPanel.tsx` and `initial.ts`) search `sect.vault` + `character.backpack` — they never search `equippedGear` because it only contains IDs. Equipped items became unreachable "ghost data".

### Action Contracts

| Action | What it does | Backpack change | equippedGear change |
|--------|-------------|-----------------|---------------------|
| `equipItem(charId, bpIdx, slotIdx)` | Mark item as equipped | None | `gear[slotIdx] = item.id` |
| `unequipItem(charId, slotIdx)` | Clear gear slot | None | `gear[slotIdx] = null` |
| `transferItemToVault(charId, bpIdx)` | Move to shared vault | Removes item | Blocked if item is equipped |
| `sellCharacterItem(charId, bpIdx)` | Sell for spirit stones | Removes item | Blocked if item is equipped |

### UI Implications

- **Backpack display** must filter out items whose IDs appear in `character.equippedGear` — equipped items should not show as "loose" inventory
- **onSlotClick** (empty gear slot clicked) must also filter equipped items when offering backpack equipment to equip
- The filter must preserve original array indices for all operations (use `.map().filter().map()` pattern, not just `.filter()`)

### Wrong vs Correct

#### Wrong (old behavior — items vanish)

```tsx
equipItem: (charId, bpIdx, slotIdx) => {
  const item = char.backpack[bpIdx].item
  newBackpack.splice(bpIdx, 1)        // Item removed from backpack!
  gear[slotIdx] = item.id             // Only ID stored — item object is gone
  // findEquipmentById() can never find it again
}
```

#### Correct (new behavior — items stay)

```tsx
equipItem: (charId, bpIdx, slotIdx) => {
  // Item stays in backpack — only update the reference index
  gear[slotIdx] = char.backpack[bpIdx].item.id
  // findEquipmentById() finds it in backpack as expected
}
```

### General Pattern: ID-Reference Arrays

This contract applies to ANY field that stores entity IDs as references rather than owning the data:

| Field | References | Storage |
|-------|-----------|---------|
| `equippedGear` | Equipment IDs | `character.backpack[]` |
| `equippedSkills` | Skill IDs | `data/activeSkills.ts` (static data, always accessible) |
| `learnedTechniques` | Technique IDs | `data/techniquesTable.ts` (static data, always accessible) |

**Rule**: If the referenced entity is dynamic (stored in mutable state), the reference array is an index, not an owner. The entity must remain in its storage collection.

---

## Common Mistakes

1. **Mutating state directly** — Always use `set()` with immutable spread patterns
2. **Reading state without selectors** — Components must use `useSectStore((s) => s.field)`
3. **Putting logic in components** — Business logic belongs in store actions or system functions
4. **Creating new stores for small state** — Add a slice to SectStore or use local `useState`
5. **Forgetting to update `types.ts`** — Every new slice action must be added to the `SectStore` interface
6. **Stale cross-store references** — After calling another store's mutating action, re-read `getState()` before using the data
7. **Missing item return on failed runs** — Temporary item assignments must be returned in ALL exit paths (complete, fail, retreat)
8. **Removing union type members without migration** — Old save data still contains the removed values; always add a migration map and apply it at the load boundary
9. **Removing character fields without fixture updates** — When removing fields from Character (like `fateTags`), ALL test fixtures across ALL test files must be updated. Use `grep -r "fateTags" src/__tests__/` to find every occurrence.
10. **Using `Record<boolean, T>` as type** — TypeScript doesn't allow boolean as Record key. Use a string literal union like `'normal' | 'high'` instead.
11. **Removing entities from their storage collection when only an ID reference is recorded** — If `equippedGear: (string | null)[]` only stores IDs, the actual item must remain in `backpack` (the real storage). Removing from backpack destroys the only copy of the data, making the ID a dangling reference. See "Equipment Ownership Contract" below.

---

## Persisted Type Migration Pattern

When simplifying a union type that is persisted in save data (IndexedDB), follow this pattern to maintain backward compatibility:

### Steps

1. **Define the new type** — Replace the old union with the simplified version
2. **Create a migration map** — Map old values to new values in the data file
3. **Export a migration helper** — A function that maps any old ID to the new ID
4. **Apply at load boundary** — Use the helper in `SaveSystem.ts` when reconstructing state

### Example: SectRiskPolicyId (7 → 3)

```tsx
// 1. New type (types/destiny.ts)
export type SectRiskPolicyId = 'conservative' | 'balanced' | 'aggressive'

// 2. Migration map (data/sectRiskPolicies.ts)
export const POLICY_MIGRATION_MAP: Record<string, SectRiskPolicyId> = {
  lianfeng: 'conservative',
  shouheng: 'conservative',
  shenji: 'balanced',
  zhuxi: 'balanced',
  yapo: 'aggressive',
  niejie: 'aggressive',
  fenming: 'aggressive',
}

// 3. Migration helper (data/sectRiskPolicies.ts)
export function migratePolicyId(id: string): SectRiskPolicyId {
  if (id in SECT_RISK_POLICIES) return id as SectRiskPolicyId
  return POLICY_MIGRATION_MAP[id] ?? 'balanced'
}

// 4. Apply at load (systems/save/SaveSystem.ts)
strategySettings: meta.strategySettings
  ? {
      ...meta.strategySettings,
      activePolicy: migratePolicyId(meta.strategySettings.activePolicy),
    }
  : { activePolicy: 'balanced', ... }
```

### Key Rules

- Migration runs at **load time only**, not on every tick
- Default value (`'balanced'`) handles completely missing or unrecognized IDs
- The helper checks `in SECT_RISK_POLICIES` first so it's idempotent (safe to call on already-migrated data)
- Update all hardcoded references (initial state, default fallbacks, test fixtures) to new IDs

### Example: Full System Replacement (Destiny → FateGrid)

When replacing an entire system (not just simplifying a union), the migration pattern extends:

```tsx
// SaveSystem.ts loadGame()

// 1. Removed fields: just omit them from reconstructed state
// Old: character had fateTags, destinyState, seedRarity, seedId
// New: character has fateGrid?: FateGridId
// Migration: fateGrid: (c as any).fateGrid ?? undefined

// 2. Removed top-level state: omit from sect reconstruction
// Old: sect.darkCurrent, sect.strategySettings.activeAmplifiers
// New: neither field exists

// 3. Keep policy migration for idempotent loads
strategySettings: meta.strategySettings
  ? {
      ...meta.strategySettings,
      activePolicy: migratePolicyId(meta.strategySettings.activePolicy),
      // activeAmplifiers silently dropped
    }
  : { activePolicy: 'balanced', switchCooldownDays: 0, lastSwitchedAt: null }
```

**Key rule**: When removing fields entirely, use `(c as any).fieldName` to read old data and provide `undefined` fallback. Do NOT add migration for fields that simply no longer exist — just let them be `undefined`.

---

## FateGrid (命格) System Contracts

### Overview

Each character may have an optional `fateGrid: FateGridId` representing an innate destiny that affects multiple gameplay dimensions. Inspired by 《猎命师传奇》.

### Acquisition Rules

| Trigger | Probability |
|---------|-------------|
| Recruitment — common | 5% |
| Recruitment — spirit | 15% |
| Recruitment — immortal | 30% |
| Recruitment — divine | 50% |
| Recruitment — chaos | 80% |
| Major realm breakthrough (no grid) | 20% |

### 10 Fate Grids

| ID | Name | Category | Rarity | Core Effect |
|----|------|----------|--------|-------------|
| `dragonPhoenix` | 龙凤之姿 | heavenly | epic | All stats +15%, breakthrough +10% |
| `overlordBody` | 天生霸体 | heavenly | legendary | Constitution +35%, lethal reduction 20% |
| `bloodSuppress` | 血镇 | heavenly | legendary | All stats +8%, enemy -5%, boss +15% |
| `ghostly` | 万鬼缠身 | ghost | rare | Attack +18%, ghost strike 15%, heart demon +8% |
| `undying` | 九死还魂 | ghost | epic | 40% survive lethal, recovery +30%, cultivation -10% |
| `lastStand` | 破釜沉舟 | emotional | rare | Low HP attack bonus, retreat loot 60% |
| `warSpirit` | 战意凌云 | emotional | rare | Consecutive battle stacking +5%/battle |
| `wisdom` | 慧根深种 | cultivation | common | Cultivation +25%, comprehension +20% |
| `defiance` | 逆天改命 | cultivation | epic | Breakthrough failure retention 60% |
| `lucky` | 福星高照 | probability | rare | Rare events +25%, loot quality +20% |

### Effect Query Pattern

Systems consume fate grid effects through query functions, not direct property access:

```tsx
// systems/destiny/DestinySystem.ts
export function getCultivationSpeedModifier(character: Character): number
export function getBreakthroughSuccessBonus(character: Character): number
export function getAttackModifier(character: Character): number
// ... 11 total query functions
```

**Convention**: Each query function returns `0` for characters without a fate grid, so callers don't need null checks.

### Rarity Weight by Quality

```tsx
// Normal quality (common, spirit)
{ common: 50, rare: 30, epic: 15, legendary: 5 }

// High quality (immortal, divine, chaos)
{ common: 20, rare: 35, epic: 30, legendary: 15 }
```

### Consuming Systems

| System | What it reads | How |
|--------|--------------|-----|
| CultivationEngine | cultivation speed, breakthrough bonus | `getCultivationSpeedModifier()`, `getBreakthroughSuccessBonus()` |
| TribulationSystem | heart demon bonus | `getHeartDemonBonus()` |
| TechniqueSystem | comprehension, insight | `getTechniqueComprehensionModifier()`, `getSuddenInsightChance()` |
| AutoEquipSystem | combat style from grid category | `getFateGridDef(id).category` → style mapping |
| AutoRecruitSystem | grid rarity for candidate scoring | `getFateGridDef(id).rarity` |
| CoreDiscipleSystem | grid rarity for core scoring | `getFateGridDef(id).rarity` |

### Key Files

| File | Purpose |
|------|---------|
| `src/types/destiny.ts` | FateGridId, FateGridDef, FateGridEffects, FateGridRarity types |
| `src/data/fateGrids.ts` | 10 grid definitions, acquisition logic, roll functions |
| `src/systems/destiny/DestinySystem.ts` | Effect query functions, acquisition helpers |
| `src/data/sectRiskPolicies.ts` | Simplified policy profiles (no destiny-specific fields) |

## Dormant Subsystems: Dispatch & Auto-Operation

### Design Decision: UI Removed, Systems Preserved

**Context**: The dispatch (派遣) system and auto-operation panel were removed from the UI (2026-04-08) to simplify the player experience. Building bonuses are no longer shown as tied to individual dispatch assignments.

**What was removed from UI**:
- `CharactersPage`: `dispatching` filter tab, "派遣" button, mission selection panel, current dispatch display, "宗门自动运转" panel (reserve settings + auto-breakthrough toggle)
- `SectPage`: "自动运转" metric

**What still exists in code** (dormant, not dead code):
- `CharacterStatus` type still includes `'patrolling'` — used by `CharacterDispositionSystem` scoring
- `AdventureStore` still has `dispatches`, `startDispatch`, `getActiveDispatchCount`
- `data/missions.ts` still has `DISPATCH_MISSIONS` and `getAvailableMissions`
- `SectStore` still has `automationSettings` (reserveSpiritStone, reserveSpiritEnergy, autoBreakthrough)
- `buildingSlice.ts` still has `assignToBuilding`, `unassignFromBuilding` (used for technique training, not dispatch)
- `SectEngine.ts` `calcMaxDisciplesByResources` still filters by `assignedBuilding === 'spiritField'`

**Why preserve**: The underlying systems may be repurposed or re-enabled with different UI. Removing them from types would require a save migration for existing `patrolling` characters.

**Implication for future work**: If re-adding dispatch UI, check `CharacterDispositionSystem`, `AdventureStore.dispatches`, and `data/missions.ts` — the data layer is already wired. If permanently removing dispatch, add a migration that converts `patrolling` characters to `idle` on load.
