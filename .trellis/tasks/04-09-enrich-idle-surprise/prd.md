# 丰富挂机惊喜体验

## Goal

以"玩家挂机回来后看到日志发现惊喜"为核心体验，扩充随机内容池、丰富事件文案、增加宗门里程碑、新增挂机随机事件系统。

## Background

EndlessQuest 定位为仙侠放置挂机游戏，核心爽感来自弟子成长的随机惊喜（类似抽卡的快感）。当前内容池过浅、事件日志文字干瘪、里程碑太少、挂机期间无非预测性惊喜事件，导致玩家 3-5 天后出现"又是这个"的疲劳感。

## Decision (ADR-lite)

**Context**: 天赋稀有度扩展方案选择
**Decision**: 保持现有 3 档稀有度（凡/良/绝），不新增 'legendary' 等级。通过扩充各档位数量来增加多样性。
**Consequences**: 无需改 TalentRarity 类型定义和相关 UI，减少改动范围和风险。

---

## Requirements

### Phase 1: 扩充随机内容池

扩充功法、天赋、命格、技能等随机内容，增加描述文案，让每次随机都有惊喜感。

**1.1 功法扩充（12 → 30）**
- 凡品 3 → 6（新增 3 本）
- 灵品 3 → 6（新增 3 本）
- 仙品 3 → 6（新增 3 本）
- 神品 2 → 6（新增 4 本）
- 混沌 1 → 3（新增 2 本）
- 每本功法需要：中文 id、中文名称、风味描述、属性加成、元素属性、功法系列(family)、风格(styles)
- 属性加成需保持数值平衡，同品质内总加成接近现有功法

**1.2 天赋扩充（12 → 30）**
- 凡品(common) 6 → 12（新增 6 个）
- 稀有(rare) 4 → 10（新增 6 个）
- 史诗(epic) 2 → 8（新增 6 个）
- **每个天赋必须有叙事描述**，格式为 "天赋名：一句话描述（实际效果）"
- 现有 12 个天赋也需补充叙事描述
- 天赋效果 stat 限定在现有 TalentStat 类型内：spiritualRoot, comprehension, fortune, hp, atk, def, spd, crit, critDmg, maxSpiritPower

**1.3 命格扩充（10 → 20）**
- 每个现有类别至少 4 个（天命/鬼咒/情绪/修炼/机率）
- 新增 1-2 个类别（如：因果格、轮回格）
- FateGridId 类型需扩展
- 保持现有的叙事品质和 effects 结构

**1.4 技能扩充（8 → 16）**
- 每个分类至少 3 个：attack ≥ 4, support ≥ 3, defense ≥ 3, ultimate ≥ 3
- 保持现有 ActiveSkill 结构（multiplier/spiritCost/cooldown/tier）
- 不引入新技能类型（debuff/buff/dot），避免改动战斗引擎
- 保持仙侠风味命名和描述
- 新技能需更新 activeSkills.ts 中的 inferTechniqueElements 函数以支持新功法的元素推断

### Phase 2: 丰富事件日志文案

给所有 emitEvent 调用增加叙事场景描述，让日志读起来像故事而不是报告。

**2.1 突破事件（BreakthroughCoordinator.ts）**
- 突破成功：随机选择场景（灵矿旁悟道、灵田中顿悟、静室闭关突破等）+ 弟子名 + 目标境界
- 突破失败：随机选择场景描述（走火入魔、经脉逆行等）
- 渡劫成功：天劫场景描写（雷云翻涌、天雷降下等）
- 渡劫失败：对应的场景描写

**2.2 招收弟子（characterSlice.ts）**
- 根据品质生成不同的招收叙事
- 凡品："一名普通少年经过考验，拜入山门。"
- 灵品："一名灵根清澈的修仙苗子被宗门发现，收归门下。"
- 仙品："天地灵气汇聚，一位资质超凡的天才少年叩开山门！"
- 神品："祥云瑞气笼罩山门，一位万年难遇的绝世天才降临！"
- 混沌品：极度稀有的专属叙事

**2.3 秘境事件（adventureStore.ts）**
- 出发：根据秘境类型生成不同的出发描述
- 通关/失败/撤退：在现有消息基础上增加简短叙事

**2.4 建筑事件（buildingSlice.ts）**
- 修复 mojibake 编码问题（2 处乱码）
- 加入建筑升级/扩建的叙事描述

**2.5 其他事件**
- 炼制/锻造：加入产品品质的描述
- 宠物捕获：加入捕获场景
- 巡逻/派遣：加入简短叙事
- 统一所有英文事件为中文
- 路线分配事件：修复英文消息

**技术实现**：
- 新增 `src/data/eventTexts.ts` 集中管理事件文案模板
- 文案模板为函数，接收上下文参数（弟子名、品质、境界等）返回完整文案
- 每类事件准备 2-4 个随机场景模板，避免重复

### Phase 3: 增加宗门里程碑

从 3 个扩展到 15+，覆盖更多"第一次"成就时刻。

**需要修改的类型**：
- `src/types/sect.ts` 的 ArchiveMilestoneId 联合类型需扩展

**确认的里程碑（从候选中选取 15 个）**：

弟子类（4 个）：
- firstRareRecruit（已有）：初见异才 — 首次灵品+弟子
- firstImmortalRecruit：天赐良才 — 首次仙品+弟子
- firstDivineRecruit：绝世奇才 — 首次神品+弟子
- firstChaosRecruit：混沌之子 — 首次混沌品弟子

境界类（5 个）：
- firstFoundation：筑基开宗 — 首次弟子突破到筑基期
- firstGoldenCore：金丹大道 — 首次弟子突破到金丹期
- firstNascentSoul：元婴问道 — 首次弟子突破到元婴期
- firstSpiritTransformation：化神通天 — 首次弟子突破到化神期
- firstAscension：飞升证道 — 首次弟子突破到飞升期

秘境类（2 个）：
- firstDungeonClear（已有）：秘境留名 — 首次通关秘境
- firstDeepDungeonClear：深渊探索者 — 首次通关 12 层以上秘境

功法类（2 个）：
- firstSpiritTechnique：初窥门径 — 首次领悟灵品功法
- firstImmortalTechnique：大道在望 — 首次领悟仙品功法

宗门/特殊类（2 个）：
- firstTribulationSuccess（已有）：雷火证道 — 首次渡劫成功
- firstPetCapture：灵兽初缘 — 首次捕获灵宠

**触发点**：
- 招收弟子时检查品质 → 解锁弟子类里程碑
- 突破成功时检查境界 → 解锁境界类里程碑
- 秘境完成时检查层数 → 解锁秘境类里程碑
- 功法领悟时检查品质 → 解锁功法类里程碑
- 渡劫成功时 → 已有触发点
- 宠物捕获时 → 解锁灵兽初缘

### Phase 4: 挂机随机事件系统

新增 tick 期间触发的随机事件，让挂机期间有意料之外的惊喜。

**4.1 事件机制**
- 每 60 秒 tick 有概率触发（基础概率 2%，约每 50 分钟一个事件）
- 概率可通过弟子机缘属性提高（每点 fortune +0.3%）
- 事件有 4 级稀有度：常见（60%）、稀有（25%）、史诗（12%）、传说（3%）
- 事件日志中按稀有度使用不同样式标记

**4.2 候选随机事件（至少 20 种）**

常见事件（12 种）：
- 云游散修路过赠送灵石、灵田丰收获得灵草、弟子切磋提升属性、矿脉发现新矿层、山间清泉提升灵气恢复、弟子闲谈间有所感悟、商队路过以物易物、灵兽踪迹被发现、旧书堆中发现残页、天气转好修炼效率略增、弟子互帮互助增进修为、日常修炼中小有进步

稀有事件（5 种）：
- 隐世高人指点某弟子领悟速度加快、天然灵宝出世获得随机装备、灵气潮汐全宗修炼速度暂时加快、某弟子练功时意外突破瓶颈、珍贵灵草在山门外自然生长

史诗事件（2 种）：
- 上古遗迹现世获得随机功法、仙缘降临获得高品质物品

传说事件（1 种）：
- 天道赐福全宗弟子获得永久属性加成

**4.3 技术实现**
- 新增 `src/data/randomEvents.ts`：事件定义数据表
- 新增 `src/systems/idle/RandomEventSystem.ts`：事件触发与执行逻辑
- 在 `tickSlice.ts` 的 tick 循环中加入随机事件触发（每 60 tick 检查一次）
- 事件结果通过 emitEvent 记录到日志，事件类型为 `random_event`
- 事件效果通过现有 store actions 施加（资源增减、属性修改、物品掉落）
- 新增 RandomEvent 类型定义

## Acceptance Criteria

- [ ] 功法数量 = 30，每个都有中文风味描述和完整属性
- [ ] 天赋数量 = 30，每个都有叙事描述
- [ ] 命格数量 = 20，包含新类别
- [ ] 技能数量 = 16
- [ ] 所有 emitEvent 消息包含叙事场景描述
- [ ] 零英文事件消息，零 mojibake
- [ ] 宗门里程碑 = 15 个
- [ ] 挂机随机事件 ≥ 20 种，有 4 个稀有度分级
- [ ] 所有新增数据保持数值平衡
- [ ] 类型检查和 lint 通过
- [ ] 现有测试不被破坏

## Definition of Done

- 所有新增数据文件遵循现有格式和命名约定
- 新增类型定义在 `src/types/` 中，通过 `index.ts` re-export
- lint + typecheck 通过
- 现有 373 个测试不被破坏
- 数值平衡经过同品质比较验证

## Out of Scope

- 不改变战斗引擎逻辑
- 不新增天赋稀有度等级
- 不引入新技能类型（debuff/buff/dot）
- 不改变 UI 布局或新增页面
- 不增加随机事件的玩家交互（自动触发自动执行）
- 不添加里程碑奖励（只做记录和展示）

## Technical Notes

**涉及文件**：
- `src/data/techniquesTable.ts` — 功法数据扩充
- `src/data/talents.ts` — 天赋数据扩充 + 描述补充
- `src/data/fateGrids.ts` — 命格数据扩充
- `src/data/activeSkills.ts` — 技能数据扩充
- `src/data/archiveMilestones.ts` — 里程碑数据扩充
- `src/data/eventTexts.ts` — 新增，事件文案模板
- `src/data/randomEvents.ts` — 新增，随机事件数据
- `src/types/sect.ts` — ArchiveMilestoneId 扩展
- `src/types/index.ts` — FateGridId 等类型可能需要更新
- `src/systems/idle/RandomEventSystem.ts` — 新增
- `src/systems/idle/BreakthroughCoordinator.ts` — 文案更新
- `src/stores/sectStore/characterSlice.ts` — 招收文案 + 里程碑触发
- `src/stores/sectStore/buildingSlice.ts` — 建筑 mojibake 修复 + 文案
- `src/stores/sectStore/tickSlice.ts` — 随机事件触发 + 境界里程碑触发
- `src/stores/adventureStore.ts` — 秘境文案 + 里程碑触发
- `src/stores/eventLogStore.ts` — 新增 random_event 事件类型

**数值平衡参考（现有功法加成总和）**：
- 凡品：14-24 点总加成
- 灵品：17-48 点总加成
- 仙品：51-95 点总加成
- 神品：75-96 点总加成
- 混沌：135 点总加成

**天赋效果数值参考**：
- common: 单项 2-3，或 1-3% 比率
- rare: 单项 5-15，或双属性组合
- epic: 单项 8-30，或双/三属性组合
