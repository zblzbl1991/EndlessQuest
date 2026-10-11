# 01 道韵经济修复：深度+速度双维公式 + 飞升树无限水槽

Type: task
Status: resolved
Blocked by: —
Assignee: zcode (2026-09-13)

## Question

如何让"每世推得更深"成为道韵增长的主导维度、rush 重置不再严格最优，并保证道韵在任意飞升次数下都有正边际收益的消费水槽？（废除 ba29b2c 引入的 `4^ascensionCount`——其前提"凡界封顶 1e40"将因仙界落地不成立；map 决策 4）

### 背景数据（2026-09-13 审查）

- 现公式 `floor(peak^0.1/1000 × (1+0.3×realm) × 4^count)`：推深一境收益 ×1.4~1.6 且耗时 ×2，rush 下一轮直接 ×4 → rush 严格最优。
- 飞升树 8 节点总成本 ≈ 2930 道韵；收益序列 34/136/544/2176/8704 → 第 4~5 次飞升树满，道韵成死货币。

### 范围

1. **公式改造**（`src/data/legacy.ts` `calcDaoYunGain`）：
   - peakTerm 加权：`peak^p / 1000`，p 从 0.1 提到 0.15~0.2（每 tenfold ×1.41~1.58），用模拟在校准律内定值并记录容差；
   - realmTerm 保留 `1 + 0.3 × highestRealm`；
   - ascensionTerm 改回设计稿线性 `(1 + 0.25 × count)`；
   - 更新 legacy.ts 顶部公式注释（写明废除 4^n 的原因与 map 决策引用）。
2. **无限水槽**（`src/data/legacyTree.ts`）：新增 1~2 个无限重复节点，如"道韵精粹：全体修为与资源产出 ×1.02/级，成本 base × 1.15^level"（上限 9999 级防御性封顶）；效果真实接入 CultivationEngine / tickSlice 速率管线并有单测断言；LegacyPanel 树 UI 显示无限节点当前等级与下一级成本。
3. **凡界段校准律断言**（`scripts/simulate-pacing.ts` 扩展多世模拟）：
   - rush 停滞：同峰值重复飞升，收益增幅仅来自线性 count 项（×1.25 量级）；
   - 推深单调优：peak 每高一个 tenfold，道韵严格增加且增幅 ≥ rush 重复；
   - 水槽边际有效：无限节点在第 N 次购买时的边际收益率恒为正（成本增速 < 收益增速）；
   - 断言写入模拟脚本 exit code（非零即失败），并补进 `scripts/numeric-audit.test.ts` 或独立测试文件。
4. **兼容**：旧档 legacyTree 已购节点与道韵余额无损保留（存档不迁移即兼容；无限节点旧档缺省 0 级）。
5. 完整"最优策略下每世最优道韵 ≥ 上世 ×2"校准延后到工单 10（依赖仙界深度空间）。

### 不做

- 仙界境界表与仙界峰值（工单 07）；证道（09）；道韵树 UI 美术。
- 首飞道韵绝对值的重新校准（34 → 目标区间 25~60 内保持即可，避免破坏首世节奏基线）。

## Acceptance

1. 单测：新公式单调性（peak↑ → 收益不降且 tenfold 增幅 ≥ rush 重复）、线性 count 项、旧 4^n 断言移除。
2. 单测：无限节点购买生效（修为速率与资源产出随等级提升）、成本曲线正确、9999 封顶。
3. 模拟断言：多世模拟 exit 0（rush 停滞 + 推深优 + 水槽有效三条全过）。
4. 兼容：旧档加载后树与道韵无损。
5. `npm test` 全量绿（开工前先固化基线数字，最终 ≥ 基线 + 新增）。

## Answer

`npm test` 102 文件 / 1384 用例全绿（基线 101/1377，+1 文件 +7 用例）；`tsc --noEmit` 0 错误；`simulate-pacing.ts` exit 0。

### 道韵公式（深度+速度双维）

`calcDaoYunGain = floor( 10 × (peak / 1e40)^0.15 × (1 + 0.3 × highestRealm) × (1 + 0.25 × ascCount) )`

- 峰值项**锚定渡劫**（1e40 → 10）：首飞道韵保持 34 不变，首世节奏基线不回退；
- 幂 0.15（常量 `DAO_YUN_PEAK_EXP`）：每推深一个数量级道韵 ×1.41，严格高于 rush 重复的线性次数项 ×1.25；
- `4^ascCount` 废除，次数项回设计稿线性 `(1+0.25n)`；legacy.ts 注释写明废除原因（ba29b2c 前提"凡界封顶"随仙界落地失效）。

### 无限水槽节点

`legacyTree.ts` 新增 `daoEssence` 道韵精粹（天机之道）：全体修为速率与资源产出 ×1.03/级，成本 `20 × 1.18^level`，maxLevel 9999（防御封顶）。`LegacyTreeNodeDef` 增加 `costGrowth?` 字段（默认 2，有限节点不变）。消费方：`getLegacyDaoEssenceMult` 接入 tickSlice 修炼 legacyRateMult 与四资源速率（4h 块）两处；LegacyPanel 通用渲染无需改动。

### 校准律落地（三层验证）

1. **单元**（DaoYunEconomy.test 6 用例 + AscensionV2 重写 4^n 断言）：rush 停滞（逐世增幅 ≤×1.25+1/prev）、推深单调优（1e41 收益 ≥ 下一世 rush）、水槽成本/效果/9999 封顶/速率真实放大。
2. **多世模拟**（DaoYunEconomy.test 内 20 世贪心支出模型）：有限树第 5 世远未满（反 4^n 回归）、20 世内可达满级、满级后道韵精粹逐世上升。
3. **打印脚本**（simulate-pacing.ts 扩展 + numeric-audit C 用例改写）：rush 十世 34→110（停滞）vs 推深十世 34→2473；有限树进度 9 世 100% 后精粹 L16→L35 吸收；exit code 断言。

### floor 扰动处理

小数值下 `floor()` 使增幅可略超名义 ×1.25（35→44 = 1.257）：断言容差取数学严格形式 `1.25 + 1/prev`（floor 误差随基数衰减），公式本身不动。

### 兼容

旧档 legacyTree 缺 `daoEssence` 键 → `treeLevel` 回退 0，道韵余额与已购节点无损（无 schema 迁移需要）。

### 关键数据（模拟输出）

| 策略 | 十世收益 | 有限树满 | 精粹 |
|---|---|---|---|
| rush（峰值恒 1e40） | 34 → 110 | 10 世 25% | 0 |
| push（每世 +1 tenfold） | 34 → 2473 | 9 世 100% | L35 |

完整"最优策略下每世最优道韵 ≥ 上世 ×2"延至工单 10（仙界提供 >1e40 深度空间后校准）。
