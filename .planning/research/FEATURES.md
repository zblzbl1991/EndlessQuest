# Feature Landscape

**Domain:** Xianxia Idle Roguelike Web Game -- Character Progression Depth (P2)
**Researched:** 2026-04-02
**Confidence:** HIGH (based on codebase analysis, existing P2 design spec, and domain knowledge of xianxia cultivation games and roguelike progression design)

---

## Analysis Context

EndlessQuest already has a complete core loop: sect management, disciple lifecycle, cultivation/breakthrough with tribulation, roguelike dungeon runs with run-level builds (blessings/relics), equipment with enhancement, techniques, buildings, pets, and shop. The P2 milestone adds character progression depth. The codebase already contains data structures and partial implementations for many progression systems that were never wired into gameplay.

This feature landscape is informed by:
- Direct analysis of 14 system files and 12 data files in the existing codebase
- The existing P2 design spec (`docs/superpowers/specs/2026-03-29-character-progression-design.md`)
- Domain knowledge of xianxia cultivation idle games (Swords of Legends, Tale of Immortal, cultivation idle mobile games) and roguelike progression systems (Slay the Spire, Dead Cells, Hades)
- The project's own design principles (sparse UI, sect-first identity, idle-friendly, ink-wash aesthetic)

---

## Table Stakes

Features players expect in any xianxia idle game or roguelike with character progression. Missing these makes the game feel shallow compared to genre peers.

| Feature | Why Expected | Complexity | Current State | Notes |
|---------|--------------|------------|---------------|-------|
| **Cultivation Path choice** | Every cultivation game lets characters specialize (sword/body/alchemy/etc). Without paths, all characters feel identical. | Medium | `cultivationPaths.ts` defines 6 paths with bonuses; `CultivationPathSystem.ts` has stat application logic. But `rollCultivationPath()` is random, not player-chosen. Path choice at breakthrough is in P2 spec but not yet implemented as a player decision. | The existing code randomly assigns paths by quality probability. P2 needs to change this to a player choice at breakthrough. 6 paths (sword, body, alchemy, beast, formation, void) is a strong set -- matches genre expectations of 4-6 paths. |
| **Skill loadout for combat** | Any game with combat expects characters to use skills. Currently characters only auto-attack because `equippedSkills` is always empty. | Medium | `activeSkills.ts` has 8 skills and `buildCharacterSkillLoadout()` auto-picks skills based on path/style. But no manual skill acquisition flow exists. | The auto-loadout system is a good idle-game pattern. The P2 spec's approach of path-gating + technique-gating skill acquisition is sound. Manual skill equip UI is table stakes for players who want to customize. |
| **Element affinity system** | Xianxia games universally have five-element (wuxing) or three-element systems. Element counters affect combat outcomes. | Low | `skills.ts` has full counter map (fire>ice>lightning>fire). Combat engine uses `getElementMultiplier()`. Elements exist on skills and techniques. | Element counters are already functional. What is missing: character-level element affinity that amplifies matching-element skills. This is a simple multiplier check at the existing `getElementMultiplier()` call site. |
| **Technique progression (not binary)** | Players expect techniques to grow over time, not be learned instantly at full power. A 0-100% comprehension scale is genre-standard. | Medium | `techniquesTable.ts` has 12 techniques with `requirements.minComprehension` field already. `TechniqueSystem.tryComprehendOnBreakthrough()` triggers on breakthrough but applies techniques as all-or-nothing. | The existing `minComprehension` requirement field was clearly designed for a future comprehension system. Migration is straightforward: old saves get 100% comprehension for known techniques. |
| **Equipment enhancement visible impact** | Players need to see their equipment getting stronger. Enhancement levels already exist but refinement stats are never populated. | Low | `EquipmentEngine.refineEquipment()` fully implemented, returns a new random stat. `getEffectiveStats()` already sums `refinementStats`. Just needs UI wiring. | This is the lowest-effort, highest-visibility feature in the entire P2 milestone. The backend is done. |

## Differentiators

Features that set EndlessQuest apart from typical xianxia idle games. These leverage the game's unique position at the intersection of idle cultivation and roguelike strategy.

| Feature | Value Proposition | Complexity | Current State | Notes |
|---------|-------------------|------------|---------------|-------|
| **Pet combat integration with path synergy** | Most idle games treat pets as stat sticks. Having pets as independent combat units with path-specific bonuses (beast path) creates a genuinely different playstyle. The "summoner" archetype is rare in cultivation games. | Medium | `PetSystem.getPetCombatUnit()` is fully implemented. Combat engine accepts any CombatUnit. Just needs wiring into adventure team assembly. Beast path already has `petPower` bonus defined. | This is a strong differentiator because it makes the beast path feel fundamentally different (two units per character) rather than just different stat multipliers. |
| **Mechanical talents (not just stat boosts)** | Most cultivation games have talents that are pure numbers. Talents that change mechanics (phoenix blood revive, fortune star drop rate, dao heart preserve cultivation on failure) create memorable characters and emergent stories. | High | 12 talents exist, all stat-only. P2 spec proposes 10 new talents including mechanical ones. But mechanical talents need integration into every relevant system (combat, cultivation, technique, loot). | High complexity because each mechanical talent is a separate integration point. Start with 3-4 mechanical talents, not all 10. Prioritize: phoenix_blood, fortune_star, daoxin_stable, quick_learner. |
| **Fate tags with multi-dimensional effects** | Current fate tags only affect breakthrough failure rate. Expanding to affect cultivation speed, event aggression, comprehension speed, and realm-drop prevention creates characters with genuine personality. | Medium | `FateTagModifiers` already has `cultivationRate`, `breakthroughInsightChance`, and tribulation modifier fields. The P2 spec adds combat crit, rest recovery, and realm-drop effects. | The infrastructure is already rich. The new dimension is adding `preventRealmDrop` and `eventAggression` which need new fields in the type. Moderate lift, high flavor payoff. |
| **Title promotion as auto-progression milestone** | Manual title systems are common. An automatic title system tied to realm milestones creates satisfying progression moments without player micromanagement -- matching the idle game philosophy. | Low | `CharacterTitle` type exists with 4 levels. `generateCharacter()` hardcodes `disciple`. Promotion logic is trivial (realm check). | Very low effort, high satisfaction. Should be implemented early as a "quick win" alongside specialty integration. |
| **Set bonuses with theme-tied dungeon drops** | Set bonuses that only drop from specific dungeons create targeted farming motivation. In a roguelike context, this means players choose dungeons not just for difficulty but for desired set pieces. | Medium | `Equipment.setId` field exists but always null. No set definitions. Need new `data/sets.ts` file and drop logic integration into `ItemGenerator`. | The P2 spec's approach of 4 elemental sets (thunder/frost/flame/jade) tied to themed dungeons is good. The 2-piece and 4-piece thresholds are genre-standard. Avoid more granular set piece counts. |
| **Cultivation path exclusive skills (ultimates)** | Path-specific ultimate skills at high realm create long-term build goals. A sword player working toward "Heavenly Sword - Limitless" at realm 4 gives meaning to the path choice. | High | `activeSkills.ts` has 8 generic skills. Path-specific skills would be new entries. The P2 spec defines 10 path skills (2 per path). The complexity is in the combat engine: AoE skills, freeze mechanics, reflect damage, and revive require combat engine extensions. | This is the single highest-complexity feature because it requires extending `CombatEngine.simulateCombat()` beyond single-target attacks. Recommend splitting: Phase 1 = stat-based path skills only, Phase 2 = mechanical path skills (AoE, freeze, reflect, revive). |
| **Comprehension-driven technique mastery with skill unlocks** | Techniques that grant active skills at 50% and 100% comprehension create a dual progression track: passive stat bonuses grow linearly, while skill unlocks create milestone moments. | Medium | Techniques have bonuses and requirements. The comprehension system itself is medium complexity. Tying technique milestones to skill unlocks requires coordination between TechniqueSystem and skill acquisition logic. | This creates a satisfying "ding" moment when a technique hits 50%/100% and unlocks a new skill. Worth the coordination cost. |

## Anti-Features

Features to explicitly NOT build. These are traps that cultivation games fall into that would undermine EndlessQuest's design principles.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Gacha-style cultivation path rerolling** | Allowing players to re-roll or switch cultivation paths destroys the weight of the choice. If paths are reversible, the "irreversible choice" design principle collapses and players will min-max by switching paths per dungeon. | One-time choice at realm 1 breakthrough. Period. If the player is offline during breakthrough, default to sword (most generic path). No respec, no path change items, no premium currency to switch. |
| **Complex skill tree with branching nodes** | A traditional skill tree (Diablo/WoW style) with dozens of nodes and branch choices is antithetical to idle game design. Players should not need to study a wiki to allocate 30+ skill points. | Fixed skill loadout slots (4-5 slots). Skills come from path unlocks, technique milestones, and adventure events. Players choose WHICH skills to equip, not how to build a tree. The `buildCharacterSkillLoadout()` auto-system handles idle players. |
| **Element affinity as a separate choosable stat** | Some games let players pick or reroll their element affinity independently from class/path. This adds UI complexity and dilutes the path identity. If element is decoupled from path, paths lose thematic coherence. | Element affinity derived from cultivation path via lookup table (as already designed in P2 spec). Sword = lightning. Spell = fire/ice. Body = neutral. No separate element selection UI. |
| **Pet breeding / fusion systems** | Pet breeding/fusion systems add enormous complexity (inheritance rules, stat prediction UI, generation tracking) and tend to dominate development attention away from core progression. | Keep pets as individual units that can be fed, leveled, and equipped with skills. The beast path makes pets stronger. No breeding, no fusion, no inheritance. |
| **Refinement with failure/risk of item destruction** | Enhancement/refinement systems where items can break on failure create anxiety and savescumming in single-player games. This is a mobile-gacha monetization pattern (pay to protect). | Refinement always succeeds but has a cap based on quality. Rerolling refinement costs resources but never destroys the item. The existing `refineEquipment()` already follows this pattern. |
| **Daily/weekly progression gating** | "You can only attempt 3 breakthroughs per day" or "technique comprehension capped at 10 per day" systems force daily login without adding strategic depth. This contradicts the idle game philosophy of "progress while away." | No daily caps. Progression is resource-gated (spirit stones, ores, herbs) and time-gated through idle ticks, not artificial daily limits. |
| **Power score / combat rating number** | A single aggregated "power score" for each character reduces rich build decisions to "higher number = better." It discourages creative builds and makes the game feel like a spreadsheet. | Show individual stats clearly. Show path-specific highlights. Show role recommendations. But never aggregate into a single power number that players optimize against. |
| **Talent rerolling** | If talents can be rerolled, they lose their identity as defining character personality. Players will reroll until they get the "optimal" mechanical talent for each path, eliminating build diversity. | Talents are rolled at character creation and permanent. Mechanical talents can create sub-optimal but interesting combinations. This is a feature, not a bug. |

---

## Feature Dependencies

```
Cultivation Path Choice
  |---> Element Affinity (derived from path, no separate work)
  |---> Path Stat Bonuses (already implemented in CultivationPathSystem)
  |---> Path Exclusive Skills (requires combat engine extension for AoE/freeze/reflect)
  |        |---> Skill Loadout System (need acquisition + equip flow)
  |
Technique Comprehension (0-100%)
  |---> Technique Skill Unlocks at 50%/100% milestones
  |        |---> Skill Loadout System
  |
Technique Comprehension
  |---> Element Synergy bonus (technique element matches path affinity)
  |
Pet Combat Integration
  |---> depends on: Adventure team assembly code modification
  |---> enhanced by: Beast Path (pet stat bonuses)
  |---> enhanced by: beast_whisper mechanical talent
  |
Title Promotion
  |---> depends on: nothing (auto-check on realm change)
  |---> feeds into: Team assembly (master/elder leader bonus)
  |
Specialty Integration
  |---> depends on: nothing (single-line change in generateCharacter)
  |---> feeds into: Technique comprehension speed (comprehension specialty)
  |---> feeds into: Building assignment bonuses
  |
Equipment Refinement
  |---> depends on: nothing (backend done, just UI)
  |
Set Bonuses
  |---> depends on: ItemGenerator modification for setId assignment
  |---> depends on: New data file (sets.ts)
  |---> feeds into: calcCharacterTotalStats()
  |
Mechanical Talents
  |---> each talent is independent integration into specific systems
  |---> phoenix_blood -> CombatEngine
  |---> fortune_star -> ItemGenerator / loot tables
  |---> daoxin_stable -> CultivationEngine breakthrough
  |---> quick_learner -> TechniqueSystem comprehension
  |---> beast_whisper -> PetSystem
  |
Fate Tag Expansion
  |---> depends on: new FateTagEffect fields in type definition
  |---> feeds into: multiple systems (combat, cultivation, events)
```

---

## Implementation Difficulty Assessment

Ordered from easiest to hardest, accounting for existing codebase state:

| Rank | Feature | Effort | Why |
|------|---------|--------|-----|
| 1 | Specialty Integration | Trivial | 1-line change in `generateCharacter()`, all downstream code already exists |
| 2 | Title Promotion | Low | Simple realm-check + auto-promote + stat multiplier, no new systems |
| 3 | Equipment Refinement UI | Low | Backend done (`refineEquipment()` + `getEffectiveStats()`), just UI button + display |
| 4 | Element Affinity | Low | Derived from path via lookup, single multiplier addition in combat |
| 5 | Pet Combat Integration | Medium | `getPetCombatUnit()` done, needs team assembly wiring + beast path bonus |
| 6 | Technique Comprehension | Medium | New 0-100% system, migration logic, comprehension tick from scripture hall |
| 7 | Fate Tag Expansion | Medium | New effect fields + integration into 4 systems, but each is small |
| 8 | Set Bonuses | Medium | New data file + ItemGenerator + stat calculation + 4 themed dungeons |
| 9 | Cultivation Path Player Choice | Medium | Change from random roll to choice UI at breakthrough, default for offline |
| 10 | Skill Loadout System | Medium-High | Acquisition flow (4 sources), equip UI, auto-loadout for idle, migration |
| 11 | Mechanical Talents | High | Each talent = separate integration point across different systems |
| 12 | Path Exclusive Skills (stat-based) | Medium | New skill definitions + realm-gated unlock, no engine changes |
| 13 | Path Exclusive Skills (mechanical) | Very High | AoE, freeze, reflect, revive all require CombatEngine extensions |

---

## MVP Recommendation

Prioritize these for immediate implementation (they deliver the most character differentiation for the least effort):

1. **Specialty Integration** -- trivial change, immediately makes every character feel different
2. **Title Promotion** -- low effort, satisfying milestone moments
3. **Equipment Refinement UI** -- backend done, pure UI play
4. **Cultivation Path Player Choice** -- the single most impactful character differentiation feature
5. **Element Affinity** -- comes free with path choice, 15 minutes of work
6. **Pet Combat Integration** -- medium effort, makes beast path genuinely unique

Defer these to later phases:

- **Mechanical Talents**: Defer all but 2-3 simplest (fortune_star, quick_learner). Phoenix blood requires combat engine changes.
- **Path Exclusive Skills (mechanical)**: Requires CombatEngine AoE/freeze/reflect. Implement stat-based path skills first, mechanical ones much later.
- **Set Bonuses**: Requires new dungeon content (3 new dungeons). Defer until dungeon content pipeline is ready.
- **Technique Comprehension Skill Unlocks**: Build the comprehension system first, add skill unlock milestones as a second pass.

---

## Competitor Pattern Notes

### Xianxia Idle Games (general patterns)
- Cultivation paths are almost always 4-6 options tied to traditional xianxia archetypes (sword, body, alchemy, formation, beast, spell). EndlessQuest's 6-path design is well-calibrated.
- Element systems in cultivation games typically use wuxing (5-element cycle) or a simplified 3-element triangle. EndlessQuest's 3-element triangle (fire>ice>lightning>fire) with neutral/healing as non-combat elements is clean and sufficient.
- Technique/scroll progression is typically either instant-learn or gradual-comprehension. Gradual comprehension is the richer pattern and matches the idle game tick-based progression naturally.
- Equipment refinement/enhancement is universal. The no-failure, quality-capped approach is increasingly common in modern idle games that respect player time.

### Roguelike Games (relevant patterns)
- Skill loadouts in roguelikes typically use 4-6 slots. EndlessQuest's 5 slots (3 active + 1 ultimate + 1 flex) matches this expectation.
- Build diversity in roguelikes comes from combining independent systems. EndlessQuest's approach of path + talents + fate tags + technique + equipment creates combinatorial depth without a single complex system.
- The roguelike principle of "interesting choices, not obvious ones" means mechanical talents and fate tag effects should sometimes be double-edged (heart devil seed: faster cultivation but riskier breakthroughs).

---

## Sources

- Direct codebase analysis: 14 system files, 12 data files, 2 type definition files
- Existing P2 design spec: `docs/superpowers/specs/2026-03-29-character-progression-design.md`
- Domain knowledge: xianxia cultivation game genre conventions (Swords of Legends Online, Tale of Immortal, generic cultivation idle mobile games)
- Domain knowledge: roguelike progression design patterns (Slay the Spire, Dead Cells, Hades, Risk of Rain 2)
- Project design principles: `CLAUDE.md` design principles (sparse UI, sect-first identity, idle-friendly)
- Confidence: HIGH for genre conventions and feature categorization; MEDIUM for specific competitor feature details (no web search available to verify current competitor feature sets)
