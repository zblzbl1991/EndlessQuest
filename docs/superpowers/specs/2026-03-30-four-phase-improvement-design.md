# 四阶段完善计划设计文档

**日期：** 2026-03-30
**状态：** 待审核
**前置文档：** Spec 2（cultivation-redesign）、Spec 1（core-product-overhaul）

---

## 概述

本文档定义 EndlessQuest 四个阶段的完善计划，涵盖修炼状态简化、战斗深化、秘境体验增强、弟子培养深度、宗门路线、赛季传承和统计面板。

**架构决策：** 方案 A + Store 拆分——新数据按归属挂载在现有实体（Character/Sect/DungeonRun）上，P2 阶段将 sectStore 拆分为 Zustand slices。

**排除项：** 祝福/遗物系统暂不实施（可后续单独设计）。

---

## P0：状态简化 + 工程基础

### P0-1：修炼状态简化（实施 Spec 2）

#### 类型变更

`CharacterStatus` 从：
```typescript
'idle' | 'cultivating' | 'adventuring' | 'patrolling' | 'injured' | 'resting' | 'training' | 'secluded'
```
变为：
```typescript
'idle' | 'adventuring' | 'resting' | 'injured' | 'training'
```

- 移除 `'cultivating'`——合并进 `'idle'`
- 移除 `'secluded'`——完全删除
- 移除 `'patrolling'`——已被派遣任务取代

`idle` 在 UI 中显示为"修炼中"（绿色），语义即自动修炼。

#### 数据变更（`src/data/realms.ts`）

每个 RealmStage 新增 `minorBreakthroughCost` 字段：

| 境界 | 初→中 | 中→后 | 后→圆满 |
|------|-------|-------|---------|
| 炼气 | 50 | 80 | 120 |
| 筑基 | 300 | 500 | 800 |
| 金丹 | 2,000 | 3,500 | 5,000 |
| 元婴 | 15,000 | 25,000 | 40,000 |
| 化神 | 100,000 | 160,000 | 225,000 |
| 飞升 | 500,000 | 800,000 | 1,200,000 |

大境界突破灵石消耗使用现有 `breakthroughCost` 字段，不变。

#### 逻辑变更（`sectStore.ts tickAll`）

- 移除 `secluded` 分支的所有逻辑（2.5x 计算、灵石消耗、3 人上限检查）
- 移除 `cultivating` 分支，统一为 `idle` 分支
- idle 弟子的修炼速率 = 基础速率 × 技术加成 × 建筑加成（与当前 cultivating 计算方式一致）
- 小突破条件：修炼进度满 + 灵石充足 → 自动尝试
- 小突破失败：修炼进度归零，灵石不退还
- 大突破：沿用现有天劫系统

#### 移除的 Store Actions

- `startSeclusion(characterId)`
- `stopSeclusion(characterId)`
- `healCharacter(characterId)` 中 `'cultivating'` → `'idle'`

#### UI 变更

- `StatusBadge`：`idle` 显示"修炼中"，绿色
- 移除所有闭关相关按钮（角色详情页、建筑面板等）
- `BreakthroughPanel`：新增灵石消耗显示和灵石是否充足的提示

#### 受影响文件

| 文件 | 变更 |
|------|------|
| `src/types/character.ts` | CharacterStatus 类型简化 |
| `src/data/realms.ts` | 新增 minorBreakthroughCost 字段 |
| `src/stores/sectStore.ts` | tickAll 逻辑简化、移除闭关 actions |
| `src/systems/cultivation/CultivationEngine.ts` | canBreakthrough 增加灵石检查 |
| `src/components/common/StatusBadge.tsx` | idle 显示调整 |
| `src/components/cultivation/BreakthroughPanel.tsx` | 灵石消耗提示 |
| `src/pages/CharactersPage.tsx` | 移除闭关按钮 |
| `src/pages/BuildingsPage.tsx` | 移除闭关相关面板 |
| `src/pages/AdventurePage.tsx` | 移除 patrolling 状态引用 |
| `src/__tests__/stores.test.ts` | 更新状态断言 |
| `src/__tests__/CultivationEngine.test.ts` | 新增灵石消耗测试 |

### P0-2：工程工具链

#### ESLint 配置

- `eslint.config.js`（flat config 格式）
- 扩展：`typescript-eslint`、`eslint-plugin-react`、`eslint-plugin-react-hooks`
- 关键规则：React hooks 依赖检查、未使用变量、TypeScript 严格模式

#### Prettier 配置

- `.prettierrc`：单引号、无分号、2 空格缩进、尾随逗号 es5
- `.prettierignore`

#### Pre-commit hooks

- `husky` + `lint-staged`
- 提交时自动对 `.ts`/`.tsx` 文件运行 `eslint --fix` 和 `prettier --write`

#### 新增依赖

```
eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
eslint-plugin-react eslint-plugin-react-hooks
prettier husky lint-staged
```

#### 新增文件

| 文件 | 用途 |
|------|------|
| `eslint.config.js` | ESLint flat config |
| `.prettierrc` | Prettier 配置 |
| `.prettierignore` | Prettier 忽略列表 |
| `.husky/pre-commit` | Git pre-commit hook |

---

## P1：战斗深化 + 修行要务面板

### P1-1：战斗系统深化

#### 目标选择改进

引入仇恨值（aggro）机制：

- 每次被攻击：仇恨 +1
- 被暴击命中：仇恨 +2
- 治疗队友：仇恨 +0.5（被治疗者）
- 攻击型技能：优先攻击仇恨最高的目标
- 辅助/治疗技能：优先 HP% 最低的队友
- AOE 技能：攻击所有存活目标，伤害 ×0.6

#### 技能 AI 改进

根据战术预设决定行动：

| 预设 | 行为 |
|------|------|
| `conservative` | HP < 40% 时优先使用治疗/防御技能 |
| `balanced` | 按冷却顺序使用技能，HP 低时切防御 |
| `burst` | 优先使用高倍率技能，有增益时开大 |
| `bossCounter` | Boss 战时保存资源，关键时机爆发 |

默认预设：`balanced`。

#### 敌人词缀系统

| 词缀 | 效果 | 出现概率 |
|------|------|---------|
| `berserk` | HP < 30% 时攻击力 +50% | 15% |
| `shield` | 战斗开始获得 20% 最大 HP 的护盾 | 10% |
| `spiritDrain` | 每次攻击回复造成伤害 10% 的 HP | 10% |
| `swift` | 速度 +30%，每 3 回合额外攻击一次 | 8% |
| `tribulationBane` | 攻击附带元素克制伤害（无视防御 5%） | 5% |

词缀仅在 Boss 和精英敌人上出现，普通敌人不携带。Boss 固定 1-2 个词缀，精英从词缀池随机 0-1 个。

#### 类型新增

```typescript
// src/types/adventure.ts
type EnemyAffix = 'berserk' | 'shield' | 'spiritDrain' | 'swift' | 'tribulationBane'
type TacticalPreset = 'conservative' | 'balanced' | 'burst' | 'bossCounter'

// CombatUnit 新增字段（在 CombatEngine 中定义）
interface CombatUnit {
  // ...existing fields
  aggro: number
  shield: number
  affixes: EnemyAffix[]
  preset: TacticalPreset
}
```

#### 敌方 AI

- Boss 有技能池（2-3 个技能），按权重随机选择
- 普通敌人始终使用普攻
- 带词缀的敌人根据词缀调整行为（如 berserk 在 HP < 30% 后改变策略）

#### 新增文件

| 文件 | 用途 |
|------|------|
| `src/systems/combat/TargetingSystem.ts` | 仇恨值计算、目标选择 |
| `src/systems/combat/SkillAI.ts` | 根据战术预设选择技能 |
| `src/systems/combat/AffixSystem.ts` | 词缀效果应用 |
| `src/data/affixes.ts` | 词缀定义和效果表 |

#### 受影响文件

| 文件 | 变更 |
|------|------|
| `src/systems/combat/CombatEngine.ts` | 集成 TargetingSystem、SkillAI、AffixSystem |
| `src/data/enemies.ts` | 敌人模板新增 affixPool 和 skillIds |
| `src/types/adventure.ts` | 新增 EnemyAffix、TacticalPreset 类型 |
| `src/pages/AdventurePage.tsx` | 战术预设选择 UI |
| `src/__tests__/CombatEngine.test.ts` | 新增 AI 和词缀测试 |

### P1-2：修行要务面板（ActionAgenda）

#### 位置

SectPage 顶部，资源栏下方。

#### 优先级计算规则

按优先级从高到低，取前 3 个：

| 优先级 | 条件 | 卡片内容 |
|--------|------|---------|
| 1 | 有弟子修炼进度 > 90% 且灵石充足 | "XX 即将突破，需要 X 灵石" |
| 2 | 有建筑可升级且资源充足 | "XX 可升级至 X 级" |
| 3 | 有秘境可挑战且弟子空闲 | "XX 已解锁，派遣弟子探险" |
| 4 | 有弟子受伤 | "XX 正在疗伤（剩余 Xs）" |
| 5 | 资源接近上限（>80%） | "灵气即将溢出（X/X）" |
| 6 | 有秘境运行中 | "X 队伍正在 XX 第 X 层" |

每张卡片可点击，跳转到对应页面/面板。

#### 新增文件

| 文件 | 用途 |
|------|------|
| `src/components/sect/ActionAgenda.tsx` | 面板组件 |
| `src/styles/components/ActionAgenda.module.css` | 样式 |

#### 受影响文件

| 文件 | 变更 |
|------|------|
| `src/pages/SectPage.tsx` | 集成 ActionAgenda 组件 |

---

## P2：离线收益 + 代码重构 + 弟子修炼路径

### P2-1：离线收益报告弹窗

#### 触发条件

玩家回到游戏时，如果离线时间 > 60 秒，弹出离线收益报告。

#### 弹窗内容

- 离开时长
- 获得资源明细（灵石、灵气、灵草、矿石）
- 期间发生的关键事件（突破成功/失败、炼丹产出、宗门税收等）

#### 类型新增

```typescript
interface OfflineReport {
  offlineSeconds: number
  resourcesGained: Resources
  breakthroughs: { characterName: string; targetRealm: string; success: boolean }[]
  itemsCrafted: { name: string; quantity: number }[]
  taxIncome: number
}
```

#### 数据收集

- `sectStore` tick 中累积到 `sect.offlineAccumulator`
- 登录时 `IdleEngine` 检测离线时长 > 60s 则生成报告并弹出
- 弹窗关闭后清空 accumulator

#### 新增文件

| 文件 | 用途 |
|------|------|
| `src/components/common/OfflineReportModal.tsx` | 弹窗组件 |
| `src/styles/components/OfflineReportModal.module.css` | 样式 |

#### 受影响文件

| 文件 | 变更 |
|------|------|
| `src/types/sect.ts` | Sect 新增 offlineAccumulator 字段 |
| `src/stores/sectStore.ts` | tick 中累积离线数据 |
| `src/systems/idle/IdleEngine.ts` | 检测离线并触发弹窗 |
| `src/App.tsx` | 集成 OfflineReportModal |

### P2-2：sectStore 拆分为 Slices

#### 拆分方案

```
src/stores/sectStore/
  index.ts           — 合并所有 slice，导出统一 useSectStore
  types.ts            — SectState + SectActions 联合类型
  initial.ts          — createInitialState()
  characterSlice.ts   — 角色管理 actions
  buildingSlice.ts    — 建筑 actions
  resourceSlice.ts    — 资源 actions
  itemSlice.ts        — 物品 actions
  techniqueSlice.ts   — 功法 actions
  petSlice.ts         — 宠物 actions
  tickSlice.ts        — tickAll 核心循环
  shopSlice.ts        — 市场 actions
```

#### 原则

- 外部 `useSectStore` API 完全不变
- 每个 slice 独立可测试
- slice 之间通过 `get()` 和 `set()` 访问完整 state
- 使用 Zustand 的 `StateCreator` 类型

### P2-3：代码分割与性能优化

#### 路由懒加载

所有页面组件改为 `React.lazy()` 动态导入，配合 `<Suspense>` 加载态。

#### 自动保存优化

- 当前：每次 tick 用 `JSON.stringify(state.sect)` 做脏检查
- 改进：维护 `dirtyFlags: Set<string>` 标记哪些 slice 被修改
- 每个 slice action 执行后设置对应的 dirty flag
- 自动保存时只序列化脏的 slice

#### 受影响文件

| 文件 | 变更 |
|------|------|
| `src/App.tsx` | 路由懒加载 |
| `src/systems/save/startAutoSave.ts` | 脏检查机制改进 |

### P2-4：弟子修炼路径

#### 路径定义

| 路径 ID | 名称 | 核心加成 | 获取概率 |
|---------|------|---------|---------|
| `sword` | 剑修 | 攻击力 +20%，速度 +10% | common 品质 20% |
| `body` | 体修 | HP +25%，防御 +15% | common 品质 20% |
| `alchemy` | 丹修 | 灵草产出 +30%，炼丹成功率 +10% | spirit 品质以上 30% |
| `beast` | 驭兽 | 宠物战斗力 +25%，宠物捕获率 +15% | spirit 品质以上 30% |
| `formation` | 阵修 | 全队防御 +8%，速度 +5%（队长效果） | immortal 品质以上 40% |
| `void` | 虚空 | 暴击 +15%，暴击伤害 +30% | divine 品质以上 50% |

#### 对游戏的影响

- 修炼路径决定角色的**技能池倾向**：剑修更容易获得攻击型技能
- 修炼路径影响**突破时的属性成长**：剑修突破时攻击力额外 +5%
- 修炼路径影响**建筑分配加成**：丹修分配到炼丹炉额外 +20% 效率

#### 类型新增

```typescript
// src/types/character.ts
type CultivationPath = 'none' | 'sword' | 'body' | 'alchemy' | 'beast' | 'formation' | 'void'

// Character 新增字段
interface Character {
  // ...existing
  cultivationPath: CultivationPath
}
```

#### 数据迁移

现有存档角色 `cultivationPath` 默认为 `'none'`。SaveSystem 加载旧存档时自动补充。

#### 新增文件

| 文件 | 用途 |
|------|------|
| `src/data/cultivationPaths.ts` | 路径定义和效果表 |
| `src/systems/character/CultivationPathSystem.ts` | 路径效果计算 |

#### 受影响文件

| 文件 | 变更 |
|------|------|
| `src/types/character.ts` | 新增 CultivationPath 类型 |
| `src/systems/character/CharacterEngine.ts` | 招募时随机路径 |
| `src/systems/combat/CombatEngine.ts` | 路径加成在战斗中生效 |
| `src/pages/CharactersPage.tsx` | 显示修炼路径 |
| `src/components/common/CharacterCard.tsx` | 卡片显示路径标签 |

---

## P3：宗门路线 + 赛季传承 + 统计面板

### P3-1：宗门路线系统

#### 解锁条件

宗门等级 >= 5 且拥有 >= 10 名弟子。

#### 三条路线

**丹道宗门（pill）：** 灵草产出 +50%，炼丹成功率 +15%，突破消耗灵石 -20%

节点：
1. 灵田改良（灵草产出+20%）—— 消耗 50,000 灵石 + 5,000 灵草
2. 丹道真传（炼丹暴击率+10%）—— 消耗 100,000 灵石 + 10,000 灵草
3. 百草纲目（解锁丹方+3）—— 消耗 200,000 灵石 + 20,000 灵草
4. 炼丹大师（双倍产出概率15%）—— 消耗 500,000 灵石 + 50,000 灵草
5. 太上丹经（突破消耗-20%）—— 消耗 1,000,000 灵石 + 100,000 灵草

**剑道宗门（sword）：** 战斗伤害 +20%，暴击率 +10%，秘境通关速度 +25%

节点：
1. 剑气纵横（攻击+10%）—— 消耗 50,000 灵石 + 5,000 矿石
2. 剑意凝形（暴击+5%）—— 消耗 100,000 灵石 + 10,000 矿石
3. 万剑归宗（群体伤害+15%）—— 消耗 200,000 灵石 + 20,000 矿石
4. 剑心通明（速度+15%）—— 消耗 500,000 灵石 + 50,000 矿石
5. 剑道极致（Boss伤害+30%）—— 消耗 1,000,000 灵石 + 100,000 矿石

**御兽宗门（beast）：** 宠物属性 +40%，宠物捕获率 +25%，宠物可参战

节点：
1. 灵兽感应（捕获率+10%）—— 消耗 80,000 灵石
2. 御兽基础（宠物属性+15%）—— 消耗 150,000 灵石
3. 万兽共鸣（宠物数量上限+3）—— 消耗 300,000 灵石
4. 灵兽进化（解锁宠物进化）—— 消耗 600,000 灵石
5. 百兽之王（宠物可参战）—— 消耗 1,200,000 灵石

#### 路线规则

- 每条路线 5 个节点，需按顺序解锁
- 一次只能选一条路线
- 切换路线需重置所有节点（消耗当前路线总投入 50% 的灵石）
- 飞升重置时路线清空

#### 类型新增

```typescript
// src/types/sect.ts
type SectPath = 'none' | 'pill' | 'sword' | 'beast'

interface SectPathNode {
  id: string
  name: string
  description: string
  cost: { spiritStone: number; herb?: number; ore?: number }
  effect: PathEffect
  unlocked: boolean
}

// Sect 新增字段
interface Sect {
  // ...existing
  sectPath: SectPath
  pathNodes: SectPathNode[]
  pathUnlockedAt: number | null
}
```

#### 新增文件

| 文件 | 用途 |
|------|------|
| `src/data/sectPaths.ts` | 路线和节点定义 |
| `src/systems/sect/SectPathSystem.ts` | 路线效果计算、节点解锁 |
| `src/components/sect/SectPathPanel.tsx` | 路线选择和管理 UI |
| `src/styles/components/SectPathPanel.module.css` | 样式 |

### P3-2：赛季传承系统

#### 飞升条件

- 至少 1 名弟子达到飞升境界（realm >= 5）
- 宗门等级 >= 10
- 所有建筑等级 >= 5

#### 飞升效果

- 所有弟子、资源、建筑重置为初始状态
- 秘境进度重置
- 宗门路线重置

#### 传承奖励

| 传承等级 | 条件 | 永久加成 |
|---------|------|---------|
| 1 次飞升 | 累计 1 次 | 全体弟子基础属性 +5%，起始灵石 x2（1000） |
| 2 次飞升 | 累计 2 次 | 全体弟子基础属性 +10%，招募品质保底 spirit |
| 3 次飞升 | 累计 3 次 | 全体弟子基础属性 +15%，解锁隐藏功法 1 部 |
| 5 次飞升 | 累计 5 次 | 全体弟子基础属性 +25%，解锁隐藏秘境 1 个 |
| 10 次飞升 | 累计 10 次 | 全体弟子基础属性 +50%，解锁混沌品质弟子概率 |

#### 类型新增

```typescript
// src/types/sect.ts
interface LegacyBonus {
  ascensionCount: number
  statBonus: number
  unlockedTechniques: string[]
  unlockedDungeons: string[]
}

// Sect 新增字段（飞升重置时保留）
interface Sect {
  // ...existing
  legacy: LegacyBonus
}
```

#### 新增文件

| 文件 | 用途 |
|------|------|
| `src/data/legacy.ts` | 传承奖励定义 |
| `src/systems/sect/LegacySystem.ts` | 飞升检查、传承奖励、重置逻辑 |
| `src/components/sect/LegacyPanel.tsx` | 飞升界面 |
| `src/styles/components/LegacyPanel.module.css` | 样式 |

### P3-3：宗门统计面板

#### 位置

SectPage 中增加"宗门统计"区块或 Tab。

#### 统计项目

| 类别 | 指标 |
|------|------|
| 资源 | 总灵石收入、总灵石支出、灵石/秒（当前） |
| 战斗 | 总战斗次数、胜率、总击杀数、最高通关层数 |
| 弟子 | 总招募数、当前弟子数、最高境界弟子、突破成功/失败次数 |
| 建筑 | 总升级次数、最高建筑等级 |
| 秘境 | 总运行次数、完成次数、失败次数、平均通关层数 |
| 宠物 | 总捕获数、当前宠物数、最高品质宠物 |
| 时间 | 游戏总时长、最长离线时长 |

#### 类型新增

```typescript
// src/types/sect.ts
interface SectStats {
  totalSpiritStoneEarned: number
  totalSpiritStoneSpent: number
  totalBattles: number
  totalVictories: number
  totalKills: number
  maxFloorCleared: number
  totalRecruits: number
  totalBreakthroughAttempts: number
  totalBreakthroughSuccesses: number
  totalBuildingUpgrades: number
  totalAdventureRuns: number
  totalAdventureCompletions: number
  totalAdventureFailures: number
  totalPetCaptures: number
  totalPlayTime: number
  longestOfflineSeconds: number
}
```

#### 数据收集

在 sectStore actions、adventureStore actions、tickAll 中埋点，递增对应计数器。

#### 新增文件

| 文件 | 用途 |
|------|------|
| `src/components/sect/StatsPanel.tsx` | 统计面板 UI |
| `src/styles/components/StatsPanel.module.css` | 样式 |

---

## 实施顺序

```
P0（状态简化 + 工具链）
  → P1（战斗深化 + 修行要务面板）
    → P2（离线收益 + Store 拆分 + 代码分割 + 修炼路径）
      → P3（宗门路线 + 赛季传承 + 统计面板）
```

每个阶段完成后运行完整测试套件确保无回归。

## 不在范围内

- 祝福/遗物系统（可后续单独设计）
- IDB 按实体拆分存储（Spec 6 暂缓）
- 新增独立 Store（采用方案 A + slice 拆分）
- 浏览器推送通知
- CJK 字体子集化
- CI/CD 配置
