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

Use `useMemo` for expensive computations — especially in components subscribed to `sect` (which re-renders every second due to the game tick):

```tsx
// Expensive: iterates buildings, calculates synergies
const activeSynergies = useMemo(() => getActiveSynergies(sect.buildings), [sect.buildings])

// Expensive: iterates all characters for each building
const autoAssignableCount = useMemo(
  () => sect.buildings.reduce((count, b) => count + getRecommendedIdleCount(b.type, sect.characters), 0),
  [sect.buildings, sect.characters],
)

// Lightweight: simple property access — no useMemo needed
const mainHallLevel = sect.buildings.find((b) => b.type === 'mainHall')?.level ?? 1
```

**Rule of thumb**: If it involves `.filter()`, `.reduce()`, or calling a system function, wrap in `useMemo` when the component subscribes to `sect`.

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

## Information Hierarchy

### Three-layer page architecture

Pages should organize content into three layers of visibility:

| Layer | Always Visible | Purpose |
|-------|---------------|---------|
| **Near** | PageHeader + primary metrics + resources | Answer "what's happening now?" |
| **Mid** | Expandable panels, summary rows | Answer "what can I do?" |
| **Far** | Collapsible `<details>` sections | Answer "what are all the details?" |

**Rule**: A page should never display all its sections fully expanded by default. Move secondary content (stats, settings, legacy info) into collapsible containers.

### Collapsible sections with native `<details>`

Use HTML `<details>/<summary>` for collapsible content — no custom accordion component:

```tsx
<details className={styles.collapsibleSection}>
  <summary className={styles.collapsibleSummary}>
    <span>Section Title</span>
    <span className={styles.collapsibleMeta}>展开详情</span>
  </summary>
  <ChildComponent />
</details>
```

```css
.collapsibleSummary {
  list-style: none;
}
.collapsibleSummary::-webkit-details-marker {
  display: none;
}
.collapsibleSummary::before {
  content: '▸';
  transition: transform 0.2s;
}
.collapsibleSection[open] > .collapsibleSummary::before {
  transform: rotate(90deg);
}
```

**Why**: No extra JS state, accessible by default, works on mobile without hover. Keep it simple.

### Avoid cross-page data duplication

If data appears in multiple pages, show a **summary** on the overview page and the **full detail** on the dedicated page — never render the same full component twice:

```tsx
// Good: SectPage shows one-line summary
<div className={styles.synergySummary}>
  建筑协同已激活 {activeCount}/{totalCount}
</div>

// Good: BuildingsPage shows full detail with progress tracking
<SynergySection buildings={sect.buildings} />
```

### Section subtitle pattern

When a section uses domain-specific terminology, add an explanatory subtitle below the title:

```tsx
<div className={styles.title}>宗门方针</div>
<div className={styles.subtitle}>选择宗门的冒险倾向，影响核心弟子数与风险偏好</div>
```

```css
.title { margin-bottom: 2px; }
.subtitle {
  font-size: 11px;
  color: var(--color-text-tertiary);
  margin-bottom: var(--space-sm);
}
```

**Why**: Mobile-first design means no hover tooltips. Explanations must be always-visible text. Keep subtitles to one line, under 20 characters.

---

## Disabled State Messaging

When a button is disabled, the UI must explain **why** it's disabled — not just show a gray button:

```tsx
// Bad — generic hint regardless of reason
<div className={styles.dungeonHint}>
  {unlocked ? '手动发起' : '当前境界不足'}
</div>
// This says "可探索" but the button is disabled because no idle characters!

// Good — specific reason for each disabled state
if (!unlocked) {
  hint = `需${unlockRealmName}才可探索`
} else if (availableCharacters.length === 0) {
  hint = '暂无空闲弟子可出战'
}
```

**Rule**: Every disabled button should have adjacent text explaining the blocking condition. Test by asking: "If I were a new player, would I know what to do to enable this button?"

---

## Sidebar Dynamic Hints

The desktop sidebar resource card shows a hint line below the spirit stone count. This should be **dynamic** — reflecting the most important current game state, not a hardcoded string:

```tsx
function getSidebarHint(sect: Sect): string {
  if (recoveringChars.length > 0) return `${count}名弟子恢复中`
  if (allBusy) return '弟子皆在外，留意归期'
  if (lowOnStones) return '灵石紧缺，留意收支'
  return '门中香火稳，诸务可理'  // default zen text
}
```

**Priority order**: Recovery > All-busy > Low-resources > Default zen text. Add new conditions at the top of the priority chain.

---

## Mobile Navigation Active State

The mobile bottom nav uses `NavLink` with an active class. The active state must be **visually distinct** — not just a subtle color change:

Required visual indicators:
1. **Bottom accent bar** via `::after` pseudo-element (3px, accent color)
2. **Icon frame background** with higher-contrast gradient (45% opacity, not 28%)
3. **Text color** change to accent color

```css
.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 3px;
  border-radius: 999px;
  background: rgba(109, 135, 152, 0.6);
}
```

**Why**: On small screens (11px labels), font-weight changes alone are imperceptible. Shape-based indicators (bars, underlines) are universally understood.

---

## Common Mistakes

1. **Subscribing to entire store** — Always use selectors: `useSectStore((s) => s.field)`
2. **Importing from barrel for components** — Import directly from the component file, not an index
3. **Using inline styles** — Always use CSS Modules and theme variables
4. **Adding useCallback/useMemo unnecessarily** — Only useMemo for expensive derivations; no useCallback
5. **Creating separate files for one-off helper components** — Keep them in the same file
6. **Orphaned CSS grid columns** — When removing a JSX child from a multi-column grid container, also remove the corresponding `grid-template-columns` rule. A grid like `minmax(260px, 320px) minmax(0, 1fr)` with only one child squeezes content into the narrow first column while the rest is blank. **Prevention**: After deleting a child element, grep the CSS for the parent's grid definition and update it to match the new child count.
7. **Placing hooks after conditional returns** — All hooks (`useMemo`, `useState`, store selectors) must run before any `if (...) return null` early return. When a component has a nullable dependency (like `character` from a `.find()`), use ternary guards inside the hook and move the early return after all hooks:

```tsx
// WRONG — hooks after early return violate rules-of-hooks
const character = useSectStore((s) => s.sect.characters.find(c => c.id === id))
if (!character) return null
const speed = useMemo(() => calcSpeed(sect, character), [sect, character]) // ERROR

// CORRECT — hooks before early return, with null guards
const character = useSectStore((s) => s.sect.characters.find(c => c.id === id))
const speed = useMemo(() => character ? calcSpeed(sect, character) : 0, [sect, character])
if (!character) return null
```
