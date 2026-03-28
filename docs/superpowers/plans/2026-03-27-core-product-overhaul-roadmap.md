# Core Product Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reframe EndlessQuest around a clearer action loop, stronger roguelike decision-making, and tighter sect-disciple-adventure integration without discarding the existing codebase.

**Architecture:** Build in phases. First unify player-facing state and information architecture around the current systems, then add a run-build layer for adventure, then deepen disciple identity and sect route progression. Prefer extending existing Zustand stores and system modules instead of adding parallel state models.

**Tech Stack:** React 19, TypeScript, Zustand, CSS Modules, Vitest, IndexedDB save system

---

## File Structure Map

### Existing files to modify first

- `src/types/character.ts`
  - Character status types, disciple progression metadata, future fate tags
- `src/stores/sectStore.ts`
  - Main sect state transitions, breakthrough flow, assignment metadata, dashboard summaries
- `src/stores/adventureStore.ts`
  - Run lifecycle, dispatch lifecycle, future run-build rewards and tactical settings
- `src/pages/SectPage.tsx`
  - Convert overview page into action-oriented dashboard
- `src/pages/CharactersPage.tsx`
  - Surface role, assignment, risk, and disciple usefulness
- `src/pages/AdventurePage.tsx`
  - Improve launch flow, preparation UI, and future run-build affordances
- `src/components/common/CharacterCard.tsx`
  - Show purpose, current role, and short-form status clearly
- `src/components/cultivation/BreakthroughPanel.tsx`
  - Show breakthrough readiness, risk, and consequence previews
- `src/systems/combat/CombatEngine.ts`
  - Add tactical presets and smarter skill/target usage
- `src/systems/roguelike/EventSystem.ts`
  - Add richer event outcomes, blessings, relics, and branch hooks

### Existing tests to extend

- `src/__tests__/stores.test.ts`
- `src/__tests__/CultivationEngine.test.ts`
- `src/__tests__/CombatEngine.test.ts`
- `src/__tests__/RoguelikeEngine.test.ts`
- `src/__tests__/SpecialtySystem.test.ts`
- `src/__tests__/TechniqueSystem.test.ts`

### New files to create over time

- `src/types/runBuild.ts`
  - Blessings, relics, tactical presets, route modifiers
- `src/data/blessings.ts`
  - Run-build blessing definitions
- `src/data/relics.ts`
  - Rare rule-changing relic definitions
- `src/data/sectRoutes.ts`
  - Sect route tracks and unlock nodes
- `src/data/fateTags.ts`
  - Disciple fate states such as heart-devil, tribulation-scar, insight
- `src/systems/roguelike/RunBuildSystem.ts`
  - Resolve blessing/relic choices and persist run modifiers
- `src/systems/character/FateSystem.ts`
  - Apply long-term disciple consequences from breakthroughs and events
- `src/systems/sect/SectRouteSystem.ts`
  - Compute active sect route effects
- `src/components/sect/ActionAgenda.tsx`
  - Dashboard top-priority action cards
- `src/components/adventure/TacticPresetPicker.tsx`
  - Team tactical preset selector
- `src/components/adventure/RunBuildSummary.tsx`
  - Current blessings, relics, and route choices

---

## Scope Split Recommendation

This roadmap intentionally spans multiple subsystems. Do not implement it in a single batch. Execute it as four working slices:

1. Status + dashboard unification
2. Adventure run-build depth
3. Disciple fate + sect route identity
4. Long-term meta progression

Each slice should ship in a playable state before starting the next.

---

### Task 1: Unify Character State And Player Vocabulary

**Files:**
- Modify: `src/types/character.ts`
- Modify: `src/stores/sectStore.ts`
- Modify: `src/stores/adventureStore.ts`
- Modify: `src/pages/CharactersPage.tsx`
- Modify: `src/pages/SectPage.tsx`
- Modify: `src/pages/AdventurePage.tsx`
- Modify: `src/components/common/StatusBadge.tsx`
- Modify: `src/components/common/CharacterCard.tsx`
- Test: `src/__tests__/stores.test.ts`

- [ ] **Step 1: Write failing store tests for the intended status model**

Add assertions covering:
- `idle` means default auto-cultivation
- `training` means assigned to building work
- `patrolling` means dispatch mission
- pages and filters do not reference removed `cultivating` or `secluded` states

- [ ] **Step 2: Run the focused tests to verify the old assumptions fail**

Run: `npm test -- stores.test.ts`
Expected: FAIL on outdated status assumptions

- [ ] **Step 3: Update the character status type and sect/adventure transitions**

Ensure:
- newly generated or recovered characters return to `idle`
- dispatch uses `patrolling`
- building assignment uses `training`
- adventure uses `adventuring`

- [ ] **Step 4: Remove outdated page-level status branches**

Replace old filter logic and CTA logic in:
- `src/pages/CharactersPage.tsx`
- `src/pages/SectPage.tsx`
- `src/pages/AdventurePage.tsx`

- [ ] **Step 5: Update status badges and card summaries**

Show:
- current action
- short purpose label
- quick progress when relevant

- [ ] **Step 6: Re-run focused tests**

Run: `npm test -- stores.test.ts`
Expected: PASS

- [ ] **Step 7: Run broader regression tests**

Run: `npm test -- CultivationEngine.test.ts stores.test.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/types/character.ts src/stores/sectStore.ts src/stores/adventureStore.ts src/pages/CharactersPage.tsx src/pages/SectPage.tsx src/pages/AdventurePage.tsx src/components/common/StatusBadge.tsx src/components/common/CharacterCard.tsx src/__tests__/stores.test.ts
git commit -m "feat: unify character status model"
```

---

### Task 2: Turn SectPage Into An Action Dashboard

**Files:**
- Create: `src/components/sect/ActionAgenda.tsx`
- Create: `src/components/sect/ActionAgenda.module.css`
- Modify: `src/pages/SectPage.tsx`
- Modify: `src/pages/SectPage.module.css`
- Modify: `src/stores/sectStore.ts`
- Test: `src/__tests__/stores.test.ts`

- [x] **Step 1: Write failing tests for dashboard priority summaries**

Cover store selectors/helpers that compute:
- next breakthrough candidate
- highest-value building upgrade candidate
- next recommended dungeon candidate

- [x] **Step 2: Run the focused test**

Run: `npm test -- stores.test.ts`
Expected: FAIL because summary selectors do not exist

- [x] **Step 3: Add sect-level derived selectors/helpers**

Implement small helpers in `src/stores/sectStore.ts` or a nearby system module for:
- breakthrough readiness
- upgrade value heuristic
- recommended action copy

- [x] **Step 4: Build `ActionAgenda` component**

Render 2-3 priority cards with:
- title
- why it matters
- primary CTA label
- readiness/blocked reason

- [x] **Step 5: Reorder SectPage information hierarchy**

Place:
1. agenda
2. active major tasks
3. resources
4. key disciples or key teams

- [x] **Step 6: Re-run the focused tests**

Run: `npm test -- stores.test.ts`
Expected: PASS

- [x] **Step 7: Smoke test the page manually**

Run: `npm run build`
Expected: successful build

- [ ] **Step 8: Commit**

```bash
git add src/components/sect/ActionAgenda.tsx src/components/sect/ActionAgenda.module.css src/pages/SectPage.tsx src/pages/SectPage.module.css src/stores/sectStore.ts src/__tests__/stores.test.ts
git commit -m "feat: add sect action agenda dashboard"
```

---

### Task 3: Add Adventure Preparation And Tactical Presets

**Files:**
- Create: `src/types/runBuild.ts`
- Create: `src/components/adventure/TacticPresetPicker.tsx`
- Create: `src/components/adventure/TacticPresetPicker.module.css`
- Modify: `src/types/adventure.ts`
- Modify: `src/stores/adventureStore.ts`
- Modify: `src/pages/AdventurePage.tsx`
- Modify: `src/systems/combat/CombatEngine.ts`
- Test: `src/__tests__/CombatEngine.test.ts`
- Test: `src/__tests__/RoguelikeEngine.test.ts`

- [ ] **Step 1: Write failing combat tests for tactical behavior**

Add cases for:
- conserve-spirit preset delays expensive skills
- burst preset spends spirit earlier
- boss preset prioritizes single-target or finishing logic

- [ ] **Step 2: Run the combat test file**

Run: `npm test -- CombatEngine.test.ts`
Expected: FAIL because presets do not exist

- [ ] **Step 3: Define tactic preset types and persist selection in dungeon runs**

Extend `DungeonRun` with:
- tactic preset id
- optional notes or derived tags

- [ ] **Step 4: Update the team builder flow**

Add a preset picker before confirming a run.

- [ ] **Step 5: Teach `CombatEngine` to read preset intent**

Change:
- target selection
- skill spending order
- support/defense skill usage gates

- [ ] **Step 6: Re-run focused tests**

Run: `npm test -- CombatEngine.test.ts RoguelikeEngine.test.ts`
Expected: PASS

- [ ] **Step 7: Build and quick sanity check**

Run: `npm run build`
Expected: successful build

- [ ] **Step 8: Commit**

```bash
git add src/types/runBuild.ts src/components/adventure/TacticPresetPicker.tsx src/components/adventure/TacticPresetPicker.module.css src/types/adventure.ts src/stores/adventureStore.ts src/pages/AdventurePage.tsx src/systems/combat/CombatEngine.ts src/__tests__/CombatEngine.test.ts src/__tests__/RoguelikeEngine.test.ts
git commit -m "feat: add tactical presets for adventure teams"
```

---

### Task 4: Add Blessings, Relics, And Route Branches To Runs

**Files:**
- Create: `src/data/blessings.ts`
- Create: `src/data/relics.ts`
- Create: `src/systems/roguelike/RunBuildSystem.ts`
- Modify: `src/types/adventure.ts`
- Modify: `src/systems/roguelike/EventSystem.ts`
- Modify: `src/stores/adventureStore.ts`
- Modify: `src/pages/AdventurePage.tsx`
- Test: `src/__tests__/RoguelikeEngine.test.ts`

- [ ] **Step 1: Write failing roguelike tests for blessing/relic rewards**

Cover:
- a run can receive a blessing choice
- selected blessing modifies a future event/combat outcome
- relics persist inside the run

- [ ] **Step 2: Run the focused test**

Run: `npm test -- RoguelikeEngine.test.ts`
Expected: FAIL because run-build modifiers are not modeled

- [ ] **Step 3: Add blessing and relic definitions**

Prefer a small launch pool:
- 8-12 blessings
- 4-6 relics

Make them directional, not generic stat buffs.

- [ ] **Step 4: Add run-build state to `DungeonRun`**

Track:
- chosen blessings
- chosen relics
- branch tags

- [ ] **Step 5: Extend event resolution to offer or apply run-build changes**

Add branch outcomes for:
- combat reward choice
- risky event trade-offs
- rare relic discovery

- [ ] **Step 6: Render current build summary on AdventurePage**

Show compact chips or cards for active build identity.

- [ ] **Step 7: Re-run focused tests**

Run: `npm test -- RoguelikeEngine.test.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/data/blessings.ts src/data/relics.ts src/systems/roguelike/RunBuildSystem.ts src/types/adventure.ts src/systems/roguelike/EventSystem.ts src/stores/adventureStore.ts src/pages/AdventurePage.tsx src/__tests__/RoguelikeEngine.test.ts
git commit -m "feat: add run build layer to adventure"
```

---

### Task 5: Make Disciple Purpose Visible Through Roles And Assignment Value

**Files:**
- Modify: `src/types/character.ts`
- Modify: `src/data/specialties.ts`
- Modify: `src/systems/character/SpecialtySystem.ts`
- Modify: `src/pages/CharactersPage.tsx`
- Modify: `src/components/common/CharacterCard.tsx`
- Modify: `src/pages/BuildingsPage.tsx`
- Test: `src/__tests__/SpecialtySystem.test.ts`

- [ ] **Step 1: Write failing tests for specialty-to-role recommendations**

Cases:
- a disciple with alchemy specialty is recommended for alchemy building
- a combat/fortune disciple is recommended for adventure
- UI-facing helper returns a readable primary role string

- [ ] **Step 2: Run the specialty test file**

Run: `npm test -- SpecialtySystem.test.ts`
Expected: FAIL because recommendation helpers do not exist

- [ ] **Step 3: Add role recommendation helpers**

Expose:
- primary role
- secondary role
- best building or best combat fit

- [ ] **Step 4: Surface role chips in character list and detail**

Show why a disciple is valuable, not just raw stats.

- [ ] **Step 5: Surface assignment recommendations in buildings**

Buildings should hint which disciple fits best and why.

- [ ] **Step 6: Re-run focused tests**

Run: `npm test -- SpecialtySystem.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/types/character.ts src/data/specialties.ts src/systems/character/SpecialtySystem.ts src/pages/CharactersPage.tsx src/components/common/CharacterCard.tsx src/pages/BuildingsPage.tsx src/__tests__/SpecialtySystem.test.ts
git commit -m "feat: show disciple role and assignment value"
```

---

### Task 6: Add Fate Tags For Breakthrough, Injury, And Insight

**Files:**
- Create: `src/data/fateTags.ts`
- Create: `src/systems/character/FateSystem.ts`
- Modify: `src/types/character.ts`
- Modify: `src/systems/cultivation/CultivationEngine.ts`
- Modify: `src/systems/cultivation/TribulationSystem.ts`
- Modify: `src/stores/sectStore.ts`
- Modify: `src/components/cultivation/BreakthroughPanel.tsx`
- Modify: `src/pages/CharactersPage.tsx`
- Test: `src/__tests__/CultivationEngine.test.ts`
- Test: `src/__tests__/TribulationSystem.test.ts`

- [ ] **Step 1: Write failing tests for fate application**

Cover:
- failed tribulation can add a scar or injury-related fate tag
- successful high-risk breakthrough can add insight or stability
- tags persist on the character

- [ ] **Step 2: Run the focused tests**

Run: `npm test -- CultivationEngine.test.ts TribulationSystem.test.ts`
Expected: FAIL because fate tags are not modeled

- [ ] **Step 3: Add fate tag data and character field**

Start with a small set:
- tribulation scar
- heart-devil seed
- sudden insight
- stable dao-heart

- [ ] **Step 4: Apply fate changes in breakthrough and tribulation flows**

Keep the first pass simple and deterministic where possible.

- [ ] **Step 5: Surface risk and long-term consequences in the UI**

Breakthrough panel should preview:
- failure consequence
- current risk modifiers
- active fate tags that matter

- [ ] **Step 6: Re-run focused tests**

Run: `npm test -- CultivationEngine.test.ts TribulationSystem.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/data/fateTags.ts src/systems/character/FateSystem.ts src/types/character.ts src/systems/cultivation/CultivationEngine.ts src/systems/cultivation/TribulationSystem.ts src/stores/sectStore.ts src/components/cultivation/BreakthroughPanel.tsx src/pages/CharactersPage.tsx src/__tests__/CultivationEngine.test.ts src/__tests__/TribulationSystem.test.ts
git commit -m "feat: add disciple fate tags for breakthrough outcomes"
```

---

### Task 7: Add Sect Routes As Mid-Term Identity

**Files:**
- Create: `src/data/sectRoutes.ts`
- Create: `src/systems/sect/SectRouteSystem.ts`
- Modify: `src/types/sect.ts`
- Modify: `src/stores/sectStore.ts`
- Modify: `src/pages/SectPage.tsx`
- Modify: `src/pages/BuildingsPage.tsx`
- Modify: `src/pages/AdventurePage.tsx`
- Test: `src/__tests__/SectEngine.test.ts`

- [ ] **Step 1: Write failing tests for route activation and effects**

Cover:
- one route can be activated
- route grants expected modifiers
- route influences adventure preparation summaries

- [ ] **Step 2: Run the sect-focused tests**

Run: `npm test -- SectEngine.test.ts stores.test.ts`
Expected: FAIL because route state does not exist

- [ ] **Step 3: Add sect route definitions**

Start with:
- alchemy route
- sword route
- beast route

- [ ] **Step 4: Persist active route and unlocked nodes**

Use existing sect save flow.

- [ ] **Step 5: Surface route identity in the UI**

Show:
- active route
- next unlock node
- what it changes for the next run

- [ ] **Step 6: Re-run focused tests**

Run: `npm test -- SectEngine.test.ts stores.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/data/sectRoutes.ts src/systems/sect/SectRouteSystem.ts src/types/sect.ts src/stores/sectStore.ts src/pages/SectPage.tsx src/pages/BuildingsPage.tsx src/pages/AdventurePage.tsx src/__tests__/SectEngine.test.ts src/__tests__/stores.test.ts
git commit -m "feat: add sect route progression"
```

---

### Task 8: Add Long-Term Meta Progression Hooks

**Files:**
- Modify: `src/types/sect.ts`
- Modify: `src/stores/sectStore.ts`
- Modify: `src/stores/eventLogStore.ts`
- Modify: `src/pages/EventLogPage.tsx`
- Create: `src/data/archiveMilestones.ts`
- Test: `src/__tests__/stores.test.ts`

- [ ] **Step 1: Write failing tests for historical milestone recording**

Cover:
- first rare recruit
- first major tribulation success
- first boss clear

- [ ] **Step 2: Run the focused test**

Run: `npm test -- stores.test.ts`
Expected: FAIL because history fields are missing

- [ ] **Step 3: Add sect history or archive fields**

Persist milestone entries in the main save payload.

- [ ] **Step 4: Surface milestones in log/history UI**

Keep the first version text-forward and lightweight.

- [ ] **Step 5: Re-run focused tests**

Run: `npm test -- stores.test.ts`
Expected: PASS

- [ ] **Step 6: Build check**

Run: `npm run build`
Expected: successful build

- [ ] **Step 7: Commit**

```bash
git add src/types/sect.ts src/stores/sectStore.ts src/stores/eventLogStore.ts src/pages/EventLogPage.tsx src/data/archiveMilestones.ts src/__tests__/stores.test.ts
git commit -m "feat: add sect history milestones"
```

---

## Verification Checklist

- [ ] `npm test -- stores.test.ts CultivationEngine.test.ts CombatEngine.test.ts RoguelikeEngine.test.ts SpecialtySystem.test.ts SectEngine.test.ts`
- [ ] `npm run build`
- [ ] Manual pass on desktop width
- [ ] Manual pass on mobile width
- [ ] Confirm save migration for any new fields
- [ ] Confirm no page still references removed legacy status names

---

## Release Order

1. Task 1 + Task 2
   - This creates a clearer playable baseline immediately.
2. Task 3 + Task 4
   - This unlocks real roguelike identity.
3. Task 5 + Task 6 + Task 7
   - This makes disciples and sect identity matter.
4. Task 8
   - This secures longer-term retention.

---

## Notes For Execution

- Keep the first implementation of each new system intentionally small.
- Prefer 1 strong route over 3 shallow routes if time compresses.
- Prefer 8 meaningful blessings over 30 generic buffs.
- Prefer 4 memorable fate tags over a large unreadable status list.
- If a feature does not change player choices, cut or postpone it.
