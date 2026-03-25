# Phase 2: Core Game Loop — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the game "alive" — idle engine ticking every second, resources flowing, cultivation accumulating, realm breakthrough working.

**Spec:** `docs/superpowers/specs/2026-03-24-endlessquest-design.md` (sections 1.1, 1.2, 2.2)

**Key mechanics from spec:**
- 灵气: auto-produced by 灵田 (base 1/s), consumed by cultivation
- 修为: accumulated via cultivation, consumed on realm breakthrough
- 灵根: each point = +2% cultivation rate (base 10)
- 每秒产出 = 基础值 × 建筑等级倍率 × 功法加成 × 弟子加成
- 境界突破: consume cultivation points, advance realm/stage
- 大境界属性成长: all stats × 1.8 per major realm
- 小层级属性增长: ~15% of major realm growth per sub-level

---

## Task 1: Resource Production System

**Files:**
- Create: `src/systems/economy/ResourceEngine.ts`
- Create: `src/__tests__/ResourceEngine.test.ts`

Logic:
- `calcResourcePerSecond(resourceType, buildingLevels, bonuses)` → number
- Base rates: spiritEnergy=1, herb=0.1, ore=0.05, spiritStone=0
- Building multipliers: spiritField level → herb + spiritEnergy, no building → stone/ore
- Bonuses: { techniqueMultiplier: 1, discipleMultiplier: 1 }
- spiritEnergy minimum 1/s (zero-resource protection)

Test cases:
- Base production with no buildings
- Production with spiritField level 3
- Minimum 1/s spiritEnergy guarantee
- Building multiplier applied correctly

---

## Task 2: Cultivation System

**Files:**
- Create: `src/systems/cultivation/CultivationEngine.ts`
- Create: `src/__tests__/CultivationEngine.test.ts`

Logic:
- `calcCultivationRate(player)` → 修为/s
  - Base rate = 5 修为/s
  - 灵根 bonus: +2% per point (base 10 = +20%)
  - Realm multiplier: 1.0 for 炼气, decreases for higher realms (harder to cultivate)
  - Technique bonus (future: from equipped 心法)
- `calcSpiritCostPerSecond()` → 灵气/s consumed = 2
- `canCultivate(resources)` → boolean (enough spiritEnergy)
- `tick(player, resources, deltaSec)` → { cultivationGained, spiritSpent }
  - If not enough spiritEnergy, cultivation paused (gain 0)
- `canBreakthrough(player)` → boolean
  - Check: cultivation >= needed for next stage
  - Check: extra condition (筑基丹 for 筑基, etc.)
- `breakthrough(player, resources)` → { success, newRealm, newStage, statsChange }
  - Consume cultivation, advance stage (or realm if at 圆满)
  - Apply stat growth (小层级 +15%, 大境界 ×1.8)
- Realm stat growth tables (from spec):
  - Small stage growth: ~15% of the major realm's total stat increase
  - Major realm: baseStats × 1.8

Test cases:
- Cultivation rate with default stats
- 灵根 bonus applied
- Cultivation paused when no spiritEnergy
- Breakthrough succeeds when enough cultivation
- Breakthrough blocked when insufficient cultivation
- Stat growth on breakthrough (small stage)
- Stat growth on major realm change (×1.8)
- Edge: 渡劫飞升 has only 1 stage

---

## Task 3: Idle Engine

**Files:**
- Create: `src/systems/idle/IdleEngine.ts`
- Create: `src/__tests__/IdleEngine.test.ts`

Logic:
- Class `IdleEngine`:
  - `start(tickCallback)` → starts setInterval(1000ms)
  - `stop()` → clears interval
  - `isRunning` → boolean
  - `tick()` → calls callback with delta time (seconds)
  - Handles tab visibility (pause when hidden, catch up on return)
- `calcOfflineTicks(lastOnlineTime)` → seconds elapsed (max 86400 = 24h)
- `calcOfflineRevenue(ticks, cultivationRate, resourceRates)` → { cultivation, resources }
  - Cultivation capped by spiritEnergy budget (1 spiritEnergy per 2 cultivation)
  - spiritEnergy regenerates from buildings during offline

Test cases:
- Engine starts and stops
- Tick callback receives delta
- Offline calc returns correct ticks for 1 hour
- Offline calc capped at 24 hours
- Offline revenue correctly calculates within spiritEnergy budget

---

## Task 4: Update Stores for Game Loop

**Files:**
- Update: `src/stores/gameStore.ts`
- Update: `src/stores/playerStore.ts`
- Update: `src/stores/inventoryStore.ts`
- Update: `src/__tests__/stores.test.ts`

Changes:
- `gameStore`: add `startGame()`, `stopGame()`, engine instance management
- `playerStore`: add `tick(delta)` that calls CultivationEngine, add `breakthrough()` action
- `inventoryStore`: add `tickResourceProduction(delta)` that calls ResourceEngine, add `tickOffline(seconds)` for catch-up
- Wire stores together: gameStore.startGame → setInterval → playerStore.tick + inventoryStore.tickResourceProduction

Test cases:
- playerStore.tick() increases cultivation when spiritEnergy available
- playerStore.tick() doesn't increase cultivation when no spiritEnergy
- playerStore.breakthrough() succeeds with enough cultivation
- inventoryStore.tickResourceProduction() increases resources
- gameStore.startGame/stopGame controls engine

---

## Task 5: Hook Engine into App + Update MainHall UI

**Files:**
- Update: `src/App.tsx` (start engine on mount, stop on unmount)
- Update: `src/pages/MainHall.tsx` (show real-time resource rates)
- Update: `src/components/character/PlayerInfo.tsx` (real-time cultivation progress)
- Create: `src/components/common/ResourceRate.module.css`
- Create: `src/components/common/ResourceRate.tsx`

Changes:
- App.tsx: useEffect to call gameStore.startGame on mount, stopGame on unmount
- MainHall: show per-second resource rates (灵气 +X/s, 灵草 +X/s, etc.)
- PlayerInfo: cultivation bar updates in real-time
- ResourceRate component: shows "icon name +X.X/s" with green color for production

---

## Task 6: Cultivation Page (Real)

**Files:**
- Replace: `src/pages/Cultivation.tsx`
- Create: `src/pages/Cultivation.module.css`
- Create: `src/components/cultivation/BreakthroughPanel.tsx`
- Create: `src/components/cultivation/BreakthroughPanel.module.css`

UI:
- Current realm + stage display with progress bar
- Cultivation speed display (修为/s)
- Spirit energy cost display
- "修炼中" status indicator (animated)
- Breakthrough button (enabled when ready, shows requirement if not)
- On breakthrough: visual feedback (flash/pulse animation)
- After breakthrough: new realm display with stat changes
