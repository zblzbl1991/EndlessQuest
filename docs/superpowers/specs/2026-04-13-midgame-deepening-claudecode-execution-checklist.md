# EndlessQuest 中期深化方案 Claude Code 执行清单
**日期**: 2026-04-13  
**状态**: Claude Code 开发执行稿  
**对应设计稿**:
- `docs/superpowers/specs/2026-04-13-midgame-branching-risk-production-deepening.md`
- `docs/superpowers/specs/2026-04-10-idle-cultivation-product-realignment.md`

---

## 一、使用方式

本清单不是产品稿，而是给 Claude Code 的工程执行稿。  
目标是让 Claude Code 能按阶段直接修改代码，而不是先自行重新拆需求。

执行要求：

1. 每次只实现一个 Phase。
2. 每个 Phase 必须包含：
   - 类型与默认值
   - 系统逻辑
   - 页面展示
   - 测试
3. 每个 Phase 收尾必须跑：
   - `npm run build`
   - 与本 Phase 相关的测试
4. 不允许先把所有 types 一次性加完但没有 UI 反馈。
5. 不允许为了接新系统破坏当前归墟终盘循环和离线报告链路。

---

## 二、现有代码基线

Claude Code 开工前应优先确认以下文件：

### 类型层
- [sect.ts](/E:/projects/EndlessQuest/src/types/sect.ts)
- [adventure.ts](/E:/projects/EndlessQuest/src/types/adventure.ts)
- [index.ts](/E:/projects/EndlessQuest/src/types/index.ts)

### store 层
- [initial.ts](/E:/projects/EndlessQuest/src/stores/sectStore/initial.ts)
- [strategySlice.ts](/E:/projects/EndlessQuest/src/stores/sectStore/strategySlice.ts)
- [tickSlice.ts](/E:/projects/EndlessQuest/src/stores/sectStore/tickSlice.ts)
- [buildingSlice.ts](/E:/projects/EndlessQuest/src/stores/sectStore/buildingSlice.ts)
- [adventureStore.ts](/E:/projects/EndlessQuest/src/stores/adventureStore.ts)

### system 层
- [SectAutomationSystem.ts](/E:/projects/EndlessQuest/src/systems/sect/SectAutomationSystem.ts)
- [SectGoalSystem.ts](/E:/projects/EndlessQuest/src/systems/sect/SectGoalSystem.ts)
- [SectBottleneckSystem.ts](/E:/projects/EndlessQuest/src/systems/sect/SectBottleneckSystem.ts)
- [OfflineNarrativeSystem.ts](/E:/projects/EndlessQuest/src/systems/sect/OfflineNarrativeSystem.ts)
- [SectRumorSystem.ts](/E:/projects/EndlessQuest/src/systems/sect/SectRumorSystem.ts)

### 页面层
- [SectPage.tsx](/E:/projects/EndlessQuest/src/pages/SectPage.tsx)
- [AdventurePage.tsx](/E:/projects/EndlessQuest/src/pages/AdventurePage.tsx)
- [BuildingsPage.tsx](/E:/projects/EndlessQuest/src/pages/BuildingsPage.tsx)
- [AdventureReportPage.tsx](/E:/projects/EndlessQuest/src/pages/AdventureReportPage.tsx)
- [OfflineReportModal.tsx](/E:/projects/EndlessQuest/src/components/common/OfflineReportModal.tsx)

### 当前实现里需要特别注意的现状

1. 现有 `strategySettings` 只管理 policy cooldown，不够承载“中期路线人格”。
2. 现有 `automationSettings` 适合继续扩展模板可信度和专项生产状态。
3. 现有 `SectGoalSystem` 已经很重，要避免继续把所有逻辑堆进去。
4. 现有 `BuildingsPage` 已有 `productionFocus`、高水位规则和自动派驻，要在其上增量扩展，不要推翻。
5. 现有 `SectAutomationSystem` 已负责模板与队伍选择，是接风险层和路线层的最佳入口。

---

## 三、Phase 1：路线人格与专项生产骨架

## 3.1 目标

先让玩家能明确感知：

- 当前宗门走什么中期路线
- 当前宗门这 8 小时在押什么专项
- 当前阶段至少有两条合理路径可选

本阶段不追求完整风险联动，只先把“路线”和“专项”站起来。

## 3.2 需要新增的类型

修改文件：
- [sect.ts](/E:/projects/EndlessQuest/src/types/sect.ts)

新增：

```ts
export type SectArchetype = 'swordBurst' | 'pillSustain' | 'arrayGuard' | 'beastHarvest'

export type ProductionCampaign =
  | 'realmSprint'
  | 'forgeSprint'
  | 'recoverySprint'
  | 'expeditionPrep'
  | 'marketHarvest'

export interface RouteShiftState {
  currentArchetype: SectArchetype
  lastShiftAtDay: number | null
  shiftCooldownDays: number
  pendingShift: SectArchetype | null
  blendDaysRemaining: number
}

export interface ProductionCampaignState {
  activeCampaign: ProductionCampaign | null
  startedAtDay: number | null
  durationHours: number
  cooldownHours: number
  cooldownRemainingHours: number
}
```

需要接入位置：

```ts
interface Sect {
  ...
  currentArchetype: SectArchetype
}

interface SectAutomationSettings {
  ...
  routeShift: RouteShiftState
  productionCampaign: ProductionCampaignState
}
```

## 3.3 默认值与存档兼容

修改文件：
- [initial.ts](/E:/projects/EndlessQuest/src/stores/sectStore/initial.ts)
- [SaveSystem.ts](/E:/projects/EndlessQuest/src/systems/save/SaveSystem.ts)
- [LegacySystem.ts](/E:/projects/EndlessQuest/src/systems/sect/LegacySystem.ts)

默认值建议：

```ts
currentArchetype: 'pillSustain'

routeShift: {
  currentArchetype: 'pillSustain',
  lastShiftAtDay: null,
  shiftCooldownDays: 3,
  pendingShift: null,
  blendDaysRemaining: 0,
}

productionCampaign: {
  activeCampaign: null,
  startedAtDay: null,
  durationHours: 8,
  cooldownHours: 4,
  cooldownRemainingHours: 0,
}
```

存档兼容要求：

- 老存档没有这些字段时自动补默认值。
- 不允许因为缺字段导致 UI 渲染崩掉。
- `LegacySystem` 轮回重置时保留 `currentArchetype`，但清空正在进行中的 `productionCampaign`。

## 3.4 新增数据文件

新增文件：
- `src/data/sectArchetypes.ts`
- `src/data/productionCampaigns.ts`

### `sectArchetypes.ts`

导出：

```ts
interface SectArchetypeDescriptor {
  id: SectArchetype
  name: string
  summary: string
  strengths: string[]
  weaknesses: string[]
  focusBuildings: BuildingType[]
  focusRewardTypes: ExpeditionRewardFocus[]
}
```

### `productionCampaigns.ts`

导出：

```ts
interface ProductionCampaignDescriptor {
  id: ProductionCampaign
  name: string
  summary: string
  boosts: string[]
  suppressions: string[]
  bestForArchetypes: SectArchetype[]
}
```

## 3.5 新增系统

新增文件：
- `src/systems/sect/SectArchetypeSystem.ts`
- `src/systems/sect/ProductionCampaignSystem.ts`

### `SectArchetypeSystem.ts` 需要提供

```ts
export function canShiftArchetype(...)
export function buildArchetypeSummary(...)
export function getArchetypeModifiers(archetype: SectArchetype)
```

当前 Phase 只需要先给出轻量 modifier：

- 闭关收益倍率
- 远征推进倍率
- 恢复倍率
- 资源型模板倍率

### `ProductionCampaignSystem.ts` 需要提供

```ts
export function canStartProductionCampaign(...)
export function tickProductionCampaign(...)
export function getCampaignModifiers(campaign: ProductionCampaign | null)
```

当前 Phase 只需支持：

- 启动专项
- 结束专项
- 冷却倒计时
- 返回专项增益说明

## 3.6 store 改造

修改文件：
- [strategySlice.ts](/E:/projects/EndlessQuest/src/stores/sectStore/strategySlice.ts)
- [tickSlice.ts](/E:/projects/EndlessQuest/src/stores/sectStore/tickSlice.ts)
- `src/stores/sectStore/types.ts`

### `strategySlice.ts`

新增 action：

```ts
setArchetype(archetype: SectArchetype): { success: boolean; reason: string }
startProductionCampaign(campaign: ProductionCampaign): { success: boolean; reason: string }
cancelProductionCampaign(): void
```

要求：

- `setArchetype` 检查 cooldown。
- 切换成功时同步更新 `sect.currentArchetype` 和 `automationSettings.routeShift`。
- `startProductionCampaign` 检查冷却和当前是否已有专项。

### `tickSlice.ts`

新增职责：

- 推进专项持续时间
- 推进专项冷却
- 推进路线磨合期倒计时

注意：

- 不要在 `tickSlice` 直接写大量描述文本。
- 只做状态推进。

## 3.7 宗门页改造

修改文件：
- [SectPage.tsx](/E:/projects/EndlessQuest/src/pages/SectPage.tsx)
- [SectPage.module.css](/E:/projects/EndlessQuest/src/pages/SectPage.module.css)

新增 3 个 UI 模块：

### A. 宗门路线卡

显示：

- 当前路线名称
- 路线一句话总结
- 2 条优势
- 1 条劣势
- “切换路线”按钮
- 若在 cooldown 中，显示剩余时间

### B. 当前专项卡

显示：

- 当前是否有专项
- 专项剩余时间
- 专项提升了什么
- 专项压制了什么
- “启动专项”按钮入口

### C. 双路径阶段目标卡

不要替换现有目标卡，而是在现有目标体系上新增一个“路径选择”区域。

展示结构：

- 路径 A
  - 标题
  - 立即收益
  - 代价
  - 推荐路线
- 路径 B
  - 同上

当前 Phase 先允许使用轻量 heuristics 生成，不要求完全智能。

## 3.8 建筑页改造

修改文件：
- [BuildingsPage.tsx](/E:/projects/EndlessQuest/src/pages/BuildingsPage.tsx)
- [BuildingsPage.module.css](/E:/projects/EndlessQuest/src/pages/BuildingsPage.module.css)

新增区域：

### A. 专项生产面板

展示全部 `ProductionCampaign`：

- 名称
- 简介
- 主要增益
- 主要牺牲
- 是否适配当前路线
- 启动按钮

### B. 当前产线倾斜摘要

用“偏向文字卡”而不是复杂图表：

- 灵石当前更偏向：闭关 / 远征 / 锻造 / 市场
- 灵草当前更偏向：恢复 / 突破 / 补给
- 矿材当前更偏向：锻造 / 出售 / 外勤

当前 Phase 可以先用 descriptor 文案，不需要做完整预算引擎。

## 3.9 测试

新增测试建议：

- `SectArchetypeSystem.test.ts`
- `ProductionCampaignSystem.test.ts`

修改现有测试：

- `SectPage.test.tsx`
- `BuildingsPage` 相关测试文件，如没有则新增 `BuildingsPageCampaigns.test.tsx`

覆盖点：

- 切换路线成功 / 失败
- 专项启动 / 冷却 / 结束
- 宗门页能显示路线卡和专项卡
- 建筑页能显示专项说明

## 3.10 Phase 1 验收标准

- 老存档正常打开
- 宗门页能看到当前路线和专项
- 建筑页可启动专项
- 玩家能看到两条阶段路径
- `npm run build` 通过

---

## 四、Phase 2：高风险层与模板可信度

## 4.1 目标

让远征页第一次明确出现：

- 这是稳刷模板还是押注模板
- 这条模板到底在赌什么
- 最近这套模板跑得稳不稳

## 4.2 类型扩展

修改文件：
- [sect.ts](/E:/projects/EndlessQuest/src/types/sect.ts)
- [adventure.ts](/E:/projects/EndlessQuest/src/types/adventure.ts)

新增：

```ts
export type RiskTier = 'safe' | 'press' | 'gamble' | 'destiny'

export interface TemplateConfidenceEntry {
  templateId: string
  score: number
  lastAdjustedAtDay: number | null
}

export interface RiskHookDescriptor {
  title: string
  exclusiveRewards: string[]
  likelyPenalty: string[]
  bestForArchetypes: SectArchetype[]
}
```

接入：

```ts
interface SectAutomationSettings {
  ...
  templateConfidence: TemplateConfidenceEntry[]
}
```

## 4.3 数据层

修改文件：
- `src/data/expeditionTemplates.ts`

要求：

为每个模板补：

- `riskTier`
- `riskHookDescriptor`

如果当前模板类型定义不支持，先扩展模板 descriptor 层，不一定要写回 `ExpeditionTemplate` 实体。

## 4.4 新增系统

新增：
- `src/systems/adventure/RiskRewardSystem.ts`
- `src/systems/adventure/TemplateConfidenceSystem.ts`

### `RiskRewardSystem.ts`

负责：

- 根据 `riskTier + currentArchetype + rewardFocus` 返回收益修正
- 返回风险描述
- 返回失败后的节奏惩罚 bundle

### `TemplateConfidenceSystem.ts`

负责：

- 成功提高 confidence
- 失败降低 confidence
- 连胜 / 连败额外波动
- 输出玩家可读状态：
  - 稳定
  - 可优化
  - 波动较大
  - 建议降档

## 4.5 修改 `SectAutomationSystem.ts`

文件：
- [SectAutomationSystem.ts](/E:/projects/EndlessQuest/src/systems/sect/SectAutomationSystem.ts)

本阶段只做 3 件事：

1. 读取 `sect.currentArchetype`
2. 读取模板 `riskTier`
3. 在 `buildAutomationRunConfig` 中把：
   - 队伍选择
   - `automationStrategy`
   - `tacticalPreset`
   - supply 倾向
   受路线与风险共同影响

不要在本阶段彻底推翻现有选择逻辑。  
建议方式：在当前逻辑基础上追加修正层。

## 4.6 修改 `adventureStore.ts`

要求：

- 每次远征结束后，按结果更新模板可信度
- 在 report summary 中记录本次：
  - riskTier
  - confidence 状态
  - 是否属于高风险模板

如果已有 report summary 结构不足，增量扩展，不要破坏现有字段。

## 4.7 远征页 UI

修改文件：
- [AdventurePage.tsx](/E:/projects/EndlessQuest/src/pages/AdventurePage.tsx)
- [AdventurePage.module.css](/E:/projects/EndlessQuest/src/pages/AdventurePage.module.css)

新增显示：

### A. 风险阶层标签

展示为：
- 安稳修行
- 压榨推进
- 押注奇遇
- 命数之搏

### B. 独占奖励预览

展示当前模板可能赌到的东西，不要只写“收益更高”。

### C. 模板可信度

展示：
- 文本状态
- 最近趋势
- 是否建议调参

### D. 路线适配

展示当前模板更适合哪条宗门路线。

## 4.8 战报页 UI

修改文件：
- [AdventureReportPage.tsx](/E:/projects/EndlessQuest/src/pages/AdventureReportPage.tsx)

新增：

- 本次模板风险标签
- 本次是否属于押注
- 这次赌到了什么
- 这次伤到了什么节奏
- 模板可信度变化

## 4.9 测试

新增：

- `RiskRewardSystem.test.ts`
- `TemplateConfidenceSystem.test.ts`

修改：

- `AdventurePage.test.tsx`
- `AdventureReportPage.test.tsx`
- `stores.test.ts` 或与 `adventureStore.ts` 对应的现有 store 测试

## 4.10 Phase 2 验收标准

- 远征页所有模板都能看到风险标签
- 至少高风险模板会显示独占奖励
- 战报会展示本次押注结果
- 模板可信度能随成功 / 失败变化

---

## 五、Phase 3：路线化解题与关键弟子转型

## 5.1 目标

让“同一个瓶颈有不同路线解法”真正生效。  
让弟子获得成为宗门改路机会，而不是纯战力更新。

## 5.2 新增类型

修改文件：
- [sect.ts](/E:/projects/EndlessQuest/src/types/sect.ts)

新增：

```ts
export interface RouteOpportunity {
  characterId: string
  suggestedArchetype: SectArchetype
  reason: string
  expiresAfterDays: number
}
```

接入：

```ts
interface Sect {
  ...
  routeOpportunities: RouteOpportunity[]
}
```

## 5.3 新增系统

新增：
- `src/systems/sect/RouteOpportunitySystem.ts`
- `src/systems/sect/ArchetypeBottleneckAdvisor.ts`

### `RouteOpportunitySystem.ts`

负责：

- 根据弟子成长倾向、专长、词缀、命格判断是否触发路线机会
- 生成玩家可理解理由

输入建议使用：

- `CharacterDispositionSystem.ts`
- `SpecialtySystem.ts`
- 角色基础属性与成长倍率

### `ArchetypeBottleneckAdvisor.ts`

负责：

- 对同一个瓶颈按不同路线生成不同建议

例如：

输入：`recovering`

输出：
- `pillSustain`：改走恢复专项，降低远征补给档位
- `arrayGuard`：调整模板回到保守并提高防线
- `swordBurst`：缩短战斗，提爆发模板

## 5.4 修改 `SectBottleneckSystem.ts`

当前它只输出瓶颈和统一建议。  
本阶段要扩展为：

```ts
interface SectBottleneckAdvice {
  defaultSuggestion: string
  byArchetype?: Partial<Record<SectArchetype, string>>
}
```

页面先只展示：

- 当前宗门路线建议
- 另 1 条备选路线建议

## 5.5 修改 `SectGoalSystem.ts`

要求：

- 从“单目标排序”进化为“路径竞争推荐”
- 输出结构里补充：
  - 推荐路线
  - 立即收益
  - 代价

不要求推翻现有 `SectStageGoal`，可以新增平行结构 `SectStagePathOption`。

## 5.6 修改角色相关流程

需要接入点：

- [characterSlice.ts](/E:/projects/EndlessQuest/src/stores/sectStore/characterSlice.ts)
- [CharacterEngine.ts](/E:/projects/EndlessQuest/src/systems/character/CharacterEngine.ts)

要求：

- 新弟子加入宗门时，检查是否触发 `RouteOpportunity`
- 如触发，写入 `sect.routeOpportunities`
- 同时写入事件日志 / 风闻

## 5.7 宗门页 UI

新增：

### A. 路线机会卡

展示：

- 哪位弟子触发了什么路线机会
- 为什么
- 是否考虑切换路线

### B. 瓶颈解法卡

展示：

- 当前瓶颈
- 当前路线推荐解
- 一条备选路线解

## 5.8 离线报告 UI

修改文件：
- [OfflineNarrativeSystem.ts](/E:/projects/EndlessQuest/src/systems/sect/OfflineNarrativeSystem.ts)
- [OfflineReportModal.tsx](/E:/projects/EndlessQuest/src/components/common/OfflineReportModal.tsx)

新增反馈：

- 新弟子带来的路线机会
- 当前阶段最值得考虑的转型提示

## 5.9 测试

新增：

- `RouteOpportunitySystem.test.ts`
- `SectBottleneckArchetypeAdvice.test.ts`

修改：

- `SectPage.test.tsx`
- `OfflineNarrativeSystem.test.ts`

## 5.10 Phase 3 验收标准

- 同一瓶颈在不同路线下会给出不同建议
- 新弟子可以触发路线机会
- 宗门页能显示“是否围绕此人转型”

---

## 六、Phase 4：路线、风险、产线三者闭环

## 6.1 目标

让三条线真正联动：

- 宗门路线决定怎么赌
- 生产专项决定赌得稳不稳
- 高风险奖励决定后续转不转型

## 6.2 修改 `ProductionCampaignSystem.ts`

要求：

专项不再只给 UI 描述，而要真实影响：

- supplyLevel 倾向
- injury / recovery 修正
- risk reward weight
- 某些高风险独占奖励权重

## 6.3 修改 `RiskRewardSystem.ts`

要求：

加入专项修正：

- `expeditionPrep` 提高高风险准备度
- `recoverySprint` 降低失败恢复代价
- `forgeSprint` 提高装备导向模板收益
- `realmSprint` 提高突破相关奖励权重

## 6.4 修改建筑高阶联动

修改文件：
- [BuildingsPage.tsx](/E:/projects/EndlessQuest/src/pages/BuildingsPage.tsx)
- [ForgeSystem.ts](/E:/projects/EndlessQuest/src/systems/economy/ForgeSystem.ts)
- [AlchemySystem.ts](/E:/projects/EndlessQuest/src/systems/economy/AlchemySystem.ts)
- [TradeSystem.ts](/E:/projects/EndlessQuest/src/systems/trade/TradeSystem.ts)

要求：

高阶建筑在本阶段至少要能解锁：

- 某条专项的增强版本
- 某类高风险模板的特殊补给
- 某类转型型奖励的额外入口

优先不要新增全新建筑，而是在现有等级节点加“新权力”。

## 6.5 修改离线与风闻反馈

文件：
- [OfflineNarrativeSystem.ts](/E:/projects/EndlessQuest/src/systems/sect/OfflineNarrativeSystem.ts)
- [SectRumorSystem.ts](/E:/projects/EndlessQuest/src/systems/sect/SectRumorSystem.ts)

要求：

新增表达：

- 因为专项准备充分，本轮押注更稳
- 因为路线不匹配，本轮高风险发挥较差
- 因为赌到转型奖励，宗门后续可改路

## 6.6 测试

新增：

- `ProductionCampaignRiskIntegration.test.ts`
- `ArchetypeRiskLoopIntegration.test.ts`

修改：

- `OfflineNarrativeSystem.test.ts`
- `SectRumorSystem.test.ts`

## 6.7 Phase 4 验收标准

- 生产专项会真实改变高风险收益表现
- 路线和风险之间有明显适配关系
- 离线报告能讲清楚“为什么这次赌得值 / 不值”

---

## 七、Claude Code 每轮执行模板

Claude Code 每做一轮，建议按下面结构汇报：

### 1. 本轮范围
- 只列本轮要改的 Phase 和模块

### 2. 改动文件
- 列出本轮修改文件

### 3. 已完成能力
- 用玩家视角描述

### 4. 未做内容
- 说明哪些下一轮再做

### 5. 验证结果
- `npm run build`
- 相关测试命令

---

## 八、Claude Code 禁止事项

1. 不要把所有复杂逻辑继续堆进 `SectGoalSystem.ts`。
2. 不要在页面组件里硬编码大量玩法规则。
3. 不要为了加新玩法破坏现有归墟循环与离线叙事。
4. 不要新增需要玩家高频点击的流程。
5. 不要一次引入 10+ 个新状态但没有用户可见入口。

---

## 九、推荐起手 Prompt（给 Claude Code）

可直接把下面这段作为 Claude Code 的首轮执行提示：

```text
请按 docs/superpowers/specs/2026-04-13-midgame-branching-risk-production-deepening.md
和 docs/superpowers/specs/2026-04-13-midgame-deepening-claudecode-execution-checklist.md
实现 Phase 1，不要做 Phase 2+。

要求：
1. 先补 types、initial state、save compatibility。
2. 再实现 SectArchetypeSystem 和 ProductionCampaignSystem。
3. 再修改 strategySlice / tickSlice 接入路线切换与专项生产。
4. 最后改 SectPage 和 BuildingsPage，展示路线卡、专项卡、双路径目标和专项生产面板。
5. 只做 Phase 1 所需测试，运行 npm run build 和相关测试。
6. 不要破坏现有归墟、离线报告和模板系统。
7. 最终汇报里列出修改文件、完成能力、测试结果和下一轮建议。
```

---

## 十、一句话总结

**这份清单的目的，是把“玩法深化方案”压缩成 Claude Code 可以逐轮执行、逐轮验收、逐轮不跑偏的工程任务书。**
