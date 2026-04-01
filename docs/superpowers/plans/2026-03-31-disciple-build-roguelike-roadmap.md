# Disciple Build Roguelike Roadmap

> Status Snapshot (2026-04-01): Implemented and archived. Use the progress snapshot below as the historical breakdown of what shipped; the roadmap itself is no longer an active task list.
>
> Verification (2026-04-01): `npm test` passed with 62 files / 884 tests, and `npm run build` passed.

> **For agentic workers:** Prefer implementing this roadmap slice by slice. Each slice should remain playable and testable when complete.

**Goal:** Turn EndlessQuest's disciple build into a low-operation, high-variance Roguelike system where long-term disciple identity and in-run growth meaningfully drive strategy, while preserving the current idle-management + automated-adventure direction.

**Architecture:** Keep the current sect management, automation adventure, combat, and save foundations. Reframe disciple build as two linked layers:

- Persistent identity layer: archetype, specialty, cultivation path, fate traces
- In-run growth layer: blessings, mutations, relics, route bias, event-driven awakenings

**Design constraint:** Reduce repetitive manual configuration. Preserve only high-value decisions: who to send, what direction to invest in, which branch to choose, and what risk to accept.

**Tech Stack:** React 19, TypeScript 5.9, Zustand 5, Vitest 4, CSS Modules, IndexedDB via `idb`

---

## Success Criteria

This roadmap succeeds when the project reaches the following state:

1. Recruiting a disciple already feels like a strategic evaluation, not just a rarity check.
2. A disciple's long-term value is visible across combat, dispatch, and building assignment.
3. Automated adventure reports can explain which disciple build carried or failed a run.
4. Different sect investments produce different disciple ecosystems and different run-build outcomes.
5. The player is making fewer micro-configuration actions, but more meaningful directional choices.

---

## Scope Split

This roadmap should be executed as four slices:

1. Persistent disciple identity
2. Low-operation build controls
3. Disciple-centric in-run build
4. Sect management rewires random pools

Do not skip ahead. Slice 3 depends on Slice 1 being real, and Slice 4 matters only after the player can clearly feel disciple identity and in-run variation.

---

## Progress Snapshot

> **Updated:** 2026-04-01

### Completed

- Phase 1 / Task 1: specialties are generated during live recruitment and surfaced in disciple UI
- Phase 1 / Task 2: cultivation path is now chosen explicitly instead of being assigned randomly
- Phase 1 / Task 3: fate traces now affect cultivation, breakthrough, tribulation, mutation bias, and long-term role/assignment evaluation
- Phase 2 / Task 1: disciple skill loadouts now follow an automatic, path-aware build flow
- Phase 2 / Task 2: sect staffing now includes recommendations and one-click auto-assignment
- Phase 2 / Task 3: equipment now exposes tendency and character-fit recommendations
- Phase 3 / Task 1: disciple mutations now exist as disciple-bound in-run growth
- Phase 3 / Task 2: route categories now communicate build direction through stable/combat/profit/mutation archetypes
- Phase 3 / Task 3: reports now explain run causality with core disciple, key build, turning point, and mutation highlights
- Phase 4 / Task 1: sect route effects now influence recruitment identity, building output, adventure reward bias, combat bonuses, pet capture, and in-run build weighting
- Phase 4 / Task 2: building ecology now biases recruitment-facing identity, visible build direction, and in-run blessing/mutation weighting
- Phase 4 / Task 3: SectPage now mounts ActionAgenda as a real action-priority dashboard

### Follow-up opportunities

- Expand blessing and mutation pool breadth so route/ecology divergence shows up across more runs
- Add clearer UI explanation for disciple recommendation changes caused by fate/path pressure
- Continue balance passes if route/ecology divergence needs to become even more dramatic

### Verification snapshot

- 2026-04-01: `npm test` passed with 62 test files and 884 tests passing
- 2026-04-01: `npm run build` completed successfully

---

## Phase 1: Persistent Disciple Identity

### Player-facing outcome

- New disciples no longer feel interchangeable.
- Recruiting, retaining, and assigning disciples becomes a meaningful management decision.
- Cultivation path becomes a player choice instead of a hidden random assignment.

### Primary changes

#### Task 1: Make specialties real on generation

**Files:**
- Modify: `src/systems/character/CharacterEngine.ts`
- Modify: `src/systems/character/SpecialtySystem.ts`
- Modify: `src/types/character.ts`
- Modify: `src/pages/CharactersPage.tsx`
- Modify: `src/components/common/CharacterCard.tsx`
- Test: `src/__tests__/CharacterEngine.test.ts`
- Test: `src/__tests__/SpecialtySystem.test.ts`

**Implementation goals:**
- Call `rollSpecialties()` during character generation
- Ensure specialty data is persisted and visible in cards/details
- Surface recommended role and recommended assignment clearly
- Distinguish management-specialty disciples from adventure-specialty disciples

**Acceptance criteria:**
- Newly recruited disciples can roll meaningful specialties
- The player can tell within a few seconds whether a disciple is better for buildings or for expeditions

#### Task 2: Change cultivation path from random assignment to breakthrough choice

**Files:**
- Modify: `src/systems/character/CharacterEngine.ts`
- Modify: `src/stores/sectStore/tickSlice.ts`
- Modify: `src/systems/character/CultivationPathSystem.ts`
- Modify: `src/components/cultivation/BreakthroughPanel.tsx`
- Modify: `src/pages/CharactersPage.tsx`
- Modify: `src/data/cultivationPaths.ts`
- Test: `src/__tests__/CultivationPathSystem.test.ts`
- Test: `src/__tests__/stores.test.ts`

**Implementation goals:**
- Remove random path assignment during initial character generation
- At the first major intended breakpoint, present 2-3 path choices
- Apply path stat bonuses in the real stat pipeline, not only in isolated tests
- Expose path choice in breakthrough flow and later disciple detail

**Acceptance criteria:**
- A disciple's path is chosen intentionally, not invisibly
- Path choice has a measurable effect on growth and later build options

#### Task 3: Strengthen fate traces as long-term identity modifiers

**Files:**
- Modify: `src/systems/character/FateSystem.ts`
- Modify: `src/data/fateTags.ts`
- Modify: `src/stores/sectStore/tickSlice.ts`
- Modify: `src/components/cultivation/BreakthroughPanel.tsx`
- Modify: `src/components/common/CharacterCard.tsx`
- Test: `src/__tests__/CultivationEngine.test.ts`
- Test: `src/__tests__/stores.test.ts`

**Implementation goals:**
- Expand fate effects beyond breakthrough odds
- Make positive and negative traces alter growth, role suitability, and run tendencies
- Make failure outcomes feed future builds instead of acting as dead penalties

**Acceptance criteria:**
- Fate tags materially change how a disciple is evaluated
- A failed breakthrough can still create a desirable future build

### Phase 1 verification

- `npm test -- CharacterEngine.test.ts SpecialtySystem.test.ts CultivationPathSystem.test.ts stores.test.ts`
- Manual check:
  - Recruit several disciples
  - Confirm specialties differ and are shown clearly
  - Trigger first path choice and verify it affects later numbers and labels

---

## Phase 2: Low-Operation Build Controls

### Player-facing outcome

- Build management becomes lighter and clearer.
- The player chooses direction rather than micromanaging slots.
- Sect management starts to feel like staffing and prioritization, not repetitive dragging.

### Primary changes

#### Task 1: Replace manual skill configuration with guided or automatic build slots

**Files:**
- Modify: `src/types/character.ts`
- Modify: `src/data/activeSkills.ts`
- Modify: `src/data/enemies.ts`
- Modify: `src/systems/combat/CombatEngine.ts`
- Modify: `src/systems/combat/SkillAI.ts`
- Modify: `src/pages/CharactersPage.tsx`
- Test: `src/__tests__/CombatEngine.test.ts`
- Test: `src/__tests__/data.test.ts`

**Implementation goals:**
- Normalize `equippedSkills` shape and defaults
- Introduce automatic skill acquisition based on path, fate, and key milestones
- Let the player make occasional keep/replace decisions instead of full manual slot management
- Preserve tactical presets as the main battle-control layer

**Acceptance criteria:**
- A disciple can form a coherent combat style without repeated slot micromanagement
- Tactical presets and disciple identity interact cleanly

#### Task 2: Add role recommendation and auto-assignment for sect staffing

**Files:**
- Modify: `src/stores/sectStore/characterSlice.ts`
- Modify: `src/stores/sectStore/buildingSlice.ts`
- Modify: `src/pages/BuildingsPage.tsx`
- Modify: `src/pages/CharactersPage.tsx`
- Modify: `src/systems/character/SpecialtySystem.ts`
- Test: `src/__tests__/stores.test.ts`

**Implementation goals:**
- Add "recommend assignment" and "auto assign by specialty"
- Reduce repetitive building staffing interactions
- Preserve manual override, but make automation the default path

**Acceptance criteria:**
- The player can efficiently place disciples without repeated manual shuffling
- Specialty relevance becomes more visible because it drives automation quality

#### Task 3: Reframe equipment around tendencies, not constant micro-swapping

**Files:**
- Modify: `src/pages/VaultPage.tsx`
- Modify: `src/components/inventory/EquipPanel.tsx`
- Modify: `src/systems/equipment/EquipmentEngine.ts`
- Modify: `src/types/item.ts`
- Test: `src/__tests__/EquipmentEngine.test.ts`

**Implementation goals:**
- Keep current equipment system but add recommended loadout/tendency views
- Let the player see "best for sword burst / tank / sustain / pet" rather than only raw stats
- Avoid requiring frequent item-by-item optimization for normal play

**Acceptance criteria:**
- Equipment decisions are strategic and occasional
- Routine play does not require frequent manual gear maintenance

### Phase 2 verification

- `npm test -- CombatEngine.test.ts EquipmentEngine.test.ts stores.test.ts data.test.ts`
- Manual check:
  - Recruit, assign, and equip disciples without excessive clicks
  - Confirm the game still gives clear build direction with less slot micromanagement

---

## Phase 3: Disciple-Centric In-Run Build

### Player-facing outcome

- Runs no longer feel like only team-wide numeric growth.
- Individual disciples can "become the story" of a run.
- Adventure reports can explain which disciple build emerged and why.

### Primary changes

#### Task 1: Add disciple-specific mutations/awakenings during runs

**Files:**
- Create: `src/data/discipleMutations.ts`
- Modify: `src/types/adventure.ts`
- Modify: `src/systems/roguelike/RunBuildSystem.ts`
- Modify: `src/systems/roguelike/AutoRunEngine.ts`
- Modify: `src/systems/roguelike/EventSystem.ts`
- Test: `src/__tests__/RunBuildSystem.test.ts`
- Test: `src/__tests__/AutoRunEngine.test.ts`

**Implementation goals:**
- Introduce in-run disciple-bound upgrades, not only team-wide blessings
- Bind some decisions to a specific disciple
- Let path/specialty/fate bias which mutations can appear

**Acceptance criteria:**
- Two runs with the same team can diverge because a different disciple becomes the carry
- Reports can identify a specific disciple-focused build outcome

#### Task 2: Add route categories with explicit build bias

**Files:**
- Modify: `src/systems/roguelike/MapGenerator.ts`
- Modify: `src/systems/roguelike/AutoRunPolicy.ts`
- Modify: `src/pages/AdventurePage.tsx`
- Modify: `src/components/adventure/RunBuildSummary.tsx`
- Test: `src/__tests__/AutoRunPolicy.test.ts`
- Test: `src/__tests__/RoguelikeEngine.test.ts`

**Implementation goals:**
- Reframe routes as build-direction choices, not only risk levels
- Examples:
  - stable route
  - combat route
  - profit route
  - mutation route
- Let automation strategy interact with route bias in a readable way

**Acceptance criteria:**
- Route choice is interpretable as build direction
- Automated runs still feel strategically authored

#### Task 3: Upgrade reports to explain build causality

**Files:**
- Modify: `src/pages/AdventureReportPage.tsx`
- Modify: `src/pages/AdventurePage.tsx`
- Modify: `src/stores/adventureStore.ts`
- Test: `src/__tests__/AdventureReportPage.test.tsx`

**Implementation goals:**
- Add summary fields such as:
  - core disciple of the run
  - key mutations/blessings/relics
  - turning-point event
  - why the run succeeded or failed
- Make reports readable as strategy feedback, not just logs

**Acceptance criteria:**
- After a run, the player can answer:
  - which disciple carried
  - which build formed
  - what key event changed the run

### Phase 3 verification

- `npm test -- AutoRunPolicy.test.ts AutoRunEngine.test.ts RunBuildSystem.test.ts AdventureReportPage.test.tsx`
- Manual check:
  - Launch multiple runs with similar teams
  - Confirm different runs can produce different disciple-centric stories

---

## Phase 4: Sect Management Rewires Random Pools

### Player-facing outcome

- Sect identity changes the disciple ecosystem.
- Building and route choices influence future builds, not only current output.
- Management and adventure finally feel like one connected strategy loop.

### Primary changes

#### Task 1: Make sect route effects real in economic and build systems

**Files:**
- Modify: `src/systems/sect/SectRouteSystem.ts`
- Modify: `src/stores/sectStore/tickSlice.ts`
- Modify: `src/stores/adventureStore.ts`
- Modify: `src/components/sect/SectPathPanel.tsx`
- Test: `src/__tests__/SectEngine.test.ts`
- Test: `src/__tests__/stores.test.ts`

**Implementation goals:**
- Ensure active route bonuses are consumed by real systems
- Let route affect:
  - recruitment weighting
  - in-run blessing/mutation bias
  - building output tendencies

**Acceptance criteria:**
- Choosing a sect route changes future disciple and run outcomes in noticeable ways

#### Task 2: Let buildings influence random pool ecology

**Files:**
- Modify: `src/data/buildings.ts`
- Modify: `src/systems/character/CharacterEngine.ts`
- Modify: `src/systems/roguelike/RunBuildSystem.ts`
- Modify: `src/components/building/*`
- Test: `src/__tests__/BuildingSystem.test.ts`
- Test: `src/__tests__/RunBuildSystem.test.ts`

**Implementation goals:**
- Buildings should influence what kinds of builds are easier to form
- Examples:
  - alchemy increases sustain/support tendencies
  - forge increases weapon/armor-oriented build tendencies
  - scripture hall increases insight or mutation quality
  - beast-oriented buildings increase pet build opportunities

**Acceptance criteria:**
- Building investment changes what the player is likely to see later
- Economy choices feel like strategy shaping, not only output scaling

#### Task 3: Add sect dashboard guidance around build ecology

**Files:**
- Modify: `src/pages/SectPage.tsx`
- Modify: `src/components/sect/ActionAgenda.tsx`
- Modify: `src/components/sect/StatsPanel.tsx`
- Test: `src/__tests__/SectPage.test.tsx`

**Implementation goals:**
- Hook `ActionAgenda` into the page for real
- Surface questions such as:
  - who is worth investing in next
  - which build line the sect is currently strongest at
  - which building upgrade would improve future disciple/run variance most

**Acceptance criteria:**
- The sect page becomes an action dashboard for build management, not just an information wall

### Phase 4 verification

- `npm test -- SectEngine.test.ts BuildingSystem.test.ts RunBuildSystem.test.ts SectPage.test.tsx stores.test.ts`
- Manual check:
  - Compare two saves or simulated paths with different sect investments
  - Confirm the available disciple and run-build outcomes diverge meaningfully

---

## Recommended Order Inside the Current Codebase

If implementation starts immediately, the highest-value order is:

1. Specialties on generation
2. Cultivation path choice + real stat hookup
3. Fate effects expansion
4. Guided skill/build defaults
5. Auto-assignment for staffing
6. Disciple mutations in runs
7. Report explanation upgrades
8. Sect route/building effects into random pools
9. Sect dashboard/action agenda integration

This order is chosen because it creates visible player impact early, while minimizing waste:

- Identity must exist before in-run disciple build matters
- In-run disciple build must exist before reports can explain it
- Reports must explain it before sect ecology changes feel meaningful

---

## Out of Scope for This Roadmap

The following should not be treated as priority build work:

- Real-time manual combat controls
- Complex AI scripting UI
- Heavy item-slot micromanagement
- Multiplayer, leaderboards, or social sharing
- Deep animation/cinematic polish before systems become legible

---

## Final Product Intent

After this roadmap, EndlessQuest should feel less like:

- "a static roster with passive numbers"

and more like:

- "a living sect where disciples develop distinct identities, risky histories, and run-specific forms under the player's long-term guidance"

The player's job is not to micromanage every lever.

The player's job is to:

- cultivate a pool
- recognize value
- accept risk
- shape the sect's ecology
- and watch different disciples become different legends

