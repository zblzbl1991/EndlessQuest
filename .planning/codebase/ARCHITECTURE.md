# Architecture

**Analysis Date:** 2026-04-02

## Pattern Overview

**Overall:** Client-side idle game with Zustand slice-based state management, pure-function game systems, and IndexedDB persistence. Single-page application using React Router for page navigation.

**Key Characteristics:**
- **Sect-centric domain model** -- The `Sect` aggregate root owns characters, buildings, resources, pets, and vault. All game state flows from this single entity.
- **Zustand sliced stores** -- State is split across 4 stores: `SectStore` (main, 13 slices), `AdventureStore`, `GameStore`, `EventLogStore`.
- **Pure-function game systems** -- All game logic lives in `src/systems/` as stateless functions that take data in and return results. Systems never directly mutate store state.
- **Tick-driven game loop** -- An `IdleEngine` class fires a 1-second interval, calling `tickAll(deltaSec)` which cascades through cultivation, resource production, building queues, and automation.
- **Write-through auto-save** -- Zustand subscription detects `sect` reference changes, debounces 500ms, then writes all entity stores to IndexedDB in a single transaction.
- **Lazy-loaded pages** -- All 7 pages use `React.lazy()` with `Suspense` for code splitting.

## Layers

**Presentation (Pages + Components):**
- Purpose: Render game state, capture user actions, delegate to stores
- Location: `src/pages/`, `src/components/`
- Contains: Page components (7), feature components (17 across 6 groups), common components (13)
- Depends on: Zustand stores (read state, call actions), React Router (navigation), CSS Modules (styling)
- Used by: Browser via React DOM

**State Management (Stores):**
- Purpose: Hold all mutable game state, provide imperative actions that mutate state
- Location: `src/stores/`
- Contains: `SectStore` (13 slices merged via Zustand `StateCreator`), `AdventureStore`, `GameStore`, `EventLogStore`
- Depends on: Game systems (pure functions in `src/systems/`), data tables (in `src/data/`), types (in `src/types/`)
- Used by: Pages, components, auto-save subscription, idle engine

**Game Logic (Systems):**
- Purpose: Stateless pure functions implementing all game rules
- Location: `src/systems/`
- Contains: 16 domain modules, each a directory with 1-7 `.ts` files
- Depends on: Types (`src/types/`), data tables (`src/data/`)
- Used by: Stores (in their action implementations)

**Data Tables (Static Configuration):**
- Purpose: Define game balance constants, entity definitions, and static content
- Location: `src/data/`
- Contains: 28 data files covering realms, buildings, items, enemies, skills, techniques, icons, etc.
- Depends on: Types (`src/types/`)
- Used by: Systems, stores, and occasionally components

**Type Definitions:**
- Purpose: Shared TypeScript interfaces and type aliases for all domain entities
- Location: `src/types/`
- Contains: 9 type files with a barrel `index.ts` re-export
- Depends on: Nothing (leaf layer)
- Used by: All other layers

**Persistence (Save System):**
- Purpose: Serialize/deserialize game state to/from IndexedDB
- Location: `src/systems/save/`
- Contains: `SaveSystem.ts`, `db.ts`, `startAutoSave.ts`, `HistoryStore.ts`, `ResourceCache.ts`
- Depends on: `idb` library, stores (reads current state), types
- Used by: `App.tsx` (load on startup, auto-save subscription)

## Data Flow

**Game Loop (every 1 second):**

1. `IdleEngine.tick()` fires, calculates `deltaSec` from real clock
2. `tickAll(deltaSec)` in `SectStore.tickSlice` executes:
   - Calculates building levels and resource caps
   - Computes resource rates via `ResourceEngine.calcResourceRates()`
   - Applies specialty bonuses from assigned disciples
   - Applies synergy bonuses from building combinations
   - Adds resources to sect, clamps to caps
   - Ticks cultivation for each idle character via `CultivationEngine.tick()`
   - Checks breakthrough eligibility via `CultivationEngine.canBreakthrough()`
   - Processes building production queues via `ProductionSystem.tickProductionQueue()`
   - Ticks adventure runs via `AdventureStore.tickAllIdle(deltaSec)`
   - Checks automation triggers (auto-recruit, auto-adventure)
   - Ticks recovery days for injured/recovering characters
3. State mutation triggers Zustand subscription
4. Auto-save debounces, then writes to IndexedDB

**Adventure Run Flow:**

1. Player configures run (dungeon, team, supply, tactic) via `AdventurePage`
2. `AdventureStore.startRun()` creates `DungeonRun`, generates floors via `MapGenerator.generateFloor()`
3. `AdventureStore.idleTick()` advances floor timer each second
4. `AdventureStore.advanceFloor()` resolves events via `EventSystem.resolveEvent()`, which calls `CombatEngine.simulateCombat()` for combat events
5. `AdventureStore.completeRun()` or `failRun()` creates `AdventureReport`, applies rewards, updates character states
6. Post-run outcomes processed via `DiscipleRecoverySystem.resolveAdventureFailureOutcome()`
7. Report insights generated via `AdventureReportInsightSystem`

**Automation Flow:**

1. `tickSlice` checks `SectAutomationSystem.shouldAutoRecruit()` each game day
2. `SectAutomationSystem.buildAutomationRunConfig()` selects dungeon, team, and strategy
3. `AdventureStore.runAutomation()` calls `AutoRunEngine.resolveAutomatedRun()` which:
   - Iterates floors, picks routes via `AutoRunPolicy.pickAutomationRoute()`
   - Resolves events, picks blessings/shop offers
   - Tracks member states, decides retreat
4. Report stored in `AdventureStore.reports`/`reportDetails`

**Save/Load Flow:**

1. On app load, `App.tsx` calls `loadGame()` which reads IndexedDB per-entity stores
2. Reconstructs `Sect` aggregate, loads adventure runs/reports into `AdventureStore`
3. On each state change, `startAutoSave()` subscription debounces 500ms
4. `saveGame()` writes meta, characters, buildings, vault, pets, adventure to separate IndexedDB object stores in one transaction
5. On `visibilitychange`/`beforeunload`, immediate save fires (no debounce)

**State Management:**
- Centralized in Zustand stores (not Redux-style actions/reducers)
- `SectStore` is the primary store, built from 13 slices using the Zustand `StateCreator` pattern
- Each slice provides a subset of the `SectStore` interface (e.g., `characterSlice` provides `addCharacter`, `removeCharacter`, etc.)
- Stores are read outside React via `useStoreName.getState()` in systems and callbacks
- Components use `useStoreName((s) => s.field)` selector pattern for reactive subscriptions

## Key Abstractions

**Sect (Aggregate Root):**
- Purpose: The central game entity owning all sub-entities
- Examples: `src/types/sect.ts` (interface), `src/stores/sectStore/initial.ts` (factory)
- Pattern: Single `Sect` object containing `characters[]`, `buildings[]`, `vault[]`, `pets[]`, `resources`, and metadata. Persisted as separate IndexedDB stores but reconstructed into a single object in memory.

**Character (Disciple):**
- Purpose: A sect member with cultivation stats, equipment, techniques, talents, and status
- Examples: `src/types/character.ts` (interface), `src/systems/character/CharacterEngine.ts` (generation), `src/stores/sectStore/characterSlice.ts` (mutations)
- Pattern: Rich entity with embedded collections (`backpack[]`, `equippedGear[]`, `learnedTechniques[]`, `talents[]`, `specialties[]`, `fateTags[]`). Status state machine (`idle` | `adventuring` | `patrolling` | `resting` | `injured` | `training` | `recovering`).

**DungeonRun (Active Adventure):**
- Purpose: Represents an in-progress dungeon expedition with team, floor state, and rewards
- Examples: `src/types/adventure.ts` (`DungeonRun` interface), `src/stores/adventureStore.ts` (lifecycle)
- Pattern: Stateful session object with `status` lifecycle (`active` -> `completed`/`retreated`/`failed`). Contains generated `floors[]` with `routes[]` and `events[]`.

**AdventureReport (Completed Adventure):**
- Purpose: Immutable record of a completed adventure run with detailed steps
- Examples: `src/types/adventure.ts` (`AdventureReport` interface), `src/systems/roguelike/AdventureReportInsightSystem.ts` (analysis)
- Pattern: Event-sourced report with `steps[]` chronologically tracking every decision and outcome. Includes `postRunMemberOutcomes` for casualty/recovery tracking.

**IdleEngine (Game Loop):**
- Purpose: Drives the core game tick at 1-second intervals with offline catch-up
- Examples: `src/systems/idle/IdleEngine.ts`
- Pattern: Singleton class with `start()`/`stop()`, visibility change handling for tab-switching, and `calcOfflineSeconds()` for offline progress (capped at 24 hours).

## Entry Points

**Application Bootstrap:**
- Location: `src/main.tsx`
- Triggers: Browser loads `index.html`, which loads this module
- Responsibilities: Renders `<App />` into `#root`, imports global CSS

**App Component:**
- Location: `src/App.tsx`
- Triggers: React mounts after `main.tsx`
- Responsibilities: Loads saved game from IndexedDB, starts `IdleEngine`, sets up auto-save, handles offline catch-up report, provides routing via `BrowserRouter`, renders `Sidebar`/`TopBar`/`BottomNav` shell

**Game Tick:**
- Location: `src/stores/sectStore/tickSlice.ts` (`tickAll`)
- Triggers: `IdleEngine` interval (1 second) or offline catch-up
- Responsibilities: The central game loop tick -- resource production, cultivation, breakthroughs, building production, automation checks, recovery

**Save Trigger:**
- Location: `src/systems/save/startAutoSave.ts`
- Triggers: Zustand subscription on `sect` reference change, `visibilitychange`, `beforeunload`
- Responsibilities: Debounced (500ms) write-through save to IndexedDB

## Error Handling

**Strategy:** Runtime try-catch with console logging and graceful degradation.

**Patterns:**
- Save/load wrapped in try-catch with `console.error`, returning `false` on failure
- `ErrorBoundary` component wraps page content in `App.tsx`
- Offline catch-up uses `queueMicrotask` to avoid synchronous setState during effects
- Save data integrity check: if meta exists but all entity stores are empty, treats as corrupted and returns `false`
- Resource normalization on load (`normalizeFiniteNumber`, `normalizeResources`) prevents NaN/Infinity corruption

## Cross-Cutting Concerns

**Logging:** `EventLogStore` maintains a capped (200 entries) event log. Events are emitted via `emitEvent()` standalone function (no hook required). Events are also persisted to IndexedDB `history` store via `HistoryStore.addHistoryEntry()`.

**Validation:** Input validation in store actions returns `{ success: boolean, reason: string }` tuples (e.g., `tryUpgradeBuilding`, `canRecruit`). UI components check `success` and display `reason` to user.

**Authentication:** Not applicable -- single-player client-side game with no server authentication.

**Responsive Layout:** CSS-based responsive design with three breakpoints (640px, 1024px). Mobile uses `BottomNav` component, desktop uses `Sidebar` component. `globals.css` provides the layout shell with `page-content` padding adapting to sidebar presence.

**Theming:** CSS custom properties defined in `src/styles/theme.css` provide the ink-wash color palette (`--color-bg`, `--color-accent`, `--color-quality-*`, etc.). All components use these variables, never hardcoded colors.

---

*Architecture analysis: 2026-04-02*
