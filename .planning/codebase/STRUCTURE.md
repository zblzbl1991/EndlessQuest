# Codebase Structure

**Analysis Date:** 2026-04-02

## Directory Layout

```
endlessQuest/
├── src/                        # Application source
│   ├── main.tsx                # React entry point
│   ├── App.tsx                 # Root component (router, idle engine, auto-save)
│   ├── vite-env.d.ts           # Vite client type reference
│   ├── types/                  # Shared TypeScript type definitions
│   ├── data/                   # Static game data tables and icons
│   │   └── icons/              # Pixel icon SVG definitions
│   ├── stores/                 # Zustand state management
│   │   └── sectStore/          # SectStore (13 slice files)
│   ├── systems/                # Pure-function game logic modules
│   │   ├── building/           # Production queue system
│   │   ├── character/          # Character generation, fate, recovery, disposition
│   │   ├── combat/             # Combat engine, targeting, affixes, skill AI
│   │   ├── cultivation/        # Cultivation engine, tribulation, display
│   │   ├── economy/            # Resources, alchemy, forge, synergy, building effects
│   │   ├── equipment/          # Equipment engine
│   │   ├── idle/               # IdleEngine (game loop driver)
│   │   ├── item/               # Item generation, stack utilities
│   │   ├── pet/                # Pet system
│   │   ├── roguelike/          # Adventure engine, auto-run, events, map, loot, report insights
│   │   ├── save/               # IndexedDB save/load, auto-save, history, resource cache
│   │   ├── sect/               # Sect engine, automation, path, route, insights, overview
│   │   ├── skill/              # Skill system
│   │   ├── technique/          # Technique system
│   │   └── trade/              # Trade/shop system
│   ├── pages/                  # Route-level page components (7 pages)
│   ├── components/             # Reusable UI components
│   │   ├── adventure/          # Run build summary, tactic picker
│   │   ├── building/           # Building feature panels (alchemy, forge, market, study, codex)
│   │   ├── common/             # Shared components (nav, cards, icons, modals, etc.)
│   │   ├── cultivation/        # Breakthrough panel
│   │   ├── inventory/          # Equipment and item management panels
│   │   └── sect/               # Sect overview panels (agenda, path, legacy, stats)
│   ├── styles/                 # Global CSS and theme
│   │   └── components/         # (Empty -- component styles use co-located CSS Modules)
│   ├── utils/                  # Utility functions
│   └── __tests__/              # All test files (67 test files)
├── docs/                       # Design documents and specs
├── dist/                       # Build output (gitignored)
├── index.html                  # HTML entry point
├── package.json                # Dependencies and scripts
├── vite.config.ts              # Vite + Vitest configuration
├── tsconfig.json               # TypeScript configuration
└── tsconfig.node.json          # TypeScript config for Node tooling
```

## Directory Purposes

**`src/types/`** (9 files):
- Purpose: Central type definitions for all domain entities
- Contains: Interfaces (`Character`, `Sect`, `DungeonRun`, `AdventureReport`, `Item`, etc.), type aliases (`CharacterQuality`, `SectPath`, `EventType`, etc.), constant maps (`ELEMENT_NAMES`, `TALENT_RARITY_NAMES`, `SUPPLY_COSTS`)
- Key files: `src/types/index.ts` (barrel re-export), `src/types/sect.ts` (Sect aggregate), `src/types/adventure.ts` (adventure domain), `src/types/character.ts` (Character entity)

**`src/data/`** (28 files + icons/):
- Purpose: Static game balance data, entity definitions, content tables
- Contains: Realm definitions, building configs, enemy templates, skill definitions, technique table, item definitions, recipes, icon pixel grids, navigation config, UI copy strings
- Key files: `src/data/realms.ts` (cultivation realm ladder), `src/data/buildings.ts` (building definitions and rates), `src/data/enemies.ts` (enemy templates), `src/data/techniquesTable.ts` (technique definitions), `src/data/events.ts` (dungeon definitions), `src/data/activeSkills.ts` (skill loadouts)

**`src/data/icons/`** (7 files):
- Purpose: Pixel icon definitions organized by category
- Contains: Building icons, character icons, item icons, technique icons, world icons, UI icons, shared types and palette
- Key files: `src/data/icons/index.ts` (master registry `pixelIcons`), `src/data/icons/types.ts` (`PixelIconDef` type, `PALETTE`)

**`src/stores/`** (3 store files + sectStore/):
- Purpose: Zustand stores holding all mutable game state
- Contains: `SectStore` (main game state, 13 slices), `AdventureStore` (dungeon runs and reports), `GameStore` (session state), `EventLogStore` (event history)
- Key files: `src/stores/sectStore/index.ts` (store creation), `src/stores/sectStore/types.ts` (SectStore interface), `src/stores/sectStore/tickSlice.ts` (game loop tick), `src/stores/adventureStore.ts` (adventure lifecycle)

**`src/systems/`** (16 subdirectories, ~45 files):
- Purpose: Pure-function game logic modules -- no React, no store mutations
- Contains: State calculation functions, simulation engines, generation algorithms, AI decision trees
- Key files: `src/systems/idle/IdleEngine.ts`, `src/systems/combat/CombatEngine.ts`, `src/systems/cultivation/CultivationEngine.ts`, `src/systems/roguelike/AutoRunEngine.ts`, `src/systems/save/SaveSystem.ts`

**`src/pages/`** (7 pages, each with co-located `.module.css`):
- Purpose: Top-level route components, each representing a full screen
- Contains: `SectPage` (overview), `CharactersPage` (disciple management), `BuildingsPage` (building operations), `AdventurePage` (dungeon selection and active runs), `AdventureReportPage` (post-run report), `VaultPage` (shared inventory), `EventLogPage` (event history)
- Key files: `src/pages/SectPage.tsx`, `src/pages/CharactersPage.tsx`, `src/pages/BuildingsPage.tsx`, `src/pages/AdventurePage.tsx`

**`src/components/`** (6 subdirectories, ~30 files):
- Purpose: Reusable UI components organized by feature domain
- Contains: Feature panels, navigation, display components, modals
- Key files: `src/components/common/Sidebar.tsx`, `src/components/common/BottomNav.tsx`, `src/components/common/PixelIcon.tsx`, `src/components/common/CharacterCard.tsx`

**`src/styles/`** (2 files + empty components/):
- Purpose: Global CSS and theme variables
- Contains: `globals.css` (reset, body styles, ink-wash background, page layout), `theme.css` (CSS custom properties for the entire design system)
- Key files: `src/styles/theme.css` (all CSS variables), `src/styles/globals.css` (global layout)

**`src/utils/`** (1 file):
- Purpose: Shared utility functions
- Contains: `format.ts` (number formatting helper)
- Key files: `src/utils/format.ts`

**`src/__tests__/`** (67 test files):
- Purpose: All unit and integration tests
- Contains: One test file per system, store, page, or component. Co-located setup file.
- Key files: `src/__tests__/setup.ts`, `src/__tests__/stores.test.ts` (86KB, largest test file)

## Key File Locations

**Entry Points:**
- `src/main.tsx`: React DOM render, global CSS import
- `src/App.tsx`: Router setup, idle engine lifecycle, auto-save, offline report

**Configuration:**
- `vite.config.ts`: Vite build + Vitest config (globals, jsdom, setup file)
- `tsconfig.json`: TypeScript compiler options
- `package.json`: Dependencies, scripts, lint-staged config
- `.prettierrc`: Prettier formatting rules
- `eslint.config.js`: ESLint rules

**Core Logic (Game Loop):**
- `src/systems/idle/IdleEngine.ts`: 1-second tick interval driver
- `src/stores/sectStore/tickSlice.ts`: Main `tickAll()` -- orchestrates all per-second updates
- `src/systems/cultivation/CultivationEngine.ts`: Cultivation progress, breakthrough logic
- `src/systems/economy/ResourceEngine.ts`: Resource rate calculations
- `src/systems/combat/CombatEngine.ts`: Turn-based combat simulation

**Core Logic (Adventure):**
- `src/stores/adventureStore.ts`: Adventure lifecycle (start, advance, complete, fail)
- `src/systems/roguelike/AutoRunEngine.ts`: Automated dungeon run resolution
- `src/systems/roguelike/EventSystem.ts`: Dungeon event resolution (combat, shop, rest, boss)
- `src/systems/roguelike/MapGenerator.ts`: Floor and route generation

**Core Logic (Save/Load):**
- `src/systems/save/SaveSystem.ts`: `saveGame()`, `loadGame()`, `clearSaveData()`
- `src/systems/save/db.ts`: IndexedDB schema (v3), migration logic (v1 blob -> v2 per-entity)
- `src/systems/save/startAutoSave.ts`: Write-through auto-save subscription

**Type Definitions:**
- `src/types/sect.ts`: `Sect`, `Building`, `Resources`, `SectStats`, `SectAutomationSettings`
- `src/types/character.ts`: `Character`, `BaseStats`, `CultivationStats`, quality/status types
- `src/types/adventure.ts`: `DungeonRun`, `AdventureReport`, `Dungeon`, enemy/event types
- `src/types/item.ts`: `Equipment`, `Consumable`, `Material`, `TechniqueScroll`, `ItemStack`
- `src/types/technique.ts`: `Technique`, tier/family/style types
- `src/types/skill.ts`: `ActiveSkill`, element/skill category types

**Testing:**
- `src/__tests__/setup.ts`: Vitest global setup
- `src/__tests__/stores.test.ts`: Comprehensive store integration tests (86KB)
- `src/__tests__/SaveSystem.test.ts`: Save/load round-trip tests
- `src/__tests__/CombatEngine.test.ts`: Combat simulation tests

## Naming Conventions

**Files:**
- Pages: `PascalCase.tsx` (e.g., `SectPage.tsx`, `CharactersPage.tsx`)
- Page styles: `PascalCase.module.css` co-located with page (e.g., `SectPage.module.css`)
- Components: `PascalCase.tsx` (e.g., `CharacterCard.tsx`, `PixelIcon.tsx`)
- Component styles: `PascalCase.module.css` co-located (e.g., `CharacterCard.module.css`)
- System modules: `PascalCase.ts` for engine/system files (e.g., `CombatEngine.ts`, `ItemGenerator.ts`)
- Store slices: `camelSlice.ts` (e.g., `characterSlice.ts`, `tickSlice.ts`, `resourceSlice.ts`)
- Data tables: `camelCase.ts` (e.g., `realms.ts`, `buildings.ts`, `enemies.ts`)
- Type files: `camelCase.ts` (e.g., `sect.ts`, `character.ts`, `adventure.ts`)
- Test files: `PascalCase.test.ts` or `PascalCase.test.tsx` in `__tests__/` (e.g., `CombatEngine.test.ts`, `SectPage.test.tsx`)

**Directories:**
- Feature domain: `camelCase/` (e.g., `combat/`, `roguelike/`, `cultivation/`)
- Component groups: `camelCase/` (e.g., `adventure/`, `building/`, `common/`)
- Store subdirectory: `camelCase/` matching store name (e.g., `sectStore/`)

## Where to Add New Code

**New Page:**
- Create `src/pages/NewPage.tsx` and `src/pages/NewPage.module.css`
- Add lazy import in `src/App.tsx` and add `<Route>` entry
- Add navigation item to `src/data/navigation.ts` (`primaryNavigation` array)

**New System Module:**
- Create `src/systems/newDomain/` directory
- Add pure-function `.ts` files (no React, no store imports for mutation)
- Import from store slices or other systems as needed (read-only via `getState()`)

**New Store Slice:**
- Create `src/stores/sectStore/newFeatureSlice.ts`
- Add `StateCreator<SectStore, [], [], Partial<SectStore>>` export
- Import and spread in `src/stores/sectStore/index.ts`
- Add interface methods to `src/stores/sectStore/types.ts`

**New Component:**
- Determine feature group: `adventure/`, `building/`, `common/`, `cultivation/`, `inventory/`, `sect/`
- Create `src/components/{group}/ComponentName.tsx` and `.module.css`
- Use CSS Modules (`import styles from './ComponentName.module.css'`)

**New Data Table:**
- Create `src/data/newTable.ts` exporting typed constants
- Import from systems or stores as needed

**New Type:**
- Create `src/types/newDomain.ts`
- Add re-exports in `src/types/index.ts`

**New Test:**
- Create `src/__tests__/ModuleName.test.ts` (or `.tsx` for component tests)
- Import from `@testing-library/react` for component tests
- Import system/store directly for unit tests

**New Icon:**
- Add pixel grid definition to the appropriate file in `src/data/icons/` (e.g., `buildings.ts`, `characters.ts`)
- The icon automatically becomes available via `pixelIcons['name']` and `<PixelIcon name="..." />`

## Special Directories

**`src/styles/components/`:**
- Purpose: (Currently empty) Was intended for shared component styles
- Actual pattern: Components use co-located `.module.css` files instead
- Generated: No
- Committed: Yes

**`docs/`:**
- Purpose: Design specifications, architecture docs, plans
- Contains: `docs/superpowers/specs/` (design docs), `docs/superpowers/plans/` (roadmaps)
- Generated: No
- Committed: Yes

**`.husky/`:**
- Purpose: Git hooks (pre-commit via lint-staged)
- Generated: No (managed by `husky` package)
- Committed: Yes

**`audit-screenshots/`:**
- Purpose: UI audit screenshots for visual review
- Contains: PNG screenshots of various pages
- Generated: No (manual captures)
- Committed: Yes

**`dist/`:**
- Purpose: Vite build output
- Generated: Yes (by `npm run build`)
- Committed: No (gitignored)

---

*Structure analysis: 2026-04-02*
