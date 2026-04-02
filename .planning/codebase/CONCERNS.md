# Codebase Concerns

**Analysis Date:** 2026-04-02

## Tech Debt

**tickSlice.ts monolith:**
- Issue: `tickSlice.ts` is a 542-line single function that handles resource production, cultivation, breakthrough (with tribulation), technique comprehension, production queues, automation recruitment, automation run dispatch, milestone unlocking, and day rollover -- all in one `tickAll` callback.
- Files: `src/stores/sectStore/tickSlice.ts`
- Impact: Any change to breakthrough logic, resource math, or automation flow requires understanding the entire function. Testing individual sub-systems within the tick is only possible via integration tests through `tickAll`. Nested `set()` calls inside the `elapsedDays` loop (lines 471-530) mutate store state multiple times per tick, which is a correctness risk.
- Fix approach: Extract sub-functions for `processBreakthrough(char, resources)`, `processProductionQueues(buildings, vault, deltaSec)`, `processDayRollover(state)`, and `processAutomation(state)`. Each should return a delta or patch rather than calling `set()` directly. The `elapsedDays` loop should batch all mutations into a single `set()`.

**adventureStore.ts size and cross-store coupling:**
- Issue: `adventureStore.ts` is 1338 lines with 21 direct `useSectStore.getState()` calls. It reaches into SectStore to read characters, resources, buildings, and pets, and also writes back to SectStore for stats, character status, vault items, and milestone unlocks. This makes the two stores tightly coupled -- neither can be understood or tested in isolation without the other.
- Files: `src/stores/adventureStore.ts`, `src/stores/sectStore/tickSlice.ts`
- Impact: Any refactor to SectStore's shape or API requires auditing all 21 cross-store call sites in adventureStore. Test setup requires initializing both stores together. Circular dependency potential between tickSlice (which calls `useAdventureStore.getState().runAutomation`) and adventureStore (which calls `useSectStore.getState()`).
- Fix approach: Introduce a thin facade or event-bus layer where adventureStore publishes intents ("consume supplies", "set character status") rather than calling SectStore directly. Alternatively, co-locate the cross-store coordination in a dedicated `GameEngine` module that orchestrates both stores.

**Deprecated createPlayerCombatUnit alias:**
- Issue: A deprecated `createPlayerCombatUnit` function remains in `enemies.ts` with a TODO comment to remove it. No call sites exist in the codebase -- all have been migrated to `createCharacterCombatUnit`.
- Files: `src/data/enemies.ts` (lines 239-286)
- Impact: Dead code; minor confusion for contributors who see two similar factory functions.
- Fix approach: Delete the deprecated function and the TODO comment.

**Legacy top-level Sect fields duplicated in stats:**
- Issue: `Sect.totalAdventureRuns` and `Sect.totalBreakthroughs` exist as top-level fields on the `Sect` type (in `types/sect.ts` lines 109-110), but the same data concept overlaps with `Sect.stats.totalAdventureRuns` and `Sect.stats.totalBreakthroughAttempts`. The top-level fields are preserved across ascension in `LegacySystem.ts` (lines 84-85) but are never incremented anywhere in the current codebase -- only `stats.totalAdventureRuns` is incremented (in `adventureStore.ts` line 487). The top-level fields appear to be vestigial from a pre-stats era.
- Files: `src/types/sect.ts` (lines 109-110), `src/systems/sect/LegacySystem.ts` (lines 84-85), `src/systems/save/SaveSystem.ts` (lines 159-160), `src/stores/sectStore/initial.ts` (lines 75-76)
- Impact: Two sources of truth for the same concept. Save/load code persists both, increasing storage size and migration complexity.
- Fix approach: Remove `totalAdventureRuns` and `totalBreakthroughs` from the top level of `Sect`. Ensure `Sect.stats` (which is already preserved across ascension at line 107 in LegacySystem.ts) is the sole source. Update SaveSystem, db.ts migration, and LegacySystem accordingly.

**SaveMeta version mismatch:**
- Issue: The `SaveMeta` interface declares `version: 8` (line 21 of `SaveSystem.ts`), but the actual `saveGame()` write uses `version: 7` (line 152). The load code does not check version at all. The comment says "SaveMeta v8" but the persisted data is v7.
- Files: `src/systems/save/SaveSystem.ts` (lines 21, 152)
- Impact: No runtime impact currently because version is never read, but it will cause confusion during future migration work when version checks are needed.
- Fix approach: Align the interface declaration and the write value to the same number. Add a version check in `loadGame()` for forward compatibility.

## Known Bugs

**Garbled sacrifice reason string:**
- Symptoms: When a character dies during a successful adventure run, the sacrifice reason recorded is mojibake: `'缂備礁顦伴敋妞わ絻鍔戦獮瀣熷ú璇插Г'`. This appears to be a corrupted UTF-8 string rather than a meaningful Chinese message.
- Files: `src/stores/adventureStore.ts` (line 234)
- Trigger: A character with `memberState.status === 'dead'` during `settleRunMembers` after a successful run.
- Workaround: None -- the garbled string appears in event logs.

**completedDungeons not persisted:**
- Symptoms: `completedDungeons` in `AdventureStore` resets to `[]` on every page reload. The field is initialized as empty (line 384), never loaded from IndexedDB in `loadGame()`, and never written in `saveGame()`.
- Files: `src/stores/adventureStore.ts` (line 384), `src/systems/save/SaveSystem.ts`
- Trigger: Reload the page after completing a dungeon. The "cleared dungeons" count in the AdventurePage header resets to 0.
- Workaround: None. Milestone-based tracking (`archiveMilestones` with `firstDungeonClear`) does persist, but per-dungeon completion status is lost.

**Auto-save snapshot uses JSON.stringify for equality check:**
- Symptoms: Every state change triggers a full `JSON.stringify(state.sect)` for snapshot comparison. For large sects (30 characters with backpacks, 50 vault slots), this serialization is expensive and runs on every Zustand subscription callback.
- Files: `src/systems/save/startAutoSave.ts` (lines 22, 36)
- Trigger: Every tick (every 1 second during normal gameplay).
- Workaround: The 500ms debounce prevents actual save on every tick, but the stringification still occurs.

## Security Considerations

**IndexedDB with no encryption:**
- Risk: All game state is stored unencrypted in IndexedDB. A user or browser extension can read and modify game data trivially via DevTools.
- Files: `src/systems/save/db.ts`, `src/systems/save/SaveSystem.ts`
- Current mitigation: None. This is a single-player web game with no server-side validation, so the attack surface is limited to self-cheating.
- Recommendations: Not critical for a single-player game, but if leaderboards or competitive features are added, server-side validation would be required.

**No input sanitization on sect name:**
- Risk: The sect name field (if editable) could inject content. The initial name is hardcoded as `'无名宗门'`, but any future name input should be sanitized.
- Files: `src/stores/sectStore/initial.ts` (line 57)
- Current mitigation: No user-editable name input was found in current code.
- Recommendations: When name editing is added, sanitize before rendering and persisting.

## Performance Bottlenecks

**JSON.stringify in auto-save hot path:**
- Problem: `JSON.stringify(state.sect)` runs on every Zustand state change to determine if a save is needed. This is O(n) in state size and allocates a large string every tick.
- Files: `src/systems/save/startAutoSave.ts` (lines 22, 36)
- Cause: The snapshot comparison pattern avoids unnecessary saves but at the cost of serializing the entire sect tree every tick.
- Improvement path: Use a lightweight change counter or hash. Alternatively, use Zustand's `subscribeWithSelector` to compare only a shallow reference (`state.sect === prevState.sect` is already checked first, so the JSON.stringify only fires on actual changes -- this is acceptable but could be improved with a revision counter).

**tickAll processes all characters in a single pass:**
- Problem: `tickAll` iterates all characters and performs cultivation, breakthrough, and production in one synchronous pass. For large sects (30 characters), this blocks the main thread for the duration of the tick.
- Files: `src/stores/sectStore/tickSlice.ts`
- Cause: Single-threaded synchronous game loop with no batching or scheduling.
- Improvement path: Profile actual tick duration with 30 characters. If ticks exceed 16ms, consider splitting character processing across multiple frames using `requestIdleCallback` or batching. Currently capped at 30 characters by design, so this is a latent concern rather than an active problem.

**Array linear search for character lookup:**
- Problem: Multiple call sites use `sect.characters.find(c => c.id === charId)` to look up characters by ID. This is O(n) and occurs frequently in `adventureStore.ts`, `tickSlice.ts`, and `AutoRunEngine.ts`.
- Files: `src/stores/adventureStore.ts` (lines 252, 356, 363, 399, 424), `src/systems/roguelike/AutoRunEngine.ts` (lines 69, 115, 124), `src/stores/sectStore/tickSlice.ts` (lines 46, 47, 48)
- Cause: Characters are stored as an array rather than a map.
- Improvement path: For 30 characters this is negligible, but if the cap increases, consider maintaining a `Map<string, Character>` index alongside the array, or restructure `sect.characters` as a `Record<string, Character>`.

## Fragile Areas

**tickSlice elapsedDays loop:**
- Files: `src/stores/sectStore/tickSlice.ts` (lines 469-530)
- Why fragile: The loop calls `set()` inside a loop body, then immediately reads back via `get()` to check auto-recruit and build automation config. Each iteration depends on the state committed by the previous iteration. If React batches these updates or if Zustand's batching behavior changes, the loop logic could break silently.
- Safe modification: Extract the day-rollover logic into a pure function that takes a state and returns a new state, then apply the final result in a single `set()`. Avoid reading back state mid-loop.
- Test coverage: The `stores.test.ts` file tests tick behavior but primarily at the integration level. The multi-day loop with automation is not explicitly tested for correctness of intermediate states.

**SaveSystem migration path:**
- Files: `src/systems/save/db.ts` (lines 64-101)
- Why fragile: The v1-to-v2 migration reads from the old 'save' object store and writes to new per-entity stores within the same transaction. The `saveStore.getAll().then(...)` uses an async callback inside an IndexedDB upgrade transaction, which is not guaranteed to complete before the transaction auto-closes on some browsers.
- Safe modification: If adding a v3+ migration, avoid async patterns inside `upgrade()`. Use synchronous cursor iteration or pre-read all data before the upgrade transaction.
- Test coverage: `db.test.ts` tests database operations but the v1-to-v2 migration path is only covered by the SaveSystem integration test with a legacy localStorage entry.

**adventureStore startRun validation cascade:**
- Files: `src/stores/adventureStore.ts` (lines 387-496)
- Why fragile: The `startRun` function has 8+ validation checks (dungeon exists, run count, team size, spirit stone cost, vault items, character existence, character status, character not already in another run). If any check fails after resources have already been consumed (lines 414-418 deduct spirit stones before all character validations at lines 422-433), the function returns `null` without refunding.
- Safe modification: Move all validation checks before any state mutations (resource deductions, character status changes). Ensure "validate all, then mutate" pattern.
- Test coverage: `stores.test.ts` covers individual validation failures but may not cover the specific case where spirit stones are deducted and then a later validation fails.

## Scaling Limits

**Character cap:**
- Current capacity: 30 characters max (controlled by `getMaxCharacters(sectLevel)` in `CharacterEngine.ts`)
- Limit: Hardcoded cap based on sect level. No pagination or virtualization in CharactersPage.
- Scaling path: If character cap increases significantly, the CharactersPage grid (which renders all characters) will need virtualization. The tick loop complexity scales linearly with character count.

**Vault cap:**
- Current capacity: 50 slots (`maxVaultSlots` in initial state)
- Limit: Vault rendering iterates all items; no pagination. `addItemQuantityToStacks` scans the full vault on each insert.
- Scaling path: Increase `maxVaultSlots` with building upgrades; add virtualized list if slots exceed ~100.

**Event log:**
- Current capacity: 200 events in memory (`MAX_EVENTS` in `eventLogStore.ts`). History in IndexedDB is unbounded.
- Limit: No pruning of IndexedDB history. Over time, `history` object store grows without limit.
- Scaling path: Add periodic pruning of history entries older than N days or keep only the latest M entries in IndexedDB.

**Report storage:**
- Current capacity: 30 reports (`REPORT_LIMIT` in `adventureStore.ts` line 122)
- Limit: Report details are held in memory (reportDetails record) and also persisted to IndexedDB. Only 30 summaries are kept, but older reports are deleted from `reportDetails` when they fall off the list.
- Scaling path: Adequate for current design. If longer history is needed, implement pagination.

## Dependencies at Risk

**idb (IndexedDB wrapper):**
- Risk: The `idb` package provides the IndexedDB abstraction used for all persistence. It is a small, well-maintained library, but any breaking change in the IndexedDB API across browsers could affect the custom migration logic in `db.ts`.
- Impact: All save/load functionality breaks.
- Migration plan: Monitor `idb` releases. The current usage is straightforward (openDB, transactions, getAll, put, delete) and unlikely to be affected by minor updates.

**Zustand cross-store subscriptions:**
- Risk: The pattern of `useSectStore.getState()` calls from within `adventureStore` and `tickSlice` creates implicit coupling. If Zustand changes how subscriptions or getState work in future major versions, the cross-store coordination could break.
- Impact: Game loop stops functioning correctly.
- Migration plan: Consider introducing a mediator layer before upgrading Zustand major versions.

## Missing Critical Features

**No error recovery for save failures:**
- Problem: `saveGame()` catches errors with `console.error` but does not notify the user or retry. If IndexedDB is unavailable (private browsing in some browsers, storage quota exceeded), saves fail silently.
- Files: `src/systems/save/SaveSystem.ts` (lines 235-237)
- Blocks: Players could lose progress without knowing.

**No data integrity verification on load:**
- Problem: `loadGame()` does basic empty-check (characters and buildings both empty = corrupted) but does not verify that all required fields on loaded entities are present and valid. The `normalizeFiniteNumber` and `normalizeResources` helpers provide some defense, but character-specific fields (e.g., `specialties`, `fateTags`, `cultivationPath`) use `?? []` / `?? 'none'` fallbacks without logging warnings.
- Files: `src/systems/save/SaveSystem.ts` (lines 244-412)
- Blocks: Silent data degradation if save format changes between versions without proper migration.

## Test Coverage Gaps

**tickSlice multi-day automation loop:**
- What's not tested: The `elapsedDays > 0` loop in tickSlice (lines 469-530) that processes auto-recruit and automation run dispatch per game day is tested only indirectly through `stores.test.ts` integration tests. No test verifies that automation runs fire exactly the right number of times for N elapsed days.
- Files: `src/stores/sectStore/tickSlice.ts` (lines 469-530)
- Risk: A bug in day-loop automation (e.g., double-recruiting, skipping days) would not be caught.
- Priority: High

**Page components:**
- What's not tested: Most page components (`BuildingsPage.tsx` 860 lines, `CharactersPage.tsx` 868 lines, `VaultPage.tsx` 441 lines) have minimal test coverage. BuildingsPage has a test file but it only covers basic rendering. CharactersPage has limited interaction tests. VaultPage has no test file.
- Files: `src/pages/BuildingsPage.tsx`, `src/pages/CharactersPage.tsx`, `src/pages/VaultPage.tsx`
- Risk: UI regressions in complex pages go undetected. The inline helper functions (icon name mappers, etc.) are untested.
- Priority: Medium

**adventureStore startRun partial mutation:**
- What's not tested: The sequence where `startRun` deducts spirit stones (line 414) and vault items (lines 417-418) before validating all character states (lines 422-433). If a later validation fails, the resources are already consumed with no refund.
- Files: `src/stores/adventureStore.ts` (lines 387-496)
- Risk: Resource loss when attempting to start a run with an invalid team composition after resources are already deducted.
- Priority: High

**Cross-store state consistency:**
- What's not tested: After `completeRun` or `failRun`, the consistency between adventureStore's activeRuns and sectStore's character statuses and resources. For example, if `completeRun` throws mid-execution, characters could be left in 'adventuring' status permanently.
- Files: `src/stores/adventureStore.ts`, `src/stores/sectStore/characterSlice.ts`
- Risk: Orphaned character states (stuck in 'adventuring' or 'patrolling') that cannot be recovered without a full save reset.
- Priority: Medium

**stores.test.ts size:**
- What's not tested (ironically): At 2496 lines, `stores.test.ts` is the largest file in the codebase. It mixes unit tests for many different slices in a single file. This makes it slow to run, hard to navigate, and increases the chance of test pollution (shared state between describe blocks).
- Files: `src/__tests__/stores.test.ts`
- Risk: Tests may pass or fail depending on execution order. Slow feedback loop discourages running tests frequently.
- Priority: Medium

---

*Concerns audit: 2026-04-02*
