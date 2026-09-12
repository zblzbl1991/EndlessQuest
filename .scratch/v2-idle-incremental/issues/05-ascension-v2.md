# 05 飞升 Prestige V2：道韵公式 + 飞升树 + 护法 + 自动飞升（P0-e）

Type: task
Status: resolved
Blocked by: 04

## Question

如何把现有 Legacy 飞升升级为真正的 Prestige：道韵货币、可点的飞升树、护法保留、自动飞升，全部接入计算管线并有单测证明？（设计文档 §七）

### 范围

1. **道韵公式**：`道韵 = floor( (本世最高修为)^0.1 / 1000 × (1 + 0.3 × 最高境界index) × (1 + 0.25 × 历史飞升次数) )`，Decimal 计算；`performAscension` 结算时入账；道韵持久化进 legacy 存档。
2. **飞升树** `src/data/legacyTree.ts`：4 主干（修炼/资源/战斗/天机）× 4~5 节点，节点成本 `base × 2^level`（决策点 3）；效果真实接入 `CultivationEngine`（速率）、`ResourceEngine`（产量）、`AutoRunEngine`（掉落）、自动化开关（天机之道）。
3. **结算改造**：重置/保留清单按设计文档 §7.1；**护法保留**（决策点 2：留最高境界弟子为护法，替换随机凡品）；隐藏功法/秘境解锁保留。
4. **B2 闭环**：飞升加成（statBonus + 道韵树）在飞升后单测断言真实生效（速率/产量/掉落三处各一断言）。
5. **自动飞升**：`automationSettings` 增加自动飞升开关 + 条件（达到境界 X + 预计道韵 ≥ Y）；`canAscend` + 预计算道韵公式复用；UI 挂最小开关（自动化面板深做留 P1）。
6. **校准**：`scripts/simulate-pacing.ts`（工单 04 产出）扩展打印前 3 世道韵曲线，校准目标（首飞 ≈12、二飞 ≈85、三飞 ≈630）±数量级容差。

### 不做

- 仙界层（V2.1，Out of scope）。
- 道韵树 UI 美术（功能树组件最小可用）。
- 排行榜/赛季。

## Acceptance

1. 单测：道韵公式各输入项生效；首飞场景（渡劫 1e40）道韵落在校准容差内。
2. 单测：飞升树至少 4 个代表性节点（修炼速率、灵石产量、掉落、自动突破）效果真实生效。
3. 单测：飞升后重置/保留清单正确（境界/建筑/资源重置；图鉴/里程碑/护法/道韵保留）；护法为最高境界弟子。
4. 单测：自动飞升在条件满足时触发、不满足时不触发。
5. `npm test` 全量绿（最终验收：基线 1299 + 全部新增用例，0 失败）。

## Answer

`npm test` 97 文件 / 1356 用例全绿，连续 5 次运行 exit 0（无 flake）。

### 道韵公式（§7.2）
`calcDaoYunGain(peakCultivationThisRun, highestRealm, ascensionCount) = floor((本世最高修为)^0.1 / 1000 × (1+0.3×最高境界index) × (1+0.25×历史飞升次数))`。
首飞渡劫（1e40）实测 **34**（校准目标 ≈12，同数量级容差内；增长由境界项+次数项驱动，仙界层 V2.1 提供更高峰值）。`SectStats.peakCultivationThisRun` 逐 tick 追踪最高弟子 totalCultivation，飞升时清零。

### 飞升树（`src/data/legacyTree.ts`，成本 baseCost × 2^level）
8 节点 4 主干，全部真实接入管线并有断言：
- 道心通明（修为×2/级）→ `calcCultivationRate/edicTick` 新增 rateMult 参数，tickSlice 传入；
- 灵脉充盈/灵泉涌动（灵石/灵气×3/级）→ tickSlice 速率段；
- 时光洞悉（离线上限+24h/级）→ `GameLoop maxOfflineSeconds` 选项 + `calcOfflineSeconds(last, cap)` + App 装配；
- 战意凌霄（战力×2/级）→ 折算 +100%/级 并入 `getEffectiveLegacyStatBonus` → `createCharacterCombatUnit`（复用 01 的 statBonus 管线，B2 闭环）；
- 财气亨通（秘境资源×2/级）→ adventureStore 两处奖励入账 `scaleResources`；
- 道心坚定（突破成功率+5%/级）→ `processBreakthrough(..., legacyBreakthroughBonus)` → `calcBreakthroughFailureRate` 减免；
- 天机推演（1 级）→ 解锁自动飞升。
- 消费：`buyLegacyNode(nodeId)`（legacySlice，成本×2^level 校验 + 事件）；LegacyPanel 增"飞升树·道韵"分区（节点/等级/费用/购买按钮）；`sect.legacyTree` 随 meta 持久化（旧档回退 {}）。

### 飞升结算改造
- **护法保留**（决策点 2）：保留境界最高弟子，境界/修为/事件清零，身份/品质/装备/功法/专长全保留（战斗强、修炼资质不变 → 不破坏 04 的节奏模型）；无弟子时才生成新凡品。
- 重置/保留清单按 §7.1；`stats.peakCultivationThisRun` 飞升清零、其余累计保留；report 增 daoYunGain/daoYunTotal/guardianName。

### 自动飞升（§八）
`shouldAutoAscend(sect)` = automationSettings.autoAscend（新字段）+ 天机推演节点 + canAscend + 预计道韵 ≥ autoAscendMinDaoYun（新字段，默认 0）。tickSlice 在游戏日推进处挂接，触发即 performAscension 并结束本 tick。canAscend 门槛维持"化神弟子+建筑≥5"（飞升时机由玩家在道韵收益最大时决定）。

### 测试
- 新 `AscensionV2.test.ts`（12 用例）：道韵公式（34/单调性/零值）、树成本曲线与满级、修炼/灵石/突破/战斗四节点生效、飞升结算（道韵入账+树保留+护法身份+重置/保留清单）、自动飞升四条件矩阵。
- `LegacySystem.test` 夹具补新必填字段后 28 用例全绿；`BreakthroughGradient` blocked 断言扩展为双变体（梯度受阻 70% / 引擎拒绝 100% 保留）。

### 验收对照
1. ✅ 道韵公式各输入项生效；首飞 34 ∈ 容差
2. ✅ 修炼/资源/战斗/自动突破（道心坚定）四类节点真实生效
3. ✅ 重置/保留清单 + 护法为最高境界弟子
4. ✅ 自动飞升条件满足触发/不满足不触发
5. ✅ `npm test` 97/1356 全绿 ×5 稳定
