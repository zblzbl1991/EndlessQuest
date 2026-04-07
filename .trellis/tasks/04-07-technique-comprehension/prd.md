# PRD: Technique Comprehension System

## Problem

Techniques in `src/data/techniquesTable.ts` grant full stat bonuses immediately upon learning. The `requirements.minComprehension` field exists but is only a gate -- once learned, a technique provides 100% of its bonuses regardless. There is no growth dimension to technique mastery.

## Goal

Add a `techniqueComprehension: Record<string, number>` map to `Character` tracking each learned technique's comprehension level (0-100). Technique bonuses scale linearly with comprehension. Comprehension increases through cultivation ticks and adventure combat.

## Type Changes

### `src/types/character.ts`

Add to `Character` interface:
```ts
techniqueComprehension: Record<string, number>  // techniqueId -> 0..100
```

### Save Migration

In the save load path (`src/systems/save/SaveSystem.ts` or `initial.ts`), when loading a character with `learnedTechniques` but no `techniqueComprehension`, initialize each technique at comprehension 50 (midpoint, to avoid nerfing existing saves).

## Comprehension Mechanics

### Initial Comprehension

When a technique is learned (`characterSlice.addTechnique` or equivalent), set initial comprehension:
- Starter techniques (`origin: 'starter'`): 30%
- Dungeon-found techniques (`origin: 'dungeon'`): 15%

### Bonus Scaling

In `createCharacterCombatUnit()` (`src/data/enemies.ts` line ~236), scale each technique bonus linearly:

```ts
const comprehension = character.techniqueComprehension[techId] ?? 1.0
const compScale = comprehension / 100

for (const bonus of technique.bonuses) {
  const scaledValue = bonus.value * compScale
  // apply scaledValue to stats...
}
```

At 100% comprehension, apply a **1.1x mastery bonus** (10% extra).

### Comprehension Growth

**During cultivation ticks** (`src/stores/sectStore/tickSlice.ts`):
- Each idle character with learned techniques has a chance per tick to gain comprehension.
- Growth rate: `0.1` comprehension per tick per technique (tune as needed).
- Only techniques below 100% comprehension grow.
- Characters with higher `cultivationStats.comprehension` grow faster: `baseGrowth * (1 + comprehension / 200)`.

**During adventure combat** (`src/systems/roguelike/EventSystem.ts`):
- After each combat event, increment comprehension for each technique the character used (based on equipped skills that map to technique families).
- Growth per combat: `+2` comprehension per technique.
- This gives a meaningful alternative growth path besides idle cultivation.

### UI Display

Where technique bonuses are displayed (character detail panels), show comprehension percentage and scaled bonus values.

## Files to Change

1. **`src/types/character.ts`** -- Add `techniqueComprehension: Record<string, number>` to `Character` interface.

2. **`src/stores/sectStore/initial.ts`** -- Default `techniqueComprehension` to `{}` for new characters. Update character factory.

3. **`src/stores/sectStore/characterSlice.ts`** -- When adding a technique, seed comprehension at 15-30%.

4. **`src/data/enemies.ts`** -- Update `createCharacterCombatUnit()` to scale technique bonuses by comprehension. At line ~262, multiply each bonus value by `comprehension / 100` (and 1.1x if comprehension === 100).

5. **`src/stores/sectStore/tickSlice.ts`** -- Add comprehension growth during `tickAll()` for idle characters.

6. **`src/systems/roguelike/EventSystem.ts`** -- After combat resolution, return comprehension increments as part of `EventResult`.

7. **`src/systems/roguelike/AutoRunEngine.ts`** -- Apply comprehension changes from combat events to the run state.

8. **`src/systems/save/SaveSystem.ts`** -- Save migration: initialize `techniqueComprehension` for characters missing it.

9. **UI components** -- Display comprehension percentage in technique lists. Low priority, can be a follow-up.

10. **`src/__tests__/CultivationEngine.test.ts`** -- Add tests for comprehension tick growth.

11. **`src/__tests__/CombatEngine.test.ts`** -- Update `makeUnit` helpers to include `techniqueComprehension`. Add test verifying scaled bonuses.

12. **New: `src/__tests__/techniqueComprehension.test.ts`** -- Test initial comprehension, growth formula, full comprehension bonus, save migration.

## Balance Reference

- At 50% starting comprehension (save migration), existing saves keep roughly half their technique bonuses. This is a deliberate nerf that creates a growth path.
- Growth rate of 0.1/tick during cultivation: reaching 100% from 50% takes ~500 ticks (~8 minutes). Reasonable for a technique the character already "knows."
- Combat growth of +2 per fight: a 5-floor run with ~3 combats gives +30 comprehension to used techniques. Good alternative for active play.

## Acceptance Criteria

- [ ] `Character` type includes `techniqueComprehension`
- [ ] New characters initialize with comprehension seeded for starter techniques
- [ ] Technique bonuses in combat scale linearly with comprehension (0% = 0 bonus, 100% = full bonus * 1.1)
- [ ] Cultivation ticks increment comprehension for idle characters
- [ ] Combat events increment comprehension
- [ ] Save migration initializes missing comprehension at 50%
- [ ] Existing tests updated and passing
- [ ] New tests for comprehension growth and scaling
