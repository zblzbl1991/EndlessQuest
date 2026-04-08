# PRD: Blessings and Relics Integration

## Problem

`src/data/blessings.ts` has two parallel data structures:
- `BLESSING_DEFS` (5 typed entries: `stoneHarvest`, `verdantBounty`, `ironBody`, `galeStride`, `battleFocus`) -- actively used in `RunBuildSystem.ts` and `EventSystem.ts`.
- `BLESSINGS` (8 generic entries: `flame_heart`, `iron_wall`, `jade_pulse`, `spirit_spring`, `keen_eye`, `reaper_mark`, `golden_touch`, `wind_step`) -- have `effectType` strings but are never integrated into the roguelike blessing selection pool.

`src/data/relics.ts` has the same split:
- `RELIC_DEFS` (3 typed entries: `jadeGourd`, `merchantSeal`, `warBanner`) -- actively used.
- `RELICS` (4 generic entries: `mirror_shard`, `jade_armor`, `blood_vial`, `golden_scale`) -- have `rule` strings but are never integrated.

`RunBuildSystem.ts` already has partial support: `LEGACY_BLESSING_MULTIPLIERS` (line ~17) maps `flame_heart`, `iron_wall`, `wind_step` to combat multipliers, and `LEGACY_RELIC_MULTIPLIERS` maps `jade_armor`, `mirror_shard`. But these are defined and never wired into the selection pools.

## Goal

1. Integrate all 8 generic `BLESSINGS` into the blessing selection pool so they can appear during dungeon runs.
2. Integrate all 4 generic `RELICS` into the relic reward pool.
3. Implement the `effectType` / `rule` logic so generic blessings and relics have real combat effects.

## Current Architecture

### Blessing Flow
- `RunBuildSystem.pickBlessingOptions(ownedBlessings)` selects from `ALL_BLESSINGS` (line ~7, only contains `BlessingId` typed IDs).
- `RunBuildSystem.getBlessingWeight(id, context)` weights by route and building context.
- `AutoRunPolicy.pickAutomationBlessing()` picks from options.
- Blessings are stored in `DungeonRun.blessings: BlessingId[]`.
- Combat effects applied in `RunBuildSystem.applyMutationCombatModifiers()` (via `LEGACY_BLESSING_MULTIPLIERS`).

### Relic Flow
- `RunBuildSystem.pickRelicReward(ownedRelics)` selects from `ALL_RELICS` (line ~8, only `RelicId` typed IDs).
- Relics stored in `DungeonRun.relics: RelicId[]`.
- Combat effects applied via `LEGACY_RELIC_MULTIPLIERS`.

## Implementation Plan

### Step 1: Unify blessing IDs

The `BLESSING_DEFS` use `BlessingId` type (`'stoneHarvest' | 'verdantBounty' | ...`). The generic `BLESSINGS` use string IDs (`'flame_heart'`, etc.).

Option A: Add generic blessing IDs to `BlessingId` union type in `src/types/adventure.ts`. This is the cleanest approach but changes the type.

Option B: Use a separate `LegacyBlessingId` type and handle both in selection logic.

**Recommendation: Option A.** Update `BlessingId` in `src/types/adventure.ts` to include all 8 generic IDs. Update `BLESSING_DEFS` to include entries for the generic blessings (or merge into one map).

### Step 2: Implement blessing effect logic

For each `BLESSINGS` entry's `effectType`:

| effectType | Combat Effect |
|---|---|
| `atkBoost` | atk * 1.15 |
| `defBoost` | def * 1.15 |
| `hpBoost` | maxHp * 1.12 |
| `critBoost` | crit + 0.05 |
| `spiritRegen` | spiritPower +5 per combat turn |
| `healOnKill` | heal 10% maxHp on enemy kill |
| `lootBonus` | loot quantity * 1.2 |

These are already partially implemented in `LEGACY_BLESSING_MULTIPLIERS`. Extend the map to cover all 8.

### Step 3: Implement relic rule logic

For each `RELICS` entry's `rule`:

| rule | Combat Effect |
|---|---|
| `crit-up` | crit + 0.04 |
| `def-up` | def * 1.2 |
| `heal-up` | heal 15% maxHp after each combat |
| `loot-up` | spirit stone rewards * 1.25 |

These are already partially in `LEGACY_RELIC_MULTIPLIERS`. Extend to cover all 4.

### Step 4: Update selection pools

In `RunBuildSystem.ts`:
- Update `ALL_BLESSINGS` array to include generic blessing IDs.
- Update `ALL_RELICS` array to include generic relic IDs.
- Add weight entries for generic blessings in `BLESSING_ROUTE_WEIGHTS` and `BLESSING_BUILDING_WEIGHTS`.
- Ensure `pickBlessingOptions()` can return generic blessings.
- Ensure `pickRelicReward()` can return generic relics.

### Step 5: Apply effects in combat

The `applyMutationCombatModifiers()` function in `RunBuildSystem.ts` already applies `LEGACY_BLESSING_MULTIPLIERS` and `LEGACY_RELIC_MULTIPLIERS`. Extend these maps to cover all blessings/relics.

For non-combat effects (`lootBonus`, `heal-up`):
- `lootBonus`: Apply in `EventSystem.resolveEvent()` after loot generation, multiply spirit stone/ore/herb amounts.
- `heal-up`: Apply in `applyRunRecovery()`, increase HP restoration amount.
- `spiritRegen`: Apply in `CombatEngine` turn loop (minor change, may need to add a per-turn hook).

## Files to Change

1. **`src/types/adventure.ts`** -- Expand `BlessingId` union to include `flame_heart`, `iron_wall`, `jade_pulse`, `spirit_spring`, `keen_eye`, `reaper_mark`, `golden_touch`, `wind_step`. Expand `RelicId` union to include `mirror_shard`, `jade_armor`, `blood_vial`, `golden_scale`.

2. **`src/data/blessings.ts`** -- Add entries for generic blessings to `BLESSING_DEFS` (or create a unified map). This makes the typed and generic arrays redundant; consider merging.

3. **`src/data/relics.ts`** -- Same: add entries for generic relics to `RELIC_DEFS`.

4. **`src/systems/roguelike/RunBuildSystem.ts`** -- Expand `ALL_BLESSINGS`, `ALL_RELICS`, `LEGACY_BLESSING_MULTIPLIERS`, `LEGACY_RELIC_MULTIPLIERS`. Add weight configs for new blessings. Implement loot/heal/spirit regen effect handlers.

5. **`src/systems/roguelike/EventSystem.ts`** -- Apply `lootBonus` blessing effect to loot rewards. Apply `heal-up` relic effect to rest event HP restoration.

6. **`src/systems/combat/CombatEngine.ts`** -- If `spiritRegen` blessing is active, restore spirit power per turn. Minor hook addition.

7. **`src/__tests__/RunBuildSystem.test.ts`** (or wherever RunBuildSystem is tested) -- Test that generic blessings appear in selection pool, that combat modifiers apply correctly.

8. **New: `src/__tests__/blessingsRelicsIntegration.test.ts`** -- Integration test covering all blessing and relic effects.

## Backward Compatibility

- Existing `BlessingId` and `RelicId` values are unchanged.
- New IDs are additive to the union types.
- Active runs store blessing/relic IDs as strings; new IDs will work if code handles them.
- No save migration needed -- old runs just won't have the new blessing/relic IDs.

## Acceptance Criteria

- [ ] All 8 generic blessings appear in the blessing selection pool during runs
- [ ] All 4 generic relics appear in the relic reward pool
- [ ] Each blessing's `effectType` produces a tangible combat or reward effect
- [ ] Each relic's `rule` produces a tangible effect
- [ ] `BlessingId` and `RelicId` types updated to include all IDs
- [ ] Existing blessing/relic flow unchanged for the original 5 blessings and 3 relics
- [ ] New blessings weighted appropriately in route/building context
- [ ] Tests for all effect implementations
