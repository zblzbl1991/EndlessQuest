# Economy Resource System Design

Date: 2026-03-25
Status: Approved

## Problem

- **开局卡灵石：** 初始 500 灵石用完后没有被动灵石产出，游戏进程卡住
- **灵气供需失衡：** Level 1 灵田产出 1/s，1 个弟子消耗 2/s，必定亏损
- **矿材获取困难：** 矿材只能通过冒险获取，初期缺乏锻造材料
- **Bug：** `ResourceEngine.ts` 中 `Math.max(1, ...)` 导致无灵田也有 1/s 灵气产出

## Solution

### 1. Spirit Mine Building (灵石矿)

**定位：** 宗门经济基础建筑，初期免费建造，提供被动灵石和矿材产出。

**Build Cost:**

| Level | Spirit Stone | Ore |
|-------|-------------|-----|
| 0→1   | 0 (free)    | 0   |
| 1→2   | 100         | 0   |
| 2→3   | 200         | 10  |
| N→N+1 | 100 * N     | 10 * (N-1) |

**Production Formula:**

```
spiritStone = 0.5 + (level - 1) * 0.5   // per second
ore         = 0.05 * level              // per second (byproduct)
```

| Level | Spirit Stone/s | /hour | /8h offline | Ore/s |
|-------|---------------|-------|-------------|-------|
| 1     | 0.5           | 1800  | 14400       | 0.05  |
| 2     | 1.0           | 3600  | 28800       | 0.10  |
| 3     | 1.5           | 5400  | 43200       | 0.15  |
| 5     | 2.5           | 9000  | 72000       | 0.25  |
| 10    | 5.0           | 18000 | 144000      | 0.50  |

**Integration:** Production calculated in `calcResourceRates`, multiplied by `ProductionBonuses` (techniqueMultiplier × discipleMultiplier).

### 2. Spirit Field Curve Adjustment

**Current formula:** `1 + (level - 1) * 3` per second
**New formula:** `3 + (level - 1) * 2` per second

| Level | Old  | New | Cultivators Supported (at 2/s) |
|-------|------|-----|-------------------------------|
| 1     | 1/s  | 3/s | 1 (surplus 1)                |
| 2     | 4/s  | 5/s | 2 (surplus 1)                |
| 3     | 7/s  | 7/s | 3 (surplus 1)                |
| 5     | 13/s | 11/s| 5 (surplus 1)                |
| 10    | 28/s | 21/s| 10 (surplus 1)               |

**Design intent:** Each level supports exactly one more cultivator. Level 1 is no longer a deficit.

**Herb production unchanged:** `0.1 * level /s`.

**Bug fix:** Remove `Math.max(1, ...)` floor in `ResourceEngine.ts`. No spirit field = 0 spirit energy.

### 3. Patrol Adventure (外围巡逻)

**定位：** 极简冒险模式，初期灵石补充 + 新手引导。

| Property | Value |
|----------|-------|
| Entry    | Adventure page, "Patrol" option alongside dungeon |
| Requirement | 1 disciple, no realm/equipment minimum |
| Duration | 60 seconds per round |
| Difficulty | Fixed low, cannot fail |
| Reward   | `50 + sectLevel * 10` spirit stones + minor XP |
| Daily Limit | 5 rounds max |

**Implementation:**
- New `patrol` adventure type in AdventureStore
- Reuses existing tick mechanism with 60s countdown
- No MapGenerator / EventSystem needed (no combat, no events)
- UI: simple progress bar + collect reward button

### 4. Resource Engine Integration

**`calcResourceRates` updated signature:**

```typescript
function calcResourceRates(
  buildingLevels: BuildingLevels,
  bonuses: ProductionBonuses = { techniqueMultiplier: 1, discipleMultiplier: 1 }
): ResourceRates
```

**Updated calculation:**

```typescript
const totalMult = bonuses.techniqueMultiplier * bonuses.discipleMultiplier
const sfLevel = buildingLevels.spiritField
const smLevel = buildingLevels.spiritMine

return {
  spiritEnergy: sfLevel > 0 ? (3 + (sfLevel - 1) * 2) * totalMult : 0,
  spiritStone:  smLevel > 0 ? (0.5 + (smLevel - 1) * 0.5) * totalMult : 0,
  herb:         sfLevel > 0 ? 0.1 * sfLevel * totalMult : 0,
  ore:          smLevel > 0 ? 0.05 * smLevel * totalMult : 0,
}
```

**`BuildingLevels` type extension:**

```typescript
interface BuildingLevels {
  spiritField: number
  spiritMine: number      // NEW
  mainHall: number
  market: number
  alchemyFurnace: number
  forge: number
  scriptureHall: number
  recruitmentPavilion: number
  trainingHall: number
}
```

**UI updates:**
- `ResourceRate` component: show spirit stone and ore production rates
- `TopBar`: add `+X/s` indicators next to spirit stone and ore

## Files Changed

| File | Change |
|------|--------|
| `src/data/buildings.ts` | Add SpiritMine definition, cost/production functions, update `getSpiritFieldRate` |
| `src/types/sect.ts` | Add `spiritMine` to BuildingLevels |
| `src/systems/economy/ResourceEngine.ts` | Update `calcResourceRates`, remove `Math.max(1, ...)` bug |
| `src/stores/sectStore.ts` | Wire SpiritMine into tickAll, add patrol state to buildings |
| `src/stores/adventureStore.ts` | Add patrol adventure type, 60s timer, daily limit, reward logic |
| `src/components/common/ResourceRate.tsx` | Show spirit stone and ore rates |
| `src/components/common/TopBar.tsx` | Add `+X/s` indicators |
| `src/components/adventure/` | Patrol UI (progress bar + collect) |
| `src/components/buildings/` | SpiritMine building panel |
