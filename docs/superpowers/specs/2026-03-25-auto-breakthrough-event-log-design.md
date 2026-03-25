# Auto Breakthrough + Event Log Design

**Goal:** Change disciple breakthrough from manual to automatic with failure risk, and add a global event log page.

**Architecture:** Modify `CultivationEngine` to support failure probability, integrate auto-breakthrough into `tickAll`, add a new `EventLogStore` for global event recording, and create a new `EventLogPage` with navigation tab.

**Tech Stack:** TypeScript, Zustand, React, CSS Modules

---

## Part 1: Auto Breakthrough with Failure

### Current State

- Breakthrough is manual (button click in BreakthroughPanel), 100% success
- `cultivation` can accumulate beyond threshold with no cap
- `realms.ts` defines `tribulationPower` (金丹 0.8, 元婴 1.0, 化神 1.0~1.5) but it's unused
- `tickAll` accumulates cultivation but never checks/triggers breakthrough

### Changes

#### 1.1 CultivationEngine — add failure probability

**File:** `src/systems/cultivation/CultivationEngine.ts`

New function `calcBreakthroughFailureRate(character)`:

```
Sub-level (same realm, stage+1):
  tribulationPower = REALMS[character.realm].tribulationPower ?? 0
  failureRate = 0.05 + tribulationPower * 0.15
  // Range: 5% (no tribulation) → 27.5% (tribulationPower=1.5)

Major realm (realm+1, stage=0):
  targetPower = REALMS[character.realm + 1].tribulationPower ?? 0
  failureRate = 0.10 + targetPower * 0.25
  // Range: 10% (no tribulation) → 47.5% (tribulationPower=1.5)
```

Modified `breakthrough()`:
- Accept `failureRate` parameter
- Roll `Math.random() < failureRate` → return `{ success: false, newRealm: same, newStage: same, cultivationReset: true }`
- On success: same as current (reset cultivation, advance realm/stage, grow stats)

New exported function `isMajorRealmBreakthrough(realm, stage)`:
- Returns true if `stage + 1 >= REALMS[realm].stages.length`

#### 1.2 sectStore — auto-breakthrough in tickAll

**File:** `src/stores/sectStore.ts`

In `tickAll`, after accumulating cultivation for each character:
```
if canBreakthrough(character):
  failureRate = calcBreakthroughFailureRate(character)
  result = breakthrough(character, technique, failureRate)
  if result.success:
    update character (realm, stage, cultivation=0, baseStats)
    emitEvent('breakthrough_success', message)
  else:
    character.cultivation = 0
    emitEvent('breakthrough_failure', message)
```

Remove `attemptBreakthrough` action (no longer needed).

#### 1.3 BreakthroughPanel — read-only display

**File:** `src/components/cultivation/BreakthroughPanel.tsx`

- Remove manual breakthrough button
- Show: current realm/stage, cultivation progress bar, next target, failure rate percentage
- Display last breakthrough result (success/failure) if recent (within 10 seconds) — use a transient state

#### 1.4 Failure Rate by Realm (Reference)

| Breakthrough | tribulationPower | Sub-level | Major Realm |
|-------------|-----------------|-----------|-------------|
| 炼气期 stages | 0 | 5% | — |
| 筑基期 major | 0 | — | 10% |
| 筑基期 stages | 0 | 5% | — |
| 金丹期 major | 0.8 | — | 30% |
| 金丹期 stages | 0.8 | 17% | — |
| 元婴期 major | 1.0 | — | 35% |
| 元婴期 stages | 1.0 | 20% | — |
| 化神期 major | 1.0~1.5 | — | 35%~47% |
| 化神期 stages | 1.0~1.5 | 20%~27% | — |
| 渡劫飞升 | — | — | 10% (special) |

### Data Flow

```
tickAll (every 1s)
  → for each cultivating character:
    → accumulate cultivation
    → if cultivation >= threshold:
      → calcBreakthroughFailureRate()
      → breakthrough(char, technique, failureRate)
      → success: advance realm/stage, reset cultivation
      → failure: reset cultivation only, keep realm/stage
      → emitEvent() for both outcomes
```

---

## Part 2: Event Log System

### Event Store

**New file:** `src/stores/eventLogStore.ts`

```typescript
type EventType =
  | 'breakthrough_success'
  | 'breakthrough_failure'
  | 'building_upgrade'
  | 'building_build'
  | 'recruit'
  | 'adventure_start'
  | 'adventure_complete'
  | 'adventure_fail'
  | 'patrol_complete'
  | 'item_crafted'

interface GameEvent {
  id: string          // 'evt_' + timestamp + counter
  timestamp: number   // Date.now()
  type: EventType
  message: string     // Human-readable Chinese text
}

interface EventLogStore {
  events: GameEvent[]
  maxEvents: number   // 200
  addEvent: (type: EventType, message: string) => void
  reset: () => void
}
```

- Append-only, FIFO, max 200 entries
- `addEvent` prepends new event, trims to maxEvents
- No persistence for now (events are transient session data, not game state)
- Export a standalone `emitEvent(type, message)` function for easy cross-module usage

### Event Log Page

**New file:** `src/pages/EventLogPage.tsx`
**New file:** `src/pages/EventLogPage.module.css`

- Simple list, newest first
- Each entry: timestamp (relative, e.g. "3分钟前") + message
- Event type determines text color (success=green, failure=red, neutral=default)
- Empty state: "暂无记录"

### Navigation Integration

**File:** `src/App.tsx` (or wherever routes/navigation are defined)

- Add "记录" tab to bottom navigation bar (mobile) / side nav (desktop)
- Route to `EventLogPage`
- Icon: scroll/log icon

### Event Emit Points

Where `emitEvent()` is called:

| Location | Event Type | Message Example |
|----------|-----------|----------------|
| `sectStore.tickAll` (breakthrough success) | `breakthrough_success` | "李逍遥 突破至 金丹期 中期" |
| `sectStore.tickAll` (breakthrough failure) | `breakthrough_failure` | "李逍遥 突破失败，修为散尽" |
| `sectStore.tryUpgradeBuilding` (success) | `building_upgrade` | "丹炉 升级至 Lv5" |
| `sectStore.tryUpgradeBuilding` (build) | `building_build` | "建造 聚仙台" |
| `sectStore.addCharacter` | `recruit` | "招收弟子 王明 (灵品)" |
| `adventureStore.completeRun` | `adventure_complete` | "秘境 幽冥洞府 通关" |
| `adventureStore.failRun` | `adventure_fail` | "秘境 幽冥洞府 失败" |
| `adventureStore.collectPatrolReward` | `patrol_complete` | "巡逻完成，获得 100 灵石" |

### Event Type Display

| Type | Color | Label |
|------|-------|-------|
| `breakthrough_success` | success (green) | 突破 |
| `breakthrough_failure` | danger (red) | 突破失败 |
| `building_upgrade` | accent | 建筑 |
| `building_build` | accent | 建筑 |
| `recruit` | accent | 招募 |
| `adventure_complete` | success | 探险 |
| `adventure_fail` | danger | 探险 |
| `patrol_complete` | default | 巡逻 |
| `item_crafted` | default | 制造 |

---

## Files Changed Summary

| Action | File | Description |
|--------|------|-------------|
| Modify | `src/systems/cultivation/CultivationEngine.ts` | Add failure rate calc, modify breakthrough() |
| Modify | `src/stores/sectStore.ts` | Auto-breakthrough in tickAll, emit events, remove attemptBreakthrough |
| Modify | `src/components/cultivation/BreakthroughPanel.tsx` | Remove button, show read-only info |
| Modify | `src/components/cultivation/BreakthroughPanel.module.css` | Adjust styles for read-only display |
| Modify | `src/stores/adventureStore.ts` | Emit events on run complete/fail/patrol |
| Modify | `src/App.tsx` | Add event log route + nav tab |
| Create | `src/stores/eventLogStore.ts` | Event log store |
| Create | `src/pages/EventLogPage.tsx` | Event log page component |
| Create | `src/pages/EventLogPage.module.css` | Event log page styles |
