# EndlessQuest 中期分叉 / 风险收益 / 产线博弈深化方案
**日期**: 2026-04-13  
**状态**: 待实现设计稿  
**适用范围**: 挂机修仙主循环深化  
**关联文档**:
- `.impeccable.md`
- `docs/superpowers/specs/2026-04-10-idle-cultivation-product-realignment.md`
- `docs/superpowers/specs/2026-03-31-adventure-automation-design.md`

---

## 一、目标

本方案用于解决当前版本的 3 个核心玩法问题：

1. 中期循环容易收敛成“守瓶颈、跑模板”。
2. 风险收益曲线不够尖锐，高风险诱惑不足。
3. 建筑系统更像调度台，尚未形成有张力的产线博弈。

本方案的设计目标不是增加更多散装内容，而是让玩家在挂机框架下真正体验到：

- 我在选择宗门发展路线，而不是只在做正确维护。
- 我在承担有诱惑的风险，而不是只在选择稳定最优。
- 我在押阶段资源和产线重心，而不是只在避免浪费。

一句话收束：

**让宗门中期开始出现明确的玩法人格，并且让这种人格能改变瓶颈解法、远征风险偏好和建筑倾斜方式。**

---

## 二、核心原则

### 2.1 玩家不增加高频微操

所有新增深度必须优先体现在：

- 方针选择
- 模板切换
- 阶段专项
- 产线倾斜
- 高风险押注

不能新增要求玩家频繁上线点按钮的流程债。

### 2.2 同一个问题必须允许多种成立解

凡是宗门核心瓶颈，至少要支持 2-3 条可成立路线。

例如“远征承伤过高”，不应只存在“补一个更肉前排”这一种解法，而应允许：

- 阵修减伤
- 丹修续航
- 剑修爆发缩短战斗
- 御兽分摊伤害 / 控制

### 2.3 高风险的奖励必须独占

高风险不能只给“更多资源”，而要优先给：

- 低风险拿不到的稀有奖励
- 提前进入下一阶段的机会
- 可改变后续玩法的转型资源

### 2.4 建筑不是背景设施，而是战略杠杆

建筑升级和产线倾斜必须改变：

- 远征容错
- 闭关效率
- 风险可承受上限
- 资源结构
- 后续目标顺序

如果建筑只能提升产量，而不能改变玩法结构，则博弈深度仍然不够。

---

## 三、方案总览

本方案拆为 3 个大系统群：

1. `中期路线分叉系统`
2. `高风险独占收益系统`
3. `产线倾斜与阶段专项系统`

并通过 4 个玩家可感知入口落地：

1. 宗门页的“阶段路径选择”
2. 远征页的“高风险模板标签与独占奖励”
3. 建筑页的“专项生产与倾斜后果”
4. 离线 / 战报页的“押注结果反馈”

---

## 四、中期路线分叉系统

## 4.1 目标

让中期不再只是“解决系统提示的当前瓶颈”，而是进入“按宗门路数解题”的状态。

## 4.2 新增概念：宗门发展路线 Archetype

在现有宗门方针 / activeRoute 基础上，引入更强的中期玩法路线 `SectArchetype`。

建议枚举：

```ts
type SectArchetype =
  | 'swordBurst'
  | 'pillSustain'
  | 'arrayGuard'
  | 'beastHarvest'
```

含义：

- `swordBurst`：速推、爆发、冲图、阶段跃迁
- `pillSustain`：恢复、闭关、续航、长期稳定
- `arrayGuard`：减伤、低损耗、高难保底
- `beastHarvest`：寻宝、材料、奇遇、外勤收益

## 4.3 路线效果要求

每条路线必须同时影响至少 4 个面向：

1. 瓶颈解法倾向
2. 自动远征模板收益结构
3. 建筑专项收益
4. 高风险模板可承受性

建议基础效果：

### `swordBurst`
- 远征推进层数预估提高
- 失败时恢复压力更高
- 冲图 / progress 模板收益提高
- 锻造专项更强

### `pillSustain`
- 恢复时长缩短
- 闭关经验 / 修为收益提高
- 高风险模板的失败软惩罚减轻
- 炼丹专项更强

### `arrayGuard`
- 伤病率下降
- 高难秘境失败回退更柔和
- 低损耗模板更稳定
- 阵法相关建筑 / 护山类后续扩展接口保留

### `beastHarvest`
- 寻宝 / 材料 / 稀有事件权重提高
- 高风险寻宝模板更容易触发奇遇
- 招募 / 外勤 / 市场联动更强
- 资源类模板收益提高

## 4.4 阶段转型机制

中期必须支持“转挡”，否则路线会变成开局一次性选择。

新增 `RouteShiftState`：

```ts
interface RouteShiftState {
  currentArchetype: SectArchetype
  lastShiftAtDay: number
  shiftCooldownDays: number
  pendingShift: SectArchetype | null
}
```

规则：

- 默认允许每 3 天切换一次路线。
- 切换后获得 1 段“转型磨合期”。
- 磨合期内旧路线残留 50%，新路线生效 50%。
- 磨合期结束后完全切换。

设计原因：

- 避免玩家无限来回切最优。
- 允许“前期扩张，中期冲境，后期归墟”的节奏切换。

## 4.5 阶段目标改造

当前 [SectGoalSystem.ts](/E:/projects/EndlessQuest/src/systems/sect/SectGoalSystem.ts) 主要是单目标优先级输出。  
这里改为“双路径竞争”。

新增结构：

```ts
interface SectStagePathOption {
  id: string
  title: string
  detail: string
  gains: string[]
  tradeoffs: string[]
  recommendedArchetype?: SectArchetype
  priority: 'high' | 'medium' | 'low'
  link: string
}
```

页面要求：

- 宗门页不只显示“下一步最该做什么”。
- 至少显示 2 条都合理的阶段路径。
- 每条路径都要展示：
  - 立即收益
  - 代价 / 延后内容
  - 更适合的宗门路线

示例：

### 路径 A：先冲主力境界
- 立即收益：更快开高阶秘境
- 代价：遗产锻造线延后
- 推荐路线：`pillSustain`

### 路径 B：先升炼器坊补遗器
- 立即收益：中后期远征模板更稳
- 代价：主力突破速度变慢
- 推荐路线：`arrayGuard` / `swordBurst`

## 4.6 关键弟子触发路线偏转

当招募到高价值弟子时，系统应给出“围绕此人转型”的提示。

新增 `RouteOpportunity`：

```ts
interface RouteOpportunity {
  characterId: string
  suggestedArchetype: SectArchetype
  reason: string
  expiresAfterDays: number
}
```

触发样例：

- 高爆发成长 + 金灵根 -> `swordBurst`
- 高悟性 + 高机缘 -> `beastHarvest`
- 高体质 + 防御词缀 -> `arrayGuard`
- 高悟性 + 丹修专长 -> `pillSustain`

玩家感知目标：

- 新弟子不只是“战力更高”，而是“给宗门一个改路理由”。

---

## 五、高风险独占收益系统

## 5.1 目标

把风险从“略高收益的危险选项”改造成“能够换取独占回报的押注动作”。

## 5.2 风险收益层级

新增统一风险层级定义：

```ts
type RiskTier = 'safe' | 'press' | 'gamble' | 'destiny'
```

含义：

- `safe`：低风险保底
- `press`：中风险专项加速
- `gamble`：高风险独占掉落
- `destiny`：极高风险阶段跃迁

映射到现有模板时，不要只映射为 `conservative / balanced / risky`，而是补一层玩家可理解的意图标签。

## 5.3 高风险独占奖励类型

新增 4 类高风险独占奖励：

### A. 转型型奖励
- 用于改变宗门路线的资源
- 例如：某类稀有丹方、阵图、兽契、剑胚

### B. 压缩时间型奖励
- 直接缩短到下一阶段的时间
- 例如：突破悟道机缘、建筑缩时材料、恢复压缩药引

### C. 事件入口型奖励
- 解锁后续专属事件链
- 例如：古修来访、兽巢异动、秘市交易、护山阵裂口

### D. 构筑型奖励
- 改变模板玩法的奖励
- 例如：高风险模板额外槽位、专属补给、专属回退逻辑

## 5.4 新增高风险模板标签

扩展 [AdventurePage.tsx](/E:/projects/EndlessQuest/src/pages/AdventurePage.tsx) 的模板描述，新增：

```ts
interface RiskHookDescriptor {
  title: string
  exclusiveRewards: string[]
  likelyPenalty: string[]
  bestForArchetypes: SectArchetype[]
}
```

页面展示要求：

- 每个高风险模板必须明确写出“赌什么”。
- 不能只写“高风险高收益”。

示例标签：

### 剑宗破关
- 独占：高阶推进残卷
- 风险：主力伤病上升
- 适配：`swordBurst`

### 异兽巡猎
- 独占：捕获契机 / 稀有外勤事件
- 风险：收益波动极大
- 适配：`beastHarvest`

### 丹火深潜
- 独占：恢复压缩药引 / 闭关奇遇
- 风险：灵草消耗暴增
- 适配：`pillSustain`

## 5.5 失败惩罚改造

继续坚持软惩罚，但把惩罚做成“节奏受损”而不是“资源扣一点”。

新增：

```ts
interface RiskPenaltyBundle {
  injuryRateDelta: number
  recoveryTimeMultiplier: number
  templateConfidenceLoss: number
  temporaryYieldPenaltyHours: number
}
```

说明：

- 高风险失败后，不直接让玩家觉得“我白玩了”。
- 而是让玩家感受到“这条路线需要重新稳一下”。

模板可信度规则建议：

- 连续成功提高模板可信度。
- 连续失败降低模板可信度。
- 可信度低时，宗门页和远征页会主动提示降档或补给。

## 5.6 险胜反馈强化

当前战报已经很强调结果与建议。这里进一步加上“险胜高光标签”。

新增：

```ts
interface NarrowWinHighlight {
  label: string
  reason: string
  unlockedFollowup?: string
}
```

触发示例：

- 重伤归来但带回稀有残卷
- 队伍仅剩 1 人但发现异兽巢
- 深潜失败边缘撤退却带回特殊阵图

这些内容在：

- [AdventureReportPage.tsx](/E:/projects/EndlessQuest/src/pages/AdventureReportPage.tsx)
- [OfflineReportModal.tsx](/E:/projects/EndlessQuest/src/components/common/OfflineReportModal.tsx)
- [SectRumorSystem.ts](/E:/projects/EndlessQuest/src/systems/sect/SectRumorSystem.ts)

都要单独抬高展示。

## 5.7 高风险与路线绑定

新增高风险模板加成函数：

```ts
function getArchetypeRiskModifier(
  archetype: SectArchetype,
  riskTier: RiskTier
): {
  rewardMultiplier: number
  injuryMultiplier: number
  exclusiveWeightBonus: number
}
```

目标：

- 不是所有宗门都该赌同一种高风险。
- 宗门路线应该决定“你更会赌什么”。

---

## 六、产线倾斜与阶段专项系统

## 6.1 目标

让建筑页从“高效后台”升级为“阶段战略台”。

## 6.2 新增概念：阶段专项 Production Campaign

在现有生产倾向 `balanced / cultivation / crafting` 之上，引入更强的阶段专项。

建议枚举：

```ts
type ProductionCampaign =
  | 'realmSprint'
  | 'forgeSprint'
  | 'recoverySprint'
  | 'expeditionPrep'
  | 'marketHarvest'
```

含义：

- `realmSprint`：全力冲境
- `forgeSprint`：全力补装备 / 遗器
- `recoverySprint`：全力修复主力
- `expeditionPrep`：全力备战高风险远征
- `marketHarvest`：全力倒货与资源变现

## 6.3 专项时长与成本

专项不能永久开，否则又会变成新的默认最优。

新增：

```ts
interface ProductionCampaignState {
  activeCampaign: ProductionCampaign | null
  startedAtDay: number | null
  durationHours: number
  cooldownHours: number
}
```

建议规则：

- 每次专项持续 8 小时。
- 结束后有 4 小时冷却。
- 可提前取消，但收益折损。

## 6.4 专项效果

### `realmSprint`
- 闭关经验 / 修为提高
- 炼丹优先供给突破辅助资源
- 锻造线减速
- 市场出售倾向保守

### `forgeSprint`
- 矿材、锻造、遗器素材消耗效率提高
- 闭关收益降低
- 远征补给优先装备型准备

### `recoverySprint`
- 恢复时间缩短
- 丹药优先治疗 / 恢复类
- 高风险模板建议自动降档

### `expeditionPrep`
- 优先生产补给、护符、临时远征用品
- 灵石更多导向补给
- 闭关与招募收益下降

### `marketHarvest`
- 高水位资源更积极变现
- 市场类收益提升
- 锻造与炼丹专项受限

## 6.5 倾斜后果必须可见

建筑页每个专项都要同时展示：

- 直接收益
- 被压制的产线
- 推荐适配的宗门路线
- 推荐适配的远征模板

新增结构：

```ts
interface ProductionCampaignDescriptor {
  id: ProductionCampaign
  title: string
  boosts: string[]
  suppressions: string[]
  bestForArchetypes: SectArchetype[]
  bestForTemplates: string[]
}
```

## 6.6 资源互斥规则

为了让经营真正有博弈，必须引入阶段性互斥。

新增抽象：

```ts
interface StrategicResourceBudget {
  spiritStoneBudget: {
    recruitment: number
    buildings: number
    expedition: number
    market: number
  }
  herbBudget: {
    recovery: number
    breakthrough: number
    expeditionSupply: number
  }
  oreBudget: {
    forge: number
    sale: number
    expeditionGear: number
  }
}
```

注意：

- 不要求玩家手动填预算数字。
- 预算由“专项 + 宗门路线 + 溢出规则”共同决定。

玩家可见形式应是：

- 当前灵石更偏向哪里
- 当前灵草更偏向哪里
- 你因此牺牲了什么

## 6.7 高水位分流深化

现有高水位规则只到“卖出 / 转购”。  
这里扩展为“按当前目标链自动分流”。

新增：

```ts
type OverflowTargetChain =
  | 'breakthrough'
  | 'recovery'
  | 'forge'
  | 'expedition'
  | 'market'
```

规则：

- 如果当前专项是 `realmSprint`，灵草高水位优先转突破辅材。
- 如果当前专项是 `forgeSprint`，灵石高水位优先转矿材。
- 如果当前专项是 `expeditionPrep`，灵石和灵草高水位优先转补给。

## 6.8 建筑升级的玩法化改造

高阶建筑不只加数值，还要解锁新的“经营权力”。

建议：

### 炼丹房
- Lv5：解锁恢复专项药线
- Lv7：解锁高风险深潜补给
- Lv8：解锁双线炼丹优先队列

### 炼器坊
- Lv5：解锁主力 / 外勤装分类
- Lv7：解锁遗产锻造
- Lv8：解锁第三遗器与专项锻造加速

### 坊市
- Lv5：解锁高水位自动分流
- Lv7：解锁专项变现策略
- Lv8：解锁稀有交易事件权重提升

### 藏经阁 / 讲经相关
- Lv5：解锁路线转型提示
- Lv7：解锁路线磨合压缩
- Lv8：解锁关键弟子转型事件增强

---

## 七、页面级改造要求

## 7.1 宗门页

改动文件：
- [SectPage.tsx](/E:/projects/EndlessQuest/src/pages/SectPage.tsx)
- [SectPage.module.css](/E:/projects/EndlessQuest/src/pages/SectPage.module.css)

新增模块：

1. `阶段路径卡`
   - 并列展示两条可行路径
   - 展示收益、代价、推荐路线

2. `宗门路线卡`
   - 当前路线
   - 路线加成
   - 可切换路线
   - 磨合期状态

3. `专项生产卡`
   - 当前专项
   - 剩余时间
   - 当前牺牲项

4. `高风险押注提示`
   - 当前宗门更适合赌什么
   - 当前是否处于稳态 / 押注期 / 恢复期

## 7.2 远征页

改动文件：
- [AdventurePage.tsx](/E:/projects/EndlessQuest/src/pages/AdventurePage.tsx)
- [AdventurePage.module.css](/E:/projects/EndlessQuest/src/pages/AdventurePage.module.css)

新增模块：

1. `风险标签`
   - safe / press / gamble / destiny

2. `独占奖励预览`
   - 当前模板有机会赌到什么

3. `适配路线说明`
   - 当前模板更适合哪种宗门路线

4. `风险后果说明`
   - 如果失败，会伤在哪里

5. `模板可信度`
   - 显示近期稳定程度

## 7.3 建筑页

改动文件：
- [BuildingsPage.tsx](/E:/projects/EndlessQuest/src/pages/BuildingsPage.tsx)
- [BuildingsPage.module.css](/E:/projects/EndlessQuest/src/pages/BuildingsPage.module.css)

新增模块：

1. `阶段专项选择`
2. `资源分流去向`
3. `专项收益与牺牲`
4. `当前预算偏向`
5. `高阶建筑解锁的经营权力`

## 7.4 战报页

改动文件：
- [AdventureReportPage.tsx](/E:/projects/EndlessQuest/src/pages/AdventureReportPage.tsx)

新增展示：

1. 这次高风险赌到了什么
2. 这次失败伤到了什么节奏
3. 本次结果是否改变后续路线建议
4. 是否属于险胜高光

## 7.5 离线报告页

改动文件：
- [OfflineReportModal.tsx](/E:/projects/EndlessQuest/src/components/common/OfflineReportModal.tsx)

新增展示：

1. 过去一段时间宗门是否在“稳态 / 押注 / 恢复”
2. 高风险押注的结果
3. 专项生产的结果
4. 是否出现可触发路线转型的新机会

---

## 八、数据结构建议

建议新增到 `src/types/sect.ts`：

```ts
type SectArchetype = 'swordBurst' | 'pillSustain' | 'arrayGuard' | 'beastHarvest'

type RiskTier = 'safe' | 'press' | 'gamble' | 'destiny'

type ProductionCampaign =
  | 'realmSprint'
  | 'forgeSprint'
  | 'recoverySprint'
  | 'expeditionPrep'
  | 'marketHarvest'

interface RouteShiftState {
  currentArchetype: SectArchetype
  lastShiftAtDay: number
  shiftCooldownDays: number
  pendingShift: SectArchetype | null
}

interface ProductionCampaignState {
  activeCampaign: ProductionCampaign | null
  startedAtDay: number | null
  durationHours: number
  cooldownHours: number
}

interface TemplateConfidenceEntry {
  templateId: string
  score: number
  lastAdjustedAtDay: number | null
}

interface RouteOpportunity {
  characterId: string
  suggestedArchetype: SectArchetype
  reason: string
  expiresAfterDays: number
}
```

建议挂载位置：

```ts
interface SectAutomationSettings {
  ...
  routeShift: RouteShiftState
  productionCampaign: ProductionCampaignState
  templateConfidence: TemplateConfidenceEntry[]
}

interface Sect {
  ...
  currentArchetype: SectArchetype
  routeOpportunities: RouteOpportunity[]
}
```

---

## 九、系统映射建议

## 9.1 新增系统

建议新增：

- `src/systems/sect/SectArchetypeSystem.ts`
- `src/systems/sect/RouteOpportunitySystem.ts`
- `src/systems/sect/ProductionCampaignSystem.ts`
- `src/systems/adventure/RiskRewardSystem.ts`
- `src/systems/adventure/TemplateConfidenceSystem.ts`

## 9.2 需要修改的现有系统

### [SectGoalSystem.ts](/E:/projects/EndlessQuest/src/systems/sect/SectGoalSystem.ts)
- 从单目标优先，扩展为双路径竞争
- 接入路线推荐和专项建议

### [SectBottleneckSystem.ts](/E:/projects/EndlessQuest/src/systems/sect/SectBottleneckSystem.ts)
- 输出不只包含瓶颈本身
- 还包含按路线区分的解法建议

### [SectAutomationSystem.ts](/E:/projects/EndlessQuest/src/systems/sect/SectAutomationSystem.ts)
- 接入 `SectArchetype`
- 接入 `RiskTier`
- 接入模板可信度
- 调整队伍选择和自动策略映射

### `tickSlice.ts`
- 推进路线磨合期
- 推进生产专项状态
- 处理专项期间预算偏向

### [OfflineNarrativeSystem.ts](/E:/projects/EndlessQuest/src/systems/sect/OfflineNarrativeSystem.ts)
- 报告路线押注结果
- 报告专项生产结果
- 报告转型机会

### [SectRumorSystem.ts](/E:/projects/EndlessQuest/src/systems/sect/SectRumorSystem.ts)
- 输出“宗门转型”“专项开炉”“险胜奇遇”“押注失手”等风闻

---

## 十、建议实现顺序

## Phase 1：路线与专项骨架

目标：先让宗门页和建筑页出现“我要走哪条路”的感受。

内容：

1. 新增 `SectArchetype`
2. 新增 `ProductionCampaign`
3. 宗门页展示当前路线与双路径阶段目标
4. 建筑页展示专项生产和倾斜后果

验收：

- 玩家能看到当前宗门路线。
- 玩家能手动切路线。
- 玩家能开启阶段专项。
- 宗门页目标不再只有单一路径。

## Phase 2：高风险独占收益

目标：让远征开始出现“值得赌”的具体理由。

内容：

1. 新增 `RiskTier`
2. 为高风险模板接入独占奖励描述
3. 接入模板可信度
4. 接入失败的节奏惩罚
5. 战报 / 离线报告抬高险胜和押注结果

验收：

- 高风险模板会显示独占收益。
- 玩家能分辨“稳刷”和“押注”的区别。
- 战报会告诉玩家赌到了什么，或伤到了什么。

## Phase 3：路线化解题

目标：让瓶颈真的开始有不同解法。

内容：

1. 瓶颈系统支持按路线输出不同建议
2. 队伍与模板逻辑受路线显著影响
3. 关键弟子生成路线转型机会

验收：

- 同一个瓶颈在不同宗门路线下得到不同建议。
- 招募到关键弟子后，宗门页会出现转型提示。

## Phase 4：高阶联动

目标：把路线、风险、产线三者打通。

内容：

1. 建筑高阶能力接入路线 / 风险联动
2. 专项生产影响高风险模板表现
3. 高风险收益反过来提供转型资源

验收：

- 玩家能感知“建筑倾斜 -> 远征结果 -> 宗门转型”的闭环。

---

## 十一、测试建议

## 11.1 单元测试

新增测试文件建议：

- `SectArchetypeSystem.test.ts`
- `ProductionCampaignSystem.test.ts`
- `RiskRewardSystem.test.ts`
- `TemplateConfidenceSystem.test.ts`
- `RouteOpportunitySystem.test.ts`

覆盖点：

- 不同路线下的收益 / 惩罚修正
- 专项生产的时长、冷却、收益
- 高风险奖励权重变化
- 模板可信度的增减
- 关键弟子触发路线机会

## 11.2 集成测试

建议补：

- 宗门页显示双路径目标
- 建筑页显示专项收益与牺牲
- 远征页显示独占风险标签
- 战报页显示险胜高光或节奏惩罚
- 离线报告显示押注结果与转型机会

## 11.3 回归重点

- 当前归墟终盘循环不应被破坏
- 当前模板化远征的默认稳定体验不能明显变差
- 离线报告不能变成信息轰炸
- 平板和移动端不能因为新模块失去可读性

---

## 十二、非目标

本方案当前不包含：

- 新增手操战斗玩法
- 新增复杂战棋 / 手动布阵系统
- 新增重度经济模拟
- 推翻现有归墟后期线

原因：

- 当前方向仍然是挂机修仙，不是高频策略手操。
- 所有深化都应服务于“少操作，多配置”。

---

## 十三、Claude Code 实施提示

如果由 Claude Code 分阶段实现，建议每一轮只做一组完整闭环，而不是同时摊开所有系统。

推荐拆法：

1. 先做类型、默认值、存档兼容。
2. 再做系统计算层。
3. 然后做宗门页 / 建筑页 UI。
4. 再做远征页与战报反馈。
5. 最后接离线报告和风闻系统。

每轮都必须满足：

- 有玩家可见反馈
- 有测试覆盖
- `npm run build` 通过

不建议先把所有 types 都加满但没有页面入口，因为这样会很难判断玩法是否真的成立。

---

## 十四、最终验收标准

当本方案落地后，玩家应该能明确感受到：

1. 我的宗门是有路线人格的。
2. 同一个卡点，我可以用不同方式解。
3. 高风险不是亏钱玩法，而是赌独占机会。
4. 建筑不只是后台，而是决定本期宗门战略。
5. 中期不再只是修补机器，而是在押宗门命运。

---

## 十五、一句话总结

**让 EndlessQuest 从“会自己运转的挂机宗门”进一步进化成“会因为玩家押注不同方向而长成不同命运的挂机宗门”。**
