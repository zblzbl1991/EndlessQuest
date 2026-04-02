# Pitfalls Research

**Domain:** Idle Roguelike Web Game -- Character Progression Extension
**Researched:** 2026-04-02
**Confidence:** HIGH (codebase-verified, design-spec cross-referenced)

## Critical Pitfalls

### Pitfall 1: Save Migration Without Version Gates

**What goes wrong:**
Adding new fields to the Character type (`cultivationPath`, `learnedSkills`, `techniqueComprehension`) without a proper save version gate means old saves silently lose data or crash. The codebase already has a SaveMeta version mismatch (interface declares `version: 8`, `saveGame()` writes `version: 7`, `loadGame()` never checks version at all -- SaveSystem.ts lines 21, 152). The `loadGame()` function uses `?? defaultValue` fallbacks scattered across 20+ lines of character normalization (lines 289-316), which is fragile "hope-based migration" rather than intentional versioned migration.

**Why it happens:**
The v1-to-v2 migration in db.ts (lines 63-101) uses `getAll().then(async ...)` inside an IndexedDB upgrade transaction, which is not guaranteed to complete before the transaction auto-closes on some browsers. This existing pattern is already broken but "works" because few users still have v1 saves. Developers see the existing `?? fallback` pattern and replicate it instead of building proper migration.

**How to avoid:**
1. Before any Character type change, bump `DB_VERSION` in db.ts (currently 3) and add a version-gated migration block.
2. Add an explicit `loadMigrationVersion` check in `loadGame()` that applies field-by-field defaults based on version number, not `??` scattered across normalize code.
3. Align `SaveMeta.version` declaration (line 21) and `saveGame()` write value (line 152) to the same number. Write a test that asserts these match.
4. For the character-progression work specifically: write a single `migrateCharacterV3(c: any): Character` function that explicitly adds `cultivationPath`, `learnedSkills`, `techniqueComprehension` with deterministic defaults based on character state (realm 0 -> null path, realm >= 1 -> 'sword'; empty learnedSkills; existing techniques -> 100% comprehension).

**Warning signs:**
- A new field is added to the Character type but the only "migration" is `c.newField ?? defaultValue` in loadGame.
- DB_VERSION is not incremented after a type change.
- SaveMeta.version and the written version diverge.
- Tests load saves without verifying migration of new fields.

**Phase to address:**
Phase 1 (Foundation) -- before any Character type changes. The save migration infrastructure must exist before the first new field is written.

---

### Pitfall 2: Tick Performance Collapse From Per-Character Stat Recalculation

**What goes wrong:**
`tickSlice.ts` already processes all characters in a single synchronous pass (lines 172-368). Currently it does cultivation tick + breakthrough check per character. The character progression design adds: title promotion check, cultivation path stat modifier lookup, technique comprehension increment, fate tag effect evaluation, and (for Phase 4+) set bonus calculation and mechanical talent queries -- all per character per tick. Each new system adds more `find()`, `filter()`, and object spread operations inside the hot loop. At 30 characters with 5-6 new systems, the tick could easily exceed the 16ms frame budget.

**Why it happens:**
The design spec (sections 1.4, 5.4, 8.5, 10.6) correctly identifies integration points but treats them as "add a call here" without accounting for the multiplicative cost. The existing tick is already 542 lines and handles 8+ concerns. Each addition seems small in isolation but they compound in the same hot loop. The `calcCharacterTotalStats()` function (which the design calls for adding title bonuses, set bonuses, fate tag crit) is called from combat and display, but if it is also called during tick for any reason, the cost multiplies.

**How to avoid:**
1. **Extract the character-processing loop from tickSlice into a pure function.** The `tickAll` should call `processCharacters(characters, resources, deltaSec): { updatedCharacters, resourceDeltas, events }`. This is testable independently and measurable.
2. **Profile before and after each system addition.** Add a `performance.now()` measurement in tickAll (dev mode only) that logs a warning if tick exceeds 8ms. The current tick should be measured first as a baseline.
3. **Use lazy stat calculation.** Do not recalculate `calcCharacterTotalStats()` during tick. Compute it on-demand when combat starts or when the UI renders. The tick should only update raw data (realm, cultivation, equipped gear), not derived stats.
4. **Debounce non-critical updates.** Title promotion checks do not need to run every tick -- they only matter on breakthrough, which is already a discrete event. Technique comprehension increments can be batched.

**Warning signs:**
- Any new system adds work inside the `sect.characters.map(...)` loop in tickSlice.
- `calcCharacterTotalStats()` is called from within tickAll.
- A single character's tick processing involves more than 3 object spreads.
- `performance.now()` delta in tickAll exceeds 5ms for 30 characters.

**Phase to address:**
Phase 1 -- extract tick character loop as a pure function before adding any progression systems. Then each phase measures the incremental cost.

---

### Pitfall 3: Cross-Store Coupling Explosion During Integration

**What goes wrong:**
`adventureStore.ts` already has 21 direct `useSectStore.getState()` calls (verified: 120 total cross-store calls across 17 files). The progression design adds new integration points where adventureStore must check character cultivation paths, element affinities, equipped skills, pet combat integration, and set bonuses during combat -- all of which read from SectStore. Each new system that adventureStore needs to query increases the coupling surface. The circular dependency between tickSlice (which calls `useAdventureStore.getState().runAutomation`) and adventureStore (which calls `useSectStore.getState()`) is already flagged as fragile (CONCERNS.md line 16).

**Why it happens:**
The design spec (section 13.1) lists "files to modify" but each modification adds another `useSectStore.getState()` call in adventureStore or another cross-store call in tickSlice. There is no abstraction layer between the two stores. Developers follow the existing pattern because it "works" -- direct state access is the path of least resistance in Zustand.

**How to avoid:**
1. **Introduce a thin read-only facade.** Create `src/stores/sectFacade.ts` that exports typed query functions: `getCharacterById(id)`, `getSectResources()`, `getActiveRoute()`. AdventureStore calls the facade, not `useSectStore.getState()` directly. This limits coupling to one file and makes future refactors traceable.
2. **For write operations, use event-style intents.** Instead of adventureStore directly calling `useSectStore.getState().setCharacterStatus()`, have it call `sectStore.setCharacterStatus()` through the facade. The facade can batch, validate, or redirect.
3. **Do not add new cross-store calls to tickSlice.** The progression systems that need tick integration (title promotion, technique comprehension) should live in tickSlice itself, not in a separate store. If a new store is created for progression state, tickSlice should not reach into it -- the progression data should be part of SectStore's character data.

**Warning signs:**
- A new `useSectStore.getState()` call appears in adventureStore.ts.
- tickSlice imports from a new store that was not there before.
- A system file imports more than one store.
- Test setup for a system requires initializing more than one store.

**Phase to address:**
Phase 2 (Core Differentiation) -- the cultivation path and element affinity systems will be the first to add new cross-store queries. The facade should be created before these systems are implemented.

---

### Pitfall 4: Auto-Save Performance Degradation From State Bloat

**What goes wrong:**
`startAutoSave.ts` runs `JSON.stringify(state.sect)` on every Zustand state change (line 22). Currently this serializes a sect with up to 30 characters, each with backpacks, gear, skills, techniques. The character progression design adds: `learnedSkills: string[]`, `techniqueComprehension: Record<string, number>`, expanded `FateTagEffect` objects, `MechanicalTalentEffect` on talents, set bonus definitions in item data, and pet skill equipment. Each addition increases the serialization payload. The 500ms debounce prevents actual saves on every tick, but the stringification itself happens on every state change, not just every tick.

**Why it happens:**
The auto-save subscription fires on every `state.sect !== prevState.sect` change (Zustand reference equality). Since tickSlice creates a new sect object every tick via spread, the check passes every tick, and `JSON.stringify` runs every tick regardless. The design spec adds more data to characters, which directly increases the stringification cost per tick. With 30 characters and 6 new fields each, the serialized string grows by ~30-50%.

**How to avoid:**
1. **Replace JSON.stringify snapshot with a revision counter.** Add a `_rev: number` field to Sect that increments on every mutation. The auto-save subscription compares `_rev` instead of stringifying the entire state.
2. **Alternatively, use `subscribeWithSelector` to compare only the fields that matter for save decisions** -- resources, characters (by count and max ID), and a checksum. This avoids serializing the full state tree on every tick.
3. **Measure the current stringification cost.** Add timing in dev mode. If it exceeds 1ms, it is already too expensive and the revision counter should be implemented before adding more state.
4. **Defer the auto-save performance fix to a dedicated task, but do not let state bloat accumulate without measuring.** Each phase that adds Character fields should include a quick performance check.

**Warning signs:**
- `JSON.stringify(state.sect)` takes more than 1ms on a typical sect.
- Auto-save triggers more than once per second in dev tools network tab.
- The serialized sect JSON exceeds 500KB.
- Page becomes sluggish after 30+ minutes of gameplay.

**Phase to address:**
Phase 1 -- measure baseline stringification cost. Phase 2 -- implement revision counter if baseline is already high, before adding new fields.

---

### Pitfall 5: Breakthrough Logic Duplication in TickSlice

**What goes wrong:**
CONCERNS.md (line 67) notes that breakthrough logic is duplicated ~150 lines in tickSlice. The character progression design adds three new things that happen "on breakthrough": cultivation path choice (section 1.3), title promotion check (section 8.3), and technique comprehension increment (section 10.6). The design spec says to add these inside tickSlice's breakthrough handling. The problem: there are already 4 separate breakthrough code paths in tickSlice (tribulation success, tribulation failure, non-tribulation major success, non-tribulation sub-level success/failure). Each new "on breakthrough" hook must be added to all 4 paths, or behavior will be inconsistent. Missing one path is a subtle bug.

**Why it happens:**
The tickSlice handles breakthrough inline rather than calling a single `handleBreakthrough(char, context)` function. Each breakthrough path has its own copy of the success/failure handling with slight variations (tribulation vs non-tribulation, major vs sub-level). When a new post-breakthrough action is needed, developers add it to the path they are testing and miss the others.

**How to avoid:**
1. **Extract a single `processBreakthrough(char, context): BreakthroughResult` pure function** that handles all breakthrough logic (tribulation check, failure rate, success/failure, stat growth, fate tags) and returns a result object with all post-breakthrough state changes.
2. **Define a `PostBreakthroughHook[]` list.** Each progression system that needs to act on breakthrough registers a hook: title promotion hook, comprehension increment hook, cultivation path choice hook. The single breakthrough function calls all hooks on the result. This ensures every path runs every hook.
3. **Test the hook list exhaustively.** Write a test that verifies all registered hooks fire for every breakthrough path (tribulation success, tribulation failure, non-trib major success, non-trib sub-level success).

**Warning signs:**
- More than one breakthrough code path in tickSlice does not run the same post-breakthrough logic.
- A post-breakthrough feature (title promotion, comprehension) works for some breakthrough types but not others.
- Breakthrough handling in tickSlice exceeds 200 lines.

**Phase to address:**
Phase 1 -- extract the breakthrough function before adding title promotion (section 8) and comprehension increment (section 10). This is a prerequisite for clean integration.

---

### Pitfall 6: Quality Label Scattered Across 7+ Files

**What goes wrong:**
`QUALITY_ORDER` is defined independently in at least 4 files: `src/data/items.ts` (line 3), `src/stores/sectStore/buildingSlice.ts` (line 12), `src/stores/sectStore/characterSlice.ts` (lines 222-223). The character progression design adds quality-based logic in at least 3 more places: refinement max counts per quality (section 6.3), pet skill slot unlocking per quality (section 4.4), and talent rarity per quality (section 9.2). Each new quality-dependent feature risks defining its own quality order or making assumptions about quality indices that may not match.

**Why it happens:**
There is no single `src/data/qualities.ts` file with the canonical quality order, rank, and derived constants. Each file that needs quality ordering redefines the array. When a new quality is added (hypothetically) or quality-based logic is needed, developers do not know which definition is authoritative.

**How to avoid:**
1. **Create `src/data/qualities.ts` with a single canonical `QUALITY_ORDER`, `QUALITY_RANK`, and quality-dependent lookup tables.** Export everything from there.
2. **Remove all inline `QUALITY_ORDER` definitions** from buildingSlice, characterSlice, and items.ts. Import from qualities.ts.
3. **For the progression work specifically, put quality-dependent constants (refinement caps, pet skill slots, talent rarity weights) in the same file** so they are visibly consistent.

**Warning signs:**
- A file defines its own quality array instead of importing one.
- Quality-based logic uses magic numbers (0, 1, 2, 3, 4) instead of a lookup.
- A new feature introduces quality-dependent behavior without referencing a central quality definition.

**Phase to address:**
Phase 1 -- consolidate quality definitions before adding new quality-dependent systems (refinement, pet skills).

---

### Pitfall 7: Feature Creep Through "It's Just a Lookup Table"

**What goes wrong:**
The character progression design spec includes 12 interconnected subsystems. The design document itself warns that AoE skills and counter-attack mechanics require CombatEngine extensions (section 1.5 note). But the "just a lookup table" systems -- cultivation path multipliers, element affinity bonuses, technique comprehension rates -- all need to be consumed somewhere. Each "simple lookup" requires at least one integration point in an existing system. The 12 subsystems touch 15+ existing files (section 13.1). The design says "each subsystem can be independently implemented" but the integration points are shared: `calcCharacterTotalStats()`, `tickSlice`, `CombatEngine`, `SaveSystem`. These shared integration points become serialization bottlenecks where changes from 4 different subsystems collide.

**Why it happens:**
Each subsystem looks small in isolation: "add a lookup table for cultivation path stat multipliers." But the integration point (`calcStatGrowth()` in CultivationEngine, called from tickSlice) is shared. When cultivation path, title promotion, and fate tag crit all modify the same stat calculation function, the subsystems are not truly independent. Developers merge changes to shared files and create merge conflicts or subtle ordering bugs (does path multiplier apply before or after title bonus?).

**How to avoid:**
1. **Strict phase boundaries with integration locks.** Only one subsystem modifies a shared integration point per phase. Phase 2 does cultivation path (modifies calcStatGrowth). Phase 2 does NOT also add fate tag crit (modifies calcCharacterTotalStats). Even if both modify stats, they target different functions.
2. **Define stat calculation ordering explicitly.** Document: base stats -> quality multipliers -> path modifiers -> title bonuses -> equipment -> set bonuses -> fate tag effects -> talent bonuses. Each phase adds one layer. The ordering is a fixed protocol, not ad hoc.
3. **Resist Phase 5.** The design labels AoE, counter-attack, and phoenix-blood mechanics as "optional." Treat them as out of scope for this milestone. Adding CombatEngine mechanics is a separate milestone, not the tail end of this one.

**Warning signs:**
- Two subsystems in the same phase both modify the same file.
- A PR modifies `calcCharacterTotalStats()` or `tickSlice.ts` for more than one subsystem.
- The phase implementation order does not match the dependency graph.
- Someone says "we might as well add X while we're in this file."

**Phase to address:**
Roadmap planning -- phase boundaries must enforce the one-subsystem-per-shared-file rule.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Adding `?? defaultValue` in loadGame for new fields | Fast, no version bump needed | Silent data loss for edge cases; migration debt accumulates; no way to distinguish "field was missing" from "field was set to default" | Never for this project -- save migration is a user-facing concern |
| Inline quality arrays | No import needed, self-contained | Divergent orderings, magic numbers, missed quality-level logic | Never -- consolidate into single source |
| Adding breakthrough logic inline in tickSlice | Quick, follows existing pattern | Duplication across 4 breakthrough paths; missing paths on new features | Never -- extract to pure function first |
| Cross-store `getState()` calls | Direct access, no abstraction layer | 120+ coupling points; circular dependency risk; test isolation impossible | Only in standalone utility functions that cannot receive state as parameters |
| JSON.stringify snapshot comparison | Simple change detection | O(n) serialization every tick; cost grows with state size | Only until a revision counter is implemented (Phase 1) |
| Adding new fields without migration tests | Faster implementation | Regressions caught only by manual testing; save corruption goes undetected | Never -- every new Character field must have a migration test |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Per-character stat recalculation every tick | Frame drops, stuttering during gameplay | Lazy stat calculation; only compute on combat/UI render; tick updates raw data only | Exceeds 16ms per tick at ~30 characters with 3+ progression systems active |
| JSON.stringify on every state change | CPU spike every second in dev tools profiler | Replace with revision counter or selective comparison | Serialized state exceeds 200KB (estimated ~150KB currently) |
| Array.find for character lookup in hot paths | Negligible at 30 chars, but adventureStore uses it 10+ times per action | Maintain Map<string, Character> index if cap increases beyond 50 | Exceeds ~50 characters (current cap is 30, safe but should be monitored) |
| Synchronous tick processing blocking main thread | UI freezes during complex ticks (multi-day offline catchup) | Split multi-day loop across frames with requestIdleCallback | Offline catchup > 10 days with full automation enabled |
| Production queue processing for all buildings every tick | Wasted cycles on inactive buildings | Skip buildings with no active recipe (already partially done) | Beyond current 2 processing buildings; not a current risk |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| IndexedDB save data tampering | Players can modify character stats, resources, or realm via DevTools | Not critical for single-player. If leaderboards ever added, all validated stats must be recomputed from seed + action log, not trusted from save data |
| No save integrity hash | Corrupted saves load with silent data loss rather than clear error | Add a lightweight hash (xxhash of JSON) to SaveMeta. On load, verify hash matches. If mismatch, offer "recover what we can" instead of silent partial load |
| Spirit stone deduction before validation (startRun) | Resources consumed even if run fails to start (CONCERNS.md line 107) | Move all validation before any state mutation. "Validate all, then mutate" pattern |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Cultivation path choice during auto-breakthrough | Player misses the choice window, gets default 'sword' path | Design spec already handles this (section 1.3: default sword for offline). Ensure the path-choice UI is shown when player returns and character is at realm 0 with full cultivation, not just in the breakthrough moment |
| Technique comprehension feels like "nothing happened" | Player sees technique at 20% with no visible effect until 50% milestone | Show partial effect scaling in UI: "Fire Palm +3 ATK (20% of +15)" so incremental progress is visible |
| Set bonus items spread across dungeons with no hint | Player never collects a full set because they do not know which dungeon drops which set | Show set piece sources in item tooltips: "Thunder Set: found in Falling Cloud Cave" |
| Title promotion is automatic and invisible | Player does not realize disciple became seniorDisciple; no sense of achievement | Add an event log entry AND a brief toast notification on title promotion, since it is a milestone moment |
| 12 new systems overwhelming the disciple detail page | Character detail page becomes a wall of tabs/sections | Follow the existing "present, don't direct" principle. Show only the 2-3 most relevant progression aspects per character context (cultivation path on breakthrough, skills on combat, comprehension on technique study) |

## "Looks Done But Isn't" Checklist

- [ ] **Save migration for new Character fields:** Often missing edge cases -- verify migration handles characters with realm 0 (should get null path), realm >= 1 (should get 'sword' default), and characters with existing learned techniques (should get 100% comprehension on those specific techniques)
- [ ] **Breakthrough hook completeness:** Often missing the tribulation path -- verify title promotion, comprehension increment, and path choice all fire for tribulation success AND non-tribulation success AND sub-level success
- [ ] **Default cultivation path for existing characters:** Often inconsistent -- verify that loadGame migration, tickSlice breakthrough guard, and UI display all agree on what 'none' vs 'sword' means for pre-existing characters at various realms
- [ ] **EquippedSkills migration from [] to [null,null,null,null]:** Often breaks combat -- verify CombatEngine handles both old format (empty array) and new format (4-slot array with nulls) during migration period
- [ ] **Pet combat integration in adventureStore:** Often only added to manual run, not automation -- verify AutoRunEngine also assembles pet CombatUnits for automated runs
- [ ] **Refinement cost deduction order:** Often deducts resources before validation -- verify spirit stone and ore balance checked BEFORE deduction, following the startRun pattern that is already known to be buggy (CONCERNS.md line 107)
- [ ] **Set bonus application timing:** Often applied during tick instead of at combat time -- verify set bonuses are NOT recalculated every tick but only when combat starts or when the character detail page renders

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Save migration failure (data loss) | HIGH | Write a "repair save" utility that loads raw IndexedDB data, applies all migrations in sequence, and writes back. Include in loadGame as a fallback path |
| Cross-store coupling exceeds manageable threshold | MEDIUM | Extract facade layer; grep-and-replace all `useSectStore.getState()` calls in adventureStore with facade calls. Test after each batch of replacements |
| Tick performance exceeds frame budget | MEDIUM | Profile to identify bottleneck. Extract pure functions. Add requestIdleCallback for non-critical processing. Reduce tick frequency for idle characters |
| Quality definition divergence | LOW | Create qualities.ts, update all imports, run tests. The change is mechanical and testable |
| Breakthrough logic duplication causes missed hooks | MEDIUM | Extract to pure function with hook list. Add integration test that verifies all hooks fire for all breakthrough paths |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Save migration without version gates | Phase 1 (before any type change) | Test: load a save without new fields, verify migration produces valid characters with correct defaults |
| Tick performance collapse | Phase 1 (extract pure function, add perf measurement) | Test: profile tickAll with 30 characters + all progression systems, verify under 8ms |
| Cross-store coupling explosion | Phase 2 (create facade before adding path/affinity queries) | Test: grep for new `useSectStore.getState()` in adventureStore, count should be 0 |
| Auto-save state bloat | Phase 1 (measure baseline) / Phase 2 (revision counter if needed) | Test: verify auto-save does not trigger JSON.stringify more than once per tick |
| Breakthrough logic duplication | Phase 1 (extract pure function with hook list) | Test: all 4 breakthrough paths fire all registered hooks |
| Quality label scatter | Phase 1 (consolidate into qualities.ts) | Test: grep for inline quality arrays, count should be 0 |
| Feature creep through shared integration points | Roadmap planning (enforce one subsystem per shared file per phase) | Review: each phase modifies shared files for at most one subsystem |

## Sources

- Codebase analysis: `.planning/codebase/CONCERNS.md` (120 cross-store calls, 542-line tickSlice, SaveMeta version mismatch)
- Design spec: `docs/superpowers/specs/2026-03-29-character-progression-design.md` (12 subsystems, 15+ file modifications)
- Source verification: `src/stores/sectStore/tickSlice.ts` (4 breakthrough paths, inline duplication)
- Source verification: `src/systems/save/SaveSystem.ts` (version 7 written, version 8 declared, no load check)
- Source verification: `src/systems/save/startAutoSave.ts` (JSON.stringify on every state change)
- Source verification: `src/stores/adventureStore.ts` (21 cross-store calls, startRun validation order)
- Source verification: `src/types/character.ts` (current type definition, new fields planned)
- Source verification: `src/systems/save/db.ts` (async migration in upgrade transaction)

---
*Pitfalls research for: Idle Roguelike Character Progression Extension*
*Researched: 2026-04-02*
