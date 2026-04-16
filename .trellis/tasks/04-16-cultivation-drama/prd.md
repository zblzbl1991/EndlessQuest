# 修炼戏剧性与突破梯度

## Goal

让修炼从"匀速直线运动"变成有波峰波谷、有惊喜和紧张的体验。核心改动三块：
1. 修炼过程中引入随机事件（顿悟、瓶颈、散功期）
2. 突破结果从二元（成功/死亡）变为梯度（大获、小成、受阻、受伤、倒退）
3. 弟子面板增加纵向成长对比，让玩家感知"变强了多少"

## Requirements

### R1: 修炼方差事件系统

**现状**：`CultivationEngine.tick()` 返回 `rate * deltaSec`，纯线性。

**改为**：在每次 tick 中有概率触发修炼事件：
- **顿悟**（约 0.3% 概率/tick）：修为暴涨，获得 5~30 分钟的等价修为。高悟性弟子概率略高。
- **瓶颈**（约 0.2% 概率/tick）：修为停滞 1~5 分钟，期间修为获取归零。突破瓶颈时获得短暂加速。
- **散灵期**（约 0.1% 概率/tick）：修为缓慢流失（正常速率的 -30%），持续 3~10 分钟。需要资源消耗或等待恢复。

实现方式：
- 新增 `CultivationEventSystem.ts`，纯函数系统
- 事件状态存储在 `Character` 上新增的 `cultivationEvent?: { type, remainingTicks }` 字段
- `tickSlice.ts` 中的 cultivation tick 调用事件系统计算实际修为
- 事件触发通过 `emitEvent` 发出通知

### R2: 突破梯度

**现状**：突破只有成功（境界+1）和失败（弟子死亡）。

**改为**：突破结果为 5 级梯度：
- **大获**（~10%）：跳过一个小境界（如从练气 3 直接到练气 5），额外属性加成
- **小成**（~50%）：正常突破，境界+1
- **受阻**（~20%）：突破失败但不死，修为回退到 70%，可以再次尝试
- **重伤**（~15%）：突破失败，弟子进入受伤状态（`injured`），需要恢复时间
- **陨落**（~5%）：弟子死亡（仅大境界突破才有此可能）

实现方式：
- 修改 `BreakthroughCoordinator.ts` 中的结果判定逻辑
- 新增 `BreakthroughResult` 类型：`'great_success' | 'success' | 'blocked' | 'injured' | 'fallen'`
- 大境界突破才有 `fallen` 可能，小境界突破最高为 `injured`
- 受伤弟子进入 `injured` 状态，`tickSlice.ts` 中处理恢复逻辑
- 玩家可以通过资源消耗（灵丹/灵石）降低风险

### R3: 纵向成长对比

**现状**：弟子面板有 20+ 字段但无法感知变化。

**改为**：
- `Character` 新增 `milestoneSnapshots: Record<realm, CharacterStats>` 字段
- 每次突破时自动保存当前属性的快照
- 弟子详情页增加"成长轨迹"区域：展示最近 3 个境界的属性变化（Δ数值和百分比）
- 宗门总览显示弟子"本期变化摘要"

## Acceptance Criteria

- [ ] 修炼过程中有可见的事件触发（顿悟/瓶颈/散灵期），UI 有对应提示
- [ ] 突破结果有 5 级梯度，不再只有成功和死亡
- [ ] 受伤弟子有恢复周期，恢复后可再次突破
- [ ] 大境界突破有资源降低风险的选项
- [ ] 弟子详情页能看到属性成长轨迹（至少最近 3 个境界的变化）
- [ ] 现有存档兼容：新字段有默认值，旧存档可加载
- [ ] 所有修改有测试覆盖
- [ ] lint + typecheck 通过

## Technical Notes

### 关键文件
- `src/systems/cultivation/CultivationEngine.ts` — 修炼 tick 逻辑
- `src/systems/cultivation/BreakthroughCoordinator.ts` — 突破协调
- `src/systems/cultivation/TribulationSystem.ts` — 天劫
- `src/stores/sectStore/tickSlice.ts` — 游戏循环
- `src/types/character.ts` — Character 接口
- `src/stores/sectStore/characterSlice.ts` — 弟子状态变更
- `src/components/character/` — 弟子 UI 组件
- `src/pages/CharacterDetailPage.tsx` — 弟子详情页

### 数据兼容
- `cultivationEvent` 字段可选，默认 `undefined`
- `milestoneSnapshots` 字段可选，默认 `{}`
- 旧存档加载时无需迁移，可选字段自动为 undefined

### 风险控制
- 顿悟/瓶颈/散灵期的概率和持续时间需要可在数据表中调整
- 保留现有"自动突破"逻辑，事件系统对自动化透明
- 修炼事件不影响离线计算性能（事件概率足够低，不影响总体趋势）
