# Phase 4: 挂机随机事件系统

## Goal

新增 tick 期间触发的随机事件系统（≥20种），让挂机期间有意料之外的惊喜。

## Parent PRD

详见 `.trellis/tasks/04-09-enrich-idle-surprise/prd.md` Phase 4 部分。

## Files to Create

- `src/data/randomEvents.ts` — 随机事件数据表
- `src/systems/idle/RandomEventSystem.ts` — 事件触发与执行逻辑

## Files to Modify

- `src/types/` — 新增 RandomEvent 相关类型
- `src/stores/sectStore/tickSlice.ts` — tick 循环中加入随机事件触发
- `src/stores/eventLogStore.ts` — 新增 random_event 事件类型

## Acceptance Criteria

- [ ] 随机事件 ≥ 20 种，4 级稀有度
- [ ] 约 50 分钟触发一个事件（可被机缘属性影响）
- [ ] 事件效果通过现有 store actions 施加
- [ ] 事件通过 emitEvent 记录到日志
- [ ] typecheck + lint 通过
- [ ] 现有测试通过
