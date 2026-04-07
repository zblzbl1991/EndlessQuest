# PRD: Sect Path Effect Activation

## Problem

`src/data/sectPaths.ts` defines 3 sect paths (pill, sword, beast) with 5 nodes each. Nodes have typed `effects` arrays with entries like `{ type: 'bossDmg', value: 1.3 }` or `{ type: 'petPower', value: 1.15 }`. The helper `getPathEffects(pathId, unlockedIds)` correctly collects active effects from unlocked nodes. However, no game system reads these effects. The nodes are cosmetic -- unlocking them has zero gameplay impact.

## Goal

Wire sect path effects into the appropriate game systems so unlocking path nodes produces real gameplay changes.

## Effect Catalog

### Pill Path (丹道宗门)

| Node | Effect Type | Value | Target System |
|---|---|---|---|
| pill_1 (灵田改良) | `herbYield` | 1.2 | Resource tick: herb production * 1.2 |
| pill_2 (丹道真传) | `alchemyCrit` | 0.1 | Alchemy/production: +10% chance of double output |
| pill_3 (百草纲目) | `recipeSlots` | 3 | Unlock 3 additional crafting recipes |
| pill_4 (炼丹大师) | `doubleCraft` | 0.15 | Production: 15% chance of double output |
| pill_5 (太上丹经) | `breakthroughCost` | 0.8 | Breakthrough: spirit stone cost * 0.8 |

### Sword Path (剑道宗门)

| Node | Effect Type | Value | Target System |
|---|---|---|---|
| sword_1 (剑气纵横) | `atk` | 1.1 | Combat: all ally units atk * 1.1 |
| sword_2 (剑意凝形) | `crit` | 1.05 | Combat: all ally units crit * 1.05 |
| sword_3 (万剑归宗) | `aoeDmg` | 1.15 | Combat: AoE skill damage * 1.15 |
| sword_4 (剑心通明) | `spd` | 1.15 | Combat: all ally units spd * 1.15 |
| sword_5 (剑道极致) | `bossDmg` | 1.3 | Combat: damage against bosses * 1.3 |

### Beast Path (御兽宗门)

| Node | Effect Type | Value | Target System |
|---|---|---|---|
| beast_1 (灵兽感应) | `petCapture` | 1.1 | Pet capture rate * 1.1 |
| beast_2 (御兽基础) | `petPower` | 1.15 | Pet combat stats * 1.15 |
| beast_3 (万兽共鸣) | `petSlots` | 3 | +3 max pet slots per character |
| beast_4 (灵兽进化) | `petEvolution` | 1 | Unlock pet evolution (future feature) |
| beast_5 (百兽之王) | `petCombat` | 1 | Enable pets in combat (see pet-combat-integration PRD) |

## Implementation Plan

### Shared Helper: Get Active Effects

`getPathEffects(pathId, unlockedIds)` from `src/data/sectPaths.ts` already returns active effects. Every system that needs path bonuses should call this with the sect's current path and unlocked nodes:

```ts
import { getPathEffects } from '../data/sectPaths'
const effects = getPathEffects(sect.sectPath, sect.unlockedPathNodes)
const effectMap = Object.fromEntries(effects.map(e => [e.type, e.value]))
```

### Pill Path Effects

**`src/stores/sectStore/tickSlice.ts`** (resource production, line ~66):
- `herbYield`: After calculating herb resource rate, multiply by `effectMap.herbYield ?? 1`.
- `doubleCraft` / `alchemyCrit`: In production queue processing (`tickProductionQueue`), when a pill is produced, roll for double output using these bonuses.

**`src/systems/cultivation/BreakthroughCoordinator.ts`**:
- `breakthroughCost`: When calculating spirit stone cost for breakthrough, multiply by `effectMap.breakthroughCost ?? 1`.

**`recipeSlots`**: This is a data unlock. When checking available recipes, add `effectMap.recipeSlots ?? 0` extra slots.

### Sword Path Effects

**`src/systems/roguelike/RunBuildSystem.ts`** or **`src/data/enemies.ts`** (combat unit assembly):
- `atk`, `crit`, `spd`: When assembling ally combat units, multiply unit stats by these values.
- Best location: `createCharacterCombatUnit()` in `src/data/enemies.ts`, after computing `totalStats`. Accept an optional `sectEffects: PathEffect[]` parameter.
- `bossDmg`: In `src/systems/combat/CombatEngine.ts`, when calculating damage against an enemy with `isBoss` flag, multiply damage by `effectMap.bossDmg ?? 1`.
- `aoeDmg`: In `CombatEngine.ts`, when resolving AoE skill damage, multiply by `effectMap.aoeDmg ?? 1`.

### Beast Path Effects

**`src/systems/pet/PetSystem.ts`**:
- `petPower`: In `getPetCombatUnit()`, multiply pet stats by `effectMap.petPower ?? 1`. (See pet-combat-integration PRD.)
- `petCapture`: In `tryCapturePet()`, multiply capture rate by `effectMap.petCapture ?? 1`.
- `petSlots`: In character pet assignment logic, add `effectMap.petSlots ?? 0` to the max pet count.
- `petCombat` / `petEvolution`: Feature flags for future content.

### How to Read Sect State in Systems

Game systems are pure functions and don't read stores directly. The calling code (store slices or AutoRunEngine) should:

1. Read `sect.sectPath` and `sect.unlockedPathNodes` from `useSectStore.getState().sect`.
2. Call `getPathEffects(sectPath, unlockedNodes)` to get active effects.
3. Pass effects as parameters to system functions.

This maintains the pure-function architecture.

## Files to Change

1. **`src/stores/sectStore/tickSlice.ts`** -- Apply `herbYield`, `doubleCraft`, `alchemyCrit` to resource/production calculations.

2. **`src/systems/cultivation/BreakthroughCoordinator.ts`** -- Apply `breakthroughCost` multiplier.

3. **`src/data/enemies.ts`** -- Update `createCharacterCombatUnit()` to accept optional `sectEffects` parameter and apply `atk`, `crit`, `spd` multipliers.

4. **`src/systems/combat/CombatEngine.ts`** -- Apply `bossDmg` multiplier when target is a boss. Apply `aoeDmg` to AoE skills.

5. **`src/systems/pet/PetSystem.ts`** -- Apply `petCapture` rate bonus. `petPower` stat bonus (if pet-combat-integration is done).

6. **`src/stores/sectStore/petSlice.ts`** -- Apply `petSlots` to max pet count in `assignPet`.

7. **`src/systems/roguelike/AutoRunEngine.ts`** -- Read sect path effects and pass to combat unit assembly.

8. **`src/__tests__/SectPathEffects.test.ts`** (new) -- Test each effect type produces the expected gameplay change.

## Priority Order

Effects with the most gameplay impact should be implemented first:
1. **Sword path combat effects** (`atk`, `crit`, `spd`, `bossDmg`) -- directly felt in dungeon runs
2. **Pill path resource effects** (`herbYield`, `breakthroughCost`) -- felt in idle progression
3. **Beast path pet effects** (`petCapture`, `petPower`) -- requires pet-combat-integration
4. **Production effects** (`doubleCraft`, `alchemyCrit`, `recipeSlots`) -- minor impact

## Acceptance Criteria

- [ ] Sword path `atk`, `crit`, `spd` multipliers apply to ally combat units
- [ ] Sword path `bossDmg` multiplier applies to boss combat damage
- [ ] Pill path `herbYield` multiplier applies to herb production
- [ ] Pill path `breakthroughCost` multiplier applies to spirit stone cost
- [ ] Beast path `petCapture` multiplier applies to capture rate
- [ ] Beast path `petPower` multiplier applies to pet combat stats (if pet combat integrated)
- [ ] All effects read from sect's active path and unlocked nodes via `getPathEffects()`
- [ ] Pure-function architecture maintained (effects passed as parameters, not read from stores in systems)
- [ ] Tests for each effect type
