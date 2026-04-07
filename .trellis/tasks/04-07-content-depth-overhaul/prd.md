# 游戏内容深度全面提升

## Goal
解决"架构完善但内容空洞"的核心问题——将已搭建好框架但未接入的系统连上、已有数据但未生效的内容激活、缺失的数据表补齐。

## 子任务（7个，可并行）

### P0: 敌人多样性 (04-07-enemy-diversity)
当前6个秘境只有3种敌人模板，战斗体验重复。需要：
- 为每个秘境设计 2-3 种专属敌人 + 1 个专属 Boss
- 丰富词缀池、技能分配、掉落表
- Boss 拥有独特技能组合

### P1: 宠物战斗集成 (04-07-pet-combat-integration)
`getPetCombatUnit()` 已实现但从未加入战斗队伍。需要：
- 在 AutoRunEngine 战斗流程中自动添加参战弟子携带的宠物
- 宠物作为额外 ally 单位参与战斗
- 御兽路线加成生效

### P1: 装备套装与随机词缀 (04-07-equipment-sets-affixes)
装备是纯数字堆叠，缺乏惊喜感。需要：
- 定义装备套装（3-5套），每套含 SetId + 套装效果（2件/4件）
- 装备掉落时随机分配套装 ID
- 随机词缀系统（装备生成时附加 0-2 个随机属性加成）

### P1: 功法参悟度 (04-07-technique-comprehension)
功法学会即满效果，无成长感。需要：
- 功法增加 comprehension 字段 (0-100%)
- 功法效果按参悟度比例缩放
- 参悟度通过修炼时间/使用次数缓慢增长
- 高参悟度解锁额外效果

### P2: 通用祝福遗物集成 (04-07-blessings-relics-integration)
8个通用祝福和4个通用遗物存在于数据中但从未集成。需要：
- 将通用祝福/遗物接入 RunBuildSystem 和 EventSystem
- 确保在秘境探索中有概率获得它们
- 它们的 rule 字段需要被解析和执行

### P2: 宗门路线效果生效 (04-07-sect-path-effects)
宗门路线节点数据存在（如 bossDmg: 1.3, petCombat: 1）但实际战斗/经济引擎中未读取。需要：
- 在 CombatEngine 中读取并应用 bossDmg 加成
- 在 PetSystem 中读取并应用 petCombat 加成
- 其他节点效果在各对应系统中生效

### P3: 关键时刻动画反馈 (04-07-key-moment-animations)
framer-motion 已声明依赖但从未使用。需要：
- 境界突破时的动画效果
- 秘境通关时的庆祝动画
- 稀有物品获得的视觉冲击

## Definition of Done
- 所有系统修改有对应测试
- Lint / typecheck 通过
- 不破坏现有存档兼容性
