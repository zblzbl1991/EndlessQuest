# Character Level System Code-Spec

> Contracts and patterns for the character level-up and experience growth system.

---

## 1. Scope / Trigger

The character level system provides permanent stat growth through experience (XP) accumulation. Characters gain XP from three sources:

- **Cultivation ticks** — idle disciples gain XP proportional to cultivation (`cultivationGain / 5`)
- **Dungeon completion** — XP = `cultivationGain` from `calcDungeonGrowth()`
- **Random events** — XP = effect value from cultivation-type random events

This spec covers: XP/level calculation, stat growth contracts, realm-level caps, and integration points.

---

## 2. Signatures

### Core Level System

```ts
// src/data/levelSystem.ts

export const QUALITY_LEVEL_STATS: Record<CharacterQuality, { hp: number; atk: number; def: number }>
export const REALM_LEVEL_CAPS: readonly [10, 20, 30, 40, 50, 60]

export function getRealmLevelCap(realmIndex: number): number
export function calcXpToNextLevel(level: number): number  // = level * 100
export function getPerLevelStatBoost(
  quality: CharacterQuality,
  growthMultipliers?: Pick<GrowthMultipliers, 'hp' | 'atk' | 'def'>
): { hp: number; atk: number; def: number }

export function tryLevelUp(
  currentLevel: number,
  currentXp: number,
  xpGain: number,
  quality: CharacterQuality,
  realmIndex: number,
  growthMultipliers?: GrowthMultipliers
): LevelUpResult

export function applyCharacterExperience(character: Character, xpGain: number): CharacterExperienceResult
```

### Result Types

```ts
interface LevelUpResult {
  levelsGained: number
  xpRemaining: number
  statBoost: { hp: number; atk: number; def: number }
}

interface CharacterExperienceResult {
  character: Character
  xpGained: number
  levelsGained: number
  statBoost: { hp: number; atk: number; def: number }
}
```

---

## 3. Contracts

### Quality → Per-Level Growth

| Quality | HP/level | ATK/level | DEF/level |
|---------|----------|-----------|-----------|
| common  | 2        | 1         | 1         |
| spirit  | 4        | 2         | 2         |
| immortal| 6        | 3         | 3         |
| divine  | 8        | 4         | 4         |
| chaos   | 12       | 6         | 6         |

These base values are multiplied by the character's `growthMultipliers` (hp, atk, def) and rounded.

### Realm → Level Cap

| Realm Index | Level Cap |
|-------------|-----------|
| 0           | 10        |
| 1           | 20        |
| 2           | 30        |
| 3           | 40        |
| 4           | 50        |
| 5           | 60        |

When a character reaches the cap, excess XP is discarded (`xpRemaining` set to 0). Characters must break through to the next realm to continue leveling.

### XP Formula

```ts
calcXpToNextLevel(level) = level * 100
// Lv.1 → 100 XP, Lv.5 → 500 XP, Lv.10 → 1000 XP
```

### XP Sources

| Source | XP Amount | Trigger |
|--------|-----------|---------|
| Cultivation tick | `Math.floor(cultivationGain / 5)` | Every tick for idle disciples |
| Dungeon completion | `growth.cultivationGain` from `calcDungeonGrowth()` | Run settlement (auto + manual) |
| Random event | `effect.value` | Cultivation-type random events |

### Stat Application

Level-up stat boosts are applied directly to `character.baseStats`:

```ts
character.baseStats.hp += levelResult.statBoost.hp
character.baseStats.atk += levelResult.statBoost.atk
character.baseStats.def += levelResult.statBoost.def
```

---

## 4. Validation & Error Matrix

| Condition | Expected Behavior |
|-----------|------------------|
| XP gain ≤ 0 | `applyCharacterExperience` returns unchanged character, `xpGained: 0` |
| Level at realm cap | Excess XP discarded, `xpRemaining = 0` |
| `character.level` is undefined/null | Defaulted to 1 via `Math.max(1, character.level ?? 1)` |
| `character.xp` is undefined/null | Defaulted to 0 via `Math.max(0, character.xp ?? 0)` |
| Multi-level-up in single XP gain | `tryLevelUp` loops until XP insufficient or cap reached |
| Growth multiplier of 0 | Would produce 0 stat gain per level (valid but unlikely) |

---

## 5. Good/Base/Bad Cases

### Good: Common character levels up twice from dungeon

```ts
const result = applyCharacterExperience(
  { ...baseCharacter, quality: 'common', level: 1, xp: 95, growthMultipliers: defaultGm },
  210  // 95 + 210 = 305 XP → Lv.1 costs 100, Lv.2 costs 200 → lands at Lv.3, xp 5
)
expect(result.levelsGained).toBe(2)
expect(result.character.level).toBe(3)
expect(result.statBoost).toEqual({ hp: 4, atk: 2, def: 2 })  // 2 levels × common stats
```

### Base: Level cap prevents further growth

```ts
const result = applyCharacterExperience(
  { ...baseCharacter, quality: 'common', realm: 0, level: 9, xp: 50, growthMultipliers: defaultGm },
  1000
)
// realm 0 cap = 10, so only 1 level gained
expect(result.character.level).toBe(10)
expect(result.character.xp).toBe(0)  // excess discarded
```

### Bad: XP gain at cap produces no level change

```ts
const result = applyCharacterExperience(
  { ...baseCharacter, quality: 'common', realm: 0, level: 10, xp: 0, growthMultipliers: defaultGm },
  500
)
expect(result.levelsGained).toBe(0)
expect(result.character.level).toBe(10)  // unchanged
```

---

## 6. Integration Points

### tickSlice.ts — Cultivation XP

During `tickAll()`, idle disciples gain cultivation which is converted to XP:

```ts
const xpGain = Math.max(0, Math.floor(gained / 5))
if (xpGain > 0) {
  const levelResult = applyCharacterExperience(updatedChar, xpGain)
  updatedChar = levelResult.character
  if (levelResult.levelsGained > 0) {
    levelUpEvents.push(formatLevelUpMessage(...))
  }
}
```

Level-up events are emitted as `'milestone'` type after all character processing.

### adventureStore.ts — Dungeon Growth XP

In both `applyDungeonGrowth()` (auto runs) and `applyManualRunGrowth()`:

1. Apply dungeon stat boost to baseStats first
2. Apply cultivation gain to totalCultivation
3. Call `applyCharacterExperience()` with the grown character
4. Emit `'milestone'` event if level-up occurred
5. Record detailed growth in `dungeonGrowthApplied` including `xpGained`, `levelsGained`, `levelAfter`, `statGain`

### AdventureReport type extension

```ts
dungeonGrowthApplied?: Record<string, {
  statBoost: number
  cultivationGain: number
  xpGained?: number
  levelsGained?: number
  levelAfter?: number
  statGain?: { hp: number; atk: number; def: number }
}>
```

---

## 7. Tests Required

### CharacterLevelSystem.test.ts
- Single level-up with sufficient XP
- Multi-level-up from large XP gain
- Level cap enforced by realm
- Zero/negative XP produces no change
- Stat boost matches quality × growthMultipliers

### Integration: tickSlice
- Idle disciple gains XP during cultivation tick
- Level-up triggers `milestone` event in eventLogStore

### Integration: adventureStore
- Dungeon completion applies XP + stat growth
- `dungeonGrowthApplied` contains level-up details
- Manual run growth also applies levels

### Integration: AdventureReportPage
- Report shows level-up details in growth summary card

---

## Design Decisions

### Decision: XP formula is linear (`level * 100`)

**Context**: How fast should characters progress through levels?

**Decision**: Linear scaling (`level * 100`), meaning each level costs more but not exponentially more.

**Why**: Keeps the system approachable and predictable. Combined with realm caps (10/20/30...), a common character at realm 0 gains at most +20 HP / +10 ATK / +10 DEF total from levels — meaningful but not overwhelming. Higher quality characters benefit much more per level (chaos: +120 HP / +60 ATK / +60 DEF at realm 0 cap).

### Decision: XP applied as post-step after stat boost (dungeon)

**Context**: In dungeon growth, should XP be calculated before or after stat boost application?

**Decision**: Apply dungeon stat boost to baseStats first, then call `applyCharacterExperience()` on the already-boosted character. The XP input is `cultivationGain`, not stat-related.

**Why**: `applyCharacterExperience()` only reads `quality`, `realm`, `level`, `xp`, and `growthMultipliers` — it doesn't interact with `baseStats` except to add level-up boosts. Order doesn't affect XP calculation, but applying stat boost first ensures the character state is consistent when the function runs.
