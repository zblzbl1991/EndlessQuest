# Roguelike 战斗系统全面改造

## Goal

将当前纯数值碾压的自动结算战斗系统，改造成玩家能通过队伍配置、策略选择、资源管理来"以弱胜强"的自动化 Roguelike 探险体验。

**核心方向**：全自动战报 + 队伍级自动战斗（5 弟子 + Boss 各自独立行动，SPD 排序，治疗/加盾/输出/破防由 AI 根据战术配置决定）

---

## 问题诊断：6 个致命缺陷

### 缺陷 1：装备完全没接入战斗

`createCharacterCombatUnit()` 只读 `baseStats`，完全忽略 `equippedGear`。`calcCharacterTotalStats()` 写好了但无人调用。

**影响**：满身灵装弟子和裸装弟子在战斗中没区别。

| 装备品质 | 全套 ATK 加成 | 全套 HP 加成 |
|---------|-------------|-------------|
| common | +20 | +81 |
| spirit | +36 | +146 |
| immortal | +60 | +243 |
| divine | +100 | +405 |

### 缺陷 2：伤害公式不允许以弱胜强

```
当前: damage = max(1, floor(atk * mult - def/2))
```

当 Boss DEF 远大于玩家 ATK 时，技能伤害也趋近于 1。**公式本身没有给策略留空间。**

### 缺陷 3：Boss 数值缩放失控

```
当前: boss_stats = base * (1 + 0.08 * floor) * 2.5 * clamp(teamRatio, 0.8, 1.2)
```

三层乘法叠加 + ±20% 钳制 = Boss 永远是队伍的 3-6 倍。第 5 层 Boss 一拳秒人。

### 缺陷 4：治疗/防御技能是死代码

`heal_art`、`ice_shield` 有定义但 `CombatEngine` 只处理 attack 类技能。Boss 的 `fireball` 技能 ID 根本不存在于技能表。

### 缺陷 5：6 个秘境共用一个 Boss 模板

只有 `spirit_boss`（雷属性，HP 500/ATK 40/DEF 25），没有地城主题差异。

### 缺陷 6：层间零恢复

没有基础回血，全靠运气抽祝福/遇到休息事件。残血到 Boss 层 = 送死。

---

## 改造方案：4 个阶段

### Phase 1：修复基础数值（让战斗能打赢）

**P1.1 接入装备到战斗**

修改 `createCharacterCombatUnit()` → 调用 `calcCharacterTotalStats()` 或内联装备属性加成。

效果：早期角色 ATK 从 ~17 变成 ~53（带灵装），HP 从 ~110 变成 ~256。

**P1.2 改用比例减伤公式**

```
新公式: damage = floor(atk * skillMult * elementMult * (100 / (100 + targetDef)) * random(0.9, 1.1))
```

| targetDef | 减伤比例 | 效果 |
|-----------|---------|------|
| 0 | 0% | 全额伤害 |
| 50 | 33% | 柔和减伤 |
| 100 | 50% | 中等减伤 |
| 200 | 67% | 高防目标 |
| 500 | 83% | Boss 级减伤 |

**以弱胜强的例子**：
- 弱角 ATK 20, 技能 1.8x, 元素克制 1.5x vs Boss DEF 87
- 当前: `max(1, 20*1.8*1.5 - 43) = max(1, 11) = 11`
- 新公式: `20 * 1.8 * 1.5 * (100/187) = 54 * 0.535 = 28.9`
- 加上装备: `53 * 1.8 * 1.5 * 0.535 = 76.5` ← 已经能打动了

**P1.3 重做 Boss 缩放**

```
新公式: boss_stats = bossProfile.baseStats * (1 + 0.04 * floor)
         再根据队伍战力调节: clamp(targetPower/bossPower, 0.5, 1.5)
```

- 移除固定 2.5x 乘数（每个 Boss 用合理的 baseStats 代替）
- 层数系数从 0.08 降到 0.04（减半膨胀速度）
- 调节范围从 [0.8, 1.2] 扩大到 [0.5, 1.5]（弱队可以遇到更弱的 Boss）

**P1.4 添加层间基础恢复**

每层结束后恢复全体 15% 最大 HP。祝福/圣物在基础上额外恢复。

**P1.5 让治疗/防御技能生效**

- `heal_art`（回春术）：治疗 HP 最低的队友，恢复施法者 25% maxHP
- `ice_shield`（冰甲术）：给 HP 最低的队友施加护盾 = 施法者 20% maxHP
- 修改 `CombatEngine` 的 `resolveAction` 支持所有技能类别

**P1.6 修复 Boss 技能**

为 Boss 添加真正存在的技能，不再引用不存在的 `fireball`。

---

### Phase 2：战斗引擎升级（让战斗有深度）

**P2.1 Buff/Debuff 系统**

```typescript
interface CombatBuff {
  id: string
  type: 'buff' | 'debuff'
  stat: 'atk' | 'def' | 'spd' | 'crit' | 'critDmg'
  value: number       // 加成比例, 如 0.2 = +20%
  duration: number    // 剩余回合数
  sourceUnitId: string
}
```

元素效果触发（技能命中时概率触发）：
- 火系技能: 20% 概率附加「灼烧」debuff — 目标每回合损失 5% maxHP，持续 2 回合
- 冰系技能: 25% 概率附加「迟缓」debuff — 目标 SPD -30%，持续 2 回合
- 雷系技能: 15% 概率附加「麻痹」debuff — 目标 25% 概率跳过行动，持续 1 回合

**P2.2 增强技能 AI**

按战术预设调整 AI 行为：
- `conservative`: HP < 50% 优先防御/治疗，否则攻击
- `balanced`: HP < 30% 优先防御/治疗，否则攻击优先
- `burst`: 始终选择最高倍率技能，不治疗
- `bossCounter`: 非 Boss 层保存灵力（只用普攻），Boss 层全力爆发

**P2.3 回合级战斗日志**

```typescript
interface CombatAction {
  turn: number
  actorId: string
  actorName: string
  actorTeam: 'ally' | 'enemy'
  action: 'attack' | 'skill' | 'defend' | 'support'
  skillId?: string
  skillName?: string
  targetId: string
  targetName: string
  damage?: number
  element?: string
  isCrit?: boolean
  heal?: number
  shield?: number
  buffApplied?: string
  debuffApplied?: string
  hpAfter?: number    // 目标剩余 HP
}

interface CombatLog {
  result: 'victory' | 'defeat'
  totalTurns: number
  actions: CombatAction[]
  teamSummary: {
    unitId: string
    name: string
    totalDamageDealt: number
    totalDamageTaken: number
    totalHealed: number
    kills: number
  }[]
}
```

将 `CombatLog` 存入 `AdventureReportStep.meta.combatLog`。

---

### Phase 3：Boss 与内容多样性（让每局不同）

**P3.1 六个独特 Boss**

| 秘境 | Boss 名 | 元素 | 弱点 | 核心机制 | 技能 |
|------|---------|------|------|---------|------|
| 灵草谷 | 百年灵藤 | neutral | — | 荆棘缠绕（减速） | 藤蔓缠绕、自愈 |
| 落云洞 | 洞渊蟒 | ice | fire | 蜕皮回血（HP < 30% 回复 20%） | 冰息、蜕皮 |
| 血魔渊 | 血魔尊者 | fire | ice | 血怒（HP 越低 ATK 越高） | 血刃、嗜血 |
| 龙骨荒原 | 龙骨将军 | lightning | ice | 雷盾（受击反弹 10% 伤害） | 落雷、雷盾 |
| 九幽炼狱 | 九幽冥王 | fire | ice | 召唤小怪（每 3 回合） | 冥火、召唤 |
| 天劫秘境 | 天劫道人 | neutral | — | 多阶段（HP 50% 切换技能组） | 天雷、封印 |

**P3.2 扩展祝福池（从 5 → 12+）**

新增有影响力的祝福：

| 祝福 | 效果 | 定位 |
|------|------|------|
| 灵焰之心 | 火系伤害 +30% | 元素专精 |
| 玄冰之魄 | 冰系伤害 +30% | 元素专精 |
| 雷霆之怒 | 雷系伤害 +30% | 元素专精 |
| 连击之印 | 每回合 15% 概率多一次行动 | 输出增强 |
| 破甲之眼 | 攻击时无视目标 25% DEF | 破防 |
| 生命虹吸 | 造成伤害的 10% 转化为自愈 | 续航 |
| 狂战之血 | ATK +40%，HP -20% | 风险收益 |
| 元素共鸣 | 队伍每多一种元素 +8% 全体伤害 | 组队策略 |

**P3.3 扩展敌人模板**

当前只有 3 个敌人模板。新增：
- 火系敌人（洞穴蝙蝠、火焰蝎）
- 冰系敌人（冰晶蜘蛛、雪原狼）
- 雷系敌人（雷鸟、电鳗）
- 不同行为模式（坦克型、输出型、治疗型）

---

### Phase 4：UI 增强（让玩家能感知和决策）

**P4.1 增强组队界面（TeamBuilder）**

显示每个弟子的：
- HP / ATK / DEF / SPD 四维属性条
- 已装备技能名 + 元素图标
- 修炼路线
- 底部显示队伍总战力和元素覆盖情况

**P4.2 增强战报页面（AdventureReportPage）**

新增「战斗过程」tab：
- 回合时间线（每回合的行动卡片）
- 伤害统计图（每个弟子的伤害/治疗/承伤柱状图）
- 关键时刻高亮（暴击、击杀、治疗救场、Boss 机制触发）
- Boss 弱点提示（"你注意到了 Boss 对冰系格外脆弱"）

**P4.3 队伍战力预览**

出发前显示「预估难度」：
- 队伍总战力 vs 秘境推荐战力
- 颜色指示：绿（轻松）/ 黄（有挑战）/ 红（危险）

---

## Acceptance Criteria

### Phase 1（必须）

- [ ] 装备属性正确计入战斗（`createCharacterCombatUnit` 使用含装备的属性）
- [ ] 新伤害公式：低攻角色对高防目标能造成有意义伤害（非保底 1 点）
- [ ] Boss 不再一击秒杀合理配置的队伍
- [ ] 层间有 15% 基础恢复
- [ ] 治疗/防御技能在战斗中正确生效
- [ ] 所有现有测试更新并通过
- [ ] 存档兼容（旧存档可加载）

### Phase 2（必须）

- [ ] 回合级战斗日志完整记录在 `AdventureReportStep.meta.combatLog`
- [ ] 元素 debuff（灼烧/迟缓/麻痹）正确触发和生效
- [ ] 四种战术预设产生明显不同的 AI 行为
- [ ] 战报页面能显示战斗过程 tab

### Phase 3（重要）

- [ ] 6 个秘境各有独特 Boss（不同元素、技能、机制）
- [ ] 祝福池扩展到 12+，含元素专精和组队策略祝福
- [ ] 敌人模板扩展到 8+（含不同元素和行为）

### Phase 4（增强）

- [ ] 组队界面显示弟子属性、技能、队伍元素覆盖
- [ ] 战报战斗过程 tab 有回合时间线和伤害统计
- [ ] 出发前显示战力预估

## Definition of Done

- Phase 1-2 全部完成，Phase 3 至少完成 Boss 部分
- Boss 战胜率：合理配置的队伍 50-70%，差配置 20-30%
- 所有测试通过（含新战斗日志测试）
- 存档兼容
- 战报可读、可复盘

## 玩家体验补充问题（2026-04-05 评审）

以下问题来自以玩家视角深度体验后的反馈，与战斗改造并行关注。

### 策略层问题

**S1: `casualtyTolerance` 三档未正确映射到 `AutomationStrategy` 三档**

`SectAutomationSystem.mapAutomationStyle` 映射：
- `conservative` → `steady/conservative` ✓
- `risky` → `combat/burst` ✓
- `balanced` → `steady/balanced` ✗（映射回了 steady，没有映射到 profit）

`CasualtyTolerance` 有三档（`conservative | balanced | risky`），`AutomationStrategy` 也有三档（`steady | combat | profit`），但 `balanced` 没有映射到 `profit`，导致**寻机策略在自动运行中不可达**。

修复方案：`balanced` → `profit/balanced`

**S2: 祝福选择是确定性的，同一策略每局选同样的祝福**

`AutoRunPolicy.pickAutomationBlessing` 用固定权重排序，每次都选权重最高的可用祝福。作为 Roguelike，同策略下应有随机波动。

修复方案：在权重基础上加入随机扰动（如 `weight + random(0, 3)`），让同策略不同局可能选不同祝福。

**S3: 补给等级写死为 `basic`**

`SectAutomationSystem.buildAutomationRunConfig` 第 88 行硬编码 `supplyLevel: 'basic'`，即使宗门资源富裕也不升级补给。`enhanced` 和 `luxury` 等级存在但从未使用。

修复方案：根据资源富余程度自动选择补给等级（如灵石 > 保底线 3 倍用 `enhanced`，> 10 倍用 `luxury`）。

### 内容量问题

**C1: 7 种普通敌人被 6 个秘境共用**

所有秘境从同一个 `getNonBossTemplates()` 池子抽敌人，灵草谷和九幽炼狱遇到的是同一批怪。玩家跑 3-4 局后就觉得"怎么又是这几个"。

**C2: 商店只有 2 种物品**

`SHOP_ITEMS`（EventSystem.ts）只有回血药和跳层券。第 2 局就见完了所有商品。商店应增加临时增益、技能碎片、元素晶石等可选项。

**C3: 遗物只有 3 种**

跑 3 局就集齐所有遗物，后续通关奖励为空。

**C4: 随机事件只有 3 种结果（宝箱/休息/陷阱），无叙事变化**

在自动化游戏中，随机事件是报告中最主要的叙事载体。当前"你获得了50灵石"式的事件没有故事感。应增加大量带文本的事件变体（发现古修洞府、遇到受伤散修、灵药园争夺等）。

### 报告/叙事问题

**R1: 战斗日志存在但不渲染**

`step.meta.combatLog` 已完整存储回合级行动数据（Phase 2 产出），但 `AdventureReportPage` 从不展示它。自动化游戏的核心体验是读报告——战斗叙事是必需品。

（Phase 2/P4.2 已规划战斗过程 tab，此处强调优先级）

**R2: 报告缺少纵向对比**

没有"本次比上次多走了 2 层"、"灵石收益比平均值高 30%"等对比信息。玩家难以感知成长。

### 节奏问题

**P1: 灵石软上限与自动化设计矛盾**

`ResourceEngine.applySpiritStoneDecay` 在灵石超过上限后将产出降到 10%。自动运行游戏需要玩家挂机积累资源，但软上限惩罚挂机行为，迫使频繁上线消费。

修复方案：改为硬上限（产出归零但不再衰减已积累部分），或大幅提高上限让挂机更长时间才触及。

**P2: 前期进度悬崖**

炼气期突破 20 秒一次，到筑基期需要 ~60 分钟攒灵石。从"每分钟都有突破"骤变到"等一小时"，没有平滑过渡。

**P3: 前 10 分钟无事可做**

弟子自动修炼、自动突破、秘境自动运行。新玩家看着数字涨但不知道自己该做什么。需要第一个"手动操作"来建立参与感（如手动招募第一个弟子、手动触发第一次探险）。

### 命运系统可见性

**D1: 命运系统运作对玩家几乎不可见**

UI 只显示命运阶段文字（种子/萌动/成格...），背后暴露值、不稳定性、暗流共振等机制完全不透明。作为游戏的终极追求目标（天命降临 0.15% 基础概率），玩家需要感知"我离目标更近了"。

修复方案：在战报中展示命运相关的变化提示（"此次探险令张玄的命格暴露增加了 X"），在弟子详情页展示命运进度条。

### 实机体验新发现（2026-04-05 浏览器实测）

以下问题通过实际在浏览器中操作游戏 30 分钟后发现。

**E1: 灵石显示 NaN**

秘境页面侧边栏灵石数字变为 `NaN`（从正常数字 48,843 跳变）。发生在第二次自动探险结算之后。可能是探险结算/奖励计算中产生了非数值（如除零或 undefined 参与运算），且 `normalizeFiniteNumber` 未覆盖此场景。

**E2: 事件日志中英混杂**

记录页面出现多条英文事件：
- `Dungeon 灵草谷 failed`
- `Team entered dungeon 灵草谷`
- `Dungeon 灵草谷 retreat`
- `刘踏雪在秘境中陨落，返还灵石 NaN`

而同页的突破事件是正常中文（"刘踏雪 突破至 炼气期 圆满"）。探险相关的事件消息模板是英文硬编码在 `EventSystem` / `AutoRunEngine` 中。

**E3: "返还灵石 NaN"**

弟子"陨落"事件中灵石返还金额显示 NaN。与 E1 同源，探险结算产出异常值。

**E4: 战斗过程 tab 中 Boss 战伤害显示为"发起攻击"而非实际伤害**

第 5 层 Boss 战，回合 2：
> 刘踏雪 对 百年灵藤 发起攻击（百年灵藤 剩余 330 HP）

实际没有造成伤害（330 → 330 未变），但文字说"发起攻击"而非"造成了 0 点伤害"。这让玩家困惑——打中了还是没打中？

**E5: 刘踏雪第 1 回合 Boss 战被麻痹（麻痹来源不明）**

Boss 战回合 1：
> 刘踏雪 剑气纵横 因麻痹无法行动

但 Boss 百年灵藤是 neutral 属性，不应有麻痹技能。麻痹应该是上一层战斗残留的 debuff，但**层间没有清除 debuff**，导致战斗间状态泄漏。这可能是设计意图（debuff 跨战斗持续），但没有 UI 说明。

**E6: 守成策略却选了 high 风险路线**

第 3 层和第 4 层，策略为守成（steady），但自动选择了"探索之路（high 风险）"和"危险通道（high 风险）"。决策依据显示"steady策略下自动选择high风险路线"——这与守成的语义（稳妥归来、少冒风险）严重矛盾。

第 2 层有 3 条路线（low / medium / medium），却选了 medium 的"探索之路"标记为"profit route"，理由是"steady策略下自动选择medium风险路线"。

`pickAutomationRoute` 的评分逻辑在高 reward + 低 dangerMultiplier 时会覆盖策略偏好，导致守成策略的行为和玩家预期不一致。

**E7: "推进至第 4 层"但实际在第 5 层全灭**

报告高亮卡片显示"推进至第 4 层"，但时间线显示第 5 层才是 Boss 层且是全灭层。原因是 `floorsCleared` 统计的是**完成的层数**（0-indexed 或完成层数），不是到达的最大层数。玩家视角："明明到了第 5 层，为什么说第 4 层？"——数字含义不直观。

**E8: 战斗过程 tab 只显示 Boss 战（第 5 层），前面的战斗需要滚动很久**

战斗过程 tab 按时间顺序展示所有战斗，但 5 层 6 场战斗全部展开，信息量大且没有折叠。应默认只展示关键战斗（Boss 战、生死战斗），普通战斗折叠。

**E9: 单人探险体验单调**

只有一个弟子（刘踏雪），每场战斗都是"刘踏雪用剑气纵横 → 敌人打回来 → 重复 3-4 回合"。没有治疗、没有辅助、没有策略变化。前期体验高度依赖能否快速招募到更多弟子，但自动招募条件严格（需要灵石和灵气都超过保底线），玩家可能长时间只有一人。

**E10: 弟子"未归"状态缺少恢复时间提示**

战报显示"未归：刘踏雪"，秘境页显示"可出战 0"。但没有告诉玩家：刘踏雪什么时候回来？恢复需要几天？玩家只能等，不知道该等多久。

**E11: "查看过程"链接点击后页面不跳转**

在秘境页面点击"查看过程"链接，URL 变化但页面内容未更新（需要刷新或重新导航）。可能是 React Router 的导航问题，或报告页面在当前路由栈中未正确挂载。

---

## Out of Scope

- 实时操作/回合制手动操控
- PvP 系统
- 全新 UI 框架
- 宠物战斗系统改造
- 半自动逐层推进模式

## Decision (ADR-lite)

**Context**: 战斗系统过于数值化，没有策略空间，Boss 必然碾压
**Decision**: 全自动战报 + 队伍级自动战斗。核心改造：比例减伤公式、装备接入、Boss 差异化、回合日志
**Consequences**: 改动量大（~15 个文件），但分 4 阶段可实施。Phase 1 单独就能显著改善体验。

## Technical Notes

### 关键文件改动清单

| 文件 | Phase | 改动 |
|------|-------|------|
| `src/data/enemies.ts` | P1 | 修复 `createCharacterCombatUnit` 接入装备，修复缩放公式，新增 Boss 模板 |
| `src/systems/combat/CombatEngine.ts` | P1+P2 | 新伤害公式，支持所有技能类别，Buff/Debuff 系统，战斗日志 |
| `src/systems/combat/SkillAI.ts` | P2 | 增强四预设 AI，支持治疗/防御决策 |
| `src/systems/combat/AffixSystem.ts` | P2 | 扩展词缀效果 |
| `src/systems/roguelike/EventSystem.ts` | P1+P3 | Boss 生成逻辑改用新模板，敌人多样性 |
| `src/systems/roguelike/AutoRunEngine.ts` | P1 | 层间恢复逻辑 |
| `src/systems/roguelike/RunBuildSystem.ts` | P3 | 新祝福效果 |
| `src/data/blessings.ts` | P3 | 新增祝福定义 |
| `src/types/adventure.ts` | P2 | 新增 CombatAction/CombatLog 类型 |
| `src/pages/AdventurePage.tsx` | P4 | 增强组队界面 |
| `src/pages/AdventureReportPage.tsx` | P4 | 战斗过程 tab |

### 新公式对比

| 场景 | 当前伤害 | 新伤害（无装备） | 新伤害（有灵装） |
|------|---------|---------------|---------------|
| ATK 17, DEF 87, 技能 1.8x | 1 | 16.4 | 46.3 |
| ATK 17, DEF 87, 技能 1.8x, 克制 1.5x | 1 | 24.7 | 69.5 |
| ATK 53, DEF 87, 技能 1.8x, 克制 1.5x | 11 | 76.5 | 76.5 |

### Boss 数值对比（第 5 层）

| 场景 | 当前 Boss HP | 新 Boss HP | 变化 |
|------|-------------|-----------|------|
| 灵草谷 Boss | 1,400 | ~350 | -75% |
| 落云洞 Boss (第8层) | 1,750 | ~480 | -73% |

### 3 人队 vs 第 5 层 Boss（灵草谷）预估

**当前**：
- 队伍 ATK ~17, Boss HP 1,400 → 需 467 回合（30 回合限制内不可能）

**改造后（无装备）**：
- 队伍 ATK ~17, 技能平均 1.8x, Boss HP ~350
- 每人每回合 ~16 伤害 × 3 = 48 → ~8 回合击杀
- Boss 每回合 ~35 伤害 → 3 人总 HP 330 → 可撑 ~9 回合
- **结果：险胜或惜败，取决于元素克制和技能选择**

**改造后（有灵装 + 元素克制）**：
- 队伍 ATK ~53, Boss HP ~350
- 每人每回合 ~46 伤害 × 3 = 138 → ~3 回合击杀
- **结果：轻松通关，体现了装备和元素策略的价值**

---

## Implementation Plan (分阶段提交)

**Phase 1**: 修复基础数值 — 接入装备 + 新伤害公式 + Boss 缩放 + 层间恢复 + 治疗技能
**Phase 2**: 战斗引擎升级 — Buff/Debuff + 战斗日志 + AI 增强
**Phase 3**: 内容扩展 — 6 Boss + 新祝福 + 新敌人
**Phase 4**: UI 增强 — 组队界面 + 战报过程 tab + 战力预估
