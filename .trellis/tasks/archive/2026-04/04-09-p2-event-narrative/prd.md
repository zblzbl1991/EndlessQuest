# Phase 2: 丰富事件日志文案

## Goal

给所有 emitEvent 调用增加叙事场景描述，修复 mojibake 和英文消息，让日志读起来像故事。

## Parent PRD

详见 `.trellis/tasks/04-09-enrich-idle-surprise/prd.md` Phase 2 部分。

## Files to Modify

- `src/data/eventTexts.ts` — 新增：事件文案模板函数
- `src/systems/idle/BreakthroughCoordinator.ts` — 突破文案
- `src/stores/sectStore/characterSlice.ts` — 招收弟子文案
- `src/stores/sectStore/buildingSlice.ts` — 建筑 mojibake 修复 + 文案
- `src/stores/adventureStore.ts` — 秘境文案
- `src/stores/sectStore/tickSlice.ts` — 路线分配文案修复

## Acceptance Criteria

- [ ] 所有 emitEvent 消息包含叙事场景描述
- [ ] 零英文事件消息，零 mojibake
- [ ] typecheck + lint 通过
- [ ] 现有测试通过
