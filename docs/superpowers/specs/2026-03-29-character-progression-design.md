# 角色成长深度 — 设计文档

> **日期：** 2026-03-29
> **状态：** 待审核
> **优先级：** P2
> **前置依赖：** P0（掉落表、天劫）、P1（特长系统、建筑指派）已完成

## 概述

### 背景

当前角色的成长路径单一——所有角色以相同方式修炼、突破、装备，唯一的区分来自天赋的数值差异和品质的属性基础。以下系统已有数据结构但从未被集成到玩法循环中：

- **SpecialtySystem**：`rollSpecialties()` 已实现但 `generateCharacter()` 从未调用
- **技能装备**：`equippedSkills` 字段始终为空数组，无技能获取流程
- **宠物战斗**：`getPetCombatUnit()` 已实现但从未在探险队伍中使用
- **命运标签**：仅影响突破失败率（`failureRateModifier`），无其他玩法效果
- **精炼系统**：`refinementStats` 字段存在但从未填充数据
- **套装加成**：`setId` 始终为 `null`
- **称号晋升**：所有角色始终为 `disciple`，无晋升机制
- **功法**：二值学习/未学习，无进度
- **天赋**：全部为纯数值加成，无机制变化

### 目标

1. 让每个角色产生有意义的差异化构建（build diversity）
2. 接通已有但未集成的系统（技能、宠物、精炼、专长）
3. 扩展数值型系统为机制型系统（天赋、命运标签、功法）
4. 保持水墨仙侠主题——修炼路线在名称和机制上都贴合仙侠世界观

### 设计原则

- **不可逆选择**：修炼路线选择不可更改，创造有意义的决策
- **水到渠成**：新系统复用现有数据结构，最小化存档迁移
- **层次递进**：每个子系统可独立实现和测试，但有明确的依赖顺序

---

## 1. 修炼路线系统 (Cultivation Paths)

### 1.1 概念

角色在筑基期（realm 1）突破时选择一条修炼路线，不可更改。路线决定后续的属性成长方向、可解锁的专属技能、以及与元素/功法的协同效果。

### 1.2 路线定义

| 路线 ID | 名称 | 核心属性 | 元素亲和 | 定位 |
|---------|------|----------|----------|------|
| `sword` | 剑道 | crit, critDmg, atk | lightning | 单体爆发，暴击流 |
| `alchemy` | 丹道 | maxSpiritPower, healing | healing | 辅助治疗，增益流 |
| `body` | 体修 | hp, def | neutral | 坦克，反伤流 |
| `spell` | 法修 | atk(AoE), spd | fire/ice | 群体法术，元素精通 |
| `beast` | 御兽 | 宠物协同 | neutral | 宠物强化，双线作战 |

### 1.3 选择时机

- **触发条件**：角色从炼气期（realm 0）突破到筑基期（realm 1）时
- **表现**：突破成功后弹出修炼路线选择界面（类似天赋选择），显示 5 条路线的描述和属性倾向
- **不可逆**：一旦选择不可更改
- **跳过**：如果不选择（玩家离线突破），默认分配 `sword`

### 1.4 路线属性成长修正

路线在每次突破时提供额外的属性修正百分比，叠加在基础成长之上：

| 路线 | hp | atk | def | spd | crit | critDmg | spiritPower |
|------|-----|-----|-----|-----|------|---------|-------------|
| sword | ×1.0 | ×1.3 | ×0.9 | ×1.1 | ×1.5 | ×1.5 | ×1.0 |
| alchemy | ×1.1 | ×0.8 | ×1.0 | ×1.0 | ×0.8 | ×0.8 | ×1.8 |
| body | ×1.6 | ×0.9 | ×1.5 | ×0.8 | ×0.7 | ×0.8 | ×1.0 |
| spell | ×0.9 | ×1.4 | ×0.8 | ×1.3 | ×1.0 | ×1.2 | ×1.3 |
| beast | ×1.1 | ×1.0 | ×1.0 | ×1.0 | ×1.0 | ×1.0 | ×1.2 |

**算法**：在 `calcStatGrowth()` 中，计算完基础成长后，根据角色的 `cultivationPath` 应用对应修正：

```
finalGrowth = baseGrowth * pathMultiplier[stat]
```

### 1.5 路线专属技能

每条路线在特定境界解锁一个专属 active skill，自动加入角色技能池：

| 路线 | 解锁境界 | 技能 | 类别 | 元素 | 倍率 | 灵力消耗 | CD | 描述 |
|------|----------|------|------|------|------|----------|-----|------|
| sword | realm 2 | 剑意凝锋 | attack | lightning | 2.5 | 20 | 2 | 聚剑意为锋，暴击时伤害额外 +50% |
| sword | realm 4 | 天剑·无极 | ultimate | lightning | 5.0 | 50 | 6 | 天地一剑，无视目标 50% 防御 |
| alchemy | realm 2 | 丹心回春 | support | healing | 0 | 25 | 3 | 恢复全体 20% 最大生命 |
| alchemy | realm 4 | 九转金丹 | ultimate | healing | 0 | 45 | 5 | 复活一个已阵亡队友（30% HP） |
| body | realm 2 | 金刚不坏 | defense | neutral | 0 | 15 | 3 | 3 回合内受到伤害减少 50% |
| body | realm 4 | 反震·不动明王 | ultimate | neutral | 3.0 | 40 | 5 | 将所受伤害 100% 反弹给攻击者 |
| spell | realm 2 | 三昧真火 | attack | fire | 2.0 | 20 | 2 | 攻击所有敌人（AoE） |
| spell | realm 4 | 天地法相 | ultimate | ice | 4.5 | 50 | 6 | 攻击所有敌人并冻结 1 回合 |
| beast | realm 2 | 灵兽共鸣 | support | neutral | 0 | 15 | 2 | 宠物本回合伤害 +100% |
| beast | realm 4 | 万兽朝宗 | ultimate | neutral | 3.5 | 40 | 5 | 所有宠物同时攻击 |

**注意**：AoE 技能和防御/反伤机制需要对 `CombatEngine.simulateCombat()` 进行扩展——当前战斗引擎只支持单体攻击。这是本设计最复杂的工程点，建议分阶段实现：Phase 1 只实现数值型技能，Phase 2 实现 AoE/反伤等机制型技能。

### 1.6 数据模型变更

Character 类型新增字段：

```typescript
type CultivationPath = 'sword' | 'alchemy' | 'body' | 'spell' | 'beast'

interface Character {
  // ...现有字段
  cultivationPath: CultivationPath | null  // null 表示尚未选择（realm 0）
}
```

### 1.7 存档迁移

- 旧角色 `cultivationPath` 不存在 → 按 realm 判断：
  - realm 0 → `null`（下次突破时选择）
  - realm >= 1 → 默认 `'sword'`

---

## 2. 角色元素亲和 (Element Affinity)

### 2.1 概念

每个角色根据修炼路线拥有一个元素亲和，影响技能效果和功法协同。

### 2.2 亲和映射

| 修炼路线 | 主亲和 | 副亲和 |
|----------|--------|--------|
| sword | lightning | — |
| alchemy | healing | neutral |
| body | neutral | — |
| spell | fire | ice |
| beast | neutral | — |

### 2.3 亲和效果

1. **技能加成**：使用与主亲和相同元素的技能时，伤害/治疗效果 +15%
2. **功法协同**：学习与亲和匹配元素的功法时，参悟速度 +20%（详见第 10 节）
3. **克制计算**：spell 路线的 fire/ice 副亲和使其面对克制关系时，劣势倍率从 0.75 提升到 0.85

### 2.4 数据模型

不新增字段——元素亲和通过 `cultivationPath` 查表计算：

```typescript
const PATH_ELEMENT: Record<CultivationPath, { primary: Element; secondary?: Element }> = {
  sword: { primary: 'lightning' },
  alchemy: { primary: 'healing', secondary: 'neutral' },
  body: { primary: 'neutral' },
  spell: { primary: 'fire', secondary: 'ice' },
  beast: { primary: 'neutral' },
}
```

### 2.5 集成点

- `CombatEngine` 的 `getElementMultiplier()` 调用时，如果攻击者是 ally 且拥有亲和，额外乘算
- `TechniqueSystem` 的参悟速度计算中，检查功法元素与角色亲和是否匹配

---

## 3. 技能获取与装备 (Skill Acquisition & Equipment)

### 3.1 当前状态

- `ACTIVE_SKILLS` 定义了 8 个技能，但 `generateCharacter()` 中 `equippedSkills = []`
- 无技能学习途径
- `CombatEngine` 中角色无技能可用时只进行普通攻击

### 3.2 技能获取途径

| 途径 | 触发条件 | 获取内容 |
|------|----------|----------|
| 初始技能 | 角色生成 | 1 个基础攻击技能（按元素亲和） |
| 功法里程碑 | 功法参悟度达到 50%/100% | 功法对应的主动技能 |
| 修炼路线解锁 | 达到特定境界 | 路线专属技能（见 1.5） |
| 探险事件 | 古洞事件/商店 | 随机技能卷轴 |

### 3.3 初始技能分配

角色生成时根据元素亲和分配一个初始技能：

| 元素亲和 | 初始技能 |
|----------|----------|
| lightning | 剑气纵横 (sword_qi) |
| fire | 烈焰掌 (fire_palm) |
| ice | 寒冰剑诀 (ice_blade) |
| healing | 回春术 (heal_art) |
| neutral | 剑气纵横 (sword_qi) |

**注意**：未选路线（realm 0）的角色默认获得 `sword_qi`。选择路线后如果初始技能不匹配亲和，**不替换**——玩家可以手动更换。

### 3.4 装备槽位

角色拥有 4 个技能槽位：

| 槽位 | 类型 | 限制 |
|------|------|------|
| slot 0 | active | 任意 attack/defense/support |
| slot 1 | active | 任意 attack/defense/support |
| slot 2 | active | 任意 attack/defense/support |
| slot 3 | ultimate | 仅 ultimate 类别 |

- `equippedSkills` 数组从 `[]` 改为 `[null, null, null, null]`
- 角色可学习超过 4 个技能，但只能装备 4 个
- 路线专属技能自动装备（如果槽位有空）

### 3.5 技能装备 UI

- 弟子详情页新增"技能"面板
- 显示已学习技能列表和 4 个装备槽
- 拖拽或点击装备/卸下技能
- 路线专属技能标记特殊图标，不可卸下（但可替换位置）

### 3.6 数据模型变更

```typescript
interface Character {
  // ...现有字段
  equippedSkills: (string | null)[]   // 从 [] 改为初始化 [null, null, null, null]
  learnedSkills: string[]             // 新增：已学习但未装备的技能 ID
}
```

### 3.7 存档迁移

- 旧角色 `equippedSkills = []` → 迁移为 `[null, null, null, null]`
- 旧角色无 `learnedSkills` → 默认 `[]`
- 旧角色如果 realm >= 1，按亲和分配初始技能到 slot 0

---

## 4. 宠物战斗集成 (Pet Combat Integration)

### 4.1 当前状态

- `PetSystem.getPetCombatUnit()` 已完整实现，能将 Pet 转换为 CombatUnit
- 但从未被探险派遣逻辑调用
- 角色的 `petIds` 数组存在但无战斗用途

### 4.2 设计

角色拥有的宠物自动加入探险战斗队伍：

1. 从角色的 `petIds` 中取品质最高的一只宠物
2. 调用 `getPetCombatUnit()` 转换为 CombatUnit
3. 将该 CombatUnit 添加到 ally 队伍中
4. 宠物使用 `innateSkill` 参与战斗

### 4.3 御兽路线加成

选择 `beast`（御兽）修炼路线的角色，其宠物获得额外加成：

| 效果 | 数值 |
|------|------|
| 宠物 HP | +30% |
| 宠物 ATK | +30% |
| 宠物 DEF | +20% |
| 宠物 SPD | +20% |
| 宠物 crit | +10% |

**算法**：在 `getPetCombatUnit()` 后，如果宠物主人是 `beast` 路线，对返回的 CombatUnit 属性乘以加成系数。

### 4.4 宠物技能装备

当前宠物的 `equippedSkills = [null, null]`。扩展宠物系统允许装备额外技能：

- 宠物通过喂养达到特定等级时解锁技能槽
- common 品质：无额外技能槽
- spirit 品质：Lv10 解锁 slot 0
- immortal 品质：Lv10 解锁 slot 0, Lv30 解锁 slot 1
- divine 品质：Lv1 解锁 slot 0, Lv20 解锁 slot 1

宠物可学习的技能从 `PET_INNATE_SKILLS` 池中选取（不含自身已有的）。

### 4.5 集成点

- `sectStore.ts` 中组建探险队伍时（`startDungeonRun` 附近的 ally 组装逻辑），遍历 `teamCharacterIds`，为每个角色查找其宠物，调用 `getPetCombatUnit()` 加入 allies
- `CombatEngine` 无需修改——宠物作为独立 CombatUnit 参战

---

## 5. 命运标签效果扩展 (Fate Tag Effects)

### 5.1 当前状态

命运标签仅通过 `failureRateModifier` 影响突破失败率。4 个标签的效果几乎是对称的（±0.03~0.05）。

### 5.2 扩展效果

为每个标签增加更多维度的效果：

| 标签 ID | 名称 | 现有效果 | 新增效果 |
|---------|------|----------|----------|
| `tribulation-scar` | 天劫伤痕 | 突破失败率 +5% | crit +5%, 突破难度 +10% |
| `heart-devil` | 心魔种子 | 突破失败率 +5% | 探险事件攻击性 +20%, 休息恢复 -15% |
| `sudden-insight` | 顿悟 | 突破失败率 -3% | 功法参悟速度 +30% |
| `stable-dao-heart` | 道心稳固 | 突破失败率 -3% | 突破失败时不降低境界（仅限大境界突破失败不跌落） |

### 5.3 数据模型变更

`FateTagDef` 接口新增字段：

```typescript
interface FateTagEffect {
  critModifier?: number              // crit 加成
  breakthroughDifficulty?: number    // 额外突破难度
  eventAggression?: number           // 探险事件攻击性修正
  restRecoveryModifier?: number      // 休息恢复修正（1.0 = 正常）
  comprehensionSpeed?: number        // 功法参悟速度修正（1.0 = 正常）
  preventRealmDrop?: boolean         // 突破失败时不跌落境界
}

interface FateTagDef {
  id: FateTagId
  name: string
  description: string
  category: 'positive' | 'negative'
  failureRateModifier: number
  effects: FateTagEffect              // 新增
}
```

### 5.4 集成点

- `calcCharacterTotalStats()` 中汇总命运标签的 crit 修正
- `resolveTribulation()` 中检查 `preventRealmDrop` 效果
- `TechniqueSystem` 参悟计算中检查 `comprehensionSpeed`
- `EventSystem` 中检查 `eventAggression` 影响事件难度

---

## 6. 物品精炼系统 (Equipment Refinement)

### 6.1 当前状态

- `Equipment.refinementStats` 类型为 `Partial<ItemStats>[]`（空数组）
- `EquipmentEngine.refineEquipment()` 已实现但未被调用
- 精炼逻辑随机选一个属性加固定值

### 6.2 设计

精炼是将矿石 + 灵石转化为装备额外属性的过程。

### 6.3 精炼规则

| 装备品质 | 最大精炼次数 | 每次属性范围 | 灵石花费 | 矿石花费 |
|----------|-------------|-------------|----------|----------|
| common | 2 | 30% 基础值 | 100 | 3 |
| spirit | 3 | 35% 基础值 | 300 | 5 |
| immortal | 4 | 40% 基础值 | 800 | 10 |
| divine | 5 | 45% 基础值 | 2000 | 20 |
| chaos | 6 | 50% 基础值 | 5000 | 30 |

### 6.4 精炼流程

1. 玩家在装备详情页点击"精炼"按钮
2. 系统检查装备精炼次数是否达到上限（`refinementStats.length < maxRefinements`）
3. 扣除灵石和矿石
4. 随机选择一个属性，生成随数值（基于 `baseValue * qualityRange * (0.8~1.2) variance`）
5. 将新属性追加到 `refinementStats` 数组

### 6.5 重铸（重新精炼）

已精炼的装备可以"重铸"——清除所有 `refinementStats` 重新精炼：

- 重铸花费 = 首次精炼花费 × 2
- 重铸后 `refinementStats` 清空，可重新精炼到上限

### 6.6 集成点

- `EquipmentEngine` 中已有 `refineEquipment()` 和 `getEffectiveStats()`（已处理 refinementStats），只需在 UI 层接入调用
- 装备详情页新增精炼按钮和精炼属性显示

---

## 7. 套装加成 (Set Bonuses)

### 7.1 当前状态

- `Equipment.setId` 字段始终为 `null`
- 无套装定义数据

### 7.2 套装定义

定义 4 个套装，每个套装对应一种元素/主题：

| 套装 ID | 名称 | 包含装备 | 元素 | 2 件效果 | 4 件效果 |
|---------|------|----------|------|----------|----------|
| `thunder_set` | 雷鸣套装 | weapon, accessory1, talisman, head | lightning | atk +15% | 雷属性技能伤害 +25% |
| `frost_set` | 玄冰套装 | armor, boots, bracer, belt | ice | def +20% | 受到攻击时 20% 概率冻结攻击者 1 回合 |
| `flame_set` | 焚天套装 | weapon, armor, accessory2, talisman | fire | critDmg +30% | 击杀敌人时恢复 15% 灵力 |
| `jade_set` | 玉清套装 | head, boots, bracer, belt | neutral | hp +20% | 全队受到的治疗效果 +25% |

### 7.3 套装检测算法

```
function calcSetBonuses(equippedGear, getEquipmentById):
  setCounts = {}  // setId → count
  for each gearId in equippedGear:
    equipment = getEquipmentById(gearId)
    if equipment.setId is not null:
      setCounts[equipment.setId] += 1

  activeBonuses = []
  for each setId, count in setCounts:
    setDef = SET_DEFINITIONS[setId]
    if count >= 2: activeBonuses.push(setDef.twoPieceBonus)
    if count >= 4: activeBonuses.push(setDef.fourPieceBonus)

  return activeBonuses
```

### 7.4 套装掉落

- 套装部件在对应主题秘境中掉落
- `thunder_set`：落云洞（现有秘境）
- `frost_set`：冰晶秘境（新秘境，realm 3 解锁）
- `flame_set`：炎魔窟（新秘境，realm 3 解锁）
- `jade_set`：古修遗址（新秘境，realm 2 解锁）

### 7.5 数据模型

```typescript
interface SetBonus {
  stat?: keyof BaseStats
  type: 'statBoost' | 'elementBoost' | 'healBoost' | 'freezeChance'
  value: number
  element?: Element
}

interface SetDef {
  id: string
  name: string
  slots: EquipSlot[]
  element: Element
  twoPieceBonus: SetBonus
  fourPieceBonus: SetBonus
}
```

### 7.6 集成点

- `ItemGenerator` 生成装备时，如果来源是套装主题秘境，有概率（15%）将 `setId` 设为对应套装
- `calcCharacterTotalStats()` 中调用套装检测并叠加套装加成
- `CombatEngine` 战斗中检查冻结/灵力恢复等机制型套装效果

---

## 8. 角色称号晋升 (Title Promotion)

### 8.1 当前状态

- `CharacterTitle` 定义了 4 级称号：`disciple / seniorDisciple / master / elder`
- `generateCharacter()` 硬编码 `title: 'disciple'`
- 无晋升逻辑

### 8.2 晋升条件

| 称号 | 条件 | 被动效果 |
|------|------|----------|
| disciple | 初始 | 无 |
| seniorDisciple | realm >= 2（金丹期） | 全属性 +5% |
| master | realm >= 3（元婴期） | 全属性 +5%，带队时队友全属性 +3% |
| elder | realm >= 4（化神期） | 全属性 +10%，带队时队友全属性 +5%，突破成功率 +5% |

### 8.3 晋升机制

- 晋升**自动发生**：在 `tickAll` 中检测角色境界满足条件时，自动晋升称号
- 晋升时在事件日志中记录
- 晋升不可降级（即使渡劫失败跌落境界）

### 8.4 算法

```
function checkTitlePromotion(character):
  if character.title === 'disciple' and character.realm >= 2:
    character.title = 'seniorDisciple'
  if character.title === 'seniorDisciple' and character.realm >= 3:
    character.title = 'master'
  if character.title === 'master' and character.realm >= 4:
    character.title = 'elder'
```

### 8.5 集成点

- `sectStore.ts` 的 `tickAll` 中，在突破成功后调用 `checkTitlePromotion()`
- `calcCharacterTotalStats()` 中叠加称号属性加成
- 探险队伍组建时，检查队伍中是否有 `master` 或 `elder`，应用队友加成

---

## 9. 天赋扩展 (Talent Expansion)

### 9.1 当前状态

- 12 个天赋，全部为纯数值加成（`TalentEffect { stat, value }`）
- 无机制变化型天赋

### 9.2 新增天赋

新增 10 个天赋，包含机制变化型天赋。新增 `TalentEffect.type = 'mechanical'` 类型：

| ID | 名称 | 稀有度 | 效果类型 | 描述 | 效果 |
|----|------|--------|----------|------|------|
| `daoxin_stable` | 道心通明 | epic | mechanical | 突破失败不重置修为 | 失败时保留 50% 修为 |
| `beast_whisper` | 兽语 | rare | mechanical | 宠物属性大幅提升 | 宠物全属性 +30% |
| `dual_element` | 双灵根 | rare | mechanical | 获得副元素亲和 | 可选择第二个元素亲和 |
| `critical_eye` | 破绽之眼 | common | stat | 暴击相关 | crit +5%, critDmg +10% |
| `iron_skin` | 铁皮 | common | stat | 防御相关 | def +4, 受到暴击伤害 -20% |
| `fortune_star` | 福星 | rare | mechanical | 提升稀有掉落概率 | 灵品以上掉落率 +15% |
| `quick_learner` | 过目不忘 | rare | mechanical | 功法学习加速 | 参悟度获取速度 +40% |
| `poverty_daodi` | 贫道 | common | stat | 灵石消耗减少 | 闭关/突破灵石消耗 -20% |
| `thunder_affinity` | 雷灵体 | epic | mechanical | 雷属性特化 | 雷属性技能伤害 +30%，雷抗 +25% |
| `phoenix_blood` | 凤凰血脉 | epic | mechanical | 濒死时触发 | 战斗中 HP 降至 0 时，1 次/战斗恢复 30% HP |

### 9.3 数据模型变更

```typescript
// 现有 TalentEffect 扩展
interface TalentEffect {
  stat: TalentStat
  value: number
}

// 新增 mechanical 类型天赋定义
interface MechanicalTalentEffect {
  type: 'mechanical'
  mechanicId: string               // 机制标识符
  params: Record<string, number>    // 机制参数
}

// Talent 接口扩展
interface Talent {
  id: TalentId
  name: string
  description: string
  effect: TalentEffect[] | MechanicalTalentEffect[]  // 支持两种类型
  rarity: TalentRarity
}
```

### 9.4 机制天赋的集成

机制天赋通过统一的查询接口消费：

```
function hasMechanic(character, mechanicId): boolean
function getMechanicParam(character, mechanicId, paramName): number | undefined
```

各系统在关键判定点查询：
- `CultivationEngine.breakthrough()`：检查 `daoxin_stable`
- `PetSystem.getPetCombatUnit()`：检查 `beast_whisper`
- `TechniqueSystem`：检查 `quick_learner`
- `CombatEngine`：检查 `phoenix_blood`、`thunder_affinity`
- `sectStore.tickAll()`：检查 `poverty_daodi`

---

## 10. 功法深化 (Technique Progression)

### 10.1 当前状态

- 12 个功法，学习后即刻获得全部 bonus
- `tryComprehendOnBreakthrough()` 以概率触发，触发即学会完整功法
- 无参悟度概念

### 10.2 参悟度系统

将功法从二值（已学/未学）改为 0-100% 参悟度。

#### 参悟度获取

| 途径 | 参悟度增量 |
|------|-----------|
| 突破时参悟触发 | +20% (小境界) / +35% (大境界) |
| 藏经阁指派弟子（comprehension 特长） | +2%/tick × 特长等级倍率 |
| 突发顿悟（sudden-insight 标签） | 增量 ×1.3 |
| quick_learner 天赋 | 增量 ×1.4 |

#### 参悟度效果

参悟度影响功法 bonus 的生效比例：

```
effectiveBonus = technique.bonuses.map(b => ({
  ...b,
  value: Math.floor(b.value * (comprehension / 100))
}))
```

参悟度达到 50% 和 100% 时各解锁一个主动技能（见第 3 节）。

### 10.3 功法元素协同

当功法元素与角色亲和匹配时：
- 参悟速度 +20%
- 参悟度达到 100% 时，bonus 额外 +15%

### 10.4 数据模型变更

```typescript
interface LearnedTechnique {
  techniqueId: string
  comprehension: number              // 0-100
}

interface Character {
  // ...现有字段
  learnedTechniques: string[]                          // 保持兼容：ID 列表
  techniqueComprehension: Record<string, number>       // 新增：techniqueId → 参悟度
}
```

### 10.5 存档迁移

- 旧角色无 `techniqueComprehension` → 已学会的功法默认参悟度 100%
- `learnedTechniques` 数组保持不变以兼容

### 10.6 集成点

- `TechniqueSystem.tryComprehendOnBreakthrough()`：改为增加参悟度而非直接学会
- `calcCharacterTotalStats()`：按参悟度比例计算功法 bonus
- `ProductionSystem` 或 `tickAll`：藏经阁弟子贡献参悟度

---

## 11. 专长系统集成 (Specialty Integration)

### 11.1 当前状态

- `SpecialtySystem.rollSpecialties()` 已实现，按品质生成特长
- `generateCharacter()` 中 `specialties: []`，从未调用 `rollSpecialties`

### 11.2 集成方案

在 `generateCharacter()` 中添加一行调用：

```
const specialties = rollSpecialties(quality)
```

将结果写入 `Character.specialties`。

### 11.3 影响

集成后所有新生成的角色将自动拥有特长（根据品质概率），特长指派到建筑后激活效果。这是最小的改动——`rollSpecialties` 的逻辑、`getBuildingBonus` 的计算、`BreakthroughPanel` 的 UI 显示均已实现。

---

## 12. 数据模型变更总览

### 12.1 Character 类型新增字段

| 字段 | 类型 | 默认值 | 来源章节 |
|------|------|--------|----------|
| `cultivationPath` | `CultivationPath \| null` | `null` | 1 |
| `learnedSkills` | `string[]` | `[]` | 3 |
| `techniqueComprehension` | `Record<string, number>` | `{}` | 10 |

### 12.2 Character 字段行为变更

| 字段 | 变更 | 来源章节 |
|------|------|----------|
| `equippedSkills` | 初始化从 `[]` 改为 `[null, null, null, null]` | 3 |
| `specialties` | 不再硬编码 `[]`，改为调用 `rollSpecialties(quality)` | 11 |
| `title` | 突破时自动晋升 | 8 |

### 12.3 新增类型

| 类型 | 文件 | 用途 |
|------|------|------|
| `CultivationPath` | `types/character.ts` | 修炼路线 |
| `SetDef` | `data/sets.ts`（新建） | 套装定义 |
| `SetBonus` | `data/sets.ts`（新建） | 套装加成效果 |
| `MechanicalTalentEffect` | `types/talent.ts` | 机制型天赋效果 |
| `FateTagEffect` | `data/fateTags.ts` | 命运标签扩展效果 |

### 12.4 新增数据文件

| 文件 | 内容 |
|------|------|
| `src/data/cultivationPaths.ts` | 路线定义、属性修正、专属技能表 |
| `src/data/sets.ts` | 套装定义 |

---

## 13. 集成点总览

### 13.1 需修改的现有文件

| 文件 | 变更内容 | 章节 |
|------|----------|------|
| `src/types/character.ts` | 新增 `CultivationPath`、`cultivationPath`、`learnedSkills`、`techniqueComprehension` 字段 | 1, 3, 10 |
| `src/types/talent.ts` | 新增 `MechanicalTalentEffect` | 9 |
| `src/data/fateTags.ts` | `FateTagDef` 新增 `effects` 字段，扩展 4 个标签效果 | 5 |
| `src/data/talents.ts` | 新增 10 个天赋 | 9 |
| `src/data/activeSkills.ts` | 新增路线专属技能 | 1 |
| `src/systems/character/CharacterEngine.ts` | `generateCharacter()` 调用 `rollSpecialties()`，初始化技能，新字段默认值 | 3, 11 |
| `src/systems/character/CharacterEngine.ts` | `calcCharacterTotalStats()` 叠加称号加成、命运标签 crit、套装加成 | 5, 7, 8 |
| `src/systems/cultivation/CultivationEngine.ts` | `calcStatGrowth()` 应用路线属性修正 | 1 |
| `src/systems/pet/PetSystem.ts` | 御兽路线加成应用到 `getPetCombatUnit()` | 4 |
| `src/systems/technique/TechniqueSystem.ts` | `tryComprehendOnBreakthrough()` 改为增加参悟度 | 10 |
| `src/systems/equipment/EquipmentEngine.ts` | 精炼上限检查，`getEffectiveStats()` 已支持 | 6 |
| `src/systems/combat/CombatEngine.ts` | 元素亲和加成、机制天赋检查 | 2, 9 |
| `src/systems/item/ItemGenerator.ts` | 套装主题秘域掉落时设置 `setId` | 7 |
| `src/systems/save/SaveSystem.ts` | 存档迁移：新字段默认值 | 全部 |
| `src/stores/sectStore.ts` | 组建探险队时加入宠物、称号晋升检测、路线选择 | 1, 4, 8 |

### 13.2 新建文件

| 文件 | 内容 |
|------|------|
| `src/data/cultivationPaths.ts` | 修炼路线定义、属性修正表、专属技能解锁表 |
| `src/data/sets.ts` | 套装定义和效果 |
| `src/systems/character/CultivationPathSystem.ts` | 路线选择逻辑、路线属性修正计算 |
| `src/systems/equipment/SetBonusSystem.ts` | 套装检测和加成计算 |

---

## 14. 实现顺序

```
Phase 1（基础设施，无新机制）：
  11. 专长系统集成 — 1 行代码改动
  8.  称号晋升 — 自动晋升 + 属性加成

Phase 2（核心差异化）：
  1.  修炼路线 — 类型定义 + 路线选择 + 属性修正
  2.  元素亲和 — 查表计算 + 战斗加成
  3.  技能获取与装备 — 初始技能 + 装备槽

Phase 3（已有系统激活）：
  4.  宠物战斗集成 — 探险队伍加入宠物
  6.  精炼系统 — UI 接入已实现的 refineEquipment()
  10. 功法参悟度 — 参悟进度系统

Phase 4（内容扩展）：
  5.  命运标签效果 — 扩展标签定义
  7.  套装加成 — 套装定义 + 掉落 + 检测
  9.  天赋扩展 — 新增天赋

Phase 5（战斗引擎扩展，可选）：
  AoE 技能支持
  反伤/冻结机制
  濒死触发机制（凤凰血脉）
```

Phase 1-3 不涉及战斗引擎改动，可全部独立实现和测试。Phase 4 的套装和命运标签扩展部分依赖战斗引擎。Phase 5 是可选的高级机制。
