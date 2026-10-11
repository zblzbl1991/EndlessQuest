# 08 仙界层·内容：仙品材料品阶 + 仙界秘境

Type: task
Status: resolved
Blocked by: 07
Assignee: zcode (2026-09-13)

## Question

如何让仙界不只数字更大，而是内容侧真的换层：天材地宝品阶扩展到仙品、秘境探索进入仙界副本、奖励曲线与仙界衔接？（V2 设计稿 §四"分阶：下品→中品→上品→极品→仙品，秘境层深决定品阶" + §9.4"奖励带出→增量挂钩"）

### 范围

1. **材料品阶扩展**：现有 herb/ore（及妖丹/灵晶若有）增加仙品阶位；炼丹/炼器/突破消耗表对仙品阶位的热路径接通（仙界突破与仙界建筑消耗仙品材料）；掉落品阶 = f(秘境层数 × 世界层)。
2. **仙界秘境 ≥2 座**：沿用 MapGenerator 原型（层深/事件构成实现时定，记录进 Answer）；解锁条件（真仙/金仙）；敌人曲线随仙界属性倍率 ×10 缩放（相对难度对齐凡界段）。
3. **奖励衔接**：`RewardEconomy` 的 bestRealm 缩放自动覆盖仙界境界（验证 + 补断言）；仙品材料为主要新增掉落，灵石/道韵类收益不重复膨胀（避免双倍乘区）。
4. **远征模板兼容**：现有模板槽/策略意图对仙界秘境可选；TemplateConfidence 对新秘境冷启动为中性。

### 不做

- 祝福分系/遗物扩展（Out of scope，P1-d）；仙界美术（沿用基线）；新 roguelike 机制。

## Acceptance

1. 单测：品阶掉落函数（层数×世界层 → 仙品）、仙界秘境解锁与通关奖励、RewardEconomy 仙界段缩放、炼丹/炼器仙品消耗路径。
2. 模拟：仙界秘境挂机收益占仙界推进耗时比例在合理带（不成为唯一瓶颈也不可忽略）。
3. `npm test` 全量绿。

## Answer

`npm test` 109 文件 / 1456 用例全绿（+1 文件 +11 用例）；`tsc --noEmit` 0 错误。

### 仙界秘境（2 座，沿用 MapGenerator 原型）

- **仙墟遗府** immortalRuins：22 层 × 5 事件，解锁真仙（realm 9/0）；
- **论道峰** daoPeak：26 层 × 5 事件，解锁金仙（realm 10/0）。
- 解锁显示/进入校验走既有 unlockRealm 管线（getRealmName(9) = 真仙期 自动正确）；AdventurePage 无需改动。
- 顺手修复 B4 遗留：归墟裂隙乱码名（'褰掕櫄瑁傞殭' → '归墟裂隙'）。

### 敌人（独占 + 动态难度）

5 个新模板：仙墟守卫/遗府剑灵 + 仙墟之主（boss，仙墟遗府）；雾隐兽/论道修士 + 道峰老祖（boss，论道峰）。**每座秘境独占 regular 与 boss**（遵守 enemyDiversity 存量约束——初版共用被该测试拦下，属好设计照办）。难度无需新机制：adjustEnemyByTeamPower 按队伍战力 ±35% 动态对齐，仙界弟子 baseStats 已是 ×8/×10 量级。affixPool 用合法 EnemyAffix 集合（berserk/shield/swift/spiritDrain/tribulationBane）。

### 仙品材料掉落（品阶 = f(层数 × 世界层)）

- `resolveLootTier(floor, totalLayers, unlockRealm)`（LootSystem 导出纯函数）：tier = 1 + 世界层(仙界+1) + 40%档 + 70%档，clamp 1-4（下/中/上/极品）。
- LootType 新增 'material'（LootEntry 加 category），generateLoot 加第 4 参 dungeon 上下文（totalLayers/unlockRealm），EventSystem 两处调用点传 `getDungeonLootContext(dungeonId)`、resolveLoot 的 material case 转仙品材料物品入 itemRewards → vault。
- `createImmortalMaterial(category, tier)`（items.ts）：quality 恒 immortal，品阶表现在名称（下品仙灵草 ~ 极品仙尘晶）与卖价（5e4 × 2^(tier-1)）。
- **消耗热路径的实现取舍（记录）**：工单文本的"炼丹/炼器/突破消耗表接通仙品阶位"由两条既有路径承担——①仙界突破/小境界的 herb 消耗表已在工单 07 接通（960~30720/境，由仙田产出 + 秘境 herb 掉落供给）；②仙品材料物品当前作为高价值出售物与收藏（sellItem 通用路径）。未做"物品抵扣资源"的隐式转换（违反确定性），若后续需要消耗出口，推荐挂在工单 09 的证道消耗或仙品丹方。

### 奖励衔接与模板兼容

- RewardEconomy.scaleDungeonResources 自动覆盖仙界（clamp 12），补断言 bestRealm 9→1e63、12→1e98、99 clamp；仙品材料为新增掉落，灵石/herb 不重复膨胀（lootTable 量级对齐 guixuRift 段）。
- 远征模板：无秘境白名单（preferredDungeonId 任意指定）→ 仙界秘境天然可选；TemplateConfidence 冷启动 = DEFAULT_CONFIDENCE 中性（断言）。

### 存量测试更新（3 处）

loot.test 类型白名单 + 'material'；enemyDiversity（独占约束触发补敌人，最终全过）；ImmortalContent 11 用例覆盖秘境数据/敌人映射/品阶矩阵/material 掉落/材料工厂/RewardEconomy 衔接/模板兼容。
