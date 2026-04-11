# EndlessQuest 挂机修仙产品重定稿

**日期**: 2026-04-10  
**状态**: 当前产品方向基线  
**关联文档**:
- `.impeccable.md`
- `docs/superpowers/specs/2026-04-02-layout-style-review.md`
- `docs/archive/superpowers/specs/2026-03-24-endlessquest-design.md`

---

## 一、方向结论

`EndlessQuest` 的主方向统一为：

**挂机修仙宗门经营游戏，带有深度随机化与自动远征层。**

这意味着：

- 玩家负责定方向，不负责高频手操
- 宗门负责自动修炼、产出、闭关、远征、恢复和事件推进
- 秘境、祝福、遗物、战报仍然保留，但主要服务于挂机远征与长期经营
- 爽点从“单局手动翻盘”转向“长期布局正确后，整个宗门越转越顺”

---

## 二、为什么要调整

从玩家体验角度，当前版本虽然已经具备宗门经营、秘境探索、战报复盘和深度随机化，但产品重心仍然偏向：

- 局内构筑
- 自动战斗结果
- 单次出征的得失

而挂机修仙玩家真正追求的是：

1. 上线少点几下，也能持续变强
2. 下线后宗门像活着一样自己推进
3. 回来时看到宗门发生了明确变化
4. 失败不会频繁打断舒适节奏
5. 关键节点有很强的阶段跃迁爽感

因此需要把产品从“放置肉鸽”收束为“挂机修仙 + 自动远征”。

---

## 三、重排后的产品支柱

### 3.1 核心支柱

1. **宗门经营**
2. **弟子培养**
3. **自动远征**
4. **离线结算**
5. **飞升轮回**

### 3.2 辅助支柱

1. 战报复盘
2. 随机事件
3. 局内祝福 / 遗物
4. 稀有掉落与图鉴

### 3.3 删弱项

1. 逐层高频路线选择
2. 高频战斗微操
3. 常态化永久死亡
4. 为避免浪费而被迫频繁上线

---

## 四、玩家核心循环

### 4.1 日常循环

1. 上线后查看宗门变化、离线报告、当前瓶颈
2. 调整宗门方针、远征模板、弟子分工或突破目标
3. 收取关键结果，处理高价值节点
4. 下线，让宗门继续自动运转

### 4.2 周期循环

1. 稳定某条产线
2. 建立一套成熟的远征模板
3. 解决当前境界 / 资源 / 人手瓶颈
4. 解锁更高阶秘境与宗门能力
5. 进入飞升准备
6. 飞升后带着玩法遗产重开

### 4.3 爽点来源

1. 离线回来看到宗门“发生了事”
2. 配置调整后，后续 1-2 天收益明显改善
3. 核心弟子成长成型
4. 一套远征模板稳定压图
5. 飞升后解锁新的宗门能力与挂机权限

---

## 五、页面级 PRD

## 5.1 宗门页

**定位**: 挂机总控台

**必须回答**
- 宗门刚刚发生了什么
- 当前卡在哪
- 现在最值得调整哪一项

**模块**

1. `宗门总览`
   - 宗门等级
   - 当前方针
   - 总战力
   - 宗门运转状态

2. `今日宗务`
   - 固定展示 3 条最高优先级动态
   - 例：有人可突破、某产线堵塞、某远征重伤率过高

3. `瓶颈诊断`
   - 当前最限制成长的 1-2 个环节
   - 例：灵气短缺、前排断档、功法不足、仓储将满

4. `挂机策略`
   - 当前宗门方针
   - 可切换预设：稳健修行、资源扩张、秘境采集、冲境突破、高风险寻宝

5. `离线预期`
   - 预计离线 2 / 8 / 12 小时的主要变化

6. `关键操作入口`
   - 调整远征
   - 安排弟子
   - 处理突破

**状态**
- 平稳
- 高效
- 堵塞
- 高损耗
- 待处理重大节点

## 5.2 弟子页

**定位**: 人才策略页

**设计目标**
- 让玩家制定用人规则，而不是逐个角色反复点

**模块**

1. `弟子池概览`
   - 总人数
   - 核心弟子数
   - 外勤弟子数
   - 恢复中人数

2. `自动分工规则`
   - 高悟性优先参悟
   - 高机缘优先远征
   - 高防优先前排
   - 低品质优先产线

3. `培养梯队`
   - 核心
   - 主力
   - 候补
   - 产线

4. `闭关计划`
   - 冲境界
   - 补输出
   - 补生存
   - 补功法

5. `恢复池`
   - 自动排队恢复
   - 展示恢复剩余时间

6. `关键弟子卡`
   - 境界
   - 当前定位
   - 当前任务
   - 下一目标
   - 风险提示

**状态**
- 空闲
- 闭关
- 参悟
- 驻产线
- 远征
- 恢复
- 待突破

## 5.3 建筑页

**定位**: 生产调度台

**模块**

1. `三大产线总览`
   - 修炼线
   - 装备线
   - 经营线

2. `产线效率卡`
   - 当前效率
   - 主要瓶颈
   - 预计产出

3. `自动规则`
   - 自动补货
   - 自动炼化
   - 自动出售低品质战利品
   - 自动资源转材

4. `仓储与溢出保护`
   - 展示即将溢出的资源
   - 设置溢出后的去向

5. `升级建议`
   - 只展示当前最值的 1-2 个建筑动作

6. `建筑协同`
   - 当前路线 / 宗门法统对建筑的加成

**状态**
- 顺畅
- 低效
- 原料不足
- 人手不足
- 即将溢出

## 5.4 秘境页

**定位**: 自动远征配置页

**设计目标**
- 日常以模板配置为主
- 手动介入只保留给高难内容

**模板建议**
- 稳健采集
- 材料冲刺
- 功法寻宝
- 捕宠巡猎
- 搏命冲层

**每个模板的配置项**
- 出战队伍
- 补给等级
- 风险倾向
- 收益偏好
- 目标秘境
- 连败保护规则

**模块**

1. `远征模板列表`
2. `模板配置`
3. `收益 / 风险预估`
4. `近期战报`
5. `高难秘境手动入口`

**状态**
- 稳定收益
- 可优化
- 连续失利
- 人员承压
- 已碾压，建议换图

## 5.5 战报页

**定位**: 自动调参反馈页

**优先级**
战报不是炫技页面，而是告诉玩家“这次为什么赚 / 为什么亏 / 下一步怎么改”。

**模块**

1. `结果摘要`
   - 通关 / 撤退 / 失利
   - 净收益
   - 人员损耗

2. `收益结构`
   - 资源
   - 材料
   - 功法
   - 装备
   - 灵宠机会

3. `问题诊断`
   - 输出不足
   - 承伤断档
   - 补给过低
   - 图过难

4. `调整建议`
   - 直接指向对应配置项

5. `关键事件`
   - 高光和事故优先

6. `回合明细`
   - 默认折叠

## 5.6 离线报告页

**定位**: 情绪结算页

**优先展示顺序**
1. 重大事件
2. 人员变化
3. 资源收获
4. 系统提醒
5. 下一步建议

**重大事件示例**
- 某弟子突破
- 某远征失利
- 获得稀有功法 / 稀有装备
- 产线完成
- 宗门事件发生

**设计原则**
- 先报“发生了什么”
- 再报“加了多少”
- 最后给“现在最值得处理什么”

## 5.7 飞升页

**定位**: 长期目标与轮回奖励页

**飞升奖励原则**
- 优先给玩法权力
- 其次给数值

**优先解锁内容**
- 新远征模板槽
- 新自动规则槽
- 新宗门法统
- 新闭关策略
- 新挂机权限

---

## 六、系统重构方案

## 6.1 挂机策略层

新增统一的 `挂机策略层`，作为全产品的自动化总开关。

**责任**
- 宗门方针
- 远征模板启用状态
- 弟子分工规则
- 资源保留线
- 连败保护
- 自动突破规则

**落点建议**
- Store: `src/stores/sectStore/strategySlice.ts`
- System: `src/systems/sect/SectAutomationSystem.ts`
- Page entry: `src/pages/SectPage.tsx`

## 6.2 资源溢出保护系统

挂机游戏后期必须提供溢出保护。

**能力**
- 达到仓储上限前预警
- 自动转化为次级资源
- 自动出售低价值战利品
- 自动停用低价值产线

**落点建议**
- Store: `resourceSlice.ts`
- System: `src/systems/economy/ResourceEngine.ts`
- Page: `BuildingsPage.tsx` / `SectPage.tsx`

## 6.3 失败软惩罚系统

默认把失败表现为：
- 重伤
- 闭关恢复时间上升
- 收益下降
- 秘境回退
- 模板可信度下降

只有极端高风险模板或特殊事件，才允许永久陨落。

**落点建议**
- System: `DiscipleRecoverySystem.ts`
- Store: `adventureStore.ts`
- Page: `AdventureReportPage.tsx`

## 6.4 模板化远征系统

秘境系统从“单局操作”转为“模板化远征”。

**新增抽象**
- `ExpeditionTemplate`
- `RiskPolicy`
- `RewardFocus`
- `FailureFallbackRule`

**配置项**
- 队伍优先级
- 秘境目标
- 补给档位
- 风险倾向
- 收益偏好
- 连败后的降档规则

**落点建议**
- Types: `src/types/adventure.ts`
- Store: `src/stores/adventureStore.ts`
- System: `src/systems/roguelike/AutoRunPolicy.ts`
- UI: `src/pages/AdventurePage.tsx`

## 6.5 瓶颈诊断系统

新增 `瓶颈诊断系统`，为玩家减少思考噪音。

**诊断对象**
- 灵气不足
- 灵石不足
- 矿材不足
- 仓储将满
- 前排不足
- 核心输出不足
- 功法深度不足
- 当前秘境模板过于激进

**输出形式**
- 当前最大瓶颈
- 次级瓶颈
- 推荐动作

**落点建议**
- New system: `src/systems/sect/SectBottleneckSystem.ts`
- UI: `SectPage.tsx`

## 6.6 玩法型轮回遗产

飞升奖励从“加数值”逐步改为“给权限”。

**建议轮回奖励**
- 增加远征模板槽
- 解锁第二条宗门方针槽
- 解锁高级自动分工规则
- 解锁稀有事件控制权
- 解锁新法统与新远征类别

**落点建议**
- Data: `src/data/legacy.ts`
- System: `src/systems/sect/LegacySystem.ts`
- UI: 新飞升页 / `LegacyPanel.tsx`

---

## 七、数据结构建议

## 7.1 宗门方针

建议新增：

```ts
type SectPolicyId =
  | 'steadyCultivation'
  | 'resourceExpansion'
  | 'expeditionHarvest'
  | 'realmSprint'
  | 'highRiskFortune'
```

放置位置：
- `sect.strategySettings.activePolicy`

## 7.2 远征模板

建议新增：

```ts
interface ExpeditionTemplate {
  id: string
  name: string
  enabled: boolean
  dungeonId: string | null
  teamRule: 'topPower' | 'balanced' | 'reserveCore'
  supplyLevel: 'basic' | 'standard' | 'premium'
  riskTolerance: 'conservative' | 'balanced' | 'risky'
  rewardFocus: 'resources' | 'materials' | 'techniques' | 'pets' | 'progress'
  fallbackOnFailure: 'downgrade_dungeon' | 'swap_team' | 'pause_template'
}
```

放置位置：
- `sect.automationSettings.expeditionTemplates`

## 7.3 弟子梯队与分工

建议新增：

```ts
type DiscipleTier = 'core' | 'main' | 'reserve' | 'support'
type DiscipleAssignment = 'cultivation' | 'study' | 'expedition' | 'production' | 'recovery'
```

放置位置：
- `Character`
- 或集中存于 `strategySettings`

## 7.4 资源溢出规则

建议新增：

```ts
interface OverflowRule {
  resource: 'spiritStone' | 'spiritEnergy' | 'herb' | 'ore'
  thresholdRatio: number
  action: 'convert' | 'sell' | 'pauseLine'
  target?: string
}
```

---

## 八、状态机建议

## 8.1 弟子状态机

目标状态：

`idle -> cultivation -> breakthroughReady -> breakthroughing -> idle`

扩展状态：

`idle -> expedition -> recovering -> idle`

`idle -> production -> idle`

`idle -> study -> idle`

说明：
- `recovering` 应成为挂机循环内的常见软惩罚
- `dead` 应保留，但只作为极端事件与高风险玩法的少数结果

## 8.2 远征模板状态机

`enabled -> running -> settled -> adjusted -> running`

异常分支：

`running -> failed -> fallbackApplied -> running`

说明：
- 模板不是一次性指令，而是长期运行方案

## 8.3 离线结算状态机

`offline -> simulation -> eventAggregation -> reportGenerated -> userConfirmed`

说明：
- 重大事件聚合优先于资源逐项罗列

---

## 九、代码库映射建议

## 9.1 优先需要动的页面

- `src/pages/SectPage.tsx`
- `src/pages/AdventurePage.tsx`
- `src/pages/CharactersPage.tsx`
- `src/pages/BuildingsPage.tsx`
- `src/components/common/OfflineReportModal.tsx`
- `src/pages/AdventureReportPage.tsx`

## 9.2 优先需要动的 store

- `src/stores/sectStore/strategySlice.ts`
- `src/stores/sectStore/characterSlice.ts`
- `src/stores/sectStore/resourceSlice.ts`
- `src/stores/adventureStore.ts`

## 9.3 优先需要动的 system

- `src/systems/sect/SectAutomationSystem.ts`
- `src/systems/sect/SectOverviewSystem.ts`
- `src/systems/roguelike/AutoRunPolicy.ts`
- `src/systems/roguelike/AutoRunEngine.ts`
- `src/systems/character/DiscipleRecoverySystem.ts`
- `src/systems/sect/LegacySystem.ts`

## 9.4 建议新增的 system

- `src/systems/sect/SectBottleneckSystem.ts`
- `src/systems/sect/OfflineNarrativeSystem.ts`
- `src/systems/roguelike/ExpeditionTemplateSystem.ts`
- `src/systems/economy/OverflowProtectionSystem.ts`

---

## 十、分阶段落地顺序

## Phase 1：先把挂机主循环立住

1. 宗门页升级为挂机总控台
2. 秘境页升级为自动远征配置页
3. 离线报告改成事件优先
4. 增加连败保护与失败软惩罚

## Phase 2：把调度感做出来

1. 弟子页增加梯队与自动分工
2. 建筑页增加产线优先级、自动规则、溢出保护
3. 增加瓶颈诊断系统

## Phase 3：把长线目标做扎实

1. 飞升奖励改成玩法权力
2. 增加宗门法统 / 高阶方针
3. 增加高级挂机权限和新远征类别

---

## 十一、验收标准

当改造完成后，应满足：

1. 玩家一天只上线 2-5 次，也能稳定成长
2. 每次上线都能看到 1-3 条“宗门变化”
3. 玩家主要做的是策略配置，而不是流程劳动
4. 失败更多体现为收益与节奏波动，而不是强挫败
5. 爽点主要来自“宗门越来越会自己运转”

---

## 十二、一句话收束

**玩家负责定宗门方向，宗门负责自己成长。**
