# Component Guidelines

> How components are built in this project.

---

## Overview

All components are functional React components using TypeScript. One component per file, always `export default function`. CSS Modules for styling, co-located in the same directory. No UI framework (no MUI, no Shadcn) — all UI is hand-built with the ink-wash design system.

---

## Component Structure

Standard file layout:

```tsx
// 1. Type-only imports first
import type { CharacterStatus } from '../../types/character'

// 2. Value imports
import styles from './StatusBadge.module.css'

// 3. Module-level constants (UPPER_SNAKE_CASE Records for style/label maps)
const STATUS_LABELS: Record<CharacterStatus, string> = {
  idle: '修炼中',
  adventuring: '秘境中',
  // ...
}

// 4. Interface for props (inline, not exported unless needed externally)
interface StatusBadgeProps {
  status: CharacterStatus
  className?: string
}

// 5. Default export component function
export default function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={`${styles.badge} ${STATUS_STYLES[status] ?? ''} ${className ?? ''}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}
```

### Real Examples

- `src/components/common/StatusBadge.tsx` — Small presentational component with style maps
- `src/components/common/CharacterCard.tsx` — Complex component reading from store, multiple sections
- `src/components/cultivation/BreakthroughPanel.tsx` — Panel with conditional rendering and store actions

---

## Props Conventions

### Destructured Parameters

Always destructure props in the function signature:

```tsx
// Good
export default function CharacterCard({ character, onClick }: CharacterCardProps) {

// Bad — don't use `props.character`
export default function CharacterCard(props: CharacterCardProps) {
```

### Interface Definition

Define props interface inline in the same file. Use `interface` not `type` for props:

```tsx
interface CharacterCardProps {
  character: Character
  onClick?: () => void
}
```

### Optional Props

Use `?` for optional props, not defaults in the interface:

```tsx
interface StatusBadgeProps {
  status: CharacterStatus
  className?: string        // optional, no default needed
}
```

Handle defaults inside the component:

```tsx
className={`${styles.badge} ${className ?? ''}`}
```

### Callback Props

Event callbacks are optional with `?`. The component should check before calling:

```tsx
role={onClick ? 'button' : undefined}
tabIndex={onClick ? 0 : undefined}
```

---

## Styling Patterns

### CSS Modules

One `.module.css` file per component, co-located:

```
common/
├── CharacterCard.tsx
├── CharacterCard.module.css
├── StatusBadge.tsx
└── StatusBadge.module.css
```

Import as `styles` and reference via `styles.className`:

```tsx
import styles from './StatusBadge.module.css'
// ...
<span className={`${styles.badge} ${STATUS_STYLES[status] ?? ''}`}>
```

### Theme Variables

Use CSS custom properties from `src/styles/theme.css`:

```css
.characterCard {
  background: var(--color-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-md);
}
```

### Style Maps for Variants

Use `Record<Type, string>` constants mapping domain values to CSS module class names:

```tsx
const QUALITY_BORDER: Record<CharacterQuality, string> = {
  common: styles.qualityCommon,
  spirit: styles.qualitySpirit,
  immortal: styles.qualityImmortal,
  divine: styles.qualityDivine,
  chaos: styles.qualityChaos,
}
```

Then use with null-safe fallback:

```tsx
className={`${styles.card} ${QUALITY_BORDER[character.quality] ?? ''}`}
```

### Conditional Classes

Use template literals with `?? ''` for safety:

```tsx
className={`${styles.badge} ${STATUS_STYLES[status] ?? ''} ${className ?? ''}`}
```

### Design Principles

- **Ink-wash style** — Follow the `清墨轻岚` design system in `theme.css`
- **No inline styles** — All styles go in CSS Modules
- **Mobile-first** — Base styles for mobile, `@media (min-width: 640px)` for tablet, `@media (min-width: 1024px)` for desktop
- **44px minimum touch targets** on mobile
- **Theme variables** — Always use `var(--color-*)`, `var(--space-*)`, `var(--radius-*)` — never hardcode colors or spacing

---

## Component Categories

### Common Components (`components/common/`)

Shared UI primitives used across multiple pages. These should be generic and reusable:

- `CharacterCard` — Displays character info, used in CharactersPage and adventure team selection
- `StatusBadge` — Status indicator badge, used inside CharacterCard
- `ProgressBar` — Animated progress bar with variants
- `PixelIcon` — SVG pixel icon component
- `PageHeader` — Page title header
- `Sidebar` / `BottomNav` / `TopBar` — Navigation shell
- `ErrorBoundary` — Error recovery wrapper

### Feature Components (`components/<domain>/`)

Domain-specific panels tied to a particular feature area. These may read from stores and call store actions.

### Pages (`pages/`)

Route-level components. Lazy-loaded. Responsible for:
- Reading state from stores
- Orchestrating feature components
- Handling navigation

---

## Common Mistakes

1. **Don't create barrel files for components** — Import directly with relative paths
2. **Don't use inline styles** — Always use CSS Modules
3. **Don't hardcode colors** — Use `var(--color-*)` from `theme.css`
4. **Don't forget null-safe class fallbacks** — Use `?? ''` when mapping styles
5. **Don't import stores in common components that don't need them** — `StatusBadge` receives props, `CharacterCard` reads from store (intentional)
6. **Don't use `React.memo` or `useMemo` without reason** — Premature optimization
7. **Don't add `key` prop to style maps** — Keys are for lists, not conditional styling
