# 03 装备词条 V2：机制词缀池 + 品质扩展 + 自动分解

Type: task
Status: resolved
Blocked by: 02
Assignee: zcode (2026-10-11)

## Question

如何把装备从"+1020 → +1050 的数值刷取"升级为设计稿 §十 的机制词条系统：词缀池 30+ 条（机制型为主）、品质体系扩展、自动分解消除仓库压力？

### 范围

1. **品质扩展映射（先决策，记录 Answer）**：现有 5 档（common/spirit/immortal/divine/chaos）→ 设计稿 9 档（凡/灵/玄/地/天/仙/圣/混沌/鸿蒙）。决策点：a) 扩 ItemQuality 到 9 档（改动面大、历史档兼容成本高）；b) 保留 5 档为"品质"，另立"阶位"字段（tier 1-9 映射设计稿九阶，品名呈现用阶位）——倾向 b（零迁移、与仙品材料的 tier 先例一致）。旧档按 tier=品质档位折算。
2. **词缀池 30+**：talentAffixes 6 种属性词条 → 30+，以**机制词条**为主：吞灵（击杀回修为）、鸿蒙（突破次数成长→永久属性微量）、剑意（功法等级 +N）、吸血、反伤、灵气回流（战斗胜后回灵气）、成品阶挂钩（词缀条数 = f(阶位)：2/3/4/5/6）。
3. **器灵成长（神器成长）**：divine/chaos 阶装备带器灵经验，随击杀积累升阶（小属性成长），淘汰感消失。
4. **自动分解**：灵矿 Lv25 autoSellJunk 能力升级为"分解"语义——凡品装备分解为矿材/灵石（产出高于直接卖），仓库压力消除；自动化面板文案同步。
5. **掉落与仙品衔接**：词缀条数与阶位由秘境层数×世界层决定（对齐工单 08 的品阶函数）；仙界秘境掉高阶装备。
6. 单测：词缀池完整性、机制词条真实生效（吞灵/剑意/吸血各 1 条断言）、条数-阶位映射、器灵成长、自动分解入账。

### 不做

- 强化系统重做（+15 强化保留）；装备 UI 重排（词条展示沿用现有 ItemCard 布局加行）。

## Acceptance

1. 品质映射决策 + 旧档兼容测试（旧 5 档读档无损、显示正确）。
2. 30+ 词缀数据完整性 + 至少 3 条机制词条效果断言。
3. 器灵成长断言；自动分解路径断言（GUI 冒烟走一遍凡品清理）。
4. `npm test` 全量绿。

## Answer

`npm test` 113 文件 / 1500 用例全绿（+1 文件 +9 用例）；`tsc --noEmit` 0 错误。

### 品质映射决策（记录）

选方案 b：**品质 5 档保留 + 独立阶位轴 `Equipment.tier`（1-9：凡/灵/玄/地/天/仙/圣/混沌/鸿蒙）**。历史档零迁移（不写 tier 时按品质折算 1/3/5/7/9 呈现）；词缀条数 = f(tier)：[1,1,2,2,3,3,4,5,6]；词条数值档 = f(tier)：1-3 档取 values[0]、4-6 取 values[1]、7-9 取 values[2]。

### 机制词缀（31 条，12 种效果全部真实生效）

`data/equipmentAffixes.ts`：属性百分比 6 条 + 机制 6 条（饮血/棘刺/悟道/吞灵/灵气回流/剑意）+ 数值变体 19 条 = 31 条。生成时按 tier roll（generateEquipment 接线，Equipment.tier/affixes 新字段）。聚合 `aggregateEquipmentAffixes(equipped)` 为唯一消费入口：
- **战斗**：百分比属性乘进 eqStats（adventureStore 单位创建处）；饮血 → CombatUnit.lifestealRatio（伤害结算回血，CombatEngine 新分支）；棘刺 → 复用工单 02 的 thornsRatio；吞灵 → CombatResult 新增 kills 计数，completeRun 结算按角色回修为；
- **修炼**：悟道/静修 → tickSlice 修炼速率乘区（per-character 装备聚合）；剑意/参悟 → comprehensionGrowth 乘区；
- **胜利回流**：completeRun 结算 spiritEnergy。

### 器灵成长

`Equipment.spiritExp`：击杀积累（每 run 击杀数/队伍数 × 2/件）；等级 = floor(sqrt(exp/25)) 封顶 10；getEffectiveStats 每级全属性 +2%（暴击/爆伤不受 flat 乘区）。

### 自动分解升级

灵矿 Lv25 清扫语义从"出售"升级为"分解"：半价灵石 + 等值 1/4 矿材（高于直接出售），矿材入账走 newResources ore 通道；equipmentSold 统计口径不变。

### 范围说明

ItemQuality 5 档保留不动（决策 b 的直接推论）；refinementStats 精炼系统保留（数值型词条与机制词条互补）。
