# Roadmap: EndlessQuest — Character Progression Depth (P2)

## Overview

This roadmap delivers character progression depth to EndlessQuest across 6 phases. Phase 1 clears technical debt that would block all subsequent work (tick extraction, save migration, quality consolidation). Phase 2 establishes character identity through cultivation path choice, element affinity, and title promotion. Phases 3-5 each deliver one independent combat-activity subsystem: skill loadout, pet/refinement integration, and technique comprehension. Phase 6 adds content depth through set bonuses and mechanical talents/fate tags. Each phase after Phase 1 activates the identity established in Phase 2 within a different gameplay dimension.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Clean up tech debt: tick extraction, save migration, quality consolidation, string fixes, deduplication
- [ ] **Phase 2: Character Identity** - Cultivation path choice, element affinity, title promotion, sect history logging
- [ ] **Phase 3: Skill Loadout** - Skill acquisition from 4 sources, equipment slots, auto-fill for offline, path-exclusive unlocks
- [ ] **Phase 4: Pet & Refinement Integration** - Pet combat units, beast-path synergy, refinement UI, equipment stat display
- [ ] **Phase 5: Technique Comprehension** - Comprehension progression 0-100%, milestone events, skill unlocks, save migration
- [ ] **Phase 6: Content Depth** - Set bonuses, mechanical talents, fate tag expansion, subsystem integration

## Phase Details

### Phase 1: Foundation
**Goal**: The codebase has a stable, consolidated foundation with clean integration points ready for progression features
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06
**Success Criteria** (what must be TRUE):
  1. New characters are created with rolled specialties persisted on the character instance
  2. Quality labels and quality ordering are defined in exactly one source file, imported everywhere
  3. Existing saves load correctly when new Character fields are added, with explicit default values
  4. Tick loop breakthrough logic is a single pure function with an extensible hook list
  5. adventureStore.ts contains correct Chinese text (no garbled strings)
**Plans**: TBD

Plans:
- [ ] 01-01: TBD
- [x] 01-02: Quality label consolidation

### Phase 2: Character Identity
**Goal**: Every disciple has a distinct identity defined by their cultivation path, element affinity, and title — visible and meaningful to the player
**Depends on**: Phase 1
**Requirements**: IDEN-01, IDEN-02, IDEN-03, IDEN-04, IDEN-05
**Success Criteria** (what must be TRUE):
  1. Player can choose a cultivation path (sword/body/alchemy/beast/formation/void) when a disciple breaks through to their first major realm; offline breakthrough defaults to sword path
  2. Each disciple displays an element affinity derived from their cultivation path via a lookup table
  3. Characters with matching element affinity deal bonus damage with same-element skills in combat
  4. Disciples automatically receive title promotions at realm milestones (disciple -> outer sect -> inner sect -> elder), and the title provides visible stat bonuses
  5. Title promotion events appear in the sect history log
**Plans**: TBD
**UI hint**: yes

### Phase 3: Skill Loadout
**Goal**: Characters can acquire, equip, and use skills in combat rather than default-attacking
**Depends on**: Phase 2
**Requirements**: SKILL-01, SKILL-02, SKILL-03, SKILL-04
**Success Criteria** (what must be TRUE):
  1. Characters acquire skills from 4 sources: cultivation path unlock, technique comprehension milestone, adventure event reward, and special talent
  2. Player can choose which 5 skills to equip from their character's acquired skill pool
  3. Offline/auto-mode characters automatically fill their skill loadout with the best available combination
  4. Cultivation path-exclusive skills (e.g., sword path "Sword Qi Slash") unlock automatically at the appropriate realm
**Plans**: TBD
**UI hint**: yes

### Phase 4: Pet & Refinement Integration
**Goal**: Pets participate in adventure combat as independent units, and players can refine equipment through the forge UI
**Depends on**: Phase 2
**Requirements**: PETC-01, PETC-02, PETC-03, EQUIP-01, EQUIP-02
**Success Criteria** (what must be TRUE):
  1. Pets join adventure teams as independent combat units with their own stats and attacks
  2. Beast-path disciples receive a visible pet power bonus
  3. The forge panel in BuildingsPage allows refining equipment, with a clear button that calls the existing backend
  4. Equipment detail panels show refinement level and refined stat bonuses
**Plans**: TBD
**UI hint**: yes

### Phase 5: Technique Comprehension
**Goal**: Techniques grow over time through study, with milestone events and skill unlocks rewarding continued investment
**Depends on**: Phase 1
**Requirements**: TECH-01, TECH-02, TECH-03, TECH-04
**Success Criteria** (what must be TRUE):
  1. Techniques have a visible 0-100% comprehension bar that increases over time while studying in the scripture pavilion
  2. Reaching 50% and 100% comprehension triggers milestone events logged in the sect history
  3. Reaching comprehension thresholds unlocks corresponding active skills for the character
  4. Old saves load correctly with learned techniques automatically set to 100% comprehension
**Plans**: TBD
**UI hint**: yes

### Phase 6: Content Depth
**Goal**: Equipment sets, mechanical talents, and expanded fate tags add strategic variety to character builds and progression
**Depends on**: Phase 3, Phase 4, Phase 5
**Requirements**: EQUIP-03, EQUIP-04, TALN-01, TALN-02, TALN-03, TALN-04
**Success Criteria** (what must be TRUE):
  1. Four elemental equipment sets (thunder/frost/flame/jade) grant bonuses at 2-piece and 4-piece thresholds
  2. Character total stats include active set bonus effects from equipped gear
  3. Three to four mechanical talents (fortune_star drop bonus, quick_learner comprehension speed, daoxin_stable breakthrough protection) produce observable gameplay effects
  4. Fate tags have new effect dimensions (cultivation speed modifier, event aggression, rank-loss protection) that activate in their respective subsystems
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6
Note: Phases 3, 4, and 5 all depend on Phase 2 but are independent of each other. Phase 5 additionally depends only on Phase 1. Phase 6 depends on 3, 4, and 5. Execution order is sequential as listed.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 1/2 | In progress | - |
| 2. Character Identity | 0/? | Not started | - |
| 3. Skill Loadout | 0/? | Not started | - |
| 4. Pet & Refinement Integration | 0/? | Not started | - |
| 5. Technique Comprehension | 0/? | Not started | - |
| 6. Content Depth | 0/? | Not started | - |
