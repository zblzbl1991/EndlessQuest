# Balanced Page Interaction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `AdventurePage`, `BuildingsPage`, `CharactersPage`, and `CharacterDetail` around the approved balanced daily-page interaction model without changing core gameplay systems.

**Architecture:** Keep the current React page boundaries and data flow, but reorganize each page into a shared near-field / mid-field / far-field rhythm. Put the biggest structural changes into the page files and CSS Modules, only touching child components when a page cannot express the new hierarchy on its own. Add regression tests around page anchors, reordered dialogs, and “judgment first” detail layouts so later polish work does not drift back into flat dashboard UI.

**Tech Stack:** React 19, TypeScript, React Router, Zustand stores, CSS Modules, Vitest, Testing Library

---

## File Structure

### Adventure daily-page refresh

- Modify: `src/pages/AdventurePage.tsx`
- Modify: `src/pages/AdventurePage.module.css`
- Possibly modify: `src/components/adventure/TacticPresetPicker.tsx`
- Possibly modify: `src/components/adventure/TacticPresetPicker.module.css`
- Test: `src/__tests__/AdventurePage.test.tsx` (create)

`src/pages/AdventurePage.tsx` should become the first full “balanced daily page” sample: a near-field arrival summary, mid-field recent runs and dispatches, then far-field dungeon entry cards. The team-builder overlay should read as “choose intent, then tactic, then people,” not a low-level setup panel.

### Buildings page refresh

- Modify: `src/pages/BuildingsPage.tsx`
- Modify: `src/pages/BuildingsPage.module.css`
- Possibly modify: `src/components/building/AlchemyPanel.tsx`
- Possibly modify: `src/components/building/ForgePanel.tsx`
- Possibly modify: `src/components/building/StudyPanel.tsx`
- Possibly modify: `src/components/building/CodexPanel.tsx`
- Possibly modify: `src/components/building/MarketPanel.tsx`
- Test: `src/__tests__/BuildingsPage.test.tsx`

The buildings page should stay in one route with the same tabs, but the page needs a sect-building identity: overview first, tab signatures second, then main content. Avoid rewriting store logic; focus on hierarchy, button grouping, and unified panel surfaces.

### Characters list + detail refresh

- Modify: `src/pages/CharactersPage.tsx`
- Modify: `src/pages/CharactersPage.module.css`
- Possibly modify: `src/components/common/CharacterCard.tsx`
- Possibly modify: `src/components/common/CharacterCard.module.css`
- Test: `src/__tests__/CharactersPage.test.tsx`

The list page should become a “who is where, and who deserves attention” surface. The detail view should put identity, value readouts, and current actions before dense stats, gear, and bag management.

### Existing references to inspect before coding

- `docs/superpowers/specs/2026-04-01-balanced-page-interaction-design.md`
- `docs/superpowers/specs/2026-04-01-light-overview-intent-design.md`
- `docs/superpowers/specs/2026-04-01-visual-shell-refresh-design.md`
- `src/data/runIntents.ts`
- `src/components/adventure/RunBuildSummary.tsx`
- `src/components/common/OfflineReportModal.tsx`
- `src/pages/SectPage.tsx`

---

### Task 1: Reshape AdventurePage Into the Daily-Run Sample

**Files:**
- Create: `src/__tests__/AdventurePage.test.tsx`
- Modify: `src/pages/AdventurePage.tsx`
- Modify: `src/pages/AdventurePage.module.css`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/AdventurePage.test.tsx` with focused assertions for the new page anchors:

```tsx
expect(screen.getByTestId('adventure-hero')).toBeInTheDocument()
expect(screen.getByText('最近探索记录')).toBeInTheDocument()
expect(screen.getByText('任务派遣')).toBeInTheDocument()
expect(screen.getByText('待启程秘境')).toBeInTheDocument()
```

Add a second test that opens the team builder and asserts the reordered sequence is present:

```tsx
expect(screen.getByText('本局意图')).toBeInTheDocument()
expect(screen.getByText('战术')).toBeInTheDocument()
expect(screen.getByText('出战弟子')).toBeInTheDocument()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/AdventurePage.test.tsx`

Expected: FAIL because the test file does not exist yet or because the current page still uses the flat summary row and old team-builder order.

- [ ] **Step 3: Write minimal implementation**

Refactor `src/pages/AdventurePage.tsx` so it reads in three depths:

- near field: page hero with title, one-line mood copy, available fighters, report count, and named-dungeon count
- mid field: recent run cards stay primary; dispatch block becomes secondary and calmer
- far field: dungeon list becomes “待启程秘境” with tighter info and a single clear launch action

Reorder the team-builder overlay to:

1. target dungeon
2. run intent
3. tactic
4. selected team
5. confirm departure

Keep the same store calls and run results. Do not add new gameplay rules.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/AdventurePage.test.tsx src/__tests__/AdventureReportInsightSystem.test.ts src/__tests__/RunBuildSummary.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/AdventurePage.tsx src/pages/AdventurePage.module.css src/__tests__/AdventurePage.test.tsx
git commit -m "feat: rebalance adventure page daily flow"
```

### Task 2: Turn BuildingsPage Into a Sect-Building Surface

**Files:**
- Modify: `src/pages/BuildingsPage.tsx`
- Modify: `src/pages/BuildingsPage.module.css`
- Test: `src/__tests__/BuildingsPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Extend `src/__tests__/BuildingsPage.test.tsx` so it verifies the new overview and tab rhythm:

```tsx
expect(screen.getByTestId('buildings-hero')).toBeInTheDocument()
expect(screen.getByText('宗门营造')).toBeInTheDocument()
expect(screen.getByText('当前营造重点')).toBeInTheDocument()
expect(screen.getByText('卷内分栏')).not.toBeInTheDocument()
```

Also assert the existing “no sect ecology” behavior still holds after the refactor.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/BuildingsPage.test.tsx`

Expected: FAIL because the current page has tabs only and no hero/overview anchors.

- [ ] **Step 3: Write minimal implementation**

Refactor the page shell without changing tab availability logic:

- add a near-field hero with title, one-line summary, current build focus, and auto-assignable count
- turn the tabs into stronger signature chips that feel like scroll divisions, not admin toggles
- give the buildings tab its own summary lead-in before the building card grid
- keep all current actions visible, but group them into calmer primary action areas

Keep the existing upgrade/build/auto-assign logic and button semantics intact.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/BuildingsPage.test.tsx src/__tests__/BuildingEffects.test.ts src/__tests__/CharacterEngine.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/BuildingsPage.tsx src/pages/BuildingsPage.module.css src/__tests__/BuildingsPage.test.tsx
git commit -m "feat: refresh buildings page hierarchy"
```

### Task 3: Unify Building Sub-Panels With the New Page Language

**Files:**
- Modify: `src/pages/BuildingsPage.tsx`
- Modify: `src/pages/BuildingsPage.module.css`
- Possibly modify: `src/components/building/AlchemyPanel.tsx`
- Possibly modify: `src/components/building/AlchemyPanel.module.css`
- Possibly modify: `src/components/building/ForgePanel.tsx`
- Possibly modify: `src/components/building/ForgePanel.module.css`
- Possibly modify: `src/components/building/StudyPanel.tsx`
- Possibly modify: `src/components/building/StudyPanel.module.css`
- Possibly modify: `src/components/building/CodexPanel.tsx`
- Possibly modify: `src/components/building/MarketPanel.tsx`
- Test: `src/__tests__/BuildingsPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Add or extend one focused regression in `src/__tests__/BuildingsPage.test.tsx` that switches between at least two unlocked tabs and asserts the new shared wrappers are present:

```tsx
fireEvent.click(screen.getByText('炼丹'))
expect(screen.getByTestId('building-subpanel')).toBeInTheDocument()

fireEvent.click(screen.getByText('招收'))
expect(screen.getByTestId('building-subpanel')).toBeInTheDocument()
```

If shared test ids are too heavy, assert on the new repeated section title or panel lead copy instead.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/BuildingsPage.test.tsx`

Expected: FAIL because the existing sub-panels do not expose a shared surface or consistent hierarchy anchor.

- [ ] **Step 3: Write minimal implementation**

Normalize the most visible sub-panels so they feel like part of the same page family:

- recruit panel gets a calmer summary lead and quality choices that read like sect invitations, not raw button rows
- vault actions and transfer modal gain the same shell language as the refreshed reward/report overlays
- alchemy / forge / study panels pick up the same header rhythm and section spacing so tab switches do not feel like jumping to another UI generation

Only touch child panel markup when the page-level wrappers are insufficient.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/BuildingsPage.test.tsx src/__tests__/recipes.test.ts src/__tests__/TradeSystem.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/BuildingsPage.tsx src/pages/BuildingsPage.module.css src/components/building src/__tests__/BuildingsPage.test.tsx
git commit -m "feat: unify building subpanel presentation"
```

### Task 4: Rebuild CharactersPage List Around Flow and Judgment

**Files:**
- Modify: `src/pages/CharactersPage.tsx`
- Modify: `src/pages/CharactersPage.module.css`
- Possibly modify: `src/components/common/CharacterCard.tsx`
- Possibly modify: `src/components/common/CharacterCard.module.css`
- Test: `src/__tests__/CharactersPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Extend `src/__tests__/CharactersPage.test.tsx` with assertions for the new list-page anchors:

```tsx
expect(screen.getByTestId('characters-hero')).toBeInTheDocument()
expect(screen.getByText('门中弟子')).toBeInTheDocument()
expect(screen.getByText('当前流转')).toBeInTheDocument()
expect(screen.getByText('全部')).toBeInTheDocument()
```

Add a second assertion that the view toggle remains visible without dominating the header.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/CharactersPage.test.tsx`

Expected: FAIL because the current page begins with a flat toolbar and has no summary lead.

- [ ] **Step 3: Write minimal implementation**

Refactor the list page to:

- add a near-field hero with page title, filtered count, and a short “current disciple flow” summary
- move filter chips and view toggle into a calmer mid-field controls band
- update cards only as needed so the refreshed list still supports both grid and list views without collapsing into dense utility cards

Keep selection behavior and detail navigation unchanged.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/CharactersPage.test.tsx src/__tests__/CharacterDispositionSystem.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/CharactersPage.tsx src/pages/CharactersPage.module.css src/components/common/CharacterCard.tsx src/components/common/CharacterCard.module.css src/__tests__/CharactersPage.test.tsx
git commit -m "feat: refresh characters page overview"
```

### Task 5: Reorder CharacterDetail Around Identity and Action

**Files:**
- Modify: `src/pages/CharactersPage.tsx`
- Modify: `src/pages/CharactersPage.module.css`
- Test: `src/__tests__/CharactersPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Extend `src/__tests__/CharactersPage.test.tsx` with detail-view assertions that lock in the new reading order:

```tsx
fireEvent.click(screen.getByText(character.name))
expect(screen.getByTestId('character-identity')).toBeInTheDocument()
expect(screen.getByText('当前去向')).toBeInTheDocument()
expect(screen.getByText('能力与成型')).toBeInTheDocument()
expect(screen.getByText(/装备与背包/)).toBeInTheDocument()
```

Keep the existing cultivation-rate and disciple-value assertions.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/CharactersPage.test.tsx`

Expected: FAIL because the detail page still flows from raw stats downward instead of identity/action first.

- [ ] **Step 3: Write minimal implementation**

Reorder the detail page into the approved sequence:

1. identity block with name, realm, path, disposition readouts, and growth progress
2. current destination and key actions, including breakthrough / dispatch / return controls
3. ability and build sections for stats, aptitude, techniques, and battle style
4. equipment and backpack as later sections

Keep all current actions working. Do not change store behavior or modal side effects.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/CharactersPage.test.tsx src/__tests__/ActiveSkillLoadout.test.ts src/__tests__/missions.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/CharactersPage.tsx src/pages/CharactersPage.module.css src/__tests__/CharactersPage.test.tsx
git commit -m "feat: reorder character detail for judgment first"
```

### Task 6: Final Daily-Page Regression and Consistency Pass

**Files:**
- Modify any files touched above only if needed
- Test: `src/__tests__/AdventurePage.test.tsx`
- Test: `src/__tests__/BuildingsPage.test.tsx`
- Test: `src/__tests__/CharactersPage.test.tsx`

- [ ] **Step 1: Tighten any missing regression anchors**

If the earlier tasks reveal unstable structure, add the smallest extra `data-testid` or heading assertion needed in existing tests. Do not introduce broad snapshot tests.

- [ ] **Step 2: Run targeted daily-page regression**

Run:

```bash
npx vitest run src/__tests__/AdventurePage.test.tsx src/__tests__/BuildingsPage.test.tsx src/__tests__/CharactersPage.test.tsx
```

Expected: PASS, or a small number of drift failures that point to hierarchy inconsistencies.

- [ ] **Step 3: Write minimal implementation**

Make the final consistency pass:

- align hero spacing and section-title rhythm across the three refreshed pages
- keep primary buttons obvious and disabled buttons visibly inactive
- remove any remaining “tool dashboard” leftovers like flat helper text or overly dense control rows

Do not expand scope beyond the three daily pages and the character detail view.

- [ ] **Step 4: Run full verification**

Run:

```bash
npx vitest run src/__tests__/AdventurePage.test.tsx src/__tests__/AdventureReportInsightSystem.test.ts src/__tests__/RunBuildSummary.test.tsx src/__tests__/BuildingsPage.test.tsx src/__tests__/BuildingEffects.test.ts src/__tests__/CharacterEngine.test.ts src/__tests__/recipes.test.ts src/__tests__/TradeSystem.test.ts src/__tests__/CharactersPage.test.tsx src/__tests__/CharacterDispositionSystem.test.ts src/__tests__/ActiveSkillLoadout.test.ts src/__tests__/missions.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages src/components src/__tests__
git commit -m "style: finalize balanced daily page refresh"
```

---

## Suggested Execution Order

1. Task 1 `AdventurePage 样板页`
2. Task 2 `BuildingsPage 宗门营造壳层`
3. Task 3 `Building 子页统一收口`
4. Task 4 `CharactersPage 列表判断层级`
5. Task 5 `CharacterDetail 判断优先顺序`
6. Task 6 `统一回归与收口`

Each task should leave the app runnable and committed before the next task begins.
