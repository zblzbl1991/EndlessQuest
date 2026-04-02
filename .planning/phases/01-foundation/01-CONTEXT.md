# Phase 1: Foundation - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning
**Source:** Claude's Discretion (user delegated all decisions for this tech-debt phase)

<domain>
## Phase Boundary

Clean up technical debt that blocks all subsequent character progression features: specialty integration, quality label consolidation, save migration infrastructure, tick breakthrough extraction, garbled string fixes, and duplicate code deduplication. No new user-facing features — purely internal restructuring.

</domain>

<decisions>
## Implementation Decisions

### Specialty Integration (FOUND-01)
- **D-01:** Call `rollSpecialties()` inside `generateCharacter()` in `CharacterEngine.ts`, persist result on `Character.specialties`
- All downstream code already exists (`SpecialtySystem.getBuildingBonus()`, `CharacterDispositionSystem`)

### Quality Consolidation (FOUND-02)
- **D-02:** Centralize `QUALITY_NAMES` and `QUALITY_ORDER` in `src/data/uiCopy.ts` (already partially used for UI copy)
- Import from single source in all 7 locations: BuildingsPage, CharactersPage, CharacterCard, AlchemyPanel, ForgePanel, MarketPanel, characterSlice
- Remove local `QUALITY_LABELS`, `QUALITY_NAMES_CHAR`, `qualityLabel` definitions

### Save Migration (FOUND-03)
- **D-03:** Add version check in `SaveSystem.loadGame()`. Current `SaveMeta` interface says v8 but writes v7 — fix to consistent v8
- New Character fields get safe defaults via `?? defaultValue` in normalization layer (existing pattern)
- Bump DB_VERSION only if IDB schema changes (not needed for Character field additions)

### Tick Breakthrough Extraction (FOUND-04)
- **D-04:** Extract breakthrough logic from `tickSlice.ts` (lines 192-365, ~175 lines) into a pure function in `src/systems/cultivation/BreakthroughCoordinator.ts`
- The coordinator receives character + resources + context, returns `{ updatedChar, events, resourceCost }`
- `tickSlice` calls the coordinator and applies results — tick loop stays thin
- Hook pattern: coordinator calls `onBreakthroughSuccess(char)` callbacks that future phases can extend

### Garbled Strings (FOUND-05)
- **D-05:** Replace line 234 garbled string with `'在秘境中陨落'` (matches line 251)
- Replace line 1254 garbled string with `'灵兽挣脱了束缚，未能捕获。'`

### Code Deduplication (FOUND-06)
- **D-06:** Extract `getRunBuildBiasContext()` from both `adventureStore.ts:197` and `AutoRunEngine.ts:167` into `src/systems/roguelike/RunBuildContext.ts`
- Extract `getSectLevel()` from `adventureStore.ts:278-290`, replace with import from `CharacterEngine.calcSectLevel`

### Claude's Discretion
- Exact file structure within each module
- Test coverage targets for refactored code
- Whether to split BreakthroughCoordinator into separate files per concern
- Migration version numbering strategy

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Codebase Analysis
- `.planning/codebase/CONCERNS.md` — All 6 issues this phase addresses, with file paths and line numbers
- `.planning/codebase/ARCHITECTURE.md` — Store architecture, data flow, integration points
- `.planning/codebase/CONVENTIONS.md` — Code style, naming patterns, pure-function system pattern

### Existing Code (must read before modifying)
- `src/stores/sectStore/tickSlice.ts` — Breakthrough logic to extract (lines 192-365)
- `src/stores/adventureStore.ts` — Garbled strings (lines 234, 1254), duplicated helpers (lines 197, 278-290)
- `src/systems/roguelike/AutoRunEngine.ts` — Duplicated `getRunBuildBiasContext` (line 167)
- `src/systems/character/CharacterEngine.ts` — `generateCharacter()` for specialty integration, `calcSectLevel` for dedup
- `src/systems/character/SpecialtySystem.ts` — `rollSpecialties()` to integrate
- `src/systems/save/SaveSystem.ts` — Save migration pattern
- `src/data/uiCopy.ts` — Centralized UI copy (target for quality label consolidation)

### Design Specs
- `.planning/research/PITFALLS.md` — Save migration pitfalls, tick performance risks
- `.planning/research/SUMMARY.md` — Phase 1 must establish infrastructure first

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SpecialtySystem.rollSpecialties()`: Already fully implemented, just needs calling from `generateCharacter()`
- `CharacterEngine.calcSectLevel()`: Already exported, just needs import in adventureStore
- `EquipmentEngine.refineEquipment()` + `getEffectiveStats()`: Backend done (relevant for Phase 4)

### Established Patterns
- Pure-function systems: All systems export functions, stores apply results via `set()`
- Slice pattern: `StateCreator<SectStore>` functions composed in `index.ts`
- Save migration: New fields get `?? defaultValue` in `loadGame()` normalization

### Integration Points
- `tickSlice.ts`: Main integration point for breakthrough hooks
- `CharacterEngine.ts`: Entry point for specialty integration
- `SaveSystem.loadGame()`: Entry point for migration logic
- `adventureStore.ts`: Consumer of deduplicated helpers

</code_context>

<specifics>
## Specific Ideas

- The garbled strings suggest a past encoding issue — verify replacement strings match context
- BreakthroughCoordinator should follow the same pure-function pattern as CultivationEngine
- Quality consolidation should use `Record<CharacterQuality, string>` type (type-safe, not `Record<string, string>`)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-04-02 via Claude's Discretion*
