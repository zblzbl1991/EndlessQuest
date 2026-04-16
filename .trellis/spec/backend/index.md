# Game Systems (Backend) Guidelines

> Implementation specs for game logic systems in `src/systems/` and `src/data/`.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Character Generation](./character-generation.md) | Character creation, randomization dimensions, type contracts | Filled |
| [Character Level System](./character-level-system.md) | XP growth, level-up, realm caps, stat boost contracts | Filled |
| [Guixu Loop Advisor](./guixu-loop-advisor.md) | Endgame loop preview, yield analysis, offline adjustment | Filled |
| [Midgame Systems](./midgame-systems.md) | Archetype, campaigns, risk tiers, modifier chains, narrative integration | Filled |
| [Cultivation Drama](./cultivation-drama.md) | Cultivation events (epiphany/bottleneck/dissipation), 5-level breakthrough gradient, growth trajectory | Filled |
| [Combat Visualization](./combat-visualization.md) | Battle narrative extraction, highlight detection, report integration | Filled |
| [Economy Depth](./economy-depth.md) | Spirit tide cycle, multi-resource costs, herb/ore independent uses | Filled |

---

## Architecture

All game logic lives in `src/systems/` as stateless pure functions. Systems never directly mutate store state — stores call systems and apply results.

```
src/types/    → Type definitions (interfaces, unions)
src/data/     → Static data tables (lookup tables, constants)
src/systems/  → Pure game logic functions
src/stores/   → State management (calls systems, applies results)
```

---

## Language

All documentation in **English**.
