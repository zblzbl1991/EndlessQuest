# Disciple Build Roguelike Implementation Plan

**Date:** 2026-03-31  
**Status:** Active  
**Related design:** `docs/superpowers/specs/2026-03-31-disciple-build-roguelike-design.md`  
**Related roadmap:** `docs/superpowers/plans/2026-03-31-disciple-build-roguelike-roadmap.md`

---

## Goal

Convert disciple build from a mostly descriptive layer into a real strategic system that:

- creates meaningful disciple differentiation at recruitment
- reduces repetitive manual setup
- lets in-run automation express disciple-centric build variance
- ties sect management decisions to future build ecology

This implementation plan expands the roadmap into engineering-oriented slices with concrete file targets, test targets, and order-of-operations guidance.

---

## Delivery Strategy

Implement in four production slices:

1. Persistent disciple identity
2. Low-operation build controls
3. Disciple-centric in-run build
4. Sect ecology and random-pool rewiring

Each slice should leave the game in a playable state.

---

## Current Status

### Already completed

- Slice 1 / Task 1.1: specialties are now generated in live character creation and surfaced in disciple UI
- Slice 1 / Task 1.2: cultivation path is now chosen at the first major breakthrough checkpoint instead of being assigned randomly
- Slice 1 / Task 1.3: fate traces now affect cultivation, breakthrough, tribulation, mutation bias, and long-term role/assignment evaluation
- Slice 2 / Task 2.1: disciple skill loadouts now synchronize to an automatic, path-aware five-slot build flow
- Slice 2 / Task 2.2: staffing recommendations and one-click auto-assignment now reduce repetitive sect staffing work
- Slice 2 / Task 2.3: equipment tendency and character-fit recommendations now support low-maintenance gear decisions
- Slice 3 / Task 3.1: disciple mutations now exist as disciple-bound in-run growth and are granted through auto-run flow
- Slice 3 / Task 3.2: route presentation now exposes readable build archetypes such as stable, combat, profit, and mutation
- Slice 3 / Task 3.3: adventure reports now explain run causality with core member, key build, turning point, and mutation highlights
- Slice 4 / Task 4.1: sect route effects now influence recruitment identity, building output, adventure reward bias, combat modifiers, pet capture, and in-run build weighting
- Slice 4 / Task 4.2: building ecology now biases recruitment-facing identity, visible build direction, and in-run blessing/mutation weighting
- Slice 4 / Task 4.3: the sect page now mounts ActionAgenda as a real action-priority dashboard

### Follow-up opportunities

- Expand the blessing and mutation pools so each route/ecology axis has more draft variety to express
- Add richer UI copy around why a disciple is recommended for adventure vs sect work
- Deepen route/building weighting beyond the current first production pass if future balance data shows weak divergence

### Verification snapshot

- 2026-04-01: `npm test` passed with 52 test files and 857 tests passing
- 2026-04-01: `npm run build` completed successfully

---

## Parallel Execution Lanes

To keep momentum without creating merge conflicts, remaining work should be executed in three lanes:

### Lane A: Identity and growth systems

**Owner:** main line

**Focus**
- Slice 1 / Task 1.3 fate expansion
- Slice 2 / Task 2.1 guided or automatic skill acquisition
- Slice 2 / Task 2.2 staffing recommendation and auto-assignment

**Reason**
- These tasks are tightly coupled to disciple generation, breakthrough flow, character state, and core management loop

### Lane B: Adventure expression

**Owner:** parallel worker

**Focus**
- Slice 3 / Task 3.3 report explanation upgrades
- optional follow-up into Slice 3 / Task 3.2 route presentation if report data needs it

**Reason**
- This lane mostly touches adventure report presentation and adventure store summary shaping, with minimal overlap with character systems

### Lane C: Sect decision surface

**Owner:** parallel worker

**Focus**
- Slice 4 / Task 4.3 sect dashboard integration
- optional support for Slice 2 / Task 2.2 recommendations if new overview widgets are needed

**Reason**
- This lane mostly touches sect overview UI and action prioritization, which is highly visible and low-risk to parallelize

---

## Round 1 Parallel Goal

Ship one coherent vertical increment where:

- disciples have specialties and explicit path choice
- fate traces begin affecting long-term disciple value
- reports better explain why a run succeeded or failed
- sect home page starts surfacing action priorities instead of only static status

This gives the player a stronger sense that disciple identity, automation results, and sect management belong to the same strategy loop.

---

## Slice 1: Persistent Disciple Identity

### Product intent

The player should be able to look at a fresh disciple and quickly answer:

- Is this disciple worth keeping?
- Are they better for sect work or expeditions?
- What kind of future build might they grow into?

### Task 1.1: Specialties become part of real character generation

**Files to modify**
- `src/systems/character/CharacterEngine.ts`
- `src/systems/character/SpecialtySystem.ts`
- `src/components/common/CharacterCard.tsx`
- `src/components/common/CharacterCard.module.css`
- `src/pages/CharactersPage.tsx`
- `src/pages/CharactersPage.module.css`

**Tests to update**
- `src/__tests__/CharacterEngine.test.ts`
- `src/__tests__/SpecialtySystem.test.ts`

**Implementation**
- Call `rollSpecialties()` during `generateCharacter()`
- Preserve specialties in save/load flow using current structure
- Surface:
  - primary specialty
  - recommended assignment
  - management/adventure role hint

**Acceptance**
- New recruits can spawn with specialties according to quality rules
- Cards and detail page show enough information to support staffing decisions

### Task 1.2: Cultivation path changes from hidden random to explicit milestone choice

**Files to modify**
- `src/systems/character/CharacterEngine.ts`
- `src/systems/character/CultivationPathSystem.ts`
- `src/stores/sectStore/tickSlice.ts`
- `src/components/cultivation/BreakthroughPanel.tsx`
- `src/pages/CharactersPage.tsx`
- `src/types/character.ts`

**Tests to update**
- `src/__tests__/CultivationPathSystem.test.ts`
- `src/__tests__/stores.test.ts`
- `src/__tests__/CharacterEngine.test.ts`

**Implementation**
- Stop assigning a random path at character creation
- Use `'none'` before the first meaningful path choice
- Introduce a path-choice state at the intended breakthrough milestone
- Hook `applyPathStatBonuses()` into the real stat pipeline

**Acceptance**
- The player makes the path decision
- Path choice affects growth and later build bias

### Task 1.3: Fate traces become meaningful long-term build modifiers

**Files to modify**
- `src/data/fateTags.ts`
- `src/systems/character/FateSystem.ts`
- `src/stores/sectStore/tickSlice.ts`
- `src/components/common/CharacterCard.tsx`
- `src/components/cultivation/BreakthroughPanel.tsx`

**Tests to update**
- `src/__tests__/CultivationEngine.test.ts`
- `src/__tests__/stores.test.ts`

**Implementation**
- Expand fate effects beyond breakthrough success rate
- Add implications for:
  - disciple evaluation
  - run tendencies
  - long-term upside/downside

**Acceptance**
- Fate traces can create desirable, risky, or specialized disciples
- Failure outcomes can feed future build identity

### Slice 1 verification

- `npm test -- src/__tests__/CharacterEngine.test.ts src/__tests__/SpecialtySystem.test.ts src/__tests__/CultivationPathSystem.test.ts src/__tests__/stores.test.ts`
- Manual smoke test:
  - recruit disciples across qualities
  - inspect specialties/roles
  - confirm path state and identity display make sense

---

## Slice 2: Low-Operation Build Controls

### Product intent

The player should shape disciple direction without constantly micromanaging slots, equipment, or staffing.

### Task 2.1: Normalize skill progression into guided or automatic acquisition

**Files to modify**
- `src/types/character.ts`
- `src/data/activeSkills.ts`
- `src/data/enemies.ts`
- `src/systems/combat/CombatEngine.ts`
- `src/systems/combat/SkillAI.ts`
- `src/pages/CharactersPage.tsx`

**Tests to update**
- `src/__tests__/CombatEngine.test.ts`
- `src/__tests__/data.test.ts`
- `src/__tests__/types.test.ts`

**Implementation**
- Standardize `equippedSkills` defaults
- Add milestone-based or path-based auto skill acquisition
- Replace high-frequency manual skill setup with occasional keep/replace choices

**Acceptance**
- A disciple gains a coherent combat identity with low setup overhead

### Task 2.2: Add staffing recommendations and auto-assignment

**Files to modify**
- `src/stores/sectStore/characterSlice.ts`
- `src/stores/sectStore/buildingSlice.ts`
- `src/pages/BuildingsPage.tsx`
- `src/pages/CharactersPage.tsx`
- `src/systems/character/SpecialtySystem.ts`

**Tests to update**
- `src/__tests__/stores.test.ts`

**Implementation**
- Add recommended staffing action
- Add auto-assignment by specialty
- Keep manual override, but reduce repeated drag-and-drop behavior

**Acceptance**
- Staffing is readable and efficient
- Specialty value is reinforced by automation quality

### Task 2.3: Reframe equipment around tendencies and recommendations

**Files to modify**
- `src/components/inventory/EquipPanel.tsx`
- `src/pages/VaultPage.tsx`
- `src/systems/equipment/EquipmentEngine.ts`
- `src/types/item.ts`

**Tests to update**
- `src/__tests__/EquipmentEngine.test.ts`

**Implementation**
- Add recommended loadout or item tendency labels
- Keep item system, but reduce the need for constant slot-by-slot optimization

**Acceptance**
- Equipment is a strategic layer, not a repetitive maintenance tax

### Slice 2 verification

- `npm test -- src/__tests__/CombatEngine.test.ts src/__tests__/EquipmentEngine.test.ts src/__tests__/data.test.ts src/__tests__/stores.test.ts`
- Manual smoke test:
  - inspect disciples with auto-acquired skills
  - assign staff with recommendation support
  - equip using guidance rather than raw stat comparison alone

---

## Slice 3: Disciple-Centric In-Run Build

### Product intent

A run should produce the feeling that one or two disciples became the "story" of that expedition.

### Task 3.1: Add disciple-specific mutations

**Files to create/modify**
- `src/data/discipleMutations.ts`
- `src/types/adventure.ts`
- `src/systems/roguelike/RunBuildSystem.ts`
- `src/systems/roguelike/AutoRunEngine.ts`
- `src/systems/roguelike/EventSystem.ts`

**Tests to update**
- `src/__tests__/RunBuildSystem.test.ts`
- `src/__tests__/AutoRunEngine.test.ts`

**Implementation**
- Add disciple-bound in-run effects
- Bias mutation pools by path, specialty, and fate
- Track which disciple received which mutation

**Acceptance**
- Similar teams can produce different carry disciples and different run stories

### Task 3.2: Rework route categories around build direction

**Files to modify**
- `src/systems/roguelike/MapGenerator.ts`
- `src/systems/roguelike/AutoRunPolicy.ts`
- `src/pages/AdventurePage.tsx`
- `src/components/adventure/RunBuildSummary.tsx`

**Tests to update**
- `src/__tests__/AutoRunPolicy.test.ts`
- `src/__tests__/RoguelikeEngine.test.ts`

**Implementation**
- Promote routes from risk-only labels to build-direction labels
- Add route categories such as:
  - stable
  - combat
  - profit
  - mutation

**Acceptance**
- Route choices communicate likely build growth direction

### Task 3.3: Make reports explain build causality

**Files to modify**
- `src/pages/AdventureReportPage.tsx`
- `src/pages/AdventurePage.tsx`
- `src/stores/adventureStore.ts`

**Tests to update**
- `src/__tests__/AdventureReportPage.test.tsx`

**Implementation**
- Add report summaries for:
  - core disciple
  - defining build
  - turning point
  - success/failure cause

**Acceptance**
- The player can learn from a run without manual replay

### Slice 3 verification

- `npm test -- src/__tests__/RunBuildSystem.test.ts src/__tests__/AutoRunEngine.test.ts src/__tests__/AutoRunPolicy.test.ts src/__tests__/AdventureReportPage.test.tsx`
- Manual smoke test:
  - launch multiple runs with similar teams
  - confirm in-run disciple variance is visible and explainable

---

## Slice 4: Sect Ecology and Random-Pool Rewiring

### Product intent

Sect investment should change what kinds of disciples, runs, and builds the player tends to encounter.

### Task 4.1: Make sect route effects real in production systems

**Files to modify**
- `src/systems/sect/SectRouteSystem.ts`
- `src/stores/sectStore/tickSlice.ts`
- `src/stores/adventureStore.ts`
- `src/components/sect/SectPathPanel.tsx`

**Tests to update**
- `src/__tests__/SectEngine.test.ts`
- `src/__tests__/stores.test.ts`

**Implementation**
- Apply route effects to live economy/build/random systems
- Use route to bias future build outcomes, not only display identity

**Acceptance**
- Route choice creates a real sect identity

### Task 4.2: Make building investment alter random pools

**Files to modify**
- `src/data/buildings.ts`
- `src/systems/character/CharacterEngine.ts`
- `src/systems/roguelike/RunBuildSystem.ts`
- `src/components/building/AlchemyPanel.tsx`
- `src/components/building/ForgePanel.tsx`
- `src/components/building/StudyPanel.tsx`

**Tests to update**
- `src/__tests__/BuildingSystem.test.ts`
- `src/__tests__/RunBuildSystem.test.ts`

**Implementation**
- Let buildings influence:
  - recruit weighting
  - blessing or mutation quality
  - item/build tendency pools

**Acceptance**
- Management choices reshape future build ecology

### Task 4.3: Turn sect page into a build-management dashboard

**Files to modify**
- `src/pages/SectPage.tsx`
- `src/components/sect/ActionAgenda.tsx`
- `src/components/sect/StatsPanel.tsx`

**Tests to update**
- `src/__tests__/SectPage.test.tsx`

**Implementation**
- Hook `ActionAgenda` into the page
- Surface next investment and disciple-value guidance
- Show what the sect is currently strongest at

**Acceptance**
- The sect page supports action and prioritization, not only observation

### Slice 4 verification

- `npm test -- src/__tests__/SectEngine.test.ts src/__tests__/BuildingSystem.test.ts src/__tests__/RunBuildSystem.test.ts src/__tests__/SectPage.test.tsx src/__tests__/stores.test.ts`
- Manual smoke test:
  - compare different sect investments
  - confirm they bias disciples and run-build outcomes differently

---

## Recommended Execution Order

Implement in this exact order:

1. 1.1 specialties on generation
2. 1.2 path choice
3. 1.3 fate expansion
4. 2.1 guided skills
5. 2.2 staffing automation
6. 2.3 equipment guidance
7. 3.1 disciple mutations
8. 3.2 route category bias
9. 3.3 report explanation
10. 4.1 sect route integration
11. 4.2 building-to-pool rewiring
12. 4.3 sect dashboard integration

This preserves visibility and avoids system waste.

---

## Implementation Note

Start by shipping Slice 1 Task 1.1 first.

It is the smallest high-leverage change because:

- the data model already supports specialties
- the UI already has the notion of role/adventure/building utility
- the player will immediately feel more meaningful recruitment and staffing decisions
