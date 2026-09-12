# Wayfinder Map: EndlessQuest 挂机增量版 V2（P0 阶段）

## Destination

《EndlessQuest 挂机增量版 V2 游戏设计方案》（`docs/superpowers/specs/2026-09-11-idle-incremental-v2-design.md`）的 **P0 五个工作包全部按序落地**：修阻断 bug → 主循环改造 → BigNumber 底座 → 境界指数曲线 → 飞升 Prestige V2，且**全量测试（`npm test`）通过**，形成可继续 P1 的基线。

## Notes

- 领域：挂机修仙 Incremental 改造。设计事实与公式以设计文档为准；本地图只做索引，细节在工单。
- **执行方式覆盖 wayfinder 默认（"Plan, don't do"）**：本 effort 由用户明确定义为"形成方案，然后按顺序执行，并最终通过测试"。工单类型全部为 `task`（AFK），一单 = 实现 + 单测 + `npm test` 全绿后才可 resolve。
- 基线：2026-09-11 起点 `npm test` = 90 文件 / 1299 用例全绿。
- 工单串行依赖按设计文档 §十四 路线图：P0-a → P0-b → P0-c → P0-d → P0-e。
- 设计文档附录 B 五个待评审决策点按文档建议锁定（用户未另行推翻前生效）：
  1. 属性倍率 ×8/大境界（仙界 ×10）
  2. 飞升保留最高境界弟子为"护法"（替代随机留 1 凡品）
  3. 道韵树节点成本 `×2^level`
  4. 仙界层放 V2.1（本 effort 只做凡界 9 境闭环）
  5. 修为与灵石同批迁 Decimal，战斗数值后迁

## Decisions so far

<!-- the index: one line per closed ticket, enough to judge relevance, then zoom the link for the detail the ticket holds -->

- [01 修复阻断性数值 bug（P0-a）](issues/01-fix-blocking-numeric-bugs.md)：灵石上限公式主殿>2 级改 1.5^(lv-2)（硬上限 448 万覆盖 150 万突破）；化神/渡劫补 tribulationPower(1.2/1.5) 并删 tribulationStages 死数据；天劫 roll 与引擎层失败 roll 去叠；legacy statBonus 经 createCharacterCombatUnit 第 5 参真实进入战斗单位；删除 minorBreakthroughCost 死表。91 文件/1310 用例全绿。
- [02 主循环改造（P0-b）](issues/02-game-loop-architecture.md)：GameLoop(rAF+1s 固定步长+rAF 缺失回退+可见性/心跳 catch-up+显式暂停) 替换 IdleEngine；离线事件改泊松抽样(utils/poisson)且 tickSlice 支持多事件结算；offlineAccumulator 持久化；存档 5s leading 防抖。步进 vs 单次 delta 确定性回归测试落地。94 文件/1323 用例全绿。
- [03 BigNumber 底座（P0-c）](issues/03-bignumber-foundation.md)：break_eternity + `utils/Decimal.ts` 统一封装（运算/比较/{m,e} 序列化/formatNumber 双模式）全测交付；**范围修正**：不迁移存储字段类型（double 与 break_eternity 尾数精度在 ≤1e308 等价、V2 峰值 1e100 安全、330 处迁移零收益高风险），以 normalizeBoundedNumber(1e300) 读档防护替代 v13 迁移，触发条件记录在工单（P1 建筑 4900 级 / V2.1 / 排行榜）。96 文件/1337 用例全绿。
- [04 境界指数曲线（P0-d）](issues/04-realm-exponential-curve.md)：凡界 9 境 10^2→10^40（小境界 [5,15,30,50]%）；速率由成本曲线派生（600s×2^i/境锚点）取代旧减速表；突破灵石=成本×2%、小境界生成式联动；getRealmEconomyMult/StoneFloor 把灵石收入与上限挂到最高境界；突破循环支持单 delta 多段跨进并修掉引擎层拒绝误报 success 的语义 bug；xp 去.floor 随曲线连续化。模拟脚本+7 用例：首世 3.55 自然天（目标 3±50% 内）、攒石占比 ≤16%。97 文件/1344 用例全绿。
- [05 飞升 Prestige V2（P0-e）](issues/05-ascension-v2.md)：道韵公式（首飞 34）+ peakCultivationThisRun 追踪；飞升树 8 节点 4 主干（×2^level 成本）全部接入真实管线（修为/灵石灵气/离线上限/战力/掉落/突破率/自动飞升）+ 购买 action + LegacyPanel 飞升树分区 + legacyTree 持久化；护法保留（最高境界弟子身份装备功法保留、境界归零）；自动飞升四条件（节点+开关+资格+道韵门槛）挂入游戏日推进。AscensionV2 12 用例 + LegacySystem 28 用例。97 文件/1356 用例全绿 ×5 稳定。
## Not yet specified

- P1 工作包（建筑 Generator 化 + Milestone、自动化解锁面板、闭关报告 V2、Roguelike Build 化、装备词条 V2）——P0 已落地，可切分为新 effort；切分时先跑 `npx tsx scripts/simulate-pacing.ts` 复核数值基线。
- 道韵校准复盘：首飞 34 vs 设计稿目标 12（同数量级）；若要更陡的增长曲线（如设计稿十飞 3M 量级），需仙界层提供 >1e40 的修为峰值，随 V2.1 评审。
- 秘境内容缺口：境界 6-8（合体/大乘/渡劫）暂无新秘境；B4 乱码（legacyFlavor.ts、events.ts 归墟名、legacySlice 事件文案）未修。

## Out of scope

- 仙界层 / 证道 Prestige② / 超脱（设计文档 P2，决策点 4 已锁定 V2.1）。
- 排行榜 / 赛季（设计文档 P3）。
- 视觉/UI 风格改版（清墨轻岚已另行立项过，本 effort 只动逻辑层数值层；UI 仅在自动化开关等新交互处做最小可用挂接）。
