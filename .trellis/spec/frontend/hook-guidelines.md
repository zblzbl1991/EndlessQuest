# Hook Guidelines

> How hooks are used in this project.

---

## Overview

This project does **not** define custom hooks as separate files. Hook logic is either inlined directly in components or extracted to Zustand store actions. The primary "hooks" are Zustand store selectors used in every component.

---

## No Custom Hook Files

There are no `use*.ts` hook files under `src/`. The project avoids the custom hook pattern because:

1. Stateful logic lives in **Zustand store actions** (not in hooks)
2. Pure logic lives in **system functions** under `src/systems/`
3. Components are thin — they read state and dispatch actions

If you find yourself wanting a custom hook, ask:
- Is this stateful? → Put it in a store action
- Is this pure logic? → Put it in a system function
- Is this a UI concern? → Inline it in the component

---

## Zustand Selector Pattern

The primary "hook" pattern is Zustand selectors. Always use granular selectors:

```tsx
// Good — each field selected individually
const sect = useSectStore((s) => s.sect)
const addCharacter = useSectStore((s) => s.addCharacter)
const forgeEquipment = useSectStore((s) => s.forgeEquipment)

// Bad — subscribes to entire store
const store = useSectStore()
```

Multiple selectors per component is normal:

```tsx
export default function ForgePanel() {
  const sect = useSectStore((s) => s.sect)
  const forgeEquipment = useSectStore((s) => s.forgeEquipment)
  const sectPathEffects = useSectStore((s) => s.getActiveRouteEffects())
  // ...
}
```

---

## Built-in React Hooks Usage

### `useState` — For transient local UI state only

```tsx
const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null)
```

Used sparingly for: form inputs, toast messages, modal visibility.

### `useMemo` — For expensive derivations

```tsx
const characterStats = useMemo(() => getSectCharacterStatusSummary(sect.characters), [sect.characters])
```

Only when the computation is non-trivial. Simple property access does not need useMemo.

### `useEffect` — Only in App.tsx for lifecycle

`useEffect` is only used in `src/App.tsx` for:
- Loading saved game from IndexedDB
- Starting/stopping IdleEngine
- Setting up auto-save subscription
- Handling offline catch-up

Do not use `useEffect` in feature components. If you need reactive side effects, use Zustand subscriptions.

### `useCallback` — Not used

The codebase has zero `useCallback` usage. Event handlers are defined inline:

```tsx
<button onClick={() => forgeEquipment(recipe)}>Forge</button>
```

---

## Reading State Outside React

Stores expose `.getState()` for reading state outside React components:

```tsx
// In system functions or store actions
const { sect } = useSectStore.getState()
const gameState = useGameStore.getState()
```

Cross-store communication uses this pattern:

```tsx
// In tickSlice.ts (inside a store action)
const gameState = useGameStore.getState()
useAdventureStore.getState().runAutomation(autoRunConfig)
```

---

## Standalone Store-Adjacent Functions

The `emitEvent` function is a standalone function (not a hook) that reads store state:

```tsx
// src/stores/eventLogStore.ts
export function emitEvent(type: EventType, message: string, data: Record<string, unknown> = {}): void {
  useEventLogStore.getState().addEvent(type, message, data)
  void addHistoryEntry({ type, timestamp: Date.now(), summary: message, data })
}
```

This pattern allows non-React code to interact with stores.

---

## Common Mistakes

1. **Creating custom hook files** — Put logic in store actions or system functions instead
2. **Using `useEffect` in feature components** — Use Zustand subscriptions for reactive side effects
3. **Subscribing to entire store** — Always use granular selectors
4. **Adding `useCallback`** — Not needed; inline handlers are fine
5. **Wrapping store reads in hooks** — Access stores directly with selectors
