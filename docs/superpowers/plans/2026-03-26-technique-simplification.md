# Technique System Simplification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify the technique system from single-technique-with-comprehension to multi-technique-stacking with instant mastery.

**Architecture:** Remove `currentTechnique`, `techniqueComprehension`, and all comprehension-ticking logic. Replace `growthModifiers` (multiplicative) + `fixedBonuses` (threshold-based) with a unified `bonuses` array (additive, all active on learn). Techniques are auto-learned on breakthrough from the codex. All learned techniques stack.

**Tech Stack:** TypeScript 5.9, React 19, Zustand 5, Vitest

**Spec:** `docs/superpowers/specs/2026-03-26-technique-system-design.md`

---

### Task 1: Update Technique and Character types

**Files:**
- Modify: `src/types/technique.ts`
- Modify: `src/types/character.ts`
- Test: `src/__tests__/types.test.ts`

- [ ] **Step 1: Rewrite Technique interface in `src/types/technique.ts`**

Replace `growthModifiers`, `fixedBonuses`, `comprehensionDifficulty` with unified `bonuses`:

```typescript
import type { Element } from './skill'

export type TechniqueTier = 'mortal' | 'spirit' | 'immortal' | 'divine' | 'chaos'

export interface TechniqueBonus {
  type: string
  value: number
}

export interface Technique {
  id: string
  name: string
  description: string
  tier: TechniqueTier
  element: Element
  bonuses: TechniqueBonus[]
  requirements: {
    minRealm: number
    minComprehension: number
  }
}
```

Keep `TECHNIQUE_TIER_NAMES` and `TECHNIQUE_TIER_ORDER` unchanged.

- [ ] **Step 2: Remove `currentTechnique` and `techniqueComprehension` from `src/types/character.ts`**

Remove these two fields from the `Character` interface (lines 39-40). Keep `learnedTechniques: string[]`.

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -50`
Expected: Many type errors — these will be fixed in subsequent tasks.

- [ ] **Step 4: Commit**

```bash
git add src/types/technique.ts src/types/character.ts
git commit -m "refactor(types): simplify Technique to flat bonuses, remove currentTechnique"
```

---

### Task 2: Rewrite technique data table

**Files:**
- Modify: `src/data/techniquesTable.ts`
- Test: `src/__tests__/TechniqueSystem.test.ts` (existing tests will need update)

- [ ] **Step 1: Rewrite TECHNIQUES array with new `bonuses` format**

Replace `growthModifiers`, `fixedBonuses`, `comprehensionDifficulty` with `bonuses`. Balance values by tier — higher tier = bigger bonuses. Values are additive flat bonuses applied to base stats.

```typescript
import type { Technique } from '../types/technique'

export const TECHNIQUES: Technique[] = [
  // ─── Mortal (凡品) ──────────────────────────────
  {
    id: 'qingxin',
    name: '清心诀',
    description: '最基础的修炼功法，均衡提升各项能力。',
    tier: 'mortal',
    element: 'neutral',
    bonuses: [
      { type: 'hp', value: 10 },
      { type: 'atk', value: 2 },
      { type: 'def', value: 2 },
      { type: 'spd', value: 1 },
    ],
    requirements: { minRealm: 0, minComprehension: 5 },
  },
  {
    id: 'lieyan',
    name: '烈焰心法',
    description: '以烈焰之力淬炼经脉，攻击大幅提升。',
    tier: 'mortal',
    element: 'fire',
    bonuses: [
      { type: 'atk', value: 5 },
      { type: 'crit', value: 0.02 },
    ],
    requirements: { minRealm: 0, minComprehension: 8 },
  },
  {
    id: 'houtu',
    name: '厚土诀',
    description: '汲取大地之力强化肉身，生命与防御大幅提升。',
    tier: 'mortal',
    element: 'neutral',
    bonuses: [
      { type: 'hp', value: 20 },
      { type: 'def', value: 4 },
    ],
    requirements: { minRealm: 0, minComprehension: 8 },
  },

  // ─── Spirit (灵品) ─────────────────────────────
  {
    id: 'fentian',
    name: '焚天诀',
    description: '烈焰心法的进阶功法，焚尽万物。',
    tier: 'spirit',
    element: 'fire',
    bonuses: [
      { type: 'atk', value: 12 },
      { type: 'crit', value: 0.03 },
      { type: 'critDmg', value: 0.1 },
    ],
    requirements: { minRealm: 1, minComprehension: 12 },
  },
  {
    id: 'xuanbing',
    name: '玄冰诀',
    description: '以玄冰之力护体，防御与生命极强。',
    tier: 'spirit',
    element: 'ice',
    bonuses: [
      { type: 'hp', value: 40 },
      { type: 'def', value: 8 },
    ],
    requirements: { minRealm: 1, minComprehension: 12 },
  },
  {
    id: 'leiyu',
    name: '雷御诀',
    description: '引雷电之力驾驭全身，速度极快。',
    tier: 'spirit',
    element: 'lightning',
    bonuses: [
      { type: 'spd', value: 5 },
      { type: 'cultivationRate', value: 0.1 },
    ],
    requirements: { minRealm: 1, minComprehension: 12 },
  },

  // ─── Immortal (仙品) ──────────────────────────
  {
    id: 'leishen',
    name: '雷神体',
    description: '雷御诀的进阶体修功法，速度与暴击极强。',
    tier: 'immortal',
    element: 'lightning',
    bonuses: [
      { type: 'spd', value: 12 },
      { type: 'crit', value: 0.06 },
      { type: 'critDmg', value: 0.2 },
    ],
    requirements: { minRealm: 2, minComprehension: 18 },
  },
  {
    id: 'bumiejinshen',
    name: '不灭金身',
    description: '传说中的体修绝学，肉身几乎不灭。',
    tier: 'immortal',
    element: 'neutral',
    bonuses: [
      { type: 'hp', value: 80 },
      { type: 'def', value: 15 },
    ],
    requirements: { minRealm: 2, minComprehension: 18 },
  },
  {
    id: 'jiuzhuan',
    name: '九转轮回',
    description: '轮回之力加持，各项属性均衡提升。',
    tier: 'immortal',
    element: 'neutral',
    bonuses: [
      { type: 'hp', value: 30 },
      { type: 'atk', value: 8 },
      { type: 'def', value: 8 },
      { type: 'spd', value: 5 },
    ],
    requirements: { minRealm: 2, minComprehension: 18 },
  },

  // ─── Divine (神品) ─────────────────────────────
  {
    id: 'wanjianguizong',
    name: '万剑归宗',
    description: '万剑齐发毁天灭地，攻击力无与伦比。',
    tier: 'divine',
    element: 'neutral',
    bonuses: [
      { type: 'atk', value: 25 },
      { type: 'crit', value: 0.08 },
      { type: 'critDmg', value: 0.3 },
    ],
    requirements: { minRealm: 3, minComprehension: 25 },
  },
  {
    id: 'taishang',
    name: '太上忘情',
    description: '太上忘情，断绝七情六欲，各项属性极强。',
    tier: 'divine',
    element: 'ice',
    bonuses: [
      { type: 'hp', value: 40 },
      { type: 'atk', value: 15 },
      { type: 'def', value: 12 },
      { type: 'spd', value: 8 },
    ],
    requirements: { minRealm: 3, minComprehension: 25 },
  },

  // ─── Chaos (混沌品) ─────────────────────────────
  {
    id: 'hunduntiangong',
    name: '混沌天功',
    description: '传说中的混沌功法，得之者可逆天改命。',
    tier: 'chaos',
    element: 'neutral',
    bonuses: [
      { type: 'hp', value: 60 },
      { type: 'atk', value: 30 },
      { type: 'def', value: 20 },
      { type: 'spd', value: 15 },
      { type: 'crit', value: 0.1 },
      { type: 'critDmg', value: 0.4 },
    ],
    requirements: { minRealm: 4, minComprehension: 30 },
  },
]
```

- [ ] **Step 2: Remove `getBonusThresholds` and `getActiveBonuses` functions**

These functions depend on `fixedBonuses` and comprehension thresholds — both deleted. Remove both functions entirely.

- [ ] **Step 3: Commit**

```bash
git add src/data/techniquesTable.ts
git commit -m "refactor(data): rewrite technique bonuses as flat additive values"
```

---

### Task 3: Simplify TechniqueSystem

**Files:**
- Modify: `src/systems/technique/TechniqueSystem.ts`
- Test: `src/__tests__/TechniqueSystem.test.ts`

- [ ] **Step 1: Delete dead functions**

Remove these functions entirely:
- `getComprehensionEffect` (line 25-29)
- `getActiveBonuses` (line 35-41) — re-export, now dead
- `tickComprehension` (line 59-93)
- `tickAllComprehension` (line 100-124)
- `calcOfflineComprehension` (line 131-157)
- `applyTechniqueGrowth` (line 167-183)
- `TIER_MULTIPLIER` constant (line 10-16)

- [ ] **Step 2: Add comprehension threshold check to `tryComprehendOnBreakthrough`**

Update the filter in `tryComprehendOnBreakthrough` (line 208-213) to also check `canLearnTechnique`:

```typescript
export function tryComprehendOnBreakthrough(
  character: { learnedTechniques: string[]; realm: number; cultivationStats: { comprehension: number } },
  techniqueCodex: string[],
  isMajor: boolean,
  randomFn: () => number = Math.random,
): string | null {
  const chance = isMajor ? 0.40 : 0.15
  if (randomFn() >= chance) return null

  const maxTier = REALM_TIER_CEILING[Math.min(character.realm, 4)]
  const maxTierIdx = TECHNIQUE_TIER_ORDER.indexOf(maxTier)

  const candidates = TECHNIQUES.filter((t) => {
    if (!techniqueCodex.includes(t.id)) return false
    if (character.learnedTechniques.includes(t.id)) return false
    const tierIdx = TECHNIQUE_TIER_ORDER.indexOf(t.tier)
    if (tierIdx > maxTierIdx) return false
    // Add comprehension threshold check
    if (character.cultivationStats.comprehension < t.requirements.minComprehension) return false
    return true
  })

  if (candidates.length === 0) return null
  return candidates[Math.floor(randomFn() * candidates.length)].id
}
```

Note the parameter type change: `character` now needs `cultivationStats.comprehension` instead of relying on a separate comprehension check.

- [ ] **Step 3: Update imports**

Remove unused imports: `BaseStats`, `getBonusThresholds`. Keep `TECHNIQUES`, `TECHNIQUE_TIER_ORDER`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/__tests__/TechniqueSystem.test.ts --reporter=verbose`
Expected: Comprehension tests fail — update them in Step 5.

- [ ] **Step 5: Update TechniqueSystem tests**

Update or remove tests that test deleted functions. Keep tests for `canLearnTechnique`, `tryComprehendOnBreakthrough`, `pickTechniqueForFloor`. Add a test for the new comprehension threshold check in `tryComprehendOnBreakthrough`.

- [ ] **Step 6: Commit**

```bash
git add src/systems/technique/TechniqueSystem.ts src/__tests__/TechniqueSystem.test.ts
git commit -m "refactor(technique): remove comprehension system, add threshold to breakthrough"
```

---

### Task 4: Update CultivationEngine

**Files:**
- Modify: `src/systems/cultivation/CultivationEngine.ts`
- Test: `src/__tests__/CultivationEngine.test.ts`

- [ ] **Step 1: Rewrite `calcCultivationRate` to accept `learnedTechniques: string[]`**

```typescript
import { getTechniqueById } from '../data/techniquesTable'

export function calcCultivationRate(
  character: Character,
  learnedTechniques: string[],
): number {
  const spiritualRoot = character.cultivationStats.spiritualRoot
  const rootBonus = 1 + (spiritualRoot - 10) * 0.02
  const realmMult = REALM_CULTIVATION_MULT[character.realm] ?? 0.5

  let rate = BASE_CULTIVATION_RATE * rootBonus * realmMult

  // Sum cultivationRate bonuses from all learned techniques
  let cultivationRateSum = 0
  for (const techId of learnedTechniques) {
    const tech = getTechniqueById(techId)
    if (!tech) continue
    for (const bonus of tech.bonuses) {
      if (bonus.type === 'cultivationRate') {
        cultivationRateSum += bonus.value
      }
    }
  }
  if (cultivationRateSum > 0) {
    rate *= (1 + cultivationRateSum)
  }

  return rate
}
```

- [ ] **Step 2: Update `tick` function signature**

Change `technique: Technique | null = null` to `learnedTechniques: string[] = []` and pass through to `calcCultivationRate`.

- [ ] **Step 3: Rewrite `breakthrough` to accept `learnedTechniques: string[]`**

Remove the `applyTechniqueGrowthToStats` logic. The breakthrough function no longer needs technique data — stat growth comes from base stats only:

```typescript
export function breakthrough(
  character: Character,
  failureRate: number = 0,
): BreakthroughResult {
  // ... existing canBreakthrough + failure roll logic (unchanged) ...

  const oldStats = { ...character.baseStats }
  const realm = REALMS[character.realm]
  const nextStage = (character.realmStage + 1) as RealmStage
  const isMajorRealm = nextStage >= realm.stages.length

  const newStats = calcStatGrowth(oldStats, isMajorRealm)
  // No technique growth modifier — technique bonuses are additive, not multiplicative growth

  return {
    success: true,
    newRealm: isMajorRealm ? character.realm + 1 : character.realm,
    newStage: isMajorRealm ? 0 : nextStage,
    oldStats,
    newStats,
  }
}
```

- [ ] **Step 4: Remove `applyTechniqueGrowthToStats` and `getComprehensionEffect` import**

Delete the private `applyTechniqueGrowthToStats` function (lines 192-208). Remove `getComprehensionEffect` import from TechniqueSystem.

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/__tests__/CultivationEngine.test.ts --reporter=verbose`
Expected: Some tests need updating due to signature changes.

- [ ] **Step 6: Update CultivationEngine tests**

Update test calls to use `learnedTechniques: string[]` instead of `technique: Technique | null`. Remove tests for technique growth in breakthrough.

- [ ] **Step 7: Commit**

```bash
git add src/systems/cultivation/CultivationEngine.ts src/__tests__/CultivationEngine.test.ts
git commit -m "refactor(cultivation): multi-technique cultivation rate, remove technique growth from breakthrough"
```

---

### Task 5: Update CharacterEngine

**Files:**
- Modify: `src/systems/character/CharacterEngine.ts`
- Test: `src/__tests__/CharacterEngine.test.ts`

- [ ] **Step 1: Update `generateCharacter`**

Remove `currentTechnique: 'qingxin'` and `techniqueComprehension: 0` from the return object (lines 235-236). Keep `learnedTechniques: ['qingxin']`.

- [ ] **Step 2: Rewrite `calcCharacterTotalStats` to accept `learnedTechniques: string[]`**

```typescript
import { getTechniqueById } from '../data/techniquesTable'

export function calcCharacterTotalStats(
  character: Character,
  learnedTechniques: string[],
  getEquipmentById: (id: string) => Equipment | undefined,
): BaseStats {
  const total: BaseStats = { ...character.baseStats }

  // Add equipment stats (unchanged)
  for (const gearId of character.equippedGear) {
    // ... existing equipment logic ...
  }

  // Add all learned technique bonuses (flat additive)
  for (const techId of learnedTechniques) {
    const tech = getTechniqueById(techId)
    if (!tech) continue
    for (const bonus of tech.bonuses) {
      const key = bonus.type as keyof BaseStats
      if (key in total) {
        (total as unknown as Record<string, number>)[key] += bonus.value
      }
    }
  }

  // Round (unchanged)
  // ...
  return total
}
```

- [ ] **Step 3: Remove `getComprehensionEffect` private function**

Delete the duplicate `getComprehensionEffect` function (lines 161-165). It's no longer needed anywhere in this file.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/__tests__/CharacterEngine.test.ts --reporter=verbose`

- [ ] **Step 5: Update tests**

Update `calcCharacterTotalStats` tests to use `learnedTechniques: string[]` instead of `technique`. Remove `currentTechnique`/`techniqueComprehension` assertions from `generateCharacter` tests.

- [ ] **Step 6: Commit**

```bash
git add src/systems/character/CharacterEngine.ts src/__tests__/CharacterEngine.test.ts
git commit -m "refactor(character): multi-technique stat calc, remove comprehension from generation"
```

---

### Task 6: Update combat unit creation

**Files:**
- Modify: `src/data/enemies.ts`

- [ ] **Step 1: Rewrite `createCharacterCombatUnit` to accept `learnedTechniques: string[]`**

```typescript
import { getTechniqueById } from './techniquesTable'
import { TECHNIQUE_TIER_ORDER } from '../types/technique'
import type { Technique } from '../types/technique'

export function createCharacterCombatUnit(
  character: Character,
  learnedTechniques: string[],
): CombatUnit {
  const base = character.baseStats

  // Collect bonuses from all learned techniques
  let hp = base.hp
  let atk = base.atk
  let def = base.def
  let spd = base.spd
  let crit = base.crit
  let critDmg = base.critDmg
  let element: string = 'neutral'
  let highestTierIdx = -1

  for (const techId of learnedTechniques) {
    const tech = getTechniqueById(techId)
    if (!tech) continue

    for (const bonus of tech.bonuses) {
      switch (bonus.type) {
        case 'hp': hp += bonus.value; break
        case 'atk': atk += bonus.value; break
        case 'def': def += bonus.value; break
        case 'spd': spd += bonus.value; break
        case 'crit': crit += bonus.value; break
        case 'critDmg': critDmg += bonus.value; break
      }
    }

    // Use element from highest tier technique
    const tierIdx = TECHNIQUE_TIER_ORDER.indexOf(tech.tier)
    if (tierIdx > highestTierIdx) {
      highestTierIdx = tierIdx
      element = tech.element
    }
  }

  // Round
  hp = Math.floor(hp)
  atk = Math.floor(atk)
  def = Math.floor(def)
  spd = Math.floor(spd)
  crit = Math.round(crit * 10000) / 10000
  critDmg = Math.round(critDmg * 100) / 100

  const skills = resolveSkills(character.equippedSkills)

  return {
    id: character.id,
    name: character.name,
    team: 'ally',
    hp,
    maxHp: hp,
    atk,
    def,
    spd,
    crit,
    critDmg,
    element,
    spiritPower: character.cultivationStats.spiritPower,
    maxSpiritPower: character.cultivationStats.maxSpiritPower,
    skills,
    skillCooldowns: new Array(skills.length).fill(0),
  }
}
```

Remove the `getActiveBonuses` import.

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: Fewer errors than before — mainly callers of the old API.

- [ ] **Step 3: Commit**

```bash
git add src/data/enemies.ts
git commit -m "refactor(combat): multi-technique stacking for combat units"
```

---

### Task 7: Update SkillSystem

**Files:**
- Modify: `src/systems/skill/SkillSystem.ts`
- Test: `src/__tests__/SkillSystem.test.ts`

- [ ] **Step 1: Rewrite `calcTechniqueBonuses` for multi-technique**

```typescript
import { getTechniqueById } from '../../data/techniquesTable'

export function calcTechniqueBonuses(
  learnedTechniques: string[],
): Record<string, number> {
  const bonus: Record<string, number> = {}

  for (const techId of learnedTechniques) {
    const tech = getTechniqueById(techId)
    if (!tech) continue
    for (const b of tech.bonuses) {
      bonus[b.type] = (bonus[b.type] ?? 0) + b.value
    }
  }

  return bonus
}
```

Remove the `Technique` import (no longer needed). Keep `TechniqueBonus` import (still used in `applyTechniqueBonuses`).

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/__tests__/SkillSystem.test.ts --reporter=verbose`

- [ ] **Step 3: Update SkillSystem tests**

Update test calls from `calcTechniqueBonuses(technique, comprehension)` to `calcTechniqueBonuses(learnedTechniques)`.

- [ ] **Step 4: Commit**

```bash
git add src/systems/skill/SkillSystem.ts src/__tests__/SkillSystem.test.ts
git commit -m "refactor(skill): multi-technique bonus calculation"
```

---

### Task 8: Remove trainingHall building and dead building effects

**Files:**
- Modify: `src/systems/economy/BuildingEffects.ts`
- Modify: `src/data/buildings.ts`
- Modify: `src/types/sect.ts`

- [ ] **Step 1: Remove `TrainingBuff`, `getTrainingBuff`, `getGroupTransmissionUnlockLevel`, `getTrainingSpeedMult` from `BuildingEffects.ts`**

Delete these exports (lines 112-137):
- `TrainingBuff` interface
- `getTrainingBuff()` function
- `getGroupTransmissionUnlockLevel()` function
- `getTrainingSpeedMult()` function

- [ ] **Step 2: Remove `ScriptureBuff`, `getScriptureBuff`, `getComprehensionSpeedMult` from `BuildingEffects.ts`**

Delete these (lines 76-91, 157-163):
- `ScriptureBuff` interface
- `getScriptureBuff()` function
- `getComprehensionSpeedMult()` function

Keep `getStudyUnlockLevel()` — still needed for studyTechnique.

- [ ] **Step 3: Remove `trainingHall` from `BuildingType` in `src/types/sect.ts`**

Remove `'trainingHall'` from the union type.

- [ ] **Step 4: Remove `trainingHall` from `BUILDING_DEFS` in `src/data/buildings.ts`**

Delete the trainingHall entry from the array. Also remove or update the `getBuildingEffectText` function's trainingHall case and the unlock hint for trainingHall.

- [ ] **Step 5: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 6: Commit**

```bash
git add src/systems/economy/BuildingEffects.ts src/data/buildings.ts src/types/sect.ts
git commit -m "refactor(buildings): remove trainingHall and dead building effects"
```

---

### Task 9: Update sectStore — remove old technique actions and comprehension tick

**Files:**
- Modify: `src/stores/sectStore.ts`
- Test: `src/__tests__/stores.test.ts`

This is the largest single-file change. Read the full file first to understand the current state.

- [ ] **Step 1: Remove `switchTechnique` action (lines ~347-369)**

Delete the entire action from the store interface and implementation.

- [ ] **Step 2: Remove `learnTechniqueFromCodex` action (lines ~371-386)**

Delete the entire action.

- [ ] **Step 3: Remove `learnTechnique` action (lines ~388-401)**

Delete the entire action (backpack-based technique scroll learning).

- [ ] **Step 4: Simplify `unlockCodexAndLearn` (lines ~415-434)**

Remove the `setCurrentTechnique` and `setTechniqueComprehension(0)` logic. This function should only add to `techniqueCodex` and `learnedTechniques`:

```typescript
unlockCodexAndLearn: (techniqueId, characterId) => {
  set((s) => {
    const newCodex = s.sect.techniqueCodex.includes(techniqueId)
      ? s.sect.techniqueCodex
      : [...s.sect.techniqueCodex, techniqueId]
    const newCharacters = s.sect.characters.map((c) => {
      if (c.id !== characterId) return c
      if (c.learnedTechniques.includes(techniqueId)) return c
      return { ...c, learnedTechniques: [...c.learnedTechniques, techniqueId] }
    })
    return { sect: { ...s.sect, characters: newCharacters, techniqueCodex: newCodex } }
  })
},
```

- [ ] **Step 5: Update `groupTransmission` — delete it**

Remove the `groupTransmission` action entirely (around line 1211-1228).

- [ ] **Step 6: Update `tickAll` — remove comprehension tick and comprehensionSpeedMult**

In the main `tickAll` loop:
1. Remove `const compMult = getComprehensionSpeedMult(sect.buildings)` and `const trainingMult = getTrainingSpeedMult(sect.buildings)`
2. Remove the comprehension tick block that calls `tickAllComprehension` and updates `techniqueComprehension`
3. Update `calcCultivationRate(char, tech)` calls to `calcCultivationRate(char, char.learnedTechniques)`
4. Update the `techniqueMultiplier` calculation to use `char.learnedTechniques` instead of `char.currentTechnique`
5. Remove the comprehension check that auto-adds technique to `learnedTechniques` at 100%
6. In the breakthrough section, update `performBreakthrough` call to not pass technique (or pass `learnedTechniques` if the signature requires it)
7. Remove `trainingMult` from the cultivation rate calculation

- [ ] **Step 7: Update `studyTechnique` — keep codex unlock, remove learning logic**

The study function should only add to `techniqueCodex`, not to individual characters' `learnedTechniques`.

- [ ] **Step 8: Remove unused imports**

Remove imports for `getComprehensionSpeedMult`, `getTrainingSpeedMult`, `tickAllComprehension`, `tryComprehendOnBreakthrough` (keep this one if still used), etc.

- [ ] **Step 9: Run tests**

Run: `npx vitest run src/__tests__/stores.test.ts --reporter=verbose`

- [ ] **Step 10: Update stores tests**

Remove tests for `switchTechnique`, `learnTechniqueFromCodex`, `learnTechnique`, `groupTransmission`. Update comprehension tick tests (delete them). Update breakthrough tests to not use technique/comprehension.

- [ ] **Step 11: Commit**

```bash
git add src/stores/sectStore.ts src/__tests__/stores.test.ts
git commit -m "refactor(store): remove old technique actions, comprehension tick, trainingHall"
```

---

### Task 10: Update adventureStore calls

**Files:**
- Modify: `src/stores/adventureStore.ts`

- [ ] **Step 1: Update `createCharacterCombatUnit` calls in adventureStore**

In `startRun` (around line 249-252):
```typescript
// Before:
const technique = character.currentTechnique ? getTechniqueById(character.currentTechnique) ?? null : null
const unit = createCharacterCombatUnit(character, technique)

// After:
const unit = createCharacterCombatUnit(character, character.learnedTechniques)
```

In `buildAliveTeamUnits` (around line 173-177):
```typescript
// Before:
const technique = character.currentTechnique ? getTechniqueById(character.currentTechnique) ?? null : null
const unit = createCharacterCombatUnit(character, technique)
unit.hp = memberState.currentHp

// After:
const unit = createCharacterCombatUnit(character, character.learnedTechniques)
unit.hp = memberState.currentHp
```

- [ ] **Step 2: Remove unused `getTechniqueById` import if no longer needed**

Check if `getTechniqueById` is still used elsewhere in this file. If only used for the above removed code, remove the import.

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/__tests__/stores.test.ts --reporter=verbose`

- [ ] **Step 4: Commit**

```bash
git add src/stores/adventureStore.ts
git commit -m "refactor(adventure): use multi-technique for combat units"
```

---

### Task 11: Update UI — CharacterCard

**Files:**
- Modify: `src/components/common/CharacterCard.tsx`
- Modify: `src/components/common/CharacterCard.module.css`

- [ ] **Step 1: Update CharacterCard to show technique tag list**

Replace the single technique name display with a list of technique tags colored by tier:

```typescript
import { getTechniqueById } from '../../data/techniquesTable'
import { TECHNIQUE_TIER_NAMES, type TechniqueTier } from '../../types/technique'

const TECHNIQUE_TIER_CLASS: Record<TechniqueTier, string> = {
  mortal: styles.techMortal,
  spirit: styles.techSpirit,
  immortal: styles.techImmortal,
  divine: styles.techDivine,
  chaos: styles.techChaos,
}

// In the component, replace the technique line:
{character.learnedTechniques.length > 0 && (
  <div className={styles.techniques}>
    {character.learnedTechniques.map((techId) => {
      const tech = getTechniqueById(techId)
      if (!tech) return null
      return (
        <span key={techId} className={`${styles.techTag} ${TECHNIQUE_TIER_CLASS[tech.tier]}`}>
          {tech.name}
        </span>
      )
    })}
  </div>
)}
```

- [ ] **Step 2: Update `calcCultivationRate` call**

```typescript
// Before:
calcCultivationRate(character, technique ?? null)
// After:
calcCultivationRate(character, character.learnedTechniques)
```

- [ ] **Step 3: Add CSS for technique tags**

Add to `CharacterCard.module.css`:

```css
.techniques {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: var(--space-xs);
}

.techTag {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: var(--radius-xs);
  font-weight: 500;
}

.techMortal {
  background: rgba(158, 158, 158, 0.12);
  color: var(--color-text-tertiary);
}

.techSpirit {
  background: rgba(66, 165, 245, 0.1);
  color: #1565c0;
}

.techImmortal {
  background: rgba(171, 71, 188, 0.1);
  color: #7b1fa2;
}

.techDivine {
  background: rgba(255, 193, 7, 0.12);
  color: #f57f17;
}

.techChaos {
  background: rgba(244, 67, 54, 0.1);
  color: #c62828;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/common/CharacterCard.tsx src/components/common/CharacterCard.module.css
git commit -m "feat(ui): show learned technique tag list on character cards"
```

---

### Task 12: Update UI — CharactersPage

**Files:**
- Modify: `src/pages/CharactersPage.tsx`

- [ ] **Step 1: Remove imports for deleted functions**

Remove: `canLearnTechnique`, `getComprehensionEffect` from TechniqueSystem. Remove `QUALITY_NAMES` from items (no longer showing technique scrolls).

- [ ] **Step 2: Remove `switchTechnique`, `learnTechnique`, `learnTechniqueFromCodex` from store selectors**

Remove these lines from `CharacterDetail`:
```typescript
const learnTechnique = useSectStore((s) => s.learnTechnique)
const learnTechniqueFromCodex = useSectStore((s) => s.learnTechniqueFromCodex)
const switchTechnique = useSectStore((s) => s.switchTechnique)
```

- [ ] **Step 3: Simplify the Technique section**

Replace the entire technique section with a simple learned techniques list:

```typescript
{/* Technique */}
<section className={styles.section}>
  <div className={styles.sectionTitle}>功法</div>
  {character.learnedTechniques.length > 0 ? (
    <div className={styles.techniqueList}>
      {character.learnedTechniques.map((techId) => {
        const tech = getTechniqueById(techId)
        if (!tech) return null
        return (
          <div key={techId} className={styles.techniqueItem}>
            <span className={styles.techniqueItemName}>{tech.name}</span>
            <span className={styles.techniqueItemTier}>{TECHNIQUE_TIER_NAMES[tech.tier]}</span>
            <div className={styles.techniqueItemBonuses}>
              {tech.bonuses.map((b, i) => (
                <span key={i} className={styles.techniqueBonusText}>
                  {formatBonusValue(b.type, b.value)}
                </span>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  ) : (
    <div className={styles.noTechnique}>未领悟功法</div>
  )}
</section>
```

Remove: comprehension progress bar, comprehension effect display, growth modifier display, fixed bonus thresholds, technique switch dropdown, learn from codex dropdown, learn from backpack dropdown.

- [ ] **Step 4: Update `calcCultivationRate` call**

```typescript
// Before:
const cultivationSpeed = calcCultivationRate(character, technique ?? null)
// After:
const cultivationSpeed = calcCultivationRate(character, character.learnedTechniques)
```

- [ ] **Step 5: Remove unused state variables**

Remove `showTechniqueSwitch`, `showLearnTechnique` state variables.

- [ ] **Step 6: Commit**

```bash
git add src/pages/CharactersPage.tsx
git commit -m "feat(ui): simplify technique display to learned list with bonuses"
```

---

### Task 13: Update UI — BuildingsPage and remove TransmissionPanel

**Files:**
- Modify: `src/pages/BuildingsPage.tsx`
- Delete: `src/components/building/TransmissionPanel.tsx`
- Modify: `src/components/building/CodexPanel.tsx`

- [ ] **Step 1: Remove trainingHall tab from BuildingsPage**

In `BuildingsPage.tsx`, remove:
- The import of `TransmissionPanel`
- The `trainingHall` tab condition and rendering block
- The `'transmission'` entry from the `TabKey` type

- [ ] **Step 2: Delete `TransmissionPanel.tsx`**

Delete the entire file: `src/components/building/TransmissionPanel.tsx`

- [ ] **Step 3: Update CodexPanel to show `bonuses`**

In `CodexPanel.tsx`, update any reference to `growthModifiers` or `fixedBonuses` to use `bonuses` instead. The display should list all bonuses as flat values.

- [ ] **Step 4: Commit**

```bash
git add src/pages/BuildingsPage.tsx src/components/building/CodexPanel.tsx
git rm src/components/building/TransmissionPanel.tsx
git commit -m "feat(ui): remove trainingHall tab, update codex to show flat bonuses"
```

---

### Task 14: Save system v4 migration

**Files:**
- Modify: `src/systems/save/SaveSystem.ts`
- Test: `src/__tests__/db.test.ts` (if it tests save/load)

- [ ] **Step 1: Update `SaveMeta.version` to 4**

Change `version: 3` to `version: 4` in both the interface and all `SaveMeta` construction sites.

- [ ] **Step 2: Update `loadGame` version check**

Change `meta.version < 3` to `meta.version < 4` on the early-return branch.

- [ ] **Step 3: Add v3→v4 migration to the character migration block**

In the `loadGame` character migration, add:

```typescript
const migratedCharacters = (saveRecord.sect.characters ?? []).map(
  (char: Character) => {
    let c = {
      ...char,
      talents: char.talents ?? [],
      // Existing migration: default technique
      ...(char.currentTechnique == null ? {
        currentTechnique: 'qingxin',
        learnedTechniques: char.learnedTechniques?.includes('qingxin')
          ? char.learnedTechniques
          : [...(char.learnedTechniques ?? []), 'qingxin'],
      } : {}),
    }
    // v3→v4: ensure currentTechnique value is in learnedTechniques
    if (c.currentTechnique && !c.learnedTechniques.includes(c.currentTechnique)) {
      c.learnedTechniques = [...c.learnedTechniques, c.currentTechnique]
    }
    // v3→v4: remove currentTechnique and techniqueComprehension from the object
    // (they're simply ignored since the type no longer has them)
    return c
  },
)
```

- [ ] **Step 4: Add building migration — remove trainingHall**

```typescript
const migratedBuildings = (migratedSect.buildings ?? []).filter(
  (b: { type: string }) => b.type !== 'trainingHall'
)
const migratedSect = { ...migratedSect, buildings: migratedBuildings }
```

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run --reporter=verbose 2>&1 | tail -30`
Expected: All tests pass.

- [ ] **Step 6: Run type check**

Run: `npx tsc --noEmit 2>&1`
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/systems/save/SaveSystem.ts
git commit -m "feat(save): v4 migration — remove trainingHall, migrate technique fields"
```

---

### Task 15: Final verification and cleanup

**Files:** Various — cleanup pass

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run --reporter=verbose`
Expected: All tests pass, no failures.

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Search for stale references**

Run: `grep -r "currentTechnique\|techniqueComprehension\|growthModifiers\|fixedBonuses\|comprehensionDifficulty\|getComprehensionEffect\|applyTechniqueGrowth\|tickComprehension\|tickAllComprehension\|groupTransmission\|trainingHall\|getTrainingSpeedMult\|getTrainingBuff\|getComprehensionSpeedMult\|getScriptureBuff\|comprehensionMult" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".test."`

Expected: No remaining references in non-test source files (tests referencing old APIs should already be updated).

- [ ] **Step 4: Run build**

Run: `npx vite build 2>&1 | tail -10`
Expected: Build succeeds with no errors.

- [ ] **Step 5: Final commit if any cleanup needed**

```bash
git add -A
git commit -m "chore: final cleanup for technique system simplification"
```
