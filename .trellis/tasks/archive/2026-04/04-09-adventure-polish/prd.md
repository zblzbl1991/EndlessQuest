# 秘境探险体验优化与数值平衡

## Goal
优化秘境探险的 UI 体验、修复战报 bug、调整秘境数值平衡。

## Requirements

### 1. 报告列表精简 + 可折叠
- "最近探索记录" 整个 section 改为 `<details>` 可折叠
- 每条记录精简为：秘境名 + 队伍简要 + 结果badge + 层数 + 收获一行 + 查看详情链接
- 移除：战术行、回宗行、构筑与转折折叠区、RunBuildSummary
- 详情信息全部移到详情页

### 2. 修复普通战斗回合明细为空
- Bug: AutoRunEngine.ts 构建 combat stepMeta 时未设置 `enemyUnit`
- 修复: 从 EventResult 的 `enemyUnitSnapshot` 传递到 stepMeta

### 3. 移除 Boss 战前对比
- BossCombatReport 组件中的 "战前对比" 区块（bossCompareGrid）整体移除
- 保留：胜负结果、关键转折、回合明细、伤害统计

### 4. 增加秘境数量均衡数值
- 当前 6 个秘境跨 6 个大境界，中间差距大
- 在每两个现有秘境之间各加 1 个过渡秘境，共新增 5 个
- 新秘境的层数、敌人数值、解锁条件平滑过渡

## Acceptance Criteria
- [ ] 报告列表默认折叠，展开后每条记录紧凑（≤3行核心信息）
- [ ] 普通战斗详情中能看到完整的回合明细
- [ ] Boss 战报中无"战前对比"区块
- [ ] 新增 5 个过渡秘境，数值曲线平滑
- [ ] 所有现有测试通过
- [ ] lint + typecheck 通过

## Technical Notes
- Bug fix: AutoRunEngine.ts line 386 添加 `stepMeta.enemyUnit = eventResult.enemyUnitSnapshot`
- 新秘境需要同步更新: events.ts (DUNGEONS), enemies.ts (DUNGEON_ENEMY_MAP + EnemyTemplate)
- CSS 调整集中在 AdventurePage.module.css
