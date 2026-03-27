# 修炼系统改造：移除闭关，闲置即修炼

**日期:** 2026-03-27
**状态:** 已确认

## 背景

当前修炼系统要求弟子手动设置为 `cultivating` 状态才能增长修为，另有 `secluded`（闭关）状态通过消耗灵石获得 2.5 倍修炼加速。玩家反馈：

1. 闭关设定不友好，增加操作负担
2. 弟子不需要手动切换状态来修炼
3. 修为满了应该自动突破（前提是灵石足够）

## 设计决策

| 决策 | 选择 | 原因 |
|------|------|------|
| 状态方案 | 合并 idle/cultivating → idle | 消除无意义的修炼开关，idle 即修炼 |
| 闭关机制 | 完全移除 | 简化操作，减少认知负担 |
| 突破灵石消耗 | 所有突破都需要灵石 | 灵石成为核心突破资源，增加经济深度 |
| 突破失败 | 修为清零，灵石不退 | 保持失败惩罚的紧张感 |
| 修为增长条件 | 非冒险/非休息/非受伤即修炼 | 自动化，减少操作 |

## 状态体系

### 移除的状态

- `cultivating` — 合并到 `idle`
- `secluded` — 完全移除

### 保留的状态

| 状态 | 含义 | 是否自动增长修为 |
|------|------|------------------|
| `idle` | 空闲修炼中（默认状态） | 是 |
| `adventuring` | 秘境冒险中 | 否 |
| `patrolling` | 派遣任务中 | 否 |
| `training` | 研习功法/指派建筑 | 否 |
| `resting` | 休息恢复中 | 否 |
| `injured` | 受伤中 | 否 |

### 状态转换

- 新弟子生成 → `idle`
- 冒险结束 → `idle`
- 休息完成 → `idle`
- 受伤恢复 → `idle`
- 建筑指派撤回 → `idle`
- `idle` → `adventuring`（加入冒险队伍）
- `idle` → `training`（指派到建筑）
- `idle` → `patrolling`（派遣任务）

## 修为增长

保持现有修为增长机制不变：

- 基础速率 `BASE_CULTIVATION_RATE = 5` 修为/秒
- 灵根加成：`(spiritualRoot - 10) * 0.02`
- 境界倍率：`REALM_CULTIVATION_MULT` 数组（1.0 → 0.5 递减）
- 功法加成：乘法叠加 `cultivationRate` bonus
- 消耗灵气 2/秒，灵气不足按比例分配

**变更：** 所有 `idle` 状态的弟子都参与修为增长（替代原 `cultivating`）。

## 灵石突破消耗

### 小境界突破灵石消耗（新增）

| 境界 | 初期→中期 | 中期→后期 | 后期→圆满 |
|------|-----------|-----------|-----------|
| 炼气期 | 50 | 150 | 400 |
| 筑基期 | 200 | 600 | 1,800 |
| 金丹期 | 1,000 | 3,000 | 9,000 |
| 元婴期 | 5,000 | 15,000 | 45,000 |
| 化神期 | 25,000 | 75,000 | 225,000 |

### 大境界突破灵石消耗（沿用，微调化神→渡劫）

| 大境界突破 | 灵石消耗 |
|------------|----------|
| 炼气→筑基 | 3,000 |
| 筑基→金丹 | 15,000 |
| 金丹→元婴 | 80,000 |
| 元婴→化神 | 350,000 |
| 化神→渡劫 | 1,500,000 |

### 定价逻辑

- 同境界内：后期消耗 ≈ 前期 × 3
- 境界间：每升一个大境界约 × 5
- 大境界突破约为同境界圆满的 3-7 倍

## 自动突破流程

每秒 tick 检查每个 `idle` 弟子：

```
1. 修为 >= 需求值？
   → 否：继续积累修为
   → 是：进入突破检查

2. 灵石 >= 突破消耗？
   → 否：等待（灵石够了自动尝试）
   → 是：扣除灵石，进入突破判定

3. 是否有天劫？（仅 stage=3 且目标境界有天劫）
   → resolveTribulation（现有逻辑不变）
   → 失败：受伤/境界跌落，发出事件
   → 通过：继续突破判定

4. breakthrough 概率判定（现有失败率不变）
   → 成功：更新 realm/stage，修为清零，尝试顿悟，发出事件
   → 失败：修为清零，灵石不退，发出事件
```

**与现有逻辑的差异：**
- 新增步骤 2（小境界也需要检查灵石）
- `cultivating` → `idle`
- 移除闭关分支

## 移除的内容

1. `CharacterStatus` 中的 `'cultivating'` 和 `'secluded'`
2. `startSeclusion(characterId)` 和 `stopSeclusion(characterId)` store actions
3. 闭关相关的 tick 逻辑（灵石消耗 + 2.5 倍灵气供给）
4. 闭关人数上限（最多 3 人）
5. UI 中的"闭关"和"停止闭关"按钮
6. `StatusBadge` 中的闭关标签

## UI 变更

### 角色卡片 (CharacterCard)

- 移除 `character.status === 'cultivating'` 条件判断
- 所有非冒险/非休息/非受伤的弟子都显示修为进度条和修炼速度
- 状态标签：idle 显示「修炼中」（绿色）

### 状态标签 (StatusBadge)

- 移除 `cultivating` 和 `secluded` 条目
- `idle` 改为显示「修炼中」，使用绿色样式

### 突破面板 (BreakthroughPanel)

- 新增小境界灵石消耗显示（使用 `majorReq` 样式）
- 显示当前灵石是否足够
- 灵石不足时提示「灵石不足（需要 N）」
- 移除对 `cultivating` 状态的引用

### 角色详情 (CharactersPage - CharacterDetail)

- 移除「闭关」和「停止闭关」按钮
- 移除 `startSeclusion` 和 `stopSeclusion` 引用
- idle 弟子始终显示修炼信息和派遣按钮

### 筛选标签

- 「修炼中」tab 改为匹配 `idle` 状态（而非 cultivating + secluded）

## 影响的文件

### 数据层
- `src/data/realms.ts` — 新增小境界突破灵石消耗表
- `src/types/character.ts` — `CharacterStatus` 类型更新

### 系统层
- `src/systems/cultivation/CultivationEngine.ts` — `canBreakthrough` 增加灵石检查
- `src/stores/sectStore.ts` — tickAll 中修炼/突破逻辑适配新状态，移除闭关逻辑

### UI 层
- `src/components/common/StatusBadge.tsx` — 移除 cultivating/secluded，idle 改为修炼中
- `src/components/common/CharacterCard.tsx` — 移除 cultivating 条件判断
- `src/components/cultivation/BreakthroughPanel.tsx` — 新增小境界灵石消耗显示
- `src/pages/CharactersPage.tsx` — 移除闭关按钮，更新筛选逻辑

### 测试层
- `src/__tests__/CultivationEngine.test.ts` — 更新突破测试（灵石检查）
- `src/__tests__/stores.test.ts` — 更新 store 集成测试
