# Cultivation Drama & Breakthrough Gradient Code-Spec

> Contracts for cultivation variance events and 5-level breakthrough outcomes.

---

## 1. Scope / Trigger

Two systems that add drama and player agency to the cultivation core loop:

1. **CultivationEventSystem** — Random events during idle cultivation (epiphany, bottleneck, spirit dissipation)
2. **Breakthrough Gradient** — 5-level outcome replacing binary success/death for breakthroughs

Both are pure functions in `src/systems/cultivation/`.

---

## 2. CultivationEventSystem

### Signatures

```ts
// src/systems/cultivation/CultivationEventSystem.ts

export interface CultivationEventResult {
  event: CultivationEvent | undefined
  cultivationMultiplier: number  // 0 for bottleneck, 0.7 for dissipation, 1.0 otherwise
  extraCultivation: number       // Burst cultivation from epiphany
  eventStarted: boolean
  eventEnded: boolean
  message: string | null         // For emitEvent()
}

export function processCultivationEvent(
  character: Character,
  cultivationRate: number,
  deltaSec: number
): CultivationEventResult

export function getCultivationEventLabel(type: CultivationEventType): string
```

### Character Type Extension

```ts
// src/types/character.ts
export type CultivationEventType = 'epiphany' | 'bottleneck' | 'spirit_dissipation'

export interface CultivationEvent {
  type: CultivationEventType
  remainingTicks: number
}

// Added to Character interface (optional):
cultivationEvent?: CultivationEvent
```

### Event Configuration

| Event | Probability/tick | Duration | Effect |
|-------|-----------------|----------|--------|
| Epiphany (顿悟) | 0.3% (+ comprehension bonus) | Instant | Burst = `rate × 60 × randomInt(5,30) × deltaSec` |
| Bottleneck (瓶颈) | 0.2% | 60-300s | Cultivation = 0, then 30s at 1.5x after ending |
| Spirit Dissipation (散灵期) | 0.1% | 180-600s | Cultivation × 0.7 |

Comprehension bonus: `Math.max(0, (comprehension - 10)) × 0.0005` added to epiphany probability.

### Design Decisions

- **Events don't stack** — only one active at a time
- **Bottleneck has acceleration phase** — after stagnation ends, 30s at 1.5x speed (negative `remainingTicks`)
- **Pure function** — no store access, returns result for caller to apply
- **Save compatible** — `cultivationEvent` is optional, defaults to `undefined`

### Integration (tickSlice.ts)

```ts
// Before CultivationEngine.tick():
const cultivationRate = calcCultivationRate(char, char.learnedTechniques)
const eventResult = processCultivationEvent(char, cultivationRate, deltaSec)

// After tick:
const gained = (result.cultivationGained * eventResult.cultivationMultiplier + eventResult.extraCultivation)
  * archMods.cultivationMultiplier * campMods.cultivationEfficiency

// Update character:
updatedChar = { ...char, cultivationEvent: eventResult.event }
```

---

## 3. Breakthrough Gradient

### Outcome Type

```ts
// In BreakthroughCoordinator.ts
export type BreakthroughOutcome = 'great_success' | 'success' | 'blocked' | 'injured' | 'fallen'
```

### Probability Table

| Outcome | Weight | Cumulative Range | Notes |
|---------|--------|------------------|-------|
| great_success | 0.10 | 0.00-0.10 | Normal breakthrough + bonus description |
| success | 0.50 | 0.10-0.60 | Normal breakthrough |
| blocked | 0.20 | 0.60-0.80 | Cultivation resets to 70%, character stays alive |
| injured | 0.15 | 0.80-0.95 | Character enters `status: 'injured'` with injuryTimer |
| fallen | 0.05 | 0.95-1.00 | **Major breakthrough only**. Re-allocated to injured for minor |

### Outcome Effects

| Outcome | Realm Change | Cultivation | Character Status | Special |
|---------|-------------|-------------|-----------------|---------|
| great_success | +1 | Reset to 0 | idle | Extra flavor text |
| success | +1 | Reset to 0 | idle | Standard |
| blocked | None | Reset to 70% | idle | Can retry immediately |
| injured | None | Reset to 70% | injured (injuryTimer: 300s) | Recovers via tick |
| fallen | None | N/A | Removed (sacrificed) | Only major realm breakthroughs |

### BreakthroughCoordinator Changes

```ts
// BreakthroughResult extended:
interface BreakthroughResult {
  // ... existing fields
  outcome: BreakthroughOutcome  // NEW (replaces binary died)
  injuryTimer: number           // NEW (0 unless outcome is 'injured')
  died: boolean                 // KEPT for backward compat (true only when outcome === 'fallen')
}
```

### Risk Reduction (Resource-Based)

Players can spend resources to reduce breakthrough risk:
- Spirit Stone + Herb consumption before breakthrough
- Implemented in `BreakthroughCoordinator` cost checking

### Integration (tickSlice.ts)

```ts
// After processBreakthrough():
if (btResult.outcome === 'injured' && btResult.injuryTimer > 0) {
  updatedChar = { ...updatedChar, status: 'injured', injuryTimer: btResult.injuryTimer }
}
// fallen → sacrificeCharacter() (same as before)
// blocked → cultivation reset to 70% (handled in BreakthroughCoordinator)
```

### Existing Infrastructure Reused

- `TribulationSystem.resolveTribulation()` already returns `injuryTimer` — now properly used
- `CharacterStatus 'injured'` already exists in type system
- `tickSlice.ts` already handles injured recovery (lines 318-327)
- `characterSlice.setCharacterStatus()` already supports setting injured + injuryTimer

---

## 4. Growth Trajectory

### Character Type Extension

```ts
// src/types/character.ts
export interface MilestoneSnapshot {
  attack: number
  defense: number
  speed: number
  hp: number
  spiritualRoot: number
  comprehension: number
}

// Added to Character interface (optional):
milestoneSnapshots?: Record<string, MilestoneSnapshot>
// Key format: "realm-stage" (e.g., "1-0", "2-3")
```

### Snapshot Logic

Saved on each successful breakthrough (`outcome === 'success'` or `'great_success'`) in `BreakthroughCoordinator`:

```ts
// In processBreakthrough(), after successful outcome:
const snapshotKey = `${char.realm}-${char.realmStage}`
updatedChar.milestoneSnapshots = {
  ...(char.milestoneSnapshots ?? {}),
  [snapshotKey]: { attack, defense, speed, hp, spiritualRoot, comprehension }
}
```

### UI (CharactersPage.tsx)

Collapsible "成长轨迹" section in CharacterDetail, showing last 3 milestone snapshots with delta values.

---

## 5. Tests Required

| Test File | Coverage |
|-----------|----------|
| `CultivationEventSystem.test.ts` | Event rolling, duration ticking, multiplier application, epiphany burst, bottleneck acceleration phase |
| `BreakthroughGradient.test.ts` | All 5 outcomes, minor vs major realm fallen restriction, injuryTimer, milestone snapshot saving |
| `stores.test.ts` (updated) | Gradient breakthrough in tickAll, injured status setting, blocked outcome recovery |

---

## 6. Key Files

| File | Purpose |
|------|---------|
| `src/systems/cultivation/CultivationEventSystem.ts` | New — cultivation variance events |
| `src/systems/cultivation/BreakthroughCoordinator.ts` | Modified — 5-level gradient outcomes |
| `src/systems/cultivation/TribulationSystem.ts` | Unchanged — injuryTimer now properly consumed |
| `src/types/character.ts` | Extended — CultivationEvent, MilestoneSnapshot types |
| `src/stores/sectStore/tickSlice.ts` | Modified — event integration, gradient handling |
| `src/pages/CharactersPage.tsx` | Modified — event display, growth trajectory section |
