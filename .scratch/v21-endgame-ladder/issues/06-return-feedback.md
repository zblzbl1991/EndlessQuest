# 06 回访反馈最小版：ETA / 瓶颈诊断 / 变化摘要

Type: task
Status: resolved
Blocked by: 05
Assignee: zcode (2026-09-13)

## Question

如何在 30~90 秒的回访会话里让玩家立刻看到"宗门发生了什么、下一步等什么"？（第一性原理审查第 4 条：全 UI 现无任何预计耗时显示；设计原则"少指挥，多呈现"——呈现瓶颈与 ETA，不做任务清单）

### 范围

1. **宗门页"现状与瓶颈"卡**（挂机总控台顶部区域，清墨轻岚基线内）：
   - 距下次小境界突破 / 大境界突破的预计时间（速率 / 缺口，Decimal 感知格式：`约 3 小时` / `约 2 天`）；
   - 距下一建筑 Milestone 的预计时间与所需资源；
   - 当前主要瓶颈一句话归因（灵气供给不足 / 灵石缺口 / 弟子伤病因素——复用 `ArchetypeBottleneckAdvisor` 的判定，不新造一套）；
   - 灵气供给比低于阈值时高亮警示。
2. **距上次访问变化摘要**：离线报告头部（现有 OfflineReport 入口）增加"自上次拜访"段：境界变化、道韵/资源倍数（×N）、关键事件 Top3——数据源 offlineAccumulator（已持久化）。
3. **离线报告尾部"下次上线时"建议 1~3 条**：由瓶颈判定生成（"聚灵阵距 Lv10 里程碑还差 2 级""张三即将渡劫，建议确认突破时机"），可点击跳转对应页。
4. 移动端单列 / 桌面端与既有摘要并排（响应式基线不动）；数字一律 formatNumber 双模式。

### 不做

- 境界-时间曲线图（后续 UI effort）；闭关报告完整版统计（Out of scope）；弹窗改造。

## Acceptance

1. 组件测试：ETA 计算（速率/缺口 → 人性化时长，含 0 速率、Infinity 缺口兜底）、瓶颈归因优先级、变化摘要字段、建议生成规则（含空态）。
2. 布局：移动/桌面两档快照（现有截图测试管线若有）或断言类名/结构不破坏响应式基线。
3. `npm test` 全量绿。

## Answer

`npm test` 107 文件 / 1434 用例全绿（+1 文件 +11 用例）；`tsc --noEmit` 0 错误。

### ProgressForecast 纯函数模块（systems/cultivation/）

- `forecastNextBreakthrough(sect)`：全宗 idle 弟子中"最快抵达下一次突破"者——ETA = 缺口 / (calcCultivationRate × 主导乘区 × spiritRatio)，返回 { characterName, fromName, toName, isMajor, etaSeconds, spiritRatio }；目标名用 getRealmName（大境界显示"（渡劫）"）。
- `forecastNextMilestone(sect)`：全建筑中最近的可达成里程碑——成本 = Generator 逐级 safeExpCost 累加（服务型多项式近似），ETA = 成本 / getApproxStoneIncome。
- `formatEta`：1 分钟内 / 约 X 分钟 / 约 X 小时 / 约 X 天 / 30 天以上 / 无法预估（Infinity）。
- **乘区抽取防漂移**：`getBuildingCultivationMult`（藏经阁 × Milestone 修炼）从 tickSlice 抽出为本模块导出，tickSlice 改为消费方；`getApproxStoneIncome` 含境界经济耦合 + 飞升树 + Milestone 主导乘区（注释声明快速近似，不含指派/协同/灵潮，误差不改变 ETA 数量级）。

### 宗门页"现状与前瞻"卡（SectOutlookCard）

修炼行（弟子 → 目标 · ETA）+ 建筑行（灵田 Lv10 里程碑 · 名称 · ETA（成本））+ 灵气供给比 < 0.9 时警示标签"灵气供给 X%，实际会比预估更慢"（工单 04 瓶颈的在线侧呈现）。挂宗门页 hero 之后独立 section；移动端 ETA 换行对齐（44px 触控不适用——纯展示卡）。

### 离线报告升级

- **"自上次拜访"段**（visitSummary）：境界变化 Top3（accumulator.breakthroughs 尾取 3，targetRealm "r-s" → getRealmName 转中文名，成功/受挫分色）+ 资源倍数（四资源 gained / 当前存量，≥0.05 显示"约 ×N 现存"）。
- **"下次上线时"建议**（原"下一步建议"升级）：nextSuggestion 保留 + `suggestions` 数组（diagnoseSectBottlenecks top2 排除"平稳"项）渲染为可点击按钮——关闭报告并 navigate 到对应页（复用瓶颈卡的 link 语义：/buildings、/characters、/adventure）。
- App.tsx 组装 `buildVisitSummary(sect, acc)` + suggestions；Modal 内 useNavigate（Router 上下文内渲染）。

### 存量测试更新

OfflineReportModal.test（4 处）与 SpiritBottleneck.test（2 处）render 包 MemoryRouter（Modal 新增 useNavigate 所需）；ReturnFeedback 11 用例覆盖 formatEta 分级、前瞻选择逻辑（最快弟子/渡劫目标/null 态）、里程碑预测（成本>0、满档退化）、宗门卡渲染与灵气警示、拜访摘要渲染（×2.3 现存）、建议点击回调、空态不渲染。
