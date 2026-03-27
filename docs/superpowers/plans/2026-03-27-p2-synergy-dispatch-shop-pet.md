# P2: 建筑协同 + 任务派遣 + 探险商店与灵宠 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add passive building synergy bonuses, replace the simple patrol system with multi-mission dispatch, and implement adventure shop + pet capture during dungeon runs.

**Architecture:** Synergies are data-driven constants checked dynamically each tick. Dispatch replaces the existing patrol system in `adventureStore`. Shop and pet capture extend `EventSystem` with new resolution logic. All three features are independent of each other but depend on P0 (loot tables) and P1 (specialties).

**Tech Stack:** TypeScript, Vitest, Zustand

**Spec:** `docs/superpowers/specs/2026-03-27-gameplay-enrichment.md` (sections P2-1, P2-2, P2-3)

**Prerequisites:** P0 and P1 plans must be completed first.

---

### Task 1: 建筑协同数据与计算

**Files:**
- Modify: `src/data/buildings.ts`
- Create: `src/systems/economy/SynergySystem.ts`
- Test: `src/__tests__/SynergySystem.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/SynergySystem.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { getActiveSynergies, getSynergyBonus } from '../systems/economy/SynergySystem'
import type { Building } from '../types/sect'

function makeBuilding(type: string, level: number): Building {
  return { type: type as any, level, unlocked: true, productionQueue: { recipeId: null, progress: 0 } }
}

describe('getActiveSynergies', () => {
  it('returns empty when no conditions met', () => {
    const buildings = [
      makeBuilding('mainHall', 1),
      makeBuilding('spiritField', 2),
      makeBuilding('alchemyFurnace', 2),
    ]
    expect(getActiveSynergies(buildings)).toHaveLength(0)
  })

  it('activates 灵药之道 when conditions met', () => {
    const buildings = [
      makeBuilding('mainHall', 3),
      makeBuilding('spiritField', 3),
      makeBuilding('alchemyFurnace', 3),
    ]
    const active = getActiveSynergies(buildings)
    expect(active.some(s => s.id === 'alchemy_herbalism')).toBe(true)
  })

  it('activates 百炼成钢 when conditions met', () => {
    const buildings = [
      makeBuilding('mainHall', 3),
      makeBuilding('spiritMine', 3),
      makeBuilding('forge', 3),
    ]
    const active = getActiveSynergies(buildings)
    expect(active.some(s => s.id === 'forging_mining')).toBe(true)
  })

  it('activates multiple synergies', () => {
    const buildings = [
      makeBuilding('mainHall', 5),
      makeBuilding('spiritField', 5),
      makeBuilding('spiritMine', 5),
      makeBuilding('alchemyFurnace', 5),
      makeBuilding('forge', 5),
      makeBuilding('scriptureHall', 3),
      makeBuilding('recruitmentPavilion', 2),
      makeBuilding('market', 3),
    ]
    const active = getActiveSynergies(buildings)
    expect(active.length).toBeGreaterThanOrEqual(5)
  })
})

describe('getSynergyBonus', () => {
  it('returns multiplier for matching building', () => {
    const buildings = [
      makeBuilding('mainHall', 3),
      makeBuilding('spiritField', 3),
      makeBuilding('alchemyFurnace', 3),
    ]
    const bonus = getSynergyBonus('alchemyFurnace', buildings)
    expect(bonus).toBeCloseTo(1.20) // +20% from 灵药之道
  })

  it('returns 1.0 when no synergy for building', () => {
    const buildings = [
      makeBuilding('mainHall', 1),
      makeBuilding('spiritMine', 1),
    ]
    expect(getSynergyBonus('alchemyFurnace', buildings)).toBeCloseTo(1.0)
  })

  it('stacks multiple synergies for same building', () => {
    const buildings = [
      makeBuilding('mainHall', 5),
      makeBuilding('spiritField', 5),
      makeBuilding('alchemyFurnace', 5),
      makeBuilding('forge', 5),
    ]
    // 灵药之道 gives +20% to alchemyFurnace, 丹器双修 gives +25%
    const bonus = getSynergyBonus('alchemyFurnace', buildings)
    expect(bonus).toBeCloseTo(1.45) // +20% + +25%
  })

  it('丹器双修 also gives bonus to forge', () => {
    const buildings = [
      makeBuilding('mainHall', 5),
      makeBuilding('alchemyFurnace', 5),
      makeBuilding('forge', 5),
    ]
    const bonus = getSynergyBonus('forge', buildings)
    expect(bonus).toBeCloseTo(1.25) // +25% from 丹器双修
  })

  it('market synergy returns 1.0 multiplier (quality cap handled separately)', () => {
    const buildings = [
      makeBuilding('mainHall', 5),
      makeBuilding('spiritMine', 5),
      makeBuilding('market', 3),
    ]
    const bonus = getSynergyBonus('market', buildings)
    expect(bonus).toBeCloseTo(1.0) // 开源节流 is not a multiplier
  })

  it('getMarketQualityCapBonus returns 1 when conditions met', () => {
    const buildings = [
      makeBuilding('mainHall', 5),
      makeBuilding('spiritMine', 5),
      makeBuilding('market', 3),
    ]
    expect(getMarketQualityCapBonus(buildings)).toBe(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/SynergySystem.test.ts --pool=forks --testTimeout=30000`
Expected: FAIL — module not found

- [ ] **Step 3: Add synergy data to buildings.ts**

In `src/data/buildings.ts`, add at the end:

```typescript
import type { BuildingType } from '../types/sect'

export interface Synergy {
  id: string
  name: string
  description: string
  requirements: { building: BuildingType; level: number }[]
  effect: { target: BuildingType; value: number }  // value is a multiplier bonus (e.g., 0.20 = +20%)
}

export const SYNERGIES: Synergy[] = [
  {
    id: 'alchemy_herbalism',
    name: '灵药之道',
    description: '丹炉产出效率 +20%',
    requirements: [
      { building: 'spiritField', level: 3 },
      { building: 'alchemyFurnace', level: 3 },
    ],
    effect: { target: 'alchemyFurnace', value: 0.20 },
  },
  {
    id: 'forging_mining',
    name: '百炼成钢',
    description: '锻造成功率 +15%',
    requirements: [
      { building: 'spiritMine', level: 3 },
      { building: 'forge', level: 3 },
    ],
    effect: { target: 'forge', value: 0.15 },
  },
  {
    id: 'comprehension_recruit',
    name: '以武入道',
    description: '功法领悟概率 +15%',
    requirements: [
      { building: 'scriptureHall', level: 3 },
      { building: 'recruitmentPavilion', level: 2 },
    ],
    effect: { target: 'scriptureHall', value: 0.15 },
  },
  {
    id: 'market_mining',
    name: '开源节流',
    description: '坊市品质上限 +1',
    requirements: [
      { building: 'spiritMine', level: 5 },
      { building: 'market', level: 3 },
    ],
    effect: { target: 'market', value: 1 },  // Special: +1 quality cap, not multiplier
  },
  {
    id: 'alchemy_forging',
    name: '丹器双修',
    description: '丹炉和炼器坊效率各 +25%',
    requirements: [
      { building: 'alchemyFurnace', level: 5 },
      { building: 'forge', level: 5 },
    ],
    effect: { target: 'alchemyFurnace', value: 0.25 },
  },
  {
    id: 'alchemy_forging_forge',
    name: '丹器双修',
    description: '丹炉和炼器坊效率各 +25%',
    requirements: [
      { building: 'alchemyFurnace', level: 5 },
      { building: 'forge', level: 5 },
    ],
    effect: { target: 'forge', value: 0.25 },
  },
]
```

- [ ] **Step 4: Implement SynergySystem**

Create `src/systems/economy/SynergySystem.ts`:

```typescript
import type { Building } from '../../types/sect'
import type { BuildingType } from '../../types/sect'
import { SYNERGIES, type Synergy } from '../../data/buildings'

/**
 * Get all currently active synergies based on building levels.
 */
export function getActiveSynergies(buildings: Building[]): Synergy[] {
  return SYNERGIES.filter((synergy) =>
    synergy.requirements.every((req) => {
      const building = buildings.find((b) => b.type === req.building)
      return building && building.unlocked && building.level >= req.level
    }),
  )
}

/**
 * Get the total synergy multiplier bonus for a specific building.
 * Returns 1.0 + sum of all applicable synergy bonuses.
 * Special case: "开源节流" (market quality cap +1) is handled separately
 * by the caller, this function returns a standard multiplier.
 */
export function getSynergyBonus(targetBuilding: BuildingType, buildings: Building[]): number {
  const active = getActiveSynergies(buildings)
  let bonus = 0

  for (const synergy of active) {
    if (synergy.effect.target === targetBuilding) {
      // Skip "开源节流" — it's a quality cap bonus, not a multiplier
      if (synergy.id === 'market_mining') continue
      bonus += synergy.effect.value
    }
  }

  return 1 + bonus
}

/**
 * Get the quality cap bonus for market from synergies.
 * Returns extra quality levels (0 or 1).
 */
export function getMarketQualityCapBonus(buildings: Building[]): number {
  const active = getActiveSynergies(buildings)
  return active.some(s => s.id === 'market_mining') ? 1 : 0
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/__tests__/SynergySystem.test.ts --pool=forks --testTimeout=30000`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add src/data/buildings.ts src/systems/economy/SynergySystem.ts src/__tests__/SynergySystem.test.ts
git commit -m "feat(synergy): add building synergy system with data and calculations"
```

---

### Task 2: 协同加成集成到资源产出

**Files:**
- Modify: `src/stores/sectStore.ts` (tickAll)

- [ ] **Step 1: Apply synergy bonuses alongside specialty bonuses in tickAll**

In `tickAll`, after the specialty bonus application (from P1 Task 5), add synergy multipliers:

```typescript
import { getSynergyBonus } from '../systems/economy/SynergySystem'

// After specialty bonuses are applied:
const buildings = state.sect.buildings
const synergyFieldBonus = getSynergyBonus('spiritField', buildings)
const synergyMineBonus = getSynergyBonus('spiritMine', buildings)
const synergyForgeBonus = getSynergyBonus('forge', buildings)
const synergyAlchemyBonus = getSynergyBonus('alchemyFurnace', buildings)

rates.spiritStone *= synergyMineBonus
rates.ore *= synergyMineBonus
rates.spiritEnergy *= synergyFieldBonus
rates.herb *= synergyFieldBonus
```

These multiply on top of the specialty bonuses, so total = base × specialty × synergy.

- [ ] **Step 2: Run all tests**

Run: `npx vitest run --pool=forks --testTimeout=30000`
Expected: ALL PASS

- [ ] **Step 3: Commit**

```bash
git add src/stores/sectStore.ts
git commit -m "feat(synergy): integrate synergy bonuses into resource production"
```

---

### Task 3: 协同 UI 显示

**Files:**
- Modify: `src/pages/BuildingsPage.tsx`

- [ ] **Step 1: Add synergy list to BuildingsPage**

At the bottom of the buildings page (after the building grid), add a synergy section:

```tsx
import { getActiveSynergies } from '../../systems/economy/SynergySystem'
import { SYNERGIES } from '../../data/buildings'

// Inside the component:
const buildings = useSectStore((s) => s.sect.buildings)
const activeSynergies = getActiveSynergies(buildings)

// In the JSX, after the building grid:
<section className={styles.synergySection}>
  <h3 className={styles.sectionTitle}>建筑协同</h3>
  <div className={styles.synergyList}>
    {SYNERGIES.map((synergy) => {
      const isActive = activeSynergies.some(a => a.id === synergy.id)
      return (
        <div key={synergy.id} className={`${styles.synergyCard} ${isActive ? styles.synergyActive : styles.synergyInactive}`}>
          <div className={styles.synergyName}>{synergy.name}</div>
          <div className={styles.synergyDesc}>{synergy.description}</div>
          <div className={styles.synergyReq}>
            {synergy.requirements.map((req, i) => (
              <span key={i}>
                {req.building} Lv{req.level}
                {i < synergy.requirements.length - 1 && ' + '}
              </span>
            ))}
          </div>
        </div>
      )
    })}
  </div>
</section>
```

Add corresponding CSS classes to `BuildingsPage.module.css` (or inline styles). Follow existing style patterns.

- [ ] **Step 2: Run TypeScript check and build**

Run: `npx tsc --noEmit && npm run build`
Expected: No errors, build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/pages/BuildingsPage.tsx src/pages/BuildingsPage.module.css
git commit -m "feat(ui): display building synergies on BuildingsPage"
```

---

### Task 4: 任务派遣数据与系统

**Files:**
- Create: `src/data/missions.ts`
- Modify: `src/stores/adventureStore.ts`
- Test: `src/__tests__/missions.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/missions.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { DISPATCH_MISSIONS, getAvailableMissions } from '../data/missions'

describe('DISPATCH_MISSIONS', () => {
  it('has at least 5 missions defined', () => {
    expect(DISPATCH_MISSIONS.length).toBeGreaterThanOrEqual(5)
  })

  it('every mission has required fields', () => {
    for (const mission of DISPATCH_MISSIONS) {
      expect(mission.id).toBeTruthy()
      expect(mission.name).toBeTruthy()
      expect(mission.description).toBeTruthy()
      expect(mission.duration).toBeGreaterThan(0)
      expect(mission.rewards.length).toBeGreaterThan(0)
      expect(mission.minRealm).toBeGreaterThanOrEqual(0)
    }
  })

  it('getAvailableMissions filters by realm', () => {
    const available = getAvailableMissions(0)
    for (const m of available) {
      expect(m.minRealm).toBeLessThanOrEqual(0)
    }

    const available2 = getAvailableMissions(3)
    expect(available2.length).toBeGreaterThanOrEqual(available.length)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/missions.test.ts --pool=forks --testTimeout=30000`
Expected: FAIL — module not found

- [ ] **Step 3: Create mission data**

Create `src/data/missions.ts`:

```typescript
export interface MissionReward {
  type: 'spiritStone' | 'herb' | 'ore' | 'consumable'
  amount: number
  recipeId?: string
}

export interface DispatchMission {
  id: string
  name: string
  description: string
  duration: number  // seconds
  rewards: MissionReward[]
  minRealm: number
}

export const DISPATCH_MISSIONS: DispatchMission[] = [
  {
    id: 'gather_herbs',
    name: '采集灵药',
    description: '前往山野采集灵药',
    duration: 300,
    rewards: [{ type: 'herb', amount: 80 }],
    minRealm: 0,
  },
  {
    id: 'mine_ores',
    name: '探矿',
    description: '深入矿脉开采矿石',
    duration: 300,
    rewards: [{ type: 'ore', amount: 50 }],
    minRealm: 0,
  },
  {
    id: 'visit_market',
    name: '访问坊市',
    description: '前往坊市寻找丹药',
    duration: 180,
    rewards: [{ type: 'spiritStone', amount: 200 }],
    minRealm: 1,
  },
  {
    id: 'seek_master',
    name: '寻访高人',
    description: '外出寻访修仙前辈',
    duration: 600,
    rewards: [{ type: 'consumable', amount: 1, recipeId: 'spirit_potion' }],
    minRealm: 2,
  },
  {
    id: 'hunt_beasts',
    name: '猎杀妖兽',
    description: '清理附近妖兽获取灵石',
    duration: 480,
    rewards: [{ type: 'spiritStone', amount: 400 }],
    minRealm: 1,
  },
]

export function getAvailableMissions(characterRealm: number): DispatchMission[] {
  return DISPATCH_MISSIONS.filter(m => m.minRealm <= characterRealm)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/missions.test.ts --pool=forks --testTimeout=30000`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/data/missions.ts src/__tests__/missions.test.ts
git commit -m "feat(dispatch): add dispatch mission data definitions"
```

---

### Task 5: 替换巡逻系统为任务派遣

**Files:**
- Modify: `src/stores/adventureStore.ts`

- [ ] **Step 1: Replace patrol state with dispatch state**

In `src/stores/adventureStore.ts`, replace the patrol-related state fields:

```typescript
// Remove:
// patrolActive, patrolProgress, patrolCountToday, patrolReward, patrolCharacterId, patrolLastDate

// Add:
dispatches: DispatchState[]

interface DispatchState {
  characterId: string
  missionId: string
  progress: number       // seconds elapsed
  duration: number       // total seconds
}
```

- [ ] **Step 2: Replace patrol methods with dispatch methods**

```typescript
startDispatch: (characterId: string, missionId: string) => void
tickDispatches: (deltaSec: number) => void
collectDispatchReward: (characterId: string) => void
getActiveDispatchCount: () => number
```

Implementation:

```typescript
startDispatch: (characterId, missionId) => {
  const mission = DISPATCH_MISSIONS.find(m => m.id === missionId)
  if (!mission) return

  get().set((state) => {
    const char = useSectStore.getState().sect.characters.find(c => c.id === characterId)
    if (!char) return state
    if (char.status !== 'idle' && char.status !== 'cultivating') return state

    if (state.dispatches.length >= 5) return state
    if (state.dispatches.some(d => d.characterId === characterId)) return state

    // Set character to patrolling (reuses the status)
    useSectStore.getState().setSect(draft => {
      const c = draft.characters.find(c => c.id === characterId)
      if (c) c.status = 'patrolling'
    })

    state.dispatches.push({
      characterId,
      missionId,
      progress: 0,
      duration: mission.duration,
    })
  })
},

tickDispatches: (deltaSec) => {
  get().set((state) => {
    for (const dispatch of state.dispatches) {
      dispatch.progress += deltaSec
    }
  })
},

collectDispatchReward: (characterId) => {
  const state = get()
  const dispatchIndex = state.dispatches.findIndex(d => d.characterId === characterId)
  if (dispatchIndex === -1) return

  const dispatch = state.dispatches[dispatchIndex]
  const mission = DISPATCH_MISSIONS.find(m => m.id === dispatch.missionId)
  if (!mission || dispatch.progress < dispatch.duration) return

  // Apply rewards
  useSectStore.getState().setSect(draft => {
    for (const reward of mission.rewards) {
      switch (reward.type) {
        case 'spiritStone':
          draft.resources.spiritStone += reward.amount
          break
        case 'herb':
          draft.resources.herb += reward.amount
          break
        case 'ore':
          draft.resources.ore += reward.amount
          break
        case 'consumable':
          // Add to vault using addItemToStacks
          break
      }
    }
    // Return character to idle
    const c = draft.characters.find(c => c.id === characterId)
    if (c) c.status = 'idle'
  })

  get().set((state) => {
    state.dispatches.splice(dispatchIndex, 1)
  })
},

getActiveDispatchCount: () => {
  return get().dispatches.length
},
```

- [ ] **Step 3: Handle save migration**

On load, if old `patrolActive` state exists, complete the patrol immediately and migrate:

```typescript
// In the store initialization or migration:
if (state.patrolActive) {
  // Complete old patrol
  useSectStore.getState().setSect(draft => {
    const c = draft.characters.find(c => c.id === state.patrolCharacterId)
    if (c) c.status = 'cultivating'
  })
  // Deposit old reward
  useSectStore.getState().addSpiritStone(state.patrolReward)
  state.dispatches = []
  state.patrolActive = false
}
```

- [ ] **Step 4: Update tickIdle to call tickDispatches**

In the `tickIdle` method, replace `tickPatrol(deltaSec)` with `tickDispatches(deltaSec)`.

Also add auto-collect for completed dispatches:
```typescript
// In tickIdle:
get().tickDispatches(deltaSec)

// Auto-collect completed dispatches
const completed = get().dispatches.filter(d => d.progress >= d.duration)
for (const dispatch of completed) {
  get().collectDispatchReward(dispatch.characterId)
}
```

- [ ] **Step 5: Run all tests**

Run: `npx vitest run --pool=forks --testTimeout=30000`
Expected: ALL PASS (after updating any tests that reference old patrol methods)

- [ ] **Step 6: Commit**

```bash
git add src/stores/adventureStore.ts
git commit -m "feat(dispatch): replace patrol system with multi-mission dispatch"
```

---

### Task 6: 任务派遣 UI

**Files:**
- Modify: `src/pages/CharactersPage.tsx`

- [ ] **Step 1: Add dispatch panel to CharacterDetail**

In `src/pages/CharactersPage.tsx`, add a dispatch button and mission selection UI in the `CharacterDetail` component:

```tsx
import { getAvailableMissions, DISPATCH_MISSIONS } from '../data/missions'

// In CharacterDetail:
const dispatches = useAdventureStore((s) => s.dispatches)
const startDispatch = useAdventureStore((s) => s.startDispatch)
const getActiveDispatchCount = useAdventureStore((s) => s.getActiveDispatchCount)

// Show dispatch button when character is idle or cultivating:
{(character.status === 'idle' || character.status === 'cultivating') && getActiveDispatchCount() < 5 && (
  <button
    className={styles.actionBtn}
    onClick={() => setShowingMissions(true)}
  >
    派遣
  </button>
)}

// Show dispatch info when character is patrolling:
{character.status === 'patrolling' && (() => {
  const dispatch = dispatches.find(d => d.characterId === character.id)
  if (!dispatch) return null
  const mission = DISPATCH_MISSIONS.find(m => m.id === dispatch.missionId)
  const remaining = Math.max(0, dispatch.duration - dispatch.progress)
  const minutes = Math.floor(remaining / 60)
  const seconds = Math.floor(remaining % 60)
  return (
    <div className={styles.dispatchInfo}>
      <span>任务: {mission?.name}</span>
      <span>剩余: {minutes}:{seconds.toString().padStart(2, '0')}</span>
    </div>
  )
})()}
```

Add a mission selection modal/panel when `showingMissions` is true:

```tsx
{showingMissions && (
  <div className={styles.missionPanel}>
    <div className={styles.missionPanelTitle}>选择派遣任务</div>
    {getAvailableMissions(character.realm).map(mission => (
      <div key={mission.id} className={styles.missionCard} onClick={() => {
        startDispatch(character.id, mission.id)
        setShowingMissions(false)
      }}>
        <div className={styles.missionName}>{mission.name}</div>
        <div className={styles.missionDesc}>{mission.description}</div>
        <div className={styles.missionMeta}>
          <span>时间: {Math.floor(mission.duration / 60)}分钟</span>
          <span>奖励: {mission.rewards.map(r => `${r.type === 'spiritStone' ? '灵石' : r.type === 'herb' ? '草药' : r.type === 'ore' ? '矿石' : '物品'} ×${r.amount}`).join(', ')}</span>
        </div>
      </div>
    ))}
    <button className={styles.closeBtn} onClick={() => setShowingMissions(false)}>关闭</button>
  </div>
)}
```

- [ ] **Step 2: Run TypeScript check and build**

Run: `npx tsc --noEmit && npm run build`
Expected: No errors, build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/pages/CharactersPage.tsx src/pages/CharactersPage.module.css
git commit -m "feat(ui): add dispatch mission panel to CharactersPage"
```

---

### Task 7: 探险商店实现

**Files:**
- Modify: `src/systems/roguelike/EventSystem.ts`
- Modify: `src/stores/adventureStore.ts`

- [ ] **Step 1: Define shop items and implement shop event**

In `src/systems/roguelike/EventSystem.ts`, add shop item data and update the shop event handler:

```typescript
interface ShopOffer {
  name: string
  description: string
  cost: number
  effect: 'heal' | 'skip' | 'spirit'
  value: number
}

const SHOP_ITEMS: ShopOffer[] = [
  { name: '回春丹', description: '恢复 30% 生命', cost: 100, effect: 'heal', value: 0.3 },
  { name: '传送符', description: '跳过当前层', cost: 200, effect: 'skip', value: 0 },
  { name: '聚灵丹', description: '恢复 20% 灵力', cost: 150, effect: 'spirit', value: 0.2 },
]

// Update the shop case in resolveEvent:
case 'shop': {
  // Pick 2-3 random items
  const shuffled = [...SHOP_ITEMS].sort(() => Math.random() - 0.5)
  const offers = shuffled.slice(0, 2 + Math.floor(Math.random() * 2)) // 2-3 items

  return {
    type: 'shop',
    success: true,
    reward: { spiritStone: 0, herb: 0, ore: 0 },
    itemRewards: [],
    message: '遇到了游商',
    hpChanges: [],
    shopOffers: offers,  // Pass offers to caller for UI display
  }
}
```

Add `shopOffers` to the `EventResult` interface.

- [ ] **Step 2: Handle shop purchases in adventureStore**

In `src/stores/adventureStore.ts`, add a method to buy from shop:

```typescript
buyFromShop: (runId: string, offerIndex: number) => void
```

Implementation:
```typescript
buyFromShop: (runId, offerIndex) => {
  const run = get().activeRuns[runId]  // activeRuns is Record<string, DungeonRun>
  if (!run) return

  const lastFloor = run.floors[run.currentFloor - 1]
  if (!lastFloor) return

  const lastRoute = lastFloor.routes.find(r => r.events.some(e => e.type === 'shop'))
  if (!lastRoute) return

  // Deduct cost from totalRewards
  const shopEvent = lastRoute.events.find(e => e.type === 'shop')
  // Access offers from the resolved event... this needs to be stored on the run
  // Simpler approach: store pending shop offers on DungeonRun
}
```

**Alternative simpler approach:** Store `pendingShopOffers` on `DungeonRun`. When a shop event is resolved, the offers are stored. The `buyFromShop` method reads from there, deducts from `totalRewards.spiritStone`, and applies the effect.

Add to `DungeonRun` in `src/types/adventure.ts`:
```typescript
pendingShopOffers: ShopOffer[]
```

In `selectRoute`, after resolving a shop event, store the offers:
```typescript
if (eventResult.type === 'shop' && eventResult.shopOffers) {
  run.pendingShopOffers = eventResult.shopOffers
}
```

- [ ] **Step 3: Run all tests**

Run: `npx vitest run --pool=forks --testTimeout=30000`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add src/systems/roguelike/EventSystem.ts src/types/adventure.ts src/stores/adventureStore.ts
git commit -m "feat(adventure): implement shop event with purchasable items"
```

---

### Task 8: 灵兽捕获集成

**Files:**
- Modify: `src/systems/roguelike/EventSystem.ts`
- Modify: `src/systems/roguelike/LootSystem.ts`
- Modify: `src/stores/adventureStore.ts`
- Test: `src/__tests__/LootSystem.test.ts` (update)

- [ ] **Step 1: Add pet capture event to EventSystem**

In `src/systems/roguelike/EventSystem.ts`, add a new event type `'petCapture'`:

```typescript
// In the event type union (if defined) or in resolveEvent:
case 'petCapture': {
  return {
    type: 'petCapture',
    success: false,  // Pending player decision
    reward: { spiritStone: 0, herb: 0, ore: 0 },
    itemRewards: [],
    message: '发现了一只可捕获的灵兽！',
    hpChanges: [],
  }
}
```

- [ ] **Step 2: Trigger pet capture from loot table**

In the `resolveEvent` combat/boss handlers, after generating loot, check for `petCapture` type:

```typescript
// After generating loot from combat:
const petCaptureDrop = loot.find(l => l.type === 'petCapture')
if (petCaptureDrop) {
  // Insert a petCapture event into the route
  return {
    type: 'combat',
    success: true,
    reward,
    itemRewards,
    combatResult,
    message: `击败了 ${template.name}`,
    hpChanges: combatResult.hpChanges,
    petCaptureEvent: true,  // Flag for caller to show capture prompt
  }
}
```

- [ ] **Step 3: Add capture attempt to adventureStore**

```typescript
attemptPetCapture: (runId: string, characterId: string) => boolean
```

Implementation:
```typescript
attemptPetCapture: (runId, characterId) => {
  const character = useSectStore.getState().sect.characters.find(c => c.id === characterId)
  if (!character) return false

  const fortune = character.cultivationStats.fortune
  // Determine target quality based on dungeon floor
  const run = get().activeRuns[runId]  // activeRuns is Record<string, DungeonRun>
  const floor = run?.currentFloor ?? 1
  const quality = floor < 5 ? 'common' : floor < 10 ? 'spirit' : floor < 15 ? 'immortal' : 'divine'

  const success = tryCapturePet(fortune, quality)
  if (success) {
    const pet = generatePet(quality)
    useSectStore.getState().addPet(pet)
  }
  return success
},
```

- [ ] **Step 4: Run all tests**

Run: `npx vitest run --pool=forks --testTimeout=30000`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/systems/roguelike/EventSystem.ts src/systems/roguelike/LootSystem.ts src/stores/adventureStore.ts
git commit -m "feat(adventure): add pet capture during dungeon runs"
```

---

### Task 9: 探险 UI — 商店和灵宠

**Files:**
- Modify: `src/pages/AdventurePage.tsx`

- [ ] **Step 1: Add shop purchase UI**

When `pendingShopOffers` is non-empty on the active run, show a shop panel:

```tsx
{run.pendingShopOffers.length > 0 && (
  <div className={styles.shopPanel}>
    <h3>游商</h3>
    {run.pendingShopOffers.map((offer, i) => (
      <div key={i} className={styles.shopItem}>
        <span>{offer.name} - {offer.description}</span>
        <span>灵石 {offer.cost}</span>
        <button
          disabled={run.totalRewards.spiritStone < offer.cost}
          onClick={() => buyFromShop(run.id, i)}
        >
          购买
        </button>
      </div>
    ))}
    <button onClick={() => closeShop(run.id)}>离开</button>
  </div>
)}
```

- [ ] **Step 2: Add pet capture prompt**

When `petCaptureEvent` is true on the last resolved event, show capture prompt:

```tsx
{showPetCapture && (
  <div className={styles.petCapturePanel}>
    <p>发现了一只可捕获的灵兽！</p>
    <p>捕获率: {Math.round((0.30 + fortune * 0.02) * 100)}%</p>
    <button onClick={() => {
      const success = attemptPetCapture(run.id, teamCharacterIds[0])
      setShowPetCapture(false)
      if (success) {
        // Show success message
      }
    }}>尝试捕获</button>
    <button onClick={() => setShowPetCapture(false)}>放弃</button>
  </div>
)}
```

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/pages/AdventurePage.tsx src/pages/AdventurePage.module.css
git commit -m "feat(ui): add adventure shop and pet capture UI"
```

---

### Task 10: 最终验证

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run --pool=forks --testTimeout=30000`
Expected: ALL PASS

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: Build succeeds
