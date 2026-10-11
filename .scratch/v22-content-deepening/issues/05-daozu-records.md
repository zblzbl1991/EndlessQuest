# 05 道祖榜：本地自比记录（替代排行榜）

Type: task
Status: resolved
Blocked by: —（无依赖，实际最后执行）
Assignee: zcode (2026-10-11)

## Question

如何用零后端的**本地自比**兑现排行榜的设计意图（map 决策 2）：玩家与自己历史最快/最强对比，保留"追求纪录"的钩子？

### 范围

1. **纪录定义**（stats 扩展，跨飞升/证道保留）：最快渡劫（首次到达渡劫期的游戏日数）、最快道祖、单世最高道韵、单世最高修为峰值、证道轮次数。新纪录达成时事件高光（"打破纪录！"）。
2. **道祖榜面板**：宗门统计分区（现有展开区）内加"自我基准"表：当前轮 vs 历史最佳（逐项对比，当前运行中的用"进行中"标注）。
3. **落点复用**：纪录判定挂境界突破/飞升/证道既有结算点；数据全部进 `SectStats`（已有 peakCultivationThisRun 先例），v16 或复用工单 04 的 v16 一次搞定版本号。
4. 单测：纪录判定与打破逻辑、跨轮回保留、面板数据正确。

### 不做

- 跨设备同步、账号体系、任何网络功能。

## Acceptance

1. 单测：纪录判定（更快→更新+事件；更慢→保留）、跨轮回保留、旧档兼容。
2. UI：基准表渲染（GUI 冒烟）。
3. `npm test` 全量绿。

## Answer

`npm test` 115 文件 / 1517 用例全绿（+1 文件 +8 用例）；`tsc --noEmit` 0 错误。

### 纪录定义（4 项 + 1 镜像）

最快渡劫 / 最快道祖（累计游戏秒，更小更好）｜单世最高道韵 / 单世最高修为峰值（跨轮回保留，与 peakCultivationThisRun 的本世清零语义互补）｜证道次数（镜像字段，证道时直接写入不经 attemptRecord）。`attemptRecord(stats, key, value)`：0 = 未创建（任何正值成立）、打破返回旧值供事件文案。

### 判定挂点

- 境界突破到 8/12（tickSlice 突破成功处）：秒表 = totalPlayTime + delta，打破发"打破纪录！"高光事件；
- 飞升结算（legacySlice.performAscension）：bestDaoYunGain / bestPeakCultivation；
- 证道结算（legacySlice.proveDao）：daoProvingCount 镜像写入。

### UI

StatsPanel（宗门统计展开区）新增"自我基准 · 道祖榜"表：4 项纪录（未创建显示 —）+ 证道次数。

### 持久化

SectStats 可选字段随 stats 整对象持久化（既有管线），零迁移。

### 测试

DaozuRecords 8 用例：首次创建/打破返回旧值/更慢不破/递增型/未知 key/readRecords 缺省、面板渲染与格式化值。
