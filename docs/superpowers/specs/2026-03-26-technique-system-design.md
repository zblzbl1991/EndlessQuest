# 功法系统简化设计

日期：2026-03-26

## 概述

将功法系统从"单功法修炼+领悟度"简化为"多功法叠加+学会即满级"。弟子在突破时自动从宗门图鉴领悟功法，所有已学功法的加成直接叠加生效，无需手动切换。

## Section 1：数据模型变更

### Character 类型

| 字段 | 变更 |
|------|------|
| `currentTechnique: string \| null` | **删除** |
| `techniqueComprehension: number` | **删除** |
| `learnedTechniques: string[]` | **保留**，含义改为"已领悟功法列表，全部生效" |

初始创建角色：`learnedTechniques: ['qingxin']`

### Technique 类型

| 字段 | 变更 |
|------|------|
| `growthModifiers: { hp, atk, ... }` | **删除**（百分比乘法） |
| `fixedBonuses: TechniqueBonus[]` | **删除**（分阈值加成） |
| `bonuses: TechniqueBonus[]` | **新增**（统一加成列表，学会即全部激活） |
| `comprehensionDifficulty: number` | **删除**（不再有领悟难度） |
| `requirements.minComprehension` | **保留**（仍作为突破领悟的悟性门槛） |
| `element: Element` | **保留**（战斗元素属性） |

新的 Technique 结构：

```typescript
interface Technique {
  id: string
  name: string
  description: string
  tier: TechniqueTier          // mortal | spirit | immortal | divine | chaos
  element: Element             // neutral | fire | ice | lightning
  bonuses: TechniqueBonus[]    // 学会即全部激活
  requirements: {
    minRealm: number
    minComprehension: number   // 角色悟性属性门槛（突破领悟时检查）
  }
}
```

12 部功法的具体 `bonuses` 数值在实现时重新平衡，品阶越高加成越大。

### Sect 类型

`techniqueCodex: string[]` 保持不变，仍为宗门已发现的功法集合。

### TechniqueBonus 类型

保持不变：`{ type: string, value: number }`，type 可为 `hp`、`atk`、`def`、`spd`、`crit`、`critDmg`、`cultivationRate`。

## Section 2：突破领悟机制

### 触发时机

自动突破成功后，概率触发领悟。

| 突破类型 | 领悟概率 |
|---------|---------|
| 子境界突破 (stage +1) | 15% |
| 大境界突破 (realm +1) | 40% |

### 品阶上限映射

| 弟子境界 | 最高领悟品阶 |
|---------|------------|
| 炼气期 (0) | 凡级 |
| 筑基期 (1) | 灵级 |
| 金丹期 (2) | 仙级 |
| 元婴期 (3) | 神级 |
| 化神期 (4) | 混沌级 |

### 领悟流程

1. 突破成功后，掷随机数判定是否触发领悟
2. 从 `sect.techniqueCodex` 中筛选：
   - 未在角色 `learnedTechniques` 中
   - 品阶 <= 品阶上限
   - 角色悟性 (`cultivationStats.comprehension`) >= `technique.requirements.minComprehension`
3. 可用功法为空时静默跳过
4. 有可用功法：随机选一部，加入角色 `learnedTechniques`
5. 发送 `breakthrough_comprehension` 事件通知

### 藏经阁参悟

保持不变：消耗灵石解锁新功法到图鉴，不直接给角色。

### 探险古修洞府

保持不变：获得功法 → 通过 `unlockCodexAndLearn` 同时解锁图鉴 + 加入角色 `learnedTechniques`。

## Section 3：属性计算

### 战斗属性（数值加法）

所有已学功法的 `bonuses` 全部叠加（纯加法）：

```
totalBonus[type] = Σ(每部已学功法中 type 匹配的 bonus.value)
finalStat = baseStat + totalBonus[type]
```

例如：清心诀 { hp: 30, def: 10 } + 烈焰心法 { hp: 20, atk: 40 }
→ HP = base + 50，DEF = base + 10，ATK = base + 40

### 修炼速度（百分比加法）

所有已学功法中 `cultivationRate` 类型的 bonus 求和：

```
rateMultiplier = 1 + Σ(cultivationRate bonus values)
```

注意：战斗属性是**数值加法**（`base + sum`），修炼速度是**百分比加法**（`1 + sum`）。

### 战斗元素取值

角色可能学会多个不同元素的功法。战斗时的元素属性取**已学功法中品阶最高**的那部。品阶相同时取列表中靠前的。

### 函数签名变更

| 函数 | 当前签名 | 新签名 |
|------|---------|--------|
| `createCharacterCombatUnit` | `(character, technique?)` | `(character, learnedTechniques: string[])` |
| `calcCharacterTotalStats` | `(character, ...)` | `(character, learnedTechniques: string[], ...)` |
| `calcCultivationRate` | `(character, technique?)` | `(character, learnedTechniques: string[])` |

### 改动文件完整列表

| 文件 | 改动内容 |
|------|---------|
| `src/types/character.ts` | 删除 `currentTechnique`、`techniqueComprehension` |
| `src/types/technique.ts` | 删除 `growthModifiers`、`fixedBonuses`、`comprehensionDifficulty`；新增 `bonuses` |
| `src/data/techniquesTable.ts` | 12 部功法数据从 growthModifiers+fixedBonuses 改为 bonuses，重新平衡数值 |
| `src/data/enemies.ts` | `createCharacterCombatUnit` 改为接收 learnedTechniques，计算多功法叠加属性，元素取最高品阶 |
| `src/systems/character/CharacterEngine.ts` | `calcCharacterTotalStats` 改为多功法叠加；删除 `getComprehensionEffect` 重复定义；角色生成不再设 `currentTechnique`/`techniqueComprehension` |
| `src/systems/cultivation/CultivationEngine.ts` | `calcCultivationRate` 改为多功法叠加；`breakthrough` 中删除 `applyTechniqueGrowthToStats`（不再有乘法成长），改为突破后基于已学功法加成重算属性 |
| `src/systems/technique/TechniqueSystem.ts` | 删除 `applyTechniqueGrowth`、`getComprehensionEffect`、`tickAllComprehension`、`tickComprehension`；改造 `tryComprehendOnBreakthrough`（增加悟性门槛检查） |
| `src/systems/skill/SkillSystem.ts` | `calcTechniqueBonuses` 和 `applyTechniqueBonuses` 改为接收 learnedTechniques，删除 comprehension 参数 |
| `src/stores/sectStore.ts` | 删除 `switchTechnique`、`learnTechniqueFromCodex`、`learnTechnique`；tickAll 中删除领悟度 tick 和 comprehensionSpeedMult；改造 `unlockCodexAndLearn`（不设 currentTechnique）；改造 `studyTechnique`（解锁图鉴即可）；删除传功殿相关 (`groupTransmission`)；techniqueMultiplier 计算改为基于多功法 |
| `src/stores/adventureStore.ts` | `createCharacterCombatUnit` 调用改为传入 learnedTechniques |
| `src/components/common/CharacterCard.tsx` | 功法名称改为已学功法标签列表；`calcCultivationRate` 调用改为传入 learnedTechniques |
| `src/components/building/CodexPanel.tsx` | 显示 bonuses 而非 growthModifiers |
| `src/components/building/TransmissionPanel.tsx` | **删除整个文件**（传功殿） |
| `src/pages/CharactersPage.tsx` | 删除功法切换 UI；显示已学功法列表；删除 comprehensionEffect 引用 |
| `src/pages/BuildingsPage.tsx` | 删除传功殿 tab |
| `src/data/buildings.ts` | 从 BUILDING_DEFS 中删除 trainingHall；删除 `getTrainingBuff`/`getTrainingSpeedMult` 的效果文本 |
| `src/systems/economy/BuildingEffects.ts` | 删除 `getTrainingBuff`、`getTrainingSpeedMult`、`getComprehensionSpeedMult`、`getScriptureBuff`（comprehensionMult） |
| `src/systems/save/SaveSystem.ts` | 存档版本递增到 v4；编写 v3→v4 迁移逻辑 |

## Section 4：删除的功能

| 功能 | 文件/位置 | 原因 |
|------|----------|------|
| `Character.currentTechnique` | types/character.ts | 多功法全部生效，无需指定"当前" |
| `Character.techniqueComprehension` | types/character.ts | 学会即满级 |
| `Technique.growthModifiers` | types/technique.ts | 改为统一 bonuses 加法 |
| `Technique.fixedBonuses` | types/technique.ts | 改为统一 bonuses |
| `Technique.comprehensionDifficulty` | types/technique.ts | 不再有领悟难度 |
| `switchTechnique()` | sectStore.ts | 不再需要切换 |
| `learnTechniqueFromCodex()` | sectStore.ts | 突破自动领悟 |
| `learnTechnique()` | sectStore.ts | 卷轴改为直接领悟 |
| 领悟度 tick 系统 | TechniqueSystem.ts | 学会即满级 |
| `getComprehensionSpeedMult()` | BuildingEffects.ts | 领悟速度不再存在 |
| `getScriptureBuff().comprehensionMult` | BuildingEffects.ts | 藏经阁保留参悟功能，但不再提供领悟速度加成 |
| `getTrainingSpeedMult()` | BuildingEffects.ts | 传功殿删除 |
| `getTrainingBuff()` | BuildingEffects.ts | 传功殿删除 |
| `groupTransmission()` | sectStore.ts | 传功殿删除 |
| `applyTechniqueGrowth()` | TechniqueSystem.ts | 不再有乘法成长 |
| `applyTechniqueGrowthToStats()` | CultivationEngine.ts | 同上 |
| `getComprehensionEffect()` | TechniqueSystem.ts + CharacterEngine.ts | 学会即满级 |
| 传功殿建筑 (`trainingHall`) | buildings.ts + BuildingsPage | 删除整个建筑 |
| TransmissionPanel 组件 | TransmissionPanel.tsx | 传功殿删除 |
| techniqueMultiplier 计算逻辑 | sectStore.ts tickAll | 改为基于多功法计算 |

## Section 5：UI 变更

### 角色卡片（CharacterCard）

- 当前：显示一行功法名称
- 改为：显示已学功法标签列表，每个标签按品阶着色（凡品灰 / 灵品蓝 / 仙品紫 / 神品金 / 混沌红）
- 修炼速度显示改为基于多功法计算

### 弟子详情面板（CharactersPage）

- 删除功法切换区域和领悟进度显示
- 显示已学功法列表及具体加成数值

### 藏经阁面板（BuildingsPage）

- 保留参悟功能（解锁图鉴）
- 删除功法学习/切换按钮（突破时自动领悟）
- 藏经阁效果文本从"领悟速度 +X%"改为其他（如"已解锁功法"）

### 建筑页面（BuildingsPage）

- 删除传功殿 tab

## Section 6：存档迁移

存档版本从 v3 递增到 v4。

### v3 → v4 迁移逻辑

在 `SaveSystem.loadGame()` 中：

1. Character 迁移：
   - 删除 `currentTechnique` 字段（忽略）
   - 删除 `techniqueComprehension` 字段（忽略）
   - 如果 `learnedTechniques` 为空但有 `currentTechnique`，将 `currentTechnique` 加入 `learnedTechniques`
2. Technique 数据迁移：
   - `TECHNIQUES` 常量数据是代码内置的，不是存档数据，无需迁移
3. 建筑迁移：
   - 从 `sect.buildings` 中移除 `trainingHall` 类型建筑
4. `SaveMeta.version` 改为 4

### 清理

- `loadGame()` 中 `meta.version < 3` 分支改为 `meta.version < 4`
- 旧的 v2→v3 迁移函数保留兼容
