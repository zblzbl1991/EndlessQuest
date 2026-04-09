# Quality Guidelines

> Code quality standards for frontend development.

---

## Overview

Quality is enforced through TypeScript strict mode, ESLint, Prettier, and Vitest tests. Pre-commit hooks run lint-staged to ensure no unformatted or linted code enters the repository.

---

## Linting

### ESLint configuration

- Flat config in `eslint.config.js`
- `typescript-eslint` recommended rules
- `eslint-plugin-react-hooks` for hooks rules

### Commands

```bash
npm run lint          # Check all files
npx eslint --fix src/file.ts  # Fix specific file
```

### Key rules

- No unused locals (`noUnusedLocals`)
- No unused parameters (`noUnusedParameters`)
- React hooks rules enforced
- TypeScript-aware linting

---

## Formatting

### Prettier configuration (`.prettierrc`)

- Single quotes
- No semicolons
- 2-space indent
- Trailing comma ES5
- 120 character print width

### Commands

```bash
npm run format          # Format all files
npm run format:check    # Check formatting without writing
```

### Pre-commit hook

Husky + lint-staged runs on every commit:

```json
{
  "lint-staged": {
    "src/**/*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "src/**/*.css": ["prettier --write"]
  }
}
```

---

## Type Checking

```bash
npx tsc -b             # Full type check
```

Strict mode enabled: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`.

Tests are excluded from TypeScript compilation (`"exclude": ["src/__tests__"]`).

---

## Testing

### Framework

- **Vitest** with `globals: true` and `jsdom` environment
- **@testing-library/react** for component tests
- **fake-indexeddb** for IndexedDB polyfill

### Test file location and naming

All tests live in `src/__tests__/`, mirroring the source module name:

| Source | Test File |
|--------|-----------|
| `src/systems/combat/CombatEngine.ts` | `src/__tests__/CombatEngine.test.ts` |
| `src/components/common/CharacterCard.tsx` | `src/__tests__/CharacterCard.test.tsx` |
| `src/pages/BuildingsPage.tsx` | `src/__tests__/BuildingsPage.test.tsx` |

### Test setup (`src/__tests__/setup.ts`)

```ts
import 'fake-indexeddb/auto'
import '@testing-library/jest-dom'
```

### Test patterns

**Factory functions** for complex test data:

```ts
function makeUnit(overrides: Partial<CombatUnit> & { id: string; name: string; team: 'ally' | 'enemy' }): CombatUnit {
  return {
    maxHp: 100, hp: 100, atk: 15, def: 8, spd: 10,
    ...overrides,
  }
}

// Usage
makeUnit({ id: 'p1', name: 'Player', team: 'ally', atk: 20 })
```

**Store reset** before each test:

```ts
beforeEach(() => {
  useSectStore.getState().reset()
  useSectStore.getState().addResource('spiritEnergy', 100)
})
```

**Direct state setup** for component tests:

```ts
useSectStore.setState((s) => ({
  sect: { ...s.sect, buildings: s.sect.buildings.map((b) => ({ ...b, unlocked: true })) },
}))
```

**Fake timers** for engine/interval tests:

```ts
beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })
```

### Testing conventions

1. **No mocking of stores** — Use real stores with `.reset()` in `beforeEach`
2. **No mocking of system functions** — Call real game logic
3. **Test file mirrors source path** — `CombatEngine.test.ts` for `CombatEngine.ts`
4. **Pure function unit tests** for systems — Pass input, assert output
5. **Component tests** render real components with real stores

### Run tests

```bash
npm test               # Run all tests
npx vitest run         # Same, explicitly
npx vitest run path    # Run specific test file
```

---

## Forbidden Patterns

1. **`any` type** — Use `unknown` or proper types
2. **Inline styles** — Use CSS Modules + theme variables
3. **`console.log` in production code** — Use `emitEvent()` for game events, `console.error` for infrastructure errors only
4. **`// @ts-ignore`** — Fix the type instead
5. **Re-exporting everything** — No barrel files for components/systems; import directly
6. **New UI framework/library** — Tech stack is locked (React + CSS Modules only)
7. **Server-side dependencies** — Pure client-side app, no API calls
8. **Mutating store state directly** — Always use `set()` with immutable spreads
9. **Importing from `@/` alias** — Use relative paths (`../../`) instead
10. **Emoji in code/UI** — Only use if explicitly requested
11. **Disabled buttons without explanation** — Every disabled button must have adjacent text explaining WHY
12. **Rendering the same full component on multiple pages** — Show summary on overview, detail on dedicated page
13. **Hardcoded static hint text** — Sidebar/status hints must reflect game state dynamically
14. **Hooks after conditional returns** — All hooks must run before any `if (...) return` early return. Use ternary null guards inside hooks instead

---

## Required Patterns

1. **`import type`** for type-only imports
2. **CSS Modules** for all component styling
3. **Theme variables** from `src/styles/theme.css` (not hardcoded colors/spacing)
4. **Zustand selectors** with `(s) => s.field` pattern
5. **Early return validation** in store actions (check conditions, return early, then mutate)
6. **Section separators** using `// ---...--- Section Name ---...---` for long files
7. **Co-located CSS Modules** — one `.module.css` per component, same directory
8. **Default export** for components, named exports for system functions
9. **`useMemo` for expensive derivations in tick-subscribed components** — Components subscribing to `sect` re-render every second; wrap `.filter()`, `.reduce()`, and system function calls in `useMemo`
10. **Module-level constants for static data** — Computations depending only on static imports (e.g., deduplicating `SYNERGIES`) should be computed once at module scope, not inside components
11. **Pass shared derivations via props** — When parent and child compute the same derived value, compute once in parent and pass as prop to avoid duplicate work

---

## Code Review Checklist

- [ ] TypeScript compiles without errors (`tsc -b`)
- [ ] ESLint passes (`npm run lint`)
- [ ] Prettier formatted (`npm run format:check`)
- [ ] Tests pass (`npm test`)
- [ ] No `any` types introduced
- [ ] New types defined in `src/types/` and re-exported from `index.ts`
- [ ] New store actions added to `SectStore` interface in `types.ts`
- [ ] CSS uses theme variables, not hardcoded values
- [ ] Mobile-first responsive design (min-width media queries)
- [ ] Touch targets >= 44px on mobile
- [ ] Disabled buttons have adjacent explanation text
- [ ] No duplicate full components across pages (summary on overview, detail on dedicated page)
- [ ] Mobile nav active state uses shape indicator (accent bar), not just color change
