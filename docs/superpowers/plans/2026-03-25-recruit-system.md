# 招募系统重构 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将免费固定属性招募改为消耗灵石、属性随机浮动、随机天赋的 Roguelike 招募体验。

**Architecture:** 新增 Talent 类型和天赋数据表。改造 CharacterEngine 加入属性浮动和天赋生成逻辑。改造 SectStore 的 addCharacter 消耗灵石并增加品质解锁检查。改造 RecruitTab UI 显示费用和招募结果弹层。SaveSystem 增加 v2 存档兼容处理。

**Tech Stack:** React 19, TypeScript 5.9, Vite 8, Zustand 5, Vitest 4

**Spec:** `docs/superpowers/specs/2026-03-25-recruit-system-design.md`

---

## Task 1: Talent Types & Data Table

**Files:**
- Create: `src/types/talent.ts`
- Create: `src/data/talents.ts`
- Modify: `src/types/character.ts` (add `talents` field)
- Modify: `src/types/index.ts` (export Talent types)
- Create: `src/__tests__/talents.test.ts`

- [ ] **Step 1: Write the failing talent test**

```typescript
// src/__tests__/talents.test.ts
import { ALL_TALENTS, getTalentsByRarity, getTalentById } from '../data/talents'
import type { Talent, TalentEffect, TalentRarity } from '../types/talent'
import { TALENT_RARITY_NAMES } from '../types/talent'

describe('talent types', () => {
  it('should construct a valid talent with single effect', () => {
    const t: Talent = {
      id: 'wugu',
      name: '武骨',
      description: '攻击+3',
      effect: [{ stat: 'atk', value: 3 }],
      rarity: 'common',
    }
    expect(t.effect).toHaveLength(1)
    expect(t.effect[0].stat).toBe('atk')
  })

  it('should construct a valid talent with dual effects', () => {
    const t: Talent = {
      id: 'taiji',
      name: '太极',
      description: '灵根+8, 悟性+3',
      effect: [{ stat: 'spiritualRoot', value: 8 }, { stat: 'comprehension', value: 3 }],
      rarity: 'epic',
    }
    expect(t.effect).toHaveLength(2)
  })
})

describe('TALENT_RARITY_NAMES', () => {
  it('should have names for all rarities', () => {
    expect(TALENT_RARITY_NAMES.common).toBe('凡')
    expect(TALENT_RARITY_NAMES.rare).toBe('良')
    expect(TALENT_RARITY_NAMES.epic).toBe('绝')
  })
})

describe('talent data table', () => {
  it('should have 12 talents', () => {
    expect(ALL_TALENTS).toHaveLength(12)
  })

  it('should have all talents with unique ids', () => {
    const ids = new Set(ALL_TALENTS.map(t => t.id))
    expect(ids.size).toBe(12)
  })

  it('should have correct rarity distribution', () => {
    const byRarity = getTalentsByRarity()
    expect(byRarity.common).toHaveLength(6)
    expect(byRarity.rare).toHaveLength(4)
    expect(byRarity.epic).toHaveLength(2)
  })

  it('getTalentById should return correct talent', () => {
    const t = getTalentById('tianmai')
    expect(t).toBeDefined()
    expect(t!.name).toBe('天脉')
    expect(t!.rarity).toBe('rare')
  })

  it('getTalentById should return undefined for unknown id', () => {
    expect(getTalentById('nonexistent')).toBeUndefined()
  })

  it('all effects should reference valid stats', () => {
    const validStats = new Set([
      'spiritualRoot', 'comprehension', 'fortune',
      'hp', 'atk', 'def', 'spd', 'crit', 'critDmg', 'maxSpiritPower',
    ])
    for (const talent of ALL_TALENTS) {
      for (const eff of talent.effect) {
        expect(validStats.has(eff.stat)).toBe(true)
      }
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/talents.test.ts`
Expected: FAIL (modules don't exist yet)

- [ ] **Step 3: Create `src/types/talent.ts`**

```typescript
export type TalentId = string

export type TalentStat =
  | 'spiritualRoot' | 'comprehension' | 'fortune'
  | 'hp' | 'atk' | 'def' | 'spd' | 'crit' | 'critDmg'
  | 'maxSpiritPower'

export type TalentRarity = 'common' | 'rare' | 'epic'

export interface TalentEffect {
  stat: TalentStat
  value: number
}

export interface Talent {
  id: TalentId
  name: string
  description: string
  effect: TalentEffect[]
  rarity: TalentRarity
}

export const TALENT_RARITY_NAMES: Record<TalentRarity, string> = {
  common: '凡',
  rare: '良',
  epic: '绝',
}
```

- [ ] **Step 4: Create `src/data/talents.ts`**

Export `ALL_TALENTS: Talent[]` (12 talents per spec section 2.1), `getTalentById(id)`, `getTalentsByRarity()`.

- [ ] **Step 5: Add `talents` field to Character**

In `src/types/character.ts`, add `talents: Talent[]` to the `Character` interface. Import `Talent` from `./talent`.

- [ ] **Step 6: Update `src/types/index.ts`**

Add: `export type { Talent, TalentEffect, TalentStat, TalentRarity, TalentId } from './talent'`
Add: `export { TALENT_RARITY_NAMES } from './talent'`

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/talents.test.ts`
Expected: PASS

- [ ] **Step 8: Run full build to check for type errors**

Run: `npx tsc --noEmit`
Expected: Errors from files that construct `Character` without `talents` field — note these for Task 2.

- [ ] **Step 9: Commit**

```
feat: add Talent type system and data table
```

---

## Task 2: CharacterEngine — Attribute Variance & Talent Generation

**Files:**
- Modify: `src/systems/character/CharacterEngine.ts`
- Modify: `src/__tests__/CharacterEngine.test.ts`

- [ ] **Step 1: Write failing tests for variance and talents**

Add to `src/__tests__/CharacterEngine.test.ts`:

```typescript
describe('generateCharacter with variance', () => {
  it('should generate common character with stats within ±20% range', () => {
    for (let i = 0; i < 50; i++) {
      const c = generateCharacter('common')
      // base hp=100, range: 80-120
      expect(c.baseStats.hp).toBeGreaterThanOrEqual(80)
      expect(c.baseStats.hp).toBeLessThanOrEqual(120)
      // base atk=15, range: 12-18
      expect(c.baseStats.atk).toBeGreaterThanOrEqual(12)
      expect(c.baseStats.atk).toBeLessThanOrEqual(18)
      // spiritualRoot base=10, range: 8-12
      expect(c.cultivationStats.spiritualRoot).toBeGreaterThanOrEqual(8)
      expect(c.cultivationStats.spiritualRoot).toBeLessThanOrEqual(12)
      // maxSpiritPower base=100, range: 80-120
      expect(c.cultivationStats.maxSpiritPower).toBeGreaterThanOrEqual(80)
      expect(c.cultivationStats.maxSpiritPower).toBeLessThanOrEqual(120)
      // spiritPower should NOT vary (starts at 0, must stay 0)
      expect(c.cultivationStats.spiritPower).toBe(0)
    }
  })

  it('should generate divine character with stats within ±12% range', () => {
    for (let i = 0; i < 50; i++) {
      const c = generateCharacter('divine')
      // base hp=100, range: 88-112
      expect(c.baseStats.hp).toBeGreaterThanOrEqual(88)
      expect(c.baseStats.hp).toBeLessThanOrEqual(112)
      // spiritualRoot base=28, range: ~24.64-~31.36
      expect(c.cultivationStats.spiritualRoot).toBeGreaterThanOrEqual(24)
      expect(c.cultivationStats.spiritualRoot).toBeLessThanOrEqual(32)
    }
  })

  it('should have talents array on every character', () => {
    const c = generateCharacter('common')
    expect(Array.isArray(c.talents)).toBe(true)
  })

  it('should not have duplicate talents', () => {
    for (let i = 0; i < 100; i++) {
      const c = generateCharacter('immortal')
      const ids = c.talents.map(t => t.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})

describe('getRecruitCost', () => {
  it('should return correct costs', () => {
    expect(getRecruitCost('common')).toBe(100)
    expect(getRecruitCost('spirit')).toBe(500)
    expect(getRecruitCost('immortal')).toBe(2000)
    expect(getRecruitCost('divine')).toBe(8000)
  })

  it('should return 0 for chaos (not directly recruitable)', () => {
    expect(getRecruitCost('chaos')).toBe(0)
  })
})

describe('isQualityUnlocked', () => {
  it('common at level 1', () => expect(isQualityUnlocked('common', 1)).toBe(true))
  it('spirit at level 1', () => expect(isQualityUnlocked('spirit', 1)).toBe(false))
  it('spirit at level 2', () => expect(isQualityUnlocked('spirit', 2)).toBe(true))
  it('immortal at level 3', () => expect(isQualityUnlocked('immortal', 3)).toBe(true))
  it('divine at level 4', () => expect(isQualityUnlocked('divine', 4)).toBe(true))
  it('chaos always locked', () => expect(isQualityUnlocked('chaos', 5)).toBe(false))
})

describe('getAvailableQualities', () => {
  it('level 1 should return [common]', () => expect(getAvailableQualities(1)).toEqual(['common']))
  it('level 2 should return [common, spirit]', () => expect(getAvailableQualities(2)).toEqual(['common', 'spirit']))
  it('level 4 should return [common, spirit, immortal, divine]', () => expect(getAvailableQualities(4)).toEqual(['common', 'spirit', 'immortal', 'divine']))
  it('level 5+ should also return [common, spirit, immortal, divine]', () => expect(getAvailableQualities(5)).toEqual(['common', 'spirit', 'immortal', 'divine']))
})

describe('talent weight distribution', () => {
  it('common quality: ~40% should have exactly 1 talent', () => {
    let countWithTalent = 0
    const n = 500
    for (let i = 0; i < n; i++) {
      const c = generateCharacter('common')
      if (c.talents.length >= 1) countWithTalent++
    }
    // 40% of 500 = ~200, allow 30-50%
    expect(countWithTalent).toBeGreaterThan(n * 0.25)
    expect(countWithTalent).toBeLessThan(n * 0.55)
  })

  it('divine quality: all should have at least 1 talent', () => {
    for (let i = 0; i < 100; i++) {
      const c = generateCharacter('divine')
      expect(c.talents.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('talent rarity distribution should follow weights', () => {
    const rarityCounts = { common: 0, rare: 0, epic: 0 }
    for (let i = 0; i < 500; i++) {
      const c = generateCharacter('immortal')
      for (const t of c.talents) {
        rarityCounts[t.rarity]++
      }
    }
    const total = rarityCounts.common + rarityCounts.rare + rarityCounts.epic
    if (total > 0) {
      // immortal weights: common 50%, rare 40%, epic 10%
      // Allow wide tolerance: common 35-65%, rare 25-55%, epic 0-25%
      expect(rarityCounts.common / total).toBeGreaterThan(0.3)
      expect(rarityCounts.rare / total).toBeGreaterThan(0.2)
      if (rarityCounts.epic > 0) {
        expect(rarityCounts.epic / total).toBeLessThan(0.3)
      }
    }
  })
})

describe('talent effect stacking', () => {
  it('talent effects should be applied to character stats', () => {
    // Generate many characters and check that at least one has talent-modified stats
    let foundTalentEffect = false
    for (let i = 0; i < 200; i++) {
      const c = generateCharacter('common')
      if (c.talents.length > 0) {
        foundTalentEffect = true
        // The character should have valid stats (not NaN, not negative)
        expect(c.baseStats.atk).toBeGreaterThan(0)
        expect(c.cultivationStats.spiritualRoot).toBeGreaterThan(0)
        break
      }
    }
    // Not guaranteed but very likely with 200 tries at 40% rate
    expect(foundTalentEffect).toBe(true)
  })
})

describe('chaos upgrade from divine', () => {
  it('should occasionally produce chaos quality when recruiting divine', () => {
    let chaosCount = 0
    const n = 2000
    for (let i = 0; i < n; i++) {
      const c = generateCharacter('divine')
      if (c.quality === 'chaos') chaosCount++
    }
    // 0.5% of 2000 = ~10, allow wide variance
    expect(chaosCount).toBeGreaterThan(0)
    expect(chaosCount).toBeLessThan(n * 0.05) // not more than 5%
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/CharacterEngine.test.ts`
Expected: FAIL (new functions not defined; old exact-value tests still pass at this point)

- [ ] **Step 3: Implement variance, talents, costs in CharacterEngine**

Key changes to `src/systems/character/CharacterEngine.ts`:

1. Add `QUALITY_VARIANCE` map: `{ common: 0.2, spirit: 0.18, immortal: 0.15, divine: 0.12, chaos: 0.1 }`
2. Add `rollTalents(quality)` function implementing the talent count + selection logic from spec section 2.2
3. Modify `generateCharacter()`:
   - After setting base stats, apply variance to these specific fields:
     - baseStats: hp, atk, def, spd, crit, critDmg
     - cultivationStats: comprehension, spiritualRoot, fortune, maxSpiritPower
     - **DO NOT** apply variance to `spiritPower` (starts at 0, would go negative)
   - Rounding: hp/atk/def/spd/spiritualRoot/comprehension/fortune/maxSpiritPower → `Math.round()`, crit/critDmg → `Math.round(x * 1000) / 1000`
   - Call `rollTalents(quality)` and apply talent effects to stats
   - Set `talents` field on the Character object
   - For `quality === 'divine'`: 0.5% chance to set `quality = 'chaos'` (after full generation, keeping divine stats)
4. Add `RECRUIT_COSTS` as `Partial<Record<CharacterQuality, number>>` (no chaos entry), `getRecruitCost()` (returns 0 for unknown), `isQualityUnlocked()`, `getAvailableQualities()`
5. Add `QUALITY_UNLOCK_LEVEL` map: `{ common: 1, spirit: 2, immortal: 3, divine: 4 }`

**Note:** `createInitialState()` in `sectStore.ts` calls `generateCharacter('common')` directly. After this change, the initial disciple will also have variance and talents. No changes needed to `createInitialState()` — it delegates to `generateCharacter`.

- [ ] **Step 4: Fix existing generateCharacter tests**

Change the exact-value assertions in existing tests to range assertions:

- Lines 50-57 (`should generate common character with correct base stats`): Change `expect(c.baseStats).toEqual({ hp: 100, ... })` to range checks for each stat.
- Lines 59-65 (`should generate spirit character`): Change `expect(c.cultivationStats.spiritualRoot).toBe(15)` to `toBeGreaterThanOrEqual(12).toBeLessThanOrEqual(18)` (15 ± 18%).
- Lines 67-72 (`should generate divine character`): Same pattern with divine range (±12%).

For `calcCharacterTotalStats` tests (lines 115-174):
- Lines 117-119 (`should return base stats when no equipment or technique`): **No change needed** — compares `result` to `c.baseStats` which is now variable.
- Lines 122-129 (`should add equipment stats`): Change `expect(result.hp).toBe(150)` to `expect(result.hp).toBe(c.baseStats.hp + 50)`. Similarly for atk: `expect(result.atk).toBe(c.baseStats.atk + 10)`. Change def assertion to `expect(result.def).toBe(c.baseStats.def)`.
- Lines 132-154 (technique growth modifier tests): Use `c.baseStats.hp * 1.2` instead of hardcoded `120`, `c.baseStats.atk * 1.1 + c.baseStats.atk` instead of `16.5`, etc.
- Lines 156-174 (technique flat bonuses test): Use `c.baseStats.atk + 5` instead of `20`, `c.baseStats.hp + 100` instead of `200`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/CharacterEngine.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```
feat: add attribute variance, talent generation, and recruit costs to CharacterEngine
```

---

## Task 3: SectStore — addCharacter Cost & canRecruit

**Files:**
- Modify: `src/stores/sectStore.ts`
- Modify: `src/__tests__/stores.test.ts`

- [ ] **Step 1: Write failing tests**

Add to `src/__tests__/stores.test.ts`:

```typescript
describe('SectStore - Recruit Cost', () => {
  beforeEach(() => resetStore())

  it('addCharacter should deduct spirit stones', () => {
    const before = getStore().sect.resources.spiritStone
    getStore().addCharacter('common') // costs 100
    expect(getStore().sect.resources.spiritStone).toBe(before - 100)
  })

  it('addCharacter should return null when insufficient stones', () => {
    // Spend all stones
    getStore().spendResource('spiritStone', 500)
    const char = getStore().addCharacter('common') // costs 100
    expect(char).toBeNull()
  })

  it('addCharacter should return null when quality not unlocked', () => {
    const char = getStore().addCharacter('divine') // needs level 4, current is 1
    expect(char).toBeNull()
  })

  it('canRecruit should report insufficient stones', () => {
    getStore().spendResource('spiritStone', 500)
    const result = getStore().canRecruit('common')
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('灵石不足')
  })

  it('canRecruit should report quality locked', () => {
    const result = getStore().canRecruit('divine')
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('宗门等级不足')
  })

  it('canRecruit should report characters full', () => {
    // Add 4 more characters (total 5, which is max for level 1)
    for (let i = 0; i < 4; i++) getStore().addCharacter('common')
    const result = getStore().canRecruit('common')
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('弟子已满')
  })

  it('canRecruit should allow when conditions met', () => {
    const result = getStore().canRecruit('common')
    expect(result.allowed).toBe(true)
    expect(result.reason).toBe('')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/stores.test.ts`
Expected: FAIL (canRecruit not defined, addCharacter doesn't check cost/quality)

- [ ] **Step 3: Fix existing addCharacter tests**

The existing test `addCharacter should return null when at max` adds 4 characters (costing 400 total from initial 500). After the 4th addition, 100 stones remain — exactly the cost of one more common recruit. The 5th addCharacter call should now fail due to character cap (5 total), not stone cost. This test should still pass.

However, other tests that call `addCharacter` without ensuring sufficient stones need fixing:
- Line 903: `addCharacter('spirit')` after `addResource('spiritStone', 1000)` — OK (total 1500, spirit costs 500)
- Line 961, 976: `addCharacter('common')` — need to ensure enough stones
- Line 997: `addCharacter('common')` in a loop of 4 — need enough stones (initial 500 - 100 = 400 for first, 300 for second, etc.)

For tests that break, add `addResource('spiritStone', 10000)` before the addCharacter calls.

- [ ] **Step 4: Implement addCharacter changes and canRecruit**

In `src/stores/sectStore.ts`:

1. Import `getRecruitCost, isQualityUnlocked` from CharacterEngine
2. Add `canRecruit` to `SectStore` interface
3. Modify `addCharacter`:
   - Add quality unlock check: `if (!isQualityUnlocked(quality, sect.level)) return null`
   - Add cost check: `const cost = getRecruitCost(quality); if (sect.resources.spiritStone < cost) return null`
   - Deduct stones before adding character
4. Implement `canRecruit`: check unlock → check cap → check stones, return result

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/stores.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```
feat: add spirit stone cost and quality unlock to recruit system
```

---

## Task 4: Save System Compatibility

**Files:**
- Modify: `src/systems/save/SaveSystem.ts`

- [ ] **Step 1: Write failing test**

Add to `src/__tests__/SaveSystem.test.ts`:

```typescript
it('should migrate v2 saves missing talents field', () => {
  // Simulate a v2 save with characters that have no talents field
  const oldChar = {
    id: 'c1', name: '测试', title: 'disciple' as const, quality: 'common' as const,
    realm: 0, realmStage: 0, cultivation: 0,
    baseStats: { hp: 100, atk: 15, def: 8, spd: 10, crit: 0.05, critDmg: 1.5 },
    cultivationStats: { spiritPower: 0, maxSpiritPower: 100, comprehension: 10, spiritualRoot: 10, fortune: 5 },
    currentTechnique: null, techniqueComprehension: 0, learnedTechniques: [],
    equippedGear: [], equippedSkills: [], backpack: [], maxBackpackSlots: 20, petIds: [],
    status: 'cultivating' as const, injuryTimer: 0, createdAt: Date.now(), totalCultivation: 0,
    // NOTE: no talents field
  }

  const saveData = {
    version: 2,
    timestamp: Date.now(),
    sectStore: {
      sect: {
        name: '测试宗门', level: 1,
        resources: { spiritStone: 500, spiritEnergy: 0, herb: 0, ore: 0, fairyJade: 0, scrollFragment: 0, heavenlyTreasure: 0, beastSoul: 0 },
        buildings: [], characters: [oldChar], vault: [], maxVaultSlots: 50, pets: [], totalAdventureRuns: 0, totalBreakthroughs: 0,
      },
    },
    adventureStore: { activeRuns: {} },
    gameStore: { saveSlot: 0, lastOnlineTime: Date.now() },
  }

  localStorage.setItem(SAVE_KEY, JSON.stringify(saveData))
  const loaded = loadGame()
  expect(loaded).toBe(true)

  const char = useSectStore.getState().sect.characters[0]
  expect(char.talents).toEqual([])
  expect(Array.isArray(char.talents)).toBe(true)

  clearSaveData()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/SaveSystem.test.ts`
Expected: FAIL (old characters have `talents: undefined`)

- [ ] **Step 3: Implement migration in SaveSystem**

In `loadGame()`, after restoring sect state (line 49-51), add migration logic:

```typescript
if (data.sectStore?.sect) {
  // v2 compatibility: ensure all characters have talents field
  const migratedCharacters = (data.sectStore.sect.characters ?? []).map((char: any) => ({
    ...char,
    talents: char.talents ?? [],
  }))
  useSectStore.setState({
    sect: { ...data.sectStore.sect, characters: migratedCharacters },
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/SaveSystem.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```
feat: add v2 save migration for talents field
```

---

## Task 5: RecruitTab UI Redesign

**Files:**
- Modify: `src/pages/BuildingsPage.tsx`
- Modify: `src/pages/BuildingsPage.module.css`

- [ ] **Step 1: Update RecruitTab in BuildingsPage.tsx**

Key changes:

1. Import `getRecruitCost, getAvailableQualities` from CharacterEngine
2. Replace `QUALITY_OPTIONS` with dynamic list from `getAvailableQualities(sect.level)` + cost display
3. Add `canRecruit` check for disabled state (not just full check)
4. Replace simple text result with a result modal showing:
   - Character name + quality badge
   - Stats with color coding (green if >+10%, red if <-10% of base)
   - Talents list with rarity color
   - Close button
5. Show cost on recruit button: `招收凡品弟子 (100灵石)`

- [ ] **Step 2: Add CSS for recruit result modal**

In `BuildingsPage.module.css`, add:

- `.recruitResultModal` — fixed overlay modal (similar to existing `.transferModal`)
- `.recruitResultContent` — card with character info
- `.recruitCharName` — name + quality display
- `.recruitStats` — grid of stat values with color variants
- `.statHigh` / `.statLow` — green/red color classes
- `.recruitTalents` — talent list
- `.talentRare` / `.talentEpic` — blue/purple color classes

- [ ] **Step 3: Run build to verify no type errors**

Run: `npm run build`
Expected: SUCCESS

- [ ] **Step 4: Commit**

```
feat: redesign RecruitTab with cost display and result modal
```

---

## Task 6: Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: SUCCESS (0 errors)

- [ ] **Step 3: Start dev server and visually verify**

Run: `npm run dev`
Verify:
- [ ] Recruit tab shows costs on quality buttons
- [ ] Locked qualities still show lock hint
- [ ] Recruit button shows cost and disables when insufficient stones
- [ ] After recruit, result modal shows character stats with colors
- [ ] Talents display with rarity colors
- [ ] Save/load preserves talents
- [ ] Existing save loads without crash (talents default to [])

- [ ] **Step 4: Commit**

```
chore: complete recruit system verification
```
