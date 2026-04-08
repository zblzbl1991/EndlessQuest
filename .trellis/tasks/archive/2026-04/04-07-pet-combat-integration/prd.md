# PRD: Pet Combat Integration

## Problem

`src/systems/pet/PetSystem.ts` has a `getPetCombatUnit()` function that converts a `Pet` into a `CombatUnit`, but this function is never called during adventure runs. Characters can have `petIds` assigned (via `assignPet` in `src/stores/sectStore/petSlice.ts`), but when assembling the ally team for dungeon combat, pets are completely ignored.

## Goal

When characters enter dungeon combat, their assigned pets should join as additional ally combat units. Pet quality and stats determine combat contribution. This makes the beast path's `petCombat` node and the `petPower` node meaningful.

## Current Flow

1. `AutoRunEngine.resolveAutomatedRun()` receives `baseTeamUnits: CombatUnit[]` as input.
2. `baseTeamUnits` is assembled before calling `resolveAutomatedRun` -- likely in the adventure store or page component.
3. `EventSystem.resolveEvent('combat', ...)` uses these `baseTeamUnits` directly.
4. `getPetCombatUnit(pet)` exists in `PetSystem.ts` but is only used in tests.

## Implementation Plan

### Step 1: Add pet unit assembly to team building

Where `baseTeamUnits` is assembled (trace from `AutoRunEngine` callers), after creating each character's `CombatUnit`, check `character.petIds`. For each pet ID, look up the pet from `sect.pets`, call `getPetCombatUnit(pet)`, and append to the team array.

**Primary location to inject:** The caller that builds `baseTeamUnits` before passing it to `resolveAutomatedRun`. Check `src/stores/adventureStore.ts` or `src/pages/AdventurePage.tsx`.

### Step 2: Pet stat scaling from sect path

In `getPetCombatUnit()` (or a new wrapper), check if the sect has the `petPower` effect unlocked (from `src/data/sectPaths.ts` beast path). If so, multiply the pet's combat stats by the `petPower` value (e.g., 1.15 for +15%).

Use `getPathEffects()` from `src/data/sectPaths.ts` to read unlocked effects:
```ts
import { getPathEffects } from '../data/sectPaths'
const effects = getPathEffects(sect.sectPath, sect.unlockedPathNodes)
const petPower = effects.find(e => e.type === 'petPower')?.value ?? 1
```

### Step 3: Pet team membership rules

- Each character can bring at most 1 pet into combat (first in `petIds`).
- Pet uses the same `CombatUnit` structure, team: `'ally'`.
- Pet has its own HP pool, can die independently.
- Pet does not count toward character casualty/recovery tracking (no `postRunMemberOutcomes`).
- If pet dies in combat, it is not removed from `character.petIds` -- it recovers after the run.

### Step 4: Update EventSystem to carry pet units through

`EventSystem.resolveEvent()` receives `team: CombatUnit[]`. Pet units are already in this array. The existing combat logic (`simulateCombat`) should work without changes since it just takes arrays of ally/enemy `CombatUnit`s.

**HP tracking:** After combat, `buildHpChanges()` needs to handle pet unit HP changes. Pet HP changes should be tracked but not applied to character `memberStates`. Add pet HP restoration in `applyRunRecovery()` (from `RunBuildSystem.ts`) -- pets restore to full HP after each floor rest event.

## Files to Change

1. **`src/systems/pet/PetSystem.ts`** -- Update `getPetCombatUnit()` to accept an optional `statMultiplier` parameter for sect path bonuses. Add `aggro: 0` and `shield: 0` to the returned unit (currently missing).
2. **`src/stores/adventureStore.ts`** (or wherever `baseTeamUnits` is built) -- After creating character combat units, append pet combat units for each character's first assigned pet.
3. **`src/systems/roguelike/RunBuildSystem.ts`** -- Update `applyRunRecovery()` to also restore pet unit HP.
4. **`src/systems/roguelike/EventSystem.ts`** -- Ensure `buildHpChanges()` handles pet units gracefully (they don't map to `memberStates`).
5. **`src/systems/roguelike/AutoRunEngine.ts`** -- Verify pet units are carried through floor transitions correctly.
6. **`src/__tests__/PetSystem.test.ts`** -- Add tests for stat multiplier parameter.
7. **New: `src/__tests__/petCombatIntegration.test.ts`** -- End-to-end test: character with pet, verify pet appears in combat, verify pet stats include sect path bonus.

## Stat Balance Reference

From `PET_QUALITY_STAT_MULT`:
- common: 0.3x (weak support unit)
- spirit: 0.5x
- immortal: 0.7x
- divine: 1.0x (comparable to a low-realm character)

With beast path `petPower` 1.15 at node 2, a divine pet reaches 1.15x -- meaningful but not dominant.

## Acceptance Criteria

- [ ] When a character with assigned pets enters combat, their first pet joins as an ally `CombatUnit`
- [ ] Pet combat unit has correct stats from `getPetCombatUnit()`
- [ ] Sect path `petPower` effect multiplies pet combat stats
- [ ] Pet HP tracked separately from character HP during combat
- [ ] Pet HP restores on rest events
- [ ] Pet death does not affect character recovery/outcome tracking
- [ ] At most 1 pet per character in combat
- [ ] Existing adventure tests pass
- [ ] New integration test covers the full flow
