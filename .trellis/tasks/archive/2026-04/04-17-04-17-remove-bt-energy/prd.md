# Remove Spirit Energy from Breakthrough Cost

## Goal

移除境界突破的灵气消耗要求。修炼（tick）仍消耗灵气，但突破只检查灵石和灵草，不再要求灵气。玩家反馈灵气始终无法满足突破条件，导致突破卡死。

## Requirements

- 突破资源检查中移除灵气（spiritEnergy）条件
- `BreakthroughResourceCost` 类型中 `spiritEnergy` 字段保留但值设为 0（保持向后兼容）
- BreakthroughPanel UI 不再显示灵气需求
- `breakthrough_blocked` 事件不再提示灵气不足
- tickSlice 中不再扣除突破灵气消耗

## Acceptance Criteria

- [ ] 突破只检查灵石 + 灵草，不再检查灵气
- [ ] BreakthroughPanel 不显示灵气需求行
- [ ] 所有测试通过
- [ ] 类型检查通过

## Definition of Done

- Tests added/updated
- Lint / typecheck green
- 存档兼容（旧数据无需迁移）

## Out of Scope

- 修炼 tick 中的灵气消耗（保持不变）
- 灵石和灵草的突破消耗逻辑
- 灵气系统的其他用途

## Technical Approach

1. `realms.ts`: `MINOR_BREAKTHROUGH_ENERGY_COSTS` 表保留但所有值设为 0；`BREAKTHROUGH_COSTS` 中 `spiritEnergy` 设为 0；`getBreakthroughResourceCost` 返回 spiritEnergy: 0
2. `BreakthroughCoordinator.ts`: 移除灵气资源检查逻辑（remainingEnergy、blockedResources 中的灵气检查）
3. `tickSlice.ts`: 移除 breakthroughEnergyCost 追踪和扣除
4. `BreakthroughPanel.tsx`: 移除灵气需求显示
5. 更新相关测试

## Technical Notes

- `BreakthroughResourceCost.spiritEnergy` 字段保留为 0 而非删除，避免破坏接口兼容
- `getBreakthroughResourceCost` 仍返回完整对象，只是 spiritEnergy=0
- `processBreakthrough` 参数 `availableSpiritEnergy` 保留（不改变签名），只是内部不再用它做门槛判断
