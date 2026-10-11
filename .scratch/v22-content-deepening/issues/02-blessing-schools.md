# 02 祝福分系 Build 化：6 系 30+ 种 + 合成升阶 + 协同词条

Type: task
Status: resolved
Blocked by: 01（实际耦合弱，串行保序）
Assignee: zcode (2026-09-13)

## Question

如何把祝福从"13 种的三选一"升级为设计稿 §九 的 Build 系统：6 系 30+ 种、同系合成升阶、跨系统协同词条，使秘境构筑成为小循环的核心期待？（第一步先做引擎盘点）

### 范围

1. **引擎盘点（第一步，产出记录进 Answer）**：CombatEngine 现有机制清单（元素亲和/主动技/暴击/灵宠实体/击杀结算点），对照设计稿六系（剑修/雷法/暴击/召唤/毒修/体修）给出系别定义建议——缺实体机制的"召唤"可替换为复用灵宠实体的"御兽系"，缺 dot 的"毒修"评估加 dot 或换"吸元系"。
2. **六系祝福池**：13 → 30+（每系 5+ 种），每系一条贯穿机制钩子（如剑修=普攻强化、暴击=爆伤联动、体修=反伤/护体、御兽=宠物协同）；同系同层祝福三选一权重倾斜（当前 run 已拿 N 条某系时，该系出现率上调）。
3. **合成升阶**：run 内同名祝福重复获取自动合成为下一阶（疾风步→疾风·逐影），阶数上限 3；升阶效果 = 下一级数值而非简单翻倍（表驱动）。
4. **Build 协同词条**：3~5 条跨系统祝福（"大道共鸣：每已学功法伤害+8%"、"剑阵：装备剑类武器 ≥3 攻+30%"、"御兽同心：宠物存活时全队攻+X"）——把功法/装备/宠物拉进局内构筑。
5. **第四种策略意图"求道"**：只走事件/古洞路线刷祝福与功法（AutoRunPolicy 加一路线偏好）。
6. 单测：每系至少 1 条祝福真实生效；合成阶数与数值表；协同词条计数正确；权重倾斜可复现。

### 不做

- 遗物扩池（15 种 + 神品成长词条——若工单量允许并入，否则 Out of scope 记录）；祝福 UI 重做（三选一弹窗沿用基线加系别色标）。

## Acceptance

1. 引擎盘点结论写入 Answer（六系最终定义 + 每系的机制钩子映射到 CombatEngine 哪个点）。
2. 单测：30+ 种祝福数据完整性（id 唯一、系别归属、数值表）；至少 6 条代表性祝福（每系 1 条）效果真实生效。
3. 合成：同名重复 → 升阶，3 阶封顶，数值按表。
4. `npm test` 全量绿。

## Answer

`npm test` 112 文件 / 1491 用例全绿（+1 文件 +14 用例）；`tsc --noEmit` 0 错误。

### 引擎盘点结论（第一步产出）

CombatEngine 既有钩子：`applyRunCombatModifiers`（atk/def/spd/maxHp 乘区 + crit 加值 + spiritRegenBonus + healOnKillRatio）、击杀结算点（healOnKill 同点位）、元素亲和、主动技 + SkillAI、暴击/爆伤、掉落/资源奖励乘区（applyRunRewardModifiers）、`applyRouteCombatModifiers`（路线修正，外层）。**六系定案**（设计稿的"召唤"改为复用击杀/掉落钩子的"御兽系"，"毒修"因缺 dot 机制改为"会心系"）：剑修=攻击、雷法=速度/先手、会心=暴击/爆伤、体修=血防反伤、御兽=击杀回复/掉落、灵息=资源/续航。**唯一新增引擎钩子：thornsRatio（受击反震）**。

### 祝福池（36 种 = 6 系 × 6 梯度）

`blessings.ts` 全重写：`BlessingDef` 增加 school/tier/values[3]/effect（12 种效果钩子枚举）；旧 13 id 全保留且 tier1 数值与旧硬编码一致（单测锁定行为等价）；新 23 id 每系 2~3 阶梯度。`aggregateBlessingEffects(owned)` 为唯一聚合源——**同 id 计数 = 阶（上限 3）**，合成升阶零存储迁移（blessings 队列自然表达）。旧 `BLESSINGS` effectType 视图改为派生导出（测试与旧消费方兼容）。

### 消费端重写

- `applyRunCombatModifiers`：聚合消费 + 可选 `RunModifierContext`（功法数/剑类武器数）驱动协同；critDmg 加值、thornsRatio 产出；mirror_shard relic 分支保留。
- `applyRunRewardModifiers`：聚合消费（rewardPct 按资源 + all 通道 + 协同加成）；**有意变更**：掉落加成从"石/草"扩为三资源。
- **thorns**：CombatUnit.thornsRatio + 被击存活时反震 floor(damage×ratio)。
- **layerHeal**：advanceFloor 层间恢复接通——盘点发现 ironBody 旧效果**从未实现**（只有权重表条目），本次顺带闭环。
- `pickBlessingOptions`：未满 3 阶的已拥有祝福留在池中（升阶路径）、3 阶封顶排除；**系倾斜**（同系持有数 ×0.6×(base+1) 加权）——实现初版误按 id 计数，被系倾斜断言抓出后修正为按 school。
- 协同词条 4 条（RUN_SYNERGIES）：大道共鸣（功法数×8% 攻）、剑阵（剑类武器≥3 攻+30%）、御兽同心（御兽系≥3 生命+15%）、丹道守恒（灵息+会心各≥2 资源+10%）——前两条跨系统（context 传入），后两条纯祝福组合。
- **求道意图**：AutomationStrategy + 'seekDao'（存档兼容新增）、AutoRunPolicy 三分支（撤退/抓宠/权重倾斜稀有系）、runIntents 文案"求道"、AdventurePage 意图列表。

### 有意行为变更（记录）

1. 掉落加成（golden_touch 等）作用面从石/草扩为三资源；2. 攻击类祝福叠法从乘法（1.15³）改加法聚合（1+Σ）——防乘区爆炸，t1 单张行为等价；3. 已拥有祝福不再被排除（升阶语义）。

### 事故记录

AutoRunPolicy.ts 曾被 python 脚本（open('w') 先于 read 的笔误）截空——该文件本会话无改动，`git checkout` 恢复后用 Edit 工具重放修改。教训：危险写入操作前先验证锚点命中。

### 测试

BlessingSchools 14 用例（数据完整性/单调数值/旧行为等价/升阶封顶/跨系聚合/四条协同/升阶池/系倾斜）；存量更新：RunBuildSystem 池计数、两个"排除已拥有"用例改升阶语义、RoguelikeEngine BLESSINGS 兼容视图全过。
