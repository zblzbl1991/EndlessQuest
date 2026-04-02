# 宗门位阶与弟子容量重构

## Goal
将宗门位阶从5档映射改为与大殿等级1:1对齐，同时调整弟子容量、冒险线数和品质解锁机制。

## Requirements
- 宗门位阶 = 大殿等级（去掉 SECT_LEVEL_TABLE 5档映射）
- 弟子容量 = 5 + level × 5（10/15/20/25/30/35/40/45/50/55）
- 同时冒险线数 = level（1~10 条）
- 品质解锁门槛：common=1, spirit=3, immortal=6, divine=9
- 普通招募品质概率随宗门等级变化（高等级有概率获得更高品质弟子）
- 保留混沌品质的随机升级机制（divine → chaos）

## Acceptance Criteria
- [ ] calcSectLevel 直接返回大殿等级
- [ ] SECT_LEVEL_TABLE 已移除
- [ ] getMaxCharacters 使用 5 + level * 5 公式
- [ ] getMaxSimultaneousRuns 返回 level
- [ ] 品质解锁门槛更新为 10 级体系
- [ ] 普通招募有品质概率系统
- [ ] 所有现有测试通过
- [ ] lint 和 typecheck 通过
- [ ] 大殿效果描述文本更新

## Technical Notes
- 主要改动文件：CharacterEngine.ts, buildings.ts, characterSlice.ts
- tickSlice.ts 的 sect level 计算逻辑已从大殿等级派生，会自动适配
- 需要更新测试中的 maxCharacters 等断言值
- legacy 系统（飞升重置）已有大殿/宗门重置逻辑，无需改动
