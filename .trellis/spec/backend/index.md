# Game Systems (Backend) Guidelines

> Implementation specs for game logic systems in `src/systems/` and `src/data/`.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Character Generation](./character-generation.md) | Character creation, randomization dimensions, type contracts | Filled |

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
