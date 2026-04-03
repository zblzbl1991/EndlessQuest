# Component Guidelines

> How components are built in this project.

---

## Overview

All components are functional React components with default exports. CSS Modules provide styling with theme variables from `src/styles/theme.css`. Components read state from Zustand stores using granular selectors. There are no class components, no render props, and no HOCs.

---

## Component Structure

Standard component file layout:

```tsx
// 1. Imports (types first, then values)
import type { Character, CharacterQuality } from '../../types/character'
import { useMemo } from 'react'
import styles from './ComponentName.module.css'
import { useSectStore } from '../stores/sectStore'

// 2. Constants (helper maps, lookup tables)
const QUALITY_BORDER: Record<CharacterQuality, string> = {
  common: styles.qualityCommon,
  spirit: styles.qualitySpirit,
  // ...
}

// 3. Props interface (inline, above component)
interface ComponentNameProps {
  character: Character
  onClick?: () => void
}

// 4. Component (default export, destructured props)
export default function ComponentName({ character, onClick }: ComponentNameProps) {
  // Zustand selectors
  const sect = useSectStore((s) => s.sect)
  // Derived state
  const stats = useMemo(() => deriveStats(character), [character])
  // JSX return
  return <div className={styles.container}>...</div>
}

// 5. Helper sub-components (private, no export)
function StatRow({ label, value }: { label: string; value: string }) {
  return <div className={styles.statRow}>...</div>
}
```

Examples:
- Page component: `src/pages/SectPage.tsx`
- Feature component: `src/components/building/ForgePanel.tsx`
- Shared component: `src/components/common/CharacterCard.tsx`

---

## Props Conventions

### Definition

- Define props interface inline above the component (not in a separate file)
- Use destructuring in the function signature
- Optional props use `?` with sensible defaults

```tsx
// Good
interface ProgressBarProps {
  value: number
  max: number
  variant?: 'default' | 'ink'
  className?: string
}

export default function ProgressBar({ value, max, variant = 'default', className }: ProgressBarProps) {
```

### Props + Store combination

Components can receive data via props AND read from stores simultaneously. This is used when a component needs both instance-specific data (via props) and global context (via store):

```tsx
// src/components/common/CharacterCard.tsx
interface CharacterCardProps {
  character: Character
  onClick?: () => void
}

export default function CharacterCard({ character, onClick }: CharacterCardProps) {
  const sect = useSectStore((s) => s.sect)  // global context from store
  // use character prop for instance-specific data
}
```

### No props for pages

Page components receive no props — they get all data from stores and route params:

```tsx
export default function SectPage() {
  const sect = useSectStore((s) => s.sect)
  // ...
}
```

---

## Styling Patterns

### CSS Modules

Every component has a co-located `.module.css` file. Import as `styles` and reference via `styles.className`:

```tsx
import styles from './ForgePanel.module.css'

// Usage
<div className={styles.container}>
  <span className={styles.title}>Title</span>
</div>
```

### Theme variables

Use CSS custom properties from `src/styles/theme.css`:

```css
/* ProgressBar.module.css */
.fill {
  background: linear-gradient(90deg, var(--color-border), var(--color-accent));
  transition: width var(--transition-normal);
}
```

### Conditional class merging

Use template literals for conditional classes (no classnames library):

```tsx
<div className={`${styles.fill} ${variant === 'ink' ? styles.fillInk : ''}`}>
```

### Quality/style maps

Use `Record<XQuality, string>` pattern to map domain values to CSS classes:

```tsx
const QUALITY_BORDER: Record<CharacterQuality, string> = {
  common: styles.qualityCommon,
  spirit: styles.qualitySpirit,
  immortal: styles.qualityImmortal,
  divine: styles.qualityDivine,
  chaos: styles.qualityChaos,
}
```

---

## Helper Sub-Components

Small private helper components are defined at the bottom of the same file with no export:

```tsx
// src/components/sect/StatsPanel.tsx (bottom of file)
function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.statRow}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </div>
  )
}
```

These are for simple, repeated JSX patterns within the same file. Do NOT extract to separate files unless reused across components.

---

## State in Components

### Zustand selectors

Always use a selector function — never call `useStore()` without one:

```tsx
// Good — granular selector
const sect = useSectStore((s) => s.sect)
const forgeEquipment = useSectStore((s) => s.forgeEquipment)

// Bad — subscribes to entire store
const store = useSectStore()
```

### Local UI state

Use `useState` sparingly for transient UI state (messages, form inputs):

```tsx
const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null)
```

### Derived state

Use `useMemo` for expensive computations:

```tsx
const characterStats = useMemo(() => getSectCharacterStatusSummary(sect.characters), [sect.characters])
```

### Event handlers

Define inline — no `useCallback` anywhere in the codebase:

```tsx
<button onClick={() => forgeEquipment(recipe)}>Forge</button>
```

---

## Accessibility

- Game UI with minimal a11y requirements
- Semantic HTML where appropriate (`<button>`, `<nav>`, `<main>`)
- Text content is primary (no icon-only controls without labels)
- Touch targets must be at least 44px on mobile (enforced in CSS)

---

## Common Mistakes

1. **Subscribing to entire store** — Always use selectors: `useSectStore((s) => s.field)`
2. **Importing from barrel for components** — Import directly from the component file, not an index
3. **Using inline styles** — Always use CSS Modules and theme variables
4. **Adding useCallback/useMemo unnecessarily** — Only useMemo for expensive derivations; no useCallback
5. **Creating separate files for one-off helper components** — Keep them in the same file
