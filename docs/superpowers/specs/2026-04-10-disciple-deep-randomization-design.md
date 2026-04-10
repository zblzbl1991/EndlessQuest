# 弟子深度随机化设计

> 日期：2026-04-10
> 状态：已确认

## 概述

弟子生成系统从"品质决定一切"改为**多维度独立随机叠加**，类似暗黑装备的词缀组合爆炸。品质只影响随机池的宽窄，不决定绝对强弱。每个弟子的五行亲和、成长倍率、天赋词缀、命格都是独一无二的组合。

## 设计目标

- 两个弟子完全相同的概率趋近于零
- 品质是潜力空间而非保底优势：凡品弟子在特定维度可以超过灵仙弟子
- 玩家的核心判断从"品质高不强"变为"这个弟子适合做什么"
- 组合空间从几千种提升到数百万种

## 一、五行亲和系统

### 背景

现有战斗系统有三元素克制（火>冰>雷>火），统一为五行以匹配仙侠世界观。

### 五行克制

金 > 木 > 土 > 水 > 火 > 金（循环克制）

克制加成：克制方伤害 +25%，被克制方伤害 -15%。

### 亲和分配

每个弟子生成时随机分配主亲和：

- **主亲和**：5 选 1（金/木/水/火/土），均匀随机，与品质无关
- **副亲和**：品质决定出现概率，从剩余 4 种中随机（不与主亲和相同）

| 品质 | 副亲和概率 |
|------|-----------|
| 凡品 | 0% |
| 灵仙 | 20% |
| 仙品 | 40% |
| 神品 | 60% |
| 混沌 | 80% |

### 亲和效果

- 使用同元素技能伤害 +20%（主亲和）/ +10%（副亲和）
- 被克制元素技能额外受伤 +25%
- 学习同元素功法参悟速度 +15%（主亲和）/ +8%（副亲和）
- 元素亲和不影响修炼速度本身，只影响战斗和功法学习

### 需要同步修改的文件

- `src/types/character.ts` — 新增 `elementAffinity` 字段
- `src/data/skills.ts` — 元素克制表从三元素改为五行
- `src/data/activeSkills.ts` — 技能元素从 fire/ice/lightning 改为 metal/wood/earth/water/fire
- `src/data/techniquesTable.ts` — 功法元素同步更新
- `src/systems/combat/CombatEngine.ts` — 元素克制计算更新
- `src/data/enemies.ts` — 敌人元素更新

### 类型定义

```typescript
export type Element = 'metal' | 'wood' | 'earth' | 'water' | 'fire'

export interface ElementAffinity {
  primary: Element
  secondary?: Element
}
```

## 二、成长倍率系统

### 概述

每个弟子有 6 个成长倍率（hp/atk/def/spd/crit/critDmg），在生成时随机确定，终身不变。成长倍率影响等级提升和境界突破时的属性增长，不影响装备和功法的固定加成。

### 生成规则

每个属性独立随机，但受品质影响范围上限：

| 品质 | 单属性倍率范围 | 总和范围 |
|------|--------------|---------|
| 凡品 | 0.6 ~ 1.3 | 4.0 ~ 6.5 |
| 灵仙 | 0.6 ~ 1.4 | 4.5 ~ 7.0 |
| 仙品 | 0.6 ~ 1.5 | 5.0 ~ 7.5 |
| 神品 | 0.7 ~ 1.6 | 5.5 ~ 8.0 |
| 混沌 | 0.8 ~ 1.7 | 6.0 ~ 8.5 |

生成算法：
1. 在品质对应的范围内，为 6 个属性各随机一个值
2. 检查总和是否在范围内
3. 不在范围内则重新随机（最多 10 次，之后取最后一次结果）

### 生效场景

- **等级提升**：`QUALITY_LEVEL_STATS` 的每级属性增长 × 成长倍率
- **境界突破**：突破时的属性倍增 × 成长倍率（叠加）
- **不受影响**：装备加成、功法加成、天赋词缀加成（这些是固定值或固定比例，不受成长倍率影响）

### 品质的重新定位

品质不再是"强弱标签"，而是：
- **招募代价**：高品质弟子招募消耗更多灵石
- **潜力空间**：高品质弟子的成长倍率上限更高，但不保证每个属性都高
- **词缀概率**：影响天赋词缀的稀有度和数量
- **副亲和概率**：影响是否有副亲和

### 类型定义

```typescript
export interface GrowthMultipliers {
  hp: number      // 0.6 ~ 1.7
  atk: number     // 0.6 ~ 1.7
  def: number     // 0.6 ~ 1.7
  spd: number     // 0.6 ~ 1.7
  crit: number    // 0.6 ~ 1.7
  critDmg: number // 0.6 ~ 1.7
}
```

## 三、天赋词缀系统

### 概述

废弃现有的 30 个固定天赋，改为 80+ 天赋词缀系统，分前缀和后缀，带数值范围随机。

### 词缀结构

- **前缀**（40 个）：描述先天倾向，如"烈焰之"、"铁骨的"、"灵慧的"
- **后缀**（40 个）：描述特殊能力，如"之破军"、"之回春"、"之福运"

| 稀有度 | 前缀数 | 后缀数 |
|--------|--------|--------|
| 普通 | 15 | 15 |
| 稀有 | 12 | 12 |
| 史诗 | 8 | 8 |
| 传说 | 5 | 5 |
| **合计** | **40** | **40** |

### 数值随机

每个词缀有固定效果类型和数值范围，生成时在范围内随机：

```typescript
interface TalentAffix {
  id: string
  name: string
  position: 'prefix' | 'suffix'
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  effects: Array<{
    stat: string
    minValue: number
    maxValue: number
  }>
}
```

例如：
- "烈焰之"（前缀，稀有）：火元素伤害 +8%~15%
- "之破军"（后缀，稀有）：ATK +5~12, 对 BOSS 伤害 +5~10%
- "灵慧的"（前缀，普通）：灵根 +3~8, 悟性 +2~5

### 分配规则

- 每个弟子最多 1 个前缀 + 1 个后缀
- 品质影响词缀的概率和稀有度上限：

| 品质 | 前缀概率 | 前缀稀有度 | 后缀概率 | 后缀稀有度 |
|------|---------|-----------|---------|-----------|
| 凡品 | 60% | 普通 | 30% | 普通 |
| 灵仙 | 50% | 普通/稀有 | 40% | 普通/稀有 |
| 仙品 | 60% | 普通/稀有/史诗 | 50% | 普通/稀有/史诗 |
| 神品 | 70% | 稀有/史诗/传说 | 60% | 稀有/史诗/传说 |
| 混沌 | 80% | 史诗/传说 | 70% | 史诗/传说 |

### 词缀设计方向

前缀侧重属性倾向（让你知道这个弟子擅长什么方向）：
- 元素强化类（金/木/水/火/土各一个，加对应元素伤害）
- 属性强化类（攻击型/防御型/速度型/暴击型/生存型/全能型各一组）
- 修炼强化类（修炼速度/突破成功率/悟性/灵根等）
- 生产强化类（炼丹/锻造/采矿/灵草/财运等）

后缀侧重特殊能力（给你惊喜感）：
- 战斗特效类（击杀回灵/低血量爆发/反击/连击等）
- 探险特效类（掉落品质/灵石收益/稀有事件概率等）
- 生存特效类（致死抵抗/战后回复/受伤减免等）
- 成长特效类（经验加成/突破保护/属性继承等）

### 存档迁移

旧存档中的 `talents: Talent[]` 迁移策略：
- 遍历旧天赋列表
- 按效果类型映射到最接近的新词缀
- 数值取新词缀范围的中值
- 写入新的 `affix` 字段，清空旧 `talents` 字段

### 类型定义

```typescript
export interface TalentAffix {
  id: string
  name: string
  position: 'prefix' | 'suffix'
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  description: string
  effects: Array<{
    stat: string
    minValue: number
    maxValue: number
  }>
}

// Character 上新增
export interface Character {
  // ... 现有字段 ...
  elementAffinity: ElementAffinity
  growthMultipliers: GrowthMultipliers
  prefix?: TalentAffix   // 替代 talents
  suffix?: TalentAffix   // 替代 talents
}
```

## 四、Character 类型变更汇总

```typescript
export interface Character {
  id: string
  name: string
  title: CharacterTitle
  quality: CharacterQuality  // 保留，但只影响随机池和招募代价
  realm: number
  realmStage: RealmStage
  level: number
  xp: number
  cultivation: number
  baseStats: BaseStats
  cultivationStats: CultivationStats
  learnedTechniques: string[]
  equippedGear: (string | null)[]
  equippedSkills: (string | null)[]
  backpack: ItemStack[]
  maxBackpackSlots: number
  petIds: string[]
  status: CharacterStatus
  injuryTimer: number
  recoveryDaysRemaining?: number
  createdAt: number
  totalCultivation: number
  specialties: Specialty[]
  assignedBuilding: string | null
  cultivationPath: CultivationPath
  investedSpiritStone: number
  techniqueComprehension: Record<string, number>
  fateGrid?: FateGridId
  // --- 新增字段 ---
  elementAffinity: ElementAffinity
  growthMultipliers: GrowthMultipliers
  prefix?: TalentAffix
  suffix?: TalentAffix
  // --- 废弃字段 ---
  // talents: Talent[]  → 迁移后移除
}
```

## 五、组合空间估算

| 维度 | 选项数 | 说明 |
|------|--------|------|
| 五行亲和（主） | 5 | 金木水火土 |
| 五行亲和（副） | 5（含无） | 4 种 + 无副亲和 |
| 成长倍率 | 连续随机 | 6 维连续空间，近似无穷 |
| 前缀 | 40 × 数值范围 | 40 种 × 连续数值 |
| 后缀 | 40 × 数值范围 | 40 种 × 连续数值 |
| 命格 | 20 | 含无命格 |
| 专长 | 8 × 3 级 | 已有 |
| 修炼路线 | 7 | 含 none |

保守估算（离散化后）：5 × 5 × 40 × 40 × 20 = **800,000+** 种显著不同的组合，成长倍率的连续随机进一步乘以无穷。

## 六、Roguelike 描述修正

CLAUDE.md 中关于 Roguelike 的描述需要修正为强调实体随机性：

**现有描述**：
> "装备、技能、功法、祝福、遗物全部通过 Roguelike 随机掉落获取"

**修正为**：
> "弟子、装备、功法等核心实体采用深度随机化生成——每个弟子的五行亲和、成长倍率、天赋词缀、命格都是独一无二的随机组合，像暗黑装备一样每个都不同。玩家的核心乐趣来自发现和培养这些独特的个体，而不是按固定路线养成。秘境探险中获取的装备和功法同样带有随机词缀，每次收获都不同。"

## 七、影响范围

### 需要修改的文件

**类型层**：
- `src/types/character.ts` — 新增 Element、ElementAffinity、GrowthMultipliers、TalentAffinity 类型
- `src/types/talent.ts` — 保留或标记废弃
- `src/types/index.ts` — 新增类型导出

**数据层**：
- `src/data/talentAffixes.ts` — 新文件，80+ 词缀定义
- `src/data/skills.ts` — 元素克制表从三元素改为五行
- `src/data/activeSkills.ts` — 技能元素类型更新
- `src/data/techniquesTable.ts` — 功法元素类型更新
- `src/data/enemies.ts` — 敌人元素类型更新
- `src/data/cultivationPaths.ts` — 可能需要元素亲和关联

**系统层**：
- `src/systems/character/CharacterEngine.ts` — 重写 generateCharacter，加入亲和/倍率/词缀生成
- `src/systems/combat/CombatEngine.ts` — 五行克制计算
- `src/systems/cultivation/CultivationEngine.ts` — 元素亲和影响修炼
- `src/systems/character/DungeonGrowthSystem.ts` — 成长倍率影响升级
- `src/systems/cultivation/BreakthroughCoordinator.ts` — 成长倍率影响突破

**存储层**：
- `src/systems/save/SaveSystem.ts` — 存档迁移逻辑（旧 talents → 新 affix）
- `src/stores/sectStore/characterSlice.ts` — 适配新字段
- `src/stores/sectStore/initial.ts` — 初始状态包含新字段

**UI 层**：
- 弟子详情页 — 展示亲和、成长倍率、词缀信息
- 招募页面 — 展示新弟子的随机结果
- 角色卡片 — 简要展示关键随机特征

### 存档兼容

- 存档版本号升级（v2 → v3）
- 加载旧存档时自动迁移：将旧 talents 映射为新 affix
- 缺失字段填充默认值（无亲和 = 随机分配一个主亲和；无成长倍率 = 全 1.0）
