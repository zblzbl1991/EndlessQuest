# Core Product Overhaul — 完成总结

> **日期：** 2026-03-30
> **状态：** 已完成并归档
> **关联计划：** `plans/2026-03-27-core-product-overhaul-roadmap.md`
> **关联设计：** `specs/2026-03-27-core-product-overhaul.md`

---

## 概述

2026-03-27 至 2026-03-29 期间，按 roadmap 完成了全部 8 个 Task 的实现。共 72 个 commit，将 EndlessQuest 从"有骨架的原型"推进到"具备行动引导、秘境构筑、弟子命运、宗门路线的完整产品"。

---

## 已完成工作

### Task 1: 统一角色状态模型
- **Commit:** `1d74a21` feat: merge cultivating/secluded into idle with auto-cultivation
- **内容:** 移除 `cultivating`/`secluded` 状态，统一为 `idle`(自动修炼)、`training`(建筑指派)、`patrolling`(派遣)、`adventuring`(秘境)。更新全站筛选逻辑和状态徽章。

### Task 2: SectPage 行动仪表盘
- **Commit:** `56190fb` feat: add action agenda dashboard to SectPage
- **内容:** 新增 `ActionAgenda` 组件，展示突破候选、建筑升级、秘境推荐 3 张优先级卡片。重新组织 SectPage 信息层级：要务 → 任务 → 资源 → 关键弟子。新增 sectStore 派生 selector。

### Task 3: 战术预设
- **Commit:** `8ed6d3b` feat: add tactical presets for adventure teams
- **内容:** 新增 `TacticPresetPicker` 组件和 4 种预设（保守续航/均衡推进/爆发速攻/首领克制）。CombatEngine 按预设调整目标选择、灵力消耗、技能使用策略。新增 `runBuild.ts` 类型定义。

### Task 4: 祝福、遗珍、道途分支
- **Commit:** `bc71890` feat: add run build layer to adventure
- **内容:** 新增 8-12 个祝福、4-6 个遗珍定义。新增 `RunBuildSystem` 管理局内构筑状态。EventSystem 扩展分支奖励。AdventurePage 展示当前构筑摘要。

### Task 5: 弟子角色与岗位价值
- **Commit:** `bf91a7f` feat: show disciple role and assignment value
- **内容:** 新增专长→角色推荐 helper（炼丹推荐炼丹房、战斗/机缘推荐秘境）。CharacterCard 和 CharactersPage 展示角色定位和适配建筑。BuildingsPage 提示最佳弟子匹配。

### Task 6: 命运标签
- **Commit:** `8394568` feat: add disciple fate tags for breakthrough outcomes
- **内容:** 新增 4 个命运标签（天劫伤痕/心魔种子/顿悟/道心稳固）。FateSystem 在突破和渡劫时应用标签。BreakthroughPanel 展示风险预览和命运后果。标签持久化到角色存档。

### Task 7: 宗门路线
- **Commit:** `9f143b4` feat: add sect route progression
- **内容:** 新增 3 条宗门路线（丹道宗/剑道宗/御兽宗），各含 5-7 个解锁节点。SectRouteSystem 计算路线效果。SectPage、BuildingsPage、AdventurePage 展示路线身份和下次解锁。

### Task 8: 宗门历史里程碑
- **Commit:** `4bdb944` feat: add sect history milestones for dungeon, tribulation, and boss clears
- **内容:** 新增宗门历史字段，记录首次稀有招募、首次渡劫成功、首次 boss 通关等里程碑。EventLogPage 展示里程碑列表。持久化到主存档。

---

## 新增文件清单

| 文件 | 用途 |
|------|------|
| `src/components/sect/ActionAgenda.tsx` | 修行要务卡片组件 |
| `src/components/sect/ActionAgenda.module.css` | 样式 |
| `src/types/runBuild.ts` | 祝福、遗珍、战术预设类型 |
| `src/data/blessings.ts` | 祝福定义 |
| `src/data/relics.ts` | 遗珍定义 |
| `src/data/sectRoutes.ts` | 宗门路线定义 |
| `src/data/fateTags.ts` | 命运标签定义 |
| `src/data/archiveMilestones.ts` | 里程碑定义 |
| `src/systems/roguelike/RunBuildSystem.ts` | 局内构筑系统 |
| `src/systems/character/FateSystem.ts` | 命运标签系统 |
| `src/systems/sect/SectRouteSystem.ts` | 宗门路线系统 |
| `src/components/adventure/TacticPresetPicker.tsx` | 战术预设选择器 |
| `src/components/adventure/TacticPresetPicker.module.css` | 样式 |
| `src/components/adventure/RunBuildSummary.tsx` | 构筑摘要 |

---

## 未完成 / 待改进

- Roadmap 底部 Verification Checklist 未执行（全量测试 + 手动验证 + 存档迁移确认）
- Task 2 Step 8、Task 8 Step 7 的 commit 勾选未更新（实际已提交）
- 部分系统为第一版最小实现，后续可深化：
  - 祝福/遗珍池可扩展
  - 宗门路线节点效果可更丰富
  - 命运标签效果可更多维

---

## 下一步

详见 `specs/2026-03-29-character-progression-design.md`（角色成长深度设计，P2 优先级）。
