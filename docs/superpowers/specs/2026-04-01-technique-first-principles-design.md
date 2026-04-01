# Technique System First-Principles Design

Date: 2026-04-01

Status Snapshot: Partially implemented in code. Scripture Hall now acts as codex capacity, non-starter manuals come from dungeon exploration, and breakthrough comprehension prefers techniques that fit the disciple.

## Why Reframe The System

For an xianxia idle roguelike, techniques should do more than add flat stats.

At first principles level, a good technique system should answer four fantasy promises:

1. Manuals are discovered, not bought from thin air.
2. A sect can collect inheritance, but each disciple still understands it in a personal way.
3. Dungeon risk should be the main source of new combat identity.
4. Build depth should come from combinations, resonance, and tradeoffs, not raw menu spam.

## Core Loop

The revised loop is:

1. Start with 3 basic sect manuals.
2. Explore dungeons to discover new manuals.
3. Store them in the codex if Scripture Hall capacity allows.
4. Let breakthroughs convert codex breadth into personal comprehension.
5. Use those learned techniques to shape combat pacing, stat profile, and future drops.

This separates three different roles that were previously blurred:

- `Scripture Hall`: storage ceiling and inheritance retention.
- `Dungeon exploration`: acquisition source.
- `Breakthrough`: personal realization moment.

## Implemented In This Pass

- Scripture Hall no longer generates new techniques directly.
- Scripture Hall now expands codex capacity only.
- Starter techniques are fixed at `qingxin`, `lieyan`, and `houtu`.
- All non-starter techniques are marked as dungeon-origin.
- Ancient cave rewards unlock codex entries instead of auto-learning them.
- Duplicate discoveries can naturally become fragment moments instead of forced rerolls.
- Breakthrough comprehension now uses affinity weighting:
  - cultivation path
  - specialties
  - learned elemental resonance
  - fate tags
  - current realm edge

## Design Space Worth Expanding Next

### 1. Manual Fragments

Duplicate dungeon manuals should not feel dead.

Possible use:

- Convert duplicates into `manual fragments`.
- Spend fragments to reroll one breakthrough comprehension attempt.
- Spend fragments to refine one technique style tag, such as `burst -> burst+tempo`.
- Spend fragments to unlock manual annotations, lore, or passive sidegrades.

Why it fits:

- Roguelikes need partial progress.
- Xianxia inheritance fantasy supports broken pages, remnants, and imperfect transmission.

### 2. Technique Resonance

A disciple should not only stack manuals; they should form a coherent dao profile.

Possible use:

- Grant bonuses when two or three learned techniques share:
  - same element
  - same family
  - same style
- Add anti-synergy for reckless mixes, such as fire plus ice instability.
- Let resonance affect combat behavior, not only stats:
  - more opening burst
  - better sustain
  - faster turn cycling
  - safer low-HP recovery

Why it fits:

- This creates real buildcraft without needing dozens of extra buttons.

### 3. Dungeon Biome Identity

Different dungeons should teach different inheritances.

Possible use:

- Fire caverns bias fire or burst manuals.
- Ancient sword ruins bias weapon manuals.
- Frozen palaces bias guard or mystic manuals.
- High floors unlock higher tiers, but biome still shapes style.

Why it fits:

- Dungeon choice becomes strategic instead of just reward volume.

### 4. Inheritance Risk

Powerful manuals in xianxia should carry cost.

Possible use:

- Some manuals add `heart-devil pressure`, `tribulation pressure`, or `body strain`.
- A manual can be strong for combat but risky for breakthrough stability.
- Certain fate tags or sect routes can neutralize those costs.

Why it fits:

- Tradeoffs make rare manuals memorable.
- Roguelikes are stronger when upside and risk are both visible.

### 5. Sect-Level Curation

A sect should feel like it is shaping a canon, not just hoarding everything.

Possible use:

- Let the player pin a few `favored manuals`.
- Pinned manuals get higher breakthrough comprehension weight.
- Scripture Hall upgrades can unlock:
  - more codex slots
  - more favored manual slots
  - better duplicate conversion efficiency

Why it fits:

- This preserves idle accessibility while still giving long-term authorship.

### 6. Legacy Manuals

Late-game progression should allow trans-run identity.

Possible use:

- Ascension can preserve one `legacy manual`.
- Legacy manuals stay rare and do not bypass dungeon exploration for the full codex.
- They seed a run identity without deleting the need to explore.

Why it fits:

- It supports roguelike replayability and xianxia reincarnation fantasy at the same time.

## Recommended Next Implementation Order

1. Add duplicate manual fragments.
2. Add dungeon biome weighting for technique families and styles.
3. Add favored manuals in Scripture Hall.
4. Add basic resonance bonuses for 2-manual and 3-manual combinations.
5. Add a small set of risk-bearing high-tier manuals.

## Guardrails

- Do not turn Scripture Hall back into a direct vending machine.
- Do not let dungeon manuals bypass codex capacity.
- Do not overload the player with manual-level micro-management.
- Prefer readable build signals over invisible formulas.
- Keep the daily loop short; depth should emerge from discovery and composition.
