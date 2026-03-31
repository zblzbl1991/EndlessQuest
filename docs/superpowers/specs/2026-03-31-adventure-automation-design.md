# 秘境托管脚本系统设计文档

**日期：** 2026-03-31  
**状态：** 待审核  
**前置上下文：** 当前秘境系统已支持战术预设、祝福/遗物/游商/灵兽事件，以及基于 `activeRuns` 的逐层推进；本设计将其升级为即时结算的托管脚本系统。

---

## 概述

本文档定义 EndlessQuest 的“弟子秘境自动化”方案：玩家点击开始探索后，选择队伍与托管策略，系统立即完整结算本次秘境，并生成可回放、可查询、可持久化的探索报告。

**核心目标：**

- 去掉当前秘境的 10 秒逐层自动推进等待
- 将“祝福选择 / 游商购买 / 灵兽捕获 / 撤退判断”纳入统一的自动决策
- 让玩家在秘境页看到每次探索的概要卡片
- 支持进入单独详情页查看整次探索的完整过程
- 让全局日志支持按秘境查看明细，并能跳转到对应探索报告

**架构决策：**

- 采用“托管脚本引擎 + 结构化探索报告”方案，而不是继续扩展实时 `activeRuns` 流程
- 保留现有战斗、事件、祝福、遗物、灵兽、商店的底层规则
- 将秘境体验从“实时进行中的状态机”切换为“即时结算后的报告系统”

**不在本次范围内：**

- 录像式逐帧战斗回放
- 玩家自定义复杂规则脚本
- 在线同步、分享战报、排行榜
- 派遣系统重构

---

## 目标体验

### 玩家流程

1. 玩家在秘境页选择目标秘境
2. 选择出战弟子、战术预设、托管策略
3. 点击“开始探索”
4. 系统立即完整跑完本次秘境并结算
5. 页面展示本次探索的概要结果卡片
6. 玩家点击“查看过程”进入详情页，查看完整时间线与明细战报
7. 玩家也可在全局日志页按秘境筛选或跳转到该次探索明细

### 体验变化

从：

- 玩家盯着进行中的秘境卡片
- 系统每 10 秒推进一层
- 遇到祝福、游商、灵兽时停下来等玩家点

变为：

- 玩家只需要配置一次
- 系统即时完成整次探索
- 玩家在结果页复盘过程，而不是在过程里频繁干预

这更符合“放置 + Roguelike 决策由预设承载”的目标体验。

---

## 托管策略

### 策略档位

本次只提供三种简化托管策略，不暴露更细的规则编辑器：

- `steady` / `稳健`
- `combat` / `战斗`
- `profit` / `收益`

### 策略语义

#### 稳健

- 路线选择更偏向低风险
- 祝福更偏向生存、防御、续航
- 游商优先治疗与保命
- 灵兽捕获更保守
- 更早触发撤退判断

#### 战斗

- 路线选择更偏向战斗收益与推进效率
- 祝福更偏向输出、爆发、战斗强化
- 游商优先提升战斗能力
- 灵兽捕获积极
- 撤退阈值相对靠后，追求通关与冲层

#### 收益

- 路线选择更偏向资源奖励
- 祝福更偏向资源增益、掉落收益
- 游商购买以高性价比收益项为主
- 灵兽捕获按收益倾向处理
- 撤退判断介于稳健与战斗之间，但会避免为了冲层而牺牲稳定收益

### 托管策略的作用范围

托管策略至少影响以下自动决策：

- 每层路线选择
- 祝福选择
- 游商购买或放弃
- 灵兽捕获或跳过
- 是否撤退

托管策略不替代现有 `TacticalPreset`。两者并存：

- `TacticalPreset` 决定战斗中的 AI 行为
- `AutomationStrategy` 决定秘境脚本层面的宏观决策

---

## 核心架构

### 总体思路

本设计将秘境系统拆成两层：

1. **输入配置层**
   描述玩家是如何开始这次探索的

2. **输出报告层**
   描述这次探索最终发生了什么

当前 `activeRuns` 更适合“实时推进”；本方案需要“即时结算 + 可回放”，因此核心对象会转向 `AdventureReport`。

### 核心模块

#### 1. AutoRunPolicy

职责：

- 将 `稳健 / 战斗 / 收益` 转换为统一的决策接口
- 在不同情境下给出自动选择结果

输出示例：

- 当前层应选哪条路线
- 当前祝福应选哪一个
- 当前游商商品是否购买
- 当前灵兽是否尝试捕获
- 当前状态是否应撤退

#### 2. AutoRunEngine

职责：

- 接收秘境、队伍、补给、战术预设、托管策略
- 在内存中完整模拟一次秘境流程
- 逐步调用现有的事件/战斗/奖励逻辑
- 生成一份结构化 `AdventureReport`

它不是 UI store，也不是页面组件；它是独立的纯流程引擎，便于测试。

#### 3. AdventureStore

职责调整为：

- 发起一次自动探索
- 扣除出发消耗
- 调用 `AutoRunEngine` 生成报告
- 将结果写回宗门资源、背包、弟子状态
- 保存报告列表与报告详情索引
- 向全局事件日志写摘要事件

### 架构边界

保留不变的模块：

- `CombatEngine`
- `EventSystem`
- `RunBuildSystem`
- `PetSystem`
- 现有秘境地图生成逻辑

替换或弱化的模块：

- `AdventureStore` 中依赖 `idleTick / tickAllIdle / floorTimer` 的秘境逐层推进逻辑
- `AdventurePage` 中“进行中的冒险”实时流程 UI

---

## 数据模型

### 新增类型

#### AutomationStrategy

```typescript
export type AutomationStrategy = 'steady' | 'combat' | 'profit'
```

#### AdventureRunConfig

描述一次探索的输入配置。

```typescript
export interface AdventureRunConfig {
  dungeonId: string
  teamCharacterIds: string[]
  supplyLevel: SupplyLevel
  tacticalPreset: TacticalPreset
  automationStrategy: AutomationStrategy
}
```

#### AdventureReportResult

```typescript
export type AdventureReportResult = 'completed' | 'retreated' | 'failed'
```

#### AdventureReportStepType

```typescript
export type AdventureReportStepType =
  | 'run_started'
  | 'floor_started'
  | 'route_considered'
  | 'route_selected'
  | 'event_resolved'
  | 'auto_choice_made'
  | 'shop_decision'
  | 'blessing_decision'
  | 'pet_decision'
  | 'reward_gained'
  | 'member_state_changed'
  | 'run_retreated'
  | 'run_failed'
  | 'run_completed'
```

#### AdventureReportStep

```typescript
export interface AdventureReportStep {
  id: string
  type: AdventureReportStepType
  timestamp: number
  floor: number | null
  summary: string
  detail: string
  decisionReason?: string
  snapshot?: {
    teamHp: Record<string, { currentHp: number; maxHp: number; status: string }>
    rewards: Resources
    blessings: BlessingId[]
    relics: RelicId[]
    branchTags: string[]
  }
  meta?: Record<string, unknown>
}
```

#### AdventureReport

```typescript
export interface AdventureReport {
  id: string
  config: AdventureRunConfig
  dungeonId: string
  teamCharacterIds: string[]
  startedAt: number
  finishedAt: number
  result: AdventureReportResult
  floorsCleared: number
  rewards: Resources
  itemRewards: AnyItem[]
  finalMemberStates: Record<string, MemberState>
  steps: AdventureReportStep[]
}
```

#### AdventureReportSummary

用于列表页、日志页和概要卡片的轻量展示结构。

```typescript
export interface AdventureReportSummary {
  id: string
  dungeonId: string
  teamCharacterIds: string[]
  strategy: AutomationStrategy
  tacticalPreset: TacticalPreset
  startedAt: number
  finishedAt: number
  result: AdventureReportResult
  floorsCleared: number
  rewards: Resources
  itemRewardCount: number
}
```

### 状态管理建议

`AdventureStore` 应新增：

- `reports: AdventureReportSummary[]`
- `reportDetails: Record<string, AdventureReport>`
- `runAutomation(...)`
- `getReport(reportId)`

其中：

- `reports` 用于秘境页列表与日志入口概要展示
- `reportDetails` 用于详情页完整渲染

### 与现有类型的关系

- 保留 `DungeonRun` 作为引擎内部运行态，便于复用现有事件与战斗逻辑
- 但它不再作为长期暴露给页面的“进行中秘境状态”
- 玩家最终看到的是 `AdventureReport`

---

## 流程设计

### 开始探索

玩家确认出发后：

1. 校验秘境是否解锁
2. 校验队伍是否合法
3. 校验补给消耗与资源是否足够
4. 扣除出发消耗
5. 将弟子状态切为探索中专用的运行态
6. 构造内部 `DungeonRun`
7. 调用 `AutoRunEngine` 一次性跑完
8. 生成 `AdventureReport`
9. 应用结算结果
10. 恢复/更新弟子状态
11. 写入秘境报告与全局摘要日志

### 即时结算引擎循环

每次探索的引擎循环大致如下：

1. 写入 `run_started`
2. 对每层写入 `floor_started`
3. 根据托管策略评估各路线，记录 `route_considered`
4. 选择路线并记录 `route_selected`
5. 逐个解析事件，记录 `event_resolved`
6. 遇到可自动决策节点时写入：
   - `blessing_decision`
   - `shop_decision`
   - `pet_decision`
7. 每次状态或奖励变化时写入：
   - `reward_gained`
   - `member_state_changed`
8. 每层或关键节点后判断是否撤退
9. 根据结果写入：
   - `run_completed`
   - `run_retreated`
   - `run_failed`

### 撤退与失败

即时结算并不改变已有结算规则：

- 通关：发放 100% 奖励
- 撤退：发放 50% 资源奖励 + 全部物品奖励
- 失败：发放 50% 资源奖励 + 全部物品奖励，角色统一进入恢复

但这三种结果都必须在报告中说明原因，而不是只留一个结果状态。

例如：

- `稳健策略：队伍平均血量低于安全阈值，选择撤退`
- `战斗事件后全队阵亡，探索失败`
- `秘境所有层已结算完成，成功通关`

---

## 决策记录粒度

### 记录原则

日志既不能只有一句摘要，也不能细到每个数字都拆成噪音。

本设计采用“决策级 + 结果级”记录粒度：

- 玩家能理解系统为什么这么做
- 玩家能看到每次关键变化后的状态
- UI 不会被无意义细节淹没

### 必须记录的内容

每次探索步骤至少要能回答以下问题：

- 当时在第几层
- 碰到了什么路线或事件
- 系统做了什么选择
- 为什么这样选
- 造成了什么结果
- 队伍状态和收益发生了什么变化

### 示例

```text
第 3 层开始
评估路线：岔路 A（低风险，奖励低）/ 岔路 B（中风险，灵草更多）
收益策略选择岔路 B：当前队伍状态稳定，优先提升资源收益
触发战斗：击败守关妖修
获得奖励：灵石 +120，灵草 +18
自动选择祝福：青木余荫
选择原因：收益策略优先资源增益
```

---

## 页面与交互

### 秘境页

当前“进行中的冒险”区块将改为“最近探索记录”。

每张卡片展示：

- 秘境名
- 参与队伍
- 托管策略
- 战术预设
- 结果标签（通关 / 撤退 / 失败）
- 到达层数
- 主要收益
- `查看过程` 按钮

开始探索时的组队面板新增一项：

- 托管策略选择器：`稳健 / 战斗 / 收益`

### 探索过程详情页

新增独立页面，例如：

- `/adventure/report/:reportId`

页面结构：

#### 顶部总览

- 秘境名称
- 出战队伍
- 补给方案
- 战术预设
- 托管策略
- 开始/结束时间
- 最终结果
- 总收益

#### 过程时间线

按 `AdventureReportStep` 顺序展示整次探索过程。

每个步骤展示：

- 步骤标题
- 摘要
- 决策理由
- 本层标识
- 状态快照摘要

#### 结算面板

- 资源奖励
- 物品掉落
- 队伍最终状态
- 撤退/失败原因

### 全局日志页

现有“事件记录”页新增秘境明细能力：

- 新增秘境相关筛选
- 每条秘境摘要事件附带 `查看明细` 入口
- 点击后跳转到对应 `AdventureReport` 详情页

日志页负责按时间查找；
探索详情页负责完整复盘。

---

## 持久化设计

### 持久化目标

探索报告需要跨刷新、跨离线保留，因此必须进入 IndexedDB，而不仅是 Zustand 内存态。

### 存储方式

建议沿用现有 `adventure` store，但扩展记录类型：

```typescript
type SavedAdventureRecord =
  | { id: string; kind: 'dispatch'; dispatch: DispatchState }
  | { id: string; kind: 'report'; report: AdventureReport }
```

本次改造后：

- 秘境实时 `run` 记录将被移除或大幅弱化
- `dispatch` 记录继续保留
- 新增 `report` 记录

### 保留数量

报告数量建议限制在最近 30-50 份，避免 IndexedDB 持续膨胀。

### 全局事件日志联动

`history` store 继续写摘要事件，但秘境相关事件的 `data` 应包含：

- `reportId`
- `dungeonId`
- `result`
- `floorsCleared`

这样日志页就能从摘要跳转到完整明细。

---

## 对现有系统的影响

### AdventureStore

需要重构的部分：

- `startRun`
- `advanceFloor`
- `idleTick`
- `tickAllIdle`
- `completeRun`
- `failRun`
- 与 `activeRuns` 强绑定的运行态逻辑

保留或复用的部分：

- 出发资源校验
- 角色状态更新
- 奖励结算
- 商店 / 祝福 / 灵兽的底层规则调用

### AdventurePage

需要替换：

- “进行中的冒险”展示
- 10 秒倒计时
- 手动“继续”按钮
- 被祝福/游商/灵兽打断的交互流程

新增：

- 托管策略选择
- 最近探索记录卡片
- 跳转详情按钮

### EventLogPage

需要新增：

- 秘境类筛选或分区
- 基于 `reportId` 的详情跳转

### SectPage / ActionAgenda

当前围绕“进行中的秘境”显示的信息需要调整为：

- 最近探索概况
- 是否存在可再次探索的机会
- 是否有新的探索报告可查看

### SaveSystem

需要调整：

- 保存与读取 `AdventureReport`
- 清理旧的实时 `run` 持久化结构
- 从历史记录中恢复可跳转的秘境摘要事件

---

## 测试策略

### 1. 引擎测试

验证 `AutoRunEngine`：

- 能即时跑完整次秘境
- 能输出完整 `AdventureReport`
- 报告步骤顺序正确
- 不同事件会产生对应步骤

### 2. 策略测试

验证三种托管策略在相同情境下的差异：

- `稳健` 更早撤退，更偏低风险路径
- `战斗` 更偏输出与推进
- `收益` 更偏资源与收益类选择

### 3. Store 测试

验证 `AdventureStore`：

- 能正确校验出发条件
- 能正确扣除补给与资源
- 能正确应用通关 / 撤退 / 失败结算
- 能正确生成并保存报告
- 能正确更新弟子状态

### 4. 持久化测试

验证：

- 报告可保存到 IndexedDB
- 刷新后可恢复最近探索记录
- 历史日志中的秘境摘要仍能关联到报告详情

### 5. 页面测试

验证：

- 秘境页能展示最近探索卡片
- 详情页能渲染完整步骤时间线
- 日志页能显示秘境摘要并跳转到详情页

---

## 实施建议

建议分三步实施：

1. **先做引擎与数据模型**
   先完成 `AutomationStrategy`、`AdventureReport`、`AutoRunEngine`

2. **再接 AdventureStore 与持久化**
   把开始探索改成即时结算，并保存报告

3. **最后接 UI 与日志跳转**
   替换秘境页、补齐详情页与日志明细入口

这样可以先把底层跑通，再逐步把 UI 切换过去，降低回归风险。

---

## 结论

本方案将秘境系统从“实时逐层推进”升级为“即时结算的托管脚本系统”，并通过结构化 `AdventureReport` 承载完整过程回放与日志明细能力。

它保留现有 Roguelike 事件与战斗规则，重点重构的是“玩家如何与秘境交互、系统如何记录探索过程”。

最终效果应满足：

- 玩家点一次就能完整托管
- 玩家能看见为什么系统这样决策
- 玩家能在秘境页看概要，在详情页看完整过程
- 玩家能在全局日志中按秘境追踪明细
