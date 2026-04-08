# 修复方案：自动运转频率、战斗风险、资源平衡、仓库管理、事件日志

## Context

玩家测试发现五个互相关联的问题：自动运转 100% 成功、资源通胀、仓库满、日志无信息量、缺乏进度感。根因指向同一个核心问题：**自动运转每 60 秒触发一次，结果太确定，产出远超消耗**。

本方案分三个阶段，从根因杠杆开始逐层修复。

---

## 阶段一：降低自动运转频率（核心杠杆）

从每 60 秒一次改为每 5 个游戏日（300 秒）一次。弟子有 4/5 时间 idle 修炼。

### 1.1 添加自动运转间隔计数器

**`src/types/sect.ts`** — Sect 接口新增字段：
```ts
autoRunDayCounter: number  // 距上次自动运转经过的游戏天数
```

### 1.2 初始化新字段

**`src/stores/sectStore/initial.ts`** — createInitialState 添加：
```ts
autoRunDayCounter: 0
```

### 1.3 修改自动运转触发逻辑

**`src/stores/sectStore/tickSlice.ts`** (~410-419 行)

将 `buildAutomationRunConfig + runAutomation` 包裹在计数器判断中：
- 每个 elapsedDay：`autoRunDayCounter++`
- 当 `autoRunDayCounter >= 5` 时才触发自动运转，然后重置为 0
- 未触发天数的弟子保持 idle 修炼

### 1.4 存档兼容

**`src/systems/save/SaveSystem.ts`** — 迁移逻辑中加 `sect.autoRunDayCounter ?? 0`

### 效果预估

| 指标 | 修改前 | 修改后 |
|------|--------|--------|
| 自动秘境频率 | 60 秒/次 | 300 秒/次 |
| 每小时秘境事件 | ~120 条 | ~24 条 |
| 弟子 idle 比例 | ~0% | ~80% |
| 秘境灵石产出 | ~10000/分钟 | ~10000/5分钟 |

---

## 阶段二：增加战斗不确定性与风险

### 2.1 提高敌人强度

**`src/data/enemies.ts`** (54-88 行) — `adjustEnemyByTeamPower()`

| 参数 | 修改前 | 修改后 |
|------|--------|--------|
| 普通敌人战力比 | 60-100% | 80-130% |
| Boss 战力比 | 100-150% | 120-200% |
| 调整 clamp | ±20% | ±35% |

### 2.2 收紧撤退阈值

**`src/systems/roguelike/AutoRunPolicy.ts`** (186-195 行) — `shouldRetreat()`

| 策略 | 平均HP (旧→新) | 最低HP (旧→新) |
|------|----------------|----------------|
| steady | 40% → 55% | 22% → 30% |
| combat | 18% → 30% | 8% → 12% |
| profit | 28% → 40% | 15% → 18% |

### 2.3 降低层间恢复量

**`src/systems/roguelike/RunBuildSystem.ts`** (236-241 行) — `applyRunRecovery()`

恢复值减半：ironBody 12%→6%, jadeGourd 8%→4%, blood_vial 15%→8%

### 2.4 steady 策略允许偶尔冒险

**`src/systems/roguelike/AutoRunPolicy.ts`** (121-128 行) — `pickAutomationRoute()`

将硬过滤改为概率过滤：高风险路线 15% 概率被保留（不再完全排除）

---

## 阶段三：资源消耗锚点与系统改善

### 3.1 灵石 hard cap + 税收受衰减

**`src/systems/economy/ResourceEngine.ts`** (80-87 行) — `clampResources()`

- 灵石增加 hard cap = soft cap × 5（主殿 Lv3 时为 70,000）
- 函数签名扩展为 `clampResources(resources, caps, spiritStoneHardCap?)`

**`src/stores/sectStore/tickSlice.ts`** (~289 行)

- 税收也受 soft cap 衰减（移除 "tax is NOT affected" 的豁免）
- 调用处传入 `calcSpiritStoneCap(mhLevel) * 5` 作为 hard cap

### 3.2 建筑升级费用提高

**`src/data/buildings.ts`** (141 行附近)

公式从 `100 * pow(level+1, 1.3)` 改为 `200 * pow(level+1, 1.7)`：

| 等级 | 旧费用 | 新费用 |
|------|--------|--------|
| Lv4→5 | ~501 | ~4160 |
| Lv9→10 | ~1389 | ~10740 |

### 3.3 仓库扩容

**`src/stores/sectStore/tickSlice.ts`** — 在 tickAll 中动态计算

仓库容量随主殿等级增长：`50 + (mainHallLevel - 1) * 20`

| 主殿等级 | 仓库容量 |
|----------|----------|
| Lv1 | 50 |
| Lv3 | 90 |
| Lv5 | 130 |
| Lv10 | 230 |

### 3.4 事件日志合并与筛选

**`src/stores/eventLogStore.ts`** (49-59 行)

- MAX_EVENTS 从 200 提升到 500
- 连续同类秘境事件合并：`adventure_start`/`adventure_complete` 不逐条存储，而是检查上一条同类事件，如果距离 < 60 秒则合并为 `"批量秘境探索 x{count}"`

**`src/pages/EventLogPage.tsx`** (76 行)

筛选类型从 `'all' | 'adventure'` 扩展为：
```ts
'all' | 'adventure' | 'cultivation' | 'building' | 'milestone'
```

添加对应筛选按钮：全部、秘境、修行、建设、里程碑

---

## 修改文件清单

| 文件 | 改动 |
|------|------|
| `src/types/sect.ts` | +autoRunDayCounter 字段 |
| `src/stores/sectStore/initial.ts` | 初始化 autoRunDayCounter: 0 |
| `src/stores/sectStore/tickSlice.ts` | 自动运转间隔、税收衰减、仓库容量动态计算 |
| `src/systems/save/SaveSystem.ts` | 存档迁移 autoRunDayCounter ?? 0 |
| `src/data/enemies.ts` | 敌人强度曲线调整 |
| `src/systems/roguelike/AutoRunPolicy.ts` | 撤退阈值 + 路线概率 |
| `src/systems/roguelike/RunBuildSystem.ts` | 层间恢复减半 |
| `src/systems/economy/ResourceEngine.ts` | 灵石 hard cap |
| `src/data/buildings.ts` | 升级费用曲线 |
| `src/stores/eventLogStore.ts` | 事件合并 + MAX_EVENTS |
| `src/pages/EventLogPage.tsx` | 扩展筛选类型 |

## 验证

1. 加载测试存档 `?loadTestSave=true`，确认无报错
2. 观察自动运转间隔：应该约 5 分钟一次（而非 60 秒）
3. 观察弟子状态：大部分时间应显示"修炼中"，秘境间隔期间有修炼进度
4. 观察秘境结果：应该出现撤退、失败的情况（而非 100% 通关第8层）
5. 检查灵石增长速度：应明显放缓，不超过 hard cap
6. 检查仓库：不再快速填满，有成长空间
7. 检查事件日志：不再被重复秘境事件淹没，突破/里程碑可见
8. 运行现有测试：`npx vitest run` 确认不破坏现有功能
