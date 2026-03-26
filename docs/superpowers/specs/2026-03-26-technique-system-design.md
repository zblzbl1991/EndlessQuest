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
| `requirements.minComprehension` | **保留**（仍作为角色悟性学习门槛） |

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
    minComprehension: number   // 角色悟性属性门槛
  }
}
```

12 部功法的具体 `bonuses` 数值在实现时重新平衡，品阶越高加成越大。

### Sect 类型

`techniqueCodex: string[]` 保持不变，仍为宗门已发现的功法集合。

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
2. 从 `sect.techniqueCodex` 中筛选：未在角色 `learnedTechniques` 中 + 品阶 <= 上限
3. 可用功法为空时静默跳过
4. 有可用功法：随机选一部，加入角色 `learnedTechniques`
5. 发送 `breakthrough_comprehension` 事件通知

### 藏经阁参悟

保持不变：消耗灵石解锁新功法到图鉴，不直接给角色。

### 探险古修洞府

保持不变：获得功法 → 通过 `unlockCodexAndLearn` 同时解锁图鉴 + 加入角色 `learnedTechniques`。

## Section 3：属性计算

### 战斗属性

所有已学功法的 `bonuses` 全部叠加（纯加法）：

```
totalBonus[type] = Σ(每部已学功法中 type 匹配的 bonus.value)
finalStat = baseStat + totalBonus[type]
```

例如：清心诀 { hp: 30, def: 10 } + 烈焰心法 { hp: 20, atk: 40 }
→ HP 加成 50，DEF 加成 10，ATK 加成 40

### 修炼速度

所有已学功法中 `cultivationRate` 类型的 bonus 求和：

```
rateMultiplier = 1 + Σ(cultivationRate bonuses)
```

### 改动位置

- `createCharacterCombatUnit`（enemies.ts）— 战斗属性计算
- `calcCharacterTotalStats`（CharacterEngine.ts）— 面板属性计算
- `calcCultivationRate`（CultivationEngine.ts）— 修炼速率计算

## Section 4：删除的功能

| 功能 | 文件/位置 | 原因 |
|------|----------|------|
| `switchTechnique()` | sectStore.ts | 不再需要手动切换 |
| `learnTechniqueFromCodex()` | sectStore.ts | 不再需要手动学习 |
| `learnTechnique()` | sectStore.ts | 卷轴机制改为直接领悟，旧卷轴兼容保留 |
| 领悟度 tick 系统 | TechniqueSystem.ts `tickAllComprehension` | 学会即满级 |
| `comprehensionSpeedMult` | sectStore.ts 传功殿逻辑 | 传功殿删除 |
| 传功殿建筑 | buildings 数据 + BuildingsPage | 不再有领悟速度概念 |
| 功法切换 UI | CharactersPage | 不再需要 |

## Section 5：UI 变更

### 角色卡片（CharacterCard）

- 当前：显示一行功法名称
- 改为：显示已学功法标签列表，每个标签按品阶着色（凡品灰 / 灵品蓝 / 仙品紫 / 神品金 / 混沌红）

### 弟子详情面板（CharactersPage）

- 删除功法切换区域
- 显示已学功法列表及具体加成数值

### 藏经阁面板（StudyPanel）

- 保留参悟功能（解锁图鉴）
- 删除学习/切换按钮（突破时自动领悟）

## Section 6：存档迁移

在 `SaveSystem.loadGame()` 中：

1. `currentTechnique` 不再使用，忽略
2. `techniqueComprehension` 不再使用，忽略
3. 如果 `learnedTechniques` 为空但有 `currentTechnique`，将 `currentTechnique` 加入 `learnedTechniques`
4. 传功殿建筑从存档中移除（或保留建筑但标记为废弃）
