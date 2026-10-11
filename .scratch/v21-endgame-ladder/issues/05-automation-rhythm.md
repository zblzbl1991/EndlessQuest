# 05 自动化节奏修正：按解锁表逐级开放

Type: task
Status: resolved
Blocked by: 04
Assignee: zcode (2026-09-13)

## Question

如何让自动化回归"长线奖励"定位：前期手动建立心智，随境界逐级自动化，每次解锁同时释放新的配置面？（V2 设计稿 §八；现状：`initial.ts` 里 `autoBreakthrough: true` 从第 1 天就默认开，违背自动化解锁表）

### 范围

1. **初始默认值**：新档 `autoBreakthrough: false`（`initial.ts` + `performAscension` 两处）；**旧档迁移保持现状不回退**（已开局的档不被剥夺已享受的自动化，v13 迁移只对"无该偏好的新字段"生效）。
2. **解锁表落地**（`data` 层新表 + tickSlice 消费）：
   | 自动化 | 解锁条件 |
   |---|---|
   | 装备自动最优 | 筑基（已有，改为受控常驻） |
   | 自动秘境策略 | 筑基（已有 runIntents） |
   | 小境界自动突破 | 元婴 |
   | 自动指派 | 元婴 |
   | 大境界自动突破（可设确认） | 化神 |
   | 自动出售凡品 | 灵矿 Milestone / 聚仙台（接工单 03 Milestone 挂点） |
   | 自动炼丹 | 炼丹房 Lv25 Milestone |
   | 自动飞升 | 大乘 + 天机推演节点（已有） |
   未解锁时对应开关显示锁定态 + 解锁条件文案。
3. **自动化面板分页**：现有 automationSettings 扩展为分页开关面板（生产 / 修炼 / 秘境 / 飞升四组），每项三态：锁定（显示条件）/ 可开 / 已开；最小可用挂接，不重排版。
4. **解锁时刻反馈**：首次解锁走"关键时刻"高光（与 Milestone 同管线），文案说明"从此这件事自动发生"。
5. 解锁矩阵单测（境界 × 自动化项全矩阵）。

## Answer

`npm test` 106 文件 / 1423 用例全绿（+1 文件 +10 用例）；`tsc --noEmit` 0 错误。

### 关键发现：autoBreakthrough 原是死开关

`automationSettings.autoBreakthrough` 在 tick 中从未被消费——突破循环是无条件的，设置项纯摆设。"开局即自动突破"的实质是"永远自动突破"。本工单把它变成真开关并加上境界门控。

### 解锁表（`data/automationUnlocks.ts`）

9 项自动化 × 三类解锁条件（境界 / Milestone 能力 / 飞升树节点），每项 `alwaysOn`（常驻逻辑无开关）或 settings 开关：
- 筑基(1)：装备自动最优、自动秘境托管（常驻）
- 元婴(3)：自动招募（常驻）、小境界自动突破（autoBreakthrough 开关）
- 化神(4)：大境界自动突破（新字段 `autoMajorBreakthrough`，缺省 false）
- 灵矿 Lv25：自动出售凡品（真实现：仓库 ≥80% 满时清理凡品装备入账 sellPrice）
- 灵田 Lv25：自动炼丹续产（真实现：`automationSettings.lastRecipes` 记忆上一配方，空队列自动续产）
- 天机推演节点：自动飞升（已有管线，面板接入）

### 消费点 gating（tickSlice）

- 小境界自动循环加 `autoBreakthrough && bestRealm >= 3`；循环内 `realmStage >= 3` 的大境界另需 `autoMajorBreakthrough && bestRealm >= 4`——前期突破由玩家手动决定（产品支柱"决定关键突破时机"）。
- 自动招募加 `bestRealm >= 3`。
- 境界突破时刻 `getAutomationsUnlockedAtRealm(realm)` 发解锁事件（"自动化解锁：XX——从此自动发生"）。

### 手动突破入口（新发现缺口，已补齐）

BreakthroughPanel 原为纯展示——门控后元婴前将无路可突破。新增 `attemptBreakthrough(characterId)` slice action（characterSlice，复用 processBreakthrough 全语义：消耗/事件/受伤/身死/里程碑/累加器）+ 面板"冲击突破/渡劫突破"按钮（含天劫警示与失败原因提示）。

### 默认值与旧档

新档 `autoBreakthrough: false` + `autoMajorBreakthrough: false`（initial.ts / SaveSystem 默认 / LegacySystem 重置三处）；旧档已存 true 保持不变（v13 读档不迁移偏好），但其实际自动行为自 bestRealm ≥ 3 起才生效——存量档均为中档局，无回退体验。

### 自动化面板（新组件 AutomationPanel，挂宗门页）

四组（修炼/生产/秘境/飞升）× 每项三态：锁定（展示解锁条件文案）/ 未开启 / 生效中；settings 类项配 44px 开关；常驻类解锁即"生效中"。清墨轻岚基线 CSS。

### 测试

AutomationRhythm 10 用例：解锁矩阵（境界/能力/节点）、三态、tick gating 矩阵（元婴前不自动、元婴后小境界自动、化神+开关才大境界）、手动突破成功/失败、凡品清扫入账、面板渲染与切换。存量 9 夹具更新：elder(4, training 态) 抬 bestRealm + 开关——境界经济耦合使灵石收入随 bestRealm 爆发，4 个绝对余额断言改为支出增量/尝试数断言（意图不变，收入无关）。

### 不做

- 自动招募提前（保持现有元婴解锁）；自动轮回（09 之前不存在证道）；面板美术重做。

## Acceptance

1. 单测：新档默认全关（除文档明确的筑基常驻项）；解锁矩阵逐格断言；旧档偏好保留。
2. UI：锁定/可开/已开三态与条件文案；解锁时刻高光触发。
3. `npm test` 全量绿。
