# Phase 1: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the complete project foundation — tooling, theme, routing, game data types, Zustand stores, and the Main Hall page.

**Architecture:** Vite scaffolds the React app. CSS Variables define the ink-wash theme. React Router provides page navigation. TypeScript types model all game entities. Zustand stores hold initial state. The Main Hall page is the first functional page showing player info and resources.

**Tech Stack:** React 18, TypeScript 5, Vite 5, Zustand, React Router v6, Vitest

**Spec:** `docs/superpowers/specs/2026-03-24-endlessquest-design.md`
**Design Principles:** `.impeccable.md` / `CLAUDE.md`

---

## File Structure (Phase 1)

```
src/
├── main.tsx                           # Vite 入口
├── App.tsx                            # 根组件 + Router
├── vite-env.d.ts                      # Vite 类型声明
├── types/
│   ├── player.ts                      # Player, Realm, Attributes
│   ├── item.ts                        # Item, Equipment, ItemQuality
│   ├── skill.ts                       # Skill, Technique, Element
│   ├── sect.ts                        # Building, Disciple, Resource
│   ├── adventure.ts                   # Dungeon, Event, Enemy
│   └── index.ts                       # Re-exports
├── data/
│   ├── realms.ts                      # Realm definitions
│   ├── items.ts                       # Item templates
│   ├── skills.ts                      # Skill/technique templates
│   ├── buildings.ts                   # Building definitions
│   ├── events.ts                      # Roguelike event templates
│   └── enemies.ts                     # Enemy templates
├── stores/
│   ├── playerStore.ts                 # Player state
│   ├── inventoryStore.ts              # Inventory state
│   ├── sectStore.ts                   # Sect state
│   ├── adventureStore.ts              # Adventure state
│   └── gameStore.ts                   # Game time, settings
├── styles/
│   ├── globals.css                    # Global styles + CSS variables
│   └── theme.css                      # Ink-wash theme tokens
├── components/
│   ├── common/
│   │   ├── ProgressBar.module.css
│   │   ├── ProgressBar.tsx
│   │   ├── BottomNav.module.css
│   │   ├── BottomNav.tsx
│   │   ├── TopBar.module.css
│   │   └── TopBar.tsx
│   └── character/
│       ├── PlayerInfo.module.css
│       └── PlayerInfo.tsx
├── pages/
│   ├── MainHall.module.css
│   ├── MainHall.tsx
│   ├── Cultivation.tsx                # Placeholder
│   ├── Sect.tsx                       # Placeholder
│   ├── Adventure.tsx                  # Placeholder
│   └── Inventory.tsx                  # Placeholder
└── __tests__/
    ├── types.test.ts                  # Type instantiation tests
    ├── data.test.ts                   # Data integrity tests
    └── stores.test.ts                 # Store initialization tests
```

---

### Task 1: Vite + React + TypeScript Scaffolding

**Files:**
- Create: `package.json` (update existing)
- Create: `vite.config.ts`
- Create: `tsconfig.json` (update existing)
- Create: `tsconfig.node.json`
- Create: `src/vite-env.d.ts`
- Create: `index.html`

- [ ] **Step 1: Install dependencies**

```bash
npm install react react-dom react-router-dom zustand framer-motion
npm install -D vite @vitejs/plugin-react vitest @testing-library/react @testing-library/jest-dom jsdom typescript @types/react @types/react-dom
```

- [ ] **Step 2: Update package.json scripts**

Add to `"scripts"`:
```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 3: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
  },
})
```

- [ ] **Step 4: Create src/__tests__/setup.ts**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Update tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src"]
}
```

- [ ] **Step 6: Create tsconfig.node.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 7: Create src/vite-env.d.ts**

```typescript
/// <reference types="vite/client" />
```

- [ ] **Step 8: Create index.html in project root**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>无尽仙途 | EndlessQuest</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700&family=Noto+Sans+SC:wght@300;400;500;700&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 9: Create src/main.tsx**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 10: Verify dev server starts**

Run: `npm run dev`
Expected: Vite dev server running, no errors

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TypeScript project with dependencies"
```

---

### Task 2: Ink-Wash Theme (CSS Variables & Global Styles)

**Files:**
- Create: `src/styles/theme.css`
- Create: `src/styles/globals.css`

- [ ] **Step 1: Write the failing test** — not applicable for CSS; verify visually.

- [ ] **Step 2: Create src/styles/theme.css**

```css
:root {
  /* Background */
  --color-bg: #f5f0e8;
  --color-bg-paper: #faf6ef;

  /* Panel */
  --color-panel: rgba(255, 255, 255, 0.85);
  --color-panel-hover: rgba(255, 255, 255, 0.95);

  /* Text */
  --color-text: #2c2c2c;
  --color-text-secondary: #6b6b6b;
  --color-text-tertiary: #999;

  /* Accent */
  --color-accent: #8b4513;
  --color-accent-hover: #a0522d;

  /* Border */
  --color-border: #c4b5a0;
  --color-border-light: #ddd5c8;

  /* Semantic */
  --color-danger: #c0392b;
  --color-danger-bg: #fde8e5;
  --color-success: #2d6a4f;
  --color-success-bg: #e8f5e9;
  --color-rare: #5b4a9e;
  --color-rare-bg: #ede8f5;

  /* Item Quality */
  --color-quality-common: #9ca3af;
  --color-quality-spirit: #60a5fa;
  --color-quality-immortal: #a78bfa;
  --color-quality-divine: #f59e0b;
  --color-quality-chaos: #ef4444;

  /* Typography */
  --font-serif: 'Noto Serif SC', 'Songti SC', serif;
  --font-sans: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;

  /* Shadow */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.1);

  /* Transition */
  --transition-fast: 150ms ease;
  --transition-normal: 300ms ease;
  --transition-slow: 500ms ease;
}
```

- [ ] **Step 3: Create src/styles/globals.css**

```css
@import './theme.css';

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: var(--font-sans);
  color: var(--color-text);
  background-color: var(--color-bg);
  min-height: 100vh;
  max-width: 480px;
  margin: 0 auto;
  overflow-x: hidden;
}

#root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Ink-wash background texture */
body::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse at 20% 50%, rgba(196, 181, 160, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, rgba(196, 181, 160, 0.06) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 80%, rgba(139, 69, 19, 0.04) 0%, transparent 50%);
  z-index: 0;
}

a {
  color: var(--color-accent);
  text-decoration: none;
}

button {
  font-family: var(--font-sans);
  cursor: pointer;
  border: none;
  background: none;
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 4px;
}
::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 2px;
}

/* Page content area: above bottom nav */
.page-content {
  flex: 1;
  padding: var(--space-md);
  padding-bottom: 72px; /* space for bottom nav */
  position: relative;
  z-index: 1;
}

h1, h2, h3 {
  font-family: var(--font-serif);
  font-weight: 700;
}
```

- [ ] **Step 4: Verify theme loads**

Run: `npm run dev`
Expected: Browser shows xuan-paper background with subtle radial gradients

- [ ] **Step 5: Commit**

```bash
git add src/styles/
git commit -m "style: add ink-wash theme CSS variables and global styles"
```

---

### Task 3: TypeScript Type Definitions

**Files:**
- Create: `src/types/player.ts`
- Create: `src/types/item.ts`
- Create: `src/types/skill.ts`
- Create: `src/types/sect.ts`
- Create: `src/types/adventure.ts`
- Create: `src/types/index.ts`
- Test: `src/__tests__/types.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/types.test.ts`:
```typescript
import type { Player, Realm, RealmStage, BaseStats, CultivationStats } from '../types/player'
import type { Item, Equipment, ItemQuality, EquipSlot } from '../types/item'
import type { ActiveSkill, Technique, SkillCategory, TechniqueType, Element } from '../types/skill'
import type { Building, BuildingType, Disciple, DiscipleQuality, ResourceType, Resources } from '../types/sect'
import type { Dungeon, DungeonEvent, Enemy, EventType } from '../types/adventure'

describe('Type instantiation', () => {
  it('should create a Player with all required fields', () => {
    const player: Player = {
      id: '1',
      name: '无名修士',
      realm: 0,
      realmStage: 0,
      cultivation: 0,
      baseStats: { hp: 100, atk: 15, def: 8, spd: 10, crit: 0.05, critDmg: 1.5 },
      cultivationStats: { spiritPower: 50, maxSpiritPower: 50, comprehension: 10, spiritualRoot: 10, fortune: 5 },
      equippedTechniques: [null, null, null],
      equippedSkills: [null, null, null, null, null],
      equippedGear: [null, null, null, null, null, null, null, null, null],
    }
    expect(player.baseStats.hp).toBe(100)
  })

  it('should create an Equipment with quality and slot', () => {
    const gear: Equipment = {
      id: '1',
      name: '青木剑',
      quality: 'spirit' as ItemQuality,
      slot: 'weapon' as EquipSlot,
      stats: { hp: 10, atk: 20, def: 0, spd: 2, crit: 0, critDmg: 0 },
      enhanceLevel: 0,
      refinementStats: [],
      setId: null,
    }
    expect(gear.quality).toBe('spirit')
  })

  it('should create a Building with type and level', () => {
    const building: Building = {
      type: 'mainHall' as BuildingType,
      level: 1,
      unlocked: true,
    }
    expect(building.level).toBe(1)
  })

  it('should create a Dungeon with layers', () => {
    const dungeon: Dungeon = {
      id: 'lingCaoValley',
      name: '灵草谷',
      totalLayers: 5,
      eventsPerLayer: 3,
      unlockRealm: 0,
      unlockStage: 3,
      lootTable: [],
    }
    expect(dungeon.totalLayers).toBe(5)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/types.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Create src/types/player.ts**

```typescript
export type RealmStage = 0 | 1 | 2 | 3 // 初期/中期/后期/圆满

export interface BaseStats {
  hp: number
  atk: number
  def: number
  spd: number
  crit: number    // 0~0.75
  critDmg: number // multiplier, e.g. 1.5
}

export interface CultivationStats {
  spiritPower: number
  maxSpiritPower: number
  comprehension: number
  spiritualRoot: number
  fortune: number
}

export interface Player {
  id: string
  name: string
  realm: number        // index into REALMS array
  realmStage: RealmStage
  cultivation: number  // current cultivation points
  baseStats: BaseStats
  cultivationStats: CultivationStats
  equippedTechniques: (string | null)[]   // [心法, 体修, 神识]
  equippedSkills: (string | null)[]       // [主动×4, 终极×1]
  equippedGear: (string | null)[]         // 9 slots
  partyPets: (string | null)[]            // [灵宠1, 灵宠2]
  partyDisciple: string | null            // 弟子位
}
```

- [ ] **Step 4: Create src/types/item.ts**

```typescript
export type ItemQuality = 'common' | 'spirit' | 'immortal' | 'divine' | 'chaos'
export type EquipSlot = 'head' | 'armor' | 'bracer' | 'belt' | 'boots' | 'weapon' | 'accessory1' | 'accessory2' | 'talisman'

export interface ItemStats {
  hp: number
  atk: number
  def: number
  spd: number
  crit: number
  critDmg: number
}

export interface Item {
  id: string
  name: string
  quality: ItemQuality
  type: 'equipment' | 'consumable' | 'material'
  description: string
  sellPrice: number
}

export interface Equipment extends Item {
  type: 'equipment'
  slot: EquipSlot
  stats: ItemStats
  enhanceLevel: number
  refinementStats: Partial<ItemStats>[]
  setId: string | null
}

export interface Consumable extends Item {
  type: 'consumable'
  effect: { type: string; value: number }
}

export interface Material extends Item {
  type: 'material'
  category: 'herb' | 'ore' | 'beastSoul' | 'scroll' | 'other'
}

export type AnyItem = Equipment | Consumable | Material

export interface InventoryState {
  items: AnyItem[]
  maxSlots: number
  resources: Resources
}

// Forward reference — types/sect.ts defines Resources, import there
import type { Resources } from './sect'
```

- [ ] **Step 5: Create src/types/skill.ts**

```typescript
export type Element = 'fire' | 'ice' | 'lightning' | 'healing'
export type SkillCategory = 'attack' | 'defense' | 'support' | 'ultimate'
export type TechniqueType = 'mental' | 'body' | 'spiritual'

export interface ActiveSkill {
  id: string
  name: string
  category: SkillCategory
  element: Element
  multiplier: number    // damage multiplier
  spiritCost: number    // 10~50
  cooldown: number      // turns
  description: string
  tier: number          // 1~5
}

export interface Technique {
  id: string
  name: string
  type: TechniqueType
  tier: number          // 1~4 (初级/中级/高级/顶级)
  statBonus: Partial<{
    hp: number; atk: number; def: number; spd: number
    crit: number; critDmg: number
    spiritPower: number; comprehension: number; spiritualRoot: number; fortune: number
  }>
  description: string
}
```

- [ ] **Step 6: Create src/types/sect.ts**

```typescript
export type BuildingType =
  | 'mainHall' | 'spiritField' | 'market' | 'alchemyFurnace'
  | 'forge' | 'scriptureHall' | 'recruitmentPavilion' | 'trainingHall'

export type DiscipleQuality = 'common' | 'spirit' | 'immortal' | 'divine'

export type ResourceType = 'spiritStone' | 'spiritEnergy' | 'herb' | 'ore' | 'fairyJade' | 'scrollFragment' | 'heavenlyTreasure' | 'beastSoul'

export interface Resources {
  spiritStone: number
  spiritEnergy: number
  herb: number
  ore: number
  fairyJade: number
  scrollFragment: number
  heavenlyTreasure: number
  beastSoul: number
}

export interface Building {
  type: BuildingType
  level: number
  unlocked: boolean
}

export interface Disciple {
  id: string
  name: string
  quality: DiscipleQuality
  level: number
  talent: number     // 1~100
  loyalty: number    // 1~100
  hp: number
  atk: number
  def: number
  spd: number
  equippedTechniques: (string | null)[]
  equippedSkills: (string | null)[]
  status: 'active' | 'wounded' | 'dispatched'
  dispatchEndTime: number | null // timestamp
  highestQualityOwned: DiscipleQuality // historical max for unlock checks
}

export interface SectState {
  buildings: Building[]
  disciples: Disciple[]
  resources: Resources
  discipleMaxOwned: Record<DiscipleQuality, number> // historical max count per quality
}
```

- [ ] **Step 7: Create src/types/adventure.ts**

```typescript
export type EventType = 'combat' | 'random' | 'shop' | 'rest' | 'boss'

export interface Enemy {
  id: string
  name: string
  element: string
  stats: { hp: number; atk: number; def: number; spd: number }
  isBoss: boolean
}

export interface DungeonEvent {
  type: EventType
  id?: string // reference to enemy/specific event
}

export interface RouteOption {
  name: string
  description: string
  riskLevel: 'low' | 'medium' | 'high'
  events: DungeonEvent[]
}

export interface DungeonLayer {
  number: number
  routes: RouteOption[]
}

export interface Dungeon {
  id: string
  name: string
  totalLayers: number
  eventsPerLayer: number
  unlockRealm: number
  unlockStage: number
  lootTable: Array<{ itemId: string; weight: number }>
}

export interface DungeonRun {
  dungeonId: string
  currentLayer: number
  teamHp: number[]
  mode: 'idle' | 'manual'
  buffs: string[]
  tempSkills: string[]
  currency: number
  startedAt: number
  paused: boolean
}
```

- [ ] **Step 8: Create src/types/index.ts**

```typescript
export type { Player, RealmStage, BaseStats, CultivationStats } from './player'
export type { Item, Equipment, Consumable, Material, AnyItem, ItemQuality, EquipSlot, ItemStats, InventoryState } from './item'
export type { ActiveSkill, Technique, Element, SkillCategory, TechniqueType } from './skill'
export type { Building, BuildingType, Disciple, DiscipleQuality, ResourceType, Resources, SectState } from './sect'
export type { Dungeon, DungeonEvent, DungeonLayer, RouteOption, Enemy, EventType, DungeonRun } from './adventure'
```

- [ ] **Step 9: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/types.test.ts`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add src/types/ src/__tests__/types.test.ts
git commit -m "feat: add TypeScript type definitions for all game entities"
```

---

### Task 4: Static Game Data

**Files:**
- Create: `src/data/realms.ts`
- Create: `src/data/items.ts`
- Create: `src/data/skills.ts`
- Create: `src/data/buildings.ts`
- Create: `src/data/events.ts`
- Create: `src/data/enemies.ts`
- Test: `src/__tests__/data.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/data.test.ts`:
```typescript
import { REALMS } from '../data/realms'
import { ENHANCE_RATES, ITEM_TEMPLATES } from '../data/items'
import { BUILDING_DEFS } from '../data/buildings'
import { DUNGEONS } from '../data/events'

describe('Static game data', () => {
  it('should define 6 realms with correct cultivation costs', () => {
    expect(REALMS).toHaveLength(6)
    expect(REALMS[0].name).toBe('炼气期')
    expect(REALMS[0].cultivationCosts).toEqual([100, 300, 600, 1000])
    expect(REALMS[1].cultivationCosts).toEqual([2000, 4000, 7000, 11000])
  })

  it('should define enhance rates for +1 to +15', () => {
    expect(ENHANCE_RATES).toHaveLength(15)
    expect(ENHANCE_RATES[0]).toBe(1.0) // +1 = 100%
    expect(ENHANCE_RATES[4]).toBe(1.0) // +5 = 100%
    expect(ENHANCE_RATES[5]).toBe(0.9) // +6 = 90%
  })

  it('should define all 8 building types', () => {
    expect(BUILDING_DEFS).toHaveLength(8)
    expect(BUILDING_DEFS[0].type).toBe('mainHall')
    expect(BUILDING_DEFS[0].maxLevel).toBe(10)
  })

  it('should define 6 dungeons with ascending difficulty', () => {
    expect(DUNGEONS).toHaveLength(6)
    expect(DUNGEONS[0].totalLayers).toBe(5)
    expect(DUNGEONS[5].totalLayers).toBe(20)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/data.test.ts`
Expected: FAIL

- [ ] **Step 3: Create src/data/realms.ts**

```typescript
import type { RealmStage } from '../types/player'

export interface RealmDef {
  name: string
  stages: string[]
  cultivationCosts: number[] // per sub-level
  breakthroughExtra: string | null // description of extra requirement
  unlockContent: string
  tribulationPower?: number // enemy power multiplier (0.8 = 80% of player)
  tribulationStages?: number[] // for multi-stage tribulations
  statMultiplier: number // stat growth per major realm
}

export const REALMS: RealmDef[] = [
  {
    name: '炼气期',
    stages: ['初期', '中期', '后期', '圆满'],
    cultivationCosts: [100, 300, 600, 1000],
    breakthroughExtra: null,
    unlockContent: '基础功法、灵品装备掉落',
    statMultiplier: 1,
  },
  {
    name: '筑基期',
    stages: ['初期', '中期', '后期', '圆满'],
    cultivationCosts: [2000, 4000, 7000, 11000],
    breakthroughExtra: '筑基丹 ×1',
    unlockContent: '秘境解锁（落云洞）',
    statMultiplier: 1.8,
  },
  {
    name: '金丹期',
    stages: ['初期', '中期', '后期', '圆满'],
    cultivationCosts: [18000, 28000, 40000, 55000],
    breakthroughExtra: '金丹劫（敌人战力=自身×0.8）',
    unlockContent: '灵宠系统',
    tribulationPower: 0.8,
    statMultiplier: 1.8,
  },
  {
    name: '元婴期',
    stages: ['初期', '中期', '后期', '圆满'],
    cultivationCosts: [75000, 100000, 130000, 170000],
    breakthroughExtra: '元婴劫（敌人战力=自身×1.0）',
    unlockContent: '弟子系统（经营线）',
    tribulationPower: 1.0,
    statMultiplier: 1.8,
  },
  {
    name: '化神期',
    stages: ['初期', '中期', '后期', '圆满'],
    cultivationCosts: [220000, 280000, 350000, 450000],
    breakthroughExtra: '天劫（3阶段战斗）',
    unlockContent: '高级功法、飞剑',
    tribulationStages: [1.0, 1.2, 1.5],
    statMultiplier: 1.8,
  },
  {
    name: '渡劫飞升',
    stages: ['飞升'],
    cultivationCosts: [600000],
    breakthroughExtra: '全建筑满级',
    unlockContent: '游戏通关',
    statMultiplier: 1.8,
  },
]

export const STAGE_NAMES: RealmStage[] = [0, 1, 2, 3] as RealmStage[]

export function getRealmName(realmIndex: number, stage: RealmStage): string {
  const realm = REALMS[realmIndex]
  if (!realm) return '未知'
  const stageName = realm.stages[stage] ?? ''
  return `${realm.name} ${stageName}`
}

export function getCultivationNeeded(realmIndex: number, stage: number): number {
  return REALMS[realmIndex]?.cultivationCosts[stage] ?? Infinity
}
```

- [ ] **Step 4: Create src/data/items.ts**

```typescript
import type { ItemQuality } from '../types/item'

export const QUALITY_ORDER: ItemQuality[] = ['common', 'spirit', 'immortal', 'divine', 'chaos']

export const QUALITY_NAMES: Record<ItemQuality, string> = {
  common: '凡品',
  spirit: '灵品',
  immortal: '仙品',
  divine: '神品',
  chaos: '混沌',
}

export const QUALITY_COLORS: Record<ItemQuality, string> = {
  common: 'var(--color-quality-common)',
  spirit: 'var(--color-quality-spirit)',
  immortal: 'var(--color-quality-immortal)',
  divine: 'var(--color-quality-divine)',
  chaos: 'var(--color-quality-chaos)',
}

// Enhancement success rates: index 0 = +1, index 14 = +15
export const ENHANCE_RATES: number[] = [
  1.0, 1.0, 1.0, 1.0, 1.0,   // +1~+5: 100%
  0.9, 0.86, 0.82, 0.78, 0.74, // +6~+10: 90% → 74%
  0.6, 0.5, 0.4, 0.3, 0.2,     // +11~+15: 60% → 20%
]

export function getEnhanceRate(level: number): number {
  if (level < 1 || level > 15) return 0
  return ENHANCE_RATES[level - 1]
}

export const EQUIP_SLOTS = [
  'head', 'armor', 'bracer', 'belt', 'boots',
  'weapon', 'accessory1', 'accessory2', 'talisman',
] as const

export const EQUIP_SLOT_NAMES: Record<string, string> = {
  head: '头冠', armor: '道袍', bracer: '护腕', belt: '腰带',
  boots: '鞋子', weapon: '武器', accessory1: '饰品', accessory2: '饰品', talisman: '法宝',
}

// Placeholder item templates — more items will be added in Phase 3
export const ITEM_TEMPLATES: Array<{
  id: string; name: string; quality: ItemQuality; slot: string
  stats: { hp: number; atk: number; def: number; spd: number }
}> = [
  { id: 'wooden_sword', name: '木剑', quality: 'common', slot: 'weapon', stats: { hp: 0, atk: 5, def: 0, spd: 0 } },
  { id: 'blue_steel_sword', name: '青钢剑', quality: 'spirit', slot: 'weapon', stats: { hp: 0, atk: 15, def: 0, spd: 2 } },
  { id: 'cloth_robe', name: '布衣', quality: 'common', slot: 'armor', stats: { hp: 20, atk: 0, def: 3, spd: 0 } },
  { id: 'spirit_robe', name: '灵纹道袍', quality: 'spirit', slot: 'armor', stats: { hp: 50, atk: 0, def: 10, spd: 0 } },
]
```

- [ ] **Step 5: Create src/data/skills.ts**

```typescript
import type { TechniqueType } from '../types/skill'

// Placeholder data — more skills will be added in Phase 4
export const TECHNIQUE_TYPE_NAMES: Record<TechniqueType, string> = {
  mental: '心法',
  body: '体修',
  spiritual: '神识',
}

export const TECHNIQUE_TIER_NAMES = ['初级', '中级', '高级', '顶级']

export const ELEMENT_NAMES: Record<string, string> = {
  fire: '火',
  ice: '冰',
  lightning: '雷',
  healing: '治愈',
}

// Five-element counter relationships
export const COUNTER_MAP: Record<string, string> = {
  fire: 'ice',
  ice: 'lightning',
  lightning: 'fire',
  healing: 'neutral',
}

export function getElementMultiplier(attackerElement: string, defenderElement: string): number {
  if (attackerElement === 'healing' || defenderElement === 'healing') return 1.0
  if (COUNTER_MAP[attackerElement] === defenderElement) return 1.5
  if (COUNTER_MAP[defenderElement] === attackerElement) return 0.75
  return 1.0
}
```

- [ ] **Step 6: Create src/data/buildings.ts**

```typescript
import type { BuildingType } from '../types/sect'

export interface BuildingDef {
  type: BuildingType
  name: string
  description: string
  maxLevel: number
  upgradeCost: (level: number) => { spiritStone: number }
  unlockCondition: string
}

export const BUILDING_DEFS: BuildingDef[] = [
  {
    type: 'mainHall',
    name: '宗门大殿',
    description: '宗门核心建筑，决定其他建筑等级上限',
    maxLevel: 10,
    upgradeCost: (lv) => ({ spiritStone: 100 * lv }),
    unlockCondition: '初始',
  },
  {
    type: 'spiritField',
    name: '灵田',
    description: '产出灵草和灵材',
    maxLevel: 10,
    upgradeCost: (lv) => ({ spiritStone: 80 * lv }),
    unlockCondition: '大殿 Lv1',
  },
  {
    type: 'market',
    name: '坊市',
    description: 'NPC 商店，购买物资',
    maxLevel: 8,
    upgradeCost: (lv) => ({ spiritStone: 100 * lv }),
    unlockCondition: '大殿 Lv1',
  },
  {
    type: 'alchemyFurnace',
    name: '丹炉',
    description: '炼制丹药',
    maxLevel: 8,
    upgradeCost: (lv) => ({ spiritStone: 150 * lv, herb: 10 * lv }),
    unlockCondition: '大殿 Lv2 + 灵田 Lv2',
  },
  {
    type: 'forge',
    name: '炼器坊',
    description: '锻造和强化装备',
    maxLevel: 8,
    upgradeCost: (lv) => ({ spiritStone: 150 * lv, ore: 10 * lv }),
    unlockCondition: '大殿 Lv2 + 拥有凡品弟子×2',
  },
  {
    type: 'scriptureHall',
    name: '藏经阁',
    description: '学习功法',
    maxLevel: 8,
    upgradeCost: (lv) => ({ spiritStone: 200 * lv }),
    unlockCondition: '大殿 Lv3 + 拥有灵品弟子×1',
  },
  {
    type: 'recruitmentPavilion',
    name: '聚仙台',
    description: '招募弟子',
    maxLevel: 6,
    upgradeCost: (lv) => ({ spiritStone: 300 * lv }),
    unlockCondition: '大殿 Lv3 + 炼器坊 Lv2',
  },
  {
    type: 'trainingHall',
    name: '传功殿',
    description: '弟子修炼和派遣',
    maxLevel: 6,
    upgradeCost: (lv) => ({ spiritStone: 250 * lv }),
    unlockCondition: '大殿 Lv4 + 拥有灵品弟子×3',
  },
]

export function getBuildingDef(type: BuildingType): BuildingDef | undefined {
  return BUILDING_DEFS.find((b) => b.type === type)
}
```

- [ ] **Step 7: Create src/data/events.ts**

```typescript
import type { Dungeon } from '../types/adventure'

export const DUNGEONS: Dungeon[] = [
  {
    id: 'lingCaoValley',
    name: '灵草谷',
    totalLayers: 5,
    eventsPerLayer: 3,
    unlockRealm: 0,
    unlockStage: 3,
    lootTable: [],
  },
  {
    id: 'luoYunCave',
    name: '落云洞',
    totalLayers: 8,
    eventsPerLayer: 3,
    unlockRealm: 1,
    unlockStage: 3,
    lootTable: [],
  },
  {
    id: 'bloodDemonAbyss',
    name: '血魔渊',
    totalLayers: 10,
    eventsPerLayer: 4,
    unlockRealm: 2,
    unlockStage: 3,
    lootTable: [],
  },
  {
    id: 'dragonBoneWasteland',
    name: '龙骨荒原',
    totalLayers: 12,
    eventsPerLayer: 4,
    unlockRealm: 3,
    unlockStage: 3,
    lootTable: [],
  },
  {
    id: 'nineNetherPurgatory',
    name: '九幽炼狱',
    totalLayers: 15,
    eventsPerLayer: 5,
    unlockRealm: 4,
    unlockStage: 3,
    lootTable: [],
  },
  {
    id: 'heavenlyTribulationRealm',
    name: '天劫秘境',
    totalLayers: 20,
    eventsPerLayer: 5,
    unlockRealm: 5,
    unlockStage: 3,
    lootTable: [],
  },
]
```

- [ ] **Step 8: Create src/data/enemies.ts**

```typescript
// Placeholder — more enemy data added in Phase 7
export const ENEMY_TEMPLATES = [
  {
    id: 'wild_spirit_beast',
    name: '灵兽',
    element: 'neutral',
    stats: { hp: 50, atk: 8, def: 4, spd: 6 },
    isBoss: false,
  },
  {
    id: 'cave_demon',
    name: '洞妖',
    element: 'fire',
    stats: { hp: 120, atk: 18, def: 10, spd: 8 },
    isBoss: false,
  },
  {
    id: 'spirit_boss',
    name: '灵脉守卫',
    element: 'lightning',
    stats: { hp: 500, atk: 40, def: 25, spd: 12 },
    isBoss: true,
  },
]

export function scaleEnemy(baseStats: { hp: number; atk: number; def: number; spd: number }, layer: number) {
  const mult = 1 + 0.08 * layer
  return {
    hp: Math.floor(baseStats.hp * mult),
    atk: Math.floor(baseStats.atk * mult),
    def: Math.floor(baseStats.def * mult),
    spd: Math.floor(baseStats.spd * mult),
  }
}
```

- [ ] **Step 9: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/data.test.ts`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add src/data/ src/__tests__/data.test.ts
git commit -m "feat: add static game data for realms, items, skills, buildings, dungeons"
```

---

### Task 5: Zustand Stores

**Files:**
- Create: `src/stores/gameStore.ts`
- Create: `src/stores/playerStore.ts`
- Create: `src/stores/inventoryStore.ts`
- Create: `src/stores/sectStore.ts`
- Create: `src/stores/adventureStore.ts`
- Test: `src/__tests__/stores.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/stores.test.ts`:
```typescript
import { useGameStore } from '../stores/gameStore'
import { usePlayerStore } from '../stores/playerStore'
import { useInventoryStore } from '../stores/inventoryStore'
import { useSectStore } from '../stores/sectStore'

describe('Zustand stores initialization', () => {
  beforeEach(() => {
    useGameStore.getState().reset()
    usePlayerStore.getState().reset()
    useInventoryStore.getState().reset()
    useSectStore.getState().reset()
  })

  it('gameStore should initialize with default settings', () => {
    const state = useGameStore.getState()
    expect(state.saveSlot).toBe(1)
    expect(state.lastOnlineTime).toBeGreaterThan(0)
  })

  it('playerStore should have correct initial stats', () => {
    const state = usePlayerStore.getState()
    expect(state.player.baseStats.hp).toBe(100)
    expect(state.player.baseStats.atk).toBe(15)
    expect(state.player.cultivationStats.maxSpiritPower).toBe(50)
  })

  it('inventoryStore should start with 50 slots', () => {
    const state = useInventoryStore.getState()
    expect(state.maxSlots).toBe(50)
    expect(state.items).toHaveLength(0)
  })

  it('sectStore should have mainHall unlocked at level 1', () => {
    const state = useSectStore.getState()
    const mainHall = state.buildings.find((b) => b.type === 'mainHall')
    expect(mainHall?.level).toBe(1)
    expect(mainHall?.unlocked).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/stores.test.ts`
Expected: FAIL

- [ ] **Step 3: Create src/stores/gameStore.ts**

```typescript
import { create } from 'zustand'

interface GameState {
  saveSlot: number
  lastOnlineTime: number
  isPaused: boolean
  setSaveSlot: (slot: number) => void
  updateLastOnlineTime: () => void
  setPaused: (paused: boolean) => void
  reset: () => void
}

const initialState = {
  saveSlot: 1,
  lastOnlineTime: Date.now(),
  isPaused: false,
}

export const useGameStore = create<GameState>((set) => ({
  ...initialState,
  setSaveSlot: (slot) => set({ saveSlot: slot }),
  updateLastOnlineTime: () => set({ lastOnlineTime: Date.now() }),
  setPaused: (paused) => set({ isPaused: paused }),
  reset: () => set(initialState),
}))
```

- [ ] **Step 4: Create src/stores/playerStore.ts**

```typescript
import { create } from 'zustand'
import type { Player } from '../types/player'

interface PlayerState {
  player: Player
  updateCultivation: (amount: number) => void
  advanceStage: () => void
  advanceRealm: () => void
  reset: () => void
}

function createInitialPlayer(): Player {
  return {
    id: 'player_1',
    name: '无名修士',
    realm: 0,
    realmStage: 0,
    cultivation: 0,
    baseStats: { hp: 100, atk: 15, def: 8, spd: 10, crit: 0.05, critDmg: 1.5 },
    cultivationStats: {
      spiritPower: 50,
      maxSpiritPower: 50,
      comprehension: 10,
      spiritualRoot: 10,
      fortune: 5,
    },
    equippedTechniques: [null, null, null],
    equippedSkills: [null, null, null, null, null],
    equippedGear: [null, null, null, null, null, null, null, null, null],
    partyPets: [null, null],
    partyDisciple: null,
  }
}

export const usePlayerStore = create<PlayerState>((set) => ({
  player: createInitialPlayer(),
  updateCultivation: (amount) =>
    set((state) => ({
      player: { ...state.player, cultivation: state.player.cultivation + amount },
    })),
  advanceStage: () =>
    set((state) => {
      const newStage = state.player.realmStage + 1
      return {
        player: {
          ...state.player,
          realmStage: newStage as 0 | 1 | 2 | 3,
          cultivation: 0,
        },
      }
    }),
  advanceRealm: () =>
    set((state) => ({
      player: {
        ...state.player,
        realm: state.player.realm + 1,
        realmStage: 0,
        cultivation: 0,
      },
    })),
  reset: () => set({ player: createInitialPlayer() }),
}))
```

- [ ] **Step 5: Create src/stores/inventoryStore.ts**

```typescript
import { create } from 'zustand'
import type { AnyItem, Resources } from '../types'

interface InventoryState {
  items: AnyItem[]
  maxSlots: number
  resources: Resources
  addItem: (item: AnyItem) => boolean
  removeItem: (index: number) => AnyItem | null
  addResource: (type: keyof Resources, amount: number) => void
  spendResource: (type: keyof Resources, amount: number) => boolean
  reset: () => void
}

const initialResources: Resources = {
  spiritStone: 500,
  spiritEnergy: 0,
  herb: 0,
  ore: 0,
  fairyJade: 0,
  scrollFragment: 0,
  heavenlyTreasure: 0,
  beastSoul: 0,
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  items: [],
  maxSlots: 50,
  resources: { ...initialResources },
  addItem: (item) => {
    if (get().items.length >= get().maxSlots) return false
    set((s) => ({ items: [...s.items, item] }))
    return true
  },
  removeItem: (index) => {
    const item = get().items[index]
    if (!item) return null
    set((s) => ({ items: s.items.filter((_, i) => i !== index) }))
    return item
  },
  addResource: (type, amount) =>
    set((s) => ({
      resources: { ...s.resources, [type]: s.resources[type] + amount },
    })),
  spendResource: (type, amount) => {
    const current = get().resources[type]
    if (current < amount) return false
    set((s) => ({
      resources: { ...s.resources, [type]: current - amount },
    }))
    return true
  },
  reset: () => set({ items: [], maxSlots: 50, resources: { ...initialResources } }),
}))
```

- [ ] **Step 6: Create src/stores/sectStore.ts**

```typescript
import { create } from 'zustand'
import type { Building, BuildingType, Disciple, Resources } from '../types'
import { BUILDING_DEFS } from '../data/buildings'

interface SectState {
  buildings: Building[]
  disciples: Disciple[]
  resources: Resources
  discipleMaxOwned: Record<string, number>
  upgradeBuilding: (type: BuildingType) => boolean
  reset: () => void
}

function createInitialBuildings(): Building[] {
  return BUILDING_DEFS.map((def) => ({
    type: def.type,
    level: def.type === 'mainHall' ? 1 : 0,
    unlocked: def.type === 'mainHall',
  }))
}

export const useSectStore = create<SectState>((set, get) => ({
  buildings: createInitialBuildings(),
  disciples: [],
  resources: { spiritStone: 500, spiritEnergy: 0, herb: 0, ore: 0, fairyJade: 0, scrollFragment: 0, heavenlyTreasure: 0, beastSoul: 0 },
  discipleMaxOwned: { common: 0, spirit: 0, immortal: 0, divine: 0 },
  upgradeBuilding: (type) => {
    const building = get().buildings.find((b) => b.type === type)
    if (!building || !building.unlocked) return false
    const def = BUILDING_DEFS.find((d) => d.type === type)
    if (!def || building.level >= def.maxLevel) return false
    const cost = def.upgradeCost(building.level)
    if (get().resources.spiritStone < cost.spiritStone) return false
    set((s) => ({
      buildings: s.buildings.map((b) =>
        b.type === type ? { ...b, level: b.level + 1 } : b,
      ),
      resources: { ...s.resources, spiritStone: s.resources.spiritStone - cost.spiritStone },
    }))
    return true
  },
  reset: () =>
    set({
      buildings: createInitialBuildings(),
      disciples: [],
      resources: { spiritStone: 500, spiritEnergy: 0, herb: 0, ore: 0, fairyJade: 0, scrollFragment: 0, heavenlyTreasure: 0, beastSoul: 0 },
      discipleMaxOwned: { common: 0, spirit: 0, immortal: 0, divine: 0 },
    }),
}))
```

- [ ] **Step 7: Create src/stores/adventureStore.ts**

```typescript
import { create } from 'zustand'
import type { DungeonRun } from '../types'

interface AdventureState {
  currentRun: DungeonRun | null
  completedDungeons: string[]
  startRun: (dungeonId: string, mode: 'idle' | 'manual') => void
  endRun: () => void
  reset: () => void
}

export const useAdventureStore = create<AdventureState>((set) => ({
  currentRun: null,
  completedDungeons: [],
  startRun: (dungeonId, mode) =>
    set({
      currentRun: {
        dungeonId,
        currentLayer: 1,
        teamHp: [],
        mode,
        buffs: [],
        tempSkills: [],
        currency: 0,
        startedAt: Date.now(),
        paused: false,
      },
    }),
  endRun: () =>
    set((s) => ({
      currentRun: null,
      completedDungeons: s.currentRun
        ? [...s.completedDungeons, s.currentRun.dungeonId]
        : s.completedDungeons,
    })),
  reset: () => set({ currentRun: null, completedDungeons: [] }),
}))
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/stores.test.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/stores/ src/__tests__/stores.test.ts
git commit -m "feat: add Zustand stores for player, inventory, sect, adventure, and game state"
```

---

### Task 6: Common UI Components

**Files:**
- Create: `src/components/common/ProgressBar.tsx`
- Create: `src/components/common/ProgressBar.module.css`
- Create: `src/components/common/BottomNav.tsx`
- Create: `src/components/common/BottomNav.module.css`
- Create: `src/components/common/TopBar.tsx`
- Create: `src/components/common/TopBar.module.css`

- [ ] **Step 1: Create ProgressBar**

`src/components/common/ProgressBar.module.css`:
```css
.bar {
  width: 100%;
  height: 8px;
  background: var(--color-border-light);
  border-radius: 4px;
  overflow: hidden;
}

.fill {
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, var(--color-border), var(--color-accent));
  transition: width var(--transition-normal);
}

.fillInk {
  background: linear-gradient(90deg, #2c2c2c, #6b6b6b);
}
```

`src/components/common/ProgressBar.tsx`:
```tsx
import styles from './ProgressBar.module.css'

interface ProgressBarProps {
  value: number
  max: number
  variant?: 'default' | 'ink'
  className?: string
}

export default function ProgressBar({ value, max, variant = 'default', className }: ProgressBarProps) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className={`${styles.bar} ${className ?? ''}`}>
      <div
        className={`${styles.fill} ${variant === 'ink' ? styles.fillInk : ''}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Create BottomNav**

`src/components/common/BottomNav.module.css`:
```css
.nav {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 480px;
  display: flex;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  border-top: 1px solid var(--color-border-light);
  z-index: 100;
  padding-bottom: env(safe-area-inset-bottom);
}

.navItem {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 0;
  color: var(--color-text-tertiary);
  font-size: 11px;
  text-decoration: none;
  transition: color var(--transition-fast);
  min-height: 44px;
  justify-content: center;
}

.navItem:hover {
  color: var(--color-text-secondary);
}

.active {
  color: var(--color-accent);
  border-bottom: 2px solid var(--color-accent);
}

.icon {
  font-size: 20px;
  line-height: 1;
}
```

`src/components/common/BottomNav.tsx`:
```tsx
import { NavLink } from 'react-router-dom'
import styles from './BottomNav.module.css'

const tabs = [
  { to: '/', icon: '🏛️', label: '大殿' },
  { to: '/cultivation', icon: '⚔️', label: '修炼' },
  { to: '/sect', icon: '🏔️', label: '宗门' },
  { to: '/adventure', icon: '🗡️', label: '冒险' },
  { to: '/inventory', icon: '🎒', label: '背包' },
]

export default function BottomNav() {
  return (
    <nav className={styles.nav}>
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        >
          <span className={styles.icon}>{tab.icon}</span>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 3: Create TopBar**

`src/components/common/TopBar.module.css`:
```css
.topBar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-sm) var(--space-md);
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--color-border-light);
  position: sticky;
  top: 0;
  z-index: 50;
}

.title {
  font-family: var(--font-serif);
  font-size: 16px;
  color: var(--color-accent);
  font-weight: 700;
}

.resources {
  display: flex;
  gap: var(--space-sm);
  font-size: 12px;
  color: var(--color-text-secondary);
}

.resourceItem {
  display: flex;
  align-items: center;
  gap: 2px;
}
```

`src/components/common/TopBar.tsx`:
```tsx
import { useInventoryStore } from '../../stores/inventoryStore'
import styles from './TopBar.module.css'

export default function TopBar() {
  const resources = useInventoryStore((s) => s.resources)

  return (
    <header className={styles.topBar}>
      <div className={styles.title}>🗡️ 无尽仙途</div>
      <div className={styles.resources}>
        <span className={styles.resourceItem}>💰 {resources.spiritStone.toLocaleString()}</span>
        <span className={styles.resourceItem}>💎 {resources.fairyJade}</span>
      </div>
    </header>
  )
}
```

- [ ] **Step 4: Verify visually**

Run: `npm run dev` — components will render once App.tsx is updated in Task 7

- [ ] **Step 5: Commit**

```bash
git add src/components/common/
git commit -m "feat: add common UI components — ProgressBar, BottomNav, TopBar"
```

---

### Task 7: App Shell + Routing + Pages

**Files:**
- Create: `src/App.tsx` (update)
- Create: `src/components/character/PlayerInfo.tsx`
- Create: `src/components/character/PlayerInfo.module.css`
- Create: `src/pages/MainHall.tsx`
- Create: `src/pages/MainHall.module.css`
- Create: `src/pages/Cultivation.tsx`
- Create: `src/pages/Sect.tsx`
- Create: `src/pages/Adventure.tsx`
- Create: `src/pages/Inventory.tsx`

- [ ] **Step 1: Create PlayerInfo component**

`src/components/character/PlayerInfo.module.css`:
```css
.container {
  background: var(--color-panel);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  display: flex;
  gap: var(--space-md);
  align-items: center;
  box-shadow: var(--shadow-sm);
}

.avatar {
  width: 56px;
  height: 56px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-paper);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  flex-shrink: 0;
}

.info {
  flex: 1;
  min-width: 0;
}

.name {
  font-family: var(--font-serif);
  font-size: 14px;
  font-weight: 700;
  color: var(--color-accent);
}

.realm {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 2px;
}

.stats {
  font-size: 11px;
  color: var(--color-text-tertiary);
  margin-top: 4px;
  display: flex;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.stat {
  display: flex;
  gap: 2px;
}

.statLabel {
  color: var(--color-text-tertiary);
}

.statValue {
  color: var(--color-text);
  font-weight: 500;
}
```

`src/components/character/PlayerInfo.tsx`:
```tsx
import { usePlayerStore } from '../../stores/playerStore'
import { getRealmName } from '../../data/realms'
import ProgressBar from '../common/ProgressBar'
import { getCultivationNeeded } from '../../data/realms'
import styles from './PlayerInfo.module.css'

export default function PlayerInfo() {
  const player = usePlayerStore((s) => s.player)
  const realmName = getRealmName(player.realm, player.realmStage)
  const needed = getCultivationNeeded(player.realm, player.realmStage)

  return (
    <div className={styles.container}>
      <div className={styles.avatar}>🧑‍🦱</div>
      <div className={styles.info}>
        <div className={styles.name}>{player.name}</div>
        <div className={styles.realm}>{realmName}</div>
        <div className={styles.stats}>
          <span className={styles.stat}><span className={styles.statLabel}>HP</span> <span className={styles.statValue}>{player.baseStats.hp}</span></span>
          <span className={styles.stat}><span className={styles.statLabel}>ATK</span> <span className={styles.statValue}>{player.baseStats.atk}</span></span>
          <span className={styles.stat}><span className={styles.statLabel}>DEF</span> <span className={styles.statValue}>{player.baseStats.def}</span></span>
          <span className={styles.stat}><span className={styles.statLabel}>SPD</span> <span className={styles.statValue}>{player.baseStats.spd}</span></span>
        </div>
        <ProgressBar value={player.cultivation} max={needed} variant="ink" />
        <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
          修为 {player.cultivation.toLocaleString()} / {needed.toLocaleString()}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create placeholder pages**

`src/pages/Cultivation.tsx`:
```tsx
export default function Cultivation() {
  return <div className="page-content"><h2 style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', marginTop: '20vh' }}>修炼 — 开发中</h2></div>
}
```

`src/pages/Sect.tsx`:
```tsx
export default function Sect() {
  return <div className="page-content"><h2 style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', marginTop: '20vh' }}>宗门 — 开发中</h2></div>
}
```

`src/pages/Adventure.tsx`:
```tsx
export default function Adventure() {
  return <div className="page-content"><h2 style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', marginTop: '20vh' }}>冒险 — 开发中</h2></div>
}
```

`src/pages/Inventory.tsx`:
```tsx
export default function Inventory() {
  return <div className="page-content"><h2 style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', marginTop: '20vh' }}>背包 — 开发中</h2></div>
}
```

- [ ] **Step 3: Create MainHall page**

`src/pages/MainHall.module.css`:
```css
.main {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.section {
  background: var(--color-panel);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  box-shadow: var(--shadow-sm);
}

.sectionTitle {
  font-family: var(--font-serif);
  font-size: 14px;
  font-weight: 700;
  color: var(--color-accent);
  margin-bottom: var(--space-sm);
}

.resourceBar {
  display: flex;
  gap: var(--space-md);
  font-size: 12px;
  color: var(--color-text-secondary);
}

.resourceItem {
  display: flex;
  align-items: center;
  gap: 4px;
}

.rate {
  color: var(--color-success);
  font-size: 11px;
}
```

`src/pages/MainHall.tsx`:
```tsx
import PlayerInfo from '../components/character/PlayerInfo'
import { useInventoryStore } from '../stores/inventoryStore'
import styles from './MainHall.module.css'

export default function MainHall() {
  const resources = useInventoryStore((s) => s.resources)

  return (
    <div className="page-content">
      <div className={styles.main}>
        <PlayerInfo />

        <div className={styles.section}>
          <div className={styles.sectionTitle}>资源概览</div>
          <div className={styles.resourceBar}>
            <span className={styles.resourceItem}>🔵 灵气 {resources.spiritEnergy}</span>
            <span className={styles.resourceItem}>🌿 灵草 {resources.herb}</span>
            <span className={styles.resourceItem}>⛏️ 矿材 {resources.ore}</span>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>宗门动态</div>
          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>暂无动态</p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Update App.tsx with routing**

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import TopBar from './components/common/TopBar'
import BottomNav from './components/common/BottomNav'
import MainHall from './pages/MainHall'
import Cultivation from './pages/Cultivation'
import Sect from './pages/Sect'
import Adventure from './pages/Adventure'
import Inventory from './pages/Inventory'

export default function App() {
  return (
    <BrowserRouter>
      <TopBar />
      <Routes>
        <Route path="/" element={<MainHall />} />
        <Route path="/cultivation" element={<Cultivation />} />
        <Route path="/sect" element={<Sect />} />
        <Route path="/adventure" element={<Adventure />} />
        <Route path="/inventory" element={<Inventory />} />
      </Routes>
      <BottomNav />
    </BrowserRouter>
  )
}
```

- [ ] **Step 5: Verify app runs**

Run: `npm run dev`
Expected: Browser shows ink-wash themed app with TopBar, MainHall (player info, resources), BottomNav, and 4 placeholder pages. Navigation between pages works.

- [ ] **Step 6: Run all tests**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/pages/ src/components/character/
git commit -m "feat: add App shell with routing, MainHall page, and placeholder pages"
```

---

### Task 8: Clean Up & Final Verification

- [ ] **Step 1: Run all tests**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Verify dev server**

Run: `npm run dev`
Expected: All pages render correctly with ink-wash theme

- [ ] **Step 4: Remove old scaffolding files**

Delete `src/index.ts` (replaced by `src/main.tsx`).

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: clean up scaffolding, verify all tests and build pass"
```
