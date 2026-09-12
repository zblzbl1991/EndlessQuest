# 01 修复阻断性数值 bug（P0-a：B1 灵石断点 / B3 渡劫死数据 / B2 statBonus 死数据）

Type: task
Status: resolved
Blocked by: —

## Question

设计文档 §1.2 问题清单 B1/B2/B3/B5 中阻断或失真的三处，如何在不引入新系统的前提下修到可被单测证明？

### B1（P0 阻断）：最终突破灵石存不齐
- 事实：最终突破需 1,500,000 灵石（`src/data/realms.ts:103`），但硬上限 = `calcSpiritStoneCap(主殿10) × 5` = 1,400,000（`src/stores/sectStore/tickSlice.ts:409`、`src/systems/economy/ResourceEngine.ts:63-66`）。
- 修法（二选一，以最小改动优先）：a) 主殿软上限公式改为随主殿等级指数化，使满级硬上限 ≥ 1.5M 有余量；b) `BREAKTHROUGH_COSTS[5]` 下调到硬上限内。**必须同时**加"突破消耗与上限联动"的回归测试（消耗 ≤ 满级硬上限的 90%）。

### B3（P1）：化神/渡劫天劫不可达
- 事实：`TribulationSystem.shouldTriggerTribulation` 检查目标境界 `tribulationPower`，化神(4)/渡劫(5) 没有该字段 → 后期突破零天劫风险；`tribulationStages` 是死数据。
- 修法：给化神/渡劫补 `tribulationPower`（按设计文档 §5.4：每个大境界都有天劫，失败率随境界指数微增）；清理 `tribulationStages` 死数据或使其可达；引擎层 `calcBreakthroughFailureRate` 的双重 roll 与本修复合并验证，避免"两处失败率"叠加。

### B2（P1）：legacy statBonus 是死数据
- 事实：`getLegacyBonus`（`src/data/legacy.ts:96-119`）算出的 statBonus 只在 `LegacyPanel.tsx:45` 展示，无任何系统消费。
- 修法：statBonus 作为全局属性加成接入弟子战斗/属性计算管线（进入 `CultivationEngine` 属性成长或战斗统计入口，选择最小侵入点），并保证 `performAscension` 后该值真实生效。

### 顺带清理（同文件小改）
- B5：删除 `REALMS[].minorBreakthroughCost` 死数据或让测试改指 `MINOR_BREAKTHROUGH_COSTS`，两套表合一。

## Acceptance

1. 新增单测：主殿满级时灵石硬上限 ≥ `BREAKTHROUGH_COSTS[5].spiritStone`（或等价联动断言）。
2. 新增单测：→金丹/→元婴/→化神/→渡劫四条大境界突破路径均会触发天劫判定（`shouldTriggerTribulation` 返回 true）。
3. 新增单测：注入 legacy statBonus 后，弟子属性/速率计算结果确实变化（B2 生效证明）。
4. `npm test` 全量绿（基线 90 文件/1299 用例 + 新增）。

## Answer

全部按"最小改动"方案落地，`npm test` 91 文件 / 1310 用例全绿（基线 90/1299）。

### B1 灵石断点 — 选方案 a（上限公式指数化）
`ResourceEngine.calcSpiritStoneCap`（src/systems/economy/ResourceEngine.ts）主殿 >2 级段从 `(5000+3000lv)×(lv-2)` 改为 `(5000+3000lv)×1.5^(lv-2)`：
- 满级软上限 28 万 → 89.7 万，硬上限(×5, tickSlice.ts) 140 万 → 448.5 万，覆盖 150 万最终突破消耗（联动断言：消耗 ≤ 硬上限×90%）。
- lv≥3 每级上限均不低于旧值（lv3: 21000 vs 14000…），前期 lv1/2 上限不变（8000/11000，断言锁定）。

### B3 渡劫死数据 — 补 tribulationPower + 清死代码
- `realms.ts`：化神补 `tribulationPower: 1.2`、渡劫补 `tribulationPower: 1.5`（四条大境界突破路径均触发天劫，断言覆盖）。
- 删除化神的 `tribulationStages: [1.0,1.2,1.5]`（连同 `RealmDef.tribulationStages` 字段、`TribulationSystem.resolveTribulation` 的 stageMultiplier 不可达分支、`CultivationEngine.getTribulationPower` 的 stages 影子逻辑）——单一数据源 `tribulationPower`。
- 旧测试 `TribulationSystem.test.ts` 中"→渡劫不触发天劫"的断言改为新行为（true）。

### 失败率去叠（附加工单要求）
`BreakthroughCoordinator.processBreakthrough`：`tribulationTriggered` 时（渡劫 roll 即失败判定）标准路径与"渡劫失败但梯度给了成功"路径的 `calcBreakthroughFailureRate` 二次 roll 一律置 0；非天劫突破（小境界、→筑基）保留引擎层 roll。测试用随机序列区分：mock [0.9, 0.15, 0.2] —— 旧叠层会把 0.2(<35%) 交给引擎 roll 静默失败，新逻辑 realm 推进到 5。

### B2 statBonus 接入战斗管线
- `enemies.createCharacterCombatUnit` 增加第 5 参 `legacyStatBonusPercent`（默认 0），`legacyMultiplier = 1 + bonus/100` 并入 `totalMultiplier`（realm × quality × specialty × legacy）。
- `adventureStore` 三处调用点（collectCombatUnits / startRun 成员初始化 / startAdventureFromConfig）传入 `sect.legacy.statBonus`——飞升加成现真实作用于远征战斗单位 hp/atk/def/spd（断言：bonus 50 → 恰好 ×1.5；bonus 0 → 与无参一致）。
- `LegacySystem.performAscension` 原有写入逻辑无需改动。

### B5 两套小境界消耗表合一
删除 `RealmDef.minorBreakthroughCost` 与 `getMinorBreakthroughCost`（唯一消费方是测试），`data.test.ts` 改测生效表 `MINOR_BREAKTHROUGH_COSTS` / `getBreakthroughResourceCost`。

### 验收对照
1. ✅ 上限 ≥ 最终突破灵石 + 90% 联动断言（blockingNumericFixes.test.ts）
2. ✅ →金丹/→元婴/→化神/→渡劫 四条路径触发天劫
3. ✅ statBonus 乘入战斗单位（×1.5 断言）
4. ✅ `npm test` 91/1310 全绿；eslint 改动文件零告警
