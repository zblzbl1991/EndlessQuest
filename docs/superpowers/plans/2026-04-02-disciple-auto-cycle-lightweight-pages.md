# Disciple Auto Cycle And Lightweight Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Status (2026-04-02):** Core scope implemented on `master`. Tasks 1-6 are complete, Task 7 Step 1 is complete, and final repo-wide `lint` / `build` verification is still pending.
>
> **Completed commits:** `a4cb76b`, `b78ccfb`, `7efdde6`, `64c7748`, `4bcdd47`, `3d4e683`, `7ab9b8c`
>
> **Implemented follow-up beyond the original plan:** Adventure reports now persist and surface post-run member return outcomes (`平安归宗 / 重伤归宗 / 未归`) on both the adventure list and report detail pages.

**Goal:** Build a day-based disciple auto-cycle with dual-resource breakthroughs, sacrifice-or-recovery failure handling, and lighter top-level page layouts that surface status and actions before decorative copy.

**Architecture:** Keep the existing Zustand-centered architecture, but pull the new behavior into small focused helpers instead of bloating the current slices further. Add game-day and automation settings to persisted state, drive the new loop from the idle tick, reuse the existing automated adventure runner for expedition resolution, and simplify page chrome directly in each page instead of introducing a generic layout abstraction too early.

**Tech Stack:** React 19, TypeScript, Zustand, Vitest, Testing Library, Vite, IndexedDB persistence

---

## File Map

- Create: `src/systems/character/DiscipleRecoverySystem.ts`
  Holds random recovery-day ranges, countdown helpers, and outcome typing for “recovering” disciples.
- Create: `src/systems/sect/SectAutomationSystem.ts`
  Holds pure helpers for daily automation decisions: should recruit, who is eligible, team selection scoring, and expedition launch gating.
- Create: `src/__tests__/DiscipleRecoverySystem.test.ts`
  Covers recovery-day ranges and countdown behavior.
- Create: `src/__tests__/SectAutomationSystem.test.ts`
  Covers automation thresholds, team selection, and resource gate logic.
- Modify: `src/types/character.ts`
  Adds recovery-day data and any new automation-facing status value if chosen.
- Modify: `src/types/sect.ts`
  Adds automation settings and any new sect-level day-state or automation summary fields.
- Modify: `src/types/index.ts`
  Re-exports new types for shared usage.
- Modify: `src/stores/gameStore.ts`
  Adds `currentGameDay` and `dayProgressSec`.
- Modify: `src/stores/sectStore/types.ts`
  Extends the store contract for automation settings, recovery helpers, and day processing hooks.
- Modify: `src/stores/sectStore/initial.ts`
  Seeds automation defaults and recovery/day defaults into the initial save shape.
- Modify: `src/stores/sectStore/characterSlice.ts`
  Adds automation setting mutators, recovery-state setters, and updated recruit logic integration points.
- Modify: `src/stores/sectStore/tickSlice.ts`
  Reworks breakthrough costs, daily progression, recovery countdown, and daily automation dispatch.
- Modify: `src/stores/adventureStore.ts`
  Updates automated run settlement to return wounded survivors, support automatic team launch flow, and preserve automation-facing report data.
- Modify: `src/systems/cultivation/CultivationEngine.ts`
  Extends breakthrough gating for spirit-energy + spirit-stone requirements where the tick slice needs a single source of truth.
- Modify: `src/systems/save/SaveSystem.ts`
  Persists automation settings, recovery-day data, and game-day data.
- Modify: `src/App.tsx`
  Ensures the app loop advances both sect ticks and the new day-based automation clock cleanly.
- Modify: `src/components/common/CharacterCard.tsx`
  Removes primary-surface disposition copy and replaces it with tighter, status-first card content.
- Modify: `src/pages/CharactersPage.tsx`
  Reorients the page around pool state, automation settings, and a leaner roster/detail layout.
- Modify: `src/pages/AdventurePage.tsx`
  Makes automation the main expedition entry point and strips the verbose hero copy.
- Modify: `src/pages/BuildingsPage.tsx`
  Removes decorative hero/lead copy and shifts the page to title + status + work area.
- Modify: `src/pages/SectPage.tsx`
  Keeps the only light title-signature page but compresses “宗门近况” into a tighter dashboard.
- Modify: `src/pages/AdventureReportPage.tsx`
  Removes extra atmospheric lead copy and keeps result-first summary.
- Modify: `src/pages/EventLogPage.tsx`
  Simplifies the page toward title + archive/log content.
- Modify: `src/__tests__/stores.test.ts`
  Covers breakthrough resource changes, automation-driven recruit/dispatch behavior, and sacrifice/recovery outcomes.
- Modify: `src/__tests__/SaveSystem.test.ts`
  Covers persistence of automation settings, recovery-day state, and game-day fields.
- Modify: `src/__tests__/CharactersPage.test.tsx`
  Covers removal of primary disposition UI and the new pool/automation summary.
- Modify: `src/__tests__/AdventurePage.test.tsx`
  Covers the new automation-first expedition surface and lighter page header.
- Modify: `src/__tests__/BuildingsPage.test.tsx`
  Covers the lighter page shell and removal of hero copy.
- Modify: `src/__tests__/SectPage.test.tsx`
  Covers the compressed total-overview page structure.
- Modify: `src/__tests__/AdventureReportPage.test.tsx`
  Covers the tighter report header and result-first summary.

---

### Task 1: Add Game-Day, Automation, And Recovery State Shapes

**Files:**
- Create: `src/__tests__/DiscipleRecoverySystem.test.ts`
- Modify: `src/types/character.ts`
- Modify: `src/types/sect.ts`
- Modify: `src/types/index.ts`
- Modify: `src/stores/gameStore.ts`
- Modify: `src/stores/sectStore/types.ts`
- Modify: `src/stores/sectStore/initial.ts`

- [x] **Step 1: Write a failing recovery-system test for quality-based day ranges and countdown completion**

```ts
import { describe, expect, it, vi } from 'vitest'
import { getRecoveryDaysForQuality, tickRecoveryDays } from '../systems/character/DiscipleRecoverySystem'

describe('DiscipleRecoverySystem', () => {
  it('rolls common disciples into the 1-3 day window', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    expect(getRecoveryDaysForQuality('common')).toBe(3)
  })

  it('returns an idle-ready result when the recovery countdown reaches zero', () => {
    expect(tickRecoveryDays(1, 1)).toEqual({ remainingDays: 0, recovered: true })
  })
})
```

- [x] **Step 2: Run the recovery-system test to verify it fails because the helper does not exist yet**

Run: `npm test -- src/__tests__/DiscipleRecoverySystem.test.ts`
Expected: FAIL with module-not-found or missing export errors for `DiscipleRecoverySystem`.

- [x] **Step 3: Extend the character, sect, and game-state types with the new persisted fields**

```ts
export type CharacterStatus =
  | 'idle'
  | 'adventuring'
  | 'patrolling'
  | 'resting'
  | 'injured'
  | 'training'
  | 'recovering'

export interface Character {
  // ...
  recoveryDaysRemaining: number
}

export interface SectAutomationSettings {
  enabled: boolean
  targetPoolSize: number
  reserveSpiritStone: number
  reserveSpiritEnergy: number
  recruitQualityFloor: CharacterQuality
  preferredDungeonId: string | null
  casualtyTolerance: 'conservative' | 'balanced' | 'risky'
  autoBreakthrough: boolean
}
```

```ts
interface GameStore {
  currentGameDay: number
  dayProgressSec: number
}
```

- [x] **Step 4: Seed the new defaults in the initial state and store contracts**

```ts
automationSettings: {
  enabled: true,
  targetPoolSize: 8,
  reserveSpiritStone: 300,
  reserveSpiritEnergy: 120,
  recruitQualityFloor: 'common',
  preferredDungeonId: 'lingCaoValley',
  casualtyTolerance: 'balanced',
  autoBreakthrough: true,
}
```

```ts
currentGameDay: 1,
dayProgressSec: 0,
```

- [x] **Step 5: Run the recovery-system test again to verify it passes after the minimal type/default scaffolding exists**

Run: `npm test -- src/__tests__/DiscipleRecoverySystem.test.ts`
Expected: PASS

- [x] **Step 6: Commit the new state-shape groundwork**

```bash
git add src/types/character.ts src/types/sect.ts src/types/index.ts src/stores/gameStore.ts src/stores/sectStore/types.ts src/stores/sectStore/initial.ts src/__tests__/DiscipleRecoverySystem.test.ts
git commit -m "feat: add automation and recovery state scaffolding"
```

---

### Task 2: Implement Recovery Helpers And Dual-Resource Breakthrough Gating

**Files:**
- Create: `src/systems/character/DiscipleRecoverySystem.ts`
- Modify: `src/systems/cultivation/CultivationEngine.ts`
- Modify: `src/__tests__/stores.test.ts`
- Test: `src/__tests__/DiscipleRecoverySystem.test.ts`

- [x] **Step 1: Write a failing store test for breakthroughs requiring both spirit energy and spirit stones**

```ts
it('does not auto-breakthrough when spirit energy meets cultivation but reserve-gated breakthrough energy is missing', () => {
  const char = getStore().sect.characters[0]

  useSectStore.setState((s) => ({
    sect: {
      ...s.sect,
      resources: { ...s.sect.resources, spiritEnergy: 0, spiritStone: 1000 },
      characters: s.sect.characters.map((item) =>
        item.id === char.id ? { ...item, cultivation: 100 } : item
      ),
    },
  }))

  getStore().tickAll(1)

  expect(getStore().sect.characters[0].realmStage).toBe(0)
})
```

- [x] **Step 2: Run the targeted store and recovery tests to verify the new breakthrough expectation fails**

Run: `npm test -- src/__tests__/DiscipleRecoverySystem.test.ts src/__tests__/stores.test.ts`
Expected: FAIL because breakthroughs still only check spirit stones and no recovery helper is wired yet.

- [x] **Step 3: Implement the recovery helper with quality-based ranges and countdown math**

```ts
const RECOVERY_DAY_RANGES = {
  common: [1, 3],
  spirit: [2, 4],
  immortal: [3, 6],
  divine: [5, 8],
  chaos: [6, 10],
} as const

export function tickRecoveryDays(current: number, elapsedDays: number) {
  const remainingDays = Math.max(0, current - elapsedDays)
  return { remainingDays, recovered: remainingDays === 0 }
}
```

- [x] **Step 4: Extend the cultivation engine API to accept both breakthrough resources**

```ts
export function canBreakthrough(
  character: Character,
  costs?: { spiritStone?: number; spiritEnergy?: number },
  available?: { spiritStone: number; spiritEnergy: number }
): boolean {
  // existing cultivation readiness checks...
  if (costs?.spiritStone && available && available.spiritStone < costs.spiritStone) return false
  if (costs?.spiritEnergy && available && available.spiritEnergy < costs.spiritEnergy) return false
  return true
}
```

- [x] **Step 5: Re-run the targeted tests to confirm the helper and breakthrough gating are green**

Run: `npm test -- src/__tests__/DiscipleRecoverySystem.test.ts src/__tests__/stores.test.ts`
Expected: PASS on the new helper assertions; store tests may still fail on tick integration, which is okay for now.

- [x] **Step 6: Commit the recovery helper and breakthrough-gating primitives**

```bash
git add src/systems/character/DiscipleRecoverySystem.ts src/systems/cultivation/CultivationEngine.ts src/__tests__/DiscipleRecoverySystem.test.ts src/__tests__/stores.test.ts
git commit -m "feat: add recovery helpers and dual-resource breakthrough gating"
```

---

### Task 3: Add Daily Automation Decisions And Integrate Them Into Sect Ticks

**Files:**
- Create: `src/__tests__/SectAutomationSystem.test.ts`
- Create: `src/systems/sect/SectAutomationSystem.ts`
- Modify: `src/stores/sectStore/characterSlice.ts`
- Modify: `src/stores/sectStore/tickSlice.ts`
- Modify: `src/App.tsx`
- Test: `src/__tests__/stores.test.ts`

- [x] **Step 1: Write a failing automation-system test for recruit gating and eligible-team selection**

```ts
import { pickAutomationTeam, shouldAutoRecruit } from '../systems/sect/SectAutomationSystem'

it('recruits only when the pool is below target and reserve thresholds are satisfied', () => {
  expect(
    shouldAutoRecruit({
      poolSize: 6,
      targetPoolSize: 8,
      spiritStone: 500,
      reserveSpiritStone: 300,
      spiritEnergy: 200,
      reserveSpiritEnergy: 120,
    })
  ).toBe(true)
})

it('skips recovering and patrolling disciples when auto-building a team', () => {
  const team = pickAutomationTeam(characters, settings)
  expect(team).toEqual(['fighter_1', 'fighter_2'])
})
```

- [x] **Step 2: Run the automation-system and store tests to verify the automation layer is missing**

Run: `npm test -- src/__tests__/SectAutomationSystem.test.ts src/__tests__/stores.test.ts`
Expected: FAIL because `SectAutomationSystem` and the new tick behavior do not exist.

- [x] **Step 3: Implement a pure automation helper module**

```ts
export function shouldAutoRecruit(input: {
  poolSize: number
  targetPoolSize: number
  spiritStone: number
  reserveSpiritStone: number
  spiritEnergy: number
  reserveSpiritEnergy: number
}) {
  return (
    input.poolSize < input.targetPoolSize &&
    input.spiritStone > input.reserveSpiritStone &&
    input.spiritEnergy > input.reserveSpiritEnergy
  )
}

export function pickAutomationTeam(characters: Character[], casualty: CasualtyTolerance): string[] {
  return characters
    .filter((character) => character.status === 'idle' && character.recoveryDaysRemaining === 0)
    .sort(compareByAdventureValueThenRisk)
    .slice(0, 5)
    .map((character) => character.id)
}
```

- [x] **Step 4: Add store mutators for automation settings and wire daily progression in `tickSlice`**

```ts
setAutomationSettings: (patch) =>
  set((state) => ({
    sect: {
      ...state.sect,
      automationSettings: { ...state.sect.automationSettings, ...patch },
    },
  }))
```

```ts
const totalDayProgress = useGameStore.getState().dayProgressSec + deltaSec
const elapsedDays = Math.floor(totalDayProgress / 60)
useGameStore.setState({
  currentGameDay: useGameStore.getState().currentGameDay + elapsedDays,
  dayProgressSec: totalDayProgress % 60,
})
```

- [x] **Step 5: Trigger recruit / breakthrough / expedition automation once per elapsed day**

```ts
for (let day = 0; day < elapsedDays; day++) {
  processRecoveryDay()
  processAutoRecruit()
  processAutoBreakthrough()
  processAutoExpedition()
}
```

- [x] **Step 6: Re-run the targeted automation/store tests to verify the day-based loop passes**

Run: `npm test -- src/__tests__/SectAutomationSystem.test.ts src/__tests__/stores.test.ts`
Expected: PASS on the new automation-system tests and PASS on the updated tick-driven automation expectations.

- [x] **Step 7: Commit the daily automation integration**

```bash
git add src/systems/sect/SectAutomationSystem.ts src/stores/sectStore/characterSlice.ts src/stores/sectStore/tickSlice.ts src/stores/gameStore.ts src/App.tsx src/__tests__/SectAutomationSystem.test.ts src/__tests__/stores.test.ts
git commit -m "feat: add day-based sect automation loop"
```

---

### Task 4: Update Adventure Resolution To Support Sacrifice-Or-Recovery Outcomes

**Files:**
- Modify: `src/stores/adventureStore.ts`
- Modify: `src/stores/sectStore/characterSlice.ts`
- Modify: `src/__tests__/stores.test.ts`
- Modify: `src/__tests__/SaveSystem.test.ts`

- [x] **Step 1: Write a failing store test for failed runs producing a recovering disciple instead of always sacrificing everyone**

```ts
it('sends some failed expedition members into recovering instead of always removing them', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0.95)

  const run = getAdventureStore().startRun('lingCaoValley', [getFirstCharacter().id])
  useAdventureStore.setState((state) => ({
    activeRuns: {
      ...state.activeRuns,
      [run!.id]: {
        ...state.activeRuns[run!.id]!,
        memberStates: {
          [getFirstCharacter().id]: { currentHp: 0, maxHp: 100, status: 'dead' },
        },
      },
    },
  }))

  getAdventureStore().failRun(run!.id)

  expect(useSectStore.getState().sect.characters[0]?.status).toBe('recovering')
  expect(useSectStore.getState().sect.characters[0]?.recoveryDaysRemaining).toBeGreaterThan(0)
})
```

- [x] **Step 2: Run the targeted store and save tests to verify recovery persistence/outcomes are missing**

Run: `npm test -- src/__tests__/stores.test.ts src/__tests__/SaveSystem.test.ts`
Expected: FAIL because failed runs still always sacrifice dead members and the new recovery fields are not saved/loaded.

- [x] **Step 3: Replace the current “always sacrifice dead members” logic with outcome-aware settlement**

```ts
function settleRunMembers(run: DungeonRun) {
  for (const charId of run.teamCharacterIds) {
    const memberState = run.memberStates[charId]
    if (!memberState) continue

    if (memberState.status === 'dead') {
      const outcome = rollDiscipleFailureOutcome(settings.casualtyTolerance)
      if (outcome.kind === 'recovering') {
        sectStore.setCharacterRecovering(charId, outcome.days)
      } else {
        sectStore.sacrificeCharacter(charId, { source: 'adventure', reason: '秘境失利，身死道消' })
      }
    } else {
      sectStore.setCharacterStatus(charId, 'idle')
    }
  }
}
```

- [x] **Step 4: Persist and normalize the new recovery/day fields in `SaveSystem`**

```ts
useGameStore.setState({
  lastOnlineTime: meta.lastOnlineTime,
  currentGameDay: meta.currentGameDay ?? 1,
  dayProgressSec: meta.dayProgressSec ?? 0,
})
```

```ts
return {
  ...character,
  recoveryDaysRemaining: normalizeFiniteNumber(character.recoveryDaysRemaining, 0),
}
```

- [x] **Step 5: Re-run the targeted store/save tests to verify sacrifice-or-recovery behavior persists correctly**

Run: `npm test -- src/__tests__/stores.test.ts src/__tests__/SaveSystem.test.ts`
Expected: PASS

- [x] **Step 6: Commit the failure-outcome and persistence changes**

```bash
git add src/stores/adventureStore.ts src/stores/sectStore/characterSlice.ts src/systems/save/SaveSystem.ts src/__tests__/stores.test.ts src/__tests__/SaveSystem.test.ts
git commit -m "feat: persist disciple recovery and failure outcomes"
```

---

### Task 5: Rebuild Characters And Adventure Pages Around Automation-First Surfaces

**Files:**
- Modify: `src/components/common/CharacterCard.tsx`
- Modify: `src/pages/CharactersPage.tsx`
- Modify: `src/pages/AdventurePage.tsx`
- Modify: `src/__tests__/CharactersPage.test.tsx`
- Modify: `src/__tests__/AdventurePage.test.tsx`

- [x] **Step 1: Write failing page tests for the new automation-first headers and removal of primary disposition copy**

```tsx
expect(screen.getByText('弟子')).toBeInTheDocument()
expect(screen.getByText('自动运转')).toBeInTheDocument()
expect(screen.queryByText('门中名册')).not.toBeInTheDocument()
expect(screen.queryByText('弟子判断')).not.toBeInTheDocument()
expect(screen.queryByText('留守价值')).not.toBeInTheDocument()
```

```tsx
expect(screen.getByText('秘境')).toBeInTheDocument()
expect(screen.getByText('自动运转')).toBeInTheDocument()
expect(screen.queryByText('山门之前')).not.toBeInTheDocument()
expect(screen.queryByText('门前风向')).not.toBeInTheDocument()
```

- [x] **Step 2: Run the characters/adventure page tests to verify the old verbose headers still fail the new expectations**

Run: `npm test -- src/__tests__/CharactersPage.test.tsx src/__tests__/AdventurePage.test.tsx`
Expected: FAIL because the pages still render the old hero copy and disposition-heavy surface.

- [x] **Step 3: Tighten the roster card and character detail surfaces**

```tsx
<div className={styles.infoStrip}>
  <span className={styles.infoLabel}>状态</span>
  <span className={styles.infoValue}>{STATUS_LABELS[character.status]}</span>
</div>
```

```tsx
{character.recoveryDaysRemaining > 0 && (
  <span className={styles.infoValue}>恢复中 · 还需 {character.recoveryDaysRemaining} 天</span>
)}
```

Remove:
- the primary-surface `弟子判断` label
- the three disposition tags from the card
- the detail header readout grid as a first-screen block

- [x] **Step 4: Rebuild `CharactersPage` around title + pool summary + automation settings + roster**

```tsx
<header className={styles.pageHeader}>
  <h1 className={styles.pageTitle}>弟子</h1>
  <button className={styles.primaryAction}>自动运转</button>
</header>

<section className={styles.statusStrip}>
  <StatChip label="弟子池" value={`${characters.length}/${targetPoolSize}`} />
  <StatChip label="可出战" value={availableCount} />
  <StatChip label="恢复中" value={recoveringCount} />
  <StatChip label="今日折损" value={dailyLosses} />
</section>
```

- [x] **Step 5: Rebuild `AdventurePage` so automation is the main expedition surface**

```tsx
<header className={styles.pageHeader}>
  <h1 className={styles.pageTitle}>秘境</h1>
  <button className={styles.primaryAction}>手动发起</button>
</header>

<AutomationPanel settings={sect.automationSettings} />
<CurrentRunSummary />
<RecentAutomationResult />
```

Keep the manual team builder, but demote it below the automation summary and remove the verbose hero lead.

- [x] **Step 6: Re-run the targeted page tests to verify the new lighter, automation-first surfaces pass**

Run: `npm test -- src/__tests__/CharactersPage.test.tsx src/__tests__/AdventurePage.test.tsx`
Expected: PASS

- [x] **Step 7: Commit the characters/adventure page redesign**

```bash
git add src/components/common/CharacterCard.tsx src/pages/CharactersPage.tsx src/pages/AdventurePage.tsx src/__tests__/CharactersPage.test.tsx src/__tests__/AdventurePage.test.tsx
git commit -m "feat: make disciple and adventure pages automation-first"
```

---

### Task 6: Simplify Remaining Top-Level Page Chrome To The Lightweight Template

**Files:**
- Modify: `src/pages/BuildingsPage.tsx`
- Modify: `src/pages/SectPage.tsx`
- Modify: `src/pages/AdventureReportPage.tsx`
- Modify: `src/pages/EventLogPage.tsx`
- Modify: `src/__tests__/BuildingsPage.test.tsx`
- Modify: `src/__tests__/SectPage.test.tsx`
- Modify: `src/__tests__/AdventureReportPage.test.tsx`

- [x] **Step 1: Write failing UI tests for the title-first page shell**

```tsx
expect(screen.getByText('建筑')).toBeInTheDocument()
expect(screen.queryByText('营造卷')).not.toBeInTheDocument()
expect(screen.queryByText('宗门营造')).not.toBeInTheDocument()
```

```tsx
expect(screen.getByText('探索过程')).toBeInTheDocument()
expect(screen.queryByText(/卷中可见成败因由/)).not.toBeInTheDocument()
```

Keep `SectPage` as the only page allowed to retain a light overview flavor, but fail the test if the old oversized “宗门近况” lead copy remains.

- [x] **Step 2: Run the targeted top-level page tests to confirm the old header chrome still fails**

Run: `npm test -- src/__tests__/BuildingsPage.test.tsx src/__tests__/SectPage.test.tsx src/__tests__/AdventureReportPage.test.tsx`
Expected: FAIL because the old hero/lead wrappers and decorative copy are still present.

- [x] **Step 3: Simplify each page directly instead of introducing a generic layout abstraction**

Use patterns like:

```tsx
<header className={styles.pageHeader}>
  <h1 className={styles.pageTitle}>建筑</h1>
</header>
<section className={styles.statusStrip}>...</section>
```

```tsx
<header className={styles.pageHeader}>
  <h1 className={styles.pageTitle}>事件记录</h1>
</header>
```

For `SectPage`, keep one compact overview banner only if it immediately yields to resources, disciple pool, automation summary, and recent reports.

- [x] **Step 4: Re-run the targeted page tests to verify the lighter shell passes**

Run: `npm test -- src/__tests__/BuildingsPage.test.tsx src/__tests__/SectPage.test.tsx src/__tests__/AdventureReportPage.test.tsx`
Expected: PASS

- [x] **Step 5: Commit the page-shell simplification**

```bash
git add src/pages/BuildingsPage.tsx src/pages/SectPage.tsx src/pages/AdventureReportPage.tsx src/pages/EventLogPage.tsx src/__tests__/BuildingsPage.test.tsx src/__tests__/SectPage.test.tsx src/__tests__/AdventureReportPage.test.tsx
git commit -m "feat: simplify top-level page chrome"
```

---

### Task 7: Final Verification

**Files:**
- Verify only; no planned file creation

- [x] **Step 1: Run the targeted feature suite**

Run: `npm test -- src/__tests__/DiscipleRecoverySystem.test.ts src/__tests__/SectAutomationSystem.test.ts src/__tests__/stores.test.ts src/__tests__/SaveSystem.test.ts src/__tests__/CharactersPage.test.tsx src/__tests__/AdventurePage.test.tsx src/__tests__/BuildingsPage.test.tsx src/__tests__/SectPage.test.tsx src/__tests__/AdventureReportPage.test.tsx`
Expected: PASS

- [ ] **Step 2: Run the project lint check**

Run: `npm run lint`
Expected: exit code 0

- [ ] **Step 3: Run the production build**

Run: `npm run build`
Expected: exit code 0

- [ ] **Step 4: Review the implementation against the spec**

Checklist:
- the disciple loop now operates around daily automation, not repeated manual assignment
- failed expeditions produce sacrifice-or-recovery outcomes
- breakthroughs spend both spirit energy and spirit stones and honor reserve thresholds
- only `SectPage` keeps light overview flavor; other top-level pages are title-first
- disposition scoring still feeds automation, but no longer dominates the primary UI

- [ ] **Step 5: Commit any tiny verification fixups**

```bash
git add src
git commit -m "chore: verify disciple auto cycle rollout"
```
