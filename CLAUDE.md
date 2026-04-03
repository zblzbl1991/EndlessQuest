# Project: EndlessQuest

仙侠放置 Roguelike Web 游戏。

## 技术架构

React 19 + TypeScript + Zustand + CSS Modules + Vitest + IndexedDB

## 当前状态

核心产品重构已完成（2026-03-27 ~ 03-29），项目已具备完整的核心循环：

- **宗门总览**：SectPage 已收束为轻提示总览，经营、弟子、冒险三类各展示 1 条代表性变化
- **秘境意图**：出发前以 `守成 / 争锋 / 寻机` 表达本局意图，局内自动执行
- **弟子判断**：弟子页强调 `留守价值 / 出战价值 / 承险能力`，减少系统替玩家下结论
- **宗门路线**：丹道/剑道/御兽三条路线，各含解锁节点
- **战报归因**：战报会归纳关键弟子、转折点与成败原因
- **宗门历史**：里程碑记录（首次招募/渡劫/boss 通关）

详见 `docs/superpowers/specs/2026-03-30-core-product-overhaul-completion.md`。

## 下一步

角色成长深度设计（P2）：修炼路线、元素亲和、技能装备、宠物战斗集成、精炼系统、套装加成、天赋扩展、功法参悟度。详见 `docs/superpowers/specs/2026-03-29-character-progression-design.md`。

## 设计上下文

### 用户
仙侠放置游戏爱好者与 Roguelike 策略玩家的交集人群。熟悉修仙放置/挂机类手游，也喜欢以撒、杀戮尖塔等 Roguelike 的策略深度。主要在碎片时间和晚间放松时段游玩，希望用很少的操作完成真实的经营判断、弟子培养和单局冒险押注。

### 品牌气质
**古朴、禅意、有力量感**

### 美术方向
浅色水墨风格 + 仙侠手游 UI 布局。日常壳层以 `清墨轻岚` 为基底：冷宣纸白、雾青灰、浅墨蓝构成清淡素雅的日常界面；赭石 / 印泥色只保留给关键主操作、完成反馈和里程碑高光。避免 MMO 式重度 UI（太多按钮/弹窗/数字堆砌/满屏发光特效），也避免首页或面板过度指导用户“该做什么”。移动端底部标签栏 + 桌面端左侧侧边栏，CSS 响应式切换，图标与导航语汇必须统一在同一套水墨世界观内，也不要混入通用蓝紫后备色。

### 响应式策略
- **断点**：640px（移动/平板）、1024px（平板/桌面）
- **移动端（< 640px）**：底部标签导航、单列布局、底部抽屉弹窗、44px 最小触控区域
- **平板端（640-1023px）**：继续使用底部标签导航，但内容宽度、摘要区和列表组织必须明显强于手机，至少进入稳定的双列或主次并排结构
- **桌面端（≥ 1024px）**：左侧固定侧边栏导航、多列网格、面板并排、居中弹窗；宽屏空间优先用于持续可见的宗门上下文、摘要和并排信息，而不是简单居中放大移动端布局
- **参考风格**：修仙手游 PC 模拟器的原生化适配

### 设计原则

1. **留白即呼吸** — 水墨画的灵魂在于留白。UI 通过充足的间距和留白让界面"透气"。信息密度适度，宁可多一层点击也不要一次展示太多。
2. **水墨晕染，不张扬** — 视觉效果以水墨质感为主（渐变、晕染、淡入淡出）。日常界面保持清淡素雅，避免霓虹发光、厚重描边、过度饱和的颜色。
3. **关键时刻，浓墨重彩** — 日常界面保持禅意和克制，但境界突破、通关秘境、获得稀有物品等成就时刻必须有强烈的视觉反馈。反差越大，冲击越强。
4. **信息层级如山水远近** — 像山水画有近景中景远景，UI 有清晰的层级关系。最重要的信息最近最清晰，次要信息渐远渐淡，避免所有模块都长得一样重。
5. **少指挥，多呈现** — 界面要展示变化、风险、收获和倾向，而不是替玩家排优先级。首页和详情页都应尽量减少“建议去做什么”的任务感。
6. **宗门先于工具** — 导航、页头、卡片和弹层都应先服务于“这是一个宗门”的感受，再服务于工具组织。避免表情符号、临时图标和后台管理台式的壳子。
7. **移动优先，逐级增强** — 基础布局以移动端为起点，通过 `min-width` 媒体查询逐步增强桌面端体验。移动端底部导航，桌面端侧边栏导航，CSS 响应式切换。
8. **宽屏不浪费** — 桌面端不简单居中放大移动端布局，而是重新组织信息：列表变多列网格、面板可并排、详情可侧滑展开。保持禅意克制，不因空间充裕而堆砌信息。
9. **可操作即可见** — 玩家可执行的操作（建造、升级、锻造等）必须有明确的主强调色实心按钮提示，不可操作时切换为灰底灰字禁用态。所有按钮必须有 ready/disabled 两种状态，不能回归浏览器默认样式。
10. **平板不是放大的手机** — `640-1023px` 区间必须被单独设计，不能继续沿用 `max-width: 480px` 的手机容器和纯单列节奏。
11. **日常清墨，高光落印** — 日常页面保持清墨轻岚的呼吸感，关键时刻再用更重的印泥 / 浓墨反差抬高仪式感，不能让所有场景都停留在同一强度。

### 像素图标系统
- **风格**：水墨像素 — 像素图标使用项目水墨配色（冷宣纸白、浅墨蓝、雾青灰、受控赭石高光），不使用鲜艳复古色
- **格式**：React SVG 组件，24×24 viewBox，`shape-rendering: crispEdges`
- **调色板**：复用 `theme.css` 的 `--color-accent`（日常主强调）、`--color-text`（墨色）、`--color-quality-*`（品质色）、`--color-bg`（纸色）等变量；日常图标优先跟随清墨轻岚基线，赭石 / 印泥只保留给高光语境
- **类别**：建筑(8)、境界(6)、角色状态(8)、品质(5)、装备槽位(9)、元素(5)、资源(4)、系统界面等
- **组件**：`<PixelIcon name="..." size={24} />` 统一入口，支持 variant 属性切换品质/元素配色

## 设计文档

- 完成总结：`docs/superpowers/specs/2026-03-30-core-product-overhaul-completion.md`
- 下一步设计：`docs/superpowers/specs/2026-03-29-character-progression-design.md`
- 已归档方案：`docs/superpowers/specs/2026-03-27-core-product-overhaul.md`
- 已归档路线图：`docs/superpowers/plans/2026-03-27-core-product-overhaul-roadmap.md`

## Project

**EndlessQuest**

仙侠放置 Roguelike Web 游戏。玩家以宗门为单位经营弟子、修炼突破、组建队伍探索秘境，在碎片时间完成经营判断和单局冒险押注。水墨风格 UI，移动端底部导航 + 桌面端侧边栏。

**Core Value:** 玩家用很少的操作完成真实的经营判断、弟子培养和单局冒险押注。

### Constraints

- **Tech Stack**: React 19 + TypeScript + Zustand + CSS Modules — 已锁定，不引入新 UI 框架
- **Browser Only**: 纯客户端 SPA，所有数据存 IndexedDB — 无服务端依赖
- **水墨风格**: 必须遵循清墨轻岚设计系统 — 不使用 MMO 式重度 UI
- **移动优先**: 布局以移动端为起点，逐级增强桌面端
- **存档兼容**: 新字段必须有迁移逻辑，旧存档必须可加载
## Technology Stack

## Languages
- TypeScript 5.9 - All source code in `src/`, strict mode enabled with `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
- CSS (CSS Modules + global CSS) - Component styles in `*.module.css` files co-located with components, theme tokens in `src/styles/theme.css`
- HTML - Single `index.html` entry point with Chinese locale (`lang="zh-CN"`)
- JSON - Package manifest, TypeScript config, Prettier config
## Runtime
- Node.js 22.17.0
- ES2020 target (`tsconfig.json` `"target": "ES2020"`, `"lib": ["ES2020", "DOM", "DOM.Iterable"]`)
- ESM modules (`"type": "module"` in package.json, `"module": "ESNext"` in tsconfig)
- npm 10.9.2
- Lockfile: `package-lock.json` (present)
## Frameworks
- React 19.2.4 - UI framework, JSX transform (`react-jsx`), lazy-loaded pages via `React.lazy()`
- React DOM 19.2.4 - Client-side rendering via `ReactDOM.createRoot()`
- React Router DOM 7.13.2 - Client-side routing with `BrowserRouter`, `Routes`, `Route`, `NavLink`, `useParams`, `useNavigate`
- Zustand 5.0.12 - State management with slice pattern (12 slices in `src/stores/sectStore/`)
- Framer Motion 12.38.0 - Declared as dependency but not currently imported in source
- Vitest 4.1.1 - Test runner, configured in `vite.config.ts` with `globals: true`, `environment: 'jsdom'`
- Testing Library React 16.3.2 - Component testing (`@testing-library/react`)
- Testing Library Jest DOM 6.9.1 - DOM matchers (`@testing-library/jest-dom`)
- fake-indexeddb 6.2.5 - IndexedDB mock for tests, loaded in `src/__tests__/setup.ts`
- jsdom 29.0.1 - DOM environment for tests
- Vite 8.0.2 - Build tool and dev server, React plugin (`@vitejs/plugin-react`)
- TypeScript 5.9.3 - Type checking via `tsc -b` in build script
- ESLint 9.39.4 - Linting with flat config (`eslint.config.js`), typescript-eslint, react-hooks plugin
- Prettier 3.8.1 - Code formatting (single quotes, no semicolons, 2-space indent, 120 print width, trailing comma es5)
- Husky 9.1.7 - Git hooks (pre-commit runs `lint-staged`)
- lint-staged 16.4.0 - Staged file linting (ESLint + Prettier for TS/TSX, Prettier for CSS)
## Key Dependencies
- `idb` 8.0.3 - IndexedDB wrapper, all game persistence goes through this. Client in `src/systems/save/db.ts`
- `zustand` 5.0.12 - Central state management. 3 stores: `useSectStore` (12 slices), `useAdventureStore`, `useGameStore`, plus `useEventLogStore`
- `react-router-dom` 7.13.2 - All navigation. 7 routes defined in `src/App.tsx`
- `framer-motion` 12.38.0 - Available for animations (currently unused in imports)
- `@vitejs/plugin-react` 6.0.1 - React Fast Refresh and JSX transform
- `typescript-eslint` 8.57.2 - TypeScript-aware ESLint rules
- `eslint-plugin-react-hooks` 7.0.1 - React hooks linting
## Configuration
- No `.env` files detected
- No environment variables required at build time
- Base path configured as `/EndlessQuest/` in `vite.config.ts`
- Browser-only application, no server-side runtime
- `vite.config.ts` - Vite configuration with React plugin and Vitest settings
- `tsconfig.json` - TypeScript strict mode, path alias `@/*` maps to `src/*`
- `eslint.config.js` - ESLint flat config with TypeScript and React hooks rules
- `.prettierrc` - Prettier settings
- `.husky/pre-commit` - Runs `npx lint-staged`
- `@/*` -> `src/*` (configured in `tsconfig.json` `paths`)
- Globals enabled (`globals: true`)
- jsdom environment
- Setup file: `src/__tests__/setup.ts` (loads `fake-indexeddb/auto` and `@testing-library/jest-dom`)
- Tests excluded from TypeScript compilation (`"exclude": ["src/__tests__"]` in tsconfig)
## Platform Requirements
- Node.js 22+
- npm 10+
- Modern browser with IndexedDB support
- Static file hosting (Vite builds to `dist/`)
- No server-side requirements
- Client-side only: all game logic, state, and persistence run in the browser
- IndexedDB required for save data persistence
- Google Fonts CDN for `Noto Serif SC` and `Noto Sans SC` fonts (loaded in `index.html`)
- PWA-ready meta tags in `index.html` (apple-mobile-web-app-capable, theme-color)
## Conventions

## Naming Patterns
- Components: PascalCase `.tsx` - `CharacterCard.tsx`, `PageHeader.tsx`, `RunBuildSummary.tsx`
- Systems/engines: PascalCase `.ts` - `CombatEngine.ts`, `CharacterEngine.ts`, `CultivationEngine.ts`
- Stores: camelCase `.ts` - `sectStore/index.ts`, `adventureStore.ts`, `gameStore.ts`
- Store slices: camelCase `Slice.ts` - `characterSlice.ts`, `tickSlice.ts`, `buildingSlice.ts`
- Types: camelCase `.ts` - `character.ts`, `item.ts`, `adventure.ts`
- Data tables: camelCase `.ts` - `realms.ts`, `techniquesTable.ts`, `buildings.ts`
- CSS Modules: PascalCase `.module.css` co-located with component - `CharacterCard.module.css`
- Test files: PascalCase `.test.ts` or `.test.tsx` - `CombatEngine.test.ts`, `SectPage.test.tsx`
- Utility files: camelCase `.ts` - `format.ts`
- Exported functions: camelCase - `generateCharacter()`, `simulateCombat()`, `calcSectLevel()`
- Private/internal functions: camelCase - `applyVariance()`, `randomPick()`, `mergeSpecialtyLevels()`
- Component functions: PascalCase default export - `export default function SectPage()`
- Store action creators: camelCase prefixed with `create` - `createCharacterSlice`, `createTickSlice`
- Factory helpers in tests: camelCase prefixed with `make` - `makeUnit()`, `makeEquipment()`, `makeConsumable()`
- Constants: UPPER_SNAKE_CASE for module-level constants - `QUALITY_STATS`, `SECT_LEVEL_TABLE`, `SURNAMES`
- Regular variables: camelCase - `spiritFieldLevel`, `heroRate`, `dungeonName`
- Private module counters: underscore prefix - `_idCounter`, `_runCounter`
- Interfaces: PascalCase - `Character`, `CombatUnit`, `AdventureReport`
- Type aliases: PascalCase - `CharacterQuality`, `CultivationPath`, `EventType`
- Union type members: camelCase strings - `'common' | 'spirit' | 'immortal'`
- Store type: PascalCase with `Store` suffix - `SectStore`, `AdventureStore`, `GameStore`
- CSS custom properties: `--category-variant` - `--color-accent`, `--space-md`, `--radius-sm`
- CSS Module class names: camelCase - `.sectionTitle`, `.resourceCard`, `.heroSection`
- Component-local style maps: UPPER_SNAKE_CASE Records - `QUALITY_BORDER`, `QUALITY_NAMES`, `PATH_ICON_NAMES`
## Code Style
- Prettier with settings in `.prettierrc`
- Single quotes, no semicolons, 2-space indent, trailing comma ES5, 120 char print width
- Run: `npm run format`
- Check: `npm run format:check`
- ESLint 9 with flat config in `eslint.config.js`
- `typescript-eslint` recommended + React Hooks plugin
- Key rules:
- Run: `npm run lint`
- Pre-commit: Husky + lint-staged runs eslint --fix + prettier --write on `src/**/*.{ts,tsx,css}`
- Strict mode enabled in `tsconfig.json`
- `noUnusedLocals: true`, `noUnusedParameters: true`
- Target ES2020, module ESNext
- JSX: `react-jsx` (no need for React import in JSX files)
- Path alias: `@/*` maps to `src/*` (configured but rarely used; most imports use relative paths)
- Test files excluded from `tsconfig.json` via `"exclude": ["src/__tests__"]`
## Import Organization
- Use `import type { ... }` for type-only imports consistently
- Inline `import type` for single types from modules that also have values: `import type { Pet } from '../../systems/pet/PetSystem'`
- `@/*` maps to `src/*` in tsconfig but rarely used in practice
- Prefer relative paths: `'../../types/character'`, `'../stores/sectStore'`
## Error Handling
- Guard clauses returning `null`, `false`, or early returns for invalid states
- Store actions return result objects: `{ success: boolean; reason: string }` for UI-facing operations
- `boolean` return for simple success/failure: `addCharacter()` returns `Character | null`
- No try/catch in store/system code; errors propagate to the caller
- Top-level `ErrorBoundary` component wraps all routes in `App.tsx`
- Save loading wrapped in try/catch with `console.error` in `App.tsx`
- Check conditions sequentially, return early on failure
- Mutate state only after all validation passes
- Example in `src/stores/sectStore/characterSlice.ts` `addCharacter()`: check quality unlock, character cap, spirit stone cost, then deduct and create
## Logging
- `emitEvent(type, message, data?)` for game events - standalone function usable outside React
- Event types: `breakthrough_success`, `recruit`, `adventure_start`, `milestone`, etc.
- Events stored in `useEventLogStore` with cap of 200 entries (newest first)
- Events also persisted to history via `addHistoryEntry()` in `src/systems/save/HistoryStore.ts`
- `console.error` for infrastructure errors (save load failures)
## Comments
- Section separators using `// ---...--- Section Name ---...---` pattern
- JSDoc `/** */` for exported public API functions describing purpose and behavior
- Inline comments explaining "why" for non-obvious game mechanics calculations
- TODO/FIXME not actively used; issues tracked in specs
- Used on exported functions that serve as public API for systems
- Example in `src/systems/character/CharacterEngine.ts`:
- Type-only imports consistently annotated with `import type`
## Function Design
- Destructured parameters for React components: `{ character, onClick }`
- Positional parameters for system functions: `generateCharacter(quality, activeRoute)`
- Optional parameters at the end with defaults: `startRun(dungeonId, characterIds, supplyLevel = 'basic', tacticalPreset = 'balanced')`
- Override objects use `Partial<T> & Required<Pick<T, ...>>` pattern for test helpers: `makeUnit(overrides: Partial<CombatUnit> & { id: string; name: string; team: 'ally' | 'enemy' })`
- Store mutations: return `void` or the created/affected entity
- Queries: return the value directly or `null`/`undefined` if not found
- Operations: return `boolean` for simple success, result object for detailed outcomes
- Combat/results: return structured objects with full data (`CombatResult`, `AdventureReport`)
## Module Design
- Components: `export default function Name()` - one component per file
- Systems: named exports for each function - `export function simulateCombat()`
- Types: re-exported from barrel `src/types/index.ts`
- Stores: named hook export + type re-export - `export const useSectStore = ...` and `export type { SectStore }`
- Data: named exports for tables and lookup functions
- `src/types/index.ts` re-exports all types from sub-modules
- Store `index.ts` composes slices and exports the hook
- No barrel files for components or systems (direct imports)
- Each slice is a separate file in `src/stores/sectStore/` named `*Slice.ts`
- Type: `StateCreator<SectStore, [], [], Partial<SectStore>>`
- Slices are composed via spread in `src/stores/sectStore/index.ts`:
- All slices share the same `SectStore` type defined in `src/stores/sectStore/types.ts`
- Each store has a `reset()` action that restores initial state
- One `.module.css` file per component, co-located in the same directory
- Import as `styles` and reference via `styles.className`
- Theme variables from `src/styles/theme.css` used throughout
- Global styles in `src/styles/globals.css`
## Architecture

## Pattern Overview
- **Sect-centric domain model** -- The `Sect` aggregate root owns characters, buildings, resources, pets, and vault. All game state flows from this single entity.
- **Zustand sliced stores** -- State is split across 4 stores: `SectStore` (main, 13 slices), `AdventureStore`, `GameStore`, `EventLogStore`.
- **Pure-function game systems** -- All game logic lives in `src/systems/` as stateless functions that take data in and return results. Systems never directly mutate store state.
- **Tick-driven game loop** -- An `IdleEngine` class fires a 1-second interval, calling `tickAll(deltaSec)` which cascades through cultivation, resource production, building queues, and automation.
- **Write-through auto-save** -- Zustand subscription detects `sect` reference changes, debounces 500ms, then writes all entity stores to IndexedDB in a single transaction.
- **Lazy-loaded pages** -- All 7 pages use `React.lazy()` with `Suspense` for code splitting.
## Layers
- Purpose: Render game state, capture user actions, delegate to stores
- Location: `src/pages/`, `src/components/`
- Contains: Page components (7), feature components (17 across 6 groups), common components (13)
- Depends on: Zustand stores (read state, call actions), React Router (navigation), CSS Modules (styling)
- Used by: Browser via React DOM
- Purpose: Hold all mutable game state, provide imperative actions that mutate state
- Location: `src/stores/`
- Contains: `SectStore` (13 slices merged via Zustand `StateCreator`), `AdventureStore`, `GameStore`, `EventLogStore`
- Depends on: Game systems (pure functions in `src/systems/`), data tables (in `src/data/`), types (in `src/types/`)
- Used by: Pages, components, auto-save subscription, idle engine
- Purpose: Stateless pure functions implementing all game rules
- Location: `src/systems/`
- Contains: 16 domain modules, each a directory with 1-7 `.ts` files
- Depends on: Types (`src/types/`), data tables (`src/data/`)
- Used by: Stores (in their action implementations)
- Purpose: Define game balance constants, entity definitions, and static content
- Location: `src/data/`
- Contains: 28 data files covering realms, buildings, items, enemies, skills, techniques, icons, etc.
- Depends on: Types (`src/types/`)
- Used by: Systems, stores, and occasionally components
- Purpose: Shared TypeScript interfaces and type aliases for all domain entities
- Location: `src/types/`
- Contains: 9 type files with a barrel `index.ts` re-export
- Depends on: Nothing (leaf layer)
- Used by: All other layers
- Purpose: Serialize/deserialize game state to/from IndexedDB
- Location: `src/systems/save/`
- Contains: `SaveSystem.ts`, `db.ts`, `startAutoSave.ts`, `HistoryStore.ts`, `ResourceCache.ts`
- Depends on: `idb` library, stores (reads current state), types
- Used by: `App.tsx` (load on startup, auto-save subscription)
## Data Flow
- Centralized in Zustand stores (not Redux-style actions/reducers)
- `SectStore` is the primary store, built from 13 slices using the Zustand `StateCreator` pattern
- Each slice provides a subset of the `SectStore` interface (e.g., `characterSlice` provides `addCharacter`, `removeCharacter`, etc.)
- Stores are read outside React via `useStoreName.getState()` in systems and callbacks
- Components use `useStoreName((s) => s.field)` selector pattern for reactive subscriptions
## Key Abstractions
- Purpose: The central game entity owning all sub-entities
- Examples: `src/types/sect.ts` (interface), `src/stores/sectStore/initial.ts` (factory)
- Pattern: Single `Sect` object containing `characters[]`, `buildings[]`, `vault[]`, `pets[]`, `resources`, and metadata. Persisted as separate IndexedDB stores but reconstructed into a single object in memory.
- Purpose: A sect member with cultivation stats, equipment, techniques, talents, and status
- Examples: `src/types/character.ts` (interface), `src/systems/character/CharacterEngine.ts` (generation), `src/stores/sectStore/characterSlice.ts` (mutations)
- Pattern: Rich entity with embedded collections (`backpack[]`, `equippedGear[]`, `learnedTechniques[]`, `talents[]`, `specialties[]`, `fateTags[]`). Status state machine (`idle` | `adventuring` | `patrolling` | `resting` | `injured` | `training` | `recovering`).
- Purpose: Represents an in-progress dungeon expedition with team, floor state, and rewards
- Examples: `src/types/adventure.ts` (`DungeonRun` interface), `src/stores/adventureStore.ts` (lifecycle)
- Pattern: Stateful session object with `status` lifecycle (`active` -> `completed`/`retreated`/`failed`). Contains generated `floors[]` with `routes[]` and `events[]`.
- Purpose: Immutable record of a completed adventure run with detailed steps
- Examples: `src/types/adventure.ts` (`AdventureReport` interface), `src/systems/roguelike/AdventureReportInsightSystem.ts` (analysis)
- Pattern: Event-sourced report with `steps[]` chronologically tracking every decision and outcome. Includes `postRunMemberOutcomes` for casualty/recovery tracking.
- Purpose: Drives the core game tick at 1-second intervals with offline catch-up
- Examples: `src/systems/idle/IdleEngine.ts`
- Pattern: Singleton class with `start()`/`stop()`, visibility change handling for tab-switching, and `calcOfflineSeconds()` for offline progress (capped at 24 hours).
## Entry Points
- Location: `src/main.tsx`
- Triggers: Browser loads `index.html`, which loads this module
- Responsibilities: Renders `<App />` into `#root`, imports global CSS
- Location: `src/App.tsx`
- Triggers: React mounts after `main.tsx`
- Responsibilities: Loads saved game from IndexedDB, starts `IdleEngine`, sets up auto-save, handles offline catch-up report, provides routing via `BrowserRouter`, renders `Sidebar`/`TopBar`/`BottomNav` shell
- Location: `src/stores/sectStore/tickSlice.ts` (`tickAll`)
- Triggers: `IdleEngine` interval (1 second) or offline catch-up
- Responsibilities: The central game loop tick -- resource production, cultivation, breakthroughs, building production, automation checks, recovery
- Location: `src/systems/save/startAutoSave.ts`
- Triggers: Zustand subscription on `sect` reference change, `visibilitychange`, `beforeunload`
- Responsibilities: Debounced (500ms) write-through save to IndexedDB
## Error Handling
- Save/load wrapped in try-catch with `console.error`, returning `false` on failure
- `ErrorBoundary` component wraps page content in `App.tsx`
- Offline catch-up uses `queueMicrotask` to avoid synchronous setState during effects
- Save data integrity check: if meta exists but all entity stores are empty, treats as corrupted and returns `false`
- Resource normalization on load (`normalizeFiniteNumber`, `normalizeResources`) prevents NaN/Infinity corruption
## Cross-Cutting Concerns

