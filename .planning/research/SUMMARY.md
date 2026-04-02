# Project Research Summary

**Project:** EndlessQuest
**Domain:** Xianxia Idle Roguelike Web Game -- Character Progression Depth (P2)
**Researched:** 2026-04-02
**Confidence:** HIGH

## Executive Summary

EndlessQuest is a xianxia idle roguelike web game with a complete core loop (sect management, cultivation, dungeon runs, equipment, techniques). The P2 milestone adds character progression depth across 12 subsystems (cultivation paths, element affinity, skill equipment, pet combat integration, refinement, set bonuses, talents, technique comprehension, specialties, titles, fate tags, path-exclusive skills). The research is unanimous: no new libraries or architectural paradigm shifts are needed. Every progression system fits into the existing Zustand slice pattern, pure-function systems directory, and tick-driven game loop. The existing codebase already contains partial implementations and data structures for many of these systems -- the work is primarily wiring and integration, not greenfield development.

The recommended approach is a five-phase build that starts with technical debt resolution (save migration, tick extraction, quality consolidation) before adding any progression features. This is critical because the four research files converge on the same warning: `tickSlice.ts` (542 lines, 4 duplicated breakthrough paths), `SaveSystem.ts` (version mismatch, hope-based migration), and `adventureStore.ts` (120 cross-store calls) are fragile integration points that will break under the weight of 12 new subsystems if they are not refactored first. The architecture research provides a detailed dependency chain showing which systems can be built independently and which share integration points, and the pitfalls research maps specific failure modes to specific phases.

The key risk is feature creep through shared integration points. Although each subsystem looks small in isolation, they all converge on `calcCharacterTotalStats()`, `tickSlice`, and `CombatEngine`. Strict one-subsystem-per-shared-file-per-phase discipline is essential. The secondary risk is performance: the tick loop must remain under 16ms with 30 characters and 6 new per-character operations. Lazy stat calculation (compute on combat/render, not on tick) and debounced non-critical updates are the mitigations.

## Key Findings

### Recommended Stack

No new packages required. The existing stack (React 19.2.4 + TypeScript 5.9.3 + Zustand 5.0.12 + CSS Modules + Vitest 4.1.1 + IndexedDB via `idb` 8.0.3) is fully sufficient. All 12 progression subsystems are pure-function game logic that integrate into existing patterns. The only existing-but-unused dependency worth noting is `framer-motion` (already in `package.json`) -- defer unless the cultivation path choice modal feels lifeless, in which case CSS transitions should be tried first per the ink-wash restraint principle.

**Core technologies:**
- Zustand 5 slices (13 existing): All progression state belongs on the Character interface inside SectStore. No new stores. Extend existing `characterSlice`, `tickSlice`, `itemSlice`.
- Pure-function systems (`src/systems/`): 4 new system files (TitleSystem, SetBonusSystem, MechanicalTalentSystem, TechniqueComprehensionSystem). All take data in, return results out. No store imports.
- IndexedDB via `idb`: Schemaless stores handle new Character fields automatically. Migration via `??` defaults in `loadGame()` normalization (existing pattern, but needs hardening per PITFALLS.md).
- Vitest: One test file per system file. Pure functions are trivially testable.

### Expected Features

The feature landscape is anchored by a strong foundation: 6 cultivation paths already defined with stat bonuses, 8 active skills already coded, element counter maps already functional, pet combat units already implemented, and refinement backend already complete.

**Must have (table stakes):**
- Cultivation path player choice -- change from random roll to deliberate choice at realm 1 breakthrough. This is the single most impactful differentiation feature.
- Skill loadout for combat -- currently characters auto-attack because `equippedSkills` is always empty. Need acquisition flow + equip UI.
- Technique comprehension 0-100% -- techniques should grow over time, not be instant. The `minComprehension` field already exists in technique definitions.
- Equipment refinement UI -- backend is 100% done (`refineEquipment()` + `getEffectiveStats()`), only needs a UI button and stat display.
- Element affinity -- derived from cultivation path via lookup table, single multiplier addition to combat. Comes free with path choice.

**Should have (differentiators):**
- Pet combat integration with path synergy -- makes beast path genuinely unique (two combat units per character). `getPetCombatUnit()` already implemented.
- Mechanical talents (not just stat boosts) -- phoenix blood revive, fortune star drop rate, daoxin stable preserve-cultivation. Start with 3-4, not all 10.
- Title promotion as auto-progression milestone -- very low effort, satisfying milestone moments, auto-check on realm change.
- Set bonuses with themed dungeon drops -- 4 elemental sets tied to specific dungeons for targeted farming motivation.
- Comprehension-driven skill unlocks at 50%/100% milestones -- creates satisfying "ding" moments during technique study.

**Defer (v2+):**
- Path-exclusive mechanical skills (AoE, freeze, reflect, revive) -- require CombatEngine extensions beyond single-target model. Very high complexity.
- Full mechanical talent roster (10 new talents) -- each is a separate integration point. Start with 3-4.
- Pet breeding/fusion, gacha-style path rerolling, daily progression gating, power score aggregation -- explicitly anti-features per design principles.

### Architecture Approach

The progression systems layer into the existing three-layer architecture (Presentation -> Zustand Stores -> Pure-Function Systems) with no new stores and no paradigm shifts. The core pattern: game logic lives in `src/systems/` as stateless functions; SectStore slices call those functions and apply results via immutable spread. New Character fields are persisted through the existing IndexedDB per-entity stores with field-default migration in `loadGame()`.

**Major components to add:**
1. `TitleSystem` -- pure function checking realm thresholds, returning promotion results and stat bonus lookups.
2. `SetBonusSystem` -- pure function detecting active set bonuses from equipped gear, returning stat layers for `calcCharacterTotalStats()`.
3. `MechanicalTalentSystem` -- query interface (`hasMechanic`, `getMechanicParam`) consumed at specific decision points in combat, cultivation, and loot systems.
4. `TechniqueComprehensionSystem` -- comprehension tick function and threshold checker for skill unlock milestones.

**Critical integration points (shared across subsystems):**
- `calcCharacterTotalStats()` in CharacterEngine -- receives title bonuses, set bonuses, comprehension-scaled technique bonuses, fate tag crit modifiers. Must be extended in strict layering order.
- `tickSlice.ts` -- must be extracted from 542-line monolith to pure helper functions before adding title/comprehension/progression ticks.
- `performBreakthrough` logic -- 4 duplicated breakthrough paths in tickSlice must consolidate into a single function with a hook list pattern.

### Critical Pitfalls

1. **Save migration without version gates** -- SaveMeta version mismatch (declared 8, written 7, never checked) plus scattered `??` fallbacks is "hope-based migration." Must create explicit `migrateCharacterV3()` function and align version numbers before any Character type changes.
2. **Tick performance collapse** -- Adding 5-6 per-character operations to an already 542-line tick loop risks exceeding 16ms at 30 characters. Must extract pure function, profile baseline, and enforce lazy stat calculation (no `calcCharacterTotalStats` inside tick).
3. **Cross-store coupling explosion** -- adventureStore already has 21 direct `useSectStore.getState()` calls. Progression adds more. Must create a thin read-only `sectFacade.ts` before Phase 2.
4. **Breakthrough logic duplication** -- 4 separate breakthrough code paths in tickSlice, each needing identical post-breakthrough hooks. Must consolidate into single `processBreakthrough()` with hook list before adding title/comprehension/path-choice hooks.
5. **Feature creep through shared integration points** -- 12 subsystems touching the same 3-4 shared files. Must enforce one-subsystem-per-shared-file-per-phase discipline.

## Implications for Roadmap

Based on the convergence of all four research files, the following phase structure is recommended:

### Phase 1: Foundation and Technical Debt
**Rationale:** All four research files flag the same fragile integration points. Tick extraction, save migration hardening, and quality consolidation must happen before any progression code touches those files. Without this phase, every subsequent phase inherits compounding risk.
**Delivers:** Extracted tick pure functions, versioned save migration, consolidated quality definitions, performance baseline measurement.
**Addresses:** Pitfalls 1 (save migration), 2 (tick performance), 5 (breakthrough duplication), 6 (quality scatter), 4 (auto-save baseline).
**Avoids:** Building progression features on fragile foundations that will require rework.

### Phase 2: Character Identity Core
**Rationale:** Cultivation path choice is the single highest-impact feature (FEATURES.md rank 4 by effort-to-impact). Element affinity comes free with it. Specialty integration is trivial. Title promotion is low-effort high-satisfaction. These three features together make every character feel distinct for the first time.
**Delivers:** Cultivation path player choice UI, element affinity from path, specialty integration, title auto-promotion, sectFacade for cross-store decoupling.
**Addresses:** Table stakes (path choice, element affinity), differentiators (title promotion).
**Uses:** Existing `cultivationPaths.ts` data, `CultivationPathSystem.ts` logic, `CharacterTitle` type.
**Avoids:** Pitfall 3 (cross-store coupling -- facade created before new queries).

### Phase 3: Combat and Activity Integration
**Rationale:** Pet combat integration and skill loadout are medium-complexity features that make the path choice meaningful in actual gameplay. Equipment refinement UI is pure UI wiring on an existing backend. These features activate the identity established in Phase 2.
**Delivers:** Pet combat units in adventure teams, skill acquisition + equip flow, refinement UI, technique comprehension system.
**Addresses:** Table stakes (skill loadout, refinement UI), differentiators (pet combat, comprehension milestones).
**Uses:** Existing `getPetCombatUnit()`, `refineEquipment()`, `getEffectiveStats()`, technique `minComprehension` fields.
**Avoids:** Adding mechanical talents yet (each is a separate integration point -- defer to keep scope controlled).

### Phase 4: Content Depth
**Rationale:** Set bonuses, fate tag expansion, and additional talents add content richness but require data file creation and careful balance tuning. They depend on the stat pipeline being stable from Phases 2-3.
**Delivers:** Set bonus system (4 sets), set-aware item generation, fate tag effect expansion, 3-4 mechanical talents, 10 new stat talents.
**Addresses:** Differentiators (set bonuses, mechanical talents, fate tag depth).
**Uses:** New `data/sets.ts`, expanded `fateTags.ts` and `talents.ts`, MechanicalTalentSystem from Phase 1.
**Avoids:** Pitfall 7 (feature creep -- this phase deliberately does NOT touch CombatEngine).

### Phase 5: Combat Engine Extension (Optional / Defer)
**Rationale:** AoE, freeze, reflect, and revive mechanics require fundamental CombatEngine changes. This is a separate milestone disguised as a phase. The stat-based path skills from Phase 3 already deliver value. Mechanical combat skills are a "nice to have" that should not delay shipping Phases 1-4.
**Delivers:** AoE skill support, counter/freeze mechanics, phoenix-blood revive in CombatEngine.
**Addresses:** Path-exclusive mechanical skills (highest-difficulty feature).
**Warning:** Needs dedicated `/gsd:research-phase` before planning -- combat engine extension patterns are non-trivial.

### Phase Ordering Rationale

- Phase 1 before all others: the four critical pitfalls (save, tick, breakthrough, quality) are blocking dependencies for every progression feature.
- Phase 2 before Phase 3: cultivation path establishes character identity; skill loadout and pet combat make that identity meaningful in gameplay.
- Phase 3 before Phase 4: the stat pipeline (`calcCharacterTotalStats`) must be stable with path/title/comprehension layers before set bonuses and fate tags add more layers.
- Phase 5 deferred: CombatEngine changes are the highest-risk, highest-complexity work. Phases 1-4 deliver complete character progression without them.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** Save migration strategy needs careful design -- the current version mismatch (declared 8, written 7) must be resolved before adding new migration logic.
- **Phase 5:** CombatEngine AoE/freeze/reflect extension is non-trivial and should not be planned without dedicated research into the current combat simulation model.

Phases with standard patterns (skip research-phase):
- **Phase 2:** Cultivation path choice is well-documented in the design spec, data already exists, patterns are clear.
- **Phase 3:** Pet combat integration and refinement UI are straightforward wiring of existing backend code.
- **Phase 4:** Set bonuses and fate tags follow the data-table-driven pattern established across the codebase.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | No new libraries needed. All 12 subsystems verified against existing architecture. Existing dependency versions are compatible and proven. |
| Features | HIGH | Feature categorization based on direct codebase analysis (14 system files, 12 data files) plus existing P2 design spec. Implementation difficulty rankings are verified against actual code state (e.g., refinement backend is done, path data exists, pet combat unit function exists). |
| Architecture | HIGH | Based on direct analysis of existing codebase patterns (13 Zustand slices, pure-function systems, tick-driven loop, per-entity IndexedDB stores). Integration points verified by tracing data flow through source files. Build order derived from actual dependency graph. |
| Pitfalls | HIGH | All 7 critical pitfalls verified against specific source files with line numbers. Version mismatch in SaveSystem.ts confirmed. 542-line tickSlice confirmed. 120 cross-store calls confirmed. These are not theoretical risks -- they are existing conditions that will worsen without mitigation. |

**Overall confidence:** HIGH

### Gaps to Address

- **CombatEngine AoE/freeze/reflect design:** The current CombatEngine is single-target only. If Phase 5 is pursued, the extension pattern (multi-target resolution, status effect tracking, turn-order interruption) needs dedicated research. This is deferred, not a blocker for Phases 1-4.
- **Balance tuning for 12 subsystems:** The research covers technical feasibility, not numerical balance. Path stat multipliers, comprehension rates, set bonus percentages, and talent effects all need playtesting. This is a post-implementation concern, not a research gap.
- **Offline progression edge cases:** Which progression features advance during offline catch-up and which require player presence is partially specified. Title promotion (auto), technique comprehension (needs building assignment), cultivation path choice (player must be present) are clear, but mechanical talent triggers during offline breakthroughs may need case-by-case decisions.
- **Auto-save performance baseline unknown:** The research identifies JSON.stringify on every tick as a risk but does not have measured baseline numbers. Phase 1 must include a timing measurement to determine if the revision counter is needed immediately or can be deferred.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis: `src/systems/`, `src/stores/`, `src/types/`, `src/data/` -- architecture patterns, integration points, existing implementations
- Existing P2 design spec: `docs/superpowers/specs/2026-03-29-character-progression-design.md` -- 12 subsystems, feature definitions, implementation notes
- Codebase documentation: `.planning/codebase/CONCERNS.md` -- known technical debt (120 cross-store calls, 542-line tickSlice, save version mismatch)
- Project configuration: `package.json` -- dependency versions verified compatible
- Zustand official documentation: slice pattern, TypeScript guide, middleware -- verified project patterns match official recommendations

### Secondary (MEDIUM confidence)
- Domain knowledge: xianxia cultivation game genre conventions (Swords of Legends Online, Tale of Immortal, cultivation idle mobile games) -- feature expectations, genre standards
- Domain knowledge: roguelike progression design patterns (Slay the Spire, Dead Cells, Hades) -- skill loadout patterns, build diversity principles
- Project design principles: `CLAUDE.md` -- UI philosophy, aesthetic constraints, responsive strategy

---
*Research completed: 2026-04-02*
*Ready for roadmap: yes*
