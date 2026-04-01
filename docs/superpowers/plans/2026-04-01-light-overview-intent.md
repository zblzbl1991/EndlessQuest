# Light Overview And Run Intent Implementation Plan

> Status Snapshot (2026-04-01): Implemented and archived. Shared run-intent language, light sect overview selection, disciple use-profile surfacing, and reusable adventure report insight extraction are all live in the current codebase.
>
> Verification (2026-04-01): `npm test` passed with 62 files / 884 tests, and `npm run build` passed.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace directive homepage guidance with a light overview, upgrade automation strategy into player-facing run intent, sharpen disciple role expression, and make adventure reports explain why a run succeeded or failed.

**Architecture:** Keep the existing React + Zustand + systems/data split, but move the new behavior into small helper modules so pages only render state instead of inventing product logic inline. Centralize run-intent copy, homepage representative-change selection, disciple usage tagging, and report insight extraction to avoid duplicating “meaning” logic across `SectPage`, `AdventurePage`, and `AdventureReportPage`.

**Tech Stack:** React 19, TypeScript, Zustand, CSS Modules, Vitest, Testing Library

---

## File Structure

### Existing files to modify

- `src/components/sect/ActionAgenda.tsx`
  Convert from priority-ranked “action cards” to three parallel representative change cards.
- `src/components/sect/ActionAgenda.module.css`
  Restyle the component from directive cards to calmer, category-based overview panels.
- `src/pages/SectPage.tsx`
  Remove “行动指引” style copy and integrate the lighter overview framing.
- `src/pages/AdventurePage.tsx`
  Replace raw strategy labels with run intent language and render clearer intent-oriented report summaries.
- `src/pages/AdventureReportPage.tsx`
  Replace duplicated insight heuristics with shared report insight data and intent-based copy.
- `src/pages/CharactersPage.tsx`
  Surface disciple “use profile” information in detail view without turning it into explicit recommendation text.
- `src/components/common/CharacterCard.tsx`
  Surface short-form disciple use tags that help players judge leave-home vs. stay-home value.
- `src/systems/roguelike/AutoRunPolicy.ts`
  Retune route/blessing/shop/retreat heuristics so `steady/combat/profit` behave as `守成/争锋/寻机`.
- `src/systems/roguelike/AutoRunEngine.ts`
  Use shared run-intent copy in report steps and preserve clearer turning-point explanations.
- `src/types/adventure.ts`
  Keep the persisted `AutomationStrategy` values stable, but document and expose them as run intent semantics at the type boundary where useful.

### New files to create

- `src/data/runIntents.ts`
  Single source of truth for run-intent labels, short descriptions, and UI/help copy while keeping stored values unchanged.
- `src/systems/sect/SectOverviewSystem.ts`
  Compute one representative change each for management, disciples, and adventure so `ActionAgenda` no longer invents ranking logic inline.
- `src/systems/character/DiscipleUseProfileSystem.ts`
  Derive concise player-facing usage traits such as “守宗偏稳” or “适宜争锋” from specialties, path, fate tags, and state.
- `src/systems/roguelike/AdventureReportInsightSystem.ts`
  Derive core disciple, key build, turning point, and result cause from `AdventureReport` for reuse across report list and detail page.

### Tests to add or modify

- `src/__tests__/AutoRunPolicy.test.ts`
  Lock in the new intent semantics for route choice, blessing choice, and retreat thresholds.
- `src/__tests__/SectInsightSystem.test.ts`
  Extend or refocus on the new representative overview selection behavior.
- `src/__tests__/CharactersPage.test.tsx`
  Verify disciple usage tags render in the detail surface without directive wording.
- `src/__tests__/AdventureReportPage.test.tsx`
  Verify the report page shows intent label, key disciple, turning point, and outcome cause.
- `src/__tests__/SectPage.test.tsx`
  Verify the homepage renders the lighter overview instead of imperative guidance.
- `src/__tests__/AdventureReportInsightSystem.test.ts`
  New focused unit test for reusable report insight extraction.
- `src/__tests__/DiscipleUseProfileSystem.test.ts`
  New focused unit test for disciple usage-tag derivation.

---

### Task 1: Create Shared Run Intent Language

**Files:**
- Create: `src/data/runIntents.ts`
- Modify: `src/pages/AdventurePage.tsx`
- Modify: `src/pages/AdventureReportPage.tsx`
- Modify: `src/types/adventure.ts`
- Test: `src/__tests__/AutoRunPolicy.test.ts`

- [ ] **Step 1: Write the failing tests for the new intent-facing copy**

```ts
import { getRunIntentDef } from '../data/runIntents'

it('maps steady/combat/profit to 守成/争锋/寻机 copy', () => {
  expect(getRunIntentDef('steady').label).toBe('守成')
  expect(getRunIntentDef('combat').label).toBe('争锋')
  expect(getRunIntentDef('profit').label).toBe('寻机')
})
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npx vitest run src/__tests__/AutoRunPolicy.test.ts`
Expected: FAIL with module or export errors for `runIntents`

- [ ] **Step 3: Add the shared run-intent data module and wire pages to it**

```ts
export const RUN_INTENTS = {
  steady: { label: '守成', shortDescription: '稳妥归来，少冒风险。' },
  combat: { label: '争锋', shortDescription: '优先冲层，追求战斗成型。' },
  profit: { label: '寻机', shortDescription: '优先机缘、功法与成长收获。' },
} as const
```

- [ ] **Step 4: Run the focused tests to verify they pass**

Run: `npx vitest run src/__tests__/AutoRunPolicy.test.ts src/__tests__/AdventureReportPage.test.tsx`
Expected: PASS for the new label assertions and no snapshot/text regressions from the UI rename

- [ ] **Step 5: Commit**

```bash
git add src/data/runIntents.ts src/pages/AdventurePage.tsx src/pages/AdventureReportPage.tsx src/types/adventure.ts src/__tests__/AutoRunPolicy.test.ts
git commit -m "feat: add player-facing run intent copy"
```

---

### Task 2: Replace Priority Agenda With Light Overview Selection

**Files:**
- Create: `src/systems/sect/SectOverviewSystem.ts`
- Modify: `src/components/sect/ActionAgenda.tsx`
- Modify: `src/components/sect/ActionAgenda.module.css`
- Modify: `src/pages/SectPage.tsx`
- Test: `src/__tests__/SectInsightSystem.test.ts`
- Test: `src/__tests__/SectPage.test.tsx`

- [ ] **Step 1: Write failing tests for one-representative-change-per-category behavior**

```ts
import { buildSectOverviewItems } from '../systems/sect/SectOverviewSystem'

it('returns at most one management, one disciple, and one adventure change', () => {
  const items = buildSectOverviewItems(mockSect, mockReports, mockDungeons)
  expect(items.map((item) => item.category)).toEqual(['management', 'disciple', 'adventure'])
})
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `npx vitest run src/__tests__/SectInsightSystem.test.ts src/__tests__/SectPage.test.tsx`
Expected: FAIL because `buildSectOverviewItems` and the new text expectations do not exist yet

- [ ] **Step 3: Implement the overview selector and update the homepage surfaces**

```ts
export function buildSectOverviewItems(...) {
  return [
    pickManagementChange(...),
    pickDiscipleChange(...),
    pickAdventureChange(...),
  ].filter(Boolean)
}
```

- [ ] **Step 4: Run the focused tests to verify they pass**

Run: `npx vitest run src/__tests__/SectInsightSystem.test.ts src/__tests__/SectPage.test.tsx`
Expected: PASS with no remaining imperative copy such as “当前最该做” or “优先处理”

- [ ] **Step 5: Commit**

```bash
git add src/systems/sect/SectOverviewSystem.ts src/components/sect/ActionAgenda.tsx src/components/sect/ActionAgenda.module.css src/pages/SectPage.tsx src/__tests__/SectInsightSystem.test.ts src/__tests__/SectPage.test.tsx
git commit -m "feat: shift sect homepage to light overview"
```

---

### Task 3: Retune Auto-Run Policy Around 守成/争锋/寻机

**Files:**
- Modify: `src/systems/roguelike/AutoRunPolicy.ts`
- Modify: `src/systems/roguelike/AutoRunEngine.ts`
- Modify: `src/pages/AdventurePage.tsx`
- Test: `src/__tests__/AutoRunPolicy.test.ts`
- Test: `src/__tests__/AutoRunEngine.test.ts`

- [ ] **Step 1: Write failing policy tests for the intended behavior shifts**

```ts
it('lets steady retreat earlier than profit and combat', () => {
  expect(shouldRetreat('steady', lowHpContext)).toBe(true)
  expect(shouldRetreat('profit', lowHpContext)).toBe(false)
})

it('prefers mutation and ancient-cave routes more strongly for profit/寻机', () => {
  expect(pickAutomationRoute('profit', floorWithAncientCave, healthyContext)).toBe(1)
})
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `npx vitest run src/__tests__/AutoRunPolicy.test.ts src/__tests__/AutoRunEngine.test.ts`
Expected: FAIL on the new route-preference and retreat-threshold expectations

- [ ] **Step 3: Implement the heuristic retune without changing persisted strategy IDs**

```ts
if (strategy === 'profit') {
  if (archetype === 'mutation') score += 60
  if (routeHasAncientCave) score += 40
}
```

- [ ] **Step 4: Run the focused tests to verify they pass**

Run: `npx vitest run src/__tests__/AutoRunPolicy.test.ts src/__tests__/AutoRunEngine.test.ts`
Expected: PASS with explicit coverage for route choice, blessing choice, and retreat behavior

- [ ] **Step 5: Commit**

```bash
git add src/systems/roguelike/AutoRunPolicy.ts src/systems/roguelike/AutoRunEngine.ts src/pages/AdventurePage.tsx src/__tests__/AutoRunPolicy.test.ts src/__tests__/AutoRunEngine.test.ts
git commit -m "feat: retune automation around run intents"
```

---

### Task 4: Centralize Report Insight Extraction And Upgrade Report Explainability

**Files:**
- Create: `src/systems/roguelike/AdventureReportInsightSystem.ts`
- Modify: `src/pages/AdventurePage.tsx`
- Modify: `src/pages/AdventureReportPage.tsx`
- Test: `src/__tests__/AdventureReportInsightSystem.test.ts`
- Test: `src/__tests__/AdventureReportPage.test.tsx`

- [ ] **Step 1: Write failing tests for reusable report insight extraction**

```ts
import { buildAdventureReportInsight } from '../systems/roguelike/AdventureReportInsightSystem'

it('extracts core disciple, key build, turning point, and cause', () => {
  const insight = buildAdventureReportInsight(report, characterNameMap)
  expect(insight.coreName).toBe('李清风')
  expect(insight.turningPoint).toContain('撤退')
})
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `npx vitest run src/__tests__/AdventureReportInsightSystem.test.ts src/__tests__/AdventureReportPage.test.tsx`
Expected: FAIL because the helper does not exist and pages still contain inline heuristics

- [ ] **Step 3: Implement the shared report insight helper and simplify both pages**

```ts
export function buildAdventureReportInsight(report: AdventureReport, nameMap: Map<string, string>) {
  return {
    coreName,
    keyBuild,
    turningPoint,
    cause,
    mutationHighlights,
  }
}
```

- [ ] **Step 4: Run the focused tests to verify they pass**

Run: `npx vitest run src/__tests__/AdventureReportInsightSystem.test.ts src/__tests__/AdventureReportPage.test.tsx`
Expected: PASS with the report list and report detail sharing the same explanation output

- [ ] **Step 5: Commit**

```bash
git add src/systems/roguelike/AdventureReportInsightSystem.ts src/pages/AdventurePage.tsx src/pages/AdventureReportPage.tsx src/__tests__/AdventureReportInsightSystem.test.ts src/__tests__/AdventureReportPage.test.tsx
git commit -m "feat: explain adventure outcomes in shared report insights"
```

---

### Task 5: Derive Disciple Usage Tags Without Turning Them Into Orders

**Files:**
- Create: `src/systems/character/DiscipleUseProfileSystem.ts`
- Modify: `src/components/common/CharacterCard.tsx`
- Modify: `src/pages/CharactersPage.tsx`
- Test: `src/__tests__/DiscipleUseProfileSystem.test.ts`
- Test: `src/__tests__/CharactersPage.test.tsx`

- [ ] **Step 1: Write failing tests for concise disciple usage traits**

```ts
import { buildDiscipleUseProfile } from '../systems/character/DiscipleUseProfileSystem'

it('derives readable usage traits from path, specialty, and fate tags', () => {
  const profile = buildDiscipleUseProfile(mockCharacter)
  expect(profile.tags).toContain('守宗偏稳')
  expect(profile.tags).not.toContain('推荐前往丹炉')
})
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `npx vitest run src/__tests__/DiscipleUseProfileSystem.test.ts src/__tests__/CharactersPage.test.tsx`
Expected: FAIL because the profile helper and the new display tags do not exist yet

- [ ] **Step 3: Implement the usage-profile helper and swap recommendation phrasing for judgment material**

```ts
export function buildDiscipleUseProfile(character: Character) {
  return {
    tags: ['守宗偏稳', '适宜争锋'],
    leaveHomeValue: 'high',
    riskTolerance: 'medium',
  }
}
```

- [ ] **Step 4: Run the focused tests to verify they pass**

Run: `npx vitest run src/__tests__/DiscipleUseProfileSystem.test.ts src/__tests__/CharactersPage.test.tsx`
Expected: PASS with the UI showing use traits but no “最佳去向” style directives

- [ ] **Step 5: Commit**

```bash
git add src/systems/character/DiscipleUseProfileSystem.ts src/components/common/CharacterCard.tsx src/pages/CharactersPage.tsx src/__tests__/DiscipleUseProfileSystem.test.ts src/__tests__/CharactersPage.test.tsx
git commit -m "feat: express disciple use profiles without directive hints"
```

---

### Task 6: Run End-To-End Regression Checks

**Files:**
- Modify: `src/__tests__/SectPage.test.tsx`
- Modify: `src/__tests__/AdventureReportPage.test.tsx`
- Modify: `src/__tests__/CharactersPage.test.tsx`
- Modify: `src/__tests__/AutoRunPolicy.test.ts`

- [ ] **Step 1: Add or tighten regression assertions around the final integrated copy**

```ts
expect(screen.queryByText(/当前最该做|优先处理|推荐前往/)).not.toBeInTheDocument()
expect(screen.getByText('守成')).toBeInTheDocument()
expect(screen.getByText('关键 build')).toBeInTheDocument()
```

- [ ] **Step 2: Run the targeted regression suite to verify failures first**

Run: `npx vitest run src/__tests__/SectPage.test.tsx src/__tests__/AdventureReportPage.test.tsx src/__tests__/CharactersPage.test.tsx src/__tests__/AutoRunPolicy.test.ts`
Expected: FAIL on any un-updated copy or missing integration details

- [ ] **Step 3: Fix the last integration gaps and clean up copy/constants**

```ts
const FORBIDDEN_DIRECTIVE_COPY = [/当前最该做/, /优先处理/, /推荐前往/]
```

- [ ] **Step 4: Run the full relevant suite**

Run: `npx vitest run src/__tests__/SectPage.test.tsx src/__tests__/AdventureReportPage.test.tsx src/__tests__/CharactersPage.test.tsx src/__tests__/AutoRunPolicy.test.ts src/__tests__/AutoRunEngine.test.ts src/__tests__/SectInsightSystem.test.ts`
Expected: PASS

- [ ] **Step 5: Run the broad project verification**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/__tests__/SectPage.test.tsx src/__tests__/AdventureReportPage.test.tsx src/__tests__/CharactersPage.test.tsx src/__tests__/AutoRunPolicy.test.ts
git commit -m "test: verify light overview and run intent flow"
```

---

## Notes For The Implementer

- Keep persisted `AutomationStrategy` values as `steady/combat/profit` unless a migration becomes unavoidable. The product rename should be expressed through shared copy, not by breaking saves.
- Do not reintroduce “best next action” ranking in any helper, even if it seems convenient for testing. The overview system should pick one representative change per category, not compute a global todo order.
- When deriving disciple usage traits, prefer neutral interpretive phrases over imperative phrases. “守宗偏稳” is acceptable; “应留宗门” is not.
- Reuse the shared report insight helper in both list and detail surfaces so players get the same explanation everywhere.
- Keep the visual tone restrained. This feature is about reducing pressure and preserving self-direction, not about increasing CTA intensity.

