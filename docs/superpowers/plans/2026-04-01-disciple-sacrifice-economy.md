# Disciple Sacrifice Economy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert disciples into high-loss resources by making all disciples permanently mortal in adventure and breakthrough flows, refunding only part of their spirit-stone investment on death, and shifting long-term player value toward sect growth instead of individual preservation.

**Architecture:** Implement this in four layers: first add persistent disciple investment tracking and a shared sacrifice/refund helper; then add a store-level sacrifice action so every death path uses one rule; then wire that action into adventure and breakthrough resolution while preserving report snapshots for dead disciples; finally retune recruit/copy surfaces so the game still feels playable after casualties. Keep the existing Zustand slice structure and report pipeline, but centralize mortality semantics so pages and stores do not invent different death rules.

**Tech Stack:** React 19, TypeScript, Zustand, CSS Modules, Vitest, Testing Library

---

## File Structure

### Core mortality and investment tracking

- Modify: `src/types/character.ts`
- Modify: `src/types/adventure.ts`
- Modify: `src/systems/character/CharacterEngine.ts`
- Create: `src/systems/character/DiscipleSacrificeSystem.ts`
- Test: `src/__tests__/DiscipleSacrificeSystem.test.ts`
- Test: `src/__tests__/types.test.ts`

These files define what the game remembers about a disciple’s sunk spirit-stone cost and what a report must snapshot before a dead disciple disappears from the sect roster.

### Store-level sacrifice action

- Modify: `src/stores/sectStore/types.ts`
- Modify: `src/stores/sectStore/characterSlice.ts`
- Test: `src/__tests__/stores.test.ts`

This layer gives the app one canonical way to kill a disciple, refund stones, emit an event, and remove all associated equipment/backpack state by removing the character record.

### Adventure casualty resolution

- Modify: `src/stores/adventureStore.ts`
- Modify: `src/systems/roguelike/AutoRunEngine.ts`
- Modify: `src/pages/AdventurePage.tsx`
- Modify: `src/pages/AdventureReportPage.tsx`
- Modify: `src/systems/roguelike/AdventureReportInsightSystem.ts`
- Test: `src/__tests__/AutoRunEngine.test.ts`
- Test: `src/__tests__/AdventureReportPage.test.tsx`
- Test: `src/__tests__/AdventureReportInsightSystem.test.ts`

This layer ensures dead disciples are removed from the sect roster after the run resolves, but their names and loss outcome still appear in reports via report snapshots.

### Breakthrough casualty resolution

- Modify: `src/stores/sectStore/tickSlice.ts`
- Modify: `src/components/cultivation/BreakthroughPanel.tsx`
- Modify: `src/components/cultivation/BreakthroughPanel.module.css`
- Test: `src/__tests__/BreakthroughPanel.test.tsx`
- Test: `src/__tests__/stores.test.ts`

This layer removes the old injury/regression fallback for breakthrough failure and replaces it with death + partial spirit-stone refund.

### Supply stabilization and surface retune

- Modify: `src/stores/sectStore/characterSlice.ts`
- Modify: `src/pages/CharactersPage.tsx`
- Modify: `src/pages/BuildingsPage.tsx`
- Modify: `src/pages/AdventurePage.tsx`
- Test: `src/__tests__/CharactersPage.test.tsx`
- Test: `src/__tests__/BuildingsPage.test.tsx`
- Test: `src/__tests__/AdventurePage.test.tsx`

These files keep the game readable and playable after mortality goes live by clarifying the disciple-pool mindset and slightly lowering the emotional/UX pressure around loss.

---

### Task 1: Add Disciple Investment Tracking And Shared Refund Rules

**Files:**
- Modify: `src/types/character.ts`
- Modify: `src/types/adventure.ts`
- Modify: `src/systems/character/CharacterEngine.ts`
- Create: `src/systems/character/DiscipleSacrificeSystem.ts`
- Test: `src/__tests__/DiscipleSacrificeSystem.test.ts`
- Test: `src/__tests__/types.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { calcDiscipleDeathRefund, DISCIPLE_DEATH_REFUND_RATE } from '../systems/character/DiscipleSacrificeSystem'

it('refunds only a fixed fraction of invested spirit stones on death', () => {
  expect(calcDiscipleDeathRefund({ investedSpiritStone: 250 })).toBe(Math.floor(250 * DISCIPLE_DEATH_REFUND_RATE))
})

it('requires reports to carry a team snapshot for dead disciples', () => {
  const snapshot = {
    char_1: { name: '顾长风', quality: 'spirit', realm: 2, realmStage: 1 },
  }
  expect(snapshot.char_1.name).toBe('顾长风')
})
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run:

```bash
npx vitest run src/__tests__/DiscipleSacrificeSystem.test.ts src/__tests__/types.test.ts
```

Expected: FAIL because the helper module, `investedSpiritStone`, and report snapshot typing do not exist yet.

- [ ] **Step 3: Write the minimal implementation**

Add a disciple investment field and a shared helper:

```ts
export interface Character {
  // ...
  investedSpiritStone: number
}

export interface AdventureReport {
  // ...
  teamSnapshot: Record<string, { name: string; quality: CharacterQuality; realm: number; realmStage: RealmStage }>
}

export const DISCIPLE_DEATH_REFUND_RATE = 0.3

export function calcDiscipleDeathRefund(input: { investedSpiritStone: number }): number {
  return Math.floor(Math.max(0, input.investedSpiritStone) * DISCIPLE_DEATH_REFUND_RATE)
}
```

Also seed new characters with their recruit investment when they are generated/recruited.

- [ ] **Step 4: Run the focused tests to verify they pass**

Run:

```bash
npx vitest run src/__tests__/DiscipleSacrificeSystem.test.ts src/__tests__/types.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/types/character.ts src/types/adventure.ts src/systems/character/CharacterEngine.ts src/systems/character/DiscipleSacrificeSystem.ts src/__tests__/DiscipleSacrificeSystem.test.ts src/__tests__/types.test.ts
git commit -m "feat: add disciple death refund foundations"
```

---

### Task 2: Add A Canonical Sect-Store Sacrifice Action

**Files:**
- Modify: `src/stores/sectStore/types.ts`
- Modify: `src/stores/sectStore/characterSlice.ts`
- Test: `src/__tests__/stores.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it('sacrifices a disciple, refunds partial stones, and removes the character', () => {
  const store = useSectStore.getState()
  const target = store.sect.characters[0]!

  store.sacrificeCharacter(target.id, { source: 'adventure', reason: '秘境战死' })

  expect(useSectStore.getState().sect.characters.find((item) => item.id === target.id)).toBeUndefined()
  expect(useSectStore.getState().sect.resources.spiritStone).toBeGreaterThan(0)
})
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
npx vitest run src/__tests__/stores.test.ts
```

Expected: FAIL because `sacrificeCharacter` is not part of the store yet.

- [ ] **Step 3: Write the minimal implementation**

Add one canonical action to the character slice and store interface:

```ts
sacrificeCharacter: (id, context) => {
  const target = get().sect.characters.find((item) => item.id === id)
  if (!target) return false

  const refund = calcDiscipleDeathRefund(target)
  emitEvent('disciple_loss', `${target.name}${context.reason}，返还灵石 ${refund}`)

  set((s) => ({
    sect: {
      ...s.sect,
      characters: s.sect.characters.filter((item) => item.id !== id),
      resources: { ...s.sect.resources, spiritStone: s.sect.resources.spiritStone + refund },
    },
  }))

  return true
}
```

Do not add recovery branches here. This action is strictly death + refund + removal.

- [ ] **Step 4: Run the focused test to verify it passes**

Run:

```bash
npx vitest run src/__tests__/stores.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/stores/sectStore/types.ts src/stores/sectStore/characterSlice.ts src/__tests__/stores.test.ts
git commit -m "feat: add sect store sacrifice action"
```

---

### Task 3: Resolve Adventure Deaths Through The Sacrifice Action And Preserve Report Names

**Files:**
- Modify: `src/stores/adventureStore.ts`
- Modify: `src/systems/roguelike/AutoRunEngine.ts`
- Modify: `src/systems/roguelike/AdventureReportInsightSystem.ts`
- Modify: `src/pages/AdventurePage.tsx`
- Modify: `src/pages/AdventureReportPage.tsx`
- Test: `src/__tests__/AutoRunEngine.test.ts`
- Test: `src/__tests__/AdventureReportInsightSystem.test.ts`
- Test: `src/__tests__/AdventureReportPage.test.tsx`

- [ ] **Step 1: Write the failing tests**

```ts
it('stores team snapshots so dead disciples still show by name in reports', () => {
  const report = resolveAutomatedRun(...)
  expect(report.teamSnapshot.hero_1.name).toBe('顾长风')
})

it('removes dead disciples from the sect roster after an adventure resolves', () => {
  // seed a run with one dead member state
  expect(useSectStore.getState().sect.characters.find((item) => item.id === 'hero_1')).toBeUndefined()
})
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run:

```bash
npx vitest run src/__tests__/AutoRunEngine.test.ts src/__tests__/AdventureReportInsightSystem.test.ts src/__tests__/AdventureReportPage.test.tsx
```

Expected: FAIL because reports do not snapshot names and dead members are still converted to `resting`.

- [ ] **Step 3: Write the minimal implementation**

Update the automated run/report pipeline:

```ts
const teamSnapshot = Object.fromEntries(
  run.teamCharacterIds.map((charId) => {
    const character = sect.characters.find((item) => item.id === charId)!
    return [charId, { name: character.name, quality: character.quality, realm: character.realm, realmStage: character.realmStage }]
  })
)
```

Then, in `completeRun`, `failRun`, and `retreat`:

- survivors return to `idle`
- dead members call `useSectStore.getState().sacrificeCharacter(...)`
- no dead member is moved to `resting`

Update report insight/page code to prefer `report.teamSnapshot` over the live roster when rendering names and casualty explanations.

- [ ] **Step 4: Run the focused tests to verify they pass**

Run:

```bash
npx vitest run src/__tests__/AutoRunEngine.test.ts src/__tests__/AdventureReportInsightSystem.test.ts src/__tests__/AdventureReportPage.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/stores/adventureStore.ts src/systems/roguelike/AutoRunEngine.ts src/systems/roguelike/AdventureReportInsightSystem.ts src/pages/AdventurePage.tsx src/pages/AdventureReportPage.tsx src/__tests__/AutoRunEngine.test.ts src/__tests__/AdventureReportInsightSystem.test.ts src/__tests__/AdventureReportPage.test.tsx
git commit -m "feat: resolve adventure casualties as disciple loss"
```

---

### Task 4: Make Breakthrough Failure Kill The Disciple Instead Of Injuring Them

**Files:**
- Modify: `src/stores/sectStore/tickSlice.ts`
- Modify: `src/components/cultivation/BreakthroughPanel.tsx`
- Modify: `src/components/cultivation/BreakthroughPanel.module.css`
- Test: `src/__tests__/BreakthroughPanel.test.tsx`
- Test: `src/__tests__/stores.test.ts`

- [ ] **Step 1: Write the failing tests**

```tsx
it('tells the player that breakthrough failure means death', () => {
  render(<BreakthroughPanel characterId="char_1" />)
  expect(screen.getByText(/失败则身死道消/)).toBeInTheDocument()
})

it('removes a disciple when breakthrough fails inside tickAll', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0)
  // seed a ready-to-breakthrough disciple with non-zero failure rate
  useSectStore.getState().tickAll(1)
  expect(useSectStore.getState().sect.characters.find((item) => item.id === 'char_1')).toBeUndefined()
})
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run:

```bash
npx vitest run src/__tests__/BreakthroughPanel.test.tsx src/__tests__/stores.test.ts
```

Expected: FAIL because breakthrough failure still resets cultivation and sometimes applies injury.

- [ ] **Step 3: Write the minimal implementation**

Replace the old failure branches in `tickSlice`:

- tribulation failure -> call `sacrificeCharacter`
- non-tribulation breakthrough failure -> call `sacrificeCharacter`
- remove the old injury/stage-drop fallback from this flow

Update the panel copy so the player sees a clear cost before the attempt:

```tsx
<div className={styles.hintFocus}>成功则进阶，失败则身死道消，仅返还部分灵石。</div>
```

- [ ] **Step 4: Run the focused tests to verify they pass**

Run:

```bash
npx vitest run src/__tests__/BreakthroughPanel.test.tsx src/__tests__/stores.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/stores/sectStore/tickSlice.ts src/components/cultivation/BreakthroughPanel.tsx src/components/cultivation/BreakthroughPanel.module.css src/__tests__/BreakthroughPanel.test.tsx src/__tests__/stores.test.ts
git commit -m "feat: make breakthrough failure fatal"
```

---

### Task 5: Retune Supply And UI Surfaces Around A Replaceable Disciple Pool

**Files:**
- Modify: `src/stores/sectStore/characterSlice.ts`
- Modify: `src/pages/CharactersPage.tsx`
- Modify: `src/pages/BuildingsPage.tsx`
- Modify: `src/pages/AdventurePage.tsx`
- Test: `src/__tests__/CharactersPage.test.tsx`
- Test: `src/__tests__/BuildingsPage.test.tsx`
- Test: `src/__tests__/AdventurePage.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
it('frames disciples as a flowing roster instead of protected main characters', () => {
  render(<CharactersPage />)
  expect(screen.getByText(/当前弟子池|当前流转/)).toBeInTheDocument()
})

it('shows casualty risk language before adventure launch', () => {
  render(<AdventurePage />)
  expect(screen.getByText(/折损风险|可能付出的代价/)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run:

```bash
npx vitest run src/__tests__/CharactersPage.test.tsx src/__tests__/BuildingsPage.test.tsx src/__tests__/AdventurePage.test.tsx
```

Expected: FAIL on the new disciple-pool / casualty-risk language.

- [ ] **Step 3: Write the minimal implementation**

Make the game viable after casualties by doing only the smallest essential retune:

- lower or rebalance recruit friction in `characterSlice` so replacing dead disciples is realistically sustainable
- update list-page copy to emphasize roster flow and pool management
- update recruit/adventure surfaces to explain risk in calm, explicit language

Example copy direction:

```tsx
<span>当前弟子池</span>
<span>本次探索可能折损弟子，若身死道消，将仅返还部分灵石。</span>
```

Do not add memorial systems or recovery layers here.

- [ ] **Step 4: Run the focused tests to verify they pass**

Run:

```bash
npx vitest run src/__tests__/CharactersPage.test.tsx src/__tests__/BuildingsPage.test.tsx src/__tests__/AdventurePage.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/stores/sectStore/characterSlice.ts src/pages/CharactersPage.tsx src/pages/BuildingsPage.tsx src/pages/AdventurePage.tsx src/__tests__/CharactersPage.test.tsx src/__tests__/BuildingsPage.test.tsx src/__tests__/AdventurePage.test.tsx
git commit -m "feat: retune surfaces for disciple pool play"
```

---

### Task 6: Run Final Regression And Integration Verification

**Files:**
- Modify only files touched above if a regression fix is needed

- [ ] **Step 1: Run targeted mortality regressions first**

Run:

```bash
npx vitest run src/__tests__/DiscipleSacrificeSystem.test.ts src/__tests__/stores.test.ts src/__tests__/AutoRunEngine.test.ts src/__tests__/AdventureReportInsightSystem.test.ts src/__tests__/AdventureReportPage.test.tsx src/__tests__/BreakthroughPanel.test.tsx src/__tests__/CharactersPage.test.tsx src/__tests__/BuildingsPage.test.tsx src/__tests__/AdventurePage.test.tsx src/__tests__/types.test.ts
```

Expected: PASS, or precise failures showing a missed death path or snapshot path.

- [ ] **Step 2: Fix the last integration gaps**

Typical final fixes:

- dead disciple names missing because a page still reads from live roster instead of `teamSnapshot`
- refund totals not matching because a code path forgot to update `investedSpiritStone`
- breakthrough UI still mentioning injury/recovery

- [ ] **Step 3: Run full project verification**

Run:

```bash
npm test
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src docs/superpowers
git commit -m "test: verify disciple sacrifice economy flow"
```

---

## Notes For The Implementer

- Do not fake mortality by keeping dead disciples in the roster with a new dead status. The point of this feature is that the disciple is gone.
- Do not reintroduce equipment or technique recovery through “just one convenience path.” The approved rule is explicit: only partial spirit-stone refund.
- Preserve report readability by snapshotting disciple identity into reports before removal. This is mandatory, otherwise the post-run UI will lose names as soon as the roster updates.
- Keep the refund model boring and memorable. Fixed-rate partial refund is better than a clever but opaque formula.
- Avoid broad character-system rewrites. Existing `resting` / `injured` states can stay for unrelated flows; this feature only needs adventure death and breakthrough death to become fatal.
- If recruit-economy tuning feels necessary, keep it narrow and measurable. The goal is “replaceable disciples,” not a full economy rework.
