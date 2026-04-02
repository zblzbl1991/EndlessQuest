# Requirements: EndlessQuest — Character Progression Depth (P2)

**Defined:** 2026-04-02
**Core Value:** 玩家用很少的操作完成真实的经营判断、弟子培养和单局冒险押注

## v1 Requirements

### Foundation

- [ ] **FOUND-01**: `generateCharacter()` 调用 `rollSpecialties()` 并将结果持久化到角色实例上
- [x] **FOUND-02**: 品质标签/品质顺序统一定义在单一源文件中，所有 7 处重复定义替换为 import
- [ ] **FOUND-03**: 存档系统增加版本号检查，新 Character 字段有明确的迁移默认值
- [ ] **FOUND-04**: `tickSlice.ts` 突破逻辑提取为独立纯函数，支持钩子列表扩展
- [ ] **FOUND-05**: `adventureStore.ts` 中 2 处乱码中文字符串替换为正确中文文本
- [ ] **FOUND-06**: `getRunBuildBiasContext` 和 `getSectLevel` 重复实现合并为共享工具函数

### Identity

- [ ] **IDEN-01**: 玩家在弟子首次大境界突破时选择修炼路线（剑/体/丹/兽/阵/虚），离线突破默认剑道
- [ ] **IDEN-02**: 修炼路线决定元素亲和（剑=雷、法=火/冰、体=无等），通过查找表自动派生
- [ ] **IDEN-03**: 元素亲和在战斗中为匹配元素技能提供伤害加成
- [ ] **IDEN-04**: 角色根据境界里程碑自动晋升称号（弟子→外门→内门→长老），称号提供属性加成
- [ ] **IDEN-05**: 称号晋升事件记录到宗门历史日志

### Skill System

- [ ] **SKILL-01**: 技能获取系统支持 4 种来源：修炼路线解锁、功法参悟里程碑、冒险事件奖励、特殊天赋
- [ ] **SKILL-02**: 角色拥有技能装备栏（最多 5 个槽位），玩家可选择装备哪些已获得的技能
- [ ] **SKILL-03**: 离线/自动模式下 `buildCharacterSkillLoadout()` 自动填充最优技能组合
- [ ] **SKILL-04**: 修炼路线专属技能在对应境界自动解锁（剑道-剑气斩等 stat-based 技能）

### Pet & Combat

- [ ] **PETC-01**: 宠物在冒险队伍组建时作为独立战斗单元参战，使用 `getPetCombatUnit()`
- [ ] **PETC-02**: 兽道路线弟子获得宠物属性加成（petPower 字段已在路线数据中定义）
- [ ] **PETC-03**: `createCharacterCombatUnit` 移除 deprecated 标记，正式集成到战斗流程

### Technique Progression

- [ ] **TECH-01**: 功法拥有 0-100% 参悟度，在藏书阁学习时按 tick 递增
- [ ] **TECH-02**: 参悟度达 50% 和 100% 时触发里程碑事件，记录到宗门日志
- [ ] **TECH-03**: 参悟度达指定阈值时解锁对应的主动技能
- [ ] **TECH-04**: 旧存档加载时，已学习功法自动设为 100% 参悟度

### Equipment

- [ ] **EQUIP-01**: 精炼系统 UI 接入 BuildingsPage 锻造面板，调用已有 `refineEquipment()` 后端
- [ ] **EQUIP-02**: 装备详情面板展示精炼属性和精炼等级
- [ ] **EQUIP-03**: 套装加成系统：4 套元素主题套装（雷/霜/焰/玉），2 件和 4 件阈值
- [ ] **EQUIP-04**: `calcCharacterTotalStats()` 计算并应用当前装备的套装效果

### Talent & Fate

- [ ] **TALN-01**: 新增 3-4 个机制型天赋（fortune_star 掉落加成、quick_learner 参悟加速、daoxin_stable 突破保护）
- [ ] **TALN-02**: 机制型天赋集成到对应子系统（掉落表、参悟系统、突破系统）
- [ ] **TALN-03**: 命运标签扩展新效果维度（修炼速度修正、事件攻击性、防掉级）
- [ ] **TALN-04**: 命运标签新效果集成到对应子系统

## v2 Requirements

### Combat Engine Extension

- **CMEXT-01**: CombatEngine 支持 AoE 技能（同时攻击多个目标）
- **CMEXT-02**: CombatEngine 支持冰冻/减速状态效果
- **CMEXT-03**: CombatEngine 支持反弹伤害机制
- **CMEXT-04**: CombatEngine 支持 phoenix_blood 天赋的复活机制
- **CMEXT-05**: 修炼路线终极技能（mechanical 类型）实现

### Content Expansion

- **CNTEX-01**: 3-4 个元素主题地牢（配合套装掉落）
- **CNTEX-02**: 套装专属地牢掉落逻辑
- **CNTEX-03**: 更多修炼路线专属技能（mechanical 类型）
- **CNTEX-04**: 更多机制型天赋（beast_whisper 等）

## Out of Scope

| Feature | Reason |
|---------|--------|
| 修炼路线重选/洗点 | 破坏"不可逆选择"设计原则 |
| 复杂技能树 | 与放置游戏理念冲突，用固定槽位装备代替 |
| 独立元素选择 | 元素应从路线派生，保持主题一致性 |
| 宠物繁殖/融合 | 复杂度过高，偏离核心循环 |
| 精炼失败/物品摧毁 | 放置游戏应尊重玩家时间 |
| 每日进度上限 | 与"离线进步"放置哲学矛盾 |
| 综合战力评分 | 减少策略深度，鼓励无脑堆数 |
| 天赋重抽 | 天赋应定义角色个性，不可更改 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1: Foundation | Pending |
| FOUND-02 | Phase 1: Foundation | Complete (01-02) |
| FOUND-03 | Phase 1: Foundation | Pending |
| FOUND-04 | Phase 1: Foundation | Pending |
| FOUND-05 | Phase 1: Foundation | Pending |
| FOUND-06 | Phase 1: Foundation | Pending |
| IDEN-01 | Phase 2: Character Identity | Pending |
| IDEN-02 | Phase 2: Character Identity | Pending |
| IDEN-03 | Phase 2: Character Identity | Pending |
| IDEN-04 | Phase 2: Character Identity | Pending |
| IDEN-05 | Phase 2: Character Identity | Pending |
| SKILL-01 | Phase 3: Skill Loadout | Pending |
| SKILL-02 | Phase 3: Skill Loadout | Pending |
| SKILL-03 | Phase 3: Skill Loadout | Pending |
| SKILL-04 | Phase 3: Skill Loadout | Pending |
| PETC-01 | Phase 4: Pet & Refinement Integration | Pending |
| PETC-02 | Phase 4: Pet & Refinement Integration | Pending |
| PETC-03 | Phase 4: Pet & Refinement Integration | Pending |
| EQUIP-01 | Phase 4: Pet & Refinement Integration | Pending |
| EQUIP-02 | Phase 4: Pet & Refinement Integration | Pending |
| TECH-01 | Phase 5: Technique Comprehension | Pending |
| TECH-02 | Phase 5: Technique Comprehension | Pending |
| TECH-03 | Phase 5: Technique Comprehension | Pending |
| TECH-04 | Phase 5: Technique Comprehension | Pending |
| EQUIP-03 | Phase 6: Content Depth | Pending |
| EQUIP-04 | Phase 6: Content Depth | Pending |
| TALN-01 | Phase 6: Content Depth | Pending |
| TALN-02 | Phase 6: Content Depth | Pending |
| TALN-03 | Phase 6: Content Depth | Pending |
| TALN-04 | Phase 6: Content Depth | Pending |

**Coverage:**
- v1 requirements: 30 total
- Mapped to phases: 30
- Unmapped: 0

---
*Requirements defined: 2026-04-02*
*Last updated: 2026-04-02 after roadmap creation (6-phase split)*
