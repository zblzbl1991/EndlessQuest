# Midgame Deepening Systems Code-Spec

> Contracts and patterns for the midgame branching, risk-reward, and production campaign systems.

---

## 1. Scope / Trigger

The midgame deepening layer makes the sect's idle operation diverge based on player choices. It covers 4 interlocking systems:

1. **Sect Archetype (路线)** — 3 routes that modify cultivation, expedition, and bottleneck behavior
2. **Production Campaign (专项)** — Time-limited boosts that real-impact risk/reward outcomes
3. **Risk Tier (风险阶层)** — Templates tagged with risk levels, each with exclusive rewards
4. **Route Opportunity (路线机会)** — New disciples may trigger route-shift suggestions

This spec covers: modifier composition, event-driven narrative, building power unlocks, and cross-system integration patterns.

---

## 2. System Composition via Modifier Chains

### Pattern: Layered Modifier Stack

Multiple systems produce modifiers that stack to produce the final outcome. Each system is a pure function that takes inputs including the previous layer's output.

```
Base RiskRewardModifier
  → + CampaignRiskModifiers (from ProductionCampaignSystem)
    → + ArchetypeFitModifiers (from SectArchetypeSystem)
      → Final modifier used by SectAutomationSystem
```

### Signature

```ts
// src/systems/sect/ProductionCampaignSystem.ts
export interface CampaignRiskModifiers {
  rewardMultiplier: number       // Added to base (e.g. +0.15 for expeditionPrep)
  failurePenaltyReduction: number // Reduces base penalty (e.g. 0.1 = -10%)
  injuryChanceReduction: number  // Reduces injury probability
  supplyUpgradeChance: number    // Chance to auto-upgrade supply level
  exclusiveRewardWeights: Record<string, number> // Weight boost for specific rewards
}

export function getCampaignRiskModifiers(
  campaignType: string,
  activeCampaign: ProductionCampaign | null
): CampaignRiskModifiers

export function getCampaignEnhancement(
  campaignType: string,
  buildings: Building[]
): { enhanced: boolean; description: string } | null
```

```ts
// src/systems/adventure/RiskRewardSystem.ts
export function getRiskRewardModifierWithCampaign(
  riskTier: RiskTier | undefined,
  archetypeId: SectArchetype | undefined,
  campaign: ProductionCampaign | null,
  activeCampaign: ProductionCampaign | null
): RiskRewardModifier & { narrativeHints: string[] }
```

### Design Decision: Composition Over Monolith

**Context**: Phase 1-3 created 3 independent systems. Phase 4 needed them to interact.

**Options Considered**:
1. Merge all logic into `SectAutomationSystem` — simpler call, but creates a god-module
2. Each system produces modifiers, caller composes them — more files, but each stays focused

**Decision**: Option 2. Each system remains a pure function with a clear responsibility. The calling code (`SectAutomationSystem`) composes modifiers. This means:
- `ProductionCampaignSystem` doesn't know about risk tiers
- `RiskRewardSystem` accepts campaign as an input parameter
- `SectAutomationSystem` is the composition root

### Campaign-Risk Modifier Matrix

| Campaign | Reward Mult | Failure Reduction | Special |
|----------|-------------|-------------------|---------|
| `expeditionPrep` | +0.15 | -0.1 | Supply upgrade chance |
| `recoverySprint` | — | -0.3 | Injury chance -0.2 |
| `forgeSprint` | +0.1 | — | Exclusive reward weight +0.2 |
| `realmSprint` | +0.1 | — | Breakthrough reward weight boost |

---

## 3. Event-Driven Narrative Integration

### Pattern: Store Emits → Systems Consume

Store actions emit events at key state transitions. Narrative and rumor systems read these events to generate feedback.

```
strategySlice.setArchetype()      → emitEvent('archetype_shifted')
strategySlice.startCampaign()     → emitEvent('campaign_started')
adventureStore (run complete)     → updates templateConfidence
```

### Narrative System Integration

```ts
// src/systems/sect/OfflineNarrativeSystem.ts
// Phase 4 additions — campaign-route-risk loop narratives
//
// New event types consumed:
// - campaign_started     → "Because campaign was well-prepared..."
// - archetype_shifted    → "Because route didn't match..."
// - gamble result        → "Because a transformation reward was won..."
```

### Rumor System Integration

```ts
// src/systems/sect/SectRumorSystem.ts
// Phase 4 additions — new rumor triggers:
// - campaign_started     → Campaign announcement rumor
// - archetype_shifted    → Route shift rumor
// - gamble success       → High-risk success story
// - route_opportunity    → Route opportunity detected rumor
```

### Design Decision: Events as the Integration Contract

**Why**: Narrative and rumor systems need to react to state changes across multiple stores. Rather than coupling them to specific store actions, we use `emitEvent()` as the integration contract.

**How to apply**: When adding new state transitions that should produce narrative feedback:
1. Add a new `EventType` to `eventLogStore.ts`
2. `emitEvent(type, message, data?)` at the transition point in the relevant slice
3. Add a handler in `OfflineNarrativeSystem` or `SectRumorSystem` that consumes the event type

### Event Types for Midgame

```ts
// src/stores/eventLogStore.ts
type EventType =
  | ... // existing types
  | 'archetype_shifted'   // Route changed
  | 'campaign_started'    // Production campaign activated
```

---

## 4. Building Power Unlock Pattern

### Pattern: Add Powers to Existing Levels

Instead of creating new buildings, high-level building nodes unlock new capabilities ("powers") for existing systems.

### Signature

```ts
// src/systems/sect/ProductionCampaignSystem.ts
export function getCampaignEnhancement(
  campaignType: string,
  buildings: Building[]
): { enhanced: boolean; description: string } | null
```

### Unlock Thresholds

| Building | Level Threshold | Campaign Enhanced |
|----------|----------------|-------------------|
| Forge (锻造坊) | 7+ | `forgeSprint` enhanced |
| Alchemy (炼丹房) | 5+ | `recoverySprint` enhanced |
| Market (集市) | 4+ | `expeditionPrep` enhanced |

### UI Contract

`BuildingsPage.tsx` checks `getCampaignEnhancement()` for each active campaign and displays an enhancement description with a star marker:

```tsx
const enhancement = getCampaignEnhancement(campaign.type, sect.buildings)
{enhancement?.enhanced && (
  <span className={styles.enhancementMarker}>★ {enhancement.description}</span>
)}
```

### Design Decision: Extend Existing, Don't Create New

**Context**: Phase 4 needed building progression to unlock new powers. Options:
1. Add new buildings with new powers — more code, new data entries, new UI
2. Add "powers" to existing building level thresholds — minimal code, reuses existing infrastructure

**Decision**: Option 2. A `getCampaignEnhancement()` query function checks building levels and returns enhancement info. No new buildings, no new data entries, minimal UI changes.

**How to extend**: When adding more building-power unlocks:
1. Add a new level threshold check in `getCampaignEnhancement()`
2. Return `{ enhanced: true, description: "..." }` for matching campaigns
3. The BuildingsPage already renders the enhancement marker

---

## 5. Key Files

| File | Purpose |
|------|---------|
| `src/types/sect.ts` | SectArchetype, ProductionCampaign, RiskTier, CampaignRiskModifiers, RouteOpportunity types |
| `src/data/sectArchetypes.ts` | 3 route definitions with modifier profiles |
| `src/data/productionCampaigns.ts` | Campaign definitions with risk modifier configs |
| `src/data/expeditionTemplates.ts` | Templates with riskTier and riskHookDescriptor |
| `src/systems/sect/SectArchetypeSystem.ts` | Route switching, modifier calculation,磨合期 logic |
| `src/systems/sect/ProductionCampaignSystem.ts` | Campaign lifecycle, risk modifiers, building enhancement |
| `src/systems/adventure/RiskRewardSystem.ts` | Risk-reward calculation with campaign + archetype modifiers |
| `src/systems/sect/TemplateConfidenceSystem.ts` | Confidence tracking per template |
| `src/systems/sect/RouteOpportunitySystem.ts` | Route-shift opportunity detection |
| `src/systems/sect/ArchetypeBottleneckAdvisor.ts` | Per-route bottleneck advice |
| `src/systems/sect/SectAutomationSystem.ts` | Composition root — applies all modifiers to automation config |
| `src/systems/sect/OfflineNarrativeSystem.ts` | Campaign-route-risk narrative generation |
| `src/systems/sect/SectRumorSystem.ts` | Rumor generation for midgame events |
| `src/stores/sectStore/strategySlice.ts` | Archetype/campaign state mutations + event emission |
| `src/stores/sectStore/tickSlice.ts` | Campaign duration/cooldown ticking |

---

## 6. Tests Required

| Test File | What It Covers |
|-----------|----------------|
| `SectArchetypeSystem.test.ts` | Route switching validation, modifier calculation,磨合期 |
| `ProductionCampaignSystem.test.ts` | Campaign lifecycle, cooldown, duration |
| `RiskRewardSystem.test.ts` | Base risk modifiers + archetype fit |
| `TemplateConfidenceSystem.test.ts` | Confidence up/down, streaks |
| `RouteOpportunitySystem.test.ts` | Opportunity detection logic |
| `SectBottleneckArchetypeAdvice.test.ts` | Per-route bottleneck advice |
| `ProductionCampaignRiskIntegration.test.ts` | Campaign risk modifier output |
| `ArchetypeRiskLoopIntegration.test.ts` | Full modifier chain + narrative output |
| `OfflineNarrativeSystem.test.ts` | Phase 4 narrative events |
| `SectRumorSystem.test.ts` | Phase 4 rumor types |

---

## 7. Common Mistakes

1. **Adding modifier logic directly in SectAutomationSystem** — Keep modifiers in their respective systems. `SectAutomationSystem` is the composition root, not a dumping ground.

2. **Forgetting to emit events on state transitions** — If narrative/rumor needs to react to a change, `emitEvent()` must be called in the relevant slice. Check `OfflineNarrativeSystem` and `SectRumorSystem` for event type coverage.

3. **Creating new buildings for new powers** — Use `getCampaignEnhancement()` to add powers to existing building level thresholds. New buildings require much more infrastructure.

4. **Hardcoding campaign modifiers in RiskRewardSystem** — Campaign modifiers come from `ProductionCampaignSystem.getCampaignRiskModifiers()`. `RiskRewardSystem` consumes them as input parameters, keeping both systems focused.

5. **Adding midgame fields without Sect Interface Extension Pattern** — All new fields on `Sect` must follow the 6-location update pattern (types, initial, SaveSystem write, SaveSystem load with `?? default`, testFixture, LegacySystem).
