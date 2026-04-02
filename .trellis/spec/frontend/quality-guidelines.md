# Quality Guidelines

> Code quality standards for frontend development.

---

## Overview

Quality is enforced through TypeScript strict mode, ESLint, Prettier, and Vitest. Pre-commit hooks run lint-staged on every commit. All code must pass lint, typecheck, and tests before merging.

---

## Linting & Formatting

### ESLint 9

Flat config in `eslint.config.js` with:
- `typescript-eslint` recommended rules
- `eslint-plugin-react-hooks` for hooks rules

```bash
npm run lint          # Check for issues
```

### Prettier

Settings in `.prettierrc`:

| Setting | Value |
|---------|-------|
| Single quotes | `true` |
| Semicolons | `false` |
| Print width | `120` |
| Tab width | `2` |
| Trailing comma | `es5` |

```bash
npm run format          # Format all files
npm run format:check    # Check formatting without writing
```

### Pre-commit Hook

Husky + lint-staged runs on every commit:

- `src/**/*.{ts,tsx}` → `eslint --fix` + `prettier --write`
- `src/**/*.css` → `prettier --write`

---

## Forbidden Patterns

| Pattern | Why | Do Instead |
|---------|-----|------------|
| `any` type | Loses type safety | Use `unknown` or proper types |
| `enum` keyword | Unnecessary runtime code | Use string literal union types |
| Type assertions (`as X`) | Hides type errors | Use type guards or narrow properly |
| Inline styles | Breaks design system | Use CSS Modules |
| Hardcoded colors | Breaks theme consistency | Use `var(--color-*)` from theme.css |
| Barrel files | Slows builds, hides dependencies | Import directly (except `types/index.ts`) |
| Barrel exports from components | Unnecessary indirection | Import component files directly |
| `console.log` in production code | Noise | Use `emitEvent()` for game events |
| Store imports in systems | Couples logic to state | Systems are pure functions, receive data |
| `React.memo` without profiling | Premature optimization | Only add when profiling shows benefit |
| MMO-style heavy UI | Breaks design principles | Follow ink-wash minimal style |

---

## Required Patterns

| Pattern | When | Example |
|---------|------|---------|
| `import type` for type-only imports | Always | `import type { Character } from '../../types/character'` |
| CSS Modules co-located with component | All components | `Foo.tsx` + `Foo.module.css` |
| Null-safe class fallbacks | Conditional classes | `QUALITY_BORDER[quality] ?? ''` |
| Guard clause + early return | Store actions, system functions | Check conditions, return early |
| Spread for immutable updates | Zustand `set()` | `{ ...s.sect, characters: [...s.sect.characters, new] }` |
| Selector pattern in components | Store reads | `useSectStore((s) => s.field)` |
| Section separators in long files | Files over ~100 lines | `// ---...--- Section Name ---...---` |

---

## Testing Requirements

### Framework

- **Vitest 4** with `globals: true`, `jsdom` environment
- **Testing Library React** for component tests
- **fake-indexeddb** for IndexedDB mocking
- Setup file: `src/__tests__/setup.ts`

### Test File Location

Tests live in `src/__tests__/` (not co-located with source):

```
src/__tests__/
├── setup.ts
├── CombatEngine.test.ts
├── StatusBadge.test.tsx
├── SectPage.test.tsx
└── ...
```

### Test Patterns

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('StatusBadge', () => {
  it('renders recovering disciples with the recovery label', () => {
    render(<StatusBadge status="recovering" />)
    expect(screen.getByText('恢复中')).toBeInTheDocument()
  })
})
```

### Test Helpers

Factory functions prefixed with `make`:

```tsx
function makeSect(overrides?: Partial<Sect>): Sect {
  return {
    name: '测试宗门',
    level: 1,
    // ... defaults
    ...overrides,
  }
}

function makeCharacter(realm: number): Character {
  const char = generateCharacter('common')
  return { ...char, realm }
}
```

### Running Tests

```bash
npm run test              # Run all tests
npm run test -- --watch   # Watch mode
npm run test -- --reporter=verbose  # Verbose output
```

---

## TypeScript Checks

```bash
npx tsc -b               # Type check (used in build script)
```

Strict mode enabled with:
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noFallthroughCasesInSwitch: true`

---

## Code Review Checklist

Before marking work as done:

- [ ] `npm run lint` passes with no errors
- [ ] `npx tsc -b` passes with no errors
- [ ] `npm run test` passes with no failures
- [ ] No `any`, no type assertions, no `@ts-ignore`
- [ ] CSS uses theme variables, no hardcoded colors
- [ ] Responsive: works on mobile (< 640px), tablet (640-1023px), desktop (≥ 1024px)
- [ ] Store mutations use spread (immutable updates)
- [ ] New types added to `src/types/` and re-exported from `index.ts`
- [ ] New save fields have migration logic (old saves must load)
