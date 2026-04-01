# Adventure Automation Implementation Plan

> Status Snapshot (2026-04-01): Implemented and archived. Instant-resolution automation, adventure reports, report details routing, event-log linking, and report-centric adventure state are all in the current codebase.
>
> Verification (2026-04-01): `npm test` passed with 62 files / 884 tests, and `npm run build` passed.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current floor-by-floor dungeon progression with an instant-resolution automation flow that generates structured exploration reports, surfaces recent summaries on the adventure page, provides a dedicated report details page, and lets the global event log jump into dungeon details.

**Architecture:** Keep the existing dungeon map generation, event resolution, combat, pet, blessing, relic, and reward systems. Add a pure automation layer (`AutoRunPolicy` + `AutoRunEngine`) that runs a dungeon to completion in memory, converts the result into an `AdventureReport`, and lets `AdventureStore` persist/report on finished runs instead of exposing long-lived active dungeon runs. Dispatch missions remain tick-based and continue to use the adventure store.

**Tech Stack:** React 19, React Router 7, Zustand, TypeScript, IndexedDB via `idb`, Vitest, Testing Library

---

## File Structure Map

### New files

- `src/systems/roguelike/AutoRunPolicy.ts`
  Encodes the three automation modes (`steady`, `combat`, `profit`) into deterministic decisions for route choice, blessing choice, shop purchases, pet capture attempts, and retreat checks.

- `src/systems/roguelike/AutoRunEngine.ts`
  Runs a generated dungeon from start to finish in memory, emits structured report steps, and returns a fully-formed `AdventureReport`.

- `src/pages/AdventureReportPage.tsx`
  Dedicated dungeon report details page for full timeline review.

- `src/pages/AdventureReportPage.module.css`
  Styles for the report overview, timeline, and settlement panels.

- `src/__tests__/AutoRunPolicy.test.ts`
  Focused tests proving the three policies make distinct choices in the same scenarios.

- `src/__tests__/AutoRunEngine.test.ts`
  End-to-end engine tests for instant resolution and report generation.

- `src/__tests__/AdventureReportPage.test.tsx`
  UI tests for the report details route.

### Existing files to modify

- `src/types/adventure.ts`
  Add automation/report types and remove real-time dungeon-only assumptions from public adventure data.

- `src/types/index.ts`
  Re-export the new automation/report types.

- `src/stores/adventureStore.ts`
  Replace real-time dungeon run actions with report-centric automation entry points; keep dispatch ticking.

- `src/stores/eventLogStore.ts`
  Allow optional structured `data` payloads on emitted events so dungeon summary entries can carry `reportId`.

- `src/systems/save/HistoryStore.ts`
  Preserve structured event payloads for detail linking.

- `src/systems/save/SaveSystem.ts`
  Save/load adventure reports alongside dispatches, cap report history, and restore event payloads from IndexedDB.

- `src/systems/save/db.ts`
  Bump IndexedDB version only if schema/index changes become necessary during implementation.

- `src/pages/AdventurePage.tsx`
  Change from “active run dashboard” to “launch automation + recent report summaries”.

- `src/pages/AdventurePage.module.css`
  Refresh layout for strategy selector, recent report cards, and removal of countdown/manual continue UI.

- `src/pages/EventLogPage.tsx`
  Add dungeon-focused filtering and links into report details when `reportId` is present.

- `src/pages/EventLogPage.module.css`
  Add styles for filters/detail links if needed.

- `src/pages/SectPage.tsx`
  Replace active dungeon status usage with recent automation summary or “ready to explore again” cues.

- `src/components/sect/ActionAgenda.tsx`
  Remove assumptions about long-lived active dungeon runs and point to recent reports / fresh exploration opportunities.

- `src/App.tsx`
  Register the report details route and stop assuming dungeon progression happens in the app tick loop.

- `src/__tests__/stores.test.ts`
  Replace active run behavior assertions with automation/report behavior assertions while preserving dispatch coverage.

- `src/__tests__/SaveSystem.test.ts`
  Cover saving/loading reports and event payload restoration.

- `src/__tests__/EventLogStore.test.ts`
  Assert structured history payloads persist.

- `src/__tests__/SectPage.test.tsx`
  Update sect page expectations away from live dungeon run status.

- `src/__tests__/HistoryStore.test.ts`
  Add structured dungeon payload assertions if needed.

---

## Task 1: Define Adventure Automation Types and Event Payloads

**Files:**
- Modify: `src/types/adventure.ts`
- Modify: `src/types/index.ts`
- Modify: `src/stores/eventLogStore.ts`
- Modify: `src/systems/save/HistoryStore.ts`
- Test: `src/__tests__/types.test.ts`
- Test: `src/__tests__/EventLogStore.test.ts`
- Test: `src/__tests__/HistoryStore.test.ts`

- [ ] **Step 1: Write the failing type and payload tests**

Add/extend tests that assert:

```typescript
const strategy: AutomationStrategy = 'steady'

const report: AdventureReport = {
  id: 'report_1',
  config: {
    dungeonId: 'lingCaoValley',
    teamCharacterIds: ['c1'],
    supplyLevel: 'basic',
    tacticalPreset: 'balanced',
    automationStrategy: 'combat',
  },
  dungeonId: 'lingCaoValley',
  teamCharacterIds: ['c1'],
  startedAt: 1,
  finishedAt: 2,
  result: 'completed',
  floorsCleared: 5,
  rewards: { spiritStone: 10, spiritEnergy: 0, herb: 0, ore: 0 },
  itemRewards: [],
  finalMemberStates: {
    c1: { currentHp: 80, maxHp: 100, status: 'alive' },
  },
  steps: [],
}
```

Also add an event-log/history test like:

```typescript
emitEvent('adventure_complete', '秘境 灵草谷 通关', {
  reportId: 'report_1',
  dungeonId: 'lingCaoValley',
  result: 'completed',
  floorsCleared: 5,
})
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `npm test -- src/__tests__/types.test.ts src/__tests__/EventLogStore.test.ts src/__tests__/HistoryStore.test.ts`

Expected:
- Type assertions fail because `AutomationStrategy` / `AdventureReport` do not exist yet
- Event log tests fail because `emitEvent` does not accept payload data

- [ ] **Step 3: Add the minimal type and payload support**

Implement:

```typescript
export type AutomationStrategy = 'steady' | 'combat' | 'profit'

export interface AdventureRunConfig {
  dungeonId: string
  teamCharacterIds: string[]
  supplyLevel: SupplyLevel
  tacticalPreset: TacticalPreset
  automationStrategy: AutomationStrategy
}
```

Add `AdventureReportStep`, `AdventureReportSummary`, and `AdventureReport`.

Update `GameEvent` and history entries to carry optional structured payloads:

```typescript
export interface GameEvent {
  id: string
  timestamp: number
  type: EventType
  message: string
  data?: Record<string, unknown>
}

export function emitEvent(type: EventType, message: string, data: Record<string, unknown> = {}): void
```

- [ ] **Step 4: Re-run the focused tests to verify they pass**

Run: `npm test -- src/__tests__/types.test.ts src/__tests__/EventLogStore.test.ts src/__tests__/HistoryStore.test.ts`

Expected: PASS

- [ ] **Step 5: Commit the scoped changes**

Run:

```bash
git add src/types/adventure.ts src/types/index.ts src/stores/eventLogStore.ts src/systems/save/HistoryStore.ts src/__tests__/types.test.ts src/__tests__/EventLogStore.test.ts src/__tests__/HistoryStore.test.ts
git commit -m "feat: add adventure automation report types"
```

Note: If the worktree still contains unrelated user changes, stage only the listed files.

### Task 2: Build the Automation Policy and Instant-Resolution Engine

**Files:**
- Create: `src/systems/roguelike/AutoRunPolicy.ts`
- Create: `src/systems/roguelike/AutoRunEngine.ts`
- Test: `src/__tests__/AutoRunPolicy.test.ts`
- Test: `src/__tests__/AutoRunEngine.test.ts`

- [ ] **Step 1: Write failing policy tests for distinct strategy behavior**

Add tests that lock in differences such as:

```typescript
it('steady picks the lowest-risk route when team hp is shaky', () => {
  expect(selectRoute({...})).toBe(0)
})

it('profit prefers the highest-value route when the team is stable', () => {
  expect(selectRoute({...})).toBe(1)
})

it('combat delays retreat longer than steady in the same hp state', () => {
  expect(shouldRetreat(steadyContext)).toBe(true)
  expect(shouldRetreat(combatContext)).toBe(false)
})
```

- [ ] **Step 2: Run the policy tests and verify they fail**

Run: `npm test -- src/__tests__/AutoRunPolicy.test.ts`

Expected: FAIL because `AutoRunPolicy.ts` does not exist

- [ ] **Step 3: Implement the minimal automation policy**

Implement pure helpers such as:

```typescript
export function pickAutomationRoute(strategy: AutomationStrategy, floor: DungeonFloor, context: AutomationContext): number
export function pickAutomationBlessing(strategy: AutomationStrategy, options: BlessingId[]): BlessingId
export function shouldAttemptPetCapture(strategy: AutomationStrategy, context: AutomationContext): boolean
export function shouldRetreat(strategy: AutomationStrategy, context: AutomationContext): boolean
```

Make decisions deterministic and data-driven enough for repeatable tests.

- [ ] **Step 4: Re-run the policy tests and verify they pass**

Run: `npm test -- src/__tests__/AutoRunPolicy.test.ts`

Expected: PASS

- [ ] **Step 5: Write failing engine tests for instant resolution and report generation**

Add tests that assert:

```typescript
const report = runAutomatedDungeon({
  dungeon,
  run,
  automationStrategy: 'steady',
})

expect(report.result).toMatch(/completed|retreated|failed/)
expect(report.steps[0]?.type).toBe('run_started')
expect(report.steps.some((step) => step.type === 'route_selected')).toBe(true)
expect(report.finishedAt).toBeGreaterThanOrEqual(report.startedAt)
```

- [ ] **Step 6: Run the engine tests and verify they fail**

Run: `npm test -- src/__tests__/AutoRunEngine.test.ts`

Expected: FAIL because `AutoRunEngine.ts` does not exist

- [ ] **Step 7: Implement the minimal instant-resolution engine**

Implement a pure entry point like:

```typescript
export function resolveAutomatedRun(input: ResolveAutomatedRunInput): AdventureReport
```

Guidelines:
- Reuse `generateDungeonRun`, `resolveEvent`, `applyRunRewardModifiers`, `pickBlessingOptions`, `pickRelicReward`, and pet/shop helpers
- Maintain an internal mutable `DungeonRun`-like state object during execution
- Convert state changes into `AdventureReportStep[]`
- Remove all `floorTimer` / wall-clock waiting assumptions from the engine

- [ ] **Step 8: Re-run the engine tests to verify they pass**

Run: `npm test -- src/__tests__/AutoRunEngine.test.ts`

Expected: PASS

- [ ] **Step 9: Commit the scoped changes**

Run:

```bash
git add src/systems/roguelike/AutoRunPolicy.ts src/systems/roguelike/AutoRunEngine.ts src/__tests__/AutoRunPolicy.test.ts src/__tests__/AutoRunEngine.test.ts
git commit -m "feat: add automated dungeon resolution engine"
```

### Task 3: Refactor AdventureStore Around Reports Instead of Live Runs

**Files:**
- Modify: `src/stores/adventureStore.ts`
- Modify: `src/__tests__/stores.test.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write failing store tests for automation entry points**

Add or replace tests asserting:

```typescript
const report = getAdventureStore().runAutomation({
  dungeonId: 'lingCaoValley',
  teamCharacterIds: [char.id],
  supplyLevel: 'basic',
  tacticalPreset: 'balanced',
  automationStrategy: 'steady',
})

expect(report).not.toBeNull()
expect(getAdventureStore().reports[0]?.id).toBe(report!.id)
expect(getStore().sect.characters[0].status).toBe('idle')
```

Also keep dispatch coverage by asserting:

```typescript
getAdventureStore().tickAllIdle(30)
expect(getAdventureStore().dispatches[0].progress).toBeGreaterThan(0)
```

- [ ] **Step 2: Run the store tests and verify they fail**

Run: `npm test -- src/__tests__/stores.test.ts`

Expected:
- FAIL because `runAutomation` / `reports` / `getReport` do not exist
- Existing adventure run assumptions fail after new expectations are added

- [ ] **Step 3: Implement the minimal report-centric store**

Refactor `AdventureStore` to:

```typescript
interface AdventureStore {
  reports: AdventureReportSummary[]
  reportDetails: Record<string, AdventureReport>
  runAutomation(config: AdventureRunConfig): AdventureReport | null
  getReport(id: string): AdventureReport | undefined
  tickAllIdle(deltaSec: number): void // dispatch-only ticking remains
}
```

Implementation rules:
- Keep dispatch actions and ticking intact
- Remove dungeon floor timers and manual continue logic
- Use `resolveAutomatedRun(...)` inside `runAutomation`
- Apply final rewards/character status transitions based on report result
- Keep report detail cache capped (same cap later mirrored in persistence)

- [ ] **Step 4: Update the app tick usage without breaking dispatches**

In `src/App.tsx`, keep calling `tickAllIdle(delta)` only for dispatches; ensure no dungeon progression is tied to the app loop anymore.

- [ ] **Step 5: Re-run the store tests to verify they pass**

Run: `npm test -- src/__tests__/stores.test.ts`

Expected: PASS

- [ ] **Step 6: Commit the scoped changes**

Run:

```bash
git add src/stores/adventureStore.ts src/__tests__/stores.test.ts src/App.tsx
git commit -m "refactor: move adventure store to automation reports"
```

### Task 4: Persist Reports and Restore Event Detail Links

**Files:**
- Modify: `src/systems/save/SaveSystem.ts`
- Modify: `src/systems/save/db.ts`
- Modify: `src/__tests__/SaveSystem.test.ts`
- Modify: `src/__tests__/db.test.ts`
- Modify: `src/__tests__/EventLogStore.test.ts`

- [ ] **Step 1: Write failing persistence tests for reports**

Add tests that save and reload:

```typescript
useAdventureStore.setState({
  reports: [{
    id: 'report_1',
    dungeonId: 'lingCaoValley',
    teamCharacterIds: ['c1'],
    strategy: 'steady',
    tacticalPreset: 'balanced',
    startedAt: 1,
    finishedAt: 2,
    result: 'completed',
    floorsCleared: 5,
    rewards: { spiritStone: 30, spiritEnergy: 0, herb: 2, ore: 0 },
    itemRewardCount: 0,
  }],
  reportDetails: {
    report_1: fullReport,
  },
})
```

After `saveGame()` + `loadGame()`, assert the report summary and detail return.

Also assert event payload restoration:

```typescript
expect(useEventLogStore.getState().events[0]?.data?.reportId).toBe('report_1')
```

- [ ] **Step 2: Run the persistence tests and verify they fail**

Run: `npm test -- src/__tests__/SaveSystem.test.ts src/__tests__/db.test.ts src/__tests__/EventLogStore.test.ts`

Expected: FAIL because reports are not saved or restored

- [ ] **Step 3: Implement report persistence and restoration**

Persist adventure records as:

```typescript
type SavedAdventureRecord =
  | { id: string; kind: 'dispatch'; dispatch: DispatchState }
  | { id: string; kind: 'report'; report: AdventureReport }
```

Implementation notes:
- Keep dispatch records unchanged
- Replace saved `run` records with saved `report` records
- Trim stored reports to the chosen cap before writing
- Rehydrate `reports` summaries from full reports on load if needed
- Restore `GameEvent.data` when reconstructing event log entries from history

- [ ] **Step 4: Re-run the persistence tests to verify they pass**

Run: `npm test -- src/__tests__/SaveSystem.test.ts src/__tests__/db.test.ts src/__tests__/EventLogStore.test.ts`

Expected: PASS

- [ ] **Step 5: Commit the scoped changes**

Run:

```bash
git add src/systems/save/SaveSystem.ts src/systems/save/db.ts src/__tests__/SaveSystem.test.ts src/__tests__/db.test.ts src/__tests__/EventLogStore.test.ts
git commit -m "feat: persist adventure automation reports"
```

### Task 5: Replace AdventurePage with Launch + Recent Reports + Detail Route

**Files:**
- Modify: `src/pages/AdventurePage.tsx`
- Modify: `src/pages/AdventurePage.module.css`
- Create: `src/pages/AdventureReportPage.tsx`
- Create: `src/pages/AdventureReportPage.module.css`
- Modify: `src/App.tsx`
- Test: `src/__tests__/AdventureReportPage.test.tsx`
- Modify: `src/__tests__/SectPage.test.tsx`

- [ ] **Step 1: Write failing UI tests for recent report summaries and detail route**

Add page tests that assert:

```typescript
render(<AdventurePage />)
expect(screen.getByText('最近探索记录')).toBeInTheDocument()
expect(screen.getByRole('button', { name: '开始探索' })).toBeInTheDocument()
expect(screen.getByText('稳健')).toBeInTheDocument()
```

And for the detail page:

```typescript
renderWithRouter('/adventure/report/report_1')
expect(screen.getByText('探索过程')).toBeInTheDocument()
expect(screen.getByText('第 1 层开始')).toBeInTheDocument()
```

- [ ] **Step 2: Run the UI tests and verify they fail**

Run: `npm test -- src/__tests__/AdventureReportPage.test.tsx src/__tests__/SectPage.test.tsx`

Expected: FAIL because the detail route/page does not exist and the adventure page still expects live runs

- [ ] **Step 3: Implement the new adventure launch flow**

In `AdventurePage.tsx`:
- Replace active-run cards with recent report cards
- Add automation strategy picker to the team builder
- Wire “确认出发” to `runAutomation(...)`
- Remove countdowns, manual continue buttons, blessing/shop/pet interruption panels from the page

Route the report details page in `App.tsx`:

```tsx
<Route path="/adventure/report/:reportId" element={<AdventureReportPage />} />
```

Build `AdventureReportPage.tsx` to render:
- overview header
- result/reward summary
- ordered report steps timeline
- final settlement panel

- [ ] **Step 4: Re-run the UI tests to verify they pass**

Run: `npm test -- src/__tests__/AdventureReportPage.test.tsx src/__tests__/SectPage.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit the scoped changes**

Run:

```bash
git add src/pages/AdventurePage.tsx src/pages/AdventurePage.module.css src/pages/AdventureReportPage.tsx src/pages/AdventureReportPage.module.css src/App.tsx src/__tests__/AdventureReportPage.test.tsx src/__tests__/SectPage.test.tsx
git commit -m "feat: add adventure report pages"
```

### Task 6: Add Dungeon Detail Links to the Global Log and Update Sect Surfaces

**Files:**
- Modify: `src/pages/EventLogPage.tsx`
- Modify: `src/pages/EventLogPage.module.css`
- Modify: `src/pages/SectPage.tsx`
- Modify: `src/components/sect/ActionAgenda.tsx`
- Test: `src/__tests__/SectPage.test.tsx`

- [ ] **Step 1: Write failing tests for log/detail integration and sect summaries**

Add assertions such as:

```typescript
expect(screen.getByRole('link', { name: '查看明细' })).toHaveAttribute('href', '/adventure/report/report_1')
```

And on the sect surface:

```typescript
expect(screen.getByText('最近探索')).toBeInTheDocument()
expect(screen.queryByText(/进行中的秘境/)).not.toBeInTheDocument()
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npm test -- src/__tests__/SectPage.test.tsx`

Expected: FAIL because sect/event log surfaces still depend on active run messaging

- [ ] **Step 3: Implement log/detail links and report-based sect cues**

In `EventLogPage.tsx`:
- add a dungeon-focused filter or section
- render `查看明细` when `evt.data?.reportId` exists
- keep the page readable for non-dungeon events

In `SectPage.tsx` and `ActionAgenda.tsx`:
- remove “队伍正在第 X 层” assumptions
- show “最近探索” summary and “可再次探索” guidance instead

- [ ] **Step 4: Re-run the affected tests**

Run: `npm test -- src/__tests__/SectPage.test.tsx`

Expected: PASS

- [ ] **Step 5: Run the broader regression sweep**

Run:

```bash
npm test -- src/__tests__/AutoRunPolicy.test.ts src/__tests__/AutoRunEngine.test.ts src/__tests__/stores.test.ts src/__tests__/SaveSystem.test.ts src/__tests__/AdventureReportPage.test.tsx src/__tests__/SectPage.test.tsx
```

Expected: PASS

- [ ] **Step 6: Commit the scoped changes**

Run:

```bash
git add src/pages/EventLogPage.tsx src/pages/EventLogPage.module.css src/pages/SectPage.tsx src/components/sect/ActionAgenda.tsx src/__tests__/SectPage.test.tsx
git commit -m "feat: link event log to adventure reports"
```

### Task 7: Full Verification and Polish

**Files:**
- Modify: any files touched during verification fixes only
- Test: relevant existing suites

- [ ] **Step 1: Run formatting and lint checks**

Run:

```bash
npm run lint
npm run format:check
```

Expected: both succeed with no new warnings/errors

- [ ] **Step 2: Run the full test suite**

Run: `npm test`

Expected: PASS

- [ ] **Step 3: Perform a manual browser sanity check**

Check:
- launch a dungeon with each strategy
- confirm instant result card appears
- open the report details route
- confirm event log detail link lands on the correct report
- verify dispatches still progress over time

- [ ] **Step 4: Commit any final polish fixes**

Run:

```bash
git add <only-the-files-fixed-during-verification>
git commit -m "test: verify adventure automation flow"
```

---

## Notes for the Implementer

- Do not reintroduce per-floor timers or wall-clock waiting for dungeon resolution.
- Keep dispatch ticking alive; `tickAllIdle` should become “dispatch progression only” rather than disappear.
- Prefer adding small pure helpers in the new automation modules over stuffing more branching into `adventureStore.ts`.
- When migrating tests away from `activeRuns`, remove only dungeon-specific assumptions; keep dispatch coverage intact.
- The current worktree may already contain unrelated changes. Stage only the files listed in each task.

---

## Suggested Execution Order

1. Task 1
2. Task 2
3. Task 3
4. Task 4
5. Task 5
6. Task 6
7. Task 7
