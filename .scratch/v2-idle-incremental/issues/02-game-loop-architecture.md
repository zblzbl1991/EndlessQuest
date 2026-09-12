# 02 主循环改造：simulate 纯函数 + GameLoop 三入口（P0-b）

Type: task
Status: resolved
Blocked by: 01

## Question

如何把 `sectStore.tickAll` 精炼为单一 `simulate(state, deltaSec)` 纯函数，让前台、后台恢复、读档离线三个入口共用同一条结算路径，同时替换 setInterval 调度并收紧存档节奏？（设计文档 §十二）

### 范围

1. **simulate 纯函数化**：`src/stores/sectStore/tickSlice.ts` 的 `tickAll(delta)` 重构为可独立调用、行为不变的模拟函数；暂停语义改为显式 delta（去掉 callback 内 return 的隐式约定，`App.tsx:119-122`）。
2. **GameLoop 类替换 IdleEngine**：requestAnimationFrame + 固定步长累加器（模拟步长 200ms，帧 delta 上限 250ms）；三入口——前台 rAF、可见性恢复 catch-up（≤120s 步进补算，>120s 闭式解快路径）、读档离线 catch-up（上限 24h 不变）；保留 30s setInterval 心跳兜底，心跳也走 catch-up 路径。
3. **离线事件补算（B7）**：离线期间随机事件从"roll 1 次"改为按 `λ = rate × duration` 泊松抽样决定次数再逐次 roll；`offlineAccumulator` 持久化到存档（修 `SaveSystem.ts:498-503` 清零丢失）。
4. **存档节流（B6）**：`startAutoSave.ts` write-through 500ms 改 dirty-flag + 5s 防抖；`visibilitychange`/`beforeunload` 立即 flush 保留。

### 不做

- Web Worker（决策：现阶段不需要，simulate 纯函数化后随时可移）。
- 闭式解的数学精细化（资源分段积分允许用"起止速率均值"一阶近似）。
- UI 改版（OfflineReportModal 展示字段留到 P1 闭关报告工单）。

## Acceptance

1. 单测：`simulate(state, 60)` 分 60×1s 步进与单次 60s 调用，资源/修为结果一致（确定性回归，随机事件用注入 RNG 排除）。
2. 单测：泊松抽样函数在 λ 固定时均值收敛（统计断言，容差内）。
3. 单测：`offlineAccumulator` 经存档/读档往返不丢失。
4. GameLoop：jsdom 下 rAF 驱动 N 帧后 sect 资源按预期增长；`document.hidden` 模拟切换后恢复会触发 catch-up。
5. `npm test` 全量绿。

## Answer

`npm test` 94 文件 / 1323 用例全绿（基线 90/1299）。

### GameLoop 替换 IdleEngine
- 新 `src/systems/idle/GameLoop.ts`，删除 `IdleEngine.ts`（App.tsx、CharactersPage.test 同步切换）。
- 前台：requestAnimationFrame + 固定步长累加器；**步长取 1000ms 而非设计稿的 200ms**——tickAll 单次成本高（700 行模拟）且生产队列语义以秒为粒度，200ms 意味着 5 倍 CPU 与 5 倍 React 订阅重渲染；先保行为等价，亚秒平滑显示留待 UI 插值方案。
- 帧增量上限 250ms（卡顿保护）；rAF 缺失环境（旧 WebView/部分测试 DOM）自动回退 250ms setInterval 驱动同一累加器。
- 三入口统一：`simulateElapsed()`（步进 ≤120s / 单次 onCatchUp >120s）、`catchUpToNow()`（visibility 恢复、30s 心跳）、读档离线（App 原有 `tickAll(offline)` 保留，同一条 simulate 链）。心跳只在可见时兜底，隐藏期时间完全交给恢复时 catch-up（与旧语义一致）。
- **暂停显式 delta**：`isPaused()` 为真时丢弃流逝时间并推进时间戳（帧与 catch-up 两处），App 回调不再做 paused-return，回调收到的 delta 必然被模拟。

### B7 离线事件泊松补算
- 新 `src/utils/poisson.ts`（Knuth 算法，可注入 RNG）。
- `RandomEventSystem.evaluateRandomEventsForDelta(sect, delta, last)`：期望次数 λ = 每秒概率 × delta（气运修正保留），泊松抽样，容量 = 1 + floor((delta−30)/30)（首事件立即可发，其后受最小间隔约束）；返回事件数组。旧单次 API 保留为委托（取首个）。
- `tickSlice` 改用 ForDelta 并循环结算多事件（资源/经验/顿悟/受伤逐事件应用，逐事件 emit）。

### offlineAccumulator 持久化
- `SaveSystem`：meta 写入 `offlineAccumulator`，读档经 `normalizeOfflineAccumulator` 恢复（旧档无此字段回退空值）。中途关弹窗/关页不再丢离线报告数据。

### 存档节流（B6）
- `startAutoSave`：500ms trailing-debounce（每秒被新 tick 重置、实际上在持续游玩时几乎不落盘的隐患）改为 leading 方式 5s 防抖；快照去重与 visibility/beforeunload 立即 flush 保留。

### 确定性回归测试（SimulateDeterminism.test.ts）
- 20×1s vs 1×20s、4×5s vs 2×10s 在资源/修为/累计时长/离线累积器上一致（1e-6 容差比较浮点尾数）。
- 随机排除：vi.mock RandomEventSystem 与 CultivationEventSystem；**夹具必须固定弟子资质**——reset() 会随机生成弟子（灵根 9 vs 11 曾导致两腿基准不同，±20% 速率差曾被误判为代码 bug）。
- 已知且接受的 delta 敏感项（未纳入断言）：xp 按tick floor、随机事件频率按 tick roll 的二阶效应、≥60s 走离线闭式解（设计如此）。

### 验收对照
1. ✅ 步进 vs 单次一致性（确定性回归）
2. ✅ 泊松均值收敛（λ=3，2 万样本 ±0.1）+ 零膨胀 + RNG 注入确定性
3. ✅ accumulator 存档往返 + 旧档回退
4. ✅ GameLoop：rAF 步进、暂停丢弃、可见性恢复步进补算、>120s 走 onCatchUp、24h 上限、rAF 回退
5. ✅ `npm test` 94/1323 全绿；eslint 0 error（19 条 warning 均为存量 no-explicit-any）
