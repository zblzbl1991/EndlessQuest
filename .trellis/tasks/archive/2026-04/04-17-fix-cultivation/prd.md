# Fix: Cultivation Stall and Silent Breakthrough Failure

## Goal

Fix two related bugs in the cultivation/breakthrough system:
1. Cultivation progress stalls when spirit energy is insufficient (effectiveSpirit < threshold → zero gain)
2. Auto-breakthrough fails silently when resources are insufficient (no feedback to player)

## Requirements

### Bug 1: Cultivation Stall
- When spirit energy is low but not zero, characters should still gain cultivation proportional to available spirit, not drop to zero
- Fix the `canCultivate` threshold check that gates on `SPIRIT_COST_PER_SECOND` when called with reduced `effectiveSpirit`
- Ensure partial cultivation gain is possible when spirit is scarce

### Bug 2: Silent Breakthrough Failure
- When `canBreakthrough` returns true but `processBreakthrough` fails due to insufficient resources, emit an event so the player knows why
- Consider adding resource checks to `canBreakthrough` or a separate `getBreakthroughBlocker` function
- Do not spam events — only emit once when breakthrough is first blocked, not every tick

## Acceptance Criteria

- [ ] Characters with low spirit energy still gain proportional cultivation (not zero)
- [ ] When breakthrough is blocked by resources, player gets visible feedback (event/log)
- [ ] No event spam on repeated blocked breakthroughs
- [ ] Existing tests pass
- [ ] New tests for the fixed behavior

## Definition of Done

- Tests added/updated
- Lint / typecheck green
- Manual testing confirms both fixes

## Technical Notes

Key files:
- `src/stores/sectStore/tickSlice.ts` — tick loop, spirit ratio calc (line 210-218), breakthrough trigger (line 295)
- `src/systems/cultivation/CultivationEngine.ts` — `canCultivate` (line 115), `canBreakthrough` (line 184), `tick` (line 165)
- `src/systems/cultivation/BreakthroughCoordinator.ts` — `processBreakthrough` with resource checks (line 295-305), path choice guard (line 278-279)
- `src/data/realms.ts` — breakthrough cost table (line 99)
