# Building & Economy Overhaul

## Overview

Fix data bugs, deepen production chains, add building synergy visualization, introduce management random events, and rebalance the economy for better mid/late-game experience.

## Implementation Phases

### Phase 1: P0 Data Bug Fixes

#### 1.1 Fix Beast Route Spirit Field Bonus
- **File**: `src/data/sectRoutes.ts`
- **Problem**: Beast route has `spiritField: 1.0` (zero bonus) while other routes have meaningful building bonuses
- **Fix**: Change to `1.15` (+15% spirit field production), consistent with alchemy route's furnace bonus
- **Also review**: Ensure beast route has a coherent identity — pet/beast-focused with reasonable production bonuses

#### 1.2 Fix Leadership Specialty Values
- **File**: `src/data/specialties.ts`
- **Problem**: Leadership specialty gives +100% at level 1 and 2 (values `[1.0, 1.0, 1.05]`), clearly a data error
- **Fix**: Change to `[0.1, 0.2, 0.35]` matching the pattern of other building specialties (mining, herbalism, forging)
- **Impact**: Balance — currently any disciple with leadership trivially doubles building output

#### 1.3 Spirit Stone Soft Cap
- **File**: `src/systems/economy/ResourceEngine.ts`, `src/data/buildings.ts`
- **Problem**: `clampResources()` never clamps `spiritStone`, leading to infinite accumulation
- **Fix**: Add spirit stone soft cap based on main hall level
  - Formula: `spiritStoneCap = (5000 + mainHallLevel * 3000) * max(1, mainHallLevel - 2)`
  - Example: MH Lv3 → cap 14,000; MH Lv5 → cap 80,000; MH Lv8 → cap 312,000
  - When spirit stones exceed cap, production rate decays: `actualRate = rate * (cap / current)` (minimum 10%)
  - Tax income is NOT affected by decay (tax is always full rate)
  - Display warning in UI when approaching cap (>80%)
- **UI**: Show spirit stone cap in resource panel, with progress bar when >50% full

### Phase 2: P1 Production Chain Deepening

#### 2.1 Intermediate Products
- **File**: `src/data/recipes.ts`
- Add intermediate crafting materials:
  - `refined_herb` (精炼灵草) — alchemyFurnace Lv2, input: 20 herb + 10 spirit energy, time 15s
  - `refined_ore` (精炼矿石) — forge Lv2, input: 15 ore + 10 spirit stone, time 15s
  - `spirit_ingot` (灵锭) — forge Lv4, input: 5 refined_ore + 30 spirit stone, time 30s
- Update existing recipes to use intermediate products:
  - Spirit equipment: requires 3 refined_ore instead of 30 ore
  - Immortal equipment: requires 2 spirit_ingot + 5 refined_herb instead of raw materials
  - Divine equipment: requires 5 spirit_ingot + 10 refined_herb

#### 2.2 Recipe Unlock Conditions
- Add visible unlock requirements per recipe (building level + material availability)
- Display locked recipes greyed out with unlock condition text
- Unlock notification event when new recipe becomes available

#### 2.3 Recipe Branching
- Add alternate recipes at same tier:
  - `forge_spirit_defensive` — forge Lv3, produces defensive gear (more ore, less stone)
  - `forge_spirit_offensive` — forge Lv3, produces offensive gear (more stone, less ore)
  - Similar pattern for immortal and divine tiers

### Phase 3: P1 Building Synergy Visualization

#### 3.1 Synergy Progress Panel
- **Files**: `src/pages/SectPage.tsx`, new component `src/components/sect/SynergyPanel.tsx`
- Show all 6 building synergies in a dedicated section
- For each synergy show:
  - Current status (active/inactive)
  - Progress toward activation (e.g., "灵田 Lv2/3 + 丹炉 Lv3")
  - Effect description when active
- Highlight synergies that are close to activation (one building 1 level away)
- Place after resource panel, before battle reports

#### 3.2 Building Unlock Preview
- In the building upgrade UI, show what the next level unlocks:
  - New synergies (with progress)
  - New recipes
  - Stat changes (production rate, caps)
  - New building availability (if upgrading main hall)

### Phase 4: P1 Management Random Events

#### 4.1 Event System
- **New file**: `src/systems/sect/BuildingEventSystem.ts`
- **Types**: Add `BuildingEventType` and `BuildingEvent` to `src/types/sect.ts`
- Event types (triggered during game tick):
  - `spirit_vein_discovery` — spirit mine produces 3x for 60 game-seconds (rare, requires mine Lv3+)
  - `herb_bloom` — spirit field produces 2x herbs for 120 game-seconds (uncommon, requires field Lv2+)
  - `mysterious_merchant` — market offers discounted rare items for a limited time (rare, requires market Lv3+)
  - `alchemy_accident` — alchemy furnace production halts briefly, but may produce a bonus item (uncommon)
  - `forge_inspiration` — next forge recipe has +20% quality boost (uncommon)
  - `disciple_talent` — disciple assigned to building gains bonus XP/specialty progress (common)
- Trigger logic: Each game day, roll for events. Probability scales with building levels.
- Events appear in event log and SectPage as notifications
- Active events shown in resource panel area with timer

#### 4.2 Event Storage
- Add `activeBuildingEvents` to Sect type
- Events have duration, start time, and effect
- Expired events are cleaned up on tick

### Phase 5: P2 Balance Adjustments

#### 5.1 Tax vs Mine Balance
- **File**: `src/systems/economy/ResourceEngine.ts`
- Reduce tax formula from `sectLevel * discipleCount * 0.1` to `sectLevel * discipleCount * 0.05`
- Add mine efficiency bonus: spirit mine gets +5% production per level above other buildings' average
- Result: mines remain relevant throughout, tax is supplementary not dominant

#### 5.2 Disciple-Building Proficiency
- **Files**: `src/types/character.ts`, `src/stores/sectStore/buildingSlice.ts`, new `src/systems/sect/ProficiencySystem.ts`
- Add `buildingProficiency` map to Character: `{ [buildingType: string]: number }` (0-100)
- Each game day a disciple is assigned to a building, proficiency gains 1-3 points
- Proficiency bonuses: 0-25: +0%, 26-50: +10%, 51-75: +20%, 76-100: +30%
- Proficiency affects production output, stacks with specialty bonus
- Display proficiency level on character card when assigned to building

#### 5.3 Building Upgrade Time & Multi-Resource Costs
- **Files**: `src/types/sect.ts`, `src/stores/sectStore/buildingSlice.ts`, `src/stores/sectStore/tickSlice.ts`
- Add `constructionQueue` to Sect: `{ buildingType: string; targetLevel: number; remainingSeconds: number } | null`
- Building upgrades now take time: `baseTime = level * 30` seconds (Lv1→2: 30s, Lv5→6: 150s, Lv9→10: 270s)
- Multi-resource costs for higher levels:
  - Lv1-3: spirit stone only (current behavior)
  - Lv4-6: spirit stone + ore (ore cost = 20% of stone cost)
  - Lv7-8: spirit stone + ore + herb (herb cost = 15% of stone cost)
- Only one building can be under construction at a time
- Show construction progress bar on building card
- Construction can be rushed with spirit stones (50% time reduction for 30% extra cost)

## Acceptance Criteria

- [ ] Beast route spirit field bonus is 1.15 (not 1.0)
- [ ] Leadership specialty values are [0.1, 0.2, 0.35] (not [1.0, 1.0, 1.05])
- [ ] Spirit stone soft cap exists and decays production when exceeded
- [ ] At least 3 intermediate crafting materials exist
- [ ] Building synergy panel visible on SectPage with progress indicators
- [ ] At least 4 random building event types can trigger
- [ ] Tax rate is rebalanced (no longer dominates mine income)
- [ ] Building proficiency system functional with visible progression
- [ ] Building upgrades have construction time for Lv4+
- [ ] All existing tests pass
- [ ] No TypeScript errors
- [ ] Follows existing code patterns (Zustand slices, pure function systems, CSS modules)

## Design Constraints

- Follow 水墨风格 (ink-wash style) — no neon, no MMO-style heavy UI
- Mobile-first responsive design
- Use existing theme variables from `theme.css`
- Events should feel like natural occurrences, not spam
- New UI sections must not clutter SectPage — use collapsible sections if needed
- All new fields must have save/load migration (IndexedDB compatibility)
