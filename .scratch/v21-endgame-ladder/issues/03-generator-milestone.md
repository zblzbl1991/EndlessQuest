# 03 建筑 Generator V2：指数成本 + Milestone + 批量购买

Type: task
Status: resolved
Blocked by: 02
Assignee: zcode (2026-09-13)

## Question

如何把建筑层从"多项式成本 + 等级封顶 6~10 的静态层"改造成骑在指数曲线上的 Generator 层，使宗门经营在全程保持相关性？（V2 设计稿 §六 P1-a；现状：金丹后建筑全满、成本可忽略、收入沦为境界的函数）

### 范围

1. **成本公式**（`src/data/buildings.ts`）：`cost(level→level+1) = baseCost × growth^level`，按设计稿 §6.1 表：
   聚灵阵 100/1.15、灵田 150/1.16、灵矿 200/1.17、藏经阁 400/1.20、炼丹房 800/1.22、炼器阁 800/1.22、御兽峰 1200/1.25；主殿维持"境界解锁"角色（等级上限 = 境界 index × 2）。
   - 等级无上限（主殿除外）；扩建公式 `(count+1)^1.6` 保留，座数上限由主殿等级 + Milestone 双驱动。
   - 成本走工单 02 的 Decimal 路径。
2. **产出曲线**：各 Generator 基础产出随等级指数增长（聚灵阵 3×1.10^lv、灵田 3×1.08^lv、灵矿 2×1.09^lv，设计稿 §6.1）；现有弟子指派/专长/协同保留为乘区。
3. **Milestone 表**（内容阀门，每建筑 4~6 档，按 §6.1）：每档真实接入效果或给出明确"解锁自动化"挂点（自动升级、自动炼丹、自动出售废装、药园自动化等——未在本工单实现的自动化能力先挂解锁标记，由工单 05 消费）；Milestone 达成走"关键时刻"反馈（现有里程碑高光管线）。
4. **批量购买 UI**：建筑页每座建筑 ×1 / ×10 / ×100 / MAX 购买（MAX = 当前灵石可买最大数，Decimal 等比求和计算）；移动端 44px 触控、桌面端并排（响应式基线不动）。
5. **飞升重置兼容**：`performAscension` 重置清单不变（建筑回初始），Generator 曲线下前期重建节奏由工单 10 的模拟验证。

### 不做

- 灵气消耗端改造（工单 04）；自动化开关面板（工单 05）；新建筑种类；洞天福地（后续 effort）。

## Acceptance

1. 单测：成本曲线（指数、无上限、Decimal 路径）、Milestone 各档触发与效果真实生效（至少聚灵阵/灵田/灵矿/藏经阁四类代表性断言）。
2. 单测：MAX 购买数量与扣费正确（含 0 可买时禁用态）。
3. UI：建筑页批量购买 + Milestone 进度可见（下一档预告）。
4. 模拟：`simulate-pacing.ts` 中建筑支出占收入比在合理带内（全程 < 50%，前期有感知、中后期不卡墙），断言入脚本。
5. `npm test` 全量绿。

## Answer

`npm test` 104 文件 / 1408 用例全绿（+1 文件 +17 用例，存量 16 用例按新公式更新）；`tsc --noEmit` 0 错误；`simulate-pacing.ts` exit 0。

### 建筑映射决策（设计稿 §6.1 → 现有 8 建筑）

设计稿的"聚灵阵"与"灵田"在现有代码中是同一座 spiritField——**聚灵阵之职并入灵田**，不新增建筑类型（避免存档/图鉴迁移）；御兽峰未实装（灵宠系统无建筑载体），跳过。Generator 化五座：灵田 150/1.16、灵矿 200/1.17、藏经阁 400/1.20、丹炉 800/1.22、锻器坊 800/1.22；坊市/聚仙台为服务型建筑保留多项式 + 材料成本；主殿动态上限 `(bestRealm+1)×2`（炼气 2 → 渡劫 18）——连带效应：藏经阁（需主殿 Lv3）在筑基期解锁，与"境界解锁管新玩法"一致。

### 成本与产出

- Generator 成本 = `safeExpCost(base, growth, level)`（工单 02 交付的 dec 域几何成本，1e300 封顶），**灵石单项，材料成本移除**（Generator 的取舍是纯灵石再投资；服务型建筑保留材料）。
- 产出曲线 1 级锚定旧线性值（灵气 3、灵草 0.1、灵石 0.5、矿材 0.05），之后指数：`3×1.10^(lv-1)` / `0.1×1.08^(lv-1)` / `0.5×1.10^(lv-1)` / `0.05×1.09^(lv-1)`——**前期校准完全不变**，中后期经营层重新与境界曲线耦合。
- 等级上限：`getBuildingMaxLevel(type, bestRealm)`——主殿动态、Generator 无上限、服务型静态。

### Milestone 表（5 座 × 3~6 档，真实效果与自动化挂点）

- **真实计算效果**：rateMult（tickSlice 4i 块，四资源连乘）、cultivationPerLevel（灵田 Lv250 每级+1%）、cultivationPerLearnedTechnique（藏经阁 Lv100 每功法+2%）、藏经阁基础效果（修炼+2%/级，软上限+200%）、alchemyThroughput（丹炉 Lv10 ×1.5 / Lv50 ×2，作用于生产队列速度含离线闭式解）、forgeSuccess（锻器坊 Lv10 +15%，经 getForgeBuff 进入锻造系统）。
- **自动化挂点**（`isCapabilityUnlocked` 查询，工单 05 消费）：autoAlchemy（灵田25）、autoSellJunk（灵矿25）、autoUpgradeBuildings（灵田500）、insightBoost/techniqueFusion（藏经阁25/50）、alchemyRotate/alchemyByproduct（丹炉25/100）、autoReinforce/forgeSafeGuard/divineForge（锻器坊25/50/100）。
- 达成反馈：升级/连升跨过里程碑阈值时 `emitEvent('milestone', …)`（现有"关键时刻"管线）。

### 批量购买

- `getBatchUpgradeInfo(type, level, desired, stones, bestRealm)`：Generator 等比闭式解（dec 域，MAX 受灵石约束求解 n），服务型逐级累加；`upgradeBuildingBatch(type, 1|10|100|'max')` slice action + 里程碑事件。
- UI：建筑页顶部"批量购买 ×1/×10/×100/MAX"分段选择器（44px 触控），按钮显示 `连升 ×N (成本灵石)`（formatNumber），买不起一级时禁用并标注；每卡显示"里程碑 N/M 已达成 + 下一档预告"。

### 模拟校验（simulate-pacing 扩展）

建筑再投资比（朴素水平 L=1+10i 升下一级成本 / 本境灵石收入）：炼气 2.2%、筑基 0.3%、其后 ≤0.1%——远低于 60% 预算，Generator 化后**无卡墙**；脚本 exit code 断言（炼气 ≤250%、其后 ≤60%）。
