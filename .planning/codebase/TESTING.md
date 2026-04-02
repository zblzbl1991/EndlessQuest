# Testing Patterns

**Analysis Date:** 2026-04-02

## Test Framework

**Runner:**
- Vitest 4.1
- Config: `vite.config.ts` (inline test configuration, no separate vitest.config)

**Assertion Library:**
- Vitest built-in `expect` (vitest globals enabled)
- `@testing-library/jest-dom` for DOM assertions (`toBeInTheDocument()`, `toHaveAttribute()`)
- `@testing-library/react` for component testing (`render`, `screen`, `fireEvent`, `within`)

**Run Commands:**
```bash
npm test                # Run all tests (vitest run)
npm run test:watch      # Watch mode (vitest)
npx vitest run --reporter=verbose  # Verbose output
```

**Configuration:**
```typescript
// vite.config.ts
test: {
  globals: true,           // describe, it, expect available globally
  environment: 'jsdom',    // DOM environment for component tests
  setupFiles: ['./src/__tests__/setup.ts'],
}
```

**Setup file** (`src/__tests__/setup.ts`):
```typescript
import 'fake-indexeddb/auto'    // IndexedDB polyfill for jsdom
import '@testing-library/jest-dom'  // DOM matchers
```

## Test File Organization

**Location:**
- All tests in a single directory: `src/__tests__/`
- NOT co-located with source files
- No test files in `src/systems/`, `src/components/`, `src/pages/`, or `src/stores/`

**Naming:**
- `<ModuleName>.test.ts` for system/store tests
- `<ComponentName>.test.tsx` for React component tests
- Matches the PascalCase naming of the source file

**Structure:**
```
src/__tests__/
  setup.ts                           # Global setup
  # System tests (pure logic)
  CombatEngine.test.ts
  CharacterEngine.test.ts
  SectEngine.test.ts
  CultivationEngine.test.ts
  EquipmentEngine.test.ts
  ...
  # Store integration tests
  stores.test.ts                      # SectStore + AdventureStore (largest file)
  EventLogStore.test.ts
  HistoryStore.test.ts
  # Component tests (React)
  CharacterCard.test.tsx
  SectPage.test.tsx
  CharactersPage.test.tsx
  BuildingsPage.test.tsx
  AdventurePage.test.tsx
  AdventureReportPage.test.tsx
  NavigationShell.test.tsx
  BreakthroughPanel.test.tsx
  RunBuildSummary.test.tsx
  OfflineReportModal.test.tsx
  PixelIcons.test.tsx
  # Data/logic tests
  data.test.ts
  types.test.ts
  loot.test.ts
  missions.test.ts
  recipes.test.ts
  talents.test.ts
  db.test.ts
```

## Test Structure

**Suite Organization:**

System tests use nested `describe` blocks grouped by function:
```typescript
describe('SectEngine', () => {
  describe('calcSectLevel', () => {
    it('should return level 1 for mainHall 0-2', () => {
      expect(calcSectLevel(0)).toBe(1)
    })
  })
  describe('getMaxCharacters', () => {
    it('should return 5 for sect level 1', () => {
      expect(getMaxCharacters(1)).toBe(5)
    })
  })
})
```

Store tests use section comments and `describe` blocks grouped by feature area:
```typescript
// ---------------------------------------------------------------------------
// Character Management Tests
// ---------------------------------------------------------------------------
describe('SectStore - Character Management', () => {
  beforeEach(() => resetStore())
  it('addCharacter should add a new character', () => { ... })
  it('removeCharacter should remove a character by id', () => { ... })
})
```

Component tests render with `MemoryRouter` wrapper:
```typescript
describe('SectPage', () => {
  beforeEach(() => {
    useSectStore.getState().reset()
    useAdventureStore.getState().reset()
    useGameStore.getState().reset()
  })

  it('renders a light overview', () => {
    render(
      <MemoryRouter>
        <SectPage />
      </MemoryRouter>
    )
    expect(screen.getByText('当前安排')).toBeInTheDocument()
  })
})
```

**Patterns:**
- **Setup:** `beforeEach()` calls `resetStore()` to restore clean Zustand state
- **Teardown:** `afterEach()` calls `vi.restoreAllMocks()` when spies are used
- **Assertions:** `expect().toBe()`, `expect().toBeGreaterThan()`, `expect().toBeInTheDocument()`, `expect().toContain()`, `expect().toHaveLength()`
- **Negation:** `expect().not.toBeInTheDocument()` for absence checks, `expect(queryByText(...)).toBeNull()` pattern

## Mocking

**Framework:** Vitest built-in `vi` mock utilities

**Patterns:**

1. **Spying on Math.random** (most common mock - used to control randomness in game logic):
```typescript
vi.spyOn(Math, 'random').mockReturnValue(0.99)  // Force success
vi.spyOn(Math, 'random').mockReturnValue(0)      // Force failure
// Multiple return values for sequential calls:
vi.spyOn(Math, 'random').mockReturnValueOnce(0.2).mockReturnValueOnce(0.5)
// Cleanup:
vi.restoreAllMocks()  // in afterEach
// or inline:
const spy = vi.spyOn(Math, 'random').mockReturnValue(0.99)
spy.mockRestore()
```

2. **Mocking external modules** (used for save system isolation):
```typescript
vi.mock('../systems/save/SaveSystem', async () => {
  const actual = await vi.importActual<typeof import('../systems/save/SaveSystem')>(
    '../systems/save/SaveSystem'
  )
  return {
    ...actual,
    clearSaveData: vi.fn().mockResolvedValue(undefined),
  }
})
```

3. **Spying on system functions** (used for adventure automation tests):
```typescript
const resolveSpy = vi.spyOn(autoRunEngine, 'resolveAutomatedRun').mockReturnValue({...})
const recoverySpy = vi.spyOn(recoverySystem, 'resolveAdventureFailureOutcome')
  .mockReturnValueOnce({ outcome: 'recovering', recoveryDays: 2 })
  .mockReturnValueOnce({ outcome: 'sacrificed' })
recoverySpy.mockRestore()
resolveSpy.mockRestore()
```

4. **Spying on window.confirm** (for UI confirmation dialogs):
```typescript
const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
confirmSpy.mockRestore()
```

**What to Mock:**
- `Math.random()` for any test involving randomness (breakthroughs, character generation, combat)
- External I/O modules (save system) to avoid actual IndexedDB writes
- Cross-store system functions when testing store integration with controlled outcomes
- `window.confirm` for UI dialog tests

**What NOT to Mock:**
- Zustand stores (use actual stores, reset between tests)
- System pure functions (import and call directly)
- React components (render real component tree)
- React Router (wrap with `MemoryRouter` instead of mocking)

## Fixtures and Factories

**Test Data:**

Factory helper functions defined at the top of test files:
```typescript
// Pattern: make<Entity>() with spread overrides
function makeEquipment(id: string, overrides?: Partial<Equipment>): Equipment {
  return {
    id,
    name: 'Test Sword',
    quality: 'common',
    type: 'equipment',
    description: '',
    sellPrice: 10,
    slot: 'weapon',
    stats: { hp: 0, atk: 10, def: 0, spd: 0, crit: 0, critDmg: 0 },
    enhanceLevel: 0,
    refinementStats: [],
    setId: null,
    ...overrides,
  }
}

// Combat unit factory
function makeUnit(overrides: Partial<CombatUnit> & { id: string; name: string; team: 'ally' | 'enemy' }): CombatUnit {
  return {
    maxHp: 100, hp: 100, atk: 15, def: 8, spd: 10,
    crit: 0, critDmg: 1.5, element: 'neutral',
    spiritPower: 50, maxSpiritPower: 50,
    skills: [], skillCooldowns: [], affixes: [],
    preset: 'balanced', aggro: 0, shield: 0,
    ...overrides,
  }
}
```

Store state manipulation via `setState`:
```typescript
// Direct state patching for test setup
useSectStore.setState((s) => ({
  sect: {
    ...s.sect,
    resources: { ...s.sect.resources, spiritStone: 5000 },
    characters: s.sect.characters.map((c) =>
      c.id === charId ? { ...c, realmStage: 3 } : c
    ),
  },
}))
```

**Location:**
- Factory functions co-located at the top of each test file
- No shared test fixture files or external test data directory
- Store reset helpers defined per test file:
```typescript
function resetStore() {
  useSectStore.getState().reset()
  useGameStore.getState().reset()
}
function getStore() {
  return useSectStore.getState()
}
function getFirstCharacter(): Character {
  return getStore().sect.characters[0]
}
```

## Coverage

**Requirements:** None enforced (no coverage threshold configuration)

**Current test counts:** 64 test files, ~905 tests (903 passing, 2 known failures)

**View Coverage:**
```bash
npx vitest run --coverage
```

## Test Types

**Unit Tests:**
- System functions: import function directly, call with known inputs, assert outputs
- Pure functions tested in isolation without store involvement
- Examples: `CombatEngine.test.ts`, `SectEngine.test.ts`, `AffixSystem.test.ts`, `SkillAI.test.ts`
- Character generation, combat simulation, stat calculations, resource formulas

**Integration Tests:**
- Store tests: exercise full Zustand store slices with real state mutations
- The largest test file `stores.test.ts` (2497 lines) covers SectStore + AdventureStore integration
- Tests exercise the full action -> state mutation -> assertion flow
- Cross-store interaction tested (AdventureStore calling SectStore actions)
- `tickAll` tests exercise the entire game loop: resource production, cultivation, breakthrough, automation
- Examples: `stores.test.ts`, `EventLogStore.test.ts`, `HistoryStore.test.ts`

**E2E Tests:**
- Not used (no Playwright/Cypress configuration)

**Component Tests:**
- React components rendered with `@testing-library/react`
- Wrapped in `MemoryRouter` when routing is involved
- Test visible UI text and DOM structure, not implementation details
- Use `data-testid` attributes for stable selectors: `screen.getByTestId('sect-hero')`
- Use role-based queries where possible: `screen.getByRole('button', { name: '重置宗门' })`
- Use `within()` to scope queries to a section: `within(desktopNav).getByText(label)`
- Examples: `SectPage.test.tsx`, `NavigationShell.test.tsx`, `CharacterCard.test.tsx`

## Common Patterns

**Async Testing:**
```typescript
// Waiting for state changes after actions
await waitFor(() => {
  expect(useSectStore.getState().sect.level).toBe(1)
})

// Confirm dialog interaction
const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
fireEvent.click(screen.getByRole('button', { name: '重置宗门' }))
await waitFor(() => {
  expect(clearSaveData).toHaveBeenCalledTimes(1)
})
confirmSpy.mockRestore()
```

**Error Testing:**
```typescript
// Guard clause returns
it('should return null when at max', () => {
  const char = getStore().addCharacter('common')
  expect(char).toBeNull()
})

// Failure result objects
it('tryUpgradeBuilding should return reason on failure', () => {
  useSectStore.setState((s) => ({
    sect: { ...s.sect, resources: { ...s.sect.resources, spiritStone: 0 } },
  }))
  const result = getStore().tryUpgradeBuilding('mainHall')
  expect(result.success).toBe(false)
  expect(result.reason).toBeTruthy()
})
```

**Controlling Randomness:**
Most game logic involves `Math.random()`. Tests control this via:
```typescript
// Force breakthrough success (random > threshold)
vi.spyOn(Math, 'random').mockReturnValue(0.99)

// Force breakthrough failure (random < threshold)
vi.spyOn(Math, 'random').mockReturnValue(0)

// Multiple sequential random calls
vi.spyOn(Math, 'random')
  .mockReturnValueOnce(0.2)  // first call
  .mockReturnValueOnce(0.5)  // second call
```

**Store State Setup:**
Tests manipulate Zustand stores directly without page renders:
```typescript
// Setup resources
getStore().addResource('spiritStone', 10000)
getStore().addResource('ore', 1000)

// Patch character state
useSectStore.setState((s) => ({
  sect: {
    ...s.sect,
    characters: s.sect.characters.map((c) =>
      c.id === charId ? { ...c, cultivation: amount } : c
    ),
  },
}))
```

**Cross-Store Testing:**
Adventure store tests that interact with SectStore:
```typescript
function resetAdventureStore() {
  useAdventureStore.getState().reset()
  useSectStore.getState().reset()
}
function getAdventureStore() {
  return useAdventureStore.getState()
}
// Tests access both stores directly
const char = getStore().sect.characters[0]
const run = getAdventureStore().startRun('lingCaoValley', [char.id])
```

**Immutability Assertions:**
```typescript
it('should not mutate input units', () => {
  const allies = [makeUnit({ id: 'p1', name: 'Player', team: 'ally', atk: 20, spd: 10 })]
  const enemies = [makeUnit({ id: 'e1', name: 'Goblin', team: 'enemy', hp: 30, maxHp: 30, atk: 0, def: 0, spd: 5 })]
  const originalAllyHp = allies[0].hp
  simulateCombat(allies, enemies)
  expect(allies[0].hp).toBe(originalAllyHp)  // Input not mutated
})
```

---

*Testing analysis: 2026-04-02*
