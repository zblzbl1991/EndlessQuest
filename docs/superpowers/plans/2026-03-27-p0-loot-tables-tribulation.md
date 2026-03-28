# P0: 掉落表系统 + 天劫系统 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Replace hardcoded combat drops with weighted loot tables, and add a passive tribulation system for major realm breakthroughs with injury consequences.

**Architecture:** New `LootSystem.ts` handles weighted random loot generation from enemy templates. New `TribulationSystem.ts` resolves tribulation outcomes. Both integrate into existing `EventSystem.ts` and `sectStore.ts tickAll()` respectively. The unused `Dungeon.lootTable` field is removed.

**Tech Stack:** TypeScript, Vitest, Zustand

**Spec:** `docs/superpowers/specs/2026-03-27-gameplay-enrichment.md` (sections P0-1 and P0-2)

---

### Task 1: LootEntry 类型与掉落数据

**Files:**
- Modify: `src/data/enemies.ts`
- Test: `src/__tests__/loot.test.ts`

- [x] **Step 1: Write the failing test**

Create `src/__tests__/loot.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { ENEMY_TEMPLATES } from '../data/enemies'

describe('Enemy loot tables', () => {
  it('every enemy template has a lootTable array', () => {
    for (const enemy of ENEMY_TEMPLATES) {
      expect(Array.isArray(enemy.lootTable)).toBe(true)
      expect(enemy.lootTable.length).toBeGreaterThan(0)
    }
  })

  it('every enemy template has dropsPerFight between 1 and 3', () => {
    for (const enemy of ENEMY_TEMPLATES) {
      expect(enemy.dropsPerFight).toBeGreaterThanOrEqual(1)
      expect(enemy.dropsPerFight).toBeLessThanOrEqual(3)
    }
  })

  it('loot entries have required fields', () => {
    for (const enemy of ENEMY_TEMPLATES) {
      for (const entry of enemy.lootTable) {
        expect(['spiritStone', 'herb', 'ore', 'equipment', 'consumable', 'petCapture']).toContain(entry.type)
        expect(entry.weight).toBeGreaterThan(0)
      }
    }
  })

  it('resource entries have minAmount and maxAmount', () => {
    for (const enemy of ENEMY_TEMPLATES) {
      for (const entry of enemy.lootTable) {
        if (entry.type === 'spiritStone' || entry.type === 'herb' || entry.type === 'ore') {
          expect(entry.minAmount).toBeDefined()
          expect(entry.maxAmount).toBeDefined()
          expect(entry.maxAmount!).toBeGreaterThanOrEqual(entry.minAmount!)
        }
      }
    }
  })

  it('equipment entries have quality field', () => {
    for (const enemy of ENEMY_TEMPLATES) {
      for (const entry of enemy.lootTable) {
        if (entry.type === 'equipment') {
          expect(entry.quality).toBeDefined()
          expect(['common', 'spirit', 'immortal', 'divine', 'chaos']).toContain(entry.quality)
        }
      }
    }
  })

  it('wild_spirit_beast has expected loot table', () => {
    const beast = ENEMY_TEMPLATES.find(e => e.id === 'wild_spirit_beast')!
    const weights = beast.lootTable.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] ?? 0) + e.weight
      return acc
    }, {} as Record<string, number>)
    expect(weights.spiritStone).toBe(40)
    expect(weights.herb).toBe(25)
    expect(weights.ore).toBe(15)
    expect(weights.equipment).toBe(13) // 10 common + 3 spirit
    expect(weights.petCapture).toBe(2)
  })

  it('spirit_boss has higher total weight and better drops', () => {
    const boss = ENEMY_TEMPLATES.find(e => e.id === 'spirit_boss')!
    const totalWeight = boss.lootTable.reduce((s, e) => s + e.weight, 0)
    expect(totalWeight).toBeGreaterThan(85) // richer table
    const hasDivine = boss.lootTable.some(e => e.type === 'equipment' && e.quality === 'divine')
    expect(hasDivine).toBe(true)
  })
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/loot.test.ts --pool=forks --testTimeout=30000`
Expected: FAIL — `lootTable` and `dropsPerFight` do not exist on enemy templates

- [x] **Step 3: Add LootEntry type and data to enemies.ts**

Add to `src/data/enemies.ts` at the top (after imports):

```typescript
export type LootType = 'spiritStone' | 'herb' | 'ore' | 'equipment' | 'consumable' | 'petCapture'

export interface LootEntry {
  type: LootType
  weight: number
  minAmount?: number
  maxAmount?: number
  quality?: 'common' | 'spirit' | 'immortal' | 'divine' | 'chaos'
  recipeId?: string
}
```

Update `ENEMY_TEMPLATES` to add `lootTable` and `dropsPerFight` to each enemy. The `Enemy` type in `src/types/adventure.ts` already has a flexible shape — add these as extra fields on the template objects:

```typescript
export const ENEMY_TEMPLATES: Enemy[] = [
  {
    id: 'wild_spirit_beast',
    name: '灵兽',
    element: 'neutral',
    stats: { hp: 50, atk: 8, def: 4, spd: 6 },
    isBoss: false,
    dropsPerFight: 1,
    lootTable: [
      { type: 'spiritStone', weight: 40, minAmount: 20, maxAmount: 50 },
      { type: 'herb', weight: 25, minAmount: 2, maxAmount: 8 },
      { type: 'ore', weight: 15, minAmount: 1, maxAmount: 5 },
      { type: 'equipment', weight: 10, quality: 'common' },
      { type: 'equipment', weight: 3, quality: 'spirit' },
      { type: 'petCapture', weight: 2 },
    ],
  },
  {
    id: 'cave_demon',
    name: '洞妖',
    element: 'fire',
    stats: { hp: 120, atk: 18, def: 10, spd: 8 },
    isBoss: false,
    dropsPerFight: 2,
    lootTable: [
      { type: 'spiritStone', weight: 35, minAmount: 40, maxAmount: 80 },
      { type: 'herb', weight: 10, minAmount: 3, maxAmount: 10 },
      { type: 'ore', weight: 20, minAmount: 3, maxAmount: 10 },
      { type: 'equipment', weight: 5, quality: 'common' },
      { type: 'equipment', weight: 12, quality: 'spirit' },
      { type: 'equipment', weight: 3, quality: 'immortal' },
      { type: 'petCapture', weight: 3 },
    ],
  },
  {
    id: 'spirit_boss',
    name: '灵脉守卫',
    element: 'lightning',
    stats: { hp: 500, atk: 40, def: 25, spd: 12 },
    isBoss: true,
    dropsPerFight: 3,
    lootTable: [
      { type: 'spiritStone', weight: 30, minAmount: 100, maxAmount: 300 },
      { type: 'herb', weight: 15, minAmount: 10, maxAmount: 30 },
      { type: 'ore', weight: 15, minAmount: 5, maxAmount: 20 },
      { type: 'equipment', weight: 20, quality: 'spirit' },
      { type: 'equipment', weight: 12, quality: 'immortal' },
      { type: 'equipment', weight: 3, quality: 'divine' },
      { type: 'petCapture', weight: 5 },
    ],
  },
]
```

Since `Enemy` is an interface, we need to cast or extend it. Add the fields as non-standard (they're on the data objects, not the Enemy interface). The test accesses them via `ENEMY_TEMPLATES` directly, so no interface change needed for Enemy — but for type safety, export the template type:

```typescript
export interface EnemyTemplate extends Enemy {
  lootTable: LootEntry[]
  dropsPerFight: number
}

export const ENEMY_TEMPLATES: EnemyTemplate[] = [
  // ...same as above
]
```

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/loot.test.ts --pool=forks --testTimeout=30000`
Expected: ALL PASS

- [x] **Step 5: Commit**

```bash
git add src/data/enemies.ts src/__tests__/loot.test.ts
git commit -m "feat(loot): add LootEntry type and enemy loot tables"
```

---

### Task 2: LootSystem 掉落计算逻辑

**Files:**
- Create: `src/systems/roguelike/LootSystem.ts`
- Test: `src/__tests__/LootSystem.test.ts`

- [x] **Step 1: Write the failing test**

Create `src/__tests__/LootSystem.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { generateLoot, type LootResult } from '../systems/roguelike/LootSystem'
import type { LootEntry } from '../data/enemies'

const testLootTable: LootEntry[] = [
  { type: 'spiritStone', weight: 40, minAmount: 10, maxAmount: 20 },
  { type: 'herb', weight: 30, minAmount: 5, maxAmount: 10 },
  { type: 'ore', weight: 20, minAmount: 2, maxAmount: 5 },
  { type: 'equipment', weight: 10, quality: 'common' },
]

describe('generateLoot', () => {
  it('returns the correct number of drops based on dropsPerFight', () => {
    const result = generateLoot(testLootTable, 2, 3)
    expect(result.length).toBe(2)
  })

  it('returns drops with correct structure', () => {
    const result = generateLoot(testLootTable, 1, 1)
    for (const drop of result) {
      expect(drop).toHaveProperty('type')
      expect(drop).toHaveProperty('amount')
    }
  })

  it('resource drops have amounts scaled by floor', () => {
    const results: LootResult[][] = []
    for (let i = 0; i < 50; i++) {
      results.push(generateLoot(testLootTable, 3, 5))
    }
    const resourceDrops = results.flat().filter(d => d.type === 'spiritStone')
    // With floor=5, minAmount=10, amounts should be >= 10*5 = 50
    for (const drop of resourceDrops) {
      expect(drop.amount).toBeGreaterThanOrEqual(50)
    }
  })

  it('equipment drops have amount 1 and quality info', () => {
    const results: LootResult[][] = []
    for (let i = 0; i < 100; i++) {
      results.push(generateLoot(testLootTable, 3, 1))
    }
    const equipDrops = results.flat().filter(d => d.type === 'equipment')
    expect(equipDrops.length).toBeGreaterThan(0)
    for (const drop of equipDrops) {
      expect(drop.amount).toBe(1)
      expect(drop.quality).toBeDefined()
    }
  })

  it('petCapture drops have amount 1', () => {
    const petTable: LootEntry[] = [
      { type: 'petCapture', weight: 100 },
    ]
    const result = generateLoot(petTable, 1, 1)
    expect(result[0].type).toBe('petCapture')
    expect(result[0].amount).toBe(1)
  })

  it('empty loot table returns empty array', () => {
    const result = generateLoot([], 2, 1)
    expect(result).toEqual([])
  })
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/LootSystem.test.ts --pool=forks --testTimeout=30000`
Expected: FAIL — module not found

- [x] **Step 3: Implement LootSystem**

Create `src/systems/roguelike/LootSystem.ts`:

```typescript
import type { LootEntry } from '../../data/enemies'
import type { CharacterQuality } from '../../types/character'

export interface LootResult {
  type: string
  amount: number
  quality?: CharacterQuality
  recipeId?: string
}

/**
 * Generate loot drops from a loot table.
 *
 * @param lootTable - Weighted loot entries
 * @param dropsPerFight - Number of independent loot rolls
 * @param floor - Current dungeon floor (scales resource amounts)
 * @returns Array of generated loot results
 */
export function generateLoot(
  lootTable: LootEntry[],
  dropsPerFight: number,
  floor: number,
): LootResult[] {
  if (lootTable.length === 0) return []

  const results: LootResult[] = []

  for (let i = 0; i < dropsPerFight; i++) {
    const entry = weightedRandom(lootTable)
    if (!entry) continue

    switch (entry.type) {
      case 'spiritStone':
      case 'herb':
      case 'ore': {
        const min = (entry.minAmount ?? 1) * floor
        const max = (entry.maxAmount ?? 1) * floor
        results.push({
          type: entry.type,
          amount: Math.floor(Math.random() * (max - min + 1)) + min,
        })
        break
      }
      case 'equipment': {
        results.push({
          type: 'equipment',
          amount: 1,
          quality: entry.quality,
        })
        break
      }
      case 'consumable': {
        results.push({
          type: 'consumable',
          amount: 1,
          recipeId: entry.recipeId,
        })
        break
      }
      case 'petCapture': {
        results.push({
          type: 'petCapture',
          amount: 1,
        })
        break
      }
    }
  }

  return results
}

function weightedRandom(table: LootEntry[]): LootEntry | null {
  const totalWeight = table.reduce((sum, e) => sum + e.weight, 0)
  if (totalWeight <= 0) return null

  let roll = Math.random() * totalWeight
  for (const entry of table) {
    roll -= entry.weight
    if (roll <= 0) return entry
  }
  return table[table.length - 1]
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/LootSystem.test.ts --pool=forks --testTimeout=30000`
Expected: ALL PASS

- [x] **Step 5: Commit**

```bash
git add src/systems/roguelike/LootSystem.ts src/__tests__/LootSystem.test.ts
git commit -m "feat(loot): implement weighted random loot generation"
```

---

### Task 3: EventSystem 集成掉落表

**Files:**
- Modify: `src/systems/roguelike/EventSystem.ts`

- [x] **Step 1: Update EventSystem to use LootSystem**

In `src/systems/roguelike/EventSystem.ts`:

1. Add import at top:
```typescript
import { generateLoot } from './LootSystem'
import { ENEMY_TEMPLATES, type EnemyTemplate } from '../../data/enemies'
```

2. Update the `combat` event handler (approximately line 73-115). Replace the hardcoded reward logic with loot table generation. The current code looks like:

```typescript
case 'combat': {
  const templates = getNonBossTemplates()
  const template = templates[Math.floor(Math.random() * templates.length)]
  const enemy = scaleEnemy(template, floorNumber)
  const combatResult = simulateCombat(aliveTeam, [createCombatUnitFromEnemy(enemy)])
  // ... hardcoded rewards
}
```

Replace with:

```typescript
case 'combat': {
  const templates = getNonBossTemplates()
  const template = templates[Math.floor(Math.random() * templates.length)] as EnemyTemplate
  const enemy = scaleEnemy(template, floorNumber)
  const combatResult = simulateCombat(aliveTeam, [createCombatUnitFromEnemy(enemy)])

  if (combatResult.victory) {
    const loot = generateLoot(template.lootTable, template.dropsPerFight, floorNumber)
    const { reward, itemRewards } = resolveLoot(loot)
    return {
      type: 'combat',
      success: true,
      reward,
      itemRewards,
      combatResult,
      message: `击败了 ${template.name}`,
      hpChanges: combatResult.hpChanges,
    }
  } else {
    return {
      type: 'combat',
      success: false,
      reward: { spiritStone: 0, herb: 0, ore: 0 },
      itemRewards: [],
      combatResult,
      message: `被 ${template.name} 击败`,
      hpChanges: combatResult.hpChanges,
    }
  }
}
```

3. Similarly update the `boss` event handler (approximately line 191-240):

```typescript
case 'boss': {
  const bossTemplate = ENEMY_TEMPLATES.find(e => e.isBoss) as EnemyTemplate
  const boss = scaleEnemy(bossTemplate, floorNumber)
  // Apply boss multiplier (2x HP, 1.5x ATK)
  const boostedBoss = {
    ...boss,
    stats: { ...boss.stats, hp: boss.stats.hp * 2, atk: Math.floor(boss.stats.atk * 1.5) },
  }
  const combatResult = simulateCombat(aliveTeam, [createCombatUnitFromEnemy(boostedBoss)])

  if (combatResult.victory) {
    const loot = generateLoot(bossTemplate.lootTable, bossTemplate.dropsPerFight, floorNumber)
    const { reward, itemRewards } = resolveLoot(loot)
    return {
      type: 'boss',
      success: true,
      reward,
      itemRewards,
      combatResult,
      message: `击败了 BOSS: ${bossTemplate.name}！`,
      hpChanges: combatResult.hpChanges,
    }
  } else {
    return {
      type: 'boss',
      success: false,
      reward: { spiritStone: 50 * floorNumber, herb: 2 * floorNumber, ore: 0 },
      itemRewards: [],
      combatResult,
      message: `被 BOSS: ${bossTemplate.name} 击败...`,
      hpChanges: combatResult.hpChanges,
    }
  }
}
```

4. Add the `resolveLoot` helper function (add it near the top of the file, after the existing helpers):

```typescript
import type { Resources } from '../../types/sect'
import type { AnyItem } from '../../types/item'
import { generateEquipment } from '../item/ItemGenerator'
import { EQUIP_SLOTS } from '../../data/items'

function resolveLoot(loot: LootResult[]): { reward: Resources; itemRewards: AnyItem[] } {
  const reward: Resources = { spiritStone: 0, spiritEnergy: 0, herb: 0, ore: 0 }
  const itemRewards: AnyItem[] = []

  for (const drop of loot) {
    switch (drop.type) {
      case 'spiritStone':
        reward.spiritStone += drop.amount
        break
      case 'herb':
        reward.herb += drop.amount
        break
      case 'ore':
        reward.ore += drop.amount
        break
      case 'equipment':
        if (drop.quality) {
          const slot = EQUIP_SLOTS[Math.floor(Math.random() * EQUIP_SLOTS.length)]
          itemRewards.push(generateEquipment(slot, drop.quality))
        }
        break
      case 'consumable':
        // Consumable drops are handled by caller using recipeId
        // Item creation requires the alchemy crafting system
        break
      case 'petCapture':
        // petCapture is handled by caller (adventureStore)
        break
    }
  }

  return { reward, itemRewards }
}
```

5. Add the `LootResult` import:
```typescript
import type { LootResult } from './LootSystem'
```

- [x] **Step 2: Run existing tests to verify no regressions**

Run: `npx vitest run --pool=forks --testTimeout=30000`
Expected: ALL PASS (existing tests should still work since EventSystem returns the same shape)

- [x] **Step 3: Commit**

```bash
git add src/systems/roguelike/EventSystem.ts
git commit -m "feat(loot): integrate loot tables into combat and boss events"
```

---

### Task 4: 移除未使用的 Dungeon.lootTable

**Files:**
- Modify: `src/types/adventure.ts`
- Modify: `src/data/events.ts`

- [x] **Step 1: Remove lootTable from Dungeon interface**

In `src/types/adventure.ts`, find the `Dungeon` interface (line 34-42) and remove the `lootTable` field:

```typescript
// Before:
export interface Dungeon {
  id: string
  name: string
  totalLayers: number
  eventsPerLayer: number
  unlockRealm: number
  unlockStage: number
  lootTable: Array<{ itemId: string; weight: number }>
}

// After:
export interface Dungeon {
  id: string
  name: string
  totalLayers: number
  eventsPerLayer: number
  unlockRealm: number
  unlockStage: number
}
```

- [x] **Step 2: Remove lootTable from dungeon data**

In `src/data/events.ts`, remove `lootTable: []` from all 6 dungeon definitions.

- [x] **Step 3: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [x] **Step 4: Run all tests**

Run: `npx vitest run --pool=forks --testTimeout=30000`
Expected: ALL PASS

- [x] **Step 5: Commit**

```bash
git add src/types/adventure.ts src/data/events.ts
git commit -m "refactor: remove unused Dungeon.lootTable field"
```

---

### Task 5: 天劫判定系统

**Files:**
- Create: `src/systems/cultivation/TribulationSystem.ts`
- Test: `src/__tests__/TribulationSystem.test.ts`

- [x] **Step 1: Write the failing test**

Create `src/__tests__/TribulationSystem.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { resolveTribulation, shouldTriggerTribulation } from '../systems/cultivation/TribulationSystem'
import type { Character } from '../types/character'

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'test-char',
    name: '测试弟子',
    title: 'disciple',
    quality: 'spirit',
    realm: 1,
    realmStage: 3 as const,
    cultivation: 10000,
    baseStats: { hp: 200, atk: 20, def: 10, spd: 12, crit: 0.05, critDmg: 1.5 },
    cultivationStats: { spiritPower: 100, maxSpiritPower: 100, comprehension: 10, spiritualRoot: 15, fortune: 5 },
    learnedTechniques: ['qingxin'],
    equippedGear: [null, null, null, null],
    equippedSkills: [null, null, null, null, null],
    backpack: [],
    maxBackpackSlots: 20,
    petIds: [],
    talents: [],
    status: 'cultivating',
    injuryTimer: 0,
    createdAt: Date.now(),
    totalCultivation: 0,
    ...overrides,
  }
}

describe('shouldTriggerTribulation', () => {
  it('returns false for sub-level breakthrough (stage 0→1)', () => {
    expect(shouldTriggerTribulation(1, 0)).toBe(false)
  })

  it('returns false for major breakthrough to realm 1 (zhuji - no tribulationPower)', () => {
    expect(shouldTriggerTribulation(0, 3)).toBe(false)
  })

  it('returns true for major breakthrough to realm 2 (jindan - has tribulationPower 0.8)', () => {
    expect(shouldTriggerTribulation(1, 3)).toBe(true)
  })

  it('returns true for major breakthrough to realm 3 (yuanying - has tribulationPower)', () => {
    expect(shouldTriggerTribulation(2, 3)).toBe(true)
  })

  it('returns false for major breakthrough to realm 5 (feisheng - no tribulationPower)', () => {
    expect(shouldTriggerTribulation(4, 3)).toBe(false)
  })
})

describe('resolveTribulation', () => {
  it('returns object with success field', () => {
    const char = makeCharacter({ realm: 2, realmStage: 3 })
    const result = resolveTribulation(char)
    expect(result).toHaveProperty('success')
    if (!result.success) {
      expect(result).toHaveProperty('severe')
      expect(result).toHaveProperty('injuryTimer')
    }
  })

  it('higher spiritualRoot reduces failure rate (statistical test)', () => {
    const lowRoot = makeCharacter({ realm: 2, realmStage: 3, cultivationStats: { ...makeCharacter().cultivationStats, spiritualRoot: 5 } })
    const highRoot = makeCharacter({ realm: 2, realmStage: 3, cultivationStats: { ...makeCharacter().cultivationStats, spiritualRoot: 40 } })

    let lowFails = 0
    let highFails = 0
    const runs = 2000

    for (let i = 0; i < runs; i++) {
      if (!resolveTribulation(lowRoot).success) lowFails++
      if (!resolveTribulation(highRoot).success) highFails++
    }

    expect(highFails).toBeLessThan(lowFails)
  })

  it('failure result has injuryTimer between 60 and 120', () => {
    let foundFailure = false
    for (let i = 0; i < 5000; i++) {
      const char = makeCharacter({ realm: 2, realmStage: 3 })
      const result = resolveTribulation(char)
      if (!result.success) {
        foundFailure = true
        expect(result.injuryTimer).toBeGreaterThanOrEqual(60)
        expect(result.injuryTimer).toBeLessThanOrEqual(120)
        if (result.severe) {
          expect(result.injuryTimer).toBe(120)
        }
        break
      }
    }
    expect(foundFailure).toBe(true)
  })
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/TribulationSystem.test.ts --pool=forks --testTimeout=30000`
Expected: FAIL — module not found

- [x] **Step 3: Implement TribulationSystem**

Create `src/systems/cultivation/TribulationSystem.ts`:

```typescript
import type { Character } from '../../types/character'
import { REALMS } from '../../data/realms'

export interface TribulationResult {
  success: boolean
  severe?: boolean
  injuryTimer?: number
}

/**
 * Check if a breakthrough should trigger tribulation.
 * Only major realm breakthroughs to realms with tribulationPower trigger.
 */
export function shouldTriggerTribulation(realm: number, realmStage: number): boolean {
  // Only major realm breakthroughs (stage 3 → next realm)
  if (realmStage !== 3) return false

  const targetRealm = realm + 1
  if (targetRealm >= REALMS.length) return false

  const power = REALMS[targetRealm].tribulationPower
  return power !== undefined && power !== null && power > 0
}

/**
 * Resolve tribulation outcome for a character attempting major realm breakthrough.
 */
export function resolveTribulation(character: Character): TribulationResult {
  const targetRealm = character.realm + 1
  const realmData = REALMS[targetRealm]
  const power = realmData.tribulationPower ?? 0
  const baseFailRate = 0.10 + power * 0.25

  // Character attributes reduce failure rate
  // Typical ranges: spiritualRoot 10-40 (bonus 0.05-0.20), comprehension 5-30 (bonus 0.015-0.09)
  const spiritRootBonus = character.cultivationStats.spiritualRoot * 0.005
  const comprehensionBonus = character.cultivationStats.comprehension * 0.003

  const failRate = Math.max(0, baseFailRate - spiritRootBonus - comprehensionBonus)

  // Huashen special: stage multiplier increases tribulation difficulty
  let stageMultiplier = 1.0
  if (character.realm === 4) {
    const currentRealmData = REALMS[character.realm]
    if (currentRealmData.tribulationStages) {
      stageMultiplier = currentRealmData.tribulationStages[character.realmStage] ?? 1.0
    }
  }
  const finalFailRate = Math.min(0.95, failRate * stageMultiplier)

  if (Math.random() >= finalFailRate) {
    return { success: true }
  }

  // Failure: 10% chance of severe outcome
  const severe = Math.random() < 0.10
  return {
    success: false,
    severe,
    injuryTimer: severe ? 120 : 60,
  }
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/TribulationSystem.test.ts --pool=forks --testTimeout=30000`
Expected: ALL PASS

- [x] **Step 5: Commit**

```bash
git add src/systems/cultivation/TribulationSystem.ts src/__tests__/TribulationSystem.test.ts
git commit -m "feat(tribulation): implement passive tribulation system"
```

---

### Task 6: 集成天劫到 sectStore tickAll

**Files:**
- Modify: `src/stores/sectStore.ts`

- [x] **Step 1: Integrate tribulation into tickAll breakthrough logic**

In `src/stores/sectStore.ts`:

1. Add imports at top:
```typescript
import { shouldTriggerTribulation, resolveTribulation } from '../systems/cultivation/TribulationSystem'
```

2. Find the major realm breakthrough block in `tickAll` (approximately lines 913-952). The current logic is:
```typescript
if (isMajor) {
  const cost = BREAKTHROUGH_COSTS[nextRealm]
  if (cost && spiritStone >= cost.spiritStone) {
    // deduct stones, roll failure, breakthrough
  }
}
```

Replace with:
```typescript
if (isMajor) {
  const cost = BREAKTHROUGH_COSTS[nextRealm]
  if (cost && spiritStone >= cost.spiritStone) {
    spiritStone -= cost.spiritStone

    if (shouldTriggerTribulation(character.realm, character.realmStage)) {
      // Tribulation path for realms with tribulationPower
      const tribResult = resolveTribulation(character)
      if (tribResult.success) {
        const result = breakthrough(character, 0)
        if (result.success) {
          Object.assign(character, result)
          character.cultivation = 0
          emitEvent?.(`${character.name} 渡过天劫，境界提升至 ${getRealmName(character.realm, character.realmStage)}！`)
          tryComprehendOnBreakthrough(character)
        }
      } else {
        character.cultivation = 0
        character.status = 'injured'
        character.injuryTimer = tribResult.injuryTimer ?? 60
        if (tribResult.severe && character.realmStage > 0) {
          character.realmStage = (character.realmStage - 1) as RealmStage
          emitEvent?.(`${character.name} 天劫重伤，境界跌落至 ${getRealmName(character.realm, character.realmStage)}`)
        } else if (tribResult.severe) {
          emitEvent?.(`${character.name} 天劫重伤，修为尽失`)
        } else {
          emitEvent?.(`${character.name} 天劫失败，修为尽失`)
        }
      }
    } else {
      // Non-tribulation path for realms without tribulationPower
      const failRate = calcBreakthroughFailureRate(character)
      const result = breakthrough(character, failRate)
      if (result.success) {
        Object.assign(character, result)
        character.cultivation = 0
        emitEvent?.(`${character.name} 突破至 ${getRealmName(character.realm, character.realmStage)}！`)
        tryComprehendOnBreakthrough(character)
      } else {
        character.cultivation = 0
      }
    }
  }
}
```

**Important:** Read the existing tickAll code carefully before editing. The exact variable names and structure may differ from the summary above. Match the existing pattern.

- [x] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [x] **Step 3: Run all tests**

Run: `npx vitest run --pool=forks --testTimeout=30000`
Expected: ALL PASS

- [x] **Step 4: Run production build**

Run: `npm run build`
Expected: Build succeeds

- [x] **Step 5: Commit**

```bash
git add src/stores/sectStore.ts
git commit -m "feat(tribulation): integrate tribulation into tickAll breakthrough logic"
```

---

### Task 7: BreakthroughPanel 显示天劫信息

**Files:**
- Modify: `src/components/cultivation/BreakthroughPanel.tsx`

- [x] **Step 1: Add tribulation display to BreakthroughPanel**

In `src/components/cultivation/BreakthroughPanel.tsx`:

1. Add imports:
```typescript
import { shouldTriggerTribulation } from '../../systems/cultivation/TribulationSystem'
```

2. After the existing `failureRate` calculation, add tribulation info:

```typescript
const hasTribulation = isMajor && shouldTriggerTribulation(character.realm, character.realmStage)
```

3. Update the hint text section to show tribulation info:

In the existing requirement display area, after the failure rate row, add:

```tsx
{hasTribulation && (
  <div className={styles.requirement}>
    <span>天劫</span>
    <span className={styles.failureRate}>将触发天劫</span>
  </div>
)}
```

Also update the hint text for the ready state when tribulation applies:

```typescript
if (ready) {
  if (isMajor && cost) {
    if (!hasStones) {
      hint = `灵石不足（需要 ${cost.spiritStone.toLocaleString()}）`
      hintClass = styles.hintBlocked
    } else if (hasTribulation) {
      hint = '修为已满，突破将触发天劫...'
      hintClass = styles.ready
    } else {
      hint = '修为已满，自动突破中...'
      hintClass = styles.ready
    }
  } else {
    hint = '修为已满，自动突破中...'
    hintClass = styles.ready
  }
}
```

- [x] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [x] **Step 3: Run all tests**

Run: `npx vitest run --pool=forks --testTimeout=30000`
Expected: ALL PASS

- [x] **Step 4: Commit**

```bash
git add src/components/cultivation/BreakthroughPanel.tsx
git commit -m "feat(tribulation): show tribulation info in BreakthroughPanel"
```

---

### Task 8: 最终验证

- [x] **Step 1: Run full test suite**

Run: `npx vitest run --pool=forks --testTimeout=30000`
Expected: ALL PASS

- [x] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [x] **Step 3: Run production build**

Run: `npm run build`
Expected: Build succeeds

- [x] **Step 4: Verify test count increased**

Run: `npx vitest run --pool=forks --testTimeout=30000 2>&1 | tail -5`
Expected: Test count should be higher than before (new loot + tribulation tests added)
