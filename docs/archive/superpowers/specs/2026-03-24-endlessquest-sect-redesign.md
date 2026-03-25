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

### 2.1 类型变更总览

以下类型将被**完全替代**（REPLACED）：

| 旧类型 | 新类型 | 说明 |
|--------|--------|------|
| `Player` | `Character` | 统一角色模型 |
| `Disciple` | `Character` | 弟子升级为完整角色 |
| `DungeonRun`（旧） | `DungeonRun`（新） | 加入多队员状态追踪 |
| `DungeonLayer` | `DungeonFloor` | 统一术语为"层" |
| `Element`（4种） | `Element`（5种） | 新增 `neutral` |
| `AnyItem`（3种） | `AnyItem`（4种） | 新增 `techniqueScroll` |

**新增类型：** `Character`, `CharacterTitle`, `CharacterQuality`, `CharacterStatus`, `Technique`, `TechniqueTier`, `TechniqueBonus`, `MemberState`, `Sect`

**废弃类型：** `Player`, `Disciple`, `DiscipleQuality`（合并进 CharacterQuality）

### 2.2 Character（统一角色）

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
  realmStage: RealmStage           // 小层级 (0-3)，受 realm.stages.length 限制
  cultivation: number              // 当前修为值
  baseStats: BaseStats             // hp, atk, def, spd, crit, critDmg
  cultivationStats: CultivationStats // spiritPower, maxSpiritPower, comprehension, spiritualRoot, fortune

  // 功法（成长路径）
  currentTechnique: string | null  // 当前修炼功法ID
  techniqueComprehension: number   // 领悟度 0-100%（硬限制，不会 <0 也不会 >100）
  learnedTechniques: string[]      // 已学会的功法ID列表（领悟度达100%时自动加入）

  // 装备 & 技能
  equippedGear: (string | null)[]  // 9个装备槽
  equippedSkills: (string | null)[] // 5个技能槽 (4主动+1终极)

  // 独立背包
  backpack: AnyItem[]
  maxBackpackSlots: number         // 默认20

  // 宠物
  petIds: string[]                 // 跟随该弟子的宠物ID列表（最多2只）

  // 状态
  status: CharacterStatus          // 'cultivating' | 'adventuring' | 'resting'
  injuryTimer: number              // 休息状态下的恢复倒计时（秒），0=无伤

  // 元数据
  createdAt: number
  totalCultivation: number         // 累计修为（历史统计）
}

type CharacterTitle = 'disciple' | 'seniorDisciple' | 'master' | 'elder'
type CharacterQuality = 'common' | 'spirit' | 'immortal' | 'divine' | 'chaos'
type CharacterStatus = 'cultivating' | 'adventuring' | 'resting'
```

**RealmStage 安全约束：** `realmStage` 不得超过 `REALMS[realm].stages.length - 1`。最后一个境界"渡劫飞升"只有1个阶段，realmStage 上限为 0。突破逻辑中必须检查此约束。

**quality 对初始属性的影响：**

| Quality | spiritualRoot | comprehension | fortune |
|---------|---------------|---------------|---------|
| common | 10 | 10 | 5 |
| spirit | 15 | 13 | 8 |
| immortal | 20 | 18 | 12 |
| divine | 28 | 25 | 18 |
| chaos | 35 | 30 | 25 |

### 2.3 Technique（功法）

功法是成长路径的核心，决定弟子突破时的属性成长方向：

```typescript
interface Technique {
  id: string
  name: string
  description: string
  tier: TechniqueTier             // 品阶
  element: Element                 // 元素属性（新增 'neutral'）

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

type Element = 'fire' | 'ice' | 'lightning' | 'healing' | 'neutral'
// neutral 无元素相克关系，COUNTER_MAP 中 neutral 对所有元素倍率为 1.0
```

### 2.4 Item 类型扩展

新增 `techniqueScroll` 物品类型：

```typescript
type AnyItem = Equipment | Consumable | Material | TechniqueScroll

interface TechniqueScroll {
  id: string
  name: string
  quality: ItemQuality
  type: 'techniqueScroll'
  description: string
  sellPrice: number
  techniqueId: string             // 关联的 Technique ID
}
```

**功法获取途径：**
- 秘境掉落（高级功法在深层秘境）
- 商店购买（基础功法）
- 合成：消耗 `scrollFragment`（功法残页）+ 灵石合成，配方随品阶不同

**功法学习流程：**
1. 功法作为 `TechniqueScroll` 物品存在于弟子背包或宗门仓库
2. 弟子从背包中选择一本功法 → 调用 `learnTechnique(characterId, itemIndex)`
3. 检查要求（境界、悟性）→ 通过后消耗该物品，设置 `currentTechnique`
4. 领悟度从 0 开始

### 2.5 Sect（宗门）

```typescript
interface Sect {
  name: string
  level: number                    // 宗门等级 1-5

  // 资源（全局唯一，仅此一处）
  resources: Resources

  // 建筑
  buildings: Building[]

  // 弟子
  characters: Character[]

  // 宗门仓库
  vault: AnyItem[]
  maxVaultSlots: number            // 初始50，随仓库建筑升级

  // 宠物（全局池，通过 petIds 分配给弟子）
  pets: Pet[]

  // 宗门统计
  totalAdventureRuns: number
  totalBreakthroughs: number
}
```

**宗门等级 & 弟子上限：**

| 宗门等级 | 大殿等级要求 | 弟子上限 | 同时冒险线数 | 解锁内容 |
|----------|-------------|----------|-------------|----------|
| 1 | 1 | 5 | 1 | 基础功能 |
| 2 | 3 | 10 | 1 | 灵田升级、招收灵品弟子 |
| 3 | 5 | 15 | 2 | 高级弟子招募、第二条冒险线 |
| 4 | 8 | 20 | 2 | 长老任命、第三条冒险线 |
| 5 | 10 | 30 | 3 | 全部功能 |

---

## 3. 核心系统

### 3.1 修炼系统

**灵气流转链路：**

```
灵田(建筑) → 产出灵气 → 宗门资源池（全局唯一）
                         ↓
              所有修炼弟子按人头消耗 (2灵气/s/人)
                         ↓
              消耗后产生修为 → 弟子个人突破进度
```

**灵气产出公式（适配大规模弟子）：**

```
spiritField 基础产出 = 1/s × 灵田等级
每级额外产出 = 3/s（确保能支撑更多弟子）

目标平衡点：
  灵田Lv1: 1/s（支持1弟子，但产出不足需精打细算）
  灵田Lv3: 7/s（支持3弟子，游戏早期平衡点）
  灵田Lv5: 13/s（支持6弟子，需要优先升级）
  灵田Lv8: 22/s（支持11弟子，中期核心）
  灵田Lv10: 28/s（支持14弟子，需要多弟子策略取舍）

30弟子全修炼需 60/s 灵气 → 需要灵田Lv10 + 其他灵气加成来源
（高境界弟子可通过功法提升灵气效率来降低消耗）
```

**修炼tick逻辑（每秒）：**

```
1. 计算灵气产出 = ResourceEngine.calcResourceRates(建筑等级)
2. 计算灵气消耗 = 修炼弟子数 × 2
3. 实际可用灵气 = min(宗门当前灵气 + 产出, 消耗)
4. 若灵气不足：按比例分配给所有修炼弟子（每人获得 (可用/需求) × 正常速率）
5. 对每个修炼中的弟子：
   a. 分配灵气份额
   b. 计算修为增长 = CultivationEngine.calcCultivationRate(弟子, 功法) × 灵气比例 × deltaSec
   c. 增加修为
   d. 更新功法领悟度（批量随机）
   e. 检查是否可以突破（不自动执行，标记为"可突破"）
```

**突破系统：**

- 突破条件：修为 >= 所需值
- 突破属性增长 = 基础增长 × 功法成长修正 × 领悟度比例
- 大境界：基础属性 × 1.8
- 小层级：约大境界增长的 15%
- 突破后修为归零
- **突破不自动执行**，UI 显示"可突破"标识，玩家手动触发

### 3.2 功法领悟系统

```typescript
// 批量领悟（每秒对所有修炼弟子执行一次）
function tickAllComprehension(characters: Character[], deltaSec: number): {
  results: Map<string, { gained: number; failed: boolean }>
} {
  const results = new Map()

  for (const char of characters) {
    if (!char.currentTechnique || char.techniqueComprehension >= 100) continue

    const technique = getTechnique(char.currentTechnique)
    const baseRate = 0.1 // 基础领悟速度 %/s
    const comprehensionBonus = char.cultivationStats.comprehension / 10
    const tierMultiplier = {
      mortal: 1.0, spirit: 0.7, immortal: 0.4, divine: 0.2, chaos: 0.1
    }

    let gained = baseRate * comprehensionBonus * tierMultiplier[technique.tier] * deltaSec

    let failed = false
    // 领悟失败（难度 >=3 的功法才有）
    if (technique.comprehensionDifficulty >= 3) {
      const failChance = 0.02 * technique.comprehensionDifficulty
        * (1 - char.cultivationStats.comprehension / 100)
      if (Math.random() < failChance) {
        failed = true
        gained = -(1 + Math.random() * 2) // 倒退 1-3%
      }
    }

    // 硬限制：0 <= comprehension <= 100
    const newComprehension = Math.max(0, Math.min(100,
      char.techniqueComprehension + gained
    ))

    results.set(char.id, {
      gained: newComprehension - char.techniqueComprehension,
      failed,
    })
  }

  return results
}
```

**领悟度效果：**

| 领悟度 | 成长修正效果 | 固定加成 |
|--------|-------------|----------|
| 0-30% | 30% | 无 |
| 30-70% | 70% | 解锁第一层 |
| 70-100% | 100% | 解锁第二层 |
| 100% | 100% | 全部解锁，功法ID加入 learnedTechniques，UI 通知可换功法 |

**换功法规则：** 随时可换（这是设计意图，不加冷却或消耗），领悟度归零。已完全领悟(100%)的功法记录在 `learnedTechniques` 列表中，换回时领悟度从 0 重新开始。

**离线领悟：** 使用期望值计算，不模拟随机失败。离线期间领悟度 = 当前值 + 期望增量 × 离线秒数。期望增量 = (正常增量 - 失败概率 × 平均回退值)。这确保离线收益是确定性的、可复现的。

### 3.3 冒险系统

**多线规则：**
- 同时可进行的冒险数量：受宗门等级限制（1-3条线）
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

interface LogEntry {
  timestamp: number
  message: string
}
```

**跨 Store 数据流契约（AdventureStore ↔ SectStore）：**

```
AdventureStore.startRun() 内部流程：
  1. 调用 useSectStore.getState() 读取弟子数据（属性、装备、功法）
  2. 验证弟子状态（必须为 cultivating/resting，不能已在其他冒险中）
  3. 构建每个弟子的 CombatUnit（从完整 Character 数据）
  4. 设置 memberStates（所有队员满血入场）
  5. 调用 useSectStore.getState().setCharacterStatus(id, 'adventuring') 更新状态
  6. 创建 DungeonRun 存入 AdventureStore

AdventureStore.completeRun/failRun() 内部流程：
  1. 将 totalRewards 通过 useSectStore.getState().addResource() 存入宗门资源池
  2. 将 itemRewards 通过 useSectStore.getState().addToVault() 存入宗门仓库
  3. 更新弟子状态：活着→cultivating，受伤→resting(设 injuryTimer)
  4. 从 AdventureStore 移除该 run
```

**关键原则：** Resources 只存在于 `useSectStore.resources`，AdventureStore **绝不**持有自己的 Resources 副本。所有资源变动都通过 `sectStore.addResource()` / `sectStore.spendResource()` 进行。

**战斗流程：**
- `CombatUnit` 从弟子的完整数据构建（基础属性 + 装备 + 功法修正）
- 战斗接收最多 5 个 allies（CombatUnit[]）vs enemies（CombatUnit[]）
- 战斗胜利：奖励通过 SectStore 存入宗门资源池/仓库
- 队员死亡：该队员 memberStates.status = 'dead'，后续战斗跳过
- 全员死亡 → 冒险失败，保留已获得奖励的 50%

### 3.4 资源经济

**Resources（全局唯一，仅存于 useSectStore）：**

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
| 灵气 | 灵田建筑（见3.1公式） | 所有修炼弟子消耗 (2/s/人) |
| 灵石 | 矿场、冒险 | 升级建筑、商店购买、装备强化 |
| 灵草 | 药园、冒险 | 治疗弟子（消耗灵草加速恢复）、合成 |
| 矿石 | 矿场、冒险 | 装备强化 |
| 功法残页 | 冒险掉落 | 合成功法 |
| 天材地宝 | 冒险掉落 | 特殊用途 |
| 兽魂 | 冒险掉落 | 宠物强化 |

### 3.5 背包 & 物品流转

```
物品流转规则：

  冒险掉落 ──→ 宗门仓库（共享）
  商店购买 ──→ 宗门仓库
  合成产出 ──→ 宗门仓库

  宗门仓库 ←──→ 弟子背包（自由转移，无消耗）

  弟子只能装备自己背包中的物品
  功法只能从弟子背包学习（消耗物品）
```

- 每个弟子背包上限 20 格
- 宗门仓库初始 50 格，随仓库建筑升级（每级 +20，最高 150）
- 转移操作：弟子背包 ↔ 宗门仓库，无资源消耗

### 3.6 弟子治疗系统

弟子在冒险中受伤（战斗中 HP 归零但队伍未全灭时为 wounded）：

- **受伤状态：** status = 'resting'，injuryTimer 自动设置
- **恢复机制：**
  - 自动恢复：每秒恢复 1 HP（很慢）
  - 消耗灵草加速：`useSectStore.healCharacter(id)` — 消耗 10 灵草，立即恢复满血
- **恢复完成条件：** HP 恢复满 或 玩家消耗灵草治疗
- **恢复后：** status 自动变为 'cultivating'

### 3.7 宠物系统（精简）

宠物不再是独立 Store，作为宗门资源的一部分：

- `Sect.pets: Pet[]` — 全局宠物池
- `Character.petIds: string[]` — 每个弟子最多携带 2 只宠物
- 宠物跟随弟子参与冒险，提供被动属性加成
- 不再需要单独的 PetStore
- 现有 PetSystem 保持不变，但宠物归属通过 `petIds` 管理而非独立 Store

---

## 4. Store 架构

废弃现有 6 个 Store（gameStore, playerStore, inventoryStore, sectStore, adventureStore, petStore, tradeStore），重新设计为 3 个核心 Store。

### 4.1 useSectStore（宗门主 Store — 全局唯一数据源）

**Resources 唯一持有者。** AdventureStore、战斗系统等所有需要修改资源的地方都必须调用 `useSectStore.getState().addResource()` / `spendResource()`，不得持有自己的 Resources 副本。

```typescript
interface SectStore {
  // 宗门数据
  sect: Sect

  // 宗门级操作
  addCharacter(quality: CharacterQuality): Character
  removeCharacter(id: string): void
  promoteCharacter(id: string, newTitle: CharacterTitle): void
  setCharacterStatus(id: string, status: CharacterStatus): void

  // 弟子操作
  learnTechnique(characterId: string, itemIndex: number): boolean  // 从背包学习功法
  switchTechnique(characterId: string, newTechniqueId: string): boolean  // 更换功法
  healCharacter(characterId: string): boolean  // 消耗灵草治疗

  // 建筑操作
  upgradeBuilding(type: BuildingType): boolean
  tryUpgradeBuilding(type: BuildingType): { success: boolean; reason: string }

  // 物品流转
  transferItemToCharacter(characterId: string, itemIndex: number): boolean  // 仓库→弟子
  transferItemToVault(characterId: string, itemIndex: number): boolean       // 弟子→仓库
  addToVault(item: AnyItem): boolean     // 冒险奖励等外部来源添加

  // 资源操作（全局唯一入口）
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

**不持有 Resources。** 所有奖励结算通过调用 `useSectStore` 的方法完成。

```typescript
interface AdventureStore {
  // 使用 Record 而非 Map，确保 JSON 可序列化（localStorage 兼容）
  activeRuns: Record<string, DungeonRun>

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

**序列化说明：** `activeRuns` 使用 `Record<string, DungeonRun>` 而非 `Map<string, DungeonRun>`，因为 `Map` 无法直接 `JSON.stringify`/`JSON.parse`。在 SaveSystem 中直接序列化/反序列化即可。

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
│   ├── 弟子总数/修炼中/冒险中/休息 统计
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
│   ├── 宗门仓库
│   └── 商店（原 tradeStore 合并，购买物品进入宗门仓库）
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
| CultivationEngine | **REPLACED** | 接受 `Character` 而非 `Player`，加入功法成长修正 |
| CombatEngine | 基本不变 | `CombatUnit` 从 `Character` 构建（含功法修正），接收最多5个 allies |
| MapGenerator | 不变 | 秘境地图生成逻辑不变 |
| EventSystem | 调整 | 接收 `Character[]` 队伍，奖励通过回调交给 SectStore |
| ResourceEngine | 调整 | 灵气产出公式适配大规模弟子（见3.1） |
| EquipmentEngine | 不变 | |
| ItemGenerator | 调整 | 新增 `generateTechniqueScroll()` |
| PetSystem | 精简 | 宠物跟随弟子（通过 Character.petIds），非独立 Store |
| SaveSystem | **REPLACED** | 适配新 3-Store 结构（见第8节） |
| **新增** TechniqueSystem | 新建 | 功法领悟tick、突破修正计算、领悟失败概率 |
| **新增** CharacterEngine | 新建 | 弟子生成（含品质随机）、属性初始化 |
| **新增** SectEngine | 新建 | 宗门等级计算、弟子上限计算 |
| DiscipleEngine | **废弃** | 功能合并进 CharacterEngine |
| TradeSystem | 调整 | 合并进建筑页面，购买物品进入宗门仓库 |

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
    id: 'leiyu',
    name: '雷御诀',
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

| 功法名 | 品阶 | 元素 | 核心方向 |
|--------|------|------|----------|
| 雷神体 | 仙品 | lightning | 速度/暴击，概率连击 |
| 不灭金身 | 仙品 | neutral | 均衡/坚韧，高存活率 |
| 九转轮回 | 仙品 | neutral | 全属性，领悟后可复活 |
| 万剑归宗 | 神品 | neutral | 极致攻击 |
| 太上忘情 | 神品 | ice | 全属性，领悟极慢 |
| 混沌天功 | 混沌品 | neutral | 最强全属性，极难获取和领悟 |

---

## 8. 弟子状态流转

**完整状态转换表：**

| 当前状态 | → 目标状态 | 触发条件 |
|----------|-----------|----------|
| cultivating | adventuring | 玩家组队并开始冒险 |
| cultivating | resting | N/A（只有冒险受伤才会 resting） |
| adventuring | cultivating | 冒险正常结束（撤退/通关）且弟子未受伤 |
| adventuring | resting | 冒险结束但弟子受伤（HP < 最大HP） |
| resting | cultivating | 自动恢复（injuryTimer 归零）或玩家消耗灵草治疗 |
| resting | adventuring | **不允许**（必须先恢复） |

**受伤机制：**
- 战斗中 HP 归零：memberStates.status = 'wounded'
- 冒险结束后：受伤弟子 status = 'resting'
- 自动恢复速度：1 HP/s（很慢，鼓励消耗灵草）
- 灵草治疗：消耗 10 灵草立即满血（通过 `sectStore.healCharacter(id)`）

---

## 9. 离线收益

离线收益逻辑：

1. 计算离线秒数（上限 24h = 86400s）
2. 模拟 tickAll：资源产出 - 弟子修炼消耗
3. 若灵气不足，修炼效率按比例降低
4. **不模拟冒险**（冒险在离线时暂停，重新上线后可继续）
5. **功法领悟使用期望值**（不模拟随机失败，确保确定性）：
   ```
   期望增量/s = 正常增量 - (失败概率 × 平均回退值)
   离线领悟度 = min(100, 当前值 + 期望增量 × 离线秒数)
   ```
6. 突破不自动执行，离线期间达到突破条件的弟子标记为"可突破"（UI 提示）
7. 休息中的弟子按离线时间自动恢复 HP

---

## 10. 存档系统

### 10.1 存档策略：清除重置

由于架构从"单个 Player"彻底转变为"宗门 + 多弟子"，数据模型完全不兼容，采用**存档清除**策略：

- 版本号从 v1 升级到 v2
- `loadGame()` 检测到 v1 存档时，自动清除并初始化新存档
- 新存档包含：初始宗门（等级1，500灵石）、1个初始弟子（common品质）
- **不提供数据迁移**（v1 → v2 无映射意义：Player → 单个 Character 会丢失宗门概念）

### 10.2 SaveData v2 结构

```typescript
interface SaveData {
  version: 2
  timestamp: number
  sectStore: SectState
  adventureStore: { activeRuns: Record<string, DungeonRun> }
  gameStore: { saveSlot: number; lastOnlineTime: number }
}
```

序列化时从 3 个 Store 各取数据，反序列化时还原到对应 Store。使用 `Record` 而非 `Map` 确保 JSON 兼容。
