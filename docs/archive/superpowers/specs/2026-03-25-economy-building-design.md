# Economy & Building System Redesign

Date: 2026-03-25

## Problem Statement

1. 4 resource types are empty shells (fairyJade, scrollFragment, heavenlyTreasure, beastSoul) with zero production and consumption
2. Spirit energy production formula inconsistency between UI and actual tick
3. 6 of 8 buildings have no gameplay effect (market, alchemyFurnace, forge, scriptureHall, recruitmentPavilion, trainingHall)
4. Players cannot feel resource interactions during gameplay

## Design Decisions

### D1: Clean up dead resources

Remove `fairyJade`, `scrollFragment`, `heavenlyTreasure`, `beastSoul` entirely:
- Remove from `ResourceType` union
- Remove from `Resources` interface
- Remove from store initial state
- Remove from adventure rewards (EventSystem, MapGenerator)
- Remove from AdventureStore.emptyResources()
- Update item types that reference dead resources (Material.category)

Keep only 4 active resources: `spiritStone`, `spiritEnergy`, `herb`, `ore`.

### D2: Fix spirit energy production formula inconsistency

Unify on a single formula used by both `calcResourceRates()` (tick) and `getSpiritFieldRate()` (UI).

Current situation:
- `calcResourceRates()` uses `max(1, 1 * spiritFieldLevel)` → L1=1, L2=2, L3=3
- `getSpiritFieldRate()` uses `1 + (level-1) * 3` → L1=1, L2=4, L3=7

Decision: Use `getSpiritFieldRate` formula (accelerating growth) as the authoritative source. Delete the duplicate and have `calcResourceRates` call `getSpiritFieldRate`.

Also remove duplicate definition of `getSpiritFieldRate` from `ResourceEngine.ts` (keep the one in `buildings.ts`).

### D3: Building effects — mixed model (buffs + feature unlock)

Each building provides percentage buffs at all levels, and unlocks a new feature panel at level 3+.

#### market (坊市)

| Level | Buff | Unlock |
|-------|------|--------|
| Lv1 | Daily shop refresh +1 (base 1 → 2/day) | — |
| Lv2 | Shop item quality cap +1 | — |
| Lv3 | Refresh +1, quality +1 | **Market Shop Tab** — buy/sell equipment and materials |
| Lv4-8 | Each level: +1 refresh, +1 quality cap | Enhanced shop |

**Integration**: Wire existing `TradeSystem.generateDailyItems(marketLevel)` and `TradeSystem.createShopState(marketLevel)` into BuildingsPage as a new tab or section. Market tab only visible when building unlocked.

**Resources consumed**: spiritStone (purchasing)
**Resources produced**: spiritStone (selling)

#### alchemyFurnace (丹炉)

| Level | Buff | Unlock |
|-------|------|--------|
| Lv1 | Potion effect +20% | — |
| Lv2 | Potion effect +40% | — |
| Lv3 | Potion effect +60% | **Alchemy Panel** — consume herbs to craft potions |
| Lv4-8 | Effect +80% to +160%, new recipes | Advanced potions |

**New system**: AlchemySystem with recipes:
- 回血丹 (HP Potion): 5 herb → heals 20% HP per use
- 灵气丹 (Spirit Potion): 8 herb → restores 50 spirit energy
- 突破丹 (Breakthrough Pill): 15 herb + 50 spiritStone → +20% breakthrough chance (Lv5+ recipe)

Potion effect multiplier = `1 + 0.2 * alchemyFurnaceLevel`.

**Resources consumed**: herb (crafting), spiritStone (advanced recipes)
**Resources produced**: potions (items in inventory)

#### forge (炼器坊)

| Level | Buff | Unlock |
|-------|------|--------|
| Lv1 | Enhancement success rate +10% | — |
| Lv2 | Success +20%, ore cost -10% | — |
| Lv3 | Success +30%, ore cost -20% | **Forge Panel** — consume ore + spiritStone to craft equipment |
| Lv4-8 | Success +40% to +80%, ore cost -30% to -70% | Higher quality equipment |

**New system**: ForgeSystem integrated into existing EnhancePanel:
- Craft equipment by quality tier: 凡品 (20 ore + 50 spiritStone), 灵品 (80 ore + 200 stone), 仙品 (300 ore + 1000 stone), 神品 (1000 ore + 5000 stone)
- Forge success chance = base quality chance * (1 + 0.1 * forgeLevel)
- Enhancement cost modifier = `(1 - 0.1 * forgeLevel)` (capped at 0.3 minimum cost)

**Resources consumed**: ore, spiritStone
**Resources produced**: equipment items

#### scriptureHall (藏经阁)

| Level | Buff | Unlock |
|-------|------|--------|
| Lv1 | Technique comprehension speed +15% | — |
| Lv2 | +30% | — |
| Lv3 | +45% | **Study Panel** — consume spiritStone to comprehend random techniques |
| Lv4-8 | +60% to +120% | Higher tier technique probability |

**New system**: Study action in BuildingsPage or CharactersPage:
- Cost: 100 * sectLevel spiritStone per study attempt
- Result: random technique scroll matching character's realm tier
- Comprehension bonus = `(1 + 0.15 * scriptureHallLevel)` multiplier on existing comprehension rate

**Resources consumed**: spiritStone
**Resources produced**: technique scrolls

#### recruitmentPavilion (聚仙台)

| Level | Buff | Unlock |
|-------|------|--------|
| Lv1 | Recruit spiritStone cost -10% | — |
| Lv2 | Cost -20% | — |
| Lv3 | Cost -30% | **Targeted Recruitment** — consume spiritStone + herb to recruit with quality bias |
| Lv4-6 | Cost -40% to -60% | Higher quality targeting |

**Integration**: Modify existing recruit system:
- Cost multiplier = `(1 - 0.1 * recruitmentPavilionLevel)`, min 0.4
- Targeted recruitment: pay 2x normal cost + 10 herb to narrow quality range (e.g., guarantee 灵品+)

**Resources consumed**: spiritStone, herb (targeted)
**Resources produced**: new characters

#### trainingHall (传功殿)

| Level | Buff | Unlock |
|-------|------|--------|
| Lv1 | All disciples cultivation speed +10% | — |
| Lv2 | +20% | — |
| Lv3 | +30% | **Group Transmission** — consume spiritEnergy to batch boost cultivation |
| Lv4-6 | +40% to +60% | More efficient group transmission |

**New system**: Group transmission action:
- Cost: 50 spiritEnergy per disciple participating
- Effect: instant 10% of next realm's experience for each participant
- Cooldown: 60 seconds
- Speed multiplier = `(1 + 0.1 * trainingHallLevel)` applied to all cultivation calculations

**Resources consumed**: spiritEnergy
**Resources produced**: cultivation progress

### D4: Building interdependencies

```
spiritField (herb) → alchemyFurnace (potions) → combat/cultivation
adventure (ore) → forge (equipment) → combat power
spiritField (spiritEnergy) → trainingHall (group transmission) → cultivation speed
spiritStone → market (shop) → equipment/materials
spiritStone → scriptureHall (study) → techniques → cultivation speed
spiritStone → recruitmentPavilion (recruit) → more disciples
herb → recruitmentPavilion (targeted recruit) → quality control
```

### D5: Resource flow visualization

#### Building card effect display

Each building card shows:
- **Unlocked buildings**: specific buff values (e.g., "Cultivation Speed +20%", "Shop Refresh 3/day")
- **Locked buildings**: preview text ("Unlocks: Cultivation Speed +10%")
- **Upgrade preview**: next level effect shown on hover/long-press of upgrade button

#### Resource rate display in TopBar/SectPage

Show real-time rates for all 4 resources:
```
Spirit Energy  ████░░  234/500  (+5/s  -4/s  +1/s)
Herb           ███░░░   89      (+0.3/s)
Ore            ██░░░░   45      (from adventure)
Spirit Stone   ██████ 1,230     (from adventure)
```

- Source annotation (spirit field / adventure / building buff)
- Destination annotation (cultivation / healing / enhancement)
- Net income: green if positive, red if negative

#### Resource shortage hints

When player tries to use a feature but lacks resources:
- "Herb insufficient — upgrade Spirit Field or go on adventure"
- "Ore insufficient — go on adventure to obtain"

### D6: Implementation scope

Single phase, all features at once:
1. Clean up dead resources
2. Fix spirit energy formula bug
3. Implement all 6 building buffs (modify existing engine calculations)
4. Implement 6 new feature panels/unlocks
5. Building card effect visualization
6. Resource rate display for all 4 resources
7. Resource shortage hints

## Affected Files (Analysis)

### Types
- `src/types/sect.ts` — Remove dead resource types, update Resources interface
- `src/types/item.ts` — Remove Material.category references to dead resources

### Data
- `src/data/buildings.ts` — Add effect descriptions, buff formulas
- `src/data/items.ts` — Add potion item definitions for alchemy

### Systems (new)
- `src/systems/economy/AlchemySystem.ts` — Potion crafting logic
- `src/systems/economy/ForgeSystem.ts` — Equipment crafting logic
- `src/systems/economy/BuildingEffects.ts` — Centralized building buff calculations

### Systems (modified)
- `src/systems/economy/ResourceEngine.ts` — Remove duplicate getSpiritFieldRate, use unified formula
- `src/systems/character/CharacterEngine.ts` — Apply trainingHall speed buff, recruitmentPavilion cost reduction
- `src/systems/cultivation/CultivationEngine.ts` — Apply trainingHall speed buff
- `src/systems/equipment/EquipmentEngine.ts` — Apply forge success rate and cost reduction buffs
- `src/systems/roguelike/EventSystem.ts` — Remove fairyJade from rewards
- `src/systems/roguelike/MapGenerator.ts` — Remove fairyJade from route rewards
- `src/systems/sect/BuildingSystem.ts` — Add effect calculation helpers
- `src/systems/trade/TradeSystem.ts` — Wire market level into shop generation

### Stores
- `src/stores/sectStore.ts` — Remove dead resources from state, integrate building buffs into tickAll
- `src/stores/adventureStore.ts` — Remove dead resources from emptyResources(), rewards

### Components
- `src/pages/BuildingsPage.tsx` — Add effect display, market tab, alchemy panel, forge panel, study section, group transmission
- `src/components/common/TopBar.tsx` — Show all 4 resource rates
- `src/components/common/ResourceRate.tsx` — Extend to show herb/ore rates
- `src/components/common/ResourceHint.tsx` — New: resource shortage hint component

### Tests
- Update existing tests for removed resources
- Add tests for new building buff calculations
- Add tests for alchemy/forge/study systems
