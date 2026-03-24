# EndlessQuest 宗门核心重构 — 设计文档

> **日期：** 2026-03-24
> **状态：** 已确认
> **前置文档：** `2026-03-24-endlessquest-design.md`（原有设计，将被替代）

## 1. 概述

### 1.1 核心转变

将游戏核心从"单个修士"模式转变为"宗门经营"模式：

- **旧模型：** 一个 Player 为主体，弟子是简化 NPC
- **新模型：** 宗门为主体，每个弟子都是完整角色（修炼/装备/冒险/功法）

### 1.2 设计决策汇总

| 维度 | 决定 |
|------|------|
| 核心实体 | 宗门（Sect） |
| 弟子规模 | 几十人（5-30+），随宗门等级提升 |
| 冒险队伍 | 最多5人组队，支持多线同时冒险 |
| 弟子阶级 | 纯身份标识（弟子/大弟子/宗师/长老），不影响机制 |
| 背包系统 | 每个弟子独立背包(20格) + 宗门仓库(共享，可扩展) |
| 修炼方式 | 所有非冒险弟子同时修炼 |
| 功法系统 | 成长路径模式，同时只修一门，功法作为物品获取 |
| 功法领悟 | 随修炼时间增长，有roguelike随机性（领悟失败概率） |
| UI模式 | 弟子列表/网格双视图 |
| 重构策略 | 全面重写 |

---

## 2. 核心数据模型

### 2.1 Character（统一角色）

废弃现有 `Player` + `Disciple` 双轨制，统一为 `Character`：

```typescript
interface Character {
  id: string
  name: string

  // 身份
  title: CharacterTitle            // 'disciple' | 'seniorDisciple' | 'master' | 'elder'
  quality: CharacterQuality        // 'common' | 'spirit' | 'immortal' | 'divine' | 'chaos'

  // 修炼系统
  realm: number                    // 境界索引 (0-5)
  realmStage: RealmStage           // 小层级 (0-3)
  cultivation: number              // 当前修为值
  baseStats: BaseStats             // hp, atk, def, spd, crit, critDmg
  cultivationStats: CultivationStats // spiritPower, maxSpiritPower, comprehension, spiritualRoot, fortune

  // 功法（成长路径）
  currentTechnique: string | null  // 当前修炼功法ID
  techniqueComprehension: number   // 领悟度 0-100%
  learnedTechniques: string[]      // 已学会的功法ID列表

  // 装备 & 技能
  equippedGear: (string | null)[]  // 9个装备槽
  equippedSkills: (string | null)[] // 5个技能槽 (4主动+1终极)

  // 独立背包
  backpack: AnyItem[]
  maxBackpackSlots: number         // 默认20

  // 状态
  status: CharacterStatus          // 'cultivating' | 'adventuring' | 'resting'

  // 元数据
  createdAt: number
  totalCultivation: number         // 累计修为（历史统计）
}

type CharacterTitle = 'disciple' | 'seniorDisciple' | 'master' | 'elder'
type CharacterQuality = 'common' | 'spirit' | 'immortal' | 'divine' | 'chaos'
type CharacterStatus = 'cultivating' | 'adventuring' | 'resting'
```

**quality 对初始属性的影响：**

| Quality | spiritualRoot | comprehension | fortune |
|---------|---------------|---------------|---------|
| common | 10 | 10 | 5 |
| spirit | 15 | 13 | 8 |
| immortal | 20 | 18 | 12 |
| divine | 28 | 25 | 18 |
| chaos | 35 | 30 | 25 |

### 2.2 Technique（功法）

功法是成长路径的核心，决定弟子突破时的属性成长方向：

```typescript
interface Technique {
  id: string
  name: string
  description: string
  tier: TechniqueTier             // 品阶
  element: Element                 // 元素属性

  // 成长修正 — 乘数，影响每次境界突破的属性分配
  growthModifiers: {
    hp: number
    atk: number
    def: number
    spd: number
    crit: number
    critDmg: number
  }

  // 固定加成 — 按领悟度逐步解锁
  fixedBonuses: TechniqueBonus[]

  // 学习要求
  requirements: {
    minRealm: number               // 最低境界
    minComprehension: number       // 最低悟性
  }

  // Roguelike 元素
  comprehensionDifficulty: number  // 1-5，影响领悟速度和失败概率
}

interface TechniqueBonus {
  stat: keyof BaseStats | 'cultivationRate' | 'spiritEfficiency'
  value: number
  comprehensionRequired: number    // 需要达到的领悟度百分比
}

type TechniqueTier = 'mortal' | 'spirit' | 'immortal' | 'divine' | 'chaos'
// 对应：凡品 | 灵品 | 仙品 | 神品 | 混沌品
```

**功法示例数据：**

| 功法名 | 品阶 | 元素 | 成长方向 | 核心特色 | 领悟难度 |
|--------|------|------|----------|----------|----------|
| 清心诀 | 凡品 | neutral | 均衡(1.0) | 入门功法，无特殊加成 | 1 |
| 烈焰心法 | 凡品 | fire | 攻击(1.3) | +10%攻击(30%领悟) | 1 |
| 厚土诀 | 凡品 | neutral | 防御(1.3) | +15%生命(30%领悟) | 1 |
| 焚天诀 | 灵品 | fire | 攻击/暴击 | 高攻高暴，防御削弱 | 2 |
| 玄冰诀 | 灵品 | ice | 防御/生命 | 高防高血，速度略减 | 2 |
| 御风诀 | 灵品 | lightning | 速度 | 极速出手 | 2 |
| 雷神体 | 仙品 | lightning | 速度/暴击 | 概率连击效果 | 3 |
| 不灭金身 | 仙品 | neutral | 均衡/坚韧 | 队伍中存活率最高 | 3 |
| 万剑归宗 | 神品 | neutral | 攻击/暴击 | 极致攻击，领悟极难 | 4 |
| 太上忘情 | 神品 | ice | 全属性 | 全面加成但领悟极慢 | 4 |
| 混沌天功 | 混沌品 | neutral | 全属性强化 | 最强功法，极难获取和领悟 | 5 |

### 2.3 Sect（宗门）

```typescript
interface Sect {
  name: string
  level: number                    // 宗门等级 1-5

  // 资源（全局唯一）
  resources: Resources

  // 建筑
  buildings: Building[]

  // 弟子
  characters: Character[]

  // 宗门仓库
  vault: AnyItem[]
  maxVaultSlots: number            // 初始50，随仓库建筑升级

  // 宗门统计
  totalAdventureRuns: number
  totalBreakthroughs: number
}
```

**宗门等级 & 弟子上限：**

| 宗门等级 | 大殿等级要求 | 弟子上限 | 解锁内容 |
|----------|-------------|----------|----------|
| 1 | 1 | 5 | 基础功能 |
| 2 | 3 | 10 | 灵田升级、招收灵品弟子 |
| 3 | 5 | 15 | 高级弟子招募、第二条冒险线 |
| 4 | 8 | 20 | 长老任命、第三条冒险线 |
| 5 | 10 | 30 | 全部功能 |

---

## 3. 核心系统

### 3.1 修炼系统

**灵气流转链路：**

```
灵田(建筑) → 产出灵气 → 宗门灵池(全局)
                         ↓
              所有修炼弟子按人头消耗 (2灵气/s/人)
                         ↓
              消耗后产生修为 → 弟子个人突破进度
```

**修炼tick逻辑（每秒）：**

```
1. 计算灵气产出 = ResourceEngine.calcResourceRates(建筑等级, 弟子加成)
2. 计算灵气消耗 = 修炼弟子数 × 2
3. 实际可用灵气 = min(产出, 消耗)（不足时按比例分配给所有弟子）
4. 对每个修炼中的弟子：
   a. 分配灵气份额
   b. 计算修为增长 = CultivationEngine.calcCultivationRate(弟子, 功法) × deltaSec
   c. 增加修为
   d. 更新功法领悟度
   e. 检查是否可以突破
```

**突破系统：**

- 突破条件：修为 >= 所需值（与现有相同）
- 突破属性增长 = 基础增长 × 功法成长修正
- 大境界：基础属性 × 1.8
- 小层级：约大境界增长的 15%
- 突破后修为归零

### 3.2 功法领悟系统

```typescript
// 每秒tick
function tickTechniqueComprehension(character: Character, deltaSec: number): {
  comprehensionGained: number
  failureOccurred: boolean
} {
  const technique = getTechnique(character.currentTechnique)
  const baseRate = 0.1 // 基础领悟速度 %/s

  // 悟性加成
  const comprehensionBonus = character.cultivationStats.comprehension / 10

  // 功法品阶修正（越难越慢）
  const tierMultiplier = { mortal: 1.0, spirit: 0.7, immortal: 0.4, divine: 0.2, chaos: 0.1 }

  // 计算领悟增量
  const gained = baseRate * comprehensionBonus * tierMultiplier[technique.tier] * deltaSec

  // Roguelike: 领悟失败（高阶功法才有）
  let failed = false
  if (technique.comprehensionDifficulty >= 3 && Math.random() < failureChance(technique, character)) {
    failed = true
    // 领悟度倒退 1-3%
  }

  return { comprehensionGained: failed ? -randomBacktrack() : gained, failureOccurred: failed }
}
```

**领悟度效果：**

| 领悟度 | 成长修正效果 | 固定加成 |
|--------|-------------|----------|
| 0-30% | 30% | 无 |
| 30-70% | 70% | 解锁第一层 |
| 70-100% | 100% | 解锁第二层 |
| 100% | 100% | 全部解锁，可换功法 |

**换功法规则：** 随时可换，领悟度归零。已完全领悟(100%)的功法记录在 `learnedTechniques` 列表中。

### 3.3 冒险系统

**多线规则：**
- 同时可进行的冒险数量：`maxSimultaneousRuns`（初始1，最高3）
- 每条线最多5名弟子
- 同一弟子不能同时参与两条线
- 冒险中的弟子状态为 `adventuring`，不消耗灵气、不修炼

**DungeonRun 结构：**

```typescript
interface DungeonRun {
  id: string
  dungeonId: string
  teamCharacterIds: string[]        // 参战弟子ID (1-5)
  currentFloor: number
  floors: DungeonFloor[]

  // 每个队员独立HP
  memberStates: Record<string, MemberState>

  totalRewards: Resources
  itemRewards: AnyItem[]
  eventLog: LogEntry[]
  status: 'active' | 'retreated' | 'completed' | 'failed'
}

interface MemberState {
  currentHp: number
  maxHp: number
  status: 'alive' | 'dead' | 'wounded'
}
```

**战斗流程：**
- `CombatUnit` 从弟子的完整数据构建（基础属性 + 装备 + 功法修正）
- 战斗胜利：奖励进入宗门资源池，装备/材料进入宗门仓库
- 队员死亡：该队员无法参与本秘境后续战斗，其余队员继续
- 全员死亡 → 冒险失败，保留已获得奖励的 50%

### 3.4 资源经济

**Resources（全局唯一）：**

```typescript
interface Resources {
  spiritStone: number      // 灵石（通用货币）
  spiritEnergy: number     // 灵气（修炼消耗，建筑产出）
  herb: number             // 灵草
  ore: number              // 矿石
  fairyJade: number        // 仙玉
  scrollFragment: number   // 功法残页（合成功法）
  heavenlyTreasure: number // 天材地宝
  beastSoul: number        // 兽魂
}
```

**产出与消耗：**

| 资源 | 产出来源 | 消耗用途 |
|------|----------|----------|
| 灵气 | 灵田建筑 | 所有修炼弟子消耗 |
| 灵石 | 矿场、冒险 | 升级建筑、商店购买、装备强化 |
| 灵草 | 药园、冒险 | 治疗弟子、合成 |
| 矿石 | 矿场、冒险 | 装备强化 |
| 功法残页 | 冒险掉落 | 合成功法 |
| 天材地宝 | 冒险掉落 | 特殊用途 |
| 兽魂 | 冒险掉落 | 宠物/特殊强化 |

### 3.5 背包 & 物品流转

```
物品流转规则：

  冒险掉落 ──→ 宗门仓库（共享）
  商店购买 ──→ 宗门仓库
  合成产出 ──→ 宗门仓库

  宗门仓库 ←──→ 弟子背包（自由转移，无消耗）

  弟子只能装备自己背包中的物品
```

- 每个弟子背包上限 20 格
- 宗门仓库初始 50 格，随仓库建筑升级（每级 +20，最高 150）
- 转移操作：弟子背包 ↔ 宗门仓库，无资源消耗

---

## 4. Store 架构

废弃现有 6 个 Store，重新设计为 3 个核心 Store：

### 4.1 useSectStore（宗门主 Store）

```typescript
interface SectStore {
  // 宗门数据
  sect: Sect

  // 宗门级操作
  addCharacter(quality: CharacterQuality): Character
  removeCharacter(id: string): void
  promoteCharacter(id: string, newTitle: CharacterTitle): void
  setCharacterStatus(id: string, status: CharacterStatus): void

  // 建筑操作
  upgradeBuilding(type: BuildingType): boolean
  tryUpgradeBuilding(type: BuildingType): { success: boolean; reason: string }

  // 物品流转
  transferItemToCharacter(characterId: string, itemIndex: number): boolean  // 仓库→弟子
  transferItemToVault(characterId: string, itemIndex: number): boolean       // 弟子→仓库

  // 资源操作
  spendResource(type: keyof Resources, amount: number): boolean
  addResource(type: keyof Resources, amount: number): void

  // 每秒tick
  tickAll(deltaSec: number): {
    spiritProduced: number
    spiritConsumed: number
    cultivationGained: Record<string, number>
  }

  // 宗门仓库操作
  sellItem(itemIndex: number): boolean
  removeVaultItem(itemIndex: number): AnyItem | null

  reset(): void
}
```

### 4.2 useAdventureStore（冒险 Store）

```typescript
interface AdventureStore {
  activeRuns: Map<string, DungeonRun>

  startRun(dungeonId: string, characterIds: string[]): DungeonRun | null
  selectRoute(runId: string, routeIndex: number): boolean
  advanceFloor(runId: string): FloorResult
  retreat(runId: string): RetreatResult
  idleTick(runId: string, deltaSec: number): void
  tickAllIdle(deltaSec: number): void
  completeRun(runId: string): void
  failRun(runId: string): void
  getRun(id: string): DungeonRun | undefined
  getMaxSimultaneousRuns(): number
}
```

### 4.3 useGameStore（游戏会话 Store）

```typescript
interface GameStore {
  saveSlot: number
  lastOnlineTime: number
  isPaused: boolean
  startGame(): void
  stopGame(): void
  pauseGame(): void
  resumeGame(): void
  reset(): void
}
```

---

## 5. 页面结构

```
5 个主页面（底部导航）：

├── 宗门（主页）
│   ├── 宗门名称 & 等级
│   ├── 资源概览（灵石、灵气、灵草等 + 每秒产出速率）
│   ├── 建筑快速入口
│   ├── 弟子总数/修炼中/冒险中 统计
│   └── 进行中的冒险摘要
│
├── 弟子
│   ├── 列表视图 / 网格视图 切换
│   ├── 筛选：按状态（修炼/冒险/休息）、按阶级
│   ├── 每个弟子卡片显示：名称、品质、境界、功法、状态
│   └── 弟子详情页（点击进入）
│       ├── 基本信息 + 属性面板
│       ├── 修炼进度条 & 突破按钮
│       ├── 功法面板（当前功法、领悟度、更换功法）
│       ├── 装备管理（9个槽位）
│       ├── 技能管理（5个槽位）
│       └── 个人背包
│
├── 建筑
│   ├── 建筑升级列表
│   ├── 弟子招收界面
│   └── 宗门仓库
│
├── 秘境
│   ├── 秘境选择列表
│   ├── 组队界面（选择弟子、选秘境）
│   ├── 进行中的冒险（多线卡片）
│   │   ├── 每条线：秘境名、层数、队员HP、事件日志
│   │   └── 操作：继续/撤退
│   └── 冒险结束：奖励总结
│
└── 仓库
    ├── 宗门仓库（全局共享物品池）
    └── 快速查看/管理某弟子背包
```

---

## 6. 系统层变化

| 系统 | 变化 | 说明 |
|------|------|------|
| CultivationEngine | 泛化 | 接受 `Character` 而非 `Player`，加入功法成长修正 |
| CombatEngine | 基本不变 | `CombatUnit` 从 `Character` 构建（含功法修正） |
| MapGenerator | 不变 | 秘境地图生成逻辑不变 |
| EventSystem | 调整 | 接收 `Character[]` 队伍，奖励进入宗门仓库 |
| ResourceEngine | 调整 | 灵气产出 = 建筑产出，消耗 = 修炼弟子数 × 2/s |
| EquipmentEngine | 不变 | |
| ItemGenerator | 不变 | |
| PetSystem | 精简 | 宠物跟随弟子，非独立实体 |
| SaveSystem | 适配 | 适配新 Store 结构 |
| **新增** TechniqueSystem | 新建 | 功法领悟tick、突破修正计算、领悟失败概率 |
| **新增** CharacterEngine | 新建 | 弟子生成（含品质随机）、属性初始化 |
| **新增** SectEngine | 新建 | 宗门等级计算、弟子上限计算 |
| DiscipleEngine | 废弃 | 功能合并进 CharacterEngine |

---

## 7. 待实现功法数据表

### 7.1 凡品功法（入门级）

```typescript
const MORTAL_TECHNIQUES = [
  {
    id: 'qingxin',
    name: '清心诀',
    tier: 'mortal',
    element: 'neutral',
    growthModifiers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, crit: 1.0, critDmg: 1.0 },
    fixedBonuses: [],
    requirements: { minRealm: 0, minComprehension: 5 },
    comprehensionDifficulty: 1,
  },
  {
    id: 'lieyan',
    name: '烈焰心法',
    tier: 'mortal',
    element: 'fire',
    growthModifiers: { hp: 0.9, atk: 1.3, def: 0.9, spd: 1.0, crit: 1.1, critDmg: 1.1 },
    fixedBonuses: [
      { stat: 'atk', value: 5, comprehensionRequired: 30 },
    ],
    requirements: { minRealm: 0, minComprehension: 8 },
    comprehensionDifficulty: 1,
  },
  {
    id: 'houtu',
    name: '厚土诀',
    tier: 'mortal',
    element: 'neutral',
    growthModifiers: { hp: 1.3, atk: 0.8, def: 1.3, spd: 0.9, crit: 0.9, critDmg: 1.0 },
    fixedBonuses: [
      { stat: 'hp', value: 50, comprehensionRequired: 30 },
    ],
    requirements: { minRealm: 0, minComprehension: 8 },
    comprehensionDifficulty: 1,
  },
]
```

### 7.2 灵品功法（中级）

```typescript
const SPIRIT_TECHNIQUES = [
  {
    id: 'fentian',
    name: '焚天诀',
    tier: 'spirit',
    element: 'fire',
    growthModifiers: { hp: 0.7, atk: 1.8, def: 0.6, spd: 1.1, crit: 1.4, critDmg: 1.3 },
    fixedBonuses: [
      { stat: 'atk', value: 15, comprehensionRequired: 30 },
      { stat: 'crit', value: 0.05, comprehensionRequired: 70 },
    ],
    requirements: { minRealm: 1, minComprehension: 12 },
    comprehensionDifficulty: 2,
  },
  {
    id: 'xuanbing',
    name: '玄冰诀',
    tier: 'spirit',
    element: 'ice',
    growthModifiers: { hp: 1.5, atk: 0.6, def: 1.8, spd: 0.8, crit: 0.7, critDmg: 1.0 },
    fixedBonuses: [
      { stat: 'def', value: 10, comprehensionRequired: 30 },
      { stat: 'hp', value: 100, comprehensionRequired: 70 },
    ],
    requirements: { minRealm: 1, minComprehension: 12 },
    comprehensionDifficulty: 2,
  },
  {
    id: 'yufeng',
    name: '御风诀',
    tier: 'spirit',
    element: 'lightning',
    growthModifiers: { hp: 0.9, atk: 1.0, def: 0.8, spd: 1.8, crit: 1.1, critDmg: 1.1 },
    fixedBonuses: [
      { stat: 'spd', value: 8, comprehensionRequired: 30 },
      { stat: 'cultivationRate', value: 0.1, comprehensionRequired: 70 },
    ],
    requirements: { minRealm: 1, minComprehension: 12 },
    comprehensionDifficulty: 2,
  },
]
```

### 7.3 仙品 & 神品功法（高级）

仙品和神品功法主要通过冒险深层掉落和功法残页合成获取，此处仅列出名称和核心方向，具体数值在实现时确定：

| 功法名 | 品阶 | 核心方向 |
|--------|------|----------|
| 雷神体 | 仙品 | 速度/暴击，概率连击 |
| 不灭金身 | 仙品 | 均衡/坚韧，高存活率 |
| 九转轮回 | 仙品 | 全属性，领悟后可复活 |
| 万剑归宗 | 神品 | 极致攻击 |
| 太上忘情 | 神品 | 全属性，领悟极慢 |
| 混沌天功 | 混沌品 | 最强全属性，极难获取和领悟 |

---

## 8. 弟子状态流转

```
  cultivating ←──→ adventuring
       ↑               │
       │  冒险结束      │
       └───────────────┘
               │
           受伤时 → resting → 恢复后 → cultivating

  状态说明：
  - cultivating: 消耗灵气，积累修为，领悟功法
  - adventuring: 不消耗灵气，参与秘境，获取资源
  - resting: 受伤恢复中，不修炼不冒险
```

---

## 9. 离线收益

离线收益逻辑调整：

1. 计算离线秒数（上限 24h）
2. 模拟 tickAll：资源产出 - 弟子修炼消耗
3. 若灵气不足，修炼效率按比例降低
4. 不模拟冒险（冒险在离线时暂停）
5. 功法领悟正常推进（按离线时间计算）
6. 突破不自动执行，离线期间达到突破条件的弟子标记为"可突破"
