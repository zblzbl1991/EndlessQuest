# Player-Facing Chinese Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove player-visible English copy from the targeted UI surfaces while keeping internal English enums, ids, and save keys unchanged.

**Architecture:** Add a small shared display-copy module for repeated player-facing labels, then update the affected pages and shared components to render Chinese labels through that module. Keep page-specific prose inline in each page, and make report route-direction parsing accept both new Chinese phrasing and legacy English report text before emitting Chinese labels.

**Tech Stack:** React 19, TypeScript, Zustand, Vitest, Testing Library, Vite

---

## File Map

- Modify: `src/__tests__/AdventurePage.test.tsx`
  Adds failing UI assertions for Chinese tactical labels, Chinese build wording, and legacy English route parsing displayed as Chinese.
- Modify: `src/__tests__/AdventureReportPage.test.tsx`
  Adds failing UI assertions for Chinese tactical labels and Chinese “构筑” wording in the report detail view.
- Create: `src/data/uiCopy.ts`
  Stores shared player-facing Chinese label maps for tactical presets, report results, route directions, and small reusable UI strings.
- Modify: `src/pages/AdventurePage.tsx`
  Replaces direct English-facing display values with shared Chinese labels and updates legacy route parsing compatibility.
- Modify: `src/pages/AdventureReportPage.tsx`
  Replaces direct English-facing display values with shared Chinese labels and updates build wording.
- Modify: `src/components/adventure/RunBuildSummary.tsx`
  Reuses shared Chinese tactical and route labels instead of local duplicated maps.
- Modify: `src/components/adventure/TacticPresetPicker.tsx`
  Reuses shared Chinese tactical labels and descriptions.
- Modify: `src/pages/BuildingsPage.tsx`
  Converts remaining player-visible English status copy such as auto-assignment messages, level-cap suffixes, and drawer close affordance to Chinese.

---

### Task 1: Lock The New Chinese-Copy Expectations In Tests

**Files:**
- Modify: `src/__tests__/AdventurePage.test.tsx`
- Modify: `src/__tests__/AdventureReportPage.test.tsx`

- [ ] **Step 1: Write the failing Adventure page test for Chinese tactical/build labels and legacy English route compatibility**

```tsx
it('renders player-facing adventure copy in Chinese and normalizes legacy route text', () => {
  useAdventureStore.setState({
    reportDetails: {
      report_recent: {
        ...useAdventureStore.getState().reportDetails.report_recent,
        steps: [
          {
            id: 'legacy_route',
            type: 'route_selected',
            timestamp: 2,
            floor: 2,
            summary: 'stable route chosen',
            detail: 'combat route was skipped for safety.',
          },
        ],
      },
    },
  })

  render(
    <MemoryRouter>
      <AdventurePage />
    </MemoryRouter>
  )

  expect(screen.getByText('平衡')).toBeInTheDocument()
  expect(screen.getByText('关键构筑')).toBeInTheDocument()
  expect(screen.queryByText(/build/i)).not.toBeInTheDocument()
  expect(screen.getByText('稳定')).toBeInTheDocument()
  expect(screen.getByText('战斗')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the Adventure page test to verify it fails for the expected reason**

Run: `npm test -- src/__tests__/AdventurePage.test.tsx`
Expected: FAIL because the page still renders `balanced`, `关键 build`, or does not normalize the legacy route text to Chinese.

- [ ] **Step 3: Write the failing report detail test for Chinese tactical/build labels**

```tsx
it('renders report detail highlight copy in Chinese', () => {
  render(
    <MemoryRouter initialEntries={['/adventure/report/report_1']}>
      <Routes>
        <Route path="/adventure/report/:reportId" element={<AdventureReportPage />} />
      </Routes>
    </MemoryRouter>
  )

  expect(screen.getByText('平衡')).toBeInTheDocument()
  expect(screen.getByText('关键构筑')).toBeInTheDocument()
  expect(screen.queryByText(/build/i)).not.toBeInTheDocument()
})
```

- [ ] **Step 4: Run the report detail test to verify it fails for the expected reason**

Run: `npm test -- src/__tests__/AdventureReportPage.test.tsx`
Expected: FAIL because the report detail view still renders the raw tactical preset or `关键 build`.

- [ ] **Step 5: Commit the red tests**

```bash
git add src/__tests__/AdventurePage.test.tsx src/__tests__/AdventureReportPage.test.tsx
git commit -m "test: lock chinese player-facing copy expectations"
```

---

### Task 2: Add A Shared Chinese Display-Copy Module

**Files:**
- Create: `src/data/uiCopy.ts`
- Modify: `src/components/adventure/RunBuildSummary.tsx`
- Modify: `src/components/adventure/TacticPresetPicker.tsx`

- [ ] **Step 1: Write a focused failing component test if the existing page tests are not enough to drive shared copy extraction**

```tsx
expect(getTacticalPresetLabel('balanced')).toBe('平衡')
expect(getRouteDirectionLabel('stable')).toBe('稳定')
```

If the page tests already fail on missing shared labels, skip creating an extra test and use the existing red tests as the driver.

- [ ] **Step 2: Run the smallest relevant test command and confirm it fails because the shared copy module does not exist yet**

Run: `npm test -- src/__tests__/AdventurePage.test.tsx src/__tests__/AdventureReportPage.test.tsx`
Expected: FAIL with missing labels or missing module references after wiring imports.

- [ ] **Step 3: Implement the minimal shared display-copy module**

```ts
import type { TacticalPreset, AdventureReportResult } from '../types/adventure'

export const TACTICAL_PRESET_LABELS: Record<TacticalPreset, string> = {
  conservative: '守势',
  balanced: '平衡',
  burst: '爆发',
  bossCounter: '破首',
}

export const REPORT_RESULT_LABELS: Record<AdventureReportResult, string> = {
  completed: '通关',
  retreated: '撤退',
  failed: '失利',
}

export const ROUTE_DIRECTION_LABELS = {
  stable: '稳定',
  combat: '战斗',
  profit: '收益',
  mutation: '异变',
} as const

export function getTacticalPresetLabel(preset: TacticalPreset): string {
  return TACTICAL_PRESET_LABELS[preset]
}
```

- [ ] **Step 4: Update the shared adventure components to use the new copy module**

```tsx
<span className={styles.preset}>战术：{getTacticalPresetLabel(tacticalPreset)}</span>
```

```tsx
{PRESET_OPTIONS.map((option) => (
  <button key={option.id}>
    <span>{getTacticalPresetLabel(option.id)}</span>
  </button>
))}
```

- [ ] **Step 5: Run the targeted tests to verify the shared-copy extraction stays green**

Run: `npm test -- src/__tests__/AdventurePage.test.tsx src/__tests__/AdventureReportPage.test.tsx`
Expected: Still failing only on page-level residual English, or partially passing if component extraction already satisfies some assertions.

- [ ] **Step 6: Commit the shared-copy module extraction**

```bash
git add src/data/uiCopy.ts src/components/adventure/RunBuildSummary.tsx src/components/adventure/TacticPresetPicker.tsx
git commit -m "refactor: centralize chinese ui copy labels"
```

---

### Task 3: Convert Adventure Surfaces To Chinese Output

**Files:**
- Modify: `src/pages/AdventurePage.tsx`
- Modify: `src/pages/AdventureReportPage.tsx`
- Test: `src/__tests__/AdventurePage.test.tsx`
- Test: `src/__tests__/AdventureReportPage.test.tsx`

- [ ] **Step 1: Implement Chinese label rendering in the adventure page and report detail page**

```tsx
<span>战术：{getTacticalPresetLabel(report.tacticalPreset)}</span>
<span>关键构筑：{insight?.keyBuild ?? '暂无关键构筑'}</span>
<span>{REPORT_RESULT_LABELS[report.result]}</span>
```

- [ ] **Step 2: Add legacy-English-plus-Chinese route normalization in AdventurePage**

```ts
function extractRouteDirections(detail: AdventureReport | undefined): string[] {
  if (!detail) return []

  const labels: string[] = []
  for (const step of detail.steps) {
    if (step.type !== 'route_selected' && step.type !== 'route_considered') continue
    const text = `${step.summary} ${step.detail}`.toLowerCase()

    if (text.includes('稳定') || text.includes('stable route') || text.includes('stable')) labels.push('stable')
    else if (text.includes('战斗') || text.includes('combat route') || text.includes('combat')) labels.push('combat')
    else if (text.includes('收益') || text.includes('profit route') || text.includes('profit')) labels.push('profit')
    else if (text.includes('异变') || text.includes('mutation route') || text.includes('mutation')) labels.push('mutation')
  }

  return [...new Set(labels)]
}
```

- [ ] **Step 3: Run the targeted adventure tests to verify they now pass**

Run: `npm test -- src/__tests__/AdventurePage.test.tsx src/__tests__/AdventureReportPage.test.tsx`
Expected: PASS with no remaining player-facing English in the asserted flows.

- [ ] **Step 4: Refactor only if duplication remains after green**

Keep any additional cleanup minimal:
- move repeated imports or helper calls into `src/data/uiCopy.ts`
- do not expand into a full i18n system

- [ ] **Step 5: Re-run the same targeted tests after refactor**

Run: `npm test -- src/__tests__/AdventurePage.test.tsx src/__tests__/AdventureReportPage.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit the adventure-surface Chinese-copy changes**

```bash
git add src/pages/AdventurePage.tsx src/pages/AdventureReportPage.tsx src/__tests__/AdventurePage.test.tsx src/__tests__/AdventureReportPage.test.tsx
git commit -m "feat: localize adventure ui copy to chinese"
```

---

### Task 4: Remove Remaining Player-Facing English From BuildingsPage

**Files:**
- Modify: `src/pages/BuildingsPage.tsx`
- Test: add or extend the smallest relevant UI test if one already exists for this page

- [ ] **Step 1: Write or extend a failing Buildings page test for the known English leftovers**

```tsx
expect(screen.queryByText('MAX')).not.toBeInTheDocument()
expect(screen.queryByText(/Auto-assigned|Optimized/)).not.toBeInTheDocument()
expect(screen.getByRole('button', { name: '关闭' })).toBeInTheDocument()
```

- [ ] **Step 2: Run the Buildings page test to verify it fails for the expected copy reasons**

Run: `npm test -- src/__tests__/BuildingsPage.test.tsx`
Expected: FAIL because the page still renders `MAX`, English toast text, or the non-Chinese close affordance.

- [ ] **Step 3: Implement the minimal Buildings page copy fixes**

```tsx
text: result.success ? `已自动派驻 ${result.assigned} 名弟子` : result.reason,
```

```tsx
{isMaxLevel ? ' 已满级' : ''}
```

```tsx
<button className={styles.recipeDrawerClose} onClick={onClose}>关闭</button>
```

- [ ] **Step 4: Run the Buildings page test to verify it passes**

Run: `npm test -- src/__tests__/BuildingsPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit the Buildings page copy cleanup**

```bash
git add src/pages/BuildingsPage.tsx src/__tests__/BuildingsPage.test.tsx
git commit -m "feat: localize buildings ui copy to chinese"
```

---

### Task 5: Final Verification

**Files:**
- Verify only; no planned file creation

- [ ] **Step 1: Run the full targeted UI regression suite**

Run: `npm test -- src/__tests__/AdventurePage.test.tsx src/__tests__/AdventureReportPage.test.tsx src/__tests__/BuildingsPage.test.tsx`
Expected: PASS

- [ ] **Step 2: Run the project lint check on touched source files**

Run: `npm run lint`
Expected: exit code 0

- [ ] **Step 3: Run the production build**

Run: `npm run build`
Expected: exit code 0

- [ ] **Step 4: Review the diff against the spec**

Checklist:
- no player-facing `build`, `MAX`, `Auto-assigned`, `Optimized`, or raw tactical preset ids remain in the targeted flows
- internal enums and save keys remain unchanged
- legacy English route text still renders as Chinese labels

- [ ] **Step 5: Commit the final verification or any tiny follow-up fixes**

```bash
git add src
git commit -m "chore: verify chinese player-facing copy rollout"
```
