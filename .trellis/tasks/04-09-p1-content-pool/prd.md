# Phase 1: 扩充随机内容池

## Goal

扩充功法（12→30）、天赋（12→30，保持3档稀有度）、命格（10→20）、技能（8→16），每个都有叙事描述。

## Parent PRD

详见 `.trellis/tasks/04-09-enrich-idle-surprise/prd.md` Phase 1 部分。

## Files to Modify

- `src/data/techniquesTable.ts` — 新增 18 本功法
- `src/data/talents.ts` — 新增 18 个天赋 + 补充现有描述
- `src/data/fateGrids.ts` — 新增 10 个命格 + FateGridId 类型更新
- `src/data/activeSkills.ts` — 新增 8 个技能
- `src/types/index.ts` — FateGridId re-export 可能需要更新

## Acceptance Criteria

- [ ] 功法 = 30，同品质加成总和与现有功法接近
- [ ] 天赋 = 30，每个有叙事描述
- [ ] 命格 = 20，含新类别
- [ ] 技能 = 16
- [ ] typecheck + lint 通过
- [ ] 现有测试通过
