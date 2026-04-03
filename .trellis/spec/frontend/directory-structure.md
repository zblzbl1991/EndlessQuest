# Directory Structure

> How frontend code is organized in this project.

---

## Overview

The project uses a flat, domain-driven structure under `src/`. Each domain (combat, economy, character, etc.) is a self-contained directory with its own logic files. There are no nested feature folders — depth is limited to 2 levels under `src/`.

All paths below are relative to `src/`.

---

## Directory Layout

```
src/
├── main.tsx                          # Vite entry point
├── App.tsx                           # Root component (router, idle engine, save/load)
│
├── pages/                            # Route-level page components (7 total)
│   ├── SectPage.tsx / .module.css
│   ├── CharactersPage.tsx / .module.css
│   ├── BuildingsPage.tsx / .module.css
│   ├── AdventurePage.tsx / .module.css
│   ├── AdventureReportPage.tsx / .module.css
│   ├── VaultPage.tsx / .module.css
│   └── EventLogPage.tsx / .module.css
│
├── components/                       # Reusable UI components, grouped by domain
│   ├── common/                       # Shared: TopBar, BottomNav, Sidebar, PageHeader,
│   │                                 #   CharacterCard, ProgressBar, ResourceRate,
│   │                                 #   PixelIcon, StatusBadge, ErrorBoundary,
│   │                                 #   OfflineReportModal
│   ├── building/                     # ForgePanel, AlchemyPanel, MarketPanel, CodexPanel, StudyPanel
│   ├── inventory/                    # ItemCard, EquipPanel, EnhancePanel
│   ├── sect/                         # ActionAgenda, SectPathPanel, LegacyPanel, StatsPanel
│   ├── cultivation/                  # BreakthroughPanel
│   └── adventure/                    # RunBuildSummary, TacticPresetPicker
│
├── stores/                           # Zustand stores
│   ├── gameStore.ts                  # Meta state (saveSlot, isPaused, dayProgress)
│   ├── adventureStore.ts             # Roguelike/dungeon run store
│   ├── eventLogStore.ts              # Event log store + standalone emitEvent helper
│   └── sectStore/                    # Main game state (sliced pattern)
│       ├── index.ts                  # Composes all slices via spread
│       ├── types.ts                  # SectStore interface (127 lines)
│       ├── initial.ts                # Initial state factory + helpers
│       ├── tickSlice.ts              # Main game loop (tickAll)
│       ├── characterSlice.ts
│       ├── buildingSlice.ts
│       ├── resourceSlice.ts
│       ├── itemSlice.ts
│       ├── techniqueSlice.ts
│       ├── petSlice.ts
│       ├── shopSlice.ts
│       ├── sectPathSlice.ts
│       ├── legacySlice.ts
│       └── miscSlice.ts
│
├── systems/                          # Pure logic / game engine modules (no React)
│   ├── idle/                         # IdleEngine (setInterval-based tick loop)
│   ├── combat/                       # CombatEngine, AffixSystem, TargetingSystem, SkillAI
│   ├── economy/                      # ResourceEngine, AlchemySystem, ForgeSystem, SynergySystem
│   ├── building/                     # ProductionSystem
│   ├── character/                    # CharacterEngine, FateSystem, SpecialtySystem, etc.
│   ├── cultivation/                  # CultivationEngine, BreakthroughCoordinator, TribulationSystem
│   ├── equipment/                    # EquipmentEngine
│   ├── item/                         # ItemGenerator, ItemStackUtils
│   ├── pet/                          # PetSystem
│   ├── roguelike/                    # MapGenerator, EventSystem, LootSystem, AutoRunEngine, etc.
│   ├── save/                         # SaveSystem, HistoryStore, ResourceCache, db (IndexedDB)
│   ├── sect/                         # SectEngine, BuildingSystem, SectPathSystem, etc.
│   ├── skill/                        # SkillSystem
│   ├── technique/                    # TechniqueSystem
│   └── trade/                        # TradeSystem
│
├── types/                            # TypeScript type definitions
│   ├── index.ts                      # Barrel re-exports
│   ├── character.ts
│   ├── sect.ts
│   ├── item.ts
│   ├── adventure.ts
│   ├── skill.ts
│   ├── talent.ts
│   ├── technique.ts
│   └── runBuild.ts
│
├── data/                             # Static game data tables
│   ├── buildings.ts, recipes.ts, items.ts, skills.ts, affixes.ts, ...
│   └── icons/                        # Icon name maps (buildings, characters, items, etc.)
│
├── utils/
│   └── format.ts                     # formatCultivationValue helper
│
├── styles/
│   ├── theme.css                     # CSS custom properties (colors, spacing, typography)
│   └── globals.css                   # Reset, body, scrollbar, page-content layout
│
└── __tests__/                        # Vitest test files (~60 files)
    ├── setup.ts                      # Global test setup
    ├── CombatEngine.test.ts
    ├── CharacterCard.test.tsx
    └── ...
```

---

## Module Organization

### Where new code goes

| Type | Location | Example |
|------|----------|---------|
| New page | `src/pages/NewPage.tsx` + `NewPage.module.css` | `VaultPage.tsx` |
| New feature component | `src/components/<domain>/Panel.tsx` + `Panel.module.css` | `components/building/ForgePanel.tsx` |
| New shared component | `src/components/common/Widget.tsx` + `Widget.module.css` | `components/common/ProgressBar.tsx` |
| New game logic | `src/systems/<domain>/Engine.ts` | `systems/combat/CombatEngine.ts` |
| New store slice | `src/stores/sectStore/newSlice.ts` | `stores/sectStore/petSlice.ts` |
| New types | `src/types/entity.ts` + re-export in `index.ts` | `types/pet.ts` |
| New data tables | `src/data/tableName.ts` | `data/realms.ts` |
| New tests | `src/__tests__/ModuleName.test.ts` | `__tests__/CombatEngine.test.ts` |

### Co-location rules

- **One CSS Module per component**: `ComponentName.module.css` in the same directory
- **One page per route**: page + CSS module pair in `pages/`
- **Systems are directory-based**: each domain has its own folder under `systems/`

---

## Naming Conventions

| Category | Pattern | Example |
|----------|---------|---------|
| Page components | PascalCase `.tsx` | `SectPage.tsx` |
| Feature components | PascalCase `.tsx` | `ForgePanel.tsx` |
| CSS Modules | PascalCase `.module.css` co-located | `ForgePanel.module.css` |
| Store slices | camelCase `Slice.ts` | `characterSlice.ts` |
| System modules | PascalCase `.ts` | `CombatEngine.ts` |
| Type files | camelCase `.ts` | `character.ts` |
| Data tables | camelCase `.ts` | `buildings.ts` |
| Test files | Mirrors source path | `CombatEngine.test.ts` |
| Barrel files | `index.ts` | `types/index.ts` |

---

## Anti-Patterns

- **No nested feature folders**: components are flat within their domain directory (e.g., `components/building/ForgePanel.tsx`, not `components/building/forge/ForgePanel.tsx`)
- **No barrel files for components or systems**: import directly, not through index files
- **No custom hook files**: hook logic is inlined in components or extracted to store actions
- **No shared utility modules**: utilities are domain-specific and live in their system directory
