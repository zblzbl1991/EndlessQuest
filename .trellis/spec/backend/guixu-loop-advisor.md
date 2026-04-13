# Guixu Loop Advisor Code-Spec

> Contracts and patterns for the Guixu endgame loop analysis, expedition preview, and offline adjustment system.

---

## 1. Scope / Trigger

The Guixu Loop Advisor provides:

- **Expedition loop preview** — estimated material yield ranges for the `guixuResonance` template
- **Yield status evaluation** — compare actual haul vs. estimated range (balanced / good / warn)
- **Adjustment suggestions** — one-click template tweaks based on yield performance
- **Offline loop adjustment** — surfaced in offline report with one-click apply

This spec covers: preview calculation, yield analysis, suggestion generation, and integration with offline report / adventure page / sect rumors.

---

## 2. Signatures

### GuixuLoopAdvisor (Pure System)

```ts
// src/systems/sect/GuixuLoopAdvisor.ts

export function summarizeGuixuLoopYield(report: AdventureReport | undefined): GuixuLoopYield | null
export function analyzeGuixuLoop(
  template: GuixuTemplateShape | null,
  archiveMilestones: ArchiveMilestoneEntry[],
  latestYield: GuixuLoopYield | null
): GuixuLoopAnalysis
```

### Expedition Loop Preview (Data Layer)

```ts
// src/data/expeditionTemplates.ts

export function getExpeditionLoopPreview(
  template: Pick<ExpeditionTemplate, 'id' | 'riskTolerance' | 'supplyLevel' | 'rewardFocus'>,
  archiveMilestones: ArchiveMilestoneEntry[]
): ExpeditionLoopPreview | null
```

### Result Types

```ts
interface GuixuLoopYield {
  tideCrystalCount: number
  abyssShardCount: number
  floorsCleared: number
  result: AdventureReportResult
}

interface GuixuLoopYieldStatus {
  label: string       // '符合预估' | '高于预估' | '低于预估'
  detail: string
  tone: 'balanced' | 'good' | 'warn'
}

interface GuixuLoopAdjustmentSuggestion {
  id: string
  label: string
  detail: string
  changes?: Partial<Pick<ExpeditionTemplate, 'riskTolerance' | 'supplyLevel' | 'rewardFocus' | 'fallbackOnFailure'>>
}

interface GuixuLoopAnalysis {
  preview: ExpeditionLoopPreview | null
  status: GuixuLoopYieldStatus | null
  suggestions: GuixuLoopAdjustmentSuggestion[]
}

interface ExpeditionLoopPreview {
  title: string            // '深潜搏材' | '均衡回响' | '稳流采撷'
  yieldSummary: string     // '单轮参考：潮晶 X-Y，残片 A-B'
  detail: string
  recommendation: string
  tideCrystalRange: { min: number; max: number }
  abyssShardRange: { min: number; max: number }
}
```

### Offline Integration Types

```ts
// src/systems/sect/OfflineNarrativeSystem.ts

interface OfflineLoopAdjustment {
  label: string
  detail: string
  actionLabel?: string
  changes?: Partial<Pick<ExpeditionTemplate, 'riskTolerance' | 'supplyLevel' | 'rewardFocus' | 'fallbackOnFailure'>>
}

// Added to OfflineNarrativeSummary:
interface OfflineNarrativeSummary {
  notableEvents: OfflineNarrativeItem[]
  nextSuggestion: string
  loopRewards?: OfflineLoopRewardSummary
  loopAdjustment?: OfflineLoopAdjustment  // NEW
}
```

---

## 3. Contracts

### Preview Calculation Algorithm

Base ranges (before template modifications):

| Milestone | tideMin | tideMax | shardMin | shardMax |
|-----------|---------|---------|----------|----------|
| Pair only | 1       | 2       | 0        | 1        |
| Trinity   | 2       | 3       | 1        | 2        |

Template modifiers applied on top:

| Condition | Effect |
|-----------|--------|
| `riskTolerance === 'balanced'` | shardMax += 1 |
| `riskTolerance === 'risky'` | tideMin/max += 1, shardMin/max += 1 |
| `supplyLevel === 'enhanced'` | tideMax += 1 |
| `supplyLevel === 'luxury'` | tideMin/max += 1, shardMax += 1 |
| `rewardFocus === 'materials'` | tideMin/max += 1, shardMin += 1 |
| `rewardFocus === 'progress'` | shardMin/max += 1 |
| `rewardFocus === 'techniques'` | shardMax += 1 |

Preview title depends on risk:

| riskTolerance  | Title |
|----------------|-------|
| `risky`        | 深潜搏材 |
| `conservative` | 稳流采撷 |
| `balanced`     | 均衡回响 |

### Yield Status Evaluation

| Condition | Label | Tone |
|-----------|-------|------|
| Both tide & shard within range | 符合预估 | `balanced` |
| Either exceeds range max | 高于预估 | `good` |
| Both below range (neither in range) | 低于预估 | `warn` |

### Suggestion Generation Rules

**When tone = `warn`:**
- If `riskTolerance === 'risky'` → suggest switching to `'balanced'`
- If `supplyLevel === 'basic'` → suggest upgrading to `'enhanced'`
- If `supplyLevel === 'enhanced'` AND run failed → suggest upgrading to `'luxury'`
- If `rewardFocus !== 'materials'` → suggest switching to `'materials'`

**When tone = `good`:**
- If `rewardFocus !== 'progress'` → suggest switching to `'progress'`
- If `supplyLevel === 'luxury'` → suggest downgrading to `'enhanced'`

**When tone = `balanced`:**
- If `rewardFocus !== 'progress'` → suggest trying `'progress'` for one run
- Always add a "hold current template" suggestion

Maximum 2 suggestions returned.

### Activation Requirements

All analysis requires:
1. Active template ID = `'guixuResonance'`
2. Archive milestone `'legacyForgePair'` must be present
3. At least one guixu report with tide crystals or abyss shards

---

## 4. Validation & Error Matrix

| Condition | Expected Behavior |
|-----------|------------------|
| Template ID ≠ `'guixuResonance'` | `analyzeGuixuLoop` returns empty analysis |
| No `'legacyForgePair'` milestone | `getExpeditionLoopPreview` returns `null` |
| Report has 0 tide crystals AND 0 shards | `summarizeGuixuLoopYield` returns `null` |
| No guixu reports in recent history | `latestYield` is `null`, no status or suggestions |
| No suggestions from advisor | `loopAdjustment` is `undefined` in offline narrative |

---

## 5. Good/Base/Bad Cases

### Good: Trinity + risky + luxury + materials → high yield range

```ts
const preview = getExpeditionLoopPreview(
  { id: 'guixuResonance', riskTolerance: 'risky', supplyLevel: 'luxury', rewardFocus: 'materials' },
  [{ id: 'legacyForgeTrinity', unlockedAt: 1 }]
)
// Base: tide 2-3, shard 1-2
// +risky: tide 3-4, shard 2-3
// +luxury: tide 4-5, shard 2-4
// +materials: tide 5-6, shard 3-4
expect(preview.tideCrystalRange).toEqual({ min: 5, max: 6 })
expect(preview.abyssShardRange).toEqual({ min: 3, max: 4 })
```

### Base: Yield matches estimate

```ts
const status = evaluateGuixuLoopYieldStatus(preview, { tideCrystalCount: 5, abyssShardCount: 3 })
expect(status.label).toBe('符合预估')
expect(status.tone).toBe('balanced')
```

### Bad: Below estimate triggers stabilization suggestion

```ts
const status = evaluateGuixuLoopYieldStatus(preview, { tideCrystalCount: 2, abyssShardCount: 1 })
expect(status.label).toBe('低于预估')
expect(status.tone).toBe('warn')
// Suggests: riskTolerance → 'balanced' (from 'risky')
```

---

## 6. Integration Points

### Offline Narrative (OfflineNarrativeSystem.ts)

`buildOfflineNarrative()` now:
1. Finds the active guixu template
2. Finds the latest guixu report from recent details
3. Calls `analyzeGuixuLoop()` with template, milestones, and yield
4. Builds `loopAdjustment` from first suggestion (if any)
5. Uses `loopAdjustment.detail` as priority `nextSuggestion` (overrides bottleneck diagnosis)

### Offline Report Modal (OfflineReportModal.tsx)

New prop: `onApplyLoopAdjustment?: () => void`

When `report.loopAdjustment` exists and has `actionLabel`:
- Renders adjustment card with label, detail, and apply button
- Clicking apply calls `onApplyLoopAdjustment`

### App.tsx — One-Click Apply

`handleApplyOfflineLoopAdjustment()`:
1. Validates active template is `'guixuResonance'`
2. Applies `adjustment.changes` to the expedition template
3. Emits `'automation_adjusted'` event with human-readable change description
4. Marks adjustment as applied in report state

### AdventurePage.tsx — Loop Preview UI

When active template is `'guixuResonance'`:
- Shows loop preview card with title, yield summary, detail, recommendation
- Shows actual yield comparison with status badge (good/warn/balanced)
- Shows adjustment suggestion list with one-click apply buttons
- Shows latest `automation_adjusted` event as a banner on the template card

### SectRumorSystem.ts

New rumor source: `automation_adjusted` events are mapped to `'远征已调参'` rumor.

### EventLogStore

New event type: `'automation_adjusted'` with data `{ templateId, source }`.

---

## 7. Tests Required

### GuixuLoopAdvisor (unit)
- `summarizeGuixuLoopYield` extracts correct counts from report items
- Returns `null` for non-guixu dungeon, or when no crystals/shards
- `analyzeGuixuLoop` returns empty for non-guixu templates
- Warn tone generates risk/supply/reward suggestions
- Good tone generates progress/trim-supply suggestions
- Balanced tone generates try-progress + hold suggestions
- Max 2 suggestions returned

### getExpeditionLoopPreview (unit)
- Returns null for non-guixu template
- Returns null without legacyForgePair milestone
- Trinity milestone gives higher base ranges
- Risk/supply/reward modifiers applied correctly

### AdventurePage.test.tsx (integration)
- Shows loop preview with estimate range
- Shows actual yield comparison with status badge
- One-click stabilization updates template in store
- Shows adjustment banner from event log

### OfflineReportModal.test.tsx (integration)
- Renders adjustment card with apply button
- Clicking apply calls `onApplyLoopAdjustment`

### OfflineNarrativeSystem.test.ts (integration)
- Builds stabilization suggestion when haul below estimate
- `loopAdjustment` populated with correct changes

### SectRumorSystem.test.ts
- `automation_adjusted` events produce `'远征已调参'` rumor

---

## Design Decisions

### Decision: Preview ranges are additive modifiers, not lookup tables

**Context**: How to calculate expected yield for different template configurations?

**Decision**: Start with milestone-based base ranges, then apply additive modifiers for risk/supply/reward. Each modifier independently adjusts min/max.

**Why**: Makes it easy to add new modifiers without restructuring. The ranges are approximate by design — they give the player a sense of expected outcomes, not exact predictions. Additive math keeps it simple and debuggable.

### Decision: Only the first suggestion becomes the offline adjustment

**Context**: The advisor may generate up to 2 suggestions. The offline report shows one adjustment.

**Decision**: `buildOfflineNarrative()` takes `suggestions[0]` as the `loopAdjustment`. If it has `changes`, it becomes actionable (with `actionLabel`).

**Why**: The offline report is a quick-check surface. Showing multiple options would add cognitive load. The first suggestion is the most impactful one (e.g., stabilize risk before adjusting supply).

### Decision: Template changes applied via event log audit trail

**Context**: When the player applies a loop adjustment, how to track it?

**Decision**: Emit an `'automation_adjusted'` event with the template ID, source, and human-readable description. This event is then:
- Shown as a banner on the adventure page template card
- Surfaces as a sect rumor ("远征已调参")
- Preserved in event history

**Why**: Provides a full audit trail of automated adjustments. Players can see what was changed and why, even after closing the offline report. No hidden state mutations.
