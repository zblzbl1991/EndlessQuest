# Wayfinder Map (wayfinder:map): EndlessQuest V2.1——结构修复 + 仙界闭环

## Destination

《挂机增量版 V2 设计稿》剩余工作包与第一性原理审查（2026-09-13 会话）结论全部落地，游戏具备完整长线曲线：

1. **道韵经济修复**——深度+速度双维公式（废除 4^count）+ 飞升树无限水槽，rush 不再严格最优；
2. **经营层接回曲线**——建筑 Generator 化 + Milestone + 灵气瓶颈重挂；
3. **决策面与反馈**——自动化按解锁表逐级开放 + 回访反馈最小版（ETA/瓶颈诊断/变化摘要）；
4. **抬天花板**——Decimal 迁移 + 仙界层（真仙~道祖 1e50→1e100、仙界建筑线、仙品材料、仙界秘境）+ 证道 Prestige②（大道本源 + 本源树 + 超脱）。

终点判据：`npm test` 全绿；`scripts/simulate-pacing.ts` 多世模拟通过校准律断言；首世 3.55 自然天基线不回退；仙界/证道闭环可玩。

## Notes

- 领域：挂机修仙 Incremental。设计事实以 `docs/superpowers/specs/2026-09-11-idle-incremental-v2-design.md` 为准（§五境界曲线、§六 Generator+Milestone、§七飞升/仙界、§八自动化、§十一离线）；领域词汇见根目录 `CONTEXT.md`。
- **执行方式覆盖 wayfinder 默认（Plan, don't do）**：用户明确选定"规划+执行"（2026-09-13 grill），工单全为 task（AFK），按 01→10 串行执行，每单实现+单测+`npm test` 全绿后 resolve，Answer 记录决策与数据。阻塞边同时表达执行顺序（05/06 与 03/04 无技术耦合，如需并行可松边）。
- 基线：2026-09-13 HEAD `ba29b2c`（V2 P0 全落地 + 经济墙修复）；开工工单 01 前先跑 `npm test` 固化基线数字。
- **用户锁定决策（2026-09-13 grill，四问）**：
  1. 范围 = 全部做完（结构修复 + Decimal + 仙界 + 证道）；祝福分系(P1-d) / 装备词条(P1-e) / 闭关报告完整版不在本 effort。
  2. 道韵修复 = 深度+速度双维：peakTerm 加权 + 无限水槽；校准律修正为"最优策略下每世最优道韵 ≥ 上世 ×2"——完整兑现依赖仙界的深度空间，凡界段先断言三件事：rush 收益停滞、推深单调更优、水槽边际收益恒正。
  3. 灵气瓶颈 = 消耗每境界 ×2 缓增（略高于修为速率的逐境增速 ×1.67，使单位修为的灵气成本温和上升、经营层保持相关），聚灵阵 Generator 产出 + Milestone 对冲。
  4. 废除 `4^ascensionCount`——ba29b2c 引入它的前提"凡界封顶 1e40"因仙界落地不再成立（`legacy.ts` 注释随工单 01/07 更新）；次数项回归设计稿线性小项 (1+0.25n)。
- 战斗数值保持 `number`（工单 03 先例：引擎内对数比较）；"Decimal 全量迁移"指全部**指数增长的存储字段**（修为/资源/建筑成本与产出/突破成本/峰值修为），见工单 02。

## Decisions so far

<!-- the index: one line per closed ticket, enough to judge relevance, then zoom the link for the detail the ticket holds -->

- [01 道韵经济修复：深度+速度双维 + 无限水槽](issues/01-dao-yun-economy.md)：道韵公式锚定渡劫峰值（首飞保持 34）、幂 0.15 使推深每数量级 ×1.41 > rush 线性 ×1.25，废除 4^count；飞升树新增无限节点"道韵精粹"（×1.03/级，成本 20×1.18^L）接入修为与资源管线；rush 十世 34→110 vs 推深 34→2473，有限树从 4~5 世满变 9 世满。102 文件/1384 用例全绿。
- [02 Decimal 迁移：存储层 {m,e} + 溢出防护](issues/02-decimal-migration.md)：资源/修为/峰值/灵石累计/离线增益全字段 serializeExponential（<1e15 plain、≥1e15 {m,e}），v12 旧档零迁移直读，版本 v13；>1e300 读档重置（OverflowGuard 语义不变）；safeExpCost（dec 域几何成本封顶 1e300）交付给工单 03。计算层保持 double（延续 V2-03 精度论证，触发条件记录在工单）。103 文件/1391 用例全绿。
- [03 建筑 Generator V2 + Milestone + 批量购买](issues/03-generator-milestone.md)：五座 Generator（灵田/灵矿/藏经阁/丹炉/锻器坊）指数成本 safeExpCost + 无上限，产出 1 级锚定旧值后指数化；聚灵阵并入灵田、主殿上限 (bestRealm+1)×2；Milestone 5 座 × 3~6 档（rateMult/修炼/吞吐/锻造真实接入 + 8 个自动化挂点给工单 05）；批量 ×1/×10/×100/MAX（dec 闭式解）+ 里程碑预告 UI；模拟再投资比全程 ≤2.2% 无卡墙。104 文件/1408 用例全绿。
- [10 全量校准复盘：大循环轮次表 + 基线入库](issues/10-final-calibration.md)：四轮大循环模拟 + 三条终局校准律 exit code 断言全过（最优道韵 ×3.25/轮、全局倍率每轮翻倍、证道本源翻倍）；抓到并修复本源之海/凡尘逆旅定价缺口与再投资模型仙界污染；基线入库 scripts/baseline-pacing.txt + AGENTS.md 指引。110 文件/1470 用例全绿——**本 effort 全部工单完成**。
- [09 证道 Prestige②：大道本源 + 本源树 + 超脱](issues/09-dao-proving-prestige2.md)：公式 3×(peak/1e100)^0.2×境界项×2^count（首证 6~7）；本源树 12 节点全管线接入（修炼/资源/道韵/突破/开局/离线/自动证道）；证道重置双界、护法跨双界保留；超脱 = 节点 + 树 30 级 + 道祖 → transcended 标记 + 无尽模式横幅；自动证道条件可配置；存档 v15 零迁移；LegacyPanel 证道分区 UI。校准律"二轮全局倍率 ≥×3"断言通过。110 文件/1470 用例全绿。
- [08 仙界层·内容：仙界秘境 + 仙品材料](issues/08-immortal-realm-content.md)：仙墟遗府（真仙）/论道峰（金仙）两座秘境 × 独占敌人 5 模板（难度由 adjustEnemyByTeamPower 动态对齐）；品阶 = f(层数×世界层)（resolveLootTier 1-4 阶）+ material 掉落链（LootSystem→EventSystem→vault 仙灵草/仙尘晶，卖价 2^tier）；RewardEconomy 仙界缩放断言（clamp 12）；顺手修归墟裂隙乱码名。109 文件/1456 用例全绿。
- [07 仙界层·核心：四境 + 仙界建筑 + 双层咬合](issues/07-immortal-realm-core.md)：境界表延伸 1e50→1e100（真仙~道祖），经济耦合斜率 0.9→1.0（仙界卡墙的关键校准，攒突破钱耗时境界无关）；仙界三建筑复用四资源吃同乘区；双层咬合 = 渡劫圆满自然突破入真仙 + 护法境界≥9 完整保留 + 仙界建筑飞升保留 + canAscend 排除仙界建筑（抓到首飞卡死 bug）；存档 v14 零迁移。模拟：真仙累计 7.1 天 ≈ 设计"1 周"；首世 3.55 天不回退。108 文件/1445 用例全绿。
- [06 回访反馈最小版：ETA / 瓶颈 / 变化摘要](issues/06-return-feedback.md)：ProgressForecast 纯函数模块（最快突破弟子 ETA + 最近里程碑 ETA + formatEta；getBuildingCultivationMult 从 tickSlice 抽出防漂移）；宗门页"现状与前瞻"卡（灵气供给 <0.9 警示）；离线报告"自上次拜访"段（境界变化 Top3 + 资源 ×N 倍数）+ "下次上线时"建议数组（瓶颈生成、可点击跳转）。107 文件/1434 用例全绿。
- [05 自动化节奏修正：解锁表 + 手动突破入口](issues/05-automation-rhythm.md)：发现并修复 autoBreakthrough 死开关；9 项自动化三类解锁条件（筑基/元婴/化神/里程碑/树节点）+ 消费点 gating（小境界元婴、大境界化神+新开关、招募元婴）；新增 attemptBreakthrough 手动突破 action + 面板按钮（补齐元婴前唯一突破路径）；自动出售凡品/自动炼丹续产真实现；AutomationPanel 三态面板挂宗门页；新档默认全关、旧档偏好保留。106 文件/1423 用例全绿。
- [04 灵气瓶颈重挂：消耗随境界 ×2](issues/04-spirit-bottleneck.md)：calcSpiritCostPerSecond(realm)=2×2^realm 进入 tick/tickSlice/Display 三消费点，弟子上限按最高境界折算；OfflineAccumulator.lowSpiritSeconds 归因到离线报告（"灵气供给不足 X 分钟"）；模拟三断言全过——正常建设 ratio ≥0.9 无死锁（合体期 L_min=50 恰逢 Lv50 里程碑联动）、落后一半 ratio 0.10~0.44 可感知缩水。105 文件/1413 用例全绿。

## Not yet specified

- （已随工单 07-10 落地清空：仙界段节奏表、超脱形态、仙界秘境坐落均在各工单 Answer 定案）

## Out of scope

- 排行榜 / 赛季（设计文档 P3）。
- 视觉/UI 风格改版（延续 V2 map 约定：新交互只做最小可用挂接，清墨轻岚基线不动）。
- 祝福分系 Build 化（P1-d）与装备词条 V2（P1-e）：后续独立 effort。
- 闭关报告完整版（击杀/装备获取/分解统计入离线报告）：本 effort 只做回访反馈最小版（工单 06）。
