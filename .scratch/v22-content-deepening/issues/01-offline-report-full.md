# 01 闭关报告完整版：击杀 / 装备 / 秘境统计入离线报告

Type: task
Status: resolved
Blocked by: —
Assignee: zcode (2026-09-13)

## Question

如何把离线报告从"资源结算"升级为设计稿 §十一 的完整版：玩家回来首先看到"宗门经历了什么"，包括战斗与探索维度的统计？（V2.2 map 工单 01；现状 accumulator 只有资源/突破/炼制/税收/灵气短缺五类）

### 范围

1. **统计管线盘点**：击杀、装备获取、装备分解（自动出售凡品）、秘境探索次数/层数发生在 adventureStore（在线 run 与离线 tickAllIdle 两条路径）——盘点两类路径的统计写入点，确定"周期内增量"如何汇入 `offlineAccumulator`（在线：adventureStore 结算时写入；离线：tickAllIdle 的 run 结算同步写入）。
2. **OfflineAccumulator 扩展**（可选字段，零迁移）：`kills`、`equipmentGained`、`equipmentSold`（含自动出售凡品的量）、`dungeonRuns`、`dungeonFloorsCleared`；tick 结算/飞升重置/SaveSystem normalize 三处对齐。
3. **报告 UI**：OfflineReportModal 新增"战斗与探索"分区（击杀 N · 秘境探索 X 次 · 装备 +Y / 分解 Z），空态不渲染；"自上次拜访"摘要段可选纳入探索次数。
4. **事件文案**：离线期间完成的秘境在"宗门发生了什么"notableEvents 里有对应条目（复用现有叙事管线，若无则补一条聚合事件）。
5. 单测：accumulator 字段在两条路径（在线结算 / tickAllIdle）下正确累计；飞升清零；normalize 兼容旧档缺字段。

### 不做

- 道祖榜自比（工单 05）；报告美术重做；逐事件全文列举（保持聚合统计粒度）。

## Acceptance

1. 单测：离线路径挂机 N 秒后 accumulator 击杀/装备/秘境统计非零且数值合理；在线结算路径同样入账。
2. UI：报告"战斗与探索"分区渲染正确、空态不渲染。
3. `npm test` 全量绿。

## Answer

`npm test` 111 文件 / 1477 用例全绿（+1 文件 +7 用例）；`tsc --noEmit` 0 错误。

### 统计管线（盘点结论 + 统一漏斗）

写入点共四处，全部经新模块 `systems/sect/OfflineStats.ts` 的 `bumpOfflineAccumulator`（唯一累加漏斗，负增量视为 0、可选字段旧档兼容）：
1. **completeRun**（在线完成 + 离线 idleTick 共用漏斗）：dungeonRuns +1、floorsCleared = currentFloor−1、equipmentGained = 结算 itemRewards 装备件数；
2. **failRun**（失败结算）：同口径计入（失败的探索也是经历）；
3. **战斗结算块**（statBattles > 0 时）：kills += statKills（与 totalKills 同点位同口径）；
4. **出售路径双覆盖**：itemSlice.sellItem（手动，equipment 类型按 quantity）+ tickSlice 自动出售凡品清扫（autoSellSweptCount 并入 accumulator 更新块）。

### 类型与持久化

OfflineAccumulator 新增 5 个可选字段（kills/equipmentGained/equipmentSold/dungeonRuns/dungeonFloorsCleared）——零迁移；SaveSystem normalize 补缺省；performAscension 重置清单同步清零。

### UI

OfflineReportModal 新增"战斗与探索"分区（击败敌人 / 秘境探索 N 次·X 层 / 装备获取 +N 件 / 出售分解 N 件），全零空态不渲染；App.tsx 组装 combatStats。

### 测试

OfflineReportFull 7 用例：漏斗累加（负值归零/旧档缺字段兼容）、countEquipmentItems 口径（按件不按类型）、store action 多次累计 + 飞升清零（夹具需过 canAscend 全建筑 ≥5）、手动出售入账、UI 分区渲染/空态。
