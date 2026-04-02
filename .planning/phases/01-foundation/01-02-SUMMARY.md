---
phase: 01-foundation
plan: 02
subsystem: data
tags: [refactor, ui-copy, quality-labels, deduplication]

# Dependency graph
requires: []
provides:
  - "Single source of truth for character quality labels (CHAR_QUALITY_NAMES, CHAR_QUALITY_SHORT, CHAR_QUALITY_ORDER)"
  - "All consumer files import from uiCopy.ts instead of local constants"
affects: [01-foundation, character-progression]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Centralized UI copy constants in src/data/uiCopy.ts with typed Record exports"

key-files:
  created: []
  modified:
    - "src/data/uiCopy.ts - Added CHAR_QUALITY_NAMES, CHAR_QUALITY_SHORT, CHAR_QUALITY_ORDER"
    - "src/pages/BuildingsPage.tsx - Import CHAR_QUALITY_NAMES from uiCopy"
    - "src/pages/CharactersPage.tsx - Import CHAR_QUALITY_SHORT from uiCopy"
    - "src/components/common/CharacterCard.tsx - Removed local QUALITY_NAMES, export"
    - "src/components/building/AlchemyPanel.tsx - Import CHAR_QUALITY_NAMES from uiCopy"
    - "src/components/building/ForgePanel.tsx - Import CHAR_QUALITY_NAMES from uiCopy"
    - "src/components/building/MarketPanel.tsx - Import CHAR_QUALITY_NAMES from uiCopy"
    - "src/stores/sectStore/characterSlice.ts - Import CHAR_QUALITY_NAMES, CHAR_QUALITY_ORDER from uiCopy"
    - "src/stores/sectStore/buildingSlice.ts - Import CHAR_QUALITY_ORDER from uiCopy"

key-decisions:
  - "Added CHAR_QUALITY_SHORT alongside CHAR_QUALITY_NAMES to serve both full and abbreviated label consumers"
  - "CharactersPage and CharacterCard use CHAR_QUALITY_SHORT for compact quality badges"
  - "VaultPage keeps items.ts QUALITY_NAMES (ItemQuality) unchanged since it displays item quality, not character quality"

patterns-established:
  - "UI display text constants centralized in src/data/uiCopy.ts with typed Record<DomainType, string> exports"
  - "Consumers choose between full (CHAR_QUALITY_NAMES) and short (CHAR_QUALITY_SHORT) label forms"

requirements-completed: [FOUND-02]

# Metrics
duration: 10min
completed: 2026-04-02
---

# Phase 1 Plan 02: Quality Label Consolidation Summary

**Centralized character quality labels (CHAR_QUALITY_NAMES, CHAR_QUALITY_SHORT, CHAR_QUALITY_ORDER) into uiCopy.ts, removing 8 local constant definitions across pages, components, and store slices.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-02T08:39:38Z
- **Completed:** 2026-04-02T08:49:40Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Character quality labels defined once in uiCopy.ts instead of 7+ scattered locations
- Both full-form (凡品/灵品/...) and short-form (凡/灵/...) labels available via typed exports
- Quality ordering array consolidated from 2 duplicate definitions into 1
- items.ts ItemQuality labels intentionally left untouched (separate domain)

## Task Commits

Each task was committed atomically:

1. **Task 1+2: Quality label consolidation** - `885013c` (refactor)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified
- `src/data/uiCopy.ts` - Added CHAR_QUALITY_NAMES, CHAR_QUALITY_SHORT, CHAR_QUALITY_ORDER exports
- `src/pages/BuildingsPage.tsx` - Replaced local QUALITY_LABELS with CHAR_QUALITY_NAMES import
- `src/pages/CharactersPage.tsx` - Replaced local QUALITY_NAMES_CHAR with CHAR_QUALITY_SHORT import
- `src/components/common/CharacterCard.tsx` - Removed local QUALITY_NAMES definition and re-export, removed unused import
- `src/components/building/AlchemyPanel.tsx` - Replaced local QUALITY_LABELS with CHAR_QUALITY_NAMES import
- `src/components/building/ForgePanel.tsx` - Replaced local QUALITY_LABELS with CHAR_QUALITY_NAMES import
- `src/components/building/MarketPanel.tsx` - Replaced local QUALITY_LABELS with CHAR_QUALITY_NAMES import
- `src/stores/sectStore/characterSlice.ts` - Replaced local qualityLabel and QUALITY_ORDER with uiCopy imports
- `src/stores/sectStore/buildingSlice.ts` - Replaced local QUALITY_ORDER with CHAR_QUALITY_ORDER import

## Decisions Made
- Added CHAR_QUALITY_SHORT alongside CHAR_QUALITY_NAMES because BuildingsPage and CharactersPage both use single-character quality badges in compact contexts
- VaultPage retains items.ts QUALITY_NAMES since it renders item (not character) quality labels -- correct per plan's "DO NOT CHANGE items.ts" directive

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused CHAR_QUALITY_SHORT import and stale comment in CharacterCard.tsx**
- **Found during:** Task 2 (replacing local quality definitions)
- **Issue:** CharacterCard.tsx imported CHAR_QUALITY_SHORT but never used it, causing TypeScript build error TS6133. A stale comment referencing the removed import was also present.
- **Fix:** Removed the unused import line and the stale comment at end of file.
- **Files modified:** src/components/common/CharacterCard.tsx
- **Verification:** `npm run build` succeeds with no errors
- **Committed in:** 885013c (task commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor cleanup necessary for build correctness. No scope creep.

## Issues Encountered
- RunBuildSummary.test.tsx has 2 pre-existing test failures (expecting "战术: 平衡" text that does not appear in rendered output). These are unrelated to quality label changes and were present before this plan.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Quality labels fully consolidated, ready for character progression work that may add new quality-related UI
- The uiCopy.ts pattern can be extended for other duplicated constants identified in future plans

---
*Phase: 01-foundation*
*Completed: 2026-04-02*
