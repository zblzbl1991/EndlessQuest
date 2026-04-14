# 中期分叉 / 风险收益 / 产线博弈深化

## Goal

让 EndlessQuest 从"会自己运转的挂机宗门"进化为"因玩家押注不同方向而长成不同命运的挂机宗门"。

解决 3 个核心玩法问题：
1. 中期循环容易收敛成"守瓶颈、跑模板"
2. 风险收益曲线不够尖锐，高风险诱惑不足
3. 建筑系统更像调度台，尚未形成有张力的产线博弈

## Scope

4 个 Phase，每次只实现一个 Phase，每个 Phase 必须有类型+系统+UI+测试的完整闭环。

### Phase 1: 路线人格与专项生产骨架
- 玩家能看到当前宗门路线，能手动切换路线
- 玩家能开启阶段专项，建筑页展示专项收益与牺牲
- 宗门页展示双路径阶段目标（不再只有单一路径）

### Phase 2: 高风险独占收益与模板可信度
- 远征页模板显示风险标签（安稳/压榨/押注/命搏）
- 高风险模板显示独占奖励，不再只写"收益更高"
- 模板可信度随成功/失败变化，战报展示押注结果

### Phase 3: 路线化解题与关键弟子转型
- 同一瓶颈在不同路线下给出不同解法建议
- 新招募弟子可触发路线转型机会
- 离线报告展示转型提示

### Phase 4: 路线-风险-产线三者闭环联动
- 专项生产真实改变高风险收益表现
- 高风险奖励提供转型资源
- 建筑高阶解锁经营权力
- 离线报告讲清"为什么这次赌得值/不值"

## Design Docs

- 设计稿: `docs/superpowers/specs/2026-04-13-midgame-branching-risk-production-deepening.md`
- 执行清单: `docs/superpowers/specs/2026-04-13-midgame-deepening-claudecode-execution-checklist.md`

## Constraints

1. 不增加高频微操，所有深度体现在方针/模板/专项/押注层面
2. 不破坏现有归墟终盘循环和离线报告链路
3. 每个Phase必须: 有玩家可见反馈 + 有测试覆盖 + `npm run build` 通过
4. 不允许先把所有 types 加满但没有 UI 入口
5. 老存档必须能正常打开（缺字段自动补默认值）

## Acceptance Criteria (Phase 1) -- DONE

- [x] `SectArchetype` / `ProductionCampaign` 类型定义在 `src/types/sect.ts`
- [x] `Sect` 接口新增 `currentArchetype` 字段
- [x] `SectAutomationSettings` 新增 `routeShift` / `productionCampaign` 字段
- [x] `initial.ts` 包含完整默认值，老存档缺字段不崩
- [x] `src/data/sectArchetypes.ts` 和 `src/data/productionCampaigns.ts` 数据表
- [x] `SectArchetypeSystem.ts`: 路线切换检查、modifier 计算、磨合期逻辑
- [x] `ProductionCampaignSystem.ts`: 专项启停、冷却、duration tick
- [x] `strategySlice.ts`: `setArchetype` / `startProductionCampaign` / `cancelProductionCampaign`
- [x] `tickSlice.ts`: 推进专项持续时间和冷却，推进磨合期倒计时
- [x] 宗门页新增: 路线卡 + 专项卡 + 双路径目标卡
- [x] 建筑页新增: 专项生产面板 + 产线倾斜摘要
- [x] 单元测试: `SectArchetypeSystem.test.ts` + `ProductionCampaignSystem.test.ts`
- [x] `npm run build` 通过

## Acceptance Criteria (Phase 2) -- DONE

- [x] `RiskTier` / `TemplateConfidenceEntry` / `RiskHookDescriptor` 类型定义在 `src/types/sect.ts`
- [x] `ExpeditionTemplate` 新增 `riskTier` / `riskHookDescriptor` 字段
- [x] `SectAutomationSettings` 新增 `templateConfidence` 字段
- [x] `AdventureReport` / `AdventureReportSummary` 新增风险相关字段
- [x] `initial.ts` / `SaveSystem.ts` 含默认值，老存档兼容
- [x] `expeditionTemplates.ts` 每个模板有 `riskTier` 和 `riskHookDescriptor`
- [x] `RiskRewardSystem.ts`: 根据 riskTier + archetype + rewardFocus 返回收益修正和风险描述
- [x] `TemplateConfidenceSystem.ts`: 成功提高 / 失败降低 confidence，连胜连败额外波动
- [x] `SectAutomationSystem.ts` 追加 archetype+risk 修正层
- [x] `adventureStore.ts` 远征结束后更新模板可信度
- [x] 远征页新增: 风险阶层标签 + 独占奖励预览 + 模板可信度 + 路线适配
- [x] 战报页新增: 风险标签 + 押注结果 + 可信度变化
- [x] 单元测试: `RiskRewardSystem.test.ts` + `TemplateConfidenceSystem.test.ts`
- [x] `npm run build` 通过

## Acceptance Criteria (Phase 3) -- DONE

- [x] `RouteOpportunity` 类型定义在 `src/types/sect.ts`，`Sect` 接口新增 `routeOpportunities` 字段
- [x] `RouteOpportunitySystem.ts`: 根据弟子成长倾向/专长/词缀/命格判断路线机会
- [x] `ArchetypeBottleneckAdvisor.ts`: 同一瓶颈按不同路线生成不同建议
- [x] `SectBottleneckSystem.ts` 扩展为按路线输出不同建议（`archetypeAdvice`）
- [x] `SectGoalSystem.ts` 输出结构补充推荐路线、立即收益、代价
- [x] `characterSlice.ts`: 新弟子加入时检查路线机会
- [x] `initial.ts` / `SaveSystem.ts` 含 `routeOpportunities` 默认值
- [x] 宗门页新增: 路线机会卡 + 瓶颈解法卡
- [x] 离线报告新增: 转型提示 + 路线机会反馈
- [x] 单元测试: `RouteOpportunitySystem.test.ts` + `SectBottleneckArchetypeAdvice.test.ts`
- [x] `npm run build` 通过

## Technical Notes

- 现有 `productionFocus` (balanced/cultivation/crafting) 是简单枚举，新 `ProductionCampaign` 是更高层的阶段专项，两者共存
- 现有 `strategySlice` 只管理 policy cooldown，在其上扩展 archetype 切换逻辑
- `SectGoalSystem` 已很重，双路径目标用平行结构 `SectStagePathOption` 而不是继续堆入
- `tickSlice.tickAll` 约 665 行，只追加路线/专项的状态推进，不重构核心 tick 逻辑
- `SectAutomationSystem` 是接风险层和路线层的最佳入口，Phase 2 再动
