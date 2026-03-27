# 游戏玩法丰富 — 总体设计文档

> **日期：** 2026-03-27
> **状态：** 待审核

## 概述

为 EndlessQuest 添加 8 个子系统来丰富放置类游戏体验，按优先级分为 4 批实现：

- **P0（核心体验）：** 掉落表系统、天劫系统
- **P1（策略深度）：** 弟子特长与建筑指派、宗门赋税、闭关系统
- **P2（内容丰富）：** 建筑协同加成、任务派遣、探险商店与灵兽捕获

## 用户选择摘要

| 决策点 | 选择 |
|--------|------|
| 天劫交互 | 纯被动，即时判定，无倒计时 |
| 弟子特长 | 新建独立特长系统（与天赋并行） |
| 特长生效 | 需要指派弟子到对应建筑 |
| 建筑协同 | 被动加成，自动检测 |
| 宠物接入 | 探险战斗中自动参与 |
| 宗门任务 | 只做赋税（被动收入），不做日常任务 |
| 闭关状态 | 新增 `secluded` 状态 |

## 子项目 Spec 索引

每个子项目有独立的详细设计文档：

1. [P0-1: 掉落表系统](#p0-1-掉落表系统)
2. [P0-2: 天劫系统](#p0-2-天劫系统)
3. [P1-1: 弟子特长与建筑指派](#p1-1-弟子特长与建筑指派)
4. [P1-2: 宗门赋税](#p1-2-宗门赋税)
5. [P1-3: 闭关系统](#p1-3-闭关系统)
6. [P2-1: 建筑协同加成](#p2-1-建筑协同加成)
7. [P2-2: 任务派遣](#p2-2-任务派遣)
8. [P2-3: 探险商店与灵兽捕获](#p2-3-探险商店与灵兽捕获)

---

## P0-1: 掉落表系统

### 问题

当前战斗事件掉落硬编码（`50*floor` 灵石 + 15% 概率装备），没有变化和惊喜。

### 设计

为每个敌人模板定义 `lootTable`，战斗结算时按权重随机抽取 1-3 个掉落项。

### 数据结构

```typescript
interface LootEntry {
  type: 'spiritStone' | 'herb' | 'ore' | 'equipment' | 'consumable' | 'petCapture'
  weight: number              // 掉落权重（相对值）
  minAmount?: number          // 资源最小数量
  maxAmount?: number          // 资源最大数量
  quality?: CharacterQuality  // 装备品质上限
  recipeId?: string           // 特定丹药配方 ID
}

// EnemyTemplate 新增字段
interface EnemyTemplate {
  // ...现有字段
  lootTable: LootEntry[]
  dropsPerFight: number       // 每次战斗掉落几项（1-3）
}
```

### 与现有 Dungeon.lootTable 的关系

现有 `Dungeon` 类型已有一个 `lootTable: Array<{ itemId: string; weight: number }>` 字段（当前全部为空数组）。该字段从未被使用。实现时应**移除** `Dungeon.lootTable` 字段，改用敌人级别的掉落表设计，避免命名冲突。

### 掉落逻辑

1. 战斗胜利后，根据敌人 `dropsPerFight` 确定掉落数量
2. 每个掉落槽独立 roll：按权重随机选择一个 `LootEntry`
3. 根据 entry.type 生成对应物品：
   - **资源类（spiritStone/herb/ore）：** 数量在 `[minAmount, maxAmount]` 范围内随机 × floor 系数，直接加到 `sect.resources`（`resources.spiritStone += amount` 等），**不经过** vault
   - **装备（equipment）：** 按品质上限生成随机装备，通过 `addItemToStacks` 加入 `sect.vault`
   - **丹药（consumable）：** 按 recipeId 生成，通过 `addItemQuantityToStacks` 加入 `sect.vault`
   - **灵宠捕获（petCapture）：** 标记为可捕获事件，进入宠物捕获判定流程

### 敌人掉落表设计

**灵兽 (wild_spirit_beast):**
| 掉落 | 权重 | 数量 |
|------|------|------|
| 灵石 | 40 | 20-50×floor |
| 草药 | 25 | 2-8×floor |
| 矿石 | 15 | 1-5×floor |
| 凡品装备 | 10 | 1件 |
| 灵品装备 | 3 | 1件 |
| 灵宠捕获 | 2 | 1次 |

**洞妖 (cave_demon):**
| 掉落 | 权重 | 数量 |
|------|------|------|
| 灵石 | 35 | 40-80×floor |
| 草药 | 10 | 3-10×floor |
| 矿石 | 20 | 3-10×floor |
| 凡品装备 | 5 | 1件 |
| 灵品装备 | 12 | 1件 |
| 仙品装备 | 3 | 1件 |
| 灵宠捕获 | 3 | 1次 |

**灵脉守卫 (spirit_boss):**
| 掉落 | 权重 | 数量 |
|------|------|------|
| 灵石 | 30 | 100-300×floor |
| 草药 | 15 | 10-30×floor |
| 矿石 | 15 | 5-20×floor |
| 灵品装备 | 20 | 1-2件 |
| 仙品装备 | 12 | 1件 |
| 神品装备 | 3 | 1件 |
| 灵宠捕获 | 5 | 1次 |

### 涉及文件

- `src/data/enemies.ts` — 添加 lootTable 到敌人模板
- `src/systems/roguelike/LootSystem.ts` — 新建：掉落计算逻辑
- `src/systems/roguelike/EventSystem.ts` — 战斗结算调用 LootSystem
- `src/systems/save/SaveSystem.ts` — 掉落物品持久化

---

## P0-2: 天劫系统

### 问题

天劫只是 `CultivationEngine` 中的概率判定，没有仪式感和具体后果。

### 设计

大境界突破时触发天劫，即时判定结果。失败有明确惩罚（受伤 + 修为归零），小境界突破不触发天劫。

### 触发条件

- **触发：** 弟子修为满 + 大境界突破（realmStage 3 → realm+1, stage 0），且目标境界有 `tribulationPower` 定义（即 realm 2+：金丹/元婴/化神）
- **不触发：** 小境界突破（realmStage 0→1, 1→2, 2→3）
- **不触发：** 进入 realm 1（筑基）和 realm 2（金丹）前的突破（这两个目标境界无 tribulationPower），使用现有小境界失败率公式（5% + 0）

### 判定逻辑

```typescript
function resolveTribulation(character: Character): TribulationResult {
  const targetRealm = character.realm + 1
  const realmData = REALMS[targetRealm]
  const power = realmData.tribulationPower ?? 0
  const baseFailRate = 0.10 + power * 0.25

  // 弟子属性降低失败率（typical ranges: spiritualRoot 10-40, comprehension 5-30）
  // spiritualRoot bonus: 0.05-0.20, comprehension bonus: 0.015-0.09
  const spiritRootBonus = character.cultivationStats.spiritualRoot * 0.005
  const comprehensionBonus = character.cultivationStats.comprehension * 0.003

  const failRate = Math.max(0, baseFailRate - spiritRootBonus - comprehensionBonus)

  // 化神期特殊：stage 越高天劫越强
  let stageMultiplier = 1.0
  if (character.realm === 4) {
    stageMultiplier = realmData.tribulationStages?.[character.realmStage] ?? 1.0
  }
  const finalFailRate = Math.min(0.95, failRate * stageMultiplier)

  if (Math.random() >= finalFailRate) {
    return { success: true }
  }

  // 失败：10% 概率重伤
  const severe = Math.random() < 0.10
  return {
    success: false,
    severe,
    injuryTimer: severe ? 120 : 60,
  }
}
```

### 与现有 CultivationEngine 的集成

`resolveTribulation()` **替换**大境界突破中的 `calcBreakthroughFailureRate()`。集成流程：

```
tickAll 检测 canBreakthrough()
  └─ 是大境界突破？
     ├─ 是 → 检查灵石 → resolveTribulation()
     │   ├─ success → breakthrough(character, 0) → 正常境界提升
     │   ├─ failure → cultivation = 0, status = 'injured', injuryTimer = 60
     │   └─ severe failure → cultivation = 0, status = 'injured', injuryTimer = 120, realmStage - 1（最低 0）
     └─ 否 → 使用现有 calcBreakthroughFailureRate() + breakthrough()
```

### 天劫结果

| 结果 | 概率 | 效果 |
|------|------|------|
| 渡劫成功 | 依属性 | 境界提升，正常 |
| 渡劫失败 | 依属性 | 修为归零，受伤 |
| 重伤 | 失败的 10% | 修为归零，境界跌落 1 小阶段，受伤 120s |

### UI 表现

- 天劫发生时在事件日志中记录（复用现有事件日志系统）
- 成功：日志显示"XX 弟子渡过天劫，境界提升至 XX"
- 失败：日志显示"XX 弟子天劫失败，修为尽失"
- 重伤：日志显示"XX 弟子天劫重伤，境界跌落"

### 涉及文件

- `src/systems/cultivation/TribulationSystem.ts` — 新建：天劫判定逻辑
- `src/systems/cultivation/CultivationEngine.ts` — 大境界突破调用 TribulationSystem
- `src/stores/sectStore.ts` — tickAll 中突破逻辑集成天劫判定
- `src/components/cultivation/BreakthroughPanel.tsx` — 显示天劫失败率预览

---

## P1-1: 弟子特长与建筑指派

### 问题

所有弟子在建筑/探险中的表现没有差异，招募只是看数值高低。天赋系统只影响战斗属性。

### 设计

新建独立的"特长"（Specialty）系统，弟子可指派到建筑，特长效果在指派后激活。

### 数据结构

```typescript
type SpecialtyType =
  | 'alchemy'     // 炼丹：丹炉产出效率
  | 'forging'     // 锻造：炼器坊成功率/品质
  | 'mining'      // 采矿：灵石矿产出
  | 'herbalism'   // 种植：灵田产出
  | 'comprehension' // 悟道：功法领悟速度
  | 'combat'      // 战斗：探险战斗属性
  | 'fortune'     // 机缘：掉落/捕获概率
  | 'leadership'  // 统率：带队全队加成

interface Specialty {
  type: SpecialtyType
  level: 1 | 2 | 3
}

// Character 新增字段
interface Character {
  // ...现有字段
  specialties: Specialty[]       // 0-2 个特长
  assignedBuilding: BuildingType | null  // 指派到的建筑
}
```

### 分配规则

| 品质 | 特长数量 | Lv2+ 概率 | Lv3 概率 |
|------|----------|-----------|----------|
| common (凡) | 0 | - | - |
| spirit (灵) | 0-1 (50%) | 20% | 0% |
| immortal (仙) | 1 | 30% | 5% |
| divine (神) | 1-2 | 40% | 10% |
| chaos (混沌) | 1-2 | 50% | 20% |

### 建筑指派机制

- 弟子被指派到建筑后状态变为 `training`
- 指派中的弟子**不修炼、不探险、不突破**
- 可随时撤回，弟子恢复 `idle` → 自动 `cultivating`
- 每个建筑最多分配 3 个弟子
- 指派在弟子详情页 UI 操作

### 特长等级效果

| 特长类型 | 对应建筑 | Lv1 | Lv2 | Lv3 |
|----------|----------|-----|-----|-----|
| alchemy | 丹炉 | 效率 +15% | +30% | +50% |
| forging | 炼器坊 | 成功率 +10% | +20% | +35% |
| mining | 灵石矿 | 灵石 +10% | +20% | +35% |
| herbalism | 灵田 | 产出 +10% | +20% | +35% |
| comprehension | 藏经阁 | 领悟速度 +15% | +30% | +50% |
| combat | 无（探险被动） | 攻击/防御 +5% | +10% | +20% |
| fortune | 无（探险被动） | 掉落率 +10% | +20% | +35% |
| leadership | 无（探险被动） | 队伍上限 +1 | +1 | +1 + 队伍属性 +5% |

多个弟子指派同一建筑时，同类型特长取最高值，不同类型特长叠加。

### 说明：comprehension 特长 vs 现有功法领悟

现有功法领悟系统（technique comprehension 0-100%）是在突破时触发的概率事件。`comprehension` 特长**不直接影响**该概率，而是提升功法领悟的**速度**——即每次触发领悟时获得的进度增量更大。具体机制：突破时调用 `comprehension` 后有概率触发领悟事件，如果触发了，领悟进度增量 = `baseProgress * (1 + specialtyBonus)`。这是与现有领悟概率独立的加速机制。

### 存档迁移

新字段 `specialties` 和 `assignedBuilding` 在旧存档中不存在。加载时：
- `character.specialties` 为 undefined → 默认 `[]`
- `character.assignedBuilding` 为 undefined → 默认 `null`
- 在 SaveSystem 的迁移逻辑中处理

### UI 状态标签更新

`training` 状态标签应从当前的"修炼中"改为"研习中"，并在弟子列表筛选中**不再与 `cultivating` 分组**，因为指派到建筑的弟子不修炼。

### 涉及文件

- `src/types/character.ts` — 添加 specialties 和 assignedBuilding 字段
- `src/data/specialties.ts` — 新建：特长数据定义
- `src/systems/character/SpecialtySystem.ts` — 新建：特长生成/计算逻辑
- `src/systems/character/CharacterEngine.ts` — 角色生成时分配特长
- `src/systems/economy/BuildingEffects.ts` — 建筑效果计算考虑特长加成
- `src/stores/sectStore.ts` — assignToBuilding / unassignFromBuilding actions
- `src/systems/save/SaveSystem.ts` — 新字段持久化

---

## P1-2: 宗门赋税

### 问题

主殿功能薄弱（只决定宗门等级），灵石没有被动收入渠道（除了巡逻和探险）。

### 设计

主殿升级后自动产出灵石赋税，基于宗门等级和弟子数量。

### 计算公式

```
赋税/秒 = sectLevel * discipleCount * 0.5
```

| 宗门等级 | 弟子数 | 赋税/秒 |
|----------|--------|---------|
| 1 | 5 | 2.5 |
| 2 | 10 | 10 |
| 3 | 15 | 22.5 |
| 4 | 20 | 40 |
| 5 | 30 | 75 |

### 实现

在 `tickAll` 中添加赋税计算，作为主殿的被动效果。赋税不消耗任何资源。

### UI

在资源栏或建筑页面显示赋税收入率。

### 涉及文件

- `src/systems/economy/ResourceEngine.ts` — calcResourceRates 添加赋税计算
- `src/stores/sectStore.ts` — tickAll 中应用赋税
- `src/pages/BuildingsPage.tsx` — 主殿显示赋税收入

---

## P1-3: 闭关系统

### 问题

灵石除了突破外没有消耗出口，修炼速度固定没有提升手段。

### 设计

弟子可进入闭关状态，消耗灵石换取修为加速。

### 新增状态

```typescript
type CharacterStatus =
  | 'idle' | 'cultivating' | 'adventuring' | 'patrolling'
  | 'injured' | 'resting' | 'training' | 'secluded'  // 新增 secluded
```

### 机制

- **灵石消耗：** `10 * (realm + 1) /s`
- **修炼速度加成：** ×2.5
- **灵气消耗：** 闭关期间**不消耗**灵气（spirit energy），完全靠灵石驱动
- **自动退出：** 灵石不足时自动退出闭关，恢复 `cultivating`
- **手动退出：** 玩家可随时手动退出闭关
- **闭关上限：** 最多 3 个弟子同时闭关，避免完全绕过灵气系统

| 境界 | 灵石消耗/s | 普通修炼灵气消耗/s |
|------|-----------|-------------------|
| 炼气 (0) | 10 | 2 |
| 筑基 (1) | 20 | 2 |
| 金丹 (2) | 30 | 2 |
| 元婴 (3) | 40 | 2 |
| 化神 (4) | 50 | 2 |

### tickAll 集成

```typescript
// 在 cultivating 循环中
if (character.status === 'secluded') {
  const stoneCost = 10 * (character.realm + 1) * deltaSec
  if (resources.spiritStone >= stoneCost) {
    resources.spiritStone -= stoneCost
    cultivationTick(character, effectiveSpirit * 2.5)
  } else {
    character.status = 'cultivating'
  }
} else if (character.status === 'cultivating') {
  // 现有逻辑
}
```

**注意：** 闭关灵石消耗从共享池中按顺序扣除。同一 tick 内多个闭关弟子可能因顺序导致部分退出（先扣的先消耗）。这是可接受的行为，因为顺序在同一 tick 内是确定性的。

### UI

弟子详情页增加"闭关"按钮（cultivating 状态时可用），点击后进入闭关。闭关中显示消耗率和加速倍数，可手动退出。

### 涉及文件

- `src/types/character.ts` — CharacterStatus 添加 'secluded'
- `src/stores/sectStore.ts` — startSeclusion / stopSeclusion actions，tickAll 处理闭关逻辑
- `src/pages/CharactersPage.tsx` — 弟子详情闭关按钮
- `src/systems/save/SaveSystem.ts` — 迁移：旧存档中无 secluded 状态，无需特殊处理（字符串类型天然兼容）

---

## P2-1: 建筑协同加成

### 问题

建筑之间没有关联，升级是独立的，缺乏组合策略。

### 设计

特定建筑组合达到指定等级时自动触发协同加成。

### 协同定义

```typescript
interface Synergy {
  id: string
  name: string
  description: string
  requirements: { building: BuildingType; level: number }[]
  effect: { target: BuildingType; stat: string; value: number }
}
```

| 协同名 | 条件 | 效果 |
|--------|------|------|
| 灵药之道 | 灵田 Lv3 + 丹炉 Lv3 | 丹炉产出效率 +20% |
| 百炼成钢 | 灵矿 Lv3 + 炼器坊 Lv3 | 锻造成功率 +15% |
| 以武入道 | 藏经阁 Lv3 + 聚仙台 Lv2 | 全弟子功法领悟概率 +15% |
| 开源节流 | 灵矿 Lv5 + 坊市 Lv3 | 坊市品质上限 = marketLevel + 1 |
| 丹器双修 | 丹炉 Lv5 + 炼器坊 Lv5 | 两者效率各 +25% |

### 计算方式

协同效果在每次 `tickAll` 中**动态计算**，检查条件是否满足。满足则应用加成，不满足则加成消失。**不永久修改**角色属性或建筑状态——所有协同效果都是临时计算值。

### 计算

在 `tickAll` 或建筑效果计算时，遍历 SYNERGIES 列表，检查所有条件是否满足，满足则应用效果。

### UI

建筑页面底部显示协同列表，已激活的高亮，未激活的灰显并显示缺什么条件。

### 涉及文件

- `src/data/buildings.ts` — 添加 SYNERGIES 常量
- `src/systems/economy/BuildingEffects.ts` — 计算建筑效果时考虑协同
- `src/pages/BuildingsPage.tsx` — 显示协同列表

---

## P2-2: 任务派遣

### 问题

巡逻（patrol）太简单（60 秒固定灵石），弟子除了修炼和探险没有其他事做。

### 设计

扩展巡逻系统的含义，支持多种派遣任务类型。

### 任务定义

```typescript
interface DispatchMission {
  id: string
  name: string
  description: string
  duration: number         // 秒
  rewards: { type: ResourceType | 'spiritStone' | 'consumable'; amount: number; recipeId?: string }[]
  minRealm: number         // 最低境界要求
}

const DISPATCH_MISSIONS: DispatchMission[] = [
  { id: 'gather_herbs', name: '采集灵药', description: '前往山野采集灵药', duration: 300, rewards: [{ type: 'herb', amount: 80 }], minRealm: 0 },
  { id: 'mine_ores', name: '探矿', description: '深入矿脉开采矿石', duration: 300, rewards: [{ type: 'ore', amount: 50 }], minRealm: 0 },
  { id: 'visit_market', name: '访问坊市', description: '前往坊市寻找丹药', duration: 180, rewards: [{ type: 'spiritStone', amount: 200 }], minRealm: 1 },
  { id: 'seek_master', name: '寻访高人', description: '外出寻访修仙前辈', duration: 600, rewards: [{ type: 'consumable', amount: 1, recipeId: 'spirit_potion' }], minRealm: 2 },
  { id: 'hunt_beasts', name: '猎杀妖兽', description: '清理附近妖兽获取灵石', duration: 480, rewards: [{ type: 'spiritStone', amount: 400 }], minRealm: 1 },
]
```

### 规则

- 弟子派遣后状态变为 `patrolling`（复用现有状态）
- 每个弟子同时只能执行一个任务
- 最多 5 个弟子同时派遣
- 任务完成后自动返回 `idle`
- 奖励直接加入 sect 资源/仓库
- 替换现有简单巡逻系统
- **存档迁移：** 加载旧存档时，如果有 `patrolActive === true` 的巡逻状态，直接完成巡逻并发放奖励，弟子恢复 `idle`

### UI

弟子详情页增加"派遣"按钮，打开任务选择面板。显示可选任务列表、时间、奖励、最低境界要求。已派遣的弟子显示倒计时。

### 涉及文件

- `src/data/missions.ts` — 新建：任务定义
- `src/stores/adventureStore.ts` — 扩展巡逻逻辑，支持多种任务
- `src/pages/CharactersPage.tsx` — 派遣 UI
- `src/systems/save/SaveSystem.ts` — 任务状态持久化

---

## P2-3: 探险商店与灵兽捕获

### 问题

Shop 事件是空壳无功能。宠物系统数据完整但无获取途径。

### 设计 A: 探险商店

战斗事件中触发商店时，显示可购买的临时物品。

```typescript
interface ShopItem {
  name: string
  description: string
  cost: number            // 灵石价格
  effect: 'heal' | 'skip' | 'spirit'
  value: number           // 效果数值（百分比或固定值）
}

const SHOP_ITEMS: ShopItem[] = [
  { name: '回春丹', description: '恢复 30% 生命', cost: 100, effect: 'heal', value: 0.3 },
  { name: '传送符', description: '跳过当前层', cost: 200, effect: 'skip', value: 0 },
  { name: '聚灵丹', description: '恢复 20% 灵力', cost: 150, effect: 'spirit', value: 0.2 },
]
```

- 每次商店随机提供 2-3 个商品
- 使用探险中获得的灵石购买（从 `DungeonRun.totalRewards` 中的灵石部分扣除）
- 购买后立即生效

### 设计 B: 灵兽捕获

战斗事件中 10% 概率出现可捕获灵兽。

- 捕获率 = `tryCapturePet(fortune, quality)`（复用现有函数）
- 捕获后加入 sect.pets
- 灵兽在探险战斗中自动参与：为队伍提供被动属性加成（hp/atk/def 各 +10% × qualityMultiplier）
- 每个弟子最多 1 只灵宠参与战斗，取 `petIds` 中品质最高的那只

### 探险 UI 集成

- 事件结算时检查是否触发商店/灵宠捕获
- 商店：弹出购买面板
- 灵宠：弹出"是否尝试捕获"提示，显示捕获率

### 涉及文件

- `src/systems/roguelike/EventSystem.ts` — 商店和灵宠事件逻辑
- `src/systems/roguelike/LootSystem.ts` — 掉落表中的 petCapture 类型处理
- `src/systems/pet/PetSystem.ts` — 复用 tryCapturePet
- `src/stores/adventureStore.ts` — 商店购买/灵宠捕获状态
- `src/pages/AdventurePage.tsx` — 商店和灵宠 UI

---

## 实现顺序建议

```
P0-1 掉落表 ──→ P0-2 天劫 ──→ P1-2 赋税 ──→ P1-3 闭关
                                              ↓
P1-1 特长与指派 ←── (依赖 Character 类型变更)
                                              ↓
P2-1 建筑协同 ←── (依赖 P1-1 建筑效果改动)
                                              ↓
P2-2 任务派遣 ←── (扩展巡逻系统)
                                              ↓
P2-3 探险商店与灵宠 ←── (依赖 P0-1 掉落表)
```

赋税和闭关改动最小，可以和掉落表/天劫并行开发。但注意赋税和闭关**都修改 tickAll**，并行开发时需注意合并冲突。特长系统涉及 Character 类型变更，建议在类型稳定后再做。后续系统依次依赖前面的改动。
