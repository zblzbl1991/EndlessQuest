# Technique System Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a global technique codex system where techniques are collected through exploration, study, and breakthrough comprehension, replacing the scroll-item-based learning flow.

**Architecture:** Add `techniqueCodex: string[]` to Sect type as the central technique collection. Techniques are unlocked into the codex via three paths (adventure events, scripture hall study, breakthrough comprehension). Characters learn from the codex directly instead of consuming scroll items. A new `ancient_cave` event type in the adventure system provides technique rewards via cross-store communication.

**Tech Stack:** React 19, TypeScript 5.9, Zustand 5, Vitest

**Spec:** `docs/superpowers/specs/2026-03-26-technique-system-design.md`

---

### Task 1: Type Definitions

**Files:**
- Modify: `src/types/sect.ts:38-50`
- Modify: `src/types/adventure.ts:4`
- Modify: `src/systems/roguelike/EventSystem.ts:10-18`

- [ ] **Step 1: Add `techniqueCodex` to Sect interface**

In `src/types/sect.ts`, add `techniqueCodex: string[]` to the `Sect` interface (after `lastTransmissionTime`):

```typescript
export interface Sect {
  name: string
  level: number
  resources: Resources
  buildings: Building[]
  characters: Character[]
  vault: AnyItem[]
  maxVaultSlots: number
  pets: Pet[]
  totalAdventureRuns: number
  totalBreakthroughs: number
  lastTransmissionTime: number
  techniqueCodex: string[]  // NEW: unlocked technique IDs
}
```

- [ ] **Step 2: Add `'ancient_cave'` to EventType union**

In `src/types/adventure.ts`, update line 4:

```typescript
export type EventType = 'combat' | 'random' | 'shop' | 'rest' | 'boss' | 'ancient_cave'
```

- [ ] **Step 3: Add `techniqueReward` to EventResult**

In `src/systems/roguelike/EventSystem.ts`, add optional field to `EventResult` interface (around line 17):

```typescript
export interface EventResult {
  type: DungeonEvent['type']
  success: boolean
  reward: { spiritStone: number; herb: number; ore: number }
  itemRewards: AnyItem[]
  combatResult?: CombatResult
  message: string
  hpChanges: Record<string, number>
  techniqueReward?: { techniqueId: string }  // NEW
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Type errors in sectStore (createInitialState missing techniqueCodex) — these will be fixed in Task 4.

- [ ] **Step 5: Commit**

```bash
git add src/types/sect.ts src/types/adventure.ts src/systems/roguelike/EventSystem.ts
git commit -m "feat(types): add techniqueCodex, ancient_cave event type, techniqueReward"
```

---

### Task 2: TechniqueSystem Pure Functions + Tests

**Files:**
- Modify: `src/systems/technique/TechniqueSystem.ts`
- Create: `src/__tests__/TechniqueSystem.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/TechniqueSystem.test.ts`:

```typescript
import {
  tryComprehendOnBreakthrough,
  pickTechniqueForFloor,
} from '../systems/technique/TechniqueSystem'

describe('tryComprehendOnBreakthrough', () => {
  const codex = ['qingxin', 'lieyan', 'fentian', 'xuanbing', 'leishen']

  it('should return null when random roll fails (sub-level)', () => {
    const result = tryComprehendOnBreakthrough(
      { learnedTechniques: ['qingxin'], realm: 1, realmStage: 0, currentTechnique: 'qingxin' },
      codex,
      false, // isMajor
      () => 0.99, // always fail
    )
    expect(result).toBeNull()
  })

  it('should return technique when random roll succeeds (sub-level)', () => {
    const result = tryComprehendOnBreakthrough(
      { learnedTechniques: ['qingxin'], realm: 1, realmStage: 0, currentTechnique: 'qingxin' },
      codex,
      false,
      () => 0.14, // just under 15% threshold -> success
    )
    expect(result).not.toBeNull()
    expect(['fentian', 'xuanbing']).toContain(result!)
  })

  it('should use 40% threshold for major breakthrough', () => {
    const result = tryComprehendOnBreakthrough(
      { learnedTechniques: ['qingxin'], realm: 1, realmStage: 3, currentTechnique: 'qingxin' },
      codex,
      true,
      () => 0.39, // just under 40% -> success
    )
    expect(result).not.toBeNull()
  })

  it('should return null when all codex techniques already learned', () => {
    const result = tryComprehendOnBreakthrough(
      { learnedTechniques: codex, realm: 4, realmStage: 0, currentTechnique: 'qingxin' },
      codex,
      true,
      () => 0,
    )
    expect(result).toBeNull()
  })

  it('should respect tier ceiling (realm 0 = mortal only)', () => {
    const result = tryComprehendOnBreakthrough(
      { learnedTechniques: ['qingxin', 'lieyan'], realm: 0, realmStage: 0, currentTechnique: 'qingxin' },
      codex,
      true,
      () => 0,
    )
    expect(result).toBe('houtu') // only mortal left
  })
})

describe('pickTechniqueForFloor', () => {
  it('should return mortal tier for floor 3 with low roll', () => {
    const id = pickTechniqueForFloor(3, () => 0.5)
    expect(['qingxin', 'lieyan', 'houtu']).toContain(id)
  })

  it('should return spirit tier for floor 5 with high roll', () => {
    const id = pickTechniqueForFloor(5, () => 0.9) // 90% -> spirit
    expect(['fentian', 'xuanbing', 'leiyu']).toContain(id)
  })

  it('should return immortal tier for floor 8 with high roll', () => {
    const id = pickTechniqueForFloor(8, () => 0.9) // 90% -> immortal
    expect(['leishen', 'bumiejinshen', 'jiuzhuan']).toContain(id)
  })

  it('should return divine tier for floor 12 with high roll', () => {
    const id = pickTechniqueForFloor(12, () => 0.9) // 90% -> divine
    expect(['wanjianguizong', 'taishang']).toContain(id)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/TechniqueSystem.test.ts`
Expected: FAIL — functions not exported

- [ ] **Step 3: Implement functions in TechniqueSystem.ts**

Add to `src/systems/technique/TechniqueSystem.ts`. Import `TECHNIQUE_TIER_ORDER` from `../../types/technique` and `TECHNIQUES, getTechniqueById` from `../../data/techniquesTable`:

```typescript
/**
 * Tier ceiling for breakthrough comprehension: realm index maps to max tier.
 */
const REALM_TIER_CEILING: TechniqueTier[] = [
  'mortal', 'spirit', 'immortal', 'divine', 'chaos',
]

/**
 * Attempt breakthrough comprehension. Returns technique ID or null.
 * @param learnedTechniques - character's already-learned technique IDs
 * @param realm - character's current realm (after successful breakthrough)
 * @param techniqueCodex - sect's unlocked technique IDs
 * @param isMajor - whether this was a major realm breakthrough
 * @param randomFn - injectable random (default Math.random)
 */
export function tryComprehendOnBreakthrough(
  character: { learnedTechniques: string[]; realm: number },
  techniqueCodex: string[],
  isMajor: boolean,
  randomFn: () => number = Math.random,
): string | null {
  const chance = isMajor ? 0.40 : 0.15
  if (randomFn() >= chance) return null

  const maxTier = REALM_TIER_CEILING[Math.min(character.realm, 4)]
  const maxTierIdx = TECHNIQUE_TIER_ORDER.indexOf(maxTier)

  // Filter: unlocked in codex + not yet learned + tier <= ceiling
  const candidates = TECHNIQUES.filter((t) => {
    if (!techniqueCodex.includes(t.id)) return false
    if (character.learnedTechniques.includes(t.id)) return false
    const tierIdx = TECHNIQUE_TIER_ORDER.indexOf(t.tier)
    return tierIdx <= maxTierIdx
  })

  if (candidates.length === 0) return null
  return candidates[Math.floor(randomFn() * candidates.length)].id
}

/**
 * Pick a technique for the ancient_cave adventure event based on floor number.
 * @param floorNumber - current dungeon floor
 * @param randomFn - injectable random (default Math.random)
 */
export function pickTechniqueForFloor(
  floorNumber: number,
  randomFn: () => number = Math.random,
): string {
  const roll = randomFn()
  let tier: TechniqueTier

  if (floorNumber <= 5) {
    tier = roll < 0.7 ? 'mortal' : 'spirit'
  } else if (floorNumber <= 10) {
    tier = roll < 0.7 ? 'spirit' : 'immortal'
  } else {
    tier = roll < 0.7 ? 'immortal' : 'divine'
  }

  const pool = TECHNIQUES.filter((t) => t.tier === tier)
  return pool[Math.floor(randomFn() * pool.length)].id
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/TechniqueSystem.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/systems/technique/TechniqueSystem.ts src/__tests__/TechniqueSystem.test.ts
git commit -m "feat(technique): add breakthrough comprehension and floor technique picker"
```

---

### Task 3: CharacterEngine + SaveSystem Migration

**Files:**
- Modify: `src/systems/character/CharacterEngine.ts:235-237`
- Modify: `src/systems/save/SaveSystem.ts:74-82`

- [ ] **Step 1: Update generateCharacter to default to qingxin**

In `src/systems/character/CharacterEngine.ts`, change lines 235-237:

```typescript
    currentTechnique: 'qingxin',
    techniqueComprehension: 0,
    learnedTechniques: ['qingxin'],
```

- [ ] **Step 2: Update SaveSystem loadGame migration**

In `src/systems/save/SaveSystem.ts`, in the character migration block (around line 78), expand to handle technique fields and techniqueCodex:

```typescript
      const migratedCharacters = (saveRecord.sect.characters ?? []).map(
        (char: Character) => ({
          ...char,
          talents: char.talents ?? [],
          // Migrate characters with no technique to have qingxin
          ...(char.currentTechnique == null ? {
            currentTechnique: 'qingxin',
            learnedTechniques: char.learnedTechniques?.includes('qingxin')
              ? char.learnedTechniques
              : [...(char.learnedTechniques ?? []), 'qingxin'],
          } : {}),
        }),
      )
```

And after the setState for sect, ensure `techniqueCodex` has a default:

```typescript
      const migratedSect = {
        ...saveRecord.sect,
        characters: migratedCharacters,
        techniqueCodex: saveRecord.sect.techniqueCodex ?? ['qingxin', 'lieyan', 'houtu'],
      }
      useSectStore.setState({ sect: migratedSect })
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Type errors in sectStore createInitialState — fixed in next task.

- [ ] **Step 4: Commit**

```bash
git add src/systems/character/CharacterEngine.ts src/systems/save/SaveSystem.ts
git commit -m "feat: default character technique to qingxin + save migration"
```

---

### Task 4: sectStore New Actions + Initial State

**Files:**
- Modify: `src/stores/sectStore.ts` (createInitialState, new actions, studyTechnique refactor)

- [ ] **Step 1: Add techniqueCodex to createInitialState**

In `src/stores/sectStore.ts`, in `createInitialState()` (around line 68), add before `totalAdventureRuns`:

```typescript
      techniqueCodex: ['qingxin', 'lieyan', 'houtu'],
```

- [ ] **Step 2: Add learnTechniqueFromCodex action**

Add after the existing `learnTechnique` action:

```typescript
  learnTechniqueFromCodex: (characterId: string, techniqueId: string): boolean => {
    const { sect } = get()
    const char = sect.characters.find((c) => c.id === characterId)
    if (!char) return false

    if (!sect.techniqueCodex.includes(techniqueId)) return false

    const technique = getTechniqueById(techniqueId)
    if (!technique) return false

    if (!canLearnTechnique(char, technique)) return false

    set((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) =>
          c.id === characterId
            ? {
                ...c,
                currentTechnique: technique.id,
                techniqueComprehension: 0,
                learnedTechniques: c.learnedTechniques.includes(technique.id)
                  ? c.learnedTechniques
                  : [...c.learnedTechniques, technique.id],
              }
            : c
        ),
      },
    }))
    return true
  },
```

- [ ] **Step 3: Add unlockCodexEntry action**

```typescript
  unlockCodexEntry: (techniqueId: string): boolean => {
    const { sect } = get()
    if (sect.techniqueCodex.includes(techniqueId)) return false
    set((s) => ({
      sect: {
        ...s.sect,
        techniqueCodex: [...s.sect.techniqueCodex, techniqueId],
      },
    }))
    return true
  },
```

- [ ] **Step 4: Add unlockCodexAndLearn action (for adventure events)**

```typescript
  unlockCodexAndLearn: (techniqueId: string, characterId: string): boolean => {
    const { sect } = get()
    const char = sect.characters.find((c) => c.id === characterId)
    if (!char) return false
    if (char.learnedTechniques.includes(techniqueId) && sect.techniqueCodex.includes(techniqueId)) return true

    set((s) => ({
      sect: {
        ...s.sect,
        techniqueCodex: s.sect.techniqueCodex.includes(techniqueId)
          ? s.sect.techniqueCodex
          : [...s.sect.techniqueCodex, techniqueId],
        characters: s.sect.characters.map((c) =>
          c.id === characterId
            ? {
                ...c,
                learnedTechniques: c.learnedTechniques.includes(techniqueId)
                  ? c.learnedTechniques
                  : [...c.learnedTechniques, techniqueId],
              }
            : c
        ),
      },
    }))
    return true
  },
```

- [ ] **Step 5: Refactor studyTechnique to unlock codex directly**

Replace the existing `studyTechnique` action (lines 1062-1079):

```typescript
  studyTechnique: () => {
    const { sect } = get()
    const scriptureLevel = sect.buildings.find(b => b.type === 'scriptureHall')?.level ?? 0
    if (scriptureLevel < 3) return { success: false, reason: '藏经阁等级不足' }
    const cost = 100 * sect.level
    if (sect.resources.spiritStone < cost) return { success: false, reason: '灵石不足' }

    // Determine max tier from highest character realm
    const maxRealm = Math.max(...sect.characters.map(c => c.realm), 0)
    const maxTierIdx = Math.min(maxRealm, TECHNIQUE_TIER_ORDER.length - 1)

    // Weighted random: lower tiers more likely (weight doubles per tier below max)
    const weights: number[] = []
    for (let i = 0; i <= maxTierIdx; i++) {
      weights.push(Math.pow(2, maxTierIdx - i))
    }
    const totalWeight = weights.reduce((a, b) => a + b, 0)
    let roll = Math.random() * totalWeight
    let selectedTierIdx = 0
    for (let i = 0; i < weights.length; i++) {
      roll -= weights[i]
      if (roll <= 0) { selectedTierIdx = i; break }
    }
    const selectedTier = TECHNIQUE_TIER_ORDER[selectedTierIdx]

    // Pick a random unlocked or unlockable technique of that tier
    const candidates = TECHNIQUES.filter(
      (t) => t.tier === selectedTier && !sect.techniqueCodex.includes(t.id)
    )

    if (candidates.length === 0) {
      return { success: false, reason: '所有该品阶功法已解锁' }
    }

    const technique = candidates[Math.floor(Math.random() * candidates.length)]

    // Deduct cost and unlock
    set((s) => ({
      sect: {
        ...s.sect,
        resources: { ...s.sect.resources, spiritStone: s.sect.resources.spiritStone - cost },
        techniqueCodex: [...s.sect.techniqueCodex, technique.id],
      },
    }))

    const techniqueName = getTechniqueById(technique.id)?.name ?? technique.id
    emitEvent('technique_unlocked', `藏经阁参悟获得 ${techniqueName}`)

    return { success: true, reason: technique.id }
  },
```

Add import at top of file if not already present: `import { TECHNIQUE_TIER_ORDER } from '../types/technique'`

- [ ] **Step 6: Remove unused generateRandomTechniqueScroll import**

In `src/stores/sectStore.ts`, remove the import of `generateRandomTechniqueScroll` from ItemGenerator (line ~20). Keep `generateTechniqueScroll` import if it exists (used by old scroll compat).

- [ ] **Step 7: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/stores/sectStore.ts
git commit -m "feat(store): add codex actions, refactor studyTechnique to unlock directly"
```

---

### Task 5: tickAll Breakthrough Comprehension

**Files:**
- Modify: `src/stores/sectStore.ts` (tickAll auto-breakthrough success branches)

- [ ] **Step 1: Add comprehension check after breakthrough success**

In `src/stores/sectStore.ts`, import `tryComprehendOnBreakthrough` from TechniqueSystem.

In the tickAll function, there are two breakthrough success branches (one for major realm with cost, one for sub-level without cost). After the success handling in EACH branch (after `updatedChar = { ...updatedChar, realm: ..., cultivation: 0, baseStats: ... }`), add:

```typescript
              // Breakthrough comprehension
              const comprehendedId = tryComprehendOnBreakthrough(
                updatedChar, get().sect.techniqueCodex, isMajorBreakthrough
              )
              if (comprehendedId) {
                updatedChar = {
                  ...updatedChar,
                  learnedTechniques: [...updatedChar.learnedTechniques, comprehendedId],
                }
                if (!updatedChar.currentTechnique) {
                  updatedChar = { ...updatedChar, currentTechnique: comprehendedId, techniqueComprehension: 0 }
                }
                const compName = getTechniqueById(comprehendedId)?.name ?? comprehendedId
                emitEvent('breakthrough_comprehension', `${updatedChar.name} 顿悟了 ${compName}`)
              }
```

Note: For the major realm branch, `isMajorBreakthrough` is already computed as a local variable. For the sub-level branch (the `else` at ~line 967), use `isMajorBreakthrough = false` since it's a sub-level.

- [ ] **Step 2: Run existing tests to ensure no regression**

Run: `npx vitest run src/__tests__/stores.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/stores/sectStore.ts
git commit -m "feat(tickAll): add breakthrough comprehension to auto-breakthrough"
```

---

### Task 6: Adventure Event Chain (EventSystem + MapGenerator + adventureStore)

**Files:**
- Modify: `src/systems/roguelike/EventSystem.ts` (resolveEvent switch)
- Modify: `src/systems/roguelike/MapGenerator.ts` (event generation)
- Modify: `src/stores/adventureStore.ts` (selectRoute techniqueReward handling)

- [ ] **Step 1: Add ancient_cave case to EventSystem.resolveEvent**

In `src/systems/roguelike/EventSystem.ts`, import `pickTechniqueForFloor` from `../technique/TechniqueSystem`.

Add a new case before the `default` case (before line 238):

```typescript
    case 'ancient_cave': {
      const techniqueId = pickTechniqueForFloor(floorNumber)
      const techniqueName = getTechniqueById(techniqueId)?.name ?? techniqueId
      return {
        type: event.type,
        success: true,
        reward: { spiritStone: 0, herb: 0, ore: 0 },
        itemRewards: [],
        message: `古修洞府中发现功法铭文：${techniqueName}`,
        hpChanges: {},
        techniqueReward: { techniqueId },
      }
    }
```

- [ ] **Step 2: Add ancient_cave to MapGenerator event pool**

In `src/systems/roguelike/MapGenerator.ts`, modify the event generation (around line 57). Change the distribution to add ancient_cave at 5% weight, reducing rest from 10% to 5%:

```typescript
      let type: DungeonEvent['type']
      if (roll < 0.40) type = 'combat'       // 40%
      else if (roll < 0.65) type = 'random'   // 25%
      else if (roll < 0.80) type = 'shop'     // 15%
      else if (roll < 0.90) type = 'rest'     // 10%
      else if (roll < 0.95) type = 'ancient_cave' // 5%
      else type = 'boss'                       // 5%

      // Only generate ancient_cave on floor 3+
      if (type === 'ancient_cave' && floorNumber < 3) type = 'random'

      // Don't add boss on non-boss floors
      if (type === 'boss' && !isBossFloor) type = 'combat'
```

- [ ] **Step 3: Handle techniqueReward in adventureStore.selectRoute**

In `src/stores/adventureStore.ts`, import `useSectStore` at the top (if not already imported).

In the `selectRoute` function, after the item rewards accumulation loop (around line 356), add:

```typescript
      // Handle technique reward (cross-store)
      if (result.techniqueReward) {
        const sectStore = useSectStore.getState()
        const firstAliveCharId = run.teamCharacterIds.find(
          (cid) => newMemberStates[cid]?.status !== 'dead'
        )
        if (firstAliveCharId) {
          sectStore.unlockCodexAndLearn(result.techniqueReward.techniqueId, firstAliveCharId)
        }
      }
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Run existing tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/systems/roguelike/EventSystem.ts src/systems/roguelike/MapGenerator.ts src/stores/adventureStore.ts
git commit -m "feat(adventure): add ancient_cave event with technique reward"
```

---

### Task 7: UI Changes (StudyPanel + BuildingsPage Codex + CharactersPage)

**Files:**
- Modify: `src/components/building/StudyPanel.tsx`
- Modify: `src/pages/BuildingsPage.tsx` (scriptureHall tabs)
- Create: `src/components/building/CodexPanel.tsx`
- Create: `src/components/building/CodexPanel.module.css`
- Modify: `src/pages/CharactersPage.tsx` (technique section)

- [ ] **Step 1: Update StudyPanel to show codex unlock result**

In `src/components/building/StudyPanel.tsx`, update the `handleStudy` to show the technique name from the result:

```typescript
  const handleStudy = () => {
    const result = studyTechnique()
    if (result.success) {
      const technique = getTechniqueById(result.reason)
      setMessage(technique ? `参悟成功：获得 ${technique.name}（${TECHNIQUE_TIER_NAMES[technique.tier]}）` : '参悟成功')
    } else {
      setMessage(result.reason || '参悟失败')
    }
  }
```

Add import: `import { getTechniqueById } from '../../data/techniquesTable'` and `import { TECHNIQUE_TIER_NAMES } from '../../types/technique'`

- [ ] **Step 2: Add CodexPanel component**

Create `src/components/building/CodexPanel.tsx`:

```tsx
import { useSectStore } from '../../stores/sectStore'
import { TECHNIQUES, getTechniqueById } from '../../data/techniquesTable'
import { TECHNIQUE_TIER_NAMES } from '../../types/technique'
import styles from './CodexPanel.module.css'

export default function CodexPanel() {
  const techniqueCodex = useSectStore((s) => s.sect.techniqueCodex)

  return (
    <div className={styles.codex}>
      <div className={styles.header}>功法图鉴</div>
      <div className={styles.stats}>
        已收集 {techniqueCodex.length} / {TECHNIQUES.length}
      </div>
      <div className={styles.grid}>
        {TECHNIQUES.map((tech) => {
          const unlocked = techniqueCodex.includes(tech.id)
          return (
            <div key={tech.id} className={`${styles.card} ${unlocked ? styles.unlocked : styles.locked}`}>
              <div className={styles.cardName}>{unlocked ? tech.name : '???'}</div>
              <div className={styles.cardTier}>{TECHNIQUE_TIER_NAMES[tech.tier]}</div>
              {unlocked && (
                <div className={styles.cardDesc}>{tech.description}</div>
              )}
              {unlocked && (
                <div className={styles.cardStats}>
                  {Object.entries(tech.growthModifiers)
                    .filter(([, v]) => v !== 1)
                    .map(([k, v]) => (
                      <span key={k}>{k} {v > 1 ? `+${Math.round((v - 1) * 100)}%` : `${Math.round((v - 1) * 100)}%`}</span>
                    ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create CodexPanel.module.css**

```css
.codex {
  padding: var(--space-sm);
}

.header {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: var(--space-xs);
}

.stats {
  font-size: 12px;
  color: var(--color-text-tertiary);
  margin-bottom: var(--space-md);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--space-sm);
}

.card {
  padding: var(--space-sm);
  border: 1px solid var(--color-border-light);
  border-radius: 6px;
  background: var(--color-bg);
}

.card.locked {
  opacity: 0.5;
}

.cardName {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 2px;
}

.cardTier {
  font-size: 11px;
  color: var(--color-text-tertiary);
  margin-bottom: var(--space-xs);
}

.cardDesc {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-xs);
  line-height: 1.4;
}

.cardStats {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  font-size: 11px;
  color: var(--color-accent);
}
```

- [ ] **Step 4: Add codex tab to BuildingsPage**

In `src/pages/BuildingsPage.tsx`:

1. Import `CodexPanel` from `'../components/building/CodexPanel'`

2. After the study tab check (around line 114), add:
```typescript
    if (sh && sh.unlocked) tabs.push({ key: 'codex', label: '图鉴' })
```

3. Add `'codex'` to the `TabKey` type union (around line 31):
```typescript
type TabKey = 'buildings' | 'recruit' | 'vault' | 'alchemy' | 'forge' | 'study' | 'codex' | 'market' | 'transmission'
```

4. After the StudyPanel render (around line 148), add:
```typescript
      {tab === 'codex' && <CodexPanel />}
```

- [ ] **Step 5: Update CharactersPage technique section to learn from codex**

In `src/pages/CharactersPage.tsx`, in the CharacterDetail component:

1. Add store selector:
```typescript
  const techniqueCodex = useSectStore((s) => s.sect.techniqueCodex)
  const learnTechniqueFromCodex = useSectStore((s) => s.learnTechniqueFromCodex)
```

2. Compute codex-available techniques (for learning when no technique equipped):
```typescript
  const codexLearnable = techniqueCodex
    .map((id) => getTechniqueById(id))
    .filter((t): t is NonNullable<typeof t> => t != null && canLearnTechnique(character, t))
```

3. Replace the "no technique" branch (the `else` block that shows scroll-based learning) with codex-based learning. Keep the old scroll learning as fallback:

```tsx
        ) : (
          <div className={styles.noTechnique}>
            <span>未修炼功法</span>
            {codexLearnable.length > 0 ? (
              <>
                <button className={styles.actionBtn} onClick={() => setShowLearnTechnique(!showLearnTechnique)}>
                  学习功法
                </button>
                {showLearnTechnique && (
                  <div className={styles.dropdown}>
                    {codexLearnable.map((t) => (
                      <button key={t.id} className={styles.dropdownItem}
                        onClick={() => { learnTechniqueFromCodex(characterId, t.id); setShowLearnTechnique(false) }}>
                        {t.name} ({TECHNIQUE_TIER_NAMES[t.tier]})
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : scrollItems.length > 0 ? (
              <>
                <button className={styles.actionBtn} onClick={() => setShowLearnTechnique(!showLearnTechnique)}>
                  学习功法（背包）
                </button>
                {showLearnTechnique && (
                  <div className={styles.dropdown}>
                    {scrollItems.map(({ item, idx }) => (
                      <button key={idx} className={styles.dropdownItem}
                        onClick={() => { learnTechnique(characterId, idx); setShowLearnTechnique(false) }}>
                        {item.name} ({QUALITY_NAMES[item.quality]})
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <span className={styles.noScrollHint}>无可学功法</span>
            )}
          </div>
        )}
```

4. Add `import { canLearnTechnique } from '../systems/technique/TechniqueSystem'` to imports.

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/building/StudyPanel.tsx src/components/building/CodexPanel.tsx src/components/building/CodexPanel.module.css src/pages/BuildingsPage.tsx src/pages/CharactersPage.tsx
git commit -m "feat(ui): add codex panel, update study panel and character technique learning"
```

---

### Task 8: Full Test + Build Verification

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass (including new TechniqueSystem tests)

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS (0 errors)

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Manual smoke test**

Open the app in browser:
- New game: character should have 清心诀 equipped
- Scripture Hall tab should show 参悟 and 图鉴 tabs
- 图鉴 should show 3 unlocked mortal techniques and 9 locked ones
- BuildingsPage > 藏经阁 > 参悟 should unlock a codex entry (not create vault item)
- CharactersPage should show 清心诀 with comprehension progress bar
