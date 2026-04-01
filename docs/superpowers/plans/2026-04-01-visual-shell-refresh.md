# Visual Shell Refresh Implementation Plan

> Status Snapshot (2026-04-01): Implemented and archived. Shared navigation metadata, refreshed shell framing, sect overview hierarchy, and high-moment report/offline surfaces are in the current codebase with dedicated shell and page regression coverage.
>
> Verification (2026-04-01): `npm test` passed with 62 files / 884 tests, and `npm run build` passed.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the game shell around the approved `山门卷轴 / 山水层级 / 墨涌成势` direction without changing core gameplay behavior.

**Architecture:** Keep the existing React + CSS Modules structure, but move shell polish into focused layers: shared navigation metadata, shell component styling, SectPage hierarchy, then high-moment surfaces. Reuse existing `PixelIcon` and page components instead of inventing a second visual system. Add regression tests around navigation rendering, page hierarchy anchors, and high-moment summaries so the new shell can evolve without falling back to tool-dashboard styling.

**Tech Stack:** React 19, TypeScript, React Router, CSS Modules, Vitest, Testing Library

---

## File Structure

### Shared shell definitions

- Modify: `src/components/common/Sidebar.tsx`
- Modify: `src/components/common/Sidebar.module.css`
- Modify: `src/components/common/BottomNav.tsx`
- Modify: `src/components/common/BottomNav.module.css`
- Modify: `src/components/common/TopBar.tsx`
- Modify: `src/components/common/TopBar.module.css`
- Create: `src/data/navigation.ts`
- Test: `src/__tests__/NavigationShell.test.tsx`

`src/data/navigation.ts` should become the single source of truth for top-level nav labels and icon names so desktop and mobile shells cannot drift apart again.

### Sect overview hierarchy

- Modify: `src/pages/SectPage.tsx`
- Modify: `src/pages/SectPage.module.css`
- Possibly modify: `src/components/sect/ActionAgenda.tsx`
- Possibly modify: `src/components/sect/ActionAgenda.module.css`
- Test: `src/__tests__/SectPage.test.tsx`

Keep gameplay content the same. Only reorganize visual hierarchy and section emphasis.

### High-moment surfaces

- Modify: `src/pages/AdventureReportPage.tsx`
- Modify: `src/pages/AdventureReportPage.module.css`
- Modify: `src/components/common/OfflineReportModal.tsx`
- Modify: `src/components/common/OfflineReportModal.module.css`
- Test: `src/__tests__/AdventureReportPage.test.tsx`
- Create: `src/__tests__/OfflineReportModal.test.tsx`

These surfaces should share the same “stronger but still in-universe” language instead of becoming a separate theme.

### Existing references to inspect before coding

- `src/components/common/PixelIcon.tsx`
- `src/styles/theme.css`
- `src/styles/globals.css`
- `src/App.tsx`
- `docs/superpowers/specs/2026-04-01-visual-shell-refresh-design.md`
- `.impeccable.md`
- `CLAUDE.md`

---

### Task 1: Establish Shared Navigation Metadata

**Files:**
- Create: `src/data/navigation.ts`
- Modify: `src/components/common/Sidebar.tsx`
- Modify: `src/components/common/BottomNav.tsx`
- Test: `src/__tests__/NavigationShell.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/NavigationShell.test.tsx` with a focused test that renders `Sidebar` and `BottomNav` under a memory router and asserts:

```tsx
expect(screen.getByLabelText('宗门')).toBeInTheDocument()
expect(screen.getByLabelText('弟子')).toBeInTheDocument()
expect(screen.queryByText('⛩')).not.toBeInTheDocument()
```

Also assert desktop and mobile nav expose the same route labels.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/NavigationShell.test.tsx`

Expected: FAIL because the test file does not exist yet or because the current nav still renders emoji and has no shared icon metadata.

- [ ] **Step 3: Write minimal implementation**

Create `src/data/navigation.ts`:

```ts
export const primaryNavigation = [
  { to: '/', label: '宗门', icon: 'mainHall' },
  { to: '/characters', label: '弟子', icon: 'disciple' },
  { to: '/buildings', label: '建筑', icon: 'sectBuilding' },
  { to: '/adventure', label: '秘境', icon: 'dungeonCave' },
  { to: '/vault', label: '仓库', icon: 'storage' },
  { to: '/log', label: '记录', icon: 'scrollRecord' },
] as const
```

Then update both nav components to consume this array and render `PixelIcon` instead of emoji or text-only tabs.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/NavigationShell.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/data/navigation.ts src/components/common/Sidebar.tsx src/components/common/BottomNav.tsx src/__tests__/NavigationShell.test.tsx
git commit -m "feat: unify navigation metadata"
```

### Task 2: Rebuild Shell Styling Around “山门卷轴”

**Files:**
- Modify: `src/components/common/Sidebar.module.css`
- Modify: `src/components/common/BottomNav.module.css`
- Modify: `src/components/common/TopBar.tsx`
- Modify: `src/components/common/TopBar.module.css`
- Modify: `src/__tests__/NavigationShell.test.tsx`

- [ ] **Step 1: Write the failing test**

Extend `src/__tests__/NavigationShell.test.tsx` with assertions for the new shell anchors:

```tsx
expect(screen.getAllByText('宗门').length).toBeGreaterThan(0)
expect(screen.getByText(/灵石/i)).toBeInTheDocument()
expect(screen.getByText(/宗门/i)).toBeInTheDocument()
```

If needed, add `data-testid` hooks like `shell-seal`, `shell-title`, or `mobile-nav-item-active` so the visual shell has stable regression anchors.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/NavigationShell.test.tsx`

Expected: FAIL because the new shell anchors and structure are not present yet.

- [ ] **Step 3: Write minimal implementation**

Update shell markup and styles to match the approved direction:

- Sidebar header becomes a compact sect identity block with seal/crest treatment
- Active desktop nav reads like a selected title tag, not a generic highlighted row
- Mobile bottom nav gains icon + label rhythm and a stronger active state than a single underline
- TopBar becomes a “卷轴题首” with clearer hierarchy between sect name and resources

Do not add gameplay controls here. Keep this task focused on shell structure and CSS only.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/NavigationShell.test.tsx src/__tests__/PixelIcons.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/common/Sidebar.module.css src/components/common/BottomNav.module.css src/components/common/TopBar.tsx src/components/common/TopBar.module.css src/__tests__/NavigationShell.test.tsx
git commit -m "feat: refresh shell framing"
```

### Task 3: Reshape SectPage Into “山水层级”

**Files:**
- Modify: `src/pages/SectPage.tsx`
- Modify: `src/pages/SectPage.module.css`
- Possibly modify: `src/components/sect/ActionAgenda.tsx`
- Possibly modify: `src/components/sect/ActionAgenda.module.css`
- Test: `src/__tests__/SectPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Extend `src/__tests__/SectPage.test.tsx` so it asserts the presence of explicit hierarchy anchors instead of only content. Example:

```tsx
expect(screen.getByText('宗门近况')).toBeInTheDocument()
expect(screen.getByTestId('sect-hero')).toBeInTheDocument()
expect(screen.getByTestId('sect-midground-grid')).toBeInTheDocument()
```

Prefer a small number of semantic `data-testid` anchors over brittle CSS assertions.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/SectPage.test.tsx`

Expected: FAIL because the current page has no explicit hero/midground grouping.

- [ ] **Step 3: Write minimal implementation**

Refactor the page into three visual depths:

- Near field: header plus the “宗门近况” block
- Mid field: resources, disciple overview, recent adventure
- Far field: supporting labels, rates, and low-priority meta text

Keep all current information, but reorganize it into grouped wrappers and stronger style classes. If `ActionAgenda` needs a slightly richer wrapper for the hero block, make only the smallest component change needed.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/SectPage.test.tsx src/__tests__/SectInsightSystem.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/SectPage.tsx src/pages/SectPage.module.css src/components/sect/ActionAgenda.tsx src/components/sect/ActionAgenda.module.css src/__tests__/SectPage.test.tsx
git commit -m "feat: add sect page visual hierarchy"
```

### Task 4: Turn Adventure Report Summary Into a High-Moment Surface

**Files:**
- Modify: `src/pages/AdventureReportPage.tsx`
- Modify: `src/pages/AdventureReportPage.module.css`
- Test: `src/__tests__/AdventureReportPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Extend `src/__tests__/AdventureReportPage.test.tsx` with assertions for a dedicated highlight summary wrapper and grouped reward/insight blocks:

```tsx
expect(screen.getByTestId('report-highlight')).toBeInTheDocument()
expect(screen.getByText('成败原因')).toBeInTheDocument()
expect(screen.getByText('结算')).toBeInTheDocument()
```

If the current test already covers content, keep it and only add the smallest new assertions needed for the new structure.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/AdventureReportPage.test.tsx`

Expected: FAIL because the page still uses the plain summary card layout.

- [ ] **Step 3: Write minimal implementation**

Rebuild the report top section so it reads as a high-moment result surface:

- strong summary wrapper with title, result, intent, and key cause
- grouped insight rows that feel like one composed artifact, not a flat list
- visual treatment stays in the light ink-wash palette and does not become a dark fantasy card

Do not rewrite the timeline logic. Keep behavior and data flow unchanged.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/AdventureReportPage.test.tsx src/__tests__/AdventureReportInsightSystem.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/AdventureReportPage.tsx src/pages/AdventureReportPage.module.css src/__tests__/AdventureReportPage.test.tsx
git commit -m "feat: elevate adventure report highlights"
```

### Task 5: Establish a Shared High-Moment Baseline for Offline Rewards

**Files:**
- Modify: `src/components/common/OfflineReportModal.tsx`
- Modify: `src/components/common/OfflineReportModal.module.css`
- Create: `src/__tests__/OfflineReportModal.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/OfflineReportModal.test.tsx` with a focused render of the modal and assertions such as:

```tsx
expect(screen.getByText('离线修炼报告')).toBeInTheDocument()
expect(screen.getByText('资源收获')).toBeInTheDocument()
expect(screen.getByRole('button', { name: '收取' })).toBeInTheDocument()
expect(screen.getByTestId('offline-highlight')).toBeInTheDocument()
```

Include a second case for an empty report so the calm fallback still renders correctly.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/OfflineReportModal.test.tsx`

Expected: FAIL because the test file does not exist yet and the modal has no highlight anchor.

- [ ] **Step 3: Write minimal implementation**

Refactor the modal into a stronger reward sheet:

- title and duration become a composed header
- rewards and notable events sit inside more structured sections
- the visual treatment echoes the adventure report high-moment language, but lighter and calmer

Do not add new gameplay data. Work only with the existing `OfflineReportData` shape.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/OfflineReportModal.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/common/OfflineReportModal.tsx src/components/common/OfflineReportModal.module.css src/__tests__/OfflineReportModal.test.tsx
git commit -m "feat: refresh offline reward highlights"
```

### Task 6: Normalize Shared Titles, Depth, and Final Regression

**Files:**
- Modify: `src/pages/SectPage.module.css`
- Modify: `src/pages/AdventureReportPage.module.css`
- Modify: `src/components/common/TopBar.module.css`
- Modify any shell CSS touched above only if necessary
- Test: `src/__tests__/NavigationShell.test.tsx`
- Test: `src/__tests__/SectPage.test.tsx`
- Test: `src/__tests__/AdventureReportPage.test.tsx`
- Test: `src/__tests__/OfflineReportModal.test.tsx`

- [ ] **Step 1: Write the failing test**

If no new behavior is needed, skip adding a brand-new test and instead tighten existing assertions where drift is most likely, especially around the new shell test ids and section titles.

- [ ] **Step 2: Run targeted regression to catch remaining mismatches**

Run:

```bash
npx vitest run src/__tests__/NavigationShell.test.tsx src/__tests__/SectPage.test.tsx src/__tests__/AdventureReportPage.test.tsx src/__tests__/OfflineReportModal.test.tsx
```

Expected: At least one failure or visual-structure mismatch before the final polish pass.

- [ ] **Step 3: Write minimal implementation**

Make the final consistency pass:

- unify section title rhythm
- reduce overly small/washed-out meta text where it weakens hierarchy
- align shadow, radius, and border intensity across the refreshed shell

Do not start new visual experiments here. Only close gaps revealed by the approved direction and regression run.

- [ ] **Step 4: Run full verification**

Run:

```bash
npx vitest run src/__tests__/NavigationShell.test.tsx src/__tests__/PixelIcons.test.tsx src/__tests__/SectPage.test.tsx src/__tests__/SectInsightSystem.test.ts src/__tests__/AdventureReportPage.test.tsx src/__tests__/AdventureReportInsightSystem.test.ts src/__tests__/OfflineReportModal.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/common src/pages src/__tests__
git commit -m "style: finalize visual shell refresh"
```

---

## Suggested Execution Order

1. Task 1 `共享导航元数据`
2. Task 2 `山门卷轴框架`
3. Task 3 `山水层级首页`
4. Task 4 `战报高光`
5. Task 5 `离线报告高光`
6. Task 6 `统一收口与回归`

Each task should leave the app in a runnable state and should be committed before moving on.
