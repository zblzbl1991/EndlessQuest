# PRD: Equipment Sets and Random Affixes

## Problem

`src/types/item.ts` defines `Equipment.setId: string | null` (always `null`) and `refinementStats: Partial<ItemStats>[]` (always empty). `EquipmentEngine.getEffectiveStats()` already sums refinement stats but there is nothing to sum. Equipment drops are generic with no set identity or random affixes, making loot feel homogeneous.

## Goal

1. Define 4-6 equipment sets with 2-piece and 4-piece bonuses.
2. When equipment drops, randomly assign a set ID based on quality weights.
3. Roll 0-2 random affixes on drop, stored in `refinementStats`.
4. Update `getEffectiveStats()` to factor in active set bonuses across equipped gear.

## Equipment Set Definitions

Create new file `src/data/equipmentSets.ts`:

### Set Structure
```ts
interface EquipmentSet {
  id: string
  name: string
  description: string
  pieces: EquipSlot[]        // which slots can belong to this set
  bonus2: SetBonus           // 2-piece bonus
  bonus4: SetBonus           // 4-piece bonus
}

interface SetBonus {
  description: string
  statMultipliers?: Partial<ItemStats>  // e.g., { atk: 0.1 } = +10% atk
  flatBonus?: Partial<ItemStats>        // e.g., { hp: 50 } = +50 HP
  special?: 'critBonus' | 'hpRegen' | 'spiritRegen' | 'aoeDamage'
  specialValue?: number
}
```

### Proposed Sets

1. **青锋套装 (Azure Blade Set)** -- Weapon, Bracer, Talisman, Boots
   - 2pc: atk +8%
   - 4pc: crit +0.05, critDmg +0.15

2. **玄铁套装 (Dark Iron Set)** -- Head, Armor, Belt, Bracer
   - 2pc: def +10%, hp +5%
   - 4pc: combat damage taken -15%

3. **灵犀套装 (Spirit Link Set)** -- Accessory1, Accessory2, Talisman, Belt
   - 2pc: spd +8%
   - 4pc: spirit regen +5 per combat turn (special)

4. **天蚕套装 (Silk Weaver Set)** -- Armor, Boots, Head, Accessory1
   - 2pc: hp +12%
   - 4pc: after-combat HP restore +20% (special: hpRegen)

5. **碎星套装 (Star Shatter Set)** -- Weapon, Talisman, Accessory2, Boots
   - 2pc: atk +5%, crit +0.03
   - 4pc: 10% chance for double damage on crit (special: critBonus)

6. **苍穹套装 (Firmament Set)** -- Any 4 pieces from mixed slots
   - 2pc: all stats +3%
   - 4pc: all stats +7% (the generalist set, rare)

### Set Assignment Weights by Quality

```ts
const SET_WEIGHTS: Record<ItemQuality, { noSet: number; hasSet: number }> = {
  common:  { noSet: 85, hasSet: 15 },
  spirit:  { noSet: 60, hasSet: 40 },
  immortal: { noSet: 30, hasSet: 70 },
  divine:  { noSet: 10, hasSet: 90 },
  chaos:   { noSet: 5,  hasSet: 95 },
}
```

If a set is assigned, pick randomly from sets whose `pieces` include the generated slot.

## Random Affixes on Drop

When equipment is generated in `generateEquipment()`:

1. Roll number of affixes: 0 (40%), 1 (40%), 2 (20%) for common/spirit; 1 (30%), 2 (50%), 3 (20%) for immortal+.
2. For each affix, pick a random stat and roll a value: `floor(baseStat * qualityMult * random(0.05, 0.15))`.
3. Store as `Partial<ItemStats>` in `refinementStats[]`.

## Files to Change

1. **New: `src/data/equipmentSets.ts`** -- Define `EQUIPMENT_SETS` array, `SetBonus`, `EquipmentSet` types. Export helper functions:
   - `pickSetForSlot(slot, quality): EquipmentSet | null`
   - `calcSetBonuses(equippedGear, getEquipmentById): SetBonus[]`
   - `countSetPieces(equippedGear, getEquipmentById): Record<string, number>`

2. **`src/systems/item/ItemGenerator.ts`** -- Update `generateEquipment()`:
   - Roll for set assignment, set `setId` field.
   - Roll 0-2 random affixes, populate `refinementStats`.

3. **`src/systems/equipment/EquipmentEngine.ts`** -- Update `getEffectiveStats()`:
   - After summing base + enhance + refinement, check for active set bonuses.
   - Need access to all equipped gear (not just the single item). Option A: pass equipped gear array as optional parameter. Option B: create a separate `calcSetBonusStats()` function that `calcEquipmentStats()` calls.

4. **`src/systems/equipment/EquipmentEngine.ts`** -- Update `calcEquipmentStats()` (line ~313) to also return set bonus stats. This is where all equipped gear is already iterated, so it's the natural place.

5. **`src/__tests__/EquipmentEngine.test.ts`** -- Add tests for set bonus calculation, affix generation.

6. **New: `src/__tests__/equipmentSets.test.ts`** -- Test set assignment weights, set bonus counting, 2pc/4pc threshold logic.

## Backward Compatibility

- `setId: null` on existing equipment means "no set" -- all old gear continues to work.
- `refinementStats: []` on existing equipment means no affixes -- safe default.
- No save migration needed; old equipment simply has no set bonuses.
- New equipment generated after the update will have sets and affixes.

## Acceptance Criteria

- [ ] 6 equipment sets defined with 2pc and 4pc bonuses
- [ ] `generateEquipment()` assigns sets based on quality-weighted rolls
- [ ] `generateEquipment()` generates 0-2 random affixes in `refinementStats`
- [ ] `getEffectiveStats()` includes refinement stats (already works)
- [ ] `calcEquipmentStats()` includes active set bonuses when 2+ or 4+ pieces of a set are equipped
- [ ] Set bonus stat multipliers applied correctly
- [ ] Existing equipment (`setId: null`, `refinementStats: []`) unaffected
- [ ] No save data migration required
- [ ] Tests for set assignment, bonus counting, and stat calculation
