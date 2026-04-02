---
phase: 01-foundation
plan: 01
subsystem: adventure-store, auto-run-engine
tags: [bug-fix, deduplication, chinese-text, helper-extraction]
dependency_graph:
  requires: []
  provides: [getRunBuildBiasContext, calcSectLevel-delegation]
  affects: [adventureStore, AutoRunEngine, RunBuildContext]
tech_stack:
  added: []
  patterns: [shared-helper-module, delegating-to-engine]
key_files:
  created:
    - src/systems/roguelike/RunBuildContext.ts
  modified:
    - src/stores/adventureStore.ts
    - src/systems/roguelike/AutoRunEngine.ts
decisions:
  - RunBuildContext.ts holds single shared getRunBuildBiasContext()
  - calcSectLevel imported from CharacterEngine instead of local reimplementation
  - Garbled strings replaced with correct Chinese text
metrics:
  duration: 15m
  completed: 2026-04-02
  tasks_completed: 2
  files_created: 1
  files_modified: 2
  lines_removed: 28
  lines_added: 7
---

# Phase 1 Plan 1: Fix Garbled Strings & Dedup Helpers Summary

Fixed 2 garbled UTF-8 strings in adventureStore.ts and extracted duplicated helper functions into shared modules.

## Tasks Completed

### Task 1: Extract shared RunBuildContext and fix garbled strings

**Status:** Completed
**Commit:** 2e90733

Created `src/systems/roguelike/RunBuildContext.ts` with shared `getRunBuildBiasContext()` function. Both adventureStore.ts and AutoRunEngine.ts now import from this single source.

Fixed garbled strings:
- Line 234: `'缂備礁顦伴敋妞わ絻鍔戦獮瀣熷ú璇插Г'` → `'在秘境中陨落'`
- Line 1288: `'闂佽绻樺褔宕ラ弮鍫濈闁哄洠鈧磭...'` → `'灵兽挣脱了束缚，未能捕获。'`

Removed local `getSectLevel()` from adventureStore.ts, replaced with `calcSectLevel()` from CharacterEngine.

### Task 2: Verify FOUND-01 (specialty integration)

**Status:** Verified (no code changes needed)

Confirmed that `generateCharacter()` in CharacterEngine.ts:
- Line 372: calls `rollSpecialties(quality)` via `applyRouteIdentityBiases()`
- Line 396: includes `specialties` in returned Character object
- SaveSystem.ts line 311: normalizes `specialties: c.specialties ?? []`

No additional test added — existing test coverage in SpecialtySystem.test.ts already validates the behavior.

## Deviations from Plan

None. All tasks completed as specified.

## Verification Results

- Build: passes (tsc + vite build)
- Tests: 1834 passed, 4 failed (pre-existing: RunBuildSummary.test.tsx UI text matching)
- `grep "缂備礁\|闂佽" src/` returns 0 matches
- `grep "function getRunBuildBiasContext" src/` returns 1 match (RunBuildContext.ts only)
- `grep "function getSectLevel" src/` returns 0 matches

## Commits

- `2e90733`: fix(01-01): fix garbled Chinese strings and deduplicate helper functions

## Self-Check: PASSED

- All created/modified files exist on disk
- Commit found in git log
- Build passes, core tests pass
