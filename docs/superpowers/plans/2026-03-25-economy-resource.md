# Economy Resource System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add spirit mine building for passive spirit stone/ore production, fix spirit field curve, add patrol adventure, and wire everything into the resource engine.

**Architecture:** Three independent subsystems — (1) Spirit Mine building data + ResourceEngine integration, (2) Spirit Field curve adjustment, (3) Patrol adventure in AdventureStore. Each is self-contained and can be implemented/tested independently. They share only the ResourceEngine interface.

**Tech Stack:** React 19, Zustand 5, TypeScript 5.9, Vitest

---

### Task 1: Add `spiritMine` to `BuildingType`

**Files:**
- Modify: `src/types/sect.ts:5-7`
- Test: `src/__tests__/BuildingSystem.test.ts:6-16`

- [ ] **Step 1: Write failing test — `createBuildings` helper missing `spiritMine`**

In `src/__tests__/BuildingSystem.test.ts`, the `createBuildings` helper at line 6 has a `defaults` object listing all building types. Add `spiritMine` to defaults so existing tests still pass:

```typescript
// In createBuildings defaults (line 7-15), add:
spiritMine: { level: 0, unlocked: false },
```

Also add a test verifying `spiritMine` exists in defaults:

```typescript
it('spiritMine should be a valid building type', () => {
  const buildings = createBuildings()
  const mine = buildings.find(b => b.type === 'spiritMine')
  expect(mine).toBeDefined()
  expect(mine?.level).toBe(0)
  expect(mine?.unlocked).toBe(false)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/BuildingSystem.test.ts --reporter=verbose`
Expected: FAIL — `spiritMine` not in `BuildingType` union

- [ ] **Step 3: Add `spiritMine` to `BuildingType`**

In `src/types/sect.ts:5-7`, add `'spiritMine'` to the union:

```typescript
export type BuildingType =
  | 'mainHall' | 'spiritField' | 'spiritMine' | 'market' | 'alchemyFurnace'
  | 'forge' | 'scriptureHall' | 'recruitmentPavilion' | 'trainingHall'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/BuildingSystem.test.ts --reporter=verbose`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/types/sect.ts src/__tests__/BuildingSystem.test.ts
git commit -m "feat: add spiritMine to BuildingType union"
```

---

### Task 2: Add Spirit Mine building definition

**Files:**
- Modify: `src/data/buildings.ts:13-22` (BUILDING_DEFS array)
- Modify: `src/data/buildings.ts:4-11` (BuildingDef interface — upgradeCost may need ore field)
- Modify: `src/data/buildings.ts:45-80` (getBuildingEffectText)
- Modify: `src/data/buildings.ts:82-100` (getBuildingUnlockText)

- [ ] **Step 1: Add Spirit Mine to BUILDING_DEFS**

In `src/data/buildings.ts`, add to the BUILDING_DEFS array after `mainHall`:

```typescript
{ type: 'spiritMine', name: '灵石矿', description: '产出灵石和矿材', maxLevel: 10, upgradeCost: (lv) => ({ spiritStone: 100 * lv }), unlockCondition: '初始' },
```

- [ ] **Step 2: Add production function**

Add after `getSpiritFieldRate` (after line 39):

```typescript
/**
 * Spirit mine production rate (spirit stone per second).
 * Level 1: 0.5/s, Level 2: 1.0/s, ..., Level 10: 5.0/s
 */
export function getSpiritMineRate(level: number): number {
  if (level < 1) return 0
  return 0.5 + (level - 1) * 0.5
}

/**
 * Spirit mine ore byproduct rate (ore per second).
 * Level 1: 0.05/s, Level 5: 0.25/s, Level 10: 0.50/s
 */
export function getSpiritMineOreRate(level: number): number {
  if (level < 1) return 0
  return 0.05 * level
}
```

- [ ] **Step 3: Add effect text and unlock text**

In `getBuildingEffectText` switch (line 48), add:

```typescript
case 'spiritMine':
  return `灵石 +${getSpiritMineRate(building.level).toFixed(1)}/s · 矿材 +${getSpiritMineOreRate(building.level).toFixed(2)}/s`
```

In `getBuildingUnlockText` switch (line 84), add:

```typescript
case 'spiritMine':
  return '解锁后：灵石+0.5/s · 矿材+0.05/s'
```

- [ ] **Step 4: Run all tests**

Run: `npx vitest run --reporter=verbose`
Expected: ALL PASS (BuildingSystem tests need `spiritMine` in createBuildings defaults from Task 1)

- [ ] **Step 5: Commit**

```bash
git add src/data/buildings.ts
git commit -m "feat: add spirit mine building definition and production functions"
```

---

### Task 3: Fix spirit field curve

**Files:**
- Modify: `src/data/buildings.ts:36-39` (getSpiritFieldRate)
- Modify: `src/__tests__/ResourceEngine.test.ts` (update expected values)

- [ ] **Step 1: Update getSpiritFieldRate formula**

In `src/data/buildings.ts`, replace the function:

```typescript
/**
 * Spirit field production rate (spirit energy per second).
 * New formula: 3 + (level - 1) * 2
 * Level 1: 3/s, Level 2: 5/s, Level 3: 7/s, Level 5: 11/s, Level 10: 21/s
 */
export function getSpiritFieldRate(level: number): number {
  if (level < 1) return 0
  return 3 + (level - 1) * 2
}
```

- [ ] **Step 2: Update existing ResourceEngine tests**

In `src/__tests__/ResourceEngine.test.ts`, update all tests to reflect:
- No more `Math.max(1, ...)` floor — level 0 produces 0
- New formula values: level 1 → 3, level 2 → 5, level 3 → 7, level 5 → 11, level 10 → 21

```typescript
describe('ResourceEngine', () => {
  it('should produce 0 spiritEnergy/s with no buildings', () => {
    const rates = calcResourceRates({ spiritField: 0, spiritMine: 0, mainHall: 1 })
    expect(rates.spiritEnergy).toBe(0)
    expect(rates.herb).toBe(0)
  })

  it('should produce herb and spiritEnergy with spiritField', () => {
    const rates = calcResourceRates({ spiritField: 1, spiritMine: 0, mainHall: 1 })
    expect(rates.spiritEnergy).toBe(3)
    expect(rates.herb).toBe(0.1)
  })

  it('should scale production with building level (unified formula)', () => {
    const rates = calcResourceRates({ spiritField: 3, spiritMine: 0, mainHall: 1 })
    expect(rates.spiritEnergy).toBe(7)
    expect(rates.herb).toBeCloseTo(0.3)
  })

  it('should apply technique and disciple bonuses', () => {
    const rates = calcResourceRates(
      { spiritField: 2, spiritMine: 0, mainHall: 1 },
      { techniqueMultiplier: 1.2, discipleMultiplier: 1.1 }
    )
    // getSpiritFieldRate(2) = 5, 5 * 1.2 * 1.1 = 6.6
    expect(rates.spiritEnergy).toBeCloseTo(5 * 1.2 * 1.1)
    expect(rates.herb).toBeCloseTo(0.1 * 2 * 1.2 * 1.1)
  })

  it('should produce spirit stone and ore from spirit mine', () => {
    const rates = calcResourceRates({ spiritField: 0, spiritMine: 1, mainHall: 1 })
    expect(rates.spiritStone).toBe(0.5)
    expect(rates.ore).toBe(0.05)
  })

  it('should produce all resources from both buildings', () => {
    const rates = calcResourceRates({ spiritField: 2, spiritMine: 3, mainHall: 1 })
    expect(rates.spiritEnergy).toBe(5)
    expect(rates.spiritStone).toBeCloseTo(1.5)
    expect(rates.herb).toBeCloseTo(0.2)
    expect(rates.ore).toBeCloseTo(0.15)
  })
})

test('calcResourceRates spirit energy matches getSpiritFieldRate for level >= 1', () => {
  for (let level = 1; level <= 10; level++) {
    const rates = calcResourceRates({ spiritField: level, spiritMine: 0, mainHall: 1 })
    expect(rates.spiritEnergy).toBe(getSpiritFieldRate(level))
  }
})
```

- [ ] **Step 3: Run test to verify it fails (spirit stone/ore still 0)**

Run: `npx vitest run src/__tests__/ResourceEngine.test.ts --reporter=verbose`
Expected: FAIL — `spiritStone` and `ore` tests fail because ResourceEngine still returns 0

- [ ] **Step 4: Commit curve fix alone**

```bash
git add src/data/buildings.ts src/__tests__/ResourceEngine.test.ts
git commit -m "feat: adjust spirit field curve — level 1 now produces 3/s"
```

---

### Task 4: Update ResourceEngine with spirit mine + bug fix

**Files:**
- Modify: `src/systems/economy/ResourceEngine.ts` (entire file)

- [ ] **Step 1: Rewrite ResourceEngine**

Replace entire `src/systems/economy/ResourceEngine.ts`:

```typescript
// src/systems/economy/ResourceEngine.ts

import { getSpiritFieldRate, getSpiritMineRate, getSpiritMineOreRate } from '../../data/buildings'

export interface BuildingLevels {
  spiritField: number
  spiritMine: number
  mainHall: number
}

export interface ProductionBonuses {
  techniqueMultiplier: number
  discipleMultiplier: number
}

export interface ResourceRates {
  spiritEnergy: number  // per second
  herb: number          // per second
  ore: number           // per second
  spiritStone: number   // per second
}

export function calcResourceRates(
  buildingLevels: BuildingLevels,
  bonuses: ProductionBonuses = { techniqueMultiplier: 1, discipleMultiplier: 1 }
): ResourceRates {
  const totalMult = bonuses.techniqueMultiplier * bonuses.discipleMultiplier
  const sfLevel = buildingLevels.spiritField
  const smLevel = buildingLevels.spiritMine

  const spiritEnergy = sfLevel > 0 ? getSpiritFieldRate(sfLevel) * totalMult : 0
  const spiritStone = smLevel > 0 ? getSpiritMineRate(smLevel) * totalMult : 0
  const herb = sfLevel > 0 ? 0.1 * sfLevel * totalMult : 0
  const ore = smLevel > 0 ? getSpiritMineOreRate(smLevel) * totalMult : 0

  return { spiritEnergy, spiritStone, herb, ore }
}
```

- [ ] **Step 2: Run ResourceEngine tests**

Run: `npx vitest run src/__tests__/ResourceEngine.test.ts --reporter=verbose`
Expected: ALL PASS

- [ ] **Step 3: Run all tests to check for breakage**

Run: `npx vitest run --reporter=verbose`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add src/systems/economy/ResourceEngine.ts
git commit -m "feat: add spirit mine to ResourceEngine, remove Math.max(1) bug"
```

---

### Task 5: Wire spirit mine into sectStore tickAll

**Files:**
- Modify: `src/stores/sectStore.ts:726-831` (tickAll — building level extraction + resource application)
- Modify: `src/stores/sectStore.ts:46-68` (createInitialState — spiritMine unlocked initially)

- [ ] **Step 1: Update createInitialState**

In `src/stores/sectStore.ts:54-58`, change the building initialization to also unlock spiritMine initially:

```typescript
buildings: BUILDING_DEFS.map((def) => ({
  type: def.type,
  level: def.type === 'mainHall' ? 1 : 0,
  unlocked: def.type === 'mainHall' || def.type === 'spiritMine',
})),
```

- [ ] **Step 2: Update tickAll to pass spiritMine level**

In `src/stores/sectStore.ts:729-735`, add spiritMine extraction:

```typescript
const sfBuilding = sect.buildings.find((b) => b.type === 'spiritField')
const smBuilding = sect.buildings.find((b) => b.type === 'spiritMine')
const mhBuilding = sect.buildings.find((b) => b.type === 'mainHall')
const rates = calcResourceRates({
  spiritField: sfBuilding?.level ?? 0,
  spiritMine: smBuilding?.level ?? 0,
  mainHall: mhBuilding?.level ?? 0,
})
```

- [ ] **Step 3: Update tickAll to apply spiritStone and ore production**

In `src/stores/sectStore.ts:814-825`, add spiritStone and ore to the resources update:

```typescript
set((s) => ({
  sect: {
    ...s.sect,
    characters: updatedCharacters,
    resources: {
      ...s.sect.resources,
      spiritEnergy: updatedSpiritEnergy,
      spiritStone: s.sect.resources.spiritStone + rates.spiritStone * deltaSec,
      herb: s.sect.resources.herb + rates.herb * deltaSec,
      ore: s.sect.resources.ore + rates.ore * deltaSec,
    },
    level: newSectLevel,
  },
}))
```

- [ ] **Step 4: Run all tests**

Run: `npx vitest run --reporter=verbose`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/stores/sectStore.ts
git commit -m "feat: wire spirit mine into tickAll for spirit stone and ore production"
```

---

### Task 6: Update ResourceRate UI to use calcResourceRates

**Files:**
- Modify: `src/components/common/ResourceRate.tsx` (entire rewrite)

- [ ] **Step 1: Rewrite ResourceRate to use calcResourceRates**

Replace `src/components/common/ResourceRate.tsx`:

```typescript
import { useMemo } from 'react'
import { useSectStore } from '../../stores/sectStore'
import { calcResourceRates } from '../../systems/economy/ResourceEngine'
import styles from './ResourceRate.module.css'

export default function ResourceRate() {
  const sect = useSectStore((s) => s.sect)

  const { rates, spiritConsumption } = useMemo(() => {
    const sfLevel = sect.buildings.find((b) => b.type === 'spiritField')?.level ?? 0
    const smLevel = sect.buildings.find((b) => b.type === 'spiritMine')?.level ?? 0
    const mhLevel = sect.buildings.find((b) => b.type === 'mainHall')?.level ?? 0
    const rates = calcResourceRates({ spiritField: sfLevel, spiritMine: smLevel, mainHall: mhLevel })
    const cultivatingCount = sect.characters.filter((c) => c.status === 'cultivating').length
    const spiritConsumption = cultivatingCount * 2
    return { rates, spiritConsumption }
  }, [sect.buildings, sect.characters])

  return (
    <div className={styles.container}>
      {rates.spiritEnergy > 0 && (
        <span className={styles.rateItem}>
          <span className={styles.rateLabel}>灵气</span>
          <span className={styles.rateValue}>+{rates.spiritEnergy.toFixed(1)}/s</span>
        </span>
      )}
      {spiritConsumption > 0 && (
        <span className={styles.rateItem}>
          <span className={styles.rateLabel}>修炼</span>
          <span className={styles.rateValueNegative}>-{spiritConsumption}/s</span>
        </span>
      )}
      {rates.spiritStone > 0 && (
        <span className={styles.rateItem}>
          <span className={styles.rateLabel}>灵石</span>
          <span className={styles.rateValue}>+{rates.spiritStone.toFixed(1)}/s</span>
        </span>
      )}
      {rates.herb > 0 && (
        <span className={styles.rateItem}>
          <span className={styles.rateLabel}>灵草</span>
          <span className={styles.rateValue}>+{rates.herb.toFixed(1)}/s</span>
        </span>
      )}
      {rates.ore > 0 ? (
        <span className={styles.rateItem}>
          <span className={styles.rateLabel}>矿材</span>
          <span className={styles.rateValue}>+{rates.ore.toFixed(2)}/s</span>
        </span>
      ) : (
        <span className={styles.rateItem}>
          <span className={styles.rateLabel}>矿材</span>
          <span className={styles.rateHint}>冒险获取</span>
        </span>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Build check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/common/ResourceRate.tsx
git commit -m "fix: ResourceRate now uses calcResourceRates instead of duplicating logic"
```

---

### Task 7: Add patrol adventure

**Files:**
- Modify: `src/stores/adventureStore.ts` (add patrol state and actions)
- Modify: `src/pages/AdventurePage.tsx` (add patrol UI)

- [ ] **Step 1: Add patrol state to adventureStore interface**

In `src/stores/adventureStore.ts`, add to the `AdventureStore` interface:

```typescript
// Patrol state
patrolActive: boolean
patrolProgress: number       // 0-60 seconds
patrolCountToday: number     // daily patrol count (0-5)
patrolReward: number         // spirit stones to collect on completion
startPatrol(characterId: string): boolean
tickPatrol(deltaSec: number): void
collectPatrolReward(): void
```

- [ ] **Step 2: Add patrol implementation in adventureStore**

In the store `create()`, add initial state:

```typescript
patrolActive: false,
patrolProgress: 0,
patrolCountToday: 0,
patrolReward: 0,
```

Add action implementations:

```typescript
startPatrol: (characterId) => {
  const { sect } = useSectStore.getState()
  const char = sect.characters.find(c => c.id === characterId)
  if (!char) return false
  if (get().patrolActive) return false
  if (get().patrolCountToday >= 5) return false
  if (char.status === 'adventuring') return false

  const sectLevel = getSectLevel()
  const reward = 50 + sectLevel * 10

  set({
    patrolActive: true,
    patrolProgress: 0,
    patrolReward: reward,
  })
  // Mark character as adventuring
  useSectStore.getState().setCharacterStatus(characterId, 'adventuring')
  return true
},

tickPatrol: (deltaSec) => {
  if (!get().patrolActive) return
  const newProgress = get().patrolProgress + deltaSec
  if (newProgress >= 60) {
    set({ patrolProgress: 60 })
    // Patrol complete — reward will be collected manually
  } else {
    set({ patrolProgress: newProgress })
  }
},

collectPatrolReward: () => {
  const state = get()
  if (!state.patrolActive || state.patrolProgress < 60) return

  const reward = state.patrolReward
  depositResourcesToSect({ spiritStone: reward, spiritEnergy: 0, herb: 0, ore: 0 })

  // Release the character back
  const sect = useSectStore.getState()
  const adventuringChars = sect.sect.characters.filter(c => c.status === 'adventuring')
  if (adventuringChars.length > 0) {
    useSectStore.getState().setCharacterStatus(adventuringChars[0].id, 'cultivating')
  }

  set({
    patrolActive: false,
    patrolProgress: 0,
    patrolReward: 0,
    patrolCountToday: state.patrolCountToday + 1,
  })
},
```

- [ ] **Step 3: Wire patrol tick into the idle loop**

In `tickAllIdle` (adventureStore.ts), add patrol ticking:

```typescript
tickAllIdle: (deltaSec) => {
  get().tickPatrol(deltaSec)
  // ... existing run ticking logic
},
```

- [ ] **Step 4: Add patrol UI to AdventurePage**

In `src/pages/AdventurePage.tsx`, add a patrol section above the dungeon list. Read patrol state from adventureStore and render:
- A "Start Patrol" button (disabled if active or 5/5 done)
- A progress bar when active (0-60s)
- A "Collect Reward" button when progress >= 60
- Remaining patrol count display: `今日剩余: ${5 - patrolCountToday}`

```tsx
// Add to AdventurePage, after the header section
const patrolActive = useAdventureStore((s) => s.patrolActive)
const patrolProgress = useAdventureStore((s) => s.patrolProgress)
const patrolCountToday = useAdventureStore((s) => s.patrolCountToday)
const patrolReward = useAdventureStore((s) => s.patrolReward)

const startPatrol = useAdventureStore((s) => s.startPatrol)
const collectPatrolReward = useAdventureStore((s) => s.collectPatrolReward)

// Render section (before "Active Runs" section):
<section className={styles.section}>
  <div className={styles.sectionTitle}>外围巡逻</div>
  {!patrolActive && patrolCountToday < 5 && (
    <div className={styles.patrolIdle}>
      <span>今日剩余: {5 - patrolCountToday}/5</span>
      <button
        className={styles.patrolStartBtn}
        onClick={() => {
          const first = availableCharacters[0]
          if (first) startPatrol(first.id)
        }}
        disabled={availableCharacters.length === 0}
      >
        {availableCharacters.length > 0 ? '开始巡逻' : '无可用弟子'}
      </button>
    </div>
  )}
  {patrolActive && patrolProgress < 60 && (
    <div className={styles.patrolActive}>
      <ProgressBar current={patrolProgress} max={60} />
      <span>{Math.floor(60 - patrolProgress)}秒</span>
    </div>
  )}
  {patrolActive && patrolProgress >= 60 && (
    <div className={styles.patrolDone}>
      <span>巡逻完成！奖励: +{patrolReward} 灵石</span>
      <button className={styles.patrolCollectBtn} onClick={collectPatrolReward}>
        领取奖励
      </button>
    </div>
  )}
  {patrolCountToday >= 5 && !patrolActive && (
    <div className={styles.patrolExhausted}>今日巡逻次数已用完</div>
  )}
</section>
```

- [ ] **Step 5: Add patrol CSS styles**

In `src/pages/AdventurePage.module.css`, add styles for `.patrolIdle`, `.patrolActive`, `.patrolDone`, `.patrolExhausted`, `.patrolStartBtn`, `.patrolCollectBtn`. Follow existing ink-wash style (use `var(--ink-*)` CSS variables).

- [ ] **Step 6: Build check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/stores/adventureStore.ts src/pages/AdventurePage.tsx src/pages/AdventurePage.module.css
git commit -m "feat: add patrol adventure — 60s rounds, 5/day, spirit stone rewards"
```

---

### Task 8: Update BuildingSystem for spiritMine unlock/cost

**Files:**
- Modify: `src/__tests__/BuildingSystem.test.ts` (add spiritMine tests)

- [ ] **Step 1: Add spiritMine unlock test**

In `src/__tests__/BuildingSystem.test.ts`:

```typescript
it('spiritMine should always be unlocked (初始)', () => {
  const buildings = createBuildings()
  const result = checkBuildingUnlock('spiritMine', buildings)
  expect(result.unlocked).toBe(true)
})

it('canUpgradeBuilding should work for spiritMine', () => {
  const buildings = createBuildings({ spiritMine: { level: 0, unlocked: true } })
  const result = canUpgradeBuilding('spiritMine', buildings, 0) // Level 0→1 is free
  expect(result.canUpgrade).toBe(true)
  expect(result.cost.spiritStone).toBe(0) // 100 * 0 = 0
})
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/__tests__/BuildingSystem.test.ts --reporter=verbose`
Expected: ALL PASS

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/BuildingSystem.test.ts
git commit -m "test: add spiritMine unlock and upgrade tests"
```

---

### Task 9: Final integration test and build

**Files:** None (verification only)

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run --reporter=verbose`
Expected: ALL PASS

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Manual smoke test in browser**

Run: `npm run dev`
Verify:
- Spirit Mine appears in Buildings tab, unlocked, can build for free
- After building spirit mine, TopBar shows灵石 increasing
- ResourceRate shows灵石 +X/s and矿材 +X/s
- Spirit Field level 1 shows灵气 +3/s in effect text
- Adventure page shows "外围巡逻" section
- Can start patrol, see progress bar, collect reward
- After collecting, patrol count increases
