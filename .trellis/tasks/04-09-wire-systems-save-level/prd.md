# Wire Disconnected Systems + Save Export + Disciple Level

## Goal

完善4个游戏体验痛点：弟子等级系统（核心）、存档导出导入、界面信息密度、技能自定义。

## Requirements (confirmed)

### R1: 弟子等级系统 (用户重点，全新机制)

**核心规则**：
- **品质决定每级属性倍率**：高品质弟子每级获得更多属性加成
- **境界决定等级上限**：修炼境界越高，可达到的等级上限越高
- **经验仅来自秘境探险**：修炼挂机不给经验，等级纯粹是实战积累
- **较快升级节奏**：一次8层秘境约升1-3级（新弟子），高等级后减慢

**数值设计**：
- 每层秘境固定经验 100 XP
- 升级曲线：Lv.N → Lv.N+1 需要 N * 100 XP（线性递增）
- 境界 → 等级上限对应：
  - 炼气(realm 0): Lv.10
  - 筑基(realm 1): Lv.20
  - 金丹(realm 2): Lv.30
  - 元婴(realm 3): Lv.40
  - 化神(realm 4): Lv.50
  - 渡劫飞升(realm 5): Lv.60
- 品质 → 每级属性加成：
  - common: +2 HP, +1 ATK, +1 DEF
  - spirit: +4 HP, +2 ATK, +2 DEF
  - immortal: +6 HP, +3 ATK, +3 DEF
  - divine: +8 HP, +4 ATK, +4 DEF
  - chaos: +12 HP, +6 ATK, +6 DEF
- 突破境界时自动检查：如果新等级上限 > 当前等级上限，解锁继续升级
- 现有 DungeonGrowthSystem 的 statBoost 改为通过升级实现

**数据变更**：
- Character 接口添加 `level: number`, `xp: number` 字段
- 存档迁移：旧存档加载时，基于已有 baseStats 和探险历史估算初始等级

### R2: 存档导出/导入 (P0)
- 导出为 JSON 文件下载（文件名含日期和宗门名）
- 导入从 JSON 文件恢复，校验数据完整性
- 导入前确认覆盖提示
- 导出内容包含所有7个 IndexedDB store

### R3: 界面信息密度优化
- CharacterDetail 核心列支持折叠
- 新弟子默认只展示关键信息，高级信息折叠
- 等级和经验进度在 CharacterCard 摘要中可见

### R4: 技能自定义 UI
- 允许玩家查看当前技能槽位和推荐理由
- 允许手动切换技能（从可用技能池中选择）
- 保持自动推荐为默认行为

## Acceptance Criteria

- [ ] 弟子有 level/xp 字段，秘境探险后获得经验并可能升级
- [ ] 境界限制等级上限，突破后解锁更高等级
- [ ] 同品质不同等级弟子出现属性差异
- [ ] 存档可以导出为 JSON 文件并成功导入恢复
- [ ] 角色详情页信息密度合理，核心列可折叠
- [ ] 技能槽位可手动调整
- [ ] 旧存档加载兼容（新字段有默认值）
- [ ] 现有测试全部通过

## Definition of Done

- Tests added/updated
- Lint / typecheck green
- 旧存档加载兼容（新字段有迁移逻辑）

## Out of Scope

- 新手引导系统
- 音效系统
- 战斗系统深度改造
- 宠物战斗接入

## Technical Notes

### 关键文件
- `src/types/character.ts` — Character 接口，添加 level/xp
- `src/systems/character/DungeonGrowthSystem.ts` — 改为给经验值+升级
- `src/data/realms.ts` — 添加 realmLevelCap 映射
- `src/systems/save/SaveSystem.ts` — 添加 export/import
- `src/pages/CharactersPage.tsx` — 界面密度优化 + 等级显示
- `src/components/common/CharacterCard.tsx` — 卡片添加等级信息
- `src/data/activeSkills.ts` — 技能自定义 UI 参考

### 数据迁移
- SaveSystem.loadGame() 需要处理缺少 level/xp 字段的旧角色
- 默认值：level = 1, xp = 0

### 经验获取流程
1. 秘境完成 → calcDungeonXP(floorsCleared) → 加到 character.xp
2. 检查是否满足升级条件：xp >= level * 100
3. 循环升级直到 xp 不足或达到等级上限
4. 每次升级：xp -= upgradeCost, level++, baseStats += qualityBonus
