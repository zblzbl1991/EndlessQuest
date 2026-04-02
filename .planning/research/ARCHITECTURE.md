# Architecture Patterns: Character Progression Integration

**Domain:** Idle Roguelike Game -- Character Progression Systems
**Researched:** 2026-04-02
**Overall confidence:** HIGH (based on direct codebase analysis)

## Recommended Architecture

The progression systems should layer into the existing architecture following the established pure-function/systems pattern. No new stores, no architectural paradigm shifts. The key principle: **progression logic lives in `src/systems/` as stateless functions; `SectStore` slices call those functions and apply results.**

### Component Diagram

```
+------------------+       +-------------------+       +------------------+
|   Presentation   |<----->|   Zustand Stores  |<----->|  Game Systems    |
| (Pages/Components|       | (SectStore with   |       | (Pure Functions) |
|  read state,     |       |  13 slices,       |       |                  |
|  call actions)   |       |  AdventureStore,  |       | cultivation/     |
+------------------+       |  GameStore,        |       | equipment/       |
                           |  EventLogStore)    |       | skill/           |
                           +-------------------+       | character/       |
                                   |                   | technique/       |
                                   v                   | combat/          |
                           +-------------------+       | pet/             |
                           |  Data Tables      |       +------------------+
                           | (src/data/)       |               ^
                           | realms, items,    |               |
                           | techniques,       +---------------+
                           | cultivationPaths) |
                           +-------------------+
```

### New Components to Add

The progression milestone adds **4 new system modules** and **2 new data files**. No new stores.

| Component | Location | Responsibility | Pattern |
|-----------|----------|---------------|---------|
| `TitleSystem` | `src/systems/character/TitleSystem.ts` | Title promotion check + stat bonus calculation | Pure function: takes Character, returns promotion result |
| `SetBonusSystem` | `src/systems/equipment/SetBonusSystem.ts` | Detect active set bonuses from equipped gear | Pure function: takes gear IDs + lookup fn, returns active bonuses |
| `MechanicalTalentSystem` | `src/systems/character/MechanicalTalentSystem.ts` | Query interface for mechanism-type talents | Pure function: `hasMechanic(char, id)`, `getMechanicParam(char, id, param)` |
| `TechniqueComprehensionSystem` | `src/systems/technique/TechniqueComprehensionSystem.ts` | Comprehension progress, skill unlock at milestones | Pure function: tick comprehension, check thresholds |
| `cultivationPaths.ts` (extend) | `src/data/cultivationPaths.ts` | Add element affinity mapping, path-specific skill unlock table | Static data |
| `sets.ts` (new) | `src/data/sets.ts` | Set definitions, slot mappings, bonus effects | Static data |

### Component Boundaries

| Component | Owns | Reads From | Writes To (via Store) |
|-----------|------|-----------|----------------------|
| **TitleSystem** | Title promotion rules, stat bonus table | Character.realm, Character.title | characterSlice (title field) |
| **CultivationPathSystem** (existing) | Path choice logic, stat modifiers | Character.cultivationPath | characterSlice (cultivationPath field) |
| **SetBonusSystem** | Set detection, bonus application | Character.equippedGear, Equipment.setId | Read-only; bonuses applied in calcCharacterTotalStats |
| **MechanicalTalentSystem** | Talent mechanic query interface | Character.talents | Read-only; results consumed by other systems |
| **TechniqueComprehensionSystem** | Comprehension progress rules | Character.techniqueComprehension, fateTags, cultivationPath | tickSlice (comprehension field) |
| **Element Affinity** (inside CultivationPathSystem) | Element lookup from path | Character.cultivationPath | Read-only; results consumed by CombatEngine |

### Data Flow

```
1. GAME TICK FLOW (every 1 second):
   tickSlice.tickAll()
     |
     +-> cultivationTick(char, ...)            [existing, unchanged]
     |
     +-> canBreakthrough(char)                 [existing, unchanged]
     |
     +-> performBreakthrough(char, failureRate) [existing, MODIFIED]
     |     |
     |     +-> calcStatGrowth()                [MODIFIED: apply path multipliers]
     |     |
     |     +-> checkTitlePromotion(char)       [NEW: auto-promote title]
     |
     +-> tryComprehendOnBreakthrough(...)      [MODIFIED: add comprehension delta, not binary]
     |     |
     |     +-> TechniqueComprehensionSystem    [NEW: increment comprehension, check skill unlocks]
     |
     +-> tickRecoveryDays(...)                 [existing, unchanged]
     |
     +-> syncCharacterSkillLoadout(char)       [existing, unchanged]

2. TOTAL STATS CALCULATION FLOW (on demand):
   calcCharacterTotalStats(char, techniques, getEquipmentById)
     |
     +-> Start with baseStats
     +-> Add equipment stats (getEffectiveStats with refinementStats)
     +-> Add technique bonuses (scaled by comprehension%)     [MODIFIED]
     +-> Apply path stat bonuses (applyPathStatBonuses)       [existing]
     +-> Apply title bonuses                                   [NEW]
     +-> Apply set bonuses                                     [NEW]
     +-> Apply fate tag crit modifiers                         [NEW]

3. COMBAT UNIT ASSEMBLY FLOW (on adventure start):
   createCharacterCombatUnit(char)
     |
     +-> calcCharacterTotalStats(...)                         [includes all new bonuses]
     +-> Set element from path affinity                       [MODIFIED]
     +-> Attach equipped skills                               [existing]
     |
     +-> For each team member's pet:
           getPetCombatUnit(pet)                              [existing]
           +-> Apply beast path bonus if owner is 'beast'     [NEW]

4. BREAKTHROUGH FLOW (inside tick):
   canBreakthrough(char)
     |
     +-> Check cultivation needed
     +-> Check resource costs
     +-> Check not at max realm
     |
   performBreakthrough(char, failureRate)
     |
     +-> Roll success/fail
     +-> calcStatGrowth(oldStats, isMajor)                    [MODIFIED: path multipliers]
     +-> Return BreakthroughResult
     |
   Post-breakthrough:
     +-> resolveSuccessfulBreakthroughFates(...)              [existing]
     +-> checkTitlePromotion(char)                            [NEW: auto-promote]
     +-> tryComprehendOnBreakthrough(...)                     [MODIFIED: comprehension delta]
     +-> checkPathSkillUnlock(char)                           [NEW: unlock path skills at realm thresholds]

5. SAVE MIGRATION FLOW (on load):
   loadGame()
     |
     +-> Read IndexedDB stores
     +-> For each character:
           +-> techniqueComprehension ?? {}                   [NEW field]
           +-> learnedSkills ?? []                            [NEW field]
           +-> equippedSkills length fix ([] -> [null x 4])   [migration]
           +-> cultivationPath migration (realm>=1 -> 'sword') [existing]
```

## Patterns to Follow

### Pattern 1: Pure-Function System with Store Application

**What:** All game logic lives in `src/systems/` as exported functions that take data in and return results. Stores call these functions and apply mutations via Zustand `set()`.

**When:** Every new progression feature follows this pattern.

**Example:**
```typescript
// src/systems/character/TitleSystem.ts
export function checkTitlePromotion(character: Pick<Character, 'title' | 'realm'>): {
  promoted: boolean
  newTitle?: CharacterTitle
} {
  if (character.title === 'disciple' && character.realm >= 2)
    return { promoted: true, newTitle: 'seniorDisciple' }
  if (character.title === 'seniorDisciple' && character.realm >= 3)
    return { promoted: true, newTitle: 'master' }
  if (character.title === 'master' && character.realm >= 4)
    return { promoted: true, newTitle: 'elder' }
  return { promoted: false }
}

// Applied in tickSlice.ts after breakthrough:
const titleResult = checkTitlePromotion(updatedChar)
if (titleResult.promoted) {
  updatedChar = { ...updatedChar, title: titleResult.newTitle! }
}
```

### Pattern 2: Central Stat Aggregation via calcCharacterTotalStats

**What:** A single function (`CharacterEngine.calcCharacterTotalStats`) computes the final stats for a character by layering all bonus sources. Every new progression bonus plugs into this function.

**When:** Any feature that adds stat modifiers (titles, set bonuses, comprehension-scaled technique bonuses, fate tag crit).

**Example:**
```typescript
// Modified calcCharacterTotalStats pipeline:
// 1. baseStats
// 2. + equipment stats (getEffectiveStats)
// 3. + technique bonuses (scaled by comprehension 0-100%)
// 4. * path stat bonuses (applyPathStatBonuses)
// 5. * title bonus multiplier (NEW)
// 6. + set bonus flat stats (NEW)
// 7. + fate tag crit modifier (NEW)
```

### Pattern 3: Data-Table-Driven Definitions

**What:** Static game configuration lives in `src/data/` as typed constant objects. Systems reference these tables rather than hardcoding values.

**When:** Defining set bonuses, path-to-element mappings, title-to-stat mappings, mechanical talent definitions.

**Example:**
```typescript
// src/data/sets.ts
export const SET_DEFINITIONS: Record<string, SetDef> = {
  thunder_set: {
    id: 'thunder_set',
    name: '雷鸣套装',
    slots: ['weapon', 'accessory1', 'talisman', 'head'],
    element: 'lightning',
    twoPieceBonus: { type: 'statBoost', stat: 'atk', value: 0.15 },
    fourPieceBonus: { type: 'elementBoost', element: 'lightning', value: 0.25 },
  },
  // ...
}
```

### Pattern 4: Save Migration via Field Defaults

**What:** New Character fields use `??` fallback during load, not version-gated migrations. This avoids modifying `db.ts` upgrade transactions.

**When:** Adding `techniqueComprehension`, `learnedSkills` fields.

**Example:**
```typescript
// In SaveSystem.loadGame(), character deserialization:
const char = loadedCharacter // from IndexedDB
return {
  ...char,
  techniqueComprehension: char.techniqueComprehension ?? {},
  learnedSkills: char.learnedSkills ?? [],
  equippedSkills: char.equippedSkills?.length === 4
    ? char.equippedSkills
    : [null, null, null, null],
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Cross-Store Calls in System Functions

**What:** System functions calling `useSectStore.getState()` directly.

**Why bad:** The codebase already has 120 cross-store accesses (per CONCERNS.md). Adding more in new system functions would deepen coupling and make testing harder.

**Instead:** Pass all needed data as function parameters. Systems should never import stores. Only slices (which are inside the store) should call `getState()`.

### Anti-Pattern 2: Mutating Character In-Place in Systems

**What:** System functions that modify a `Character` object directly instead of returning a result.

**Why bad:** Breaks the pure-function contract. Makes reasoning about state changes impossible. The current codebase consistently spreads to create new objects.

**Instead:** Return new objects or result records. Let the slice apply the spread:
```typescript
// WRONG
function applyTitleBonus(character: Character): void {
  character.baseStats.hp *= 1.05
}

// RIGHT
function calcTitleBonus(title: CharacterTitle): { hpMult: number; atkMult: number } {
  return TITLE_BONUSES[title] // e.g. { hpMult: 1.05, atkMult: 1.05 }
}
```

### Anti-Pattern 3: Expanding tickSlice Further

**What:** Adding new progression logic directly into the `tickAll` function body.

**Why bad:** `tickSlice.ts` is already 542 lines. Adding title checks, comprehension ticking, and skill unlock logic inside `tickAll` would push it past 700 lines.

**Instead:** Extract helper functions that `tickAll` calls with clear inputs and outputs:
```typescript
// In tickSlice, after breakthrough success:
updatedChar = applyPostBreakthroughProgression(updatedChar, get().sect)

// In a new src/systems/character/ProgressionCoordinator.ts:
export function applyPostBreakthroughProgression(
  char: Character,
  sect: Pick<Sect, 'techniqueCodex'>
): Character {
  let result = char
  const titleResult = checkTitlePromotion(result)
  if (titleResult.promoted) result = { ...result, title: titleResult.newTitle! }
  // ... technique comprehension, skill unlocks
  return result
}
```

### Anti-Pattern 4: Adding a New Store for Progression State

**What:** Creating a `ProgressionStore` or `CharacterProgressionStore` to hold new state.

**Why bad:** The sect-centric model puts all game state in `SectStore`. Characters are owned by the Sect aggregate. Splitting character progression state to a separate store creates cross-store dependencies (progression needs character data, characters need progression data) and breaks the write-through save pattern.

**Instead:** All new fields belong on the `Character` interface and are persisted as part of the `characters` IndexedDB store. All new actions belong in existing slices (primarily `characterSlice` and `tickSlice`).

## Integration Points Map

Where each new system touches existing code:

### Files to MODIFY (existing)

| File | Change | Risk | Why |
|------|--------|------|-----|
| `src/types/character.ts` | Add `learnedSkills`, `techniqueComprehension` fields | Low | Type additions only, backward compatible |
| `src/types/talent.ts` | Add `MechanicalTalentEffect` type | Low | New type, existing types unchanged |
| `src/systems/character/CharacterEngine.ts` | Modify `calcCharacterTotalStats()` pipeline, modify `generateCharacter()` for initial skills | Medium | Central stat function -- any bug here affects all display |
| `src/systems/cultivation/CultivationEngine.ts` | Apply path multipliers in `calcStatGrowth()` | Medium | Affects breakthrough outcome balance |
| `src/systems/technique/TechniqueSystem.ts` | Modify `tryComprehendOnBreakthrough()` to return comprehension delta | Medium | Changes breakthrough side-effect semantics |
| `src/systems/pet/PetSystem.ts` | Apply beast path bonus in `getPetCombatUnit()` | Low | Isolated to pet combat |
| `src/systems/combat/CombatEngine.ts` | Apply element affinity bonus, check mechanical talents | Medium | Combat is already complex; changes must be additive only |
| `src/systems/save/SaveSystem.ts` | Field migration defaults for new character fields | Low | Well-established pattern in codebase |
| `src/stores/sectStore/tickSlice.ts` | Call new progression helpers after breakthrough | High | Already 542 lines; must be extracted not expanded |
| `src/stores/sectStore/characterSlice.ts` | New actions: `equipSkill`, `unequipSkill`, `refineItem` | Low | Standard slice extension pattern |
| `src/stores/adventureStore.ts` | Add pet to combat team, apply element affinity | Medium | Already 1338 lines and tightly coupled |
| `src/data/cultivationPaths.ts` | Add element affinity mapping, path-specific skill unlock table | Low | Data-only change |
| `src/data/fateTags.ts` | Add `effects` field to FateTagDef | Low | Data extension, existing code reads old fields |
| `src/data/talents.ts` | Add 10 new talents | Low | Data-only, existing roll logic handles new entries |
| `src/data/activeSkills.ts` | Add path-specific skills | Low | Data-only |

### Files to CREATE (new)

| File | Content | Depends On |
|------|---------|-----------|
| `src/systems/character/TitleSystem.ts` | `checkTitlePromotion()`, `calcTitleBonus()` | `types/character.ts`, `data/titles.ts` (or inline table) |
| `src/systems/equipment/SetBonusSystem.ts` | `calcActiveSetBonuses()` | `types/item.ts`, `data/sets.ts` |
| `src/systems/character/MechanicalTalentSystem.ts` | `hasMechanic()`, `getMechanicParam()` | `types/character.ts`, `types/talent.ts` |
| `src/systems/technique/TechniqueComprehensionSystem.ts` | `tickComprehension()`, `checkSkillUnlocks()` | `types/character.ts`, `data/techniquesTable.ts` |
| `src/data/sets.ts` | Set definitions (4 sets) | `types/item.ts` |

## Scalability Considerations

| Concern | At 5 characters | At 30 characters (current max) | At 50+ characters (future) |
|---------|-----------------|-------------------------------|---------------------------|
| Tick loop (cultivation + breakthrough + progression) | <1ms | ~5-10ms (estimate) | Might exceed 16ms frame budget |
| calcCharacterTotalStats calls per render | 1-2 | 5-10 (page dependent) | Consider memoization |
| Set bonus detection per combat unit | Negligible | Negligible | Negligible (max 9 gear slots) |
| Technique comprehension per tick | Negligible | Negligible (flat per-character cost) | Negligible |
| Save file size increase (new fields) | ~1KB | ~3-5KB | ~5-8KB |

The progression systems are computationally lightweight. The only scaling concern is `tickSlice` overall, not the new progression additions specifically.

## Build Order (Dependency Chain)

The progression systems have clear dependencies. This order ensures each phase can be built and tested independently.

```
Phase 1: Foundation (no combat engine changes)
  [1a] SpecialtySystem integration  (1-line fix in generateCharacter)
       Dependencies: NONE
       Tests: CharacterEngine unit tests

  [1b] TitleSystem
       Dependencies: NONE (pure data lookup)
       Tests: TitleSystem unit tests

  [1c] MechanicalTalentSystem query interface
       Dependencies: types/talent.ts update
       Tests: MechanicalTalentSystem unit tests

Phase 2: Core Differentiation (cultivation path deepening)
  [2a] Element affinity mapping in cultivationPaths.ts
       Dependencies: Phase 1
       Tests: data lookup tests

  [2b] calcCharacterTotalStats pipeline extension
       Dependencies: Phase 1b (title bonus), Phase 1c (talent query)
       Tests: CharacterEngine.calcCharacterTotalStats tests

  [2c] Technique comprehension system
       Dependencies: Phase 1c (quick_learner mechanic check)
       Tests: TechniqueComprehensionSystem unit tests

Phase 3: Activation (plug existing-but-dormant systems)
  [3a] Skill acquisition flow + initial skill assignment
       Dependencies: Phase 2a (element affinity for initial skill)
       Tests: CharacterEngine.generateCharacter, skill equipment tests

  [3b] Pet combat integration (in adventureStore)
       Dependencies: Phase 2a (beast path bonus)
       Tests: adventureStore integration tests

  [3c] Refinement UI integration
       Dependencies: NONE (EquipmentEngine.refineEquipment already exists)
       Tests: UI tests

Phase 4: Content Expansion
  [4a] Set bonus system
       Dependencies: Phase 2b (calcCharacterTotalStats pipeline)
       Tests: SetBonusSystem unit tests

  [4b] Fate tag effects expansion
       Dependencies: Phase 1c (mechanical talent pattern)
       Tests: fate tag integration tests

  [4c] New talents (10 additions)
       Dependencies: Phase 1c (MechanicalTalentEffect type)
       Tests: talent roll distribution tests

Phase 5: Combat Engine Extension (optional)
  [5a] AoE skill support in CombatEngine
       Dependencies: Phase 3a (skills equipped and available)
       Tests: CombatEngine tests

  [5b] Counter/freeze mechanics (set bonuses, talents)
       Dependencies: Phase 4a (set bonuses), Phase 4c (talents)
       Tests: CombatEngine tests
```

## Key Architecture Decisions

### Decision 1: No New Stores

The progression data belongs on `Character` fields because:
- Characters are part of the `Sect` aggregate, which is the unit of persistence
- All existing progression data (cultivation, techniques, equipment, talents) already lives on Character
- The write-through auto-save pattern relies on `sect` reference changes -- splitting state breaks this

### Decision 2: TickSlice Extraction Over Expansion

The `tickAll` function at 542 lines is already at the limit. New progression logic must be extracted into helper functions that `tickAll` calls, not inlined. Specifically:
- Post-breakthrough progression (title check, comprehension, skill unlock) should be a single helper function
- The helper should take a Character and return a new Character, following the pure-function pattern
- `tickAll` calls the helper and uses the returned value

### Decision 3: Comprehension as a Parallel Field, Not a Replacement

The design adds `techniqueComprehension: Record<string, number>` alongside the existing `learnedTechniques: string[]`. This avoids breaking the many call sites that iterate `learnedTechniques` for stat calculation. The comprehension field is checked during bonus application but does not replace the membership check.

### Decision 4: Mechanical Talents via Query Interface, Not Event System

Mechanical talents (like "breakthrough failure preserves 50% cultivation") are checked at specific decision points via `hasMechanic(character, mechanicId)`. This is simpler than an event/callback system and matches the existing pattern where `fateTags` are checked at specific points.

### Decision 5: Set Bonuses as Stat Layer, Not Combat Mechanic

Phase 4 set bonuses that are purely stat-based (atk +15%, hp +20%) plug into `calcCharacterTotalStats`. Only the mechanism-type bonuses (freeze chance, spirit restore) require CombatEngine changes, and those are deferred to Phase 5.

## Sources

- Direct codebase analysis of `src/systems/`, `src/stores/`, `src/types/`, `src/data/` (HIGH confidence)
- `docs/superpowers/specs/2026-03-29-character-progression-design.md` -- progression design spec (HIGH confidence)
- `.planning/codebase/ARCHITECTURE.md` -- existing architecture documentation (HIGH confidence)
- `.planning/codebase/CONCERNS.md` -- known technical debt and fragile areas (HIGH confidence)
