# Phase 3: 增加宗门里程碑

## Goal

宗门里程碑从 3 个扩展到 15 个，覆盖弟子/境界/秘境/功法/特殊各类"第一次"。

## Parent PRD

详见 `.trellis/tasks/04-09-enrich-idle-surprise/prd.md` Phase 3 部分。

## Files to Modify

- `src/types/sect.ts` — ArchiveMilestoneId 联合类型扩展
- `src/data/archiveMilestones.ts` — 里程碑定义扩充
- `src/stores/sectStore/characterSlice.ts` — 招收时触发品质里程碑
- `src/stores/sectStore/tickSlice.ts` — 突破时触发境界里程碑
- `src/stores/adventureStore.ts` — 秘境完成时触发秘境里程碑
- `src/systems/idle/BreakthroughCoordinator.ts` — 渡劫成功里程碑（已有）

## Acceptance Criteria

- [ ] 里程碑 = 15 个
- [ ] 每个里程碑有中文名称和描述
- [ ] 触发点正确注入
- [ ] typecheck + lint 通过
- [ ] 现有测试通过
