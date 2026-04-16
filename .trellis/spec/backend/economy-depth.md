# Economy Depth Code-Spec

> Contracts for multi-resource economy, spirit tide cycle, and herb/ore independent consumption.

---

## 1. Scope / Trigger

Three changes to make the economy deeper than "spirit stone is the only bottleneck":

1. **Herb & Ore Independent Uses** — Breakthroughs consume herbs, building upgrades consume ore/herb, healing costs herbs
2. **Multi-Resource Consumption** — Key decision points require multiple resource types simultaneously
3. **Spirit Tide Cycle** — 30-minute cycle modulating resource production rates

---

## 2. Spirit Tide System

### Signatures

```ts
// src/systems/economy/TideSystem.ts

export type TidePhase = 'flood' | 'ebb' | 'still'

export interface TideMultipliers {
  spiritStone: number
  spiritEnergy: number
  herb: number
  ore: number
}

export interface TideState {
  phase: TidePhase
  multipliers: TideMultipliers
  nextPhaseIn: number  // seconds until next phase
}

export const TIDE_CYCLE_LENGTH = 1800  // 30 minutes

export function getTideState(totalPlayTimeSeconds: number): TideState
export function formatTideCountdown(seconds: number): string  // "MM:SS"
```

### Phase Configuration

| Phase | Cycle Position | spiritEnergy | herb | ore | spiritStone |
|-------|---------------|-------------|------|-----|-------------|
| Flood (涨潮) | 0-600s | 1.5x | 1.3x | 1.0x | 1.0x |
| Ebb (退潮) | 600-1200s | 0.7x | 1.0x | 1.2x | 1.0x |
| Still (平潮) | 1200-1800s | 1.0x | 1.0x | 1.0x | 1.0x |

### Time Source

Tide uses `sect.stats.totalPlayTime` as the canonical time source. This ensures:
- Offline catch-up correctly accounts for tide phases
- Tide state is deterministic for any given play time

### Integration (tickSlice.ts)

```ts
// After archetype/campaign modifiers, before resource application:
const tideState = getTideState(sect.stats.totalPlayTime)
rates.spiritEnergy *= tideState.multipliers.spiritEnergy
rates.herb *= tideState.multipliers.herb
rates.ore *= tideState.multipliers.ore
// spiritStone unchanged (multiplier always 1.0)
```

### UI (SectPage.tsx)

Displays current phase (涨潮/退潮/平潮), countdown timer, and phase detail in the resource section.

---

## 3. Multi-Resource Building Upgrades

### Cost Type Change

```ts
// src/data/buildings.ts
// Before: upgradeCost returned { spiritStone: number }
// After:
interface BuildingUpgradeCost {
  spiritStone: number
  herb?: number   // Added for high-level upgrades
  ore?: number    // Added for high-level upgrades
}
```

### Per-Building Cost Rules

| Building | Herb Cost Threshold | Ore Cost Threshold |
|----------|--------------------|--------------------|
| Spirit Field (灵田) | Level 5+ | — |
| Spirit Mine (灵矿) | — | Level 5+ |
| Alchemy Furnace | Level 5+ | — |
| Forge | — | Level 5+ |
| Other buildings | — | Level 7+ |

Cost amounts scale with level (formula varies per building definition).

### Integration (buildingSlice.ts)

```ts
// upgradeBuilding() now checks:
const cost = upgradeCost(building.type, building.level)
if (sect.resources.spiritStone < cost.spiritStone) return { success: false, reason: '...' }
if (cost.herb && sect.resources.herb < cost.herb) return { success: false, reason: '...' }
if (cost.ore && sect.resources.ore < cost.ore) return { success: false, reason: '...' }

// Deduct all resources on success:
sect.resources.spiritStone -= cost.spiritStone
if (cost.herb) sect.resources.herb -= cost.herb
if (cost.ore) sect.resources.ore -= cost.ore
```

---

## 4. Breakthrough Herb Costs

### Cost Table Extension

```ts
// src/data/realms.ts
// BREAKTHROUGH_COSTS now includes herb field:
export interface BreakthroughResourceCost {
  spiritStone: number
  spiritEnergy: number
  herb?: number  // NEW — consumed on major breakthroughs
}
```

### Herb Cost by Realm Transition

| Transition | Spirit Stone | Spirit Energy | Herb |
|-----------|-------------|---------------|------|
| Realm 0→1 | Existing | Existing | — |
| Realm 1→2 | Existing | Existing | 50 |
| Realm 2→3 | Existing | Existing | 100 |
| Realm 3→4 | Existing | Existing | 200 |
| Realm 4→5 | Existing | Existing | 400 |
| Realm 5→6 | Existing | Existing | 800 |

Minor breakthroughs: 0 herb (unchanged).

### Integration (BreakthroughCoordinator.ts)

`BreakthroughCost` interface extended with `herb: number`. Herb availability checked alongside spirit stone/spirit energy before attempting breakthrough.

---

## 5. Herb-Based Healing

### Action (characterSlice.ts / miscSlice.ts)

```ts
healCharacter(characterId: string): { success: boolean; reason: string }
```

- Costs **20 herb** to instantly heal an injured character
- Sets `injuryTimer` to 0, `status` to `'idle'`
- Only works on characters with `status: 'injured'`
- Returns `{ success: false, reason: '...' }` if insufficient herb or wrong status

---

## 6. High-Tier Forging Ore Costs

### Recipe Changes (recipes.ts)

Immortal and divine tier forging recipes now include ore costs:

| Recipe | Previous Cost | New Cost |
|--------|--------------|----------|
| forge_immortal_offensive | spiritStone only | spiritStone + ore |
| forge_immortal_defensive | spiritStone only | spiritStone + ore |
| forge_divine_offensive | spiritStone only | spiritStone + ore |
| forge_divine_defensive | spiritStone only | spiritStone + ore |

This creates a clear progression: common→spirit uses some ore, immortal→divine uses MORE ore.

---

## 7. Save Compatibility

All new cost fields are optional:
- `BuildingUpgradeCost.herb?` / `ore?` — default to 0 if absent
- `BreakthroughResourceCost.herb?` — default to 0 if absent
- Old saves load without migration

---

## 8. Tests Required

| Test File | Coverage |
|-----------|----------|
| `TideSystem.test.ts` | All 3 phases, cycle wraparound, boundary conditions, countdown format |
| `stores.test.ts` (updated) | Tide multiplier application, herb breakthrough costs, herb healing |

---

## 9. Key Files

| File | Purpose |
|------|---------|
| `src/systems/economy/TideSystem.ts` | New — spirit tide cycle |
| `src/data/buildings.ts` | Modified — multi-resource upgrade costs |
| `src/data/realms.ts` | Modified — herb breakthrough costs |
| `src/data/recipes.ts` | Modified — ore costs for high-tier forging |
| `src/systems/cultivation/BreakthroughCoordinator.ts` | Modified — herb cost checking |
| `src/stores/sectStore/buildingSlice.ts` | Modified — multi-resource upgrade deduction |
| `src/stores/sectStore/tickSlice.ts` | Modified — tide multiplier application |
| `src/stores/sectStore/miscSlice.ts` | Modified — herb healing cost |
| `src/pages/SectPage.tsx` | Modified — tide display |
