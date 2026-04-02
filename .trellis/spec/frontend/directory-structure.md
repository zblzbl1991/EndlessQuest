# Directory Structure

> How frontend code is organized in this project.

---

## Overview

EndlessQuest is a pure client-side SPA using React 19 + TypeScript + Zustand + CSS Modules. All code lives under `src/`. There is no backend — all data is persisted to IndexedDB.

---

## Directory Layout

```
src/
├── App.tsx                    # Root component: routing, save/load, idle engine
├── main.tsx                   # Entry point: renders <App /> into #root
├── components/                # Reusable UI components (grouped by feature domain)
│   ├── adventure/             # Adventure-related (RunBuildSummary, TacticPresetPicker)
│   ├── building/              # Building panels (AlchemyPanel, ForgePanel, etc.)
│   ├── common/                # Shared UI (CharacterCard, StatusBadge, Sidebar, TopBar, etc.)
│   ├── cultivation/           # Cultivation UI (BreakthroughPanel)
│   ├── inventory/             # Inventory UI (EquipPanel, EnhancePanel, ItemCard)
│   └── sect/                  # Sect overview components (StatsPanel, LegacyPanel, etc.)
├── data/                      # Static data tables and game balance constants (28 files)
│   └── icons/                 # SVG icon data
├── pages/                     # Route-level page components (7 pages)
├── stores/                    # Zustand state management
│   └── sectStore/             # Main store composed of 13 slices
├── styles/                    # Global styles
│   ├── globals.css            # Reset, global styles
│   └── theme.css              # Design tokens (CSS custom properties)
├── systems/                   # Pure-function game logic (16 domain modules)
│   ├── character/             # Character generation, specialty, cultivation path
│   ├── combat/                # Combat engine, targeting, affixes
│   ├── cultivation/           # Cultivation rate calculation, display
│   ├── economy/               # Building effects, resource exchange
│   ├── equipment/             # Equipment stats, enhancement
│   ├── idle/                  # IdleEngine, tick-driven game loop
│   ├── item/                  # Item generation, affixes
│   ├── pet/                   # Pet system
│   ├── roguelike/             # Dungeon generation, report analysis
│   ├── save/                  # IndexedDB persistence, auto-save, history
│   ├── sect/                  # Sect level, legacy, ascension
│   ├── skill/                 # Active skill definitions
│   ├── technique/             # Technique learning, comprehension
│   └── trade/                 # Shop system
├── types/                     # TypeScript type definitions (9 files + barrel index.ts)
├── utils/                     # Shared utilities (format.ts, etc.)
└── __tests__/                 # Test files (co-located setup, not per-component)
    ├── setup.ts               # Vitest setup: fake-indexeddb, jest-dom
    └── *.test.ts(x)           # Test files
```

---

## Module Organization

### Pages (`src/pages/`)

One file per route. Each page is lazy-loaded via `React.lazy()` in `App.tsx`. A page component reads state from stores and delegates rendering to feature components.

- `SectPage.tsx` — Sect overview (main page)
- `CharactersPage.tsx` — Disciple management
- `BuildingsPage.tsx` — Building upgrades and production
- `AdventurePage.tsx` — Dungeon run configuration and launch
- `AdventureReportPage.tsx` — Post-run report with insights
- `VaultPage.tsx` — Shared sect inventory
- `EventLogPage.tsx` — Event history

### Components (`src/components/`)

Grouped by feature domain (not by type). Each component has a co-located `.module.css` file.

| Group | Contents | Example |
|-------|----------|---------|
| `common/` | Shared UI primitives used across pages | `CharacterCard`, `StatusBadge`, `ProgressBar`, `Sidebar`, `BottomNav` |
| `adventure/` | Adventure-specific UI | `RunBuildSummary`, `TacticPresetPicker` |
| `building/` | Building feature panels | `AlchemyPanel`, `ForgePanel`, `StudyPanel` |
| `cultivation/` | Cultivation UI | `BreakthroughPanel` |
| `inventory/` | Equipment and item management | `EquipPanel`, `EnhancePanel`, `ItemCard` |
| `sect/` | Sect overview panels | `StatsPanel`, `LegacyPanel`, `SectPathPanel` |

### Systems (`src/systems/`)

Stateless pure functions implementing game rules. Never import stores or React. Each system is a directory containing 1-7 `.ts` files.

### Data (`src/data/`)

Static game balance data: realm definitions, item tables, enemy definitions, technique tables, etc. No logic, only constants and lookup functions.

### Types (`src/types/`)

Shared TypeScript interfaces. `index.ts` re-exports everything — this is the only barrel file in the project.

---

## Naming Conventions

| Category | Pattern | Example |
|----------|---------|---------|
| Pages | PascalCase `.tsx` | `AdventureReportPage.tsx` |
| Components | PascalCase `.tsx` | `CharacterCard.tsx` |
| Systems | PascalCase directories, camelCase functions | `combat/CombatEngine.ts`, `simulateCombat()` |
| Stores | camelCase directory, named hook export | `sectStore/index.ts`, `useSectStore` |
| Store slices | camelCase `*Slice.ts` | `characterSlice.ts`, `tickSlice.ts` |
| Types | camelCase `.ts`, PascalCase interfaces | `character.ts`, `Character` |
| Data tables | camelCase `.ts` | `realms.ts`, `techniquesTable.ts` |
| CSS Modules | PascalCase `.module.css` (co-located) | `CharacterCard.module.css` |
| Tests | PascalCase `.test.ts(x)` | `CombatEngine.test.ts`, `StatusBadge.test.tsx` |
| Utils | camelCase `.ts` | `format.ts` |

---

## Key Rules

1. **No barrel files** except `src/types/index.ts` — import directly with relative paths
2. **One component per file** — always `export default function Name()`
3. **CSS Modules are co-located** — `Foo.tsx` + `Foo.module.css` in the same directory
4. **Systems never import stores** — they receive data and return results
5. **Pages are lazy-loaded** — via `React.lazy()` in `App.tsx`
