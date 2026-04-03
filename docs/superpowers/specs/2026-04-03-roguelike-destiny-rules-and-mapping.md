# EndlessQuest - 自动化宿命 Roguelike 可实现规则表与系统映射

**日期**: 2026-04-03  
**状态**: 规则细化稿 v1  
**关联文档**: `2026-04-03-roguelike-destiny-automation-design.md`  
**目的**: 把高层方案细化为可实现的规则表，并反推当前代码中哪些模块可复用、哪些需要改造

---

## 一、使用方式

上一篇设计稿负责回答“要做成什么体验”，这份文档负责回答两件事：

1. 这套体验怎样转成可配置的规则和阈值
2. 以当前代码库为基础，应该在哪些模块上叠加，哪些模块上重构

本稿故意把规则写成**首轮可调参数**，不是最终定死的数值。  
目标是先建立一套稳定的实现骨架，再进入实际数值调优。

---

## 二、实现总原则

### 2.1 新系统不直接替换现有自动冒险引擎

当前代码里已经有一套可运行的自动冒险骨架：

- `AutomationStrategy = steady | combat | profit`
- `AutoRunPolicy` 负责路线/祝福/商店/捕宠/撤退
- `AutoRunEngine` 负责整次托管结算
- `AdventureReport` 负责回放和摘要

这套骨架不应该推翻。  
新的“7 档主方针”应先作为**上层宗门哲学**存在，再向下映射成现有引擎可理解的低层执行参数。

### 2.2 新系统分为三层

1. **宗门策略层**
   - 主方针
   - 命运标签
   - 暗流状态

2. **弟子宿命层**
   - 命苗
   - 命格阶段
   - 风险等级
   - 剧变记录

3. **秘境执行层**
   - 现有 AutoRunEngine / AutoRunPolicy
   - 祝福 / 遗物 / 局内异变
   - 报告与结算

### 2.3 第一版尽量复用现有概念

为了降低实现风险：

- 保留当前 `AutomationStrategy` 作为底层托管执行器
- 保留当前 `discipleMutations` 作为“局内异变 / build 暴走”的第一版载体
- 保留当前 `CharacterDisposition` 作为“自动选队与培养倾向”的基础评分器
- 在其上新增“宿命状态”与“宗门哲学配置”

---

## 三、核心数据结构建议

## 3.1 新增宗门级策略类型

```ts
export type SectRiskPolicyId =
  | 'lianfeng'
  | 'shouheng'
  | 'shenji'
  | 'zhuxi'
  | 'yapo'
  | 'niejie'
  | 'fenming'

export type DestinyAmplifierId =
  | 'yinji'
  | 'jinjie'
  | 'cangmo'
  | 'xumai'
  | 'zheyun'
```

### 3.2 新增弟子宿命结构

```ts
export type DestinySeedId =
  | 'fortuneSeed'
  | 'tribulationSeed'
  | 'abyssSeed'
  | 'guardianSeed'
  | 'plunderSeed'
  | 'afterglowSeed'
  | 'anomalySeed'

export type DestinyStage = 'seed' | 'stirring' | 'formed' | 'mutated' | 'heavenmarked'
export type DestinyRiskLevel = 'safe' | 'drifting' | 'danger' | 'calamity'

export interface DestinyState {
  seedId: DestinySeedId
  stage: DestinyStage
  exposure: number
  instability: number
  riskLevel: DestinyRiskLevel
  matchedAmplifiers: DestinyAmplifierId[]
  dominantStyle?: 'burst' | 'tank' | 'control' | 'sacrifice' | 'summon'
  lastMajorEvent?: {
    type: 'stirred' | 'formed' | 'mutated' | 'shock' | 'heavenmarked'
    at: number
    summary: string
  }
}
```

### 3.3 新增宗门暗流结构

```ts
export interface SectDarkCurrent {
  fortune: number
  tribulation: number
  abyss: number
  guardian: number
  plunder: number
  afterglow: number
  anomaly: number
  lastShiftAt: number | null
}
```

### 3.4 新增宗门策略设置

```ts
export interface SectStrategySettings {
  activePolicy: SectRiskPolicyId
  activeAmplifiers: DestinyAmplifierId[]
  switchCooldownDays: number
  lastSwitchedAt: number | null
}
```

---

## 四、7 档主方针可实现规则表

## 4.1 实现思路

第一版不让 7 档直接控制所有行为，而是先把每档主方针收敛成一个固定 profile。

```ts
export interface SectRiskPolicyProfile {
  executorStrategy: AutomationStrategy
  tacticalPreset: TacticalPreset
  rareSeedMultiplier: number
  highRiskRecruitBias: number
  coreFocusWeight: number
  mutationExposureMultiplier: number
  highVarianceRouteWeight: number
  eventChaosWeight: number
  retreatAvgHpThreshold: number
  retreatLowHpThreshold: number
  darkCurrentGainMultiplier: number
  darkCurrentDecayPerDay: number
  tianmingChanceMultiplier: number
}
```

## 4.2 首轮 profile 表

| 主方针 | 底层执行 | 战术预设 | 稀有命苗倍率 | 高危招募偏置 | 核心倾斜 | 高波动路线权重 | 混沌事件权重 | 异变暴露倍率 | 撤退均血阈值 | 撤退最低血阈值 | 暗流增幅 | 暗流日衰减 | 天命倍率 |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 敛锋 `lianfeng` | `steady` | `conservative` | 0.75 | -18 | 0.8 | 0.65 | 0.6 | 0.7 | 0.56 | 0.36 | 0.7 | 5 | 0.35 |
| 守衡 `shouheng` | `steady` | `balanced` | 0.9 | -10 | 0.9 | 0.8 | 0.8 | 0.85 | 0.48 | 0.28 | 0.85 | 4 | 0.5 |
| 审机 `shenji` | `profit` | `balanced` | 1.0 | 0 | 1.0 | 1.0 | 1.0 | 1.0 | 0.4 | 0.22 | 1.0 | 3 | 1.0 |
| 逐隙 `zhuxi` | `profit` | `burst` | 1.15 | 8 | 1.15 | 1.2 | 1.2 | 1.15 | 0.34 | 0.18 | 1.2 | 2 | 1.3 |
| 压魄 `yapo` | `combat` | `burst` | 1.3 | 14 | 1.35 | 1.35 | 1.25 | 1.3 | 0.3 | 0.15 | 1.35 | 1 | 1.7 |
| 逆劫 `niejie` | `combat` | `burst` | 1.45 | 20 | 1.55 | 1.55 | 1.45 | 1.55 | 0.24 | 0.12 | 1.55 | 0 | 2.2 |
| 焚命 `fenming` | `combat` | `bossCounter` | 1.65 | 28 | 1.8 | 1.8 | 1.7 | 1.8 | 0.2 | 0.08 | 1.8 | 0 | 3.0 |

### 4.3 解释

- `executorStrategy` 和 `tacticalPreset` 直接复用现有自动冒险引擎，不需要第一版重写整套决策器。
- `rareSeedMultiplier` 决定自动招募中高稀有命苗的抽取修正。
- `highRiskRecruitBias` 决定高风险弟子的录取倾向。
- `coreFocusWeight` 决定自动培养、自动配装、自动编队时对核心弟子的资源倾斜。
- `highVarianceRouteWeight` 和 `eventChaosWeight` 决定自动探险多爱撞高波动内容。
- `mutationExposureMultiplier` 决定弟子宿命推进与局内异变触发速度。
- `retreat*Threshold` 作为对现有 `shouldRetreat` 的上层覆盖参数。
- `darkCurrentGainMultiplier` / `darkCurrentDecayPerDay` 决定宗门越陷越深还是容易回稳。
- `tianmingChanceMultiplier` 控制最高光事件只在激进路线显著提升。

---

## 五、命运标签可实现规则表

## 5.1 标签 profile 结构

```ts
export interface DestinyAmplifierProfile {
  seedWeightBias: Partial<Record<DestinySeedId, number>>
  instabilityGain: number
  coreAmplifyWeight: number
  mutationWeightBias: number
  darkCurrentBias: Partial<Record<keyof SectDarkCurrent, number>>
}
```

## 5.2 首轮标签权重

| 标签 | 命苗权重倾向 | 不稳定度增量 | 核心放大权重 | 局内异变偏置 | 暗流偏置 |
|---|---|---:|---:|---:|---|
| 引机 `yinji` | `fortune +6`, `afterglow +3`, `guardian +1` | -2 | 1.1 | 1.05 | `fortune +4`, `afterglow +2` |
| 近劫 `jinjie` | `tribulation +6`, `anomaly +2`, `plunder +2` | +6 | 1.25 | 1.2 | `tribulation +5`, `anomaly +3` |
| 藏魔 `cangmo` | `abyss +7`, `anomaly +4`, `tribulation +1` | +10 | 1.35 | 1.35 | `abyss +6`, `anomaly +4` |
| 续脉 `xumai` | `guardian +6`, `afterglow +4`, `fortune +1` | -4 | 1.0 | 0.95 | `guardian +5`, `afterglow +3` |
| 折运 `zheyun` | `plunder +6`, `fortune +2`, `tribulation +2` | +4 | 1.2 | 1.15 | `plunder +5`, `fortune +2`, `tribulation +2` |

## 5.3 作用规则

标签不直接决定结果，而是进入三次计算：

1. 招募候选命苗评分
2. 核心弟子放大评分
3. 暗流增长方向修正

---

## 六、自动招募规则

## 6.1 当前候选模型

第一版建议每次招募候选保留如下字段：

```ts
interface RecruitCandidateProfile {
  quality: CharacterQuality
  seedId: DestinySeedId
  seedRarity: 1 | 2 | 3 | 4 | 5
  baseRisk: number
  pathAffinity: CultivationPath
  fateTags: FateTag[]
  specialties: Specialty[]
}
```

## 6.2 自动招募评分公式

```ts
recruitScore =
  qualityScore
  + seedRarityScore * rareSeedMultiplier
  + seedAmplifierAffinity
  + policyRiskBias
  + darkCurrentAffinity
  - baseRiskPenalty
  + specialtyUtilityScore
```

建议首轮基础分：

- `qualityScore`: `common 8 / spirit 16 / immortal 28 / divine 44 / chaos 60`
- `seedRarityScore`: `1=6 / 2=14 / 3=24 / 4=38 / 5=56`
- `baseRiskPenalty`: 直接取候选人 `baseRisk`
- `specialtyUtilityScore`: 0~18，沿用当前专长评分思路

### 6.3 风险偏置计算

```ts
policyRiskBias = candidate.baseRisk * (highRiskRecruitBias / 20)
```

解释：

- `敛锋` 会让高风险弟子显著掉分
- `焚命` 会让高风险弟子显著加分

### 6.4 自动招募录取阈值

| 情况 | 录取规则 |
|---|---|
| 弟子池未满 | `recruitScore >= 22` 即录取 |
| 弟子池已满但低于目标核心数 | 若 `recruitScore` 高于池内末位弟子 10 分以上，替换末位 |
| 出现 `seedRarity >= 4` 且与当前标签匹配 | 无论当前池状态如何，进入“优先保留”分支 |
| `quality = chaos` 且 `baseRisk >= 70` | 仅 `压魄 / 逆劫 / 焚命` 有资格录取 |

### 6.5 首轮可复用逻辑

现有 `shouldAutoRecruit` 可以保留；  
新系统只替换“是否收人”的内部评分，不改资源保底逻辑。

---

## 七、核心弟子判定规则

## 7.1 目标

自动化体系下，必须稳定选出少数“被重点培养的人”，否则：

- 自动配装会散
- 自动探险会散
- 宿命成长也会散

## 7.2 核心评分公式

```ts
coreScore =
  dispositionAdventureScore * 0.3
  + dispositionRiskScore * 0.2
  + seedRarityScore * 0.8
  + destinyStageScore
  + amplifierMatchScore
  + currentGearValue * 0.15
  + survivalHistoryScore
  + policyCoreBonus
```

建议阶段分：

- `seed = 0`
- `stirring = 10`
- `formed = 26`
- `mutated = 46`
- `heavenmarked = 88`

### 7.3 核心数量

| 主方针 | 核心人数上限 |
|---|---:|
| 敛锋 | 1 |
| 守衡 | 1 |
| 审机 | 2 |
| 逐隙 | 2 |
| 压魄 | 3 |
| 逆劫 | 3 |
| 焚命 | 3 |

### 7.4 用途

`coreScore` 进入以下系统：

1. 自动修行资源倾斜
2. 自动配装优先级
3. 自动编队优先级
4. 震荡与天命事件的主要目标筛选

---

## 八、自动修行规则

## 8.1 思路

当前代码已有：

- `cultivationPath`
- `fateTags`
- `specialties`

第一版不需要新写一整套“修行树”，而是新增一个自动分流 profile。

```ts
interface AutoCultivationProfile {
  preferredCombatStyle: 'burst' | 'tank' | 'control' | 'sacrifice' | 'summon'
  statWeights: { hp: number; atk: number; def: number; spd: number; crit: number }
  pathBias: Partial<Record<CultivationPath, number>>
  riskAmplification: number
}
```

## 8.2 主方针对修行的基础偏置

| 主方针 | 风格倾向 | 说明 |
|---|---|---|
| 敛锋 | `tank / control` | 优先稳定、承压、容错 |
| 守衡 | `tank / burst` | 偏均衡 |
| 审机 | `burst / control` | 多数 build 从这里开始明显分化 |
| 逐隙 | `burst / sacrifice` | 追求更快成形 |
| 压魄 | `burst / summon` | 资源压给主核 |
| 逆劫 | `sacrifice / burst` | 接受负面换强度 |
| 焚命 | `sacrifice / burst / anomaly` | 极端化最强 |

### 8.3 命苗对战斗定位的首轮映射

| 命苗 | 默认战斗定位 |
|---|---|
| 机缘苗 | 控场 / 资源型辅助 |
| 劫火苗 | 爆发 / 承压爆发 |
| 心渊苗 | 献祭 / 失控爆发 |
| 护命苗 | 承伤 / 续航 |
| 夺运苗 | 收割 / 掠夺收益 |
| 残照苗 | 后期反打 / 绝境反转 |
| 异相苗 | 随机高波动核心 |

### 8.4 实现建议

第一版不改角色基础成长公式，只改：

1. 自动推荐/选择的 `cultivationPath`
2. 自动分配的功法学习优先级
3. 自动编队时角色用途标签

---

## 九、自动配装规则

## 9.1 配装评分公式

```ts
equipFitScore =
  roleMatchScore
  + destinyStyleMatch
  + coreScore * coreFocusWeight
  + survivalNeedScore
  + mutationSynergyScore
```

### 9.2 配装优先原则

#### 稳健路线

1. 先补最低生还率弟子
2. 再补前排与续航
3. 最后才堆主核伤害

#### 激进路线

1. 先喂核心弟子
2. 其次强化能触发 build 联动的角色
3. 非核心只拿底线装备

### 9.3 首轮实现建议

第一版不一定要立即把所有装备自动化逻辑重写到底层。  
可以先做：

1. 自动推荐配置
2. 自动装备按钮
3. 主方针驱动的 equip sort

等规则稳定后，再把“角色详情里的手动穿装”进一步弱化。

---

## 十、自动探险规则

## 10.1 路线与事件的上层修正

当前 `pickAutomationRoute()` 已按 `steady / combat / profit` 工作。  
新系统不直接推翻，而是在调用前先生成更细的权重 profile：

```ts
interface RunExecutorBias {
  routeRiskBias: number
  mutationEventBias: number
  rewardEventBias: number
  recoveryEventBias: number
  petCaptureBias: number
}
```

### 10.2 方针到执行偏置映射

| 主方针 | 路线风险偏置 | 异变事件偏置 | 收益事件偏置 | 恢复事件偏置 | 捕宠偏置 |
|---|---:|---:|---:|---:|---:|
| 敛锋 | -22 | -18 | -4 | +24 | -10 |
| 守衡 | -12 | -10 | 0 | +14 | -4 |
| 审机 | 0 | 0 | 0 | 0 | 0 |
| 逐隙 | +8 | +10 | +8 | -6 | +4 |
| 压魄 | +14 | +16 | +6 | -10 | +8 |
| 逆劫 | +20 | +24 | +10 | -18 | +10 |
| 焚命 | +28 | +32 | +12 | -26 | +12 |

### 10.3 撤退逻辑

现有 `AutoRunPolicy.shouldRetreat()` 使用固定阈值。  
建议改为：

```ts
shouldRetreat = 
  averageHpRatio < profile.retreatAvgHpThreshold
  || lowestHpRatio < profile.retreatLowHpThreshold
  || shockPenaltyExceeded
```

其中 `shockPenaltyExceeded` 为新值：

- 若队伍中 2 名以上核心弟子处于 `danger / calamity`
- 且本次 run 已出现 1 次重大异变失败
- 稳健路线提前撤，激进路线继续赌

---

## 十一、宿命推进规则

## 11.1 曝露值 `exposure`

宿命阶段推进靠 `exposure`，而不是时间。

### 11.2 首轮事件加值

| 行为 | 曝露值变化 |
|---|---:|
| 进入一次高波动路线 | +8 |
| 触发一次宿命/异变事件 | +12 |
| 完成一层高风险战斗并生还 | +6 |
| 完成一次高风险 run | +15 |
| 高风险 run 失败但生还 | +10 |
| 被选为核心并吃到关键装备 | +6 |
| 在稳健路线长期留守 1 天 | -4 |
| 暗流纠偏日结算 | -3 |

### 11.3 阶段阈值

| 阶段 | 曝露值范围 |
|---|---|
| 命苗 `seed` | 0 - 39 |
| 萌动 `stirring` | 40 - 89 |
| 成格 `formed` | 90 - 159 |
| 异变 `mutated` | 160 - 239 |
| 天命候选 | 240+ |

### 11.4 主方针修正

```ts
effectiveExposureGain = baseExposureGain * mutationExposureMultiplier
```

---

## 十二、风险等级规则

## 12.1 不稳定度 `instability`

风险等级不是直接等于宿命阶段，需要独立累积一个 `instability`。

### 12.2 首轮增减规则

| 行为 | 不稳定度变化 |
|---|---:|
| 异变成功 | +18 |
| 高风险 run 存活通关 | +10 |
| 主方针切换造成震荡 | +24 |
| 核心弟子在濒死后生还 | +14 |
| 处于 `近劫 / 藏魔` 标签放大 | +6 |
| 稳健路线连续留守 1 天 | -8 |
| `续脉` 标签生效 | -4 |

### 12.3 风险等级阈值

| 风险等级 | 不稳定度 |
|---|---|
| 安 `safe` | 0 - 24 |
| 浮 `drifting` | 25 - 59 |
| 危 `danger` | 60 - 109 |
| 劫 `calamity` | 110+ |

### 12.4 页面用途

这个结果直接映射到弟子列表主视觉，而不是再做额外解释层。

---

## 十三、宗门暗流规则

## 13.1 目标

暗流不做成显性计量条，但实现层必须有量化值，否则无法稳定产生“宗门越来越偏”的体感。

### 13.2 暗流增长公式

每次 run 结束后：

```ts
darkCurrent[dominantSeedFamily] +=
  (runVarianceScore + mutatedCoreCount * 6 + majorEventWeight) * darkCurrentGainMultiplier
```

### 13.3 主导命苗家族映射

| 命苗 | 暗流家族 |
|---|---|
| 机缘苗 | `fortune` |
| 劫火苗 | `tribulation` |
| 心渊苗 | `abyss` |
| 护命苗 | `guardian` |
| 夺运苗 | `plunder` |
| 残照苗 | `afterglow` |
| 异相苗 | `anomaly` |

### 13.4 暗流层级建议

| 数值 | 体感层级 |
|---|---|
| 0 - 39 | 背景态 |
| 40 - 79 | 可感知偏移 |
| 80 - 139 | 显著偏移 |
| 140+ | 强暗流期 |

### 13.5 暗流作用

暗流达到 `可感知偏移` 以上后，开始影响：

1. 招募候选命苗权重
2. 秘境特殊事件池
3. 极端高光事件出现条件

但不在首页直接明示概率。

---

## 十四、方针切换与命格震荡规则

## 14.1 震荡触发条件

当主方针跨越 2 档及以上切换时，触发 `命格震荡`。

例如：

- `敛锋 -> 审机` 不震荡
- `敛锋 -> 逐隙` 震荡
- `守衡 -> 焚命` 强震荡

### 14.2 震荡值

```ts
shockValue = abs(nextPolicyIndex - prevPolicyIndex) * 12
```

### 14.3 受影响对象

对每名核心弟子：

```ts
shockImpact =
  shockValue
  + stageBonus
  + instability * 0.2
  - guardianMitigation
```

`stageBonus`:

- `seed +0`
- `stirring +4`
- `formed +10`
- `mutated +18`
- `heavenmarked +24`

### 14.4 结果表

| `shockImpact` | 结果 |
|---|---|
| < 20 | 仅记录震荡，无额外后果 |
| 20 - 39 | `instability +8`，近期 build 失配 |
| 40 - 59 | 触发一次小型因果事件 |
| 60+ | 触发一次大事件候选池 |

---

## 十五、天命降临规则

## 15.1 候选条件

角色只有满足全部条件，才进入 `天命` 判定池：

1. 阶段已达 `mutated`
2. 风险等级为 `danger` 或 `calamity`
3. 当前为核心弟子
4. 最近 3 次高波动 run 至少生还 2 次
5. 当前主方针为 `压魄 / 逆劫 / 焚命`

### 15.2 判定公式

```ts
tianmingChance =
  baseChance
  * policy.tianmingChanceMultiplier
  * seedRarityFactor
  * darkCurrentResonance
```

建议首轮基线：

- `baseChance = 0.0015`
- `seedRarityFactor = 1.0 / 1.2 / 1.5 / 2.0 / 3.0`
- `darkCurrentResonance = 1.0 ~ 1.8`

### 15.3 结果

通过后：

1. 阶段变为 `heavenmarked`
2. 生成独特命格名
3. 获得一个专属 build 支点
4. 增强宗门暗流外溢

### 15.4 设计控制

第一版建议：

- 单弟子最多一次 `天命`
- 单宗门周期内最多 1 名活跃 `天命` 弟子拥有高额外溢

避免系统过快通胀。

---

## 十六、现有系统复用清单

## 16.1 可直接复用

| 文件 | 状态 | 说明 |
|---|---|---|
| `src/systems/roguelike/AutoRunEngine.ts` | 直接复用 | 已具备整次托管结算、步骤记录、局内异变、奖励处理能力 |
| `src/systems/roguelike/AutoRunPolicy.ts` | 直接复用 | 已有路线、祝福、商店、撤退、捕宠决策器，可作为底层执行器 |
| `src/stores/adventureStore.ts` | 直接复用主骨架 | 已有 `runAutomation()`、报告列表、报告详情与结算闭环 |
| `src/systems/roguelike/AdventureReportInsightSystem.ts` | 可直接复用并扩展 | 已能从报告里抽取“关键构筑”“转折点”“归宗结果” |
| `src/data/discipleMutations.ts` | 直接复用第一版 | 现有“弟子异变”非常适合充当局内 build 暴走层 |
| `src/systems/roguelike/RunBuildSystem.ts` | 直接复用并扩权重上下文 | 已有祝福、遗物、异变的权重与数值处理 |
| `src/systems/character/CharacterDispositionSystem.ts` | 直接复用评分骨架 | 适合继续承接自动选队、自动培养的基础评分 |

## 16.2 需要扩展但不必推翻

| 文件 | 改造级别 | 需要新增 |
|---|---|---|
| `src/types/character.ts` | 中 | 给 `Character` 新增 `destinyState`、`destinyHistory`、`seedRarity` 等字段 |
| `src/types/sect.ts` | 中 | 给 `Sect` 新增 `strategySettings`、`darkCurrent` |
| `src/types/adventure.ts` | 中 | 给 `AdventureRunConfig`、`AdventureReport` 增加 `policySnapshot`、`amplifierSnapshot`、`destinyChanges` |
| `src/systems/sect/SectAutomationSystem.ts` | 中高 | 从“ casualtyTolerance + preferredDungeon ”改成“主方针驱动的运行配置生成器” |
| `src/systems/roguelike/RunBuildContext.ts` | 中 | 把 `routeId + buildingLevels` 扩展成 `route + buildings + policy + tags + darkCurrent` |
| `src/pages/CharactersPage.tsx` | 中高 | 列表从“战斗画像/培养信息”改成“风险优先 + 阶段优先” |
| `src/pages/SectPage.tsx` | 高 | 当前首页有要务和战报，不符合新方案，需要重构为资源 + 整体策略首页 |
| `src/systems/sect/SectOverviewSystem.ts` | 高 | 当前围绕“要务 / 战报 / 可做的事”，需要转成“宗门气象与策略摘要” |

## 16.3 需要新增模块

| 建议文件 | 职责 |
|---|---|
| `src/data/sectRiskPolicies.ts` | 7 档主方针 profile 定义 |
| `src/data/destinyAmplifiers.ts` | 标签 profile 定义 |
| `src/data/destinySeeds.ts` | 命苗定义、稀有度、基础风险、风格倾向 |
| `src/systems/destiny/DestinySystem.ts` | 命苗推进、风险等级、成格与异变结算 |
| `src/systems/destiny/DarkCurrentSystem.ts` | 宗门暗流增长、衰减、偏移计算 |
| `src/systems/sect/AutoRecruitSystem.ts` | 自动招募评分与录取替换 |
| `src/systems/sect/CoreDiscipleSystem.ts` | 核心弟子识别与排序 |
| `src/systems/sect/AutoCultivationSystem.ts` | 自动修行方向、功法偏置、风格分流 |
| `src/systems/sect/AutoEquipSystem.ts` | 自动配装评分与分配 |

---

## 十七、现有设计文档的继承关系

## 17.1 可继承的文档价值

### `2026-03-31-adventure-automation-design.md`

可保留：

- 即时结算托管引擎
- 报告系统
- 三档底层执行策略

应升级为：

- “底层执行器设计稿”，而不再是最终产品体验稿

### `2026-03-31-disciple-build-roguelike-design.md`

可保留：

- “长期身份 + 局内成长”的基本方向
- 弟子个体异变优先于纯整队 buff

应升级为：

- 现在这套“命苗 -> 命格 -> 异变 -> 天命”的更强宿命版本

---

## 十八、现有页面的改造反推

## 18.1 宗门首页

当前 [SectPage.tsx](C:/Project/endlessQuest/src/pages/SectPage.tsx) 有：

- `要务`
- `资源`
- `弟子`
- `战报`

新方案要求：

- 只保留 `资源`
- 新增 `主方针设置`
- 新增 `命运标签设置`
- 新增 `宗门风险气象`
- 去掉 `要务`
- 去掉 `战报`

结论：

- `SectPage` 不是小修，是结构性重排
- `ActionAgenda` 不再属于首页，应移位或弱化

## 18.2 弟子页

当前 [CharactersPage.tsx](C:/Project/endlessQuest/src/pages/CharactersPage.tsx) 已有：

- 自动运转设置
- 弟子列表
- 角色详情
- 战斗画像、修行路径、命格标签

这页非常适合演化为新方案的主信息页。  
改造重点不是推翻，而是调整信息优先级：

1. 列表先看风险等级与阶段
2. 卡片先看命苗/命格，不先看数值
3. 详情页增加成长轨迹与外溢影响
4. 自动运转设置中的“保底与补员”迁到宗门首页策略面板

## 18.3 战报与详情页

现有 `AdventureReport` 和 insight 系统已经具备非常好的承载基础。  
只需要新增：

- 本次核心弟子
- 本次宿命推进
- 本次暗流偏移
- 是否逼近天命候选

---

## 十九、建议的实现边界

为了避免一次性把系统炸开，建议实现时遵守这三个边界：

1. 第一版不要同时重写底层自动冒险决策器和所有页面  
   先把 7 档主方针映射到底层 3 档执行器。

2. 第一版不要立刻让所有弟子都有完整宿命时间线  
   先只给当前宗门中的核心弟子写完整轨迹，其余弟子保留简版。

3. 第一版不要让暗流影响太多系统  
   先影响 `招募` 与 `秘境事件池`，确认体感成立后再影响更多掉落与访客逻辑。

---

## 二十、结论

把上一篇高层方案落到实现层后，最重要的结论是：

1. 当前代码并不需要推翻重来  
   自动冒险、报告、局内异变、角色评分这些骨架都能复用。

2. 真正需要新增的是“宗门哲学”和“弟子宿命”两层中间结构  
   当前系统有执行器，但还没有真正塑形长期结果的上层。

3. 第一版最合理的实现路径是：  
   **7 档主方针 -> 映射到现有 3 档自动执行 -> 用命苗/命格/暗流把结果沉淀到弟子与宗门**

如果上一篇设计稿回答的是“宗门为什么会长成传奇”，  
这篇规则稿回答的就是：

**它应该先在哪里加字段、在哪里加权重、在哪里接回现有引擎。**
