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

- `src/types/skill.ts` — 替换现有 `Element` 类型和 `COUNTER_MAP`（这是元素类型的唯一定义源）
- `src/types/character.ts` — 新增 `ElementAffinity` 字段（复用 skill.ts 的 Element）
- `src/data/skills.ts` — 元素克制表从三元素改为五行
- `src/data/activeSkills.ts` — 技能元素类型更新
- `src/data/techniquesTable.ts` — 功法元素同步更新
- `src/systems/combat/CombatEngine.ts` — 元素克制计算更新
- `src/data/enemies.ts` — 敌人元素更新

### 元素迁移映射

现有三元素 → 五行的映射（技能、功法、敌人统一迁移）：

| 旧元素 | 新元素 | 理由 |
|--------|--------|------|
| fire | fire | 直接对应 |
| ice | water | 冰→水，自然映射 |
| lightning | metal | 雷→金，金属性带锐利/穿透感 |
| healing | wood | 治愈→木，木主生发 |
| neutral | neutral | 保留无属性 |

`src/types/skill.ts` 中 `Element` 类型改为：
```typescript
export type Element = 'metal' | 'wood' | 'earth' | 'water' | 'fire' | 'neutral'
```

`COUNTER_MAP` 改为：
```typescript
export const COUNTER_MAP: Partial<Record<Element, Element>> = {
  metal: 'wood',    // 金克木
  wood: 'earth',    // 木克土
  earth: 'water',   // 土克水
  water: 'fire',    // 水克火
  fire: 'metal',    // 火克金
}
```

### 类型定义

```typescript
// Element 定义在 src/types/skill.ts，全局复用
export interface ElementAffinity {
  primary: Element
  secondary?: Element  // 不为 primary，且不为 neutral
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

- **等级提升（hp/atk/def）**：`QUALITY_LEVEL_STATS` 的每级属性增长 × 对应成长倍率。当前等级系统只对 hp/atk/def 有增长，成长倍率中这三个直接生效。
- **等级提升（spd/crit/critDmg）**：当前等级系统不提供 spd/crit/critDmg 的每级增长。这三个倍率作为**隐藏潜力**存在——未来等级系统扩展时可加入这些属性的成长，当前不影响数值平衡。
- **境界突破**：突破时的属性倍增 × 对应成长倍率（叠加）。当前突破只倍增 hp/atk/def/spd（见 BreakthroughCoordinator），对应的成长倍率生效。crit/critDmg 成长倍率暂不参与突破计算。
- **不受影响**：装备加成、功法加成、天赋词缀加成（这些是固定值或固定比例，不受成长倍率影响）

> **设计备注**：crit/critDmg 成长倍率纳入类型定义但当前不参与数值计算，是为未来"每级 crit/critDmg 微增"预留的设计空间。实现时这两个维度保持为 1.0 不影响平衡即可，随机生成仍然给出值以保持组合多样性。

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

### 词缀效果类型系统

词缀效果不只是 `stat + value`，需要支持多种效果类型。定义结构化联合类型：

```typescript
// 基础属性加成（纯数值）
type FlatStatEffect = {
  type: 'flatStat'
  stat: TalentStat  // 复用现有 TalentStat 联合类型
  minValue: number
  maxValue: number
}

// 元素伤害加成（百分比）
type ElementDamageEffect = {
  type: 'elementDamage'
  element: Element  // 金/木/水/火/土
  minValue: number  // 0.08 = 8%
  maxValue: number  // 0.15 = 15%
}

// 条件触发效果
type ConditionalEffect = {
  type: 'conditional'
  trigger: 'lowHp' | 'onKill' | 'onCrit' | 'onBattleStart' | 'onBossKill'
  effect: {
    stat: string
    minValue: number
    maxValue: number
  }
  threshold?: number  // 触发阈值（如 lowHp 的 0.3 表示 30% HP）
}

// 被动概率效果
type ChanceEffect = {
  type: 'chance'
  description: string  // 如 "闪避攻击"
  minValue: number     // 触发概率 0.05~0.10
  maxValue: number
  effect: {
    stat: string
    value: number
  }
}

// 修饰器效果（修炼/掉落/经验等百分比加成）
type ModifierEffect = {
  type: 'modifier'
  target: 'cultivationSpeed' | 'breakthroughSuccess' | 'lootQuality' | 'xpGain' | 'techniqueComprehension'
  minValue: number  // 0.10 = +10%
  maxValue: number  // 0.25 = +25%
}

type TalentAffixEffect = FlatStatEffect | ElementDamageEffect | ConditionalEffect | ChanceEffect | ModifierEffect
```

### 数值随机

每个词缀使用上述效果类型，生成时在 `minValue` ~ `maxValue` 范围内随机取值。

例如：
- "烈焰之"（前缀，稀有）：`{ type: 'elementDamage', element: 'fire', min: 0.08, max: 0.15 }`
- "之破军"（后缀，稀有）：`[{ type: 'flatStat', stat: 'atk', min: 5, max: 12 }, { type: 'modifier', target: 'lootQuality', min: 0.05, max: 0.10 }]`
- "灵慧的"（前缀，普通）：`[{ type: 'flatStat', stat: 'spiritualRoot', min: 3, max: 8 }, { type: 'flatStat', stat: 'comprehension', min: 2, max: 5 }]`

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

### 词缀完整类型定义

```typescript
export interface TalentAffix {
  id: string
  name: string
  position: 'prefix' | 'suffix'
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  description: string
  effects: TalentAffixEffect[]
}
```

### 存档迁移映射表

旧天赋 ID → 新词缀的具体映射（30 个旧天赋 → 对应新词缀）：

| 旧天赋 ID | 旧名 | 效果 | 映射策略 |
|-----------|------|------|---------|
| wugu | 武骨 | atk+3 | → 前缀"武体"(flatStat atk 2~5) |
| tiebi | 铁壁 | def+2 | → 前缀"铁壁"(flatStat def 1~4) |
| feiying | 飞影 | spd+2 | → 前缀"疾风"(flatStat spd 1~4) |
| huixin_combat | 会心 | crit+0.03 | → 前缀"锐目"(flatStat crit 0.02~0.05) |
| shayi | 杀意 | critDmg+0.2 | → 前缀"杀心"(flatStat critDmg 0.1~0.3) |
| lingxin | 灵心 | maxSpiritPower+20 | → 前缀"灵海"(flatStat maxSpiritPower 10~30) |
| jingangti | 金刚体 | hp+8 | → 前缀"金刚"(flatStat hp 5~15) |
| minjie | 敏捷 | spd+1, crit+0.01 | → 前缀"灵巧"(flatStat spd 1~3, flatStat crit 0.01~0.02) |
| tongling | 通灵 | spiritualRoot+2 | → 前缀"通灵"(flatStat spiritualRoot 1~4) |
| mingrui | 敏锐 | comprehension+2 | → 前缀"慧觉"(flatStat comprehension 1~4) |
| jiaqiang | 坚韧 | hp+5, def+1 | → 前缀"坚韧"(flatStat hp 3~10, flatStat def 1~3) |
| lieyan_zhi | 烈焰志 | atk+2 | → 前缀"烈焰"(flatStat atk 1~4) |
| hanlin | 寒凛 | def+1, atk+1 | → 前缀"冰心"(flatStat def 1~3, flatStat atk 1~3) |
| fuxing | 福星 | fortune+2 | → 前缀"福运"(flatStat fortune 1~4) |
| zhuanzhu | 专注 | critDmg+0.1 | → 前缀"专注"(flatStat critDmg 0.05~0.15) |
| tianmai | 天脉 | spiritualRoot+5 | → 前缀"天脉"(flatStat spiritualRoot 3~8) |
| huixin | 慧心 | comprehension+5 | → 前缀"慧心"(flatStat comprehension 3~8) |
| qiyun | 气运 | fortune+5 | → 前缀"天运"(flatStat fortune 3~8) |
| xianti | 仙体 | hp+15 | → 前缀"仙体"(flatStat hp 10~25) |
| pozhan | 破阵 | atk+4, crit+0.02 | → 前缀"破阵"(flatStat atk 3~7, flatStat crit 0.01~0.03) |
| fengxing | 风行 | spd+4 | → 前缀"风行"(flatStat spd 3~7) |
| tiegu | 铁骨 | def+4, hp+8 | → 前缀"铁骨"(flatStat def 3~6, flatStat hp 5~12) |
| mingxin | 明心 | comprehension+3, maxSpiritPower+15 | → 前缀"明心"(flatStat comprehension 2~5, flatStat maxSpiritPower 10~20) |
| shashen | 杀神 | critDmg+0.35 | → 前缀"杀神"(flatStat critDmg 0.2~0.45) |
| lingyuan | 灵源 | maxSpiritPower+35 | → 前缀"灵源"(flatStat maxSpiritPower 20~45) |
| taiji | 太极 | spiritualRoot+8, comprehension+3 | → 前缀"太极"(flatStat spiritualRoot 5~12, flatStat comprehension 2~5) |
| busizun | 不死尊 | hp+30, def+5 | → 前缀"不死"(flatStat hp 20~40, flatStat def 3~8) |
| tiandao | 天道 | fortune+8, comprehension+4 | → 前缀"天道"(flatStat fortune 5~12, flatStat comprehension 3~6) |
| zhanhun | 战魂 | atk+6, spd+3, crit+0.03 | → 前缀"战魂"(flatStat atk 4~9, flatStat spd 2~5, flatStat crit 0.02~0.04) |
| xuanming | 玄冥 | spiritualRoot+6, def+4, hp+12 | → 前缀"玄冥"(flatStat spiritualRoot 4~8, flatStat def 3~6, flatStat hp 8~18) |

迁移规则：
- 旧天赋数量 > 1 时：第一个映射为前缀，第二个映射为后缀，第三个丢弃
- 旧天赋数量 = 0 时：无词缀
- 迁移后的词缀数值 = 新词缀范围的中值
- 旧天赋全部是 flatStat 类型，无需处理复杂效果类型

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
-  — 替换 Element 类型和 COUNTER_MAP（核心变更）
-  — 新增 ElementAffinity、GrowthMultipliers、TalentAffix 类型
-  — 标记废弃，迁移完成后移除
-  — 新增类型导出

**数据层**：
-  — **新文件**，80+ 词缀定义（含完整效果类型）
-  — 元素克制表从三元素改为五行
-  — 16 个技能的 element 字段全部迁移（ice→water, lightning→metal, healing→wood）
-  — 30 个功法的 element 字段迁移
-  — 敌人元素类型迁移
-  — 可能需要元素亲和关联
-  — 等级成长需应用成长倍率

**系统层**：
-  — 重写 generateCharacter，加入亲和/倍率/词缀生成
-  — 五行克制计算 + 元素亲和伤害加成
-  — 元素亲和影响功法参悟速度
-  — 成长倍率影响升级属性增长
-  — 成长倍率影响突破属性增长

**存储层**：
-  — 存档迁移逻辑（version 8→9，旧 talents → 新 affix）
-  — 适配新字段
-  — 初始状态包含新字段
-  — calcDungeonGrowth 使用新成长倍率

**UI 层**：
-  — 展示亲和、成长倍率、词缀信息
- 招募组件 — 展示新弟子的随机结果
- 角色卡片组件 — 简要展示关键随机特征（亲和色标、成长倾向条、词缀名）

**测试层**：
-  — 重写，覆盖新随机维度
-  — 五行克制 + 亲和加成测试
-  — 迁移正确性测试


### 存档兼容

- `SaveSystem.ts` 中 `meta.version` 从 8 升级到 9（注意：`db.ts` 中 `DB_VERSION = 3` 是 IndexedDB schema 版本，不需要改动）
- 加载旧存档（version < 9）时自动执行迁移：
  1. 将旧 `talents: Talent[]` 映射为新的 `prefix`/`suffix`（按迁移映射表）
  2. 缺失 `elementAffinity` → 随机分配主亲和
  3. 缺失 `growthMultipliers` → 全部填充 1.0
  4. 清空旧 `talents` 字段
- 迁移逻辑在 `SaveSystem.ts` 的 `meta.version < 9` 分支中执行

### 测试策略

需要在以下方面补充测试：
- `CharacterEngine.test.ts`：角色生成后 growthMultipliers 在品质对应范围内，总和在约束范围内
- `CharacterEngine.test.ts`：elementAffinity 的 primary 不为 neutral，secondary 不等于 primary
- `CharacterEngine.test.ts`：词缀按品质概率和稀有度约束生成
- `SaveSystem.test.ts`：旧 talents → 新 prefix/suffix 迁移正确
- `CombatEngine.test.ts`：五行克制矩阵正确（金>木>土>水>火>金）
- `CombatEngine.test.ts`：元素亲和加成正确计算
- 迁移后的角色在战斗/修炼/突破中行为正常
