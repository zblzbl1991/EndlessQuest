# Hook Guidelines

> How hooks are used in this project.

---

## Overview

This project uses React 19 hooks and Zustand's built-in hooks for state management. There are **no custom hooks** — all stateful logic lives in Zustand stores. React hooks are used for lifecycle (`useEffect`), refs (`useRef`), and local UI state (`useState`).

---

## Store Hooks (Primary Pattern)

### Zustand Selector Pattern

Components subscribe to store slices using selectors:

```tsx
// Read a single field — re-renders only when that field changes
const sect = useSectStore((s) => s.sect)

// Read multiple fields
const characters = useSectStore((s) => s.sect.characters)
const resources = useSectStore((s) => s.sect.resources)
```

**Real example** from `src/components/common/CharacterCard.tsx`:

```tsx
export default function CharacterCard({ character, onClick }: CharacterCardProps) {
  const sect = useSectStore((s) => s.sect)
  // ...
}
```

### Accessing Store Outside React

Use `getState()` for non-React contexts (systems, callbacks, auto-save):

```tsx
// In systems or callbacks (not inside components)
const { tickAll } = useSectStore.getState()
const { lastOnlineTime } = useGameStore.getState()
```

**Real example** from `src/App.tsx`:

```tsx
useEffect(() => {
  const { startGame, lastOnlineTime } = useGameStore.getState()
  const { tickAll } = useSectStore.getState()
  // ...
}, [isLoaded])
```

---

## Available Store Hooks

| Hook | Store | Purpose |
|------|-------|---------|
| `useSectStore` | `SectStore` | Main game state (13 slices) |
| `useAdventureStore` | `AdventureStore` | Dungeon run lifecycle |
| `useGameStore` | `GameStore` | Session state (loaded, online time) |
| `useEventLogStore` | `EventLogStore` | Event log (cap 200) |

---

## React Hooks Patterns

### useState for Local UI State

Used for modal visibility, form inputs, loading states:

```tsx
const [isLoaded, setIsLoaded] = useState(false)
const [offlineReport, setOfflineReport] = useState<OfflineReportData | null>(null)
```

### useEffect for Side Effects

- **Initialization** — Load game data, start engines (with ref guard to prevent double-mount)
- **Subscriptions** — Auto-save setup
- **Cleanup** — Return cleanup functions

```tsx
const loadingRef = useRef(false)

useEffect(() => {
  if (loadingRef.current) return
  loadingRef.current = true
  ;(async () => {
    try {
      await loadGame()
    } catch (e) {
      console.error('Failed to load save:', e)
    }
    setIsLoaded(true)
  })()
}, [])
```

### useRef for Mutable Non-Render Values

Used for preventing double-execution and holding engine instances:

```tsx
const loadingRef = useRef(false)
```

### lazy + Suspense for Code Splitting

All pages are lazy-loaded:

```tsx
const SectPage = lazy(() => import('./pages/SectPage'))
// ...
<Suspense fallback={<div />}>
  <Routes>...</Routes>
</Suspense>
```

---

## Naming Conventions

| Pattern | Usage |
|---------|-------|
| `useSectStore` | Zustand store hook (named export from store) |
| `useAdventureStore` | Zustand store hook |
| `useState` | React built-in — local state |
| `useEffect` | React built-in — side effects |
| `useRef` | React built-in — mutable refs |
| `useNavigate` | React Router hook |
| `useParams` | React Router hook |

---

## When to Create a Custom Hook

**Currently: never.** All stateful logic is in Zustand stores. If you find yourself duplicating store interaction logic across components, the answer is usually to:

1. Extract a shared component, or
2. Add a derived getter/computed value to the store

If a genuinely reusable UI behavior pattern emerges (e.g., a shared animation trigger), then create a custom hook following the `use*` naming convention in `src/utils/` or co-located with the feature.

---

## Common Mistakes

1. **Don't read entire store without a selector** — `useSectStore()` re-renders on every store change. Use `useSectStore((s) => s.field)`.
2. **Don't call `getState()` inside render** — Use it in callbacks and effects only.
3. **Don't forget the ref guard for one-time effects** — React Strict Mode double-mounts effects.
4. **Don't create custom hooks that wrap store logic** — Access stores directly.
