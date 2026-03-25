# 宗门核心重构 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将游戏从单修士模式全面重写为宗门经营模式——宗门为核心实体，每个弟子拥有独立修炼/装备/功法/冒险能力。

**Architecture:** 废弃 Player + Disciple 双轨制，统一为 Character。废弃 7 个 Store，合并为 3 个（SectStore/AdventureStore/GameStore）。新增 TechniqueSystem、CharacterEngine、SectEngine。全面重写所有 UI 页面。

**Tech Stack:** React 19, TypeScript 5.9, Vite 8, Zustand 5, Vitest 4

**Spec:** `docs/superpowers/specs/2026-03-24-endlessquest-sect-redesign.md`

---

## Phase 1: Types & Data Foundation

### Task 1: Core Type Definitions

**Files:**
- Rewrite: `src/types/player.ts` → delete (merged into `src/types/character.ts`)
- Rewrite: `src/types/sect.ts` → delete (merged into `src/types/sect.ts`)
- Create: `src/types/character.ts`
- Create: `src/types/technique.ts`
- Rewrite: `src/types/skill.ts` (add `neutral` to Element)
- Rewrite: `src/types/item.ts` (add TechniqueScroll)
- Rewrite: `src/types/adventure.ts` (DungeonRun new shape)
- Rewrite: `src/types/index.ts` (re-exports)
- Test: `src/__tests__/types.test.ts`

- [ ] **Step 1: Write type test file**

```typescript
// src/__tests__/types.test.ts
import type { Character, CharacterTitle, CharacterQuality, CharacterStatus } from '../types/character'
import type { Technique, TechniqueTier, TechniqueBonus } from '../types/technique'
import type { Sect } from '../types/sect'
import type { AnyItem } from '../types/item'
import type { Element } from '../types/skill'
import type { DungeonRun, MemberState } from '../types/adventure'
import { QUALITY_ORDER, TECHNIQUE_TIER_NAMES } from '../types'

describe('Character types', () => {
  it('should accept valid character construction', () => {
    const c: Character = {
      id: 'c1', name: '测试', title: 'disciple', quality: 'common',
      realm: 0, realmStage: 0, cultivation: 0,
      baseStats: { hp: 100, atk: 15, def: 8, spd: 10, crit: 0.05, critDmg: 1.5 },
      cultivationStats: { spiritPower: 50, maxSpiritPower: 50, comprehension: 10, spiritualRoot: 10, fortune: 5 },
      currentTechnique: null, techniqueComprehension: 0, learnedTechniques: [],
      equippedGear: Array(9).fill(null), equippedSkills: Array(5).fill(null),
      backpack: [], maxBackpackSlots: 20, petIds: [],
      status: 'cultivating', injuryTimer: 0, createdAt: Date.now(), totalCultivation: 0,
    }
    expect(c.baseStats.hp).toBe(100)
  })
})

describe('Technique types', () => {
  it('should accept valid technique construction', () => {
    const t: Technique = {
      id: 'qingxin', name: '清心诀', description: '入门功法',
      tier: 'mortal', element: 'neutral',
      growthModifiers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, crit: 1.0, critDmg: 1.0 },
      fixedBonuses: [],
      requirements: { minRealm: 0, minComprehension: 5 },
      comprehensionDifficulty: 1,
    }
    expect(t.tier).toBe('mortal')
  })
})

describe('Element type includes neutral', () => {
  it('should accept neutral element', () => {
    const elements: Element[] = ['fire', 'ice', 'lightning', 'healing', 'neutral']
    expect(elements).toHaveLength(5)
  })
})

describe('TechniqueScroll item type', () => {
  it('should be included in AnyItem union', () => {
    const scroll: AnyItem = {
      id: 'ts1', name: '清心诀残卷', quality: 'common', type: 'techniqueScroll',
      description: '清心诀的功法残卷', sellPrice: 10, techniqueId: 'qingxin',
    }
    expect(scroll.type).toBe('techniqueScroll')
  })
})

describe('Sect type', () => {
  it('should construct with all fields', () => {
    const s: Sect = {
      name: '测试宗门', level: 1,
      resources: { spiritStone: 500, spiritEnergy: 0, herb: 0, ore: 0, fairyJade: 0, scrollFragment: 0, heavenlyTreasure: 0, beastSoul: 0 },
      buildings: [], characters: [], vault: [], maxVaultSlots: 50,
      pets: [], totalAdventureRuns: 0, totalBreakthroughs: 0,
    }
    expect(s.level).toBe(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/types.test.ts`
Expected: FAIL (imports don't resolve yet)

- [ ] **Step 3: Create `src/types/character.ts`**

Define: `Character`, `CharacterTitle`, `CharacterQuality`, `CharacterStatus`, `RealmStage`, `BaseStats`, `CultivationStats` (moved from player.ts). Follow the spec exactly.

- [ ] **Step 4: Create `src/types/technique.ts`**

Define: `Technique`, `TechniqueTier`, `TechniqueBonus`, `TECHNIQUE_TIER_NAMES` map, `TECHNIQUE_TIER_ORDER` array.

- [ ] **Step 5: Rewrite `src/types/skill.ts`**

Add `'neutral'` to `Element` union type. Update `COUNTER_MAP` to handle neutral (all multipliers = 1.0). Update `ELEMENT_NAMES`.

- [ ] **Step 6: Rewrite `src/types/item.ts`**

Add `TechniqueScroll` interface. Update `AnyItem` union to include it. Keep all existing types.

- [ ] **Step 7: Rewrite `src/types/sect.ts`**

Remove old `Disciple`, `DiscipleQuality`, `SectState`. Define new `Sect` interface (from spec 2.5). Keep `Building`, `BuildingType`, `Resources`, `ResourceType`.

- [ ] **Step 8: Rewrite `src/types/adventure.ts`**

Replace old `DungeonRun` with new version (spec 3.3). Add `MemberState`, `LogEntry`. Keep `Dungeon`, `DungeonFloor` (renamed from DungeonLayer), `EventType`, `Enemy`, `RouteOption`, `DungeonEvent`.

- [ ] **Step 9: Rewrite `src/types/index.ts`**

Update barrel exports to export from new files. Remove old Player/Disciple exports. Add new Character/Technique/Sect exports. Export `TECHNIQUE_TIER_NAMES`, `TECHNIQUE_TIER_ORDER`.

- [ ] **Step 10: Delete `src/types/player.ts`** (merged into character.ts)

- [ ] **Step 11: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/types.test.ts`
Expected: PASS

- [ ] **Step 12: Run full build to check for type errors**

Run: `npx tsc --noEmit`
Fix any type errors in existing files that reference old types (they'll break — this is expected). The build will have errors from old files referencing deleted types. Note these for later tasks.

- [ ] **Step 13: Commit**

```
feat: rewrite type system for sect-centric model
```

---

### Task 2: Static Data Tables

**Files:**
- Rewrite: `src/data/techniques.ts` (new technique data model)
- Rewrite: `src/data/skills.ts` (neutral element support)
- Rewrite: `src/data/enemies.ts` (Character-based combat unit)
- Rewrite: `src/data/items.ts` (add technique scroll quality mapping)
- Create: `src/data/techniquesTable.ts` (technique data for growth path system)
- Rewrite: `src/data/buildings.ts` (spirit field scaling for large disciples)
- Keep: `src/data/realms.ts`, `src/data/events.ts`, `src/data/activeSkills.ts` (minor adjustments only)
- Test: `src/__tests__/data.test.ts`

- [ ] **Step 1: Write failing tests for new data tables**

Test that:
- All techniques have valid elements (including 'neutral')
- All techniques have growthModifiers with all 6 stats
- getTechniqueById returns correct technique
- neutral element has multiplier 1.0 against all elements
- Spirit field production formula matches spec: `level * 1 + (level - 1) * 3` per second

- [ ] **Step 2: Run test — verify fail**

- [ ] **Step 3: Create `src/data/techniquesTable.ts`** with all technique data from spec section 7

Include: 3 mortal + 3 spirit + 3 immortal + 2 divine + 1 chaos = 12 techniques. Export `ALL_TECHNIQUES` array and `getTechniqueById()`.

- [ ] **Step 4: Update `src/data/skills.ts`**

Add `neutral` to `COUNTER_MAP` (neutral vs any = 1.0). Update `ELEMENT_NAMES`.

- [ ] **Step 5: Update `src/data/enemies.ts`**

Update `createPlayerCombatUnit()` → rename to `createCharacterCombatUnit(character: Character, technique: Technique | null): CombatUnit`. Takes full Character data instead of hardcoded stats. Apply technique growthModifiers and fixedBonuses.

- [ ] **Step 6: Update `src/data/items.ts`**

Add technique scroll quality colors. Add `TECHNIQUE_SCROLL_NAMES` map.

- [ ] **Step 7: Update `src/data/buildings.ts`**

Update spiritField upgradeCost to support higher levels. Add `getSpiritFieldRate(level: number): number` function implementing formula: `level * 1 + Math.max(0, level - 1) * 3`.

- [ ] **Step 8: Delete old `src/data/techniques.ts`** (replaced by techniquesTable.ts)

- [ ] **Step 9: Run tests, commit**

```
feat: rewrite data tables for sect-centric model
```

---

## Phase 2: System Engines

### Task 3: CharacterEngine (New)

**Files:**
- Create: `src/systems/character/CharacterEngine.ts`
- Create: `src/__tests__/CharacterEngine.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
describe('CharacterEngine', () => {
  describe('generateCharacter', () => {
    it('should generate common character with correct base stats')
    it('should generate spirit character with higher spiritualRoot')
    it('should generate divine character with max stats')
    it('should assign unique IDs')
  })
  describe('getQualityStats', () => {
    it('should return correct initial stats for each quality')
  })
  describe('calcCharacterTotalStats', () => {
    it('should sum base + equipment + technique bonuses')
    it('should apply technique growth modifiers to base stats')
    it('should apply technique fixed bonuses based on comprehension')
  })
  describe('getMaxCharacters', () => {
    it('should return 5 for sect level 1')
    it('should return 30 for sect level 5')
  })
  describe('getMaxSimultaneousRuns', () => {
    it('should return 1 for sect level 1-2')
    it('should return 2 for sect level 3-4')
    it('should return 3 for sect level 5')
  })
})
```

- [ ] **Step 2: Run test — verify fail**

- [ ] **Step 3: Implement CharacterEngine**

Key functions:
- `generateCharacter(quality, namePrefix?) → Character` — random Chinese name, quality-based stats
- `QUALITY_STATS` — stat table from spec
- `calcCharacterTotalStats(character, technique, equipmentById) → BaseStats` — total effective stats
- `getMaxCharacters(sectLevel) → number` — from sect level table
- `getMaxSimultaneousRuns(sectLevel) → number` — 1/2/3 based on level
- `SECT_LEVEL_TABLE` — sect level config array

- [ ] **Step 4: Run tests, commit**

```
feat: add CharacterEngine for disciple generation and stats
```

---

### Task 4: TechniqueSystem (New)

**Files:**
- Create: `src/systems/technique/TechniqueSystem.ts`
- Create: `src/__tests__/TechniqueSystem.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
describe('TechniqueSystem', () => {
  describe('tickComprehension', () => {
    it('should increase comprehension for mortal technique')
    it('should increase slower for spirit technique')
    it('should increase much slower for divine technique')
    it('should not exceed 100%')
    it('should not go below 0%')
    it('should apply comprehension stat bonus')
    it('should have failure chance for difficulty >= 3')
  })
  describe('getComprehensionEffect', () => {
    it('should return 30% modifier at 0-30% comprehension')
    it('should return 70% modifier at 30-70%')
    it('should return 100% modifier at 70-100%')
  })
  describe('getActiveBonuses', () => {
    it('should return no bonuses below 30% comprehension')
    it('should return first bonus at 30%+')
    it('should return all unlocked bonuses')
  })
  describe('canLearnTechnique', () => {
    it('should check realm requirement')
    it('should check comprehension stat requirement')
    it('should return true when all requirements met')
  })
  describe('calcOfflineComprehension', () => {
    it('should use expected value (no random)')
    it('should be deterministic for same inputs')
  })
})
```

- [ ] **Step 2: Run test — verify fail**

- [ ] **Step 3: Implement TechniqueSystem**

Key functions:
- `tickComprehension(character, technique, deltaSec) → { gained, failed }` — with random failure
- `tickAllComprehension(characters, techniqueGetter, deltaSec) → Map<string, result>` — batch for all cultivating disciples
- `getComprehensionEffect(comprehension) → number` — 0.3/0.7/1.0 tier
- `getActiveBonuses(technique, comprehension) → TechniqueBonus[]` — filtered by threshold
- `canLearnTechnique(character, technique) → boolean`
- `calcOfflineComprehension(character, technique, seconds) → number` — deterministic expected value

- [ ] **Step 4: Run tests, commit**

```
feat: add TechniqueSystem for comprehension and growth paths
```

---

### Task 5: CultivationEngine (Rewrite)

**Files:**
- Rewrite: `src/systems/cultivation/CultivationEngine.ts`
- Rewrite: `src/__tests__/CultivationEngine.test.ts`

- [ ] **Step 1: Write failing tests**

Test that:
- `calcCultivationRate(character, technique)` returns rate based on spiritualRoot + realm multiplier + technique comprehension bonus
- `tick(character, spiritEnergyAvailable, deltaSec, technique)` returns cultivation gained and spirit spent
- Cultivation paused when no spirit energy
- `canBreakthrough(character)` checks cultivation >= needed AND realmStage constraint
- `breakthrough(character, technique)` applies growth modifiers from technique × comprehension effect
- Major realm breakthrough gives ×1.8 stats
- Sub-stage breakthrough gives ~15% of major growth
- RealmStage capped at REALMS[realm].stages.length - 1

- [ ] **Step 2: Run test — verify fail**

- [ ] **Step 3: Rewrite CultivationEngine**

Accept `Character` instead of `Player`. Accept optional `Technique` for growth modifier calculation. Add `applyTechniqueGrowthModifiers(baseGrowth, technique, comprehension) → BaseStats`.

- [ ] **Step 4: Run tests, commit**

```
feat: rewrite CultivationEngine for Character-based model
```

---

### Task 6: ResourceEngine & SectEngine (Rewrite)

**Files:**
- Rewrite: `src/systems/economy/ResourceEngine.ts`
- Create: `src/systems/sect/SectEngine.ts`
- Rewrite: `src/__tests__/ResourceEngine.test.ts`
- Create: `src/__tests__/SectEngine.test.ts`

- [ ] **Step 1: Write failing tests**

ResourceEngine tests:
- `getSpiritFieldRate(level)` returns correct formula: `level * 1 + max(0, level-1) * 3`
- `calcResourceRates(buildingLevels)` includes spirit field scaling
- Rates for other resources unchanged

SectEngine tests:
- `calcSectLevel(mainHallLevel)` returns 1-5 based on table
- `getMaxCharacters(sectLevel)` returns correct limits
- `getMaxSimultaneousRuns(sectLevel)` returns correct limits
- `canRecruitCharacter(sectLevel, currentCount)` checks limits

- [ ] **Step 2: Run tests — verify fail**

- [ ] **Step 3: Rewrite ResourceEngine** with new spirit field formula

- [ ] **Step 4: Create SectEngine** with sect level calculation and limits

- [ ] **Step 5: Run tests, commit**

```
feat: rewrite ResourceEngine and add SectEngine
```

---

### Task 7: CombatEngine & EventSystem (Adapt)

**Files:**
- Keep: `src/systems/combat/CombatEngine.ts` (minor adaptation)
- Rewrite: `src/systems/roguelike/EventSystem.ts` (multi-unit support)
- Rewrite: `src/systems/roguelike/MapGenerator.ts` (minor terminology fix)
- Keep: `src/__tests__/CombatEngine.test.ts` (update references)
- Rewrite: `src/__tests__/RoguelikeEngine.test.ts`

- [ ] **Step 1: Write failing tests**

EventSystem tests:
- `resolveEvent()` accepts team of up to 5 CombatUnits
- Combat events work with multiple allies
- Rewards return Resources + item array (not stored internally)
- Dead allies skipped in subsequent floors

- [ ] **Step 2: Run test — verify fail**

- [ ] **Step 3: Adapt EventSystem** to accept `CombatUnit[]` team, return rewards instead of mutating store

- [ ] **Step 4: Update MapGenerator** — rename DungeonLayer → DungeonFloor if needed

- [ ] **Step 5: Update CombatEngine test** to use new type imports

- [ ] **Step 6: Run tests, commit**

```
feat: adapt combat and roguelike systems for multi-unit teams
```

---

### Task 8: EquipmentEngine & ItemGenerator (Adapt)

**Files:**
- Keep: `src/systems/equipment/EquipmentEngine.ts` (unchanged)
- Rewrite: `src/systems/item/ItemGenerator.ts` (add technique scroll generation)
- Keep: `src/__tests__/EquipmentEngine.test.ts`
- Rewrite: `src/__tests__/ItemGenerator.test.ts`

- [ ] **Step 1: Write failing tests**

ItemGenerator tests:
- `generateTechniqueScroll(tier)` creates valid TechniqueScroll item
- `generateRandomTechniqueScroll(maxTier)` respects tier limit

- [ ] **Step 2: Run test — verify fail**

- [ ] **Step 3: Add `generateTechniqueScroll()` and `generateRandomTechniqueScroll()` to ItemGenerator**

- [ ] **Step 4: Run tests, commit**

```
feat: add technique scroll generation to ItemGenerator
```

---

### Task 9: PetSystem & BuildingSystem (Adapt)

**Files:**
- Keep: `src/systems/pet/PetSystem.ts` (unchanged logic)
- Keep: `src/systems/sect/BuildingSystem.ts` (unchanged logic)
- Delete: `src/systems/disciple/DiscipleEngine.ts` (merged into CharacterEngine)
- Keep: `src/__tests__/PetSystem.test.ts` (update imports)
- Keep: `src/__tests__/BuildingSystem.test.ts` (update imports)
- Delete: `src/__tests__/DiscipleEngine.test.ts`

- [ ] **Step 1: Update imports in PetSystem and BuildingSystem** to use new types

- [ ] **Step 2: Update test imports**

- [ ] **Step 3: Delete old DiscipleEngine and its tests**

- [ ] **Step 4: Run all system tests, commit**

```
refactor: adapt PetSystem/BuildingSystem, remove DiscipleEngine
```

---

## Phase 3: Stores

### Task 10: GameStore (Rewrite)

**Files:**
- Rewrite: `src/stores/gameStore.ts`

- [ ] **Step 1: Rewrite GameStore** with simple session state (saveSlot, lastOnlineTime, isPaused, startGame/stopGame/pauseGame/resumeGame/reset)

- [ ] **Step 2: Commit**

```
refactor: rewrite GameStore for new architecture
```

---

### Task 11: SectStore (Core — Most Complex Task)

**Files:**
- Rewrite: `src/stores/sectStore.ts`
- Rewrite: `src/__tests__/stores.test.ts`

This is the largest task. The SectStore replaces playerStore + inventoryStore + oldSectStore + petStore.

- [ ] **Step 1: Write failing tests**

```typescript
describe('SectStore', () => {
  beforeEach(() => useSectStore.getState().reset())

  describe('initialization', () => {
    it('should start with level 1 sect, 1 common character, 500 spirit stones')
    it('should have empty vault')
    it('should have mainHall level 1 unlocked')
  })

  describe('character management', () => {
    it('addCharacter should create new disciple')
    it('addCharacter should reject when at max capacity')
    it('promoteCharacter should change title')
    it('setCharacterStatus should update status')
    it('removeCharacter should work')
  })

  describe('technique management', () => {
    it('learnTechnique should consume scroll from backpack and set technique')
    it('learnTechnique should reject if requirements not met')
    it('switchTechnique should reset comprehension to 0')
    it('switchTechnique should reject if technique not in learnedTechniques')
  })

  describe('item transfer', () => {
    it('transferItemToCharacter should move from vault to character backpack')
    it('transferItemToVault should move from character backpack to vault')
    it('should reject when vault is full')
    it('should reject when character backpack is full')
  })

  describe('resource management', () => {
    it('addResource should add to sect resources')
    it('spendResource should deduct and return true')
    it('spendResource should return false when insufficient')
  })

  describe('building management', () => {
    it('tryUpgradeBuilding should upgrade valid building')
    it('tryUpgradeBuilding should fail with reason when insufficient stones')
  })

  describe('tickAll', () => {
    it('should produce spirit energy from buildings')
    it('should consume spirit energy for cultivating disciples')
    it('should accumulate cultivation for each cultivating disciple')
    it('should scale down when spirit energy insufficient for all')
    it('should not cultivate adventuring/resting disciples')
    it('should tick technique comprehension')
    it('should heal resting characters (1 HP/s)')
  })

  describe('breakthrough', () => {
    it('attemptBreakthrough should succeed when enough cultivation')
    it('should apply technique growth modifiers')
    it('should reset cultivation to 0 after breakthrough')
  })

  describe('healing', () => {
    it('healCharacter should consume 10 herbs and set status to cultivating')
    it('healCharacter should reject when no herbs')
  })
})
```

- [ ] **Step 2: Run test — verify fail**

- [ ] **Step 3: Implement SectStore**

Key implementation notes:
- Resources exist ONLY here. No other store holds resources.
- `tickAll(deltaSec)` is the main game loop entry point:
  1. ResourceEngine.calcResourceRates → spirit production
  2. Count cultivating disciples → spirit consumption (2/s each)
  3. If spirit insufficient → proportional scaling
  4. For each cultivating character:
     - CultivationEngine.tick(cultivation gained)
     - TechniqueSystem.tickComprehension
  5. For each resting character: heal 1 HP/s
- `learnTechnique(charId, backpackIndex)`: find TechniqueScroll in backpack, check requirements via TechniqueSystem.canLearnTechnique, consume item, set currentTechnique
- `switchTechnique(charId, techniqueId)`: only allow switching to techniqueId in learnedTechniques, reset comprehension to 0
- Initial state: 1 common character, mainHall level 1, 500 spirit stones

- [ ] **Step 4: Run tests, commit**

```
feat: implement SectStore — core game state management
```

---

### Task 12: AdventureStore (Rewrite)

**Files:**
- Rewrite: `src/stores/adventureStore.ts`

- [ ] **Step 1: Write failing tests**

```typescript
describe('AdventureStore', () => {
  beforeEach(() => {
    useSectStore.getState().reset()
    useAdventureStore.getState().reset()
  })

  describe('startRun', () => {
    it('should create dungeon run with team member HP states')
    it('should set character status to adventuring')
    it('should reject if character already adventuring')
    it('should reject if exceeds max simultaneous runs')
    it('should reject if more than 5 characters')
  })

  describe('advanceFloor', () => {
    it('should resolve current floor event')
    it('should update member HP states after combat')
    it('should deposit rewards to sectStore on completion')
  })

  describe('retreat', () => {
    it('should deposit 50% rewards and free characters')
    it('should set wounded characters to resting')
  })

  describe('completeRun / failRun', () => {
    it('completeRun should deposit all rewards and free characters')
    it('failRun should deposit 50% rewards and free characters')
    it('dead characters should be set to resting (wounded)')
  })

  describe('idleTick', () => {
    it('should auto-advance floors in idle mode')
  })
})
```

- [ ] **Step 2: Run test — verify fail**

- [ ] **Step 3: Implement AdventureStore**

Key implementation notes:
- `activeRuns: Record<string, DungeonRun>` — NOT Map (JSON serialization)
- `startRun()`: call `useSectStore.getState()` to read characters, validate states, build CombatUnits, set status to 'adventuring', create run
- `completeRun()/failRun()`: call `useSectStore.getState().addResource()` and `addToVault()` for rewards. Update character statuses (alive→cultivating, wounded→resting). Remove run from activeRuns.
- `getMaxSimultaneousRuns()`: delegates to `SectEngine.getMaxSimultaneousRuns(sectLevel)`
- Combat resolution: `EventSystem.resolveEvent()` with team CombatUnits, read results, update memberStates

- [ ] **Step 4: Run tests, commit**

```
feat: implement AdventureStore with multi-line support
```

---

## Phase 4: App Shell & Common Components

### Task 13: App.tsx & Idle Loop

**Files:**
- Rewrite: `src/App.tsx`
- Rewrite: `src/systems/idle/IdleEngine.ts`
- Rewrite: `src/__tests__/IdleEngine.test.ts`

- [ ] **Step 1: Rewrite IdleEngine** for new tick structure

The idle tick now calls:
1. `useSectStore.getState().tickAll(deltaSec)` — handles resources + cultivation + comprehension + healing
2. `useAdventureStore.getState().tickAllIdle(deltaSec)` — handles active dungeon runs
3. No separate inventory tick or player tick

- [ ] **Step 2: Rewrite App.tsx**

- Routes: `/` → SectPage, `/characters` → CharactersPage, `/buildings` → BuildingsPage, `/adventure` → AdventurePage, `/vault` → VaultPage
- useEffect: start IdleEngine on mount, stop on unmount
- Offline catch-up on mount: calcOfflineSeconds, call `sectStore.tickAll(offlineSeconds)` with deterministic comprehension
- Auto-save hook every 30s
- Remove all old store imports

- [ ] **Step 3: Run build, commit**

```
feat: rewrite App.tsx and IdleEngine for new architecture
```

---

### Task 14: Common Components

**Files:**
- Rewrite: `src/components/common/BottomNav.tsx` + CSS (5 tabs: 宗门/弟子/建筑/秘境/仓库)
- Rewrite: `src/components/common/TopBar.tsx` + CSS
- Keep: `src/components/common/ProgressBar.tsx` + CSS (unchanged)
- Rewrite: `src/components/common/ResourceRate.tsx` + CSS (show spirit production vs consumption)
- Create: `src/components/common/CharacterCard.tsx` + CSS (compact disciple card for list/grid)
- Create: `src/components/common/StatusBadge.tsx` + CSS (修炼中/冒险中/休息)

- [ ] **Step 1: Rewrite BottomNav** with new routes and Chinese labels

- [ ] **Step 2: Rewrite TopBar** to show sect name and level

- [ ] **Step 3: Rewrite ResourceRate** to show spirit energy production vs consumption

- [ ] **Step 4: Create CharacterCard** — compact card showing: name, quality badge, realm, technique name, status icon

- [ ] **Step 5: Create StatusBadge** — colored badge for cultivating/adventuring/resting

- [ ] **Step 6: Run build, commit**

```
feat: rewrite common components for sect-centric UI
```

---

## Phase 5: UI Pages — Part 1

### Task 15: Sect Page (Main Hall Replacement)

**Files:**
- Rewrite: `src/pages/MainHall.tsx` → rename to `src/pages/SectPage.tsx`
- Rewrite: `src/pages/MainHall.module.css` → `src/pages/SectPage.module.css`
- Create: `src/components/sect/SectOverview.tsx` + CSS

- [ ] **Step 1: Implement SectPage** showing:
- Sect name, level, member count
- Resource overview with production rates (灵气: +X/s, -Y/s消耗)
- Character stats: X修炼中, Y冒险中, Z休息
- Active adventures summary
- Quick links to buildings/characters/adventure

- [ ] **Step 2: Run dev server, visually verify, commit**

```
feat: implement SectPage (main hall replacement)
```

---

### Task 16: Characters Page

**Files:**
- Rewrite: `src/pages/Cultivation.tsx` → `src/pages/CharactersPage.tsx`
- Rewrite: CSS module
- Create: `src/components/character/CharacterDetail.tsx` + CSS (full detail view)
- Create: `src/components/character/CharacterList.tsx` + CSS (list/grid toggle)
- Rewrite: `src/components/character/PlayerInfo.tsx` → delete or repurpose
- Keep/Adapt: `src/components/cultivation/BreakthroughPanel.tsx` + CSS (now per-character)
- Create: `src/components/character/TechniquePanel.tsx` + CSS (comprehension bar, switch technique)
- Create: `src/components/character/EquipmentPanel.tsx` + CSS (reuse EquipPanel logic)
- Create: `src/components/character/BackpackPanel.tsx` + CSS (per-character backpack)

- [ ] **Step 1: Implement CharacterList** with list/grid toggle, status/quality filters

- [ ] **Step 2: Implement CharacterDetail** as a route or modal showing:
- Basic info + stats panel
- Cultivation progress bar + breakthrough button
- Technique panel (current technique, comprehension progress, learn/switch)
- Equipment management (9 slots)
- Skill management (5 slots)
- Personal backpack (with transfer to vault)

- [ ] **Step 3: Adapt BreakthroughPanel** to work with Character instead of Player

- [ ] **Step 4: Create TechniquePanel** showing:
- Current technique name, tier, comprehension bar (0-100%)
- Active bonuses unlocked
- "Learn technique" button (opens backpack scroll selector)
- "Switch technique" dropdown (from learnedTechniques)
- New technique button to learn from vault scrolls

- [ ] **Step 5: Implement CharactersPage** with list + detail navigation

- [ ] **Step 6: Run dev server, visually verify, commit**

```
feat: implement Characters page with detail view
```

---

### Task 17: Buildings Page

**Files:**
- Rewrite: `src/pages/Sect.tsx` → `src/pages/BuildingsPage.tsx`
- Rewrite: CSS module
- Create: `src/components/building/BuildingGrid.tsx` + CSS
- Create: `src/components/building/RecruitPanel.tsx` + CSS (recruit new disciple)
- Create: `src/components/building/VaultPanel.tsx` + CSS (sect vault management)
- Create: `src/components/building/ShopPanel.tsx` + CSS (merged from old trade system)

- [ ] **Step 1: Implement BuildingGrid** — list of buildings with upgrade button, level indicator

- [ ] **Step 2: Implement RecruitPanel** — recruit new disciple with quality selection, shows cost and current/max count

- [ ] **Step 3: Implement VaultPanel** — grid of vault items, sell button, transfer-to-character button

- [ ] **Step 4: Implement ShopPanel** — buy items (equipment, scrolls, consumables), purchased items go to vault

- [ ] **Step 5: Implement BuildingsPage** with tab navigation (建筑/招收/仓库/商店)

- [ ] **Step 6: Run dev server, visually verify, commit**

```
feat: implement Buildings page with vault and recruitment
```

---

## Phase 6: UI Pages — Part 2

### Task 18: Adventure Page

**Files:**
- Rewrite: `src/pages/Adventure.tsx`
- Rewrite: CSS module
- Create: `src/components/adventure/DungeonList.tsx` + CSS
- Create: `src/components/adventure/TeamBuilder.tsx` + CSS (select up to 5 characters)
- Create: `src/components/adventure/RunCard.tsx` + CSS (active run with progress)
- Create: `src/components/adventure/CombatLog.tsx` + CSS

- [ ] **Step 1: Implement DungeonList** — list of dungeons with unlock status and recommended realm

- [ ] **Step 2: Implement TeamBuilder** — select characters (max 5), show their stats, filter by status (only cultivating/resting available)

- [ ] **Step 3: Implement RunCard** — show active dungeon run: floor progress, team HP bars, event log, continue/retreat buttons

- [ ] **Step 4: Implement AdventurePage** with:
- Tab: 秘境列表 (dungeon selection + team builder)
- Tab: 进行中 (active run cards, multi-line support)
- Tab: 冒险记录 (completed/failed runs summary)

- [ ] **Step 5: Run dev server, visually verify, commit**

```
feat: implement Adventure page with multi-line support
```

---

### Task 19: Vault Page

**Files:**
- Rewrite: `src/pages/Inventory.tsx` → `src/pages/VaultPage.tsx`
- Rewrite: CSS module
- Keep/Adapt: `src/components/inventory/ItemCard.tsx` + CSS (unchanged)
- Keep/Adapt: `src/components/inventory/EnhancePanel.tsx` + CSS (adapt for character context)
- Keep/Adapt: `src/components/inventory/EquipPanel.tsx` + CSS (adapt for character context)

- [ ] **Step 1: Implement VaultPage** showing:
- Tab: 宗门仓库 — grid of all vault items, sell button, transfer-to-character selector
- Tab: 弟子背包 — dropdown to select disciple, shows their backpack with equip/transfer-to-vault

- [ ] **Step 2: Adapt EnhancePanel** to accept characterId context

- [ ] **Step 3: Run dev server, visually verify, commit**

```
feat: implement Vault page with sect vault and disciple backpacks
```

---

## Phase 7: Save System & Cleanup

### Task 20: SaveSystem v2

**Files:**
- Rewrite: `src/systems/save/SaveSystem.ts`
- Rewrite: `src/systems/save/useAutoSave.ts`
- Rewrite: `src/__tests__/SaveSystem.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
describe('SaveSystem v2', () => {
  it('should save and load sect store state')
  it('should save and load adventure store state')
  it('should save and load game store state')
  it('should detect v1 save and reset')
  it('should clear old data on v1→v2 migration')
  it('should not lose data on save/load cycle')
})
```

- [ ] **Step 2: Run test — verify fail**

- [ ] **Step 3: Rewrite SaveSystem**

```typescript
interface SaveData {
  version: 2
  timestamp: number
  sectStore: { sect: Sect }
  adventureStore: { activeRuns: Record<string, DungeonRun> }
  gameStore: { saveSlot: number; lastOnlineTime: number }
}
```

- `saveGame()`: serialize from 3 stores, write to localStorage
- `loadGame()`: read from localStorage, version check, if v1 → clearSaveData + return false, if v2 → restore to stores
- `clearSaveData()`: remove localStorage key
- `hasSaveData()`: check for v2 save

- [ ] **Step 4: Rewrite useAutoSave** hook — load on mount, auto-save every 30s from 3 stores

- [ ] **Step 5: Run tests, commit**

```
feat: implement SaveSystem v2 with sect-centric schema
```

---

### Task 21: Final Cleanup & Integration

**Files:**
- Delete: `src/stores/playerStore.ts` (replaced by SectStore)
- Delete: `src/stores/inventoryStore.ts` (replaced by SectStore)
- Delete: `src/stores/petStore.ts` (replaced by SectStore)
- Delete: `src/stores/tradeStore.ts` (merged into BuildingsPage)
- Delete: old page files that have been replaced
- Delete: old component files that have been replaced
- Rewrite: `src/__tests__/stores.test.ts` (final integration tests)

- [ ] **Step 1: Delete all old store files** (playerStore, inventoryStore, petStore, tradeStore)

- [ ] **Step 2: Delete old page/component files** that have been replaced by new versions

- [ ] **Step 3: Clean up any remaining imports** to old types/files

- [ ] **Step 4: Run full test suite**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 5: Run production build**

Run: `npm run build`
Expected: SUCCESS (0 errors)

- [ ] **Step 6: Commit**

```
chore: remove old stores and cleanup unused files
```

---

### Task 22: Full Integration Verification

**Files:** None (verification only)

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: SUCCESS

- [ ] **Step 3: Start dev server and manually verify**

Run: `npm run dev`
Verify:
- [ ] Sect page shows resources, building summary, character count
- [ ] Can recruit a new disciple
- [ ] Character list shows all disciples
- [ ] Character detail shows cultivation progress, technique, equipment
- [ ] Can learn technique from scroll in vault
- [ ] Can equip items from backpack
- [ ] Buildings can be upgraded
- [ ] Adventure page shows dungeons and team builder
- [ ] Can start dungeon run with team of characters
- [ ] Characters in adventure show as "adventuring" status
- [ ] Vault shows all items
- [ ] Items can transfer between vault and character backpack

- [ ] **Step 4: Final commit**

```
chore: complete sect-centric rewrite integration verification
```
