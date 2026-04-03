# 基于属性的战斗计算系统

## Goal

让秘境探险中的战斗胜负由弟子实际属性决定，而非纯随机。保留过程随机性（暴击、技能选择、元素克制），但通过敌我属性匹配确保结果更公平、更可预测。

## 决策

- **难度策略**：秘境层数为基础 + 队伍属性 ±20% 微调
- **敌人模板**：保留现有 3 个，通过动态缩放生成不同强度

## Requirements

### 1. 队伍战力评估函数

新增 `calcTeamPowerRating(units: CombatUnit[]): number`：
- 加权汇总队伍全体成员的 atk + def + hp/5 + spd + crit*100 + critDmg*50
- 考虑平均境界加成（realm 越高，基础倍率越高）
- 考虑品质加成（common=1.0, spirit=1.1, immortal=1.2, divine=1.3, chaos=1.5）
- 考虑 combat 专长加成（每级 +5%）

### 2. 敌人动态缩放

修改 `EventSystem.ts` 的 `resolveEvent()`：
- 战斗前先算队伍战力评分
- 基础敌人属性仍由层数决定（保留 `scaleEnemy`）
- 根据队伍评分与"该层期望战力"的比值，在 ±20% 范围内微调敌人属性
- 强队 → 敌人 +20%；弱队 → 敌人 -20%

### 3. Boss 动态缩放

修改 Boss 事件处理：
- 去掉固定 2x HP / 1.5x ATK
- 改为：Boss 基础属性 = 该层敌人 × 2.5，然后根据队伍战力 ±20% 微调
- 确保Boss始终比同层普通怪明显更强

### 4. 随机事件受福运影响

修改 random 事件：
- 计算队伍平均 fortune（福运）
- fortune > 50 → 宝箱概率 +15%，陷阱概率 -10%
- fortune < 30 → 陷阱概率 +10%，宝箱概率 -10%
- 中间线性插值

### 5. 境界影响战力

在 `createCharacterCombatUnit` 中：
- realm 每级 +3% 全属性
- realmStage 每阶段 +1% 全属性

## Acceptance Criteria

- [ ] 队伍属性明显优于敌人时，胜率 > 80%
- [ ] 队伍属性与敌人相当时，胜率约 50%
- [ ] 队伍属性明显劣于敌人时，胜率 < 30%（但非零）
- [ ] Fortune 高的队伍随机事件更 favorable
- [ ] 现有测试全部通过（或更新后通过）
- [ ] CombatUnit / CombatResult 接口向后兼容

## Definition of Done

- Tests added/updated
- Lint / typecheck green
- 不改变现有接口签名（可扩展参数）

## Out of Scope

- 战斗过程可视化
- 新 UI 页面
- 扩充敌人模板种类
- 手动操控战斗

## Technical Approach

### 新增文件
- `src/systems/combat/PowerRating.ts` — 队伍战力评估

### 修改文件
- `src/systems/roguelike/EventSystem.ts` — 敌人生成使用战力匹配 + 随机事件受福运影响
- `src/data/enemies.ts` — `createCharacterCombatUnit` 加入 realm/quality 加成
- `src/data/enemies.ts` — `scaleEnemy` 保留，新增 `scaleEnemyForTeam()` 根据队伍强度微调

### 不修改文件
- `src/systems/combat/CombatEngine.ts` — 战斗模拟逻辑不变
- `src/systems/roguelike/AutoRunEngine.ts` — 调用链不变

## Technical Notes

### 战力评分公式（草案）
```
unitPower = atk * 1.0 + def * 0.8 + hp * 0.2 + spd * 0.5 + crit * 100 + critDmg * 50
realmMultiplier = 1 + realm * 0.03 + realmStage * 0.01
qualityMultiplier = { common: 1.0, spirit: 1.1, immortal: 1.2, divine: 1.3, chaos: 1.5 }
teamPower = Σ(unitPower * realmMultiplier * qualityMultiplier) / teamSize * teamSize^0.8
```

### 敌人微调公式（草案）
```
expectedPower = baseEnemyPower(layer)  // 该层标准敌人战力
ratio = teamPower / expectedPower
adjustment = clamp(ratio, 0.8, 1.2)   // ±20%
enemyStats *= adjustment
```

### 关键文件
- `src/systems/combat/CombatEngine.ts` — 战斗模拟（280 行，不改）
- `src/systems/roguelike/EventSystem.ts` — 事件解决（316 行，改）
- `src/data/enemies.ts` — 敌人模板 + 角色转战斗单位（278 行，改）
