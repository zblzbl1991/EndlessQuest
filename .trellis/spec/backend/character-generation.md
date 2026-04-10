# Character Generation Code-Spec

> Contracts and patterns for the character generation and randomization systems.

---

## 1. Scope / Trigger

Character generation creates new disciples with 3 independent randomization dimensions:
- **Element Affinity** — 5-element wuxing system with optional secondary
- **Growth Multipliers** — 6-stat per-level growth scaling
- **Talent Affixes** — prefix/suffix from 80-pool with quality-gated rarity

This spec covers: type contracts, generation signatures, quality constraints, save migration.

---

## 2. Signatures

### Core Generation

```ts
// src/systems/character/CharacterEngine.ts
export function generateCharacter(
  quality: CharacterQuality,
  activeRoute: SectRouteId | null = null
): Character
```

### Element Affinity

```ts
// Internal to CharacterEngine
function rollElementAffinity(quality: CharacterQuality): ElementAffinity

// src/types/character.ts
interface ElementAffinity {
  primary: Element       // One of metal|wood|earth|water|fire (never neutral)
  secondary?: Element    // Optional, never equals primary, never neutral
}
```

### Growth Multipliers

```ts
// src/systems/character/GrowthMultiplierSystem.ts
export function generateGrowthMultipliers(quality: CharacterQuality): GrowthMultipliers
export function getDefaultGrowthMultipliers(): GrowthMultipliers

// src/types/character.ts
interface GrowthMultipliers {
  hp: number; atk: number; def: number; spd: number; crit: number; critDmg: number
}
```

### Talent Affixes

```ts
// src/systems/character/TalentAffixGenerator.ts
export function rollAffixes(quality: CharacterQuality): {
  prefix?: TalentAffixInstance; suffix?: TalentAffixInstance
}
export function resolveAffix(affix: TalentAffix): TalentAffixInstance
```

---

## 3. Contracts

### Quality → Randomization Pool

| Quality | Secondary Affinity | Growth Range | Growth Sum | Prefix Pool | Suffix Pool |
|---------|-------------------|--------------|------------|-------------|-------------|
| common  | 0%                | 0.6–1.3      | 4.0–6.5    | common (60%) | common (30%) |
| spirit  | 20%               | 0.6–1.4      | 4.5–7.0    | common+rare | common+rare |
| immortal| 40%               | 0.6–1.5      | 5.0–7.5    | common+rare+epic | common+rare+epic |
| divine  | 60%               | 0.7–1.6      | 5.5–8.0    | rare+epic+legendary | rare+epic+legendary |
| chaos   | 80%               | 0.8–1.7      | 6.0–8.5    | epic+legendary | epic+legendary |

### Growth Multiplier Generation Algorithm

1. For each of 6 stats, roll `min + random() * (max - min)` within quality range
2. Check if sum falls within `[sumMin, sumMax]`
3. If not, retry (max 10 attempts)
4. Fallback: use last generated values regardless of sum constraint
5. Round all values to 2 decimal places

### Affix Effect Types (Discriminated Union)

```ts
type TalentAffixEffect =
  | { type: 'flatStat'; stat: TalentStat; minValue: number; maxValue: number }
  | { type: 'elementDamage'; element: string; minValue: number; maxValue: number }
  | { type: 'conditional'; trigger: string; effect: { stat, minValue, maxValue }; threshold?: number }
  | { type: 'chance'; description: string; minValue: number; maxValue: number; effect: { stat, value } }
  | { type: 'modifier'; target: string; minValue: number; maxValue: number }
```

### Character Output Contract

```ts
interface Character {
  // ... existing fields ...
  talents: Talent[]              // Kept for migration compat, always empty for new chars
  elementAffinity: ElementAffinity  // Always present, primary never neutral
  growthMultipliers: GrowthMultipliers  // Always present, all values > 0
  prefix?: TalentAffixInstance    // Optional, quality-gated
  suffix?: TalentAffixInstance    // Optional, quality-gated
}
```

---

## 4. Validation & Error Matrix

| Condition | Expected Behavior |
|-----------|------------------|
| `elementAffinity.primary` is `neutral` | Never happens — primary is picked from wuxing 5 |
| `elementAffinity.secondary === primary` | Never happens — filtered out |
| Growth multiplier value < 0.6 or > 1.7 | Never happens — constrained by quality config |
| Growth sum outside range | Possible only on fallback (10 failed attempts) |
| Affix with unknown ID | `getAffixById` returns `undefined`, migration skips it |
| Common quality with epic affix | Never happens — rarity pool gated by quality |
| Chaos quality with common affix | Never happens — rarity pool gated by quality |

---

## 5. Good/Base/Bad Cases

### Good: Chaos character with strong dimensions

```ts
const c = generateCharacter('chaos')
// elementAffinity: { primary: 'fire', secondary: 'metal' }
// growthMultipliers: { hp: 1.5, atk: 1.6, def: 1.2, spd: 1.4, crit: 1.3, critDmg: 1.1 }
// prefix: { name: '不死', rarity: 'epic', resolvedEffects: [...] }
// suffix: { name: '之回春', rarity: 'legendary', resolvedEffects: [...] }
```

### Base: Common character with minimal dimensions

```ts
const c = generateCharacter('common')
// elementAffinity: { primary: 'water' }  // no secondary
// growthMultipliers: { hp: 0.8, atk: 1.1, def: 0.9, spd: 0.7, crit: 0.6, critDmg: 1.0 }
// prefix: undefined  // 40% chance of no prefix
// suffix: undefined  // 70% chance of no suffix
```

### Bad: Common character can exceed spirit in specific dimension

```ts
const common = generateCharacter('common')
const spirit = generateCharacter('spirit')
// common.growthMultipliers.atk could be 1.3
// spirit.growthMultipliers.atk could be 0.6
// This is BY DESIGN — quality affects range, not absolute power
```

---

## 6. Tests Required

### GrowthMultiplierSystem.test.ts
- Generated values within quality-specific range (100 iterations)
- Sum within quality-specific constraint (100 iterations)
- Default multipliers are all 1.0
- Chaos has wider range than common

### TalentAffixGenerator.test.ts
- Common quality only produces common rarity affixes
- Chaos quality only produces epic/legendary affixes
- Resolved effect values are positive
- Prefix/suffix probability matches quality config (~200 iterations)

### CharacterEngine.test.ts
- elementAffinity.primary is always a valid wuxing element
- elementAffinity.secondary never equals primary
- Common never has secondary affinity (100 iterations)
- Chaos frequently has secondary affinity (>60%)
- growthMultipliers within quality range
- Affix flatStat effects applied to baseStats

### SaveSystem migration
- Old talents array mapped to prefix/suffix with midpoint values
- Missing elementAffinity filled with random primary
- Missing growthMultipliers filled with all 1.0

---

## 7. Wrong vs Correct

### Wrong: Quality determines absolute stat values

```ts
// Wrong — quality directly sets stat power
const baseStats = QUALITY_BASE_STATS[quality] // { hp: 100, atk: 20 } for chaos
```

### Correct: Quality determines randomization range

```ts
// Correct — quality widens the range, stats are still random within it
const config = GROWTH_CONFIG[quality] // { min: 0.8, max: 1.7 } for chaos
const value = config.min + Math.random() * (config.max - config.min)
```

**Why**: This creates the "Diablo loot" feeling where a common disciple can have exceptional growth in one dimension, making every character worth evaluating.

### Wrong: Testing with generateCharacter() for deterministic stat assertions

```ts
// Wrong — random affixes change baseStats, breaking exact value assertions
const c = generateCharacter('common')
expect(result.atk).toBe(c.baseStats.atk + 2) // affix may have added to atk
```

### Correct: Use deterministic test factories for exact assertions

```ts
// Correct — bare character with no random affixes
function makeBareCharacter(overrides = {}): Character {
  return {
    baseStats: { hp: 100, atk: 15, ... },
    elementAffinity: { primary: 'metal' },
    growthMultipliers: { hp: 1, atk: 1, ... },
    ...overrides,
  }
}
const c = makeBareCharacter()
expect(result.atk).toBe(c.baseStats.atk + 2) // deterministic
```

**Why**: `generateCharacter()` produces random prefix/suffix affixes that modify baseStats, making exact numeric comparisons unreliable. Use deterministic factories when testing calculation logic.

---

## Design Decisions

### Decision: talents array kept empty instead of removed

**Context**: Migration from old `talents: Talent[]` to new `prefix`/`suffix` affix system.

**Decision**: Keep `talents: Talent[]` as empty array in Character interface for now. New characters generate empty `[]`. Save migration converts old talents to affixes and clears the array.

**Why**: Removing the field would require updating every test fixture and factory simultaneously. Keeping it empty avoids a massive search-replace while the system stabilizes. Can be removed in a future cleanup pass.

### Decision: Affix effects applied to baseStats during generation

**Context**: FlatStat affix effects (e.g., atk +3) need to affect the character's actual stats.

**Decision**: Apply affix flatStat effects to baseStats/cultivationStats during `generateCharacter()`, not as a separate runtime layer.

**Why**: Simpler runtime model — stats are just stats, no need to re-derive from affixes every time. The trade-off is that affix stat contributions are "baked in" and can't be easily removed. This is acceptable because affixes are permanent (generated at creation, never changed).
