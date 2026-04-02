# Stack Research

**Domain:** Xianxia Idle Roguelike Web Game -- Character Progression Depth
**Researched:** 2026-04-02
**Confidence:** HIGH

## Recommended Stack

### Verdict: No New Libraries Required

The existing stack (React 19 + TypeScript 5.9 + Zustand 5 + CSS Modules + Vitest + IndexedDB via `idb`) is fully sufficient for the character progression milestone. All progression systems are pure-function game logic that integrate into the existing Zustand slice pattern, tick-driven game loop, and write-through auto-save pipeline. No new runtime dependencies are needed.

This is a deliberate recommendation. The design spec (`docs/superpowers/specs/2026-03-29-character-progression-design.md`) calls for extending existing systems, not building new infrastructure. The 12 subsystems (cultivation paths, element affinity, skill equipment, pet combat, fate tags, refinement, set bonuses, titles, talents, technique comprehension, specialties) all fit cleanly into the established architecture.

### Core Technologies (Already Locked)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| React | 19.2.4 | UI rendering | Already in use. Character progression adds new panels (skill equipment UI, refinement UI, path choice modal) as React components with CSS Modules. No framework change needed. |
| TypeScript | 5.9.3 | Type safety | Already in use. New type definitions (`CultivationPath`, `SetDef`, `MechanicalTalentEffect`, `FateTagEffect`, `LearnedTechnique`) extend existing type files. Strict mode ensures migration safety. |
| Zustand | 5.0.12 | State management | Already in use. New game logic integrates into existing slices (`characterSlice`, `tickSlice`, `itemSlice`) or creates thin new slices. The slice pattern (13 slices already in SectStore) scales well for this milestone. |
| `idb` | 8.0.3 | IndexedDB persistence | Already in use. Save migration is handled by incrementing `DB_VERSION` in `db.ts` and adding normalization logic in `SaveSystem.ts`. The per-entity store pattern (characters, buildings, vault, pets, adventure) handles the new fields naturally -- IndexedDB stores accept any JSON-serializable object structure. |
| Vitest | 4.1.1 | Testing | Already in use. Pure-function systems are trivially testable. Each new system file gets a corresponding test file in `__tests__/`. |
| Vite | 8.0.2 | Build tooling | No change needed. |

### Supporting Libraries (Already Present)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `framer-motion` | 12.38.0 | Animation | Currently unused in imports. Could enhance the cultivation path choice modal and breakthrough animations, but not required. LOW priority -- the design emphasizes ink-wash restraint over flashy animation. |
| `react-router-dom` | 7.13.2 | Routing | No new routes needed. Progression features integrate into existing pages (CharactersPage, BuildingsPage, AdventurePage). |
| `fake-indexeddb` | 6.2.5 | Test environment | Already handles save migration tests. New fields will need migration test cases. |
| `@testing-library/react` | 16.3.2 | Component testing | For new UI panels (skill equipment, refinement, path choice). |

## Architecture Patterns for Character Progression

### State Management: Zustand Slices

The project uses Zustand's slice pattern extensively (13 slices in SectStore). For character progression, the approach should be:

**Extend existing slices, not create new stores:**
- `characterSlice.ts` -- Add `learnedSkills`, `techniqueComprehension` to Character type, add skill equipment actions
- `tickSlice.ts` -- Add title promotion checks, technique comprehension ticks, cultivation path growth modifiers
- `itemSlice.ts` -- Add refinement actions (`refineEquipment`, `reforgeEquipment`)
- `petSlice.ts` -- No change; pet combat integration happens at the adventure store level

**New system files (pure functions, no store mutation):**
- `src/systems/character/CultivationPathSystem.ts` -- Already exists, extend with path-specific stat growth
- `src/systems/equipment/SetBonusSystem.ts` -- New: set detection and bonus calculation
- `src/systems/character/TitleSystem.ts` -- New: title promotion logic
- `src/systems/character/MechanicalTalentSystem.ts` -- New: mechanic talent query interface

**New data files:**
- `src/data/cultivationPaths.ts` -- Already exists with path definitions
- `src/data/sets.ts` -- New: set definitions and bonuses
- `src/data/fateTags.ts` -- Extend: add `FateTagEffect` to existing definitions
- `src/data/talents.ts` -- Extend: add 10 new talents including mechanical types
- `src/data/activeSkills.ts` -- Extend: add path-specific skills

### Game Loop Integration: Tick-Driven Updates

The tick loop in `tickSlice.ts` runs every 1 second. Character progression features integrate at specific points in the tick:

```
tickAll(deltaSec):
  1. Resource production (existing)
  2. Building production queues (existing)
  3. Per-character loop:
     a. Cultivation tick (existing) -- add path stat growth modifier
     b. Breakthrough check (existing) -- add title promotion after success
     c. NEW: Technique comprehension tick (for comprehension-assigned characters)
  4. Day boundary (existing):
     a. NEW: Title promotion check (realm-based)
  5. Automation (existing)
```

Key constraint: the tick must remain fast. With 30 characters max, per-character operations should be O(1). The new systems (title check, comprehension tick) are simple lookups, so this is safe.

### Roguelike Run Architecture

The existing adventure system (`AdventureStore` + `AutoRunEngine`) handles runs as discrete sessions. Character progression affects runs in two ways:

1. **Pre-run assembly**: When building the ally team in `startDungeonRun()`, include pet combat units via `getPetCombatUnit()`. This is a data integration point, not an architecture change.

2. **In-run effects**: Cultivation path skills and set bonuses affect combat but only via `CombatEngine` inputs. The combat engine receives `CombatUnit[]` with pre-calculated stats. Element affinity bonuses are applied during ally assembly, not during combat simulation.

This means progression systems do not need to touch the roguelike state machine (floor generation, event resolution, auto-run). They only affect the inputs.

### Save/Persistence: Versioned Migration

The save system uses a versioned migration pattern in `SaveSystem.ts`. Current meta version is 8. Each milestone bumps the version and adds normalization logic.

**Migration strategy for character progression:**

```typescript
// In loadGame(), when constructing characters from raw data:
const migratedCharacter = {
  ...rawChar,
  // New fields with safe defaults
  cultivationPath: rawChar.cultivationPath ?? (rawChar.realm >= 1 ? 'sword' : 'none'),
  learnedSkills: rawChar.learnedSkills ?? [],
  techniqueComprehension: rawChar.techniqueComprehension ?? {},
  equippedSkills: rawChar.equippedSkills?.length === 0
    ? [null, null, null, null]
    : (rawChar.equippedSkills ?? [null, null, null, null]),
  specialties: rawChar.specialties ?? rollSpecialties(rawChar.quality), // retroactive
}
```

No `DB_VERSION` bump needed in `db.ts` -- IndexedDB stores are schemaless. The migration is purely in the `loadGame()` normalization layer, which is the established pattern.

### Offline Progression

The `IdleEngine` already handles offline catch-up (up to 24 hours). Character progression features that should advance offline:
- Cultivation + breakthroughs (already handled)
- Title promotion (auto-checked on load via realm comparison)
- Technique comprehension (if assigned to building -- needs tick during offline)

Features that should NOT advance offline:
- Cultivation path choice (player must be present)
- Skill equipment (player decision)
- Refinement (player action)

## Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| TypeScript strict mode | Catch field migration errors | `noUnusedLocals`, `noUnusedParameters` ensure new fields are used everywhere |
| Vitest | Unit tests for each new system | Pattern: one test file per system file, test pure functions directly |
| ESLint + Prettier | Code quality | Already configured, no changes needed |
| `fake-indexeddb` | Save migration tests | Add test cases for loading v7 saves with missing fields |

## Installation

```bash
# No new packages to install
# All required technology is already in package.json
```

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| State management | Zustand slices (existing) | Zustand `subscribeWithSelector` middleware | Unnecessary complexity. The current pattern of full-sect snapshots via `set({ sect: newSect })` works fine. `subscribeWithSelector` would help if we needed fine-grained subscriptions, but the tick loop already produces a single new sect object per tick. |
| State management | Zustand slices (existing) | Separate Zustand store for progression | Would break the established single-aggregate-root pattern. All character state belongs in SectStore because it's part of the Sect entity. |
| Save format | IndexedDB per-entity (existing) | JSON export/import | JSON export is nice-to-have for backup but not needed for progression. The existing per-entity pattern handles new fields naturally. |
| Animation | CSS transitions + CSS Modules (existing) | Framer Motion for path choice modal | Framer Motion is already a dependency but unused. It could add polish to the path choice modal, but CSS transitions are sufficient and more aligned with the ink-wash restraint principle. Defer unless the modal feels lifeless. |
| Combat extension | Modify CombatEngine in place | Separate CombatExtension system | The design spec's Phase 5 (AoE, freeze, reflect) requires CombatEngine changes. These should be done directly in CombatEngine.ts with clear conditional branches, not via an abstraction layer. The combat engine is ~200 lines, not yet complex enough to warrant a plugin system. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Redux / Redux Toolkit | Project committed to Zustand. Migrating to Redux would be a complete rewrite of 13 slices with no benefit. | Zustand slices (existing) |
| Immer (via `zustand/immer`) | Project uses immutable spread patterns (`{ ...state, field: newValue }`). Introducing Immer adds a dependency and a new pattern for zero benefit -- the tick loop produces entirely new sect objects each tick, so Immer's structural sharing is irrelevant. | Immutable spread (existing) |
| `zustand/middleware` persist | Project already has a custom save system via `idb` with versioned migration, offline catch-up, and per-entity stores. The Zustand `persist` middleware only supports single-key storage and has no migration strategy. | Custom `SaveSystem.ts` (existing) |
| Web Workers for tick calculation | The tick loop is fast enough (30 characters, simple math). Web Workers add async complexity, state synchronization problems, and debugging difficulty. If profiling shows tick > 16ms, optimize the algorithms first. | Main-thread tick (existing) |
| Entity-Component System (ECS) libraries | The game has a fixed entity model (Sect > Characters > Equipment/Techniques). ECS is designed for dynamic entity composition, which is not this game's pattern. | Fixed TypeScript interfaces (existing) |
| State machines (XState, etc.) | Character status is a simple enum, not a complex state machine. Adding XState for the cultivation path choice flow would be over-engineering for a one-shot decision. | Boolean checks + `needsCultivationPathChoice()` (existing pattern) |
| localStorage for game state | 5MB limit, synchronous API blocks main thread, no schema migration support. Project already migrated away from localStorage to IndexedDB. | IndexedDB via `idb` (existing) |
| Observable streams (RxJS) | The tick loop is a simple interval. RxJS would add 40KB+ bundle size for no meaningful benefit over `setInterval`. | `setInterval` in IdleEngine (existing) |

## Stack Patterns by Variant

**If the tick loop becomes slow (> 16ms):**
- Profile with Chrome DevTools Performance tab
- Optimize per-character calculations (avoid repeated array.find, pre-compute lookup maps)
- Consider batching character updates (process 10 per frame)
- Do NOT reach for Web Workers until algorithmic optimization is exhausted

**If save data grows beyond 5MB (unlikely):**
- IndexedDB has no practical size limit in modern browsers
- The per-entity store pattern already handles large datasets efficiently
- Consider pruning old adventure reports (> 50 reports) if size becomes a concern

**If real-time multiplayer is added (out of scope):**
- Would require a complete architectural shift to server-authoritative state
- Current stack is fundamentally client-side-only
- This is explicitly out of scope per PROJECT.md

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| zustand@5.0.12 | react@19.2.4 | Zustand 5 supports React 19 via `useSyncExternalStore`. Verified. |
| idb@8.0.3 | vitest@4.1.1 | `fake-indexeddb` 6.2.5 provides the IDB mock. Compatible. |
| typescript@5.9.3 | vite@8.0.2 | `tsc -b` for type checking, Vite handles transpilation. Compatible. |
| react-router-dom@7.13.2 | react@19.2.4 | React Router 7 supports React 19. Compatible. |

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| No new libraries needed | HIGH | All 12 subsystems in the design spec are pure-function game logic or data extensions. Reviewed each subsystem against existing architecture and confirmed fit. |
| Zustand slice pattern | HIGH | Project already has 13 slices. Adding fields to Character type and new actions to existing slices is the established pattern. Verified against Zustand 5 TypeScript guide (official docs). |
| Save migration strategy | HIGH | Existing `loadGame()` already normalizes missing fields with defaults. The pattern is proven across 8 save versions. New fields follow the same approach. |
| Tick loop integration | HIGH | Reviewed tickSlice.ts line by line. New operations (title check, comprehension tick) are O(1) per character. No performance concern. |
| Combat engine extension | MEDIUM | The design spec acknowledges AoE/freeze/reflect require CombatEngine changes (Phase 5). Current CombatEngine is single-target only. Extension is feasible but needs careful design to avoid breaking existing combat simulation. |
| IndexedDB for new fields | HIGH | IndexedDB object stores are schemaless. New fields on Character objects are stored automatically. No DB schema changes needed. |

## Sources

- Zustand official TypeScript guide (zustand.docs.pmnd.rs/guides/typescript) -- Verified slice pattern, `StateCreator` typing, middleware mutators
- Zustand Slices Pattern guide (zustand.docs.pmnd.rs/guides/slices-pattern) -- Confirmed project's slice composition matches official recommendation
- Project source code analysis -- `src/stores/sectStore/`, `src/systems/`, `src/types/character.ts`, `docs/superpowers/specs/2026-03-29-character-progression-design.md`
- Existing `package.json` -- All dependency versions verified

---
*Stack research for: EndlessQuest Character Progression Depth (P2)*
*Researched: 2026-04-02*
