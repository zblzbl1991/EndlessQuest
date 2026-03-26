# 功法系统完善设计

日期：2026-03-26

## 概述

完善功法系统，建立「宗门功法图鉴」作为功法获取和学习的核心枢纽。弟子通过突破顿悟、秘境探索、藏经阁参悟三种途径解锁图鉴功法，再从图鉴中学习。

## Section 1：宗门功法图鉴

### 数据结构

在 Sect 类型中新增 `techniqueCodex: string[]`，存储已解锁功法 ID 列表。

```typescript
// sectStore createInitialState()
techniqueCodex: ['qingxin', 'lieyan', 'houtu'], // 初始解锁 3 个凡级功法
```

### 存档迁移

在 `SaveSystem.loadGame()` 中增加迁移：如果 `sect.techniqueCodex` 不存在（旧存档），默认设为 `['qingxin', 'lieyan', 'houtu']`。如果旧存档中的弟子 `currentTechnique` 为 null 且 `learnedTechniques` 为空，自动设置 `currentTechnique = 'qingxin'`、`learnedTechniques = ['qingxin']`。

### 初始状态

图鉴预解锁 3 个凡级功法：清心诀、烈焰心法、厚土诀。

### 解锁方式

1. **秘境事件**：「古修洞府」事件中选择参悟，直接解锁图鉴条目 + 将功法加入弟子的 `learnedTechniques`（不设置 currentTechnique，不重置领悟度）
2. **藏经阁参悟**：消耗灵石，直接解锁一个图鉴条目（不再生成卷轴物品）
3. **突破顿悟**：自动突破成功后概率将功法加入 `learnedTechniques`（见 Section 2）

### 学习机制变更

- 新增 store action：`learnTechniqueFromCodex(characterId, techniqueId)` — 从图鉴学习，需满足 `canLearnTechnique` 要求，设置 `currentTechnique` 并重置 `techniqueComprehension = 0`（与现有 `learnTechnique` 逻辑一致，只是不需要卷轴物品）
- 旧的 `learnTechnique(characterId, backpackIndex)` 保留，兼容背包中已有的旧卷轴
- 已学功法仍保留在 `character.learnedTechniques` 中

### 功法卷轴物品调整

探秘境获得的功法不再生成卷轴物品放入仓库，直接修改 store 状态。背包中已有的旧卷轴仍可使用（兼容存量存档）。

## Section 2：突破领悟功法

### 触发时机

自动突破成功后，概率触发领悟。

| 突破类型 | 悟概率 |
|---------|--------|
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

品阶索引映射：`TECHNIQUE_TIER_ORDER[Math.min(character.realm, 4)]`

### 领悟流程

1. 突破成功后，掷随机数判定是否触发领悟
2. 从图鉴 (`techniqueCodex`) 中筛选：已解锁 + 未学习 (`!learnedTechniques.includes`) + 品阶 ≤ 上限
3. **可用功法为空时：静默跳过，不触发领悟**（已学完所有可用功法的情况）
4. 有可用功法：随机选择一个，**仅加入 `learnedTechniques`**（不设置 currentTechnique，不影响当前修炼的功法和领悟进度）
5. 如果 `currentTechnique` 为空：自动装备为新领悟的功法，`techniqueComprehension = 0`
6. 发出事件日志：`{name} 顿悟了 {technique.name}`

### 设计理由

- 领悟仅加入 `learnedTechniques` 而不替换当前功法：避免打断当前修炼进度，弟子可以之后手动切换
- `learnedTechniques` 是"已学会的功法库"，弟子可以随时从中切换，无需重新领悟

### 实现位置

在 `sectStore.ts` 的 `tickAll` 自动突破成功分支中，追加领悟判定。纯函数 `tryComprehendOnBreakthrough(character, techniqueCodex)` 提取到 `TechniqueSystem.ts`。

## Section 3：秘境事件掉落功法

### 新增事件类型

在 `EventType` 联合类型中新增 `'ancient_cave'`。

```typescript
// types/adventure.ts
export type EventType = 'combat' | 'random' | 'shop' | 'rest' | 'boss' | 'ancient_cave'
```

在 `EventSystem.resolveEvent()` 的 switch 中新增 `ancient_cave` case。

### 触发条件

- 仅在第 3 层及以上出现
- 与现有随机事件同池，权重 1（与其他 random 事件相同权重）

### 事件内容

- 描述：「你发现了一处古修洞府，石壁上刻有古老的功法铭文...」
- 自动结算：领悟功法，解锁图鉴 + 加入 learnedTechniques
- 注：现有事件系统无选择机制，采用自动结算（与 combat/rest 等事件一致）

### 事件解析与跨 Store 通信

`ancient_cave` 事件与其他事件不同，需要修改 sectStore 状态。实现方式：

1. `EventResult` 新增可选字段 `techniqueReward?: { techniqueId: string }`
2. `resolveEvent()` 在 `ancient_cave` 分支中，根据品阶权重随机选择功法 ID，写入 `techniqueReward`
3. `adventureStore.selectRoute()` 在处理事件结果时，检查 `techniqueReward`，调用 `useSectStore.getState().unlockCodexAndLearn(techniqueId, characterId)`
4. `sectStore` 新增 action `unlockCodexAndLearn(techniqueId, characterId)`：单次 `set()` 调用同时更新 `techniqueCodex` 和 `learnedTechniques`

### 品阶与层数映射

| 层数范围 | 可掉落品阶 | 概率分布 |
|---------|----------|--------|
| 3-5 层 | 凡级、灵级 | 凡 70%、灵 30% |
| 6-10 层 | 灵级、仙级 | 灵 70%、仙 30% |
| 11+ 层 | 仙级、神级 | 仙 70%、神 30% |

混沌级功法不通过秘境事件获得，仅通过化神期突破领悟。

## Section 4：初始弟子功法 + 藏经阁参悟调整

### 初始弟子功法

弟子创建时 (`CharacterEngine.generateCharacter`)：
- `currentTechnique = 'qingxin'`
- `learnedTechniques = ['qingxin']`
- `techniqueComprehension = 0`

### 存档兼容

旧存档中的弟子 `currentTechnique` 为 null 时，在 SaveSystem 迁移中自动设置：
- `currentTechnique = 'qingxin'`
- 如果 `'qingxin'` 不在 `learnedTechniques` 中，添加

### 藏经阁「参悟」调整

当前逻辑：消耗灵石 → `generateRandomTechniqueScroll(maxTier)` → 卷轴放入仓库

改为：消耗灵石 → 从 `TECHNIQUES` 中随机选择一个未解锁的功法 → 添加到 `techniqueCodex`

品阶分布改为加权随机（低品阶概率更高）：
- maxTier 对应品阶权重 1.0
- 每低一个品阶权重 ×2
- 例如 maxTier=immortal 时：mortal 4, spirit 2, immortal 1

- 移除 `generateRandomTechniqueScroll` 的导入（如果不再有其他调用方）
- `generateTechniqueScroll(tier)` 保留（仍被旧存档卷轴使用）

### 学习功法 UI 调整

CharactersPage 功法区域：
- 无功法时：「学习功法」按钮 → 弹出图鉴选择面板（已解锁 + 未学习 + 满足要求）
- 有功法时：「更换功法」按钮 → 弹出图鉴选择面板（已解锁 + 已学习 + 满足要求）
- 背包中的旧卷轴仍可使用（兼容存量存档，调用原 `learnTechnique`）

### 图鉴 UI

藏经阁建筑页面新增「图鉴」标签页：
- 展示所有功法（数量从 `TECHNIQUES` 数组长度获取，不硬编码）
- 已解锁：显示完整信息（名称、品阶、属性加成、领悟进度）
- 未解锁：显示剪影 + 品阶 + 获取途径提示
