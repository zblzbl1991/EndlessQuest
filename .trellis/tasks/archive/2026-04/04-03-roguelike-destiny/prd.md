# Roguelike Destiny System - Automated Destiny & Sect Policy

## Overview

Implement the automated destiny roguelike system as described in:
- `docs/superpowers/specs/2026-04-03-roguelike-destiny-automation-design.md`
- `docs/superpowers/specs/2026-04-03-roguelike-destiny-rules-and-mapping.md`

This is a phased implementation. First version boundaries:
1. Map 7 policies to existing 3 auto-run executors
2. Only core disciples get full destiny timeline, others get simplified
3. Dark current only affects recruit & dungeon event pool

## Phase 1: Types & Data Foundation

### New Files
- `src/types/destiny.ts` — All destiny-related types (SectRiskPolicyId, DestinyAmplifierId, DestinySeedId, DestinyStage, DestinyRiskLevel, DestinyState, SectDarkCurrent, SectStrategySettings, SectRiskPolicyProfile, DestinyAmplifierProfile, RecruitCandidateProfile, AutoCultivationProfile, RunExecutorBias)
- `src/data/sectRiskPolicies.ts` — 7-tier policy profiles (敛锋/守衡/审机/逐隙/压魄/逆劫/焚命) with all parameters from rules doc Section 4.2
- `src/data/destinyAmplifiers.ts` — 5 amplifier profiles (引机/近劫/藏魔/续脉/折运) from rules doc Section 5.2
- `src/data/destinySeeds.ts` — 7 seed definitions (机缘苗/劫火苗/心渊苗/护命苗/夺运苗/残照苗/异相苗) with rarity, risk, style mapping from rules doc Section 8

### Extended Files
- `src/types/character.ts` — Add `destinyState?: DestinyState`, `seedRarity?: 1|2|3|4|5` to Character interface
- `src/types/sect.ts` — Add `strategySettings: SectStrategySettings`, `darkCurrent: SectDarkCurrent` to Sect interface
- `src/types/adventure.ts` — Add `policySnapshot`, `amplifierSnapshot`, `destinyChanges` to relevant types
- `src/types/index.ts` — Re-export from destiny.ts
- `src/stores/sectStore/initial.ts` — Add default values for new sect fields
- `src/stores/sectStore/types.ts` — Add new store fields

### Acceptance Criteria
- [ ] All types compile without errors (`npx tsc --noEmit`)
- [ ] All data tables export correct profiles matching rules doc values
- [ ] Default/initial values provided for all new sect fields
- [ ] Backward compatibility: existing saves load without errors (new fields have defaults)

## Phase 2: Core Game Systems

### New Files
- `src/systems/destiny/DestinySystem.ts` — Seed progression (exposure accumulation), stage advancement, risk level calculation, formation & mutation resolution, shock handling, heaven's mark triggering
- `src/systems/destiny/DarkCurrentSystem.ts` — Dark current growth after runs, daily decay, shift calculation, resonance calculation for tianming
- `src/systems/sect/CoreDiscipleSystem.ts` — Core score formula (rules doc Section 7.2), core count per policy, ranking & identification
- `src/systems/sect/AutoRecruitSystem.ts` — Candidate scoring (rules doc Section 6.2), admission thresholds, replacement logic, rare seed priority
- `src/systems/sect/AutoCultivationSystem.ts` — Cultivation profile per policy+seed, stat weights, path bias
- `src/systems/sect/AutoEquipSystem.ts` — Equip fit scoring (rules doc Section 9.1), priority ordering by policy

### Key Formulas (from rules doc)
- Destiny exposure thresholds: seed(0-39), stirring(40-89), formed(90-159), mutated(160-239), tianming candidate(240+)
- Risk level thresholds: safe(0-24), drifting(25-59), danger(60-109), calamity(110+)
- Core score: dispositionAdventure*0.3 + dispositionRisk*0.2 + seedRarity*0.8 + stageScore + amplifierMatch + gear*0.15 + survivalHistory + policyCoreBonus
- Tianming base chance: 0.0015 * policyMultiplier * seedRarityFactor * darkCurrentResonance
- Shock: abs(nextIdx - prevIdx) * 12, triggers when gap >= 2

### Acceptance Criteria
- [ ] DestinySystem correctly calculates exposure gains per event type
- [ ] Stage advancement follows threshold table exactly
- [ ] Risk level updates match instability rules
- [ ] DarkCurrentSystem growth/decay follows formulas
- [ ] CoreDiscipleSystem identifies correct number of cores per policy
- [ ] AutoRecruitSystem scoring matches formula, thresholds work
- [ ] All systems are pure functions (no store mutation)
- [ ] All new files have corresponding unit tests

## Phase 3: Store Integration

### New Files
- `src/stores/sectStore/strategySlice.ts` — Actions: setPolicy, setAmplifiers, switchPolicy (with shock calculation)
- `src/stores/sectStore/destinySlice.ts` — Actions: updateDestinyState, advanceExposure, resolveStageTransition, applyShock, checkTianming

### Extended Files
- `src/stores/sectStore/types.ts` — Add new fields to SectStore interface
- `src/stores/sectStore/index.ts` — Compose new slices
- `src/stores/sectStore/tickSlice.ts` — Integrate destiny tick (exposure changes per tick based on policy)
- `src/systems/sect/SectAutomationSystem.ts` — Use policy profile to generate auto-run config instead of current casualtyTolerance/preferredDungeon

### Acceptance Criteria
- [ ] Store compiles and initializes with default values
- [ ] Policy switch triggers shock calculation for core disciples
- [ ] Tick updates destiny exposure for active disciples
- [ ] Auto-run uses policy-driven config
- [ ] Existing tests still pass

## Phase 4: UI Changes

### Modified Files
- `src/pages/SectPage.tsx` — Restructure: keep resources, add policy settings, add amplifier tags, add sect risk overview, remove 要务 and 战报
- `src/pages/CharactersPage.tsx` — Adjust list priority: show risk level & stage first, show destiny info on cards, add destiny detail section
- `src/pages/BuildingsPage.tsx` — Minor adjustments if needed for policy context
- Component files for policy selector, amplifier picker, destiny card overlays

### Acceptance Criteria
- [ ] SectPage shows policy setting UI with 7 options
- [ ] SectPage shows amplifier tag selection (2-3 tags)
- [ ] Character list shows risk level and destiny stage prominently
- [ ] Character detail shows destiny overview section
- [ ] UI follows ink-wash design system (清墨轻岚)
- [ ] Mobile-first responsive layout maintained

## Implementation Order

Phase 1 → Phase 2 → Phase 3 → Phase 4 (sequential dependencies)

Phase 2 can be partially parallelized:
- DestinySystem + DarkCurrentSystem (independent)
- CoreDiscipleSystem + AutoRecruitSystem + AutoCultivationSystem + AutoEquipSystem (independent from destiny)

## Technical Constraints

- Pure function systems (no direct store mutation in systems/)
- New Character fields must be optional with defaults (save compatibility)
- All numeric values use first-round tunable parameters from rules doc
- Follow existing code patterns: camelCase, no semicolons, single quotes
- CSS Modules with theme.css variables
