# 战斗可视化

## Goal

让战斗从"黑箱"变为可感知的体验。战斗数据已经完整存在于 `CombatResult.actions[]`，但从未以叙事形式呈现给玩家。核心改动：
1. 战报页新增"战斗回放"区域，以回合制叙事文本呈现关键战斗
2. 提取战斗中的"高光时刻"（残血翻盘、暴击秒杀、五行克制关键一击）
3. 五行克制阵容提示（战前展示我方阵容 vs 敌方五行的克制关系）

## Requirements

### R1: 战斗叙事提取系统

**现状**：`CombatResult.actions[]` 包含完整的逐回合行动数据，但只在报告的 `meta` 字段中存储，无 UI 展示。

**改为**：新增 `CombatNarrativeSystem.ts`，从 `actions[]` 提取叙事文本：
- 每场战斗生成 3~8 句叙事文本（非逐回合全量，而是关键回合）
- 关键回合判定：暴击、击杀、五行克制、残血（HP < 20%）、绝地反击（HP < 10% 后获胜）
- 每句叙事包含：角色名、行动描述、效果描述
- 输出格式：`CombatNarrative { highlights: CombatHighlight[] }`

### R2: 战报页战斗回放区域

**现状**：战报页 (`AdventureReportPage`) 展示文字总结和战利品，无战斗过程。

**改为**：
- 战报中每场战斗步骤可展开查看战斗回放
- 回放以"叙事文本卡片"形式展示（非逐帧动画，保持水墨风格）
- 高光时刻用印泥色（`--color-accent`）高亮
- 战斗结果区域展示简化 HP 变化条（双方）

### R3: 五行克制阵容提示

**现状**：自动组队不考虑五行克制，玩家无法针对敌人五行调整。

**改为**：
- 远征出发前，阵容选择区展示"五行克制概览"
- 显示我方阵容的五行分布 vs 已知敌人五行倾向（基于上次通关记录）
- 用颜色标注优势（绿）和劣势（红）五行
- 纯信息展示，不强制玩家操作（保持"少指挥，多呈现"原则）

## Acceptance Criteria

- [ ] 战报页可展开查看战斗叙事（3~8 句关键回合描述）
- [ ] 高光时刻（暴击、击杀、残血翻盘）有视觉区分
- [ ] 远征出发前可看到五行克制概览
- [ ] 战斗叙事不影响自动战斗性能（纯后处理，事后生成）
- [ ] 水墨风格一致，不引入 MMO 式战斗特效
- [ ] lint + typecheck 通过

## Technical Notes

### 关键文件
- `src/systems/combat/CombatEngine.ts` — 战斗引擎，输出 `CombatResult`
- `src/types/adventure.ts` — `AdventureReportStep`, `CombatResult` 类型
- `src/pages/AdventureReportPage.tsx` — 战报页
- `src/components/adventure/` — 远征相关组件
- `src/data/realms.ts` — 五行数据

### 性能考虑
- 战斗叙事在报告生成时一次性提取并存储，不实时计算
- 叙事文本控制在 200 字以内，不影响 IndexedDB 存储大小
