# EndlessQuest 综合审计报告

**日期**: 2026-03-26
**审计方式**: 完整游戏流程走查 + 源码审计
**版本**: master (68d9029)

---

## Anti-Patterns Verdict

**PASS — 不像 AI 生成的**。整体视觉风格符合"水墨 + 仙侠"的设计方向，使用了宣纸色底、赭石色强调、克制的配色。没有发现典型的 AI 痕迹（渐变文字、玻璃拟态、大面积渐变背景、霓虹发光）。CSS 变量体系完善，组件结构清晰。

---

## Executive Summary

| 严重级别 | 数量 |
|---------|------|
| Critical | 4 |
| High | 12 |
| Medium | 16 |
| Low | 9 |

**Top 5 关键问题**:
1. **巡逻次数永不重置** — 5 次巡逻用完后永久无法再巡逻（游戏破坏性 Bug）
2. 建筑功能面板在建筑解锁后无法使用（需要 Lv3 才显示 Tab）
3. 无 Error Boundary，任何运行时错误会导致整个应用崩溃
4. 角色状态显示冲突（冒险中 vs 修炼中）
5. 锻造失败仍扣除资源（高级装备 75% 概率白赔）

---

## Critical Issues

### C0. 巡逻次数永不重置（游戏破坏性 Bug）
- **位置**: `src/stores/adventureStore.ts:631`
- **严重级别**: Critical
- **类别**: Game Logic / Bug
- **描述**: `patrolCountToday` 存储在 Zustand 状态中，但没有每日重置机制。一旦玩家使用完 5 次巡逻，将永远无法再次巡逻，直到存档清除。
- **影响**: **游戏功能永久丧失**。巡逻是前期重要的灵石来源，这个 bug 会导致玩家在第一次会话后完全失去巡逻功能。
- **建议**: 在 `tickAllIdle` 或应用启动时检查日期变化，自动重置 `patrolCountToday`。
- **Suggested command**: 自行修复（优先级最高）

### C1. 建筑功能面板解锁门槛过高
- **位置**: `src/pages/BuildingsPage.tsx:110-117`
- **严重级别**: Critical
- **类别**: Game Design / UX
- **描述**: 坊市、丹炉、炼器坊、藏经阁的功能面板 Tab 需要建筑等级 ≥ 3 才显示。玩家在建造建筑（Lv1）后无法使用商店、炼丹、锻造等核心功能。
- **影响**: 玩家建造了建筑却无法与之交互，感觉功能缺失。新建建筑的升级成本在 Lv1→Lv2→Lv3 阶段非常昂贵（数百到数千灵石），新玩家会长时间无法使用这些核心系统。
- **建议**: 建筑解锁（Lv1）时就应该显示功能 Tab。Lv3 可以解锁高级功能或增强效果，但不应该锁住基础使用。
- **Suggested command**: 自行修复

### C2. 无 Error Boundary
- **位置**: `src/App.tsx`（缺失）
- **严重级别**: Critical
- **类别**: Resilience
- **描述**: 整个应用没有 Error Boundary 组件。任何子组件的运行时错误（如 undefined 属性访问、网络错误）会导致整个 React 应用白屏崩溃。
- **影响**: 玩家可能因为偶发错误丢失整个游戏界面，且无法恢复。
- **建议**: 在 `App.tsx` 的路由层添加 Error Boundary，至少在页面级别捕获错误并显示重试按钮。
- **Suggested command**: `/harden`

### C3. 角色状态显示冲突
- **位置**: `src/components/cultivation/BreakthroughPanel.tsx:37`, `src/pages/CharactersPage.tsx`（技能区域）
- **严重级别**: Critical
- **类别**: UX / Game Logic
- **描述**: 当角色状态为"冒险中"（巡逻或秘境）时：
  1. 突破面板仍显示"修炼中"（BreakthroughPanel.tsx:37 硬编码默认值）
  2. 修炼区域仍显示"修炼速度: 5.1/s"（但实际没有在修炼）
  3. 角色卡片显示"冒险中"但修炼进度数字仍以 "+5.1/s" 增长提示
- **影响**: 玩家无法正确判断角色当前在做什么，信息混乱。
- **建议**: BreakthroughPanel 应根据角色实际状态显示不同提示（"冒险中，无法修炼"）。修炼速度显示应考虑角色当前状态。
- **Suggested command**: `/harden`

---

## High-Severity Issues

### H1. 巡逻系统信息不足
- **位置**: `src/pages/AdventurePage.tsx:87-117`
- **严重级别**: High
- **类别**: UX
- **描述**:
  1. 巡逻开始后不显示哪个角色在巡逻
  2. 没有进度条，只有一个倒计时数字"60秒"
  3. 巡逻开始后"今日剩余 X/5"计数器消失
  4. 巡逻完成后的奖励按钮不够醒目
- **影响**: 玩家不清楚巡逻状态，容易忘记有巡逻在进行。
- **建议**: 显示巡逻角色名、添加进度条、保留剩余次数显示、巡逻完成时用更醒目的样式提示。
- **Suggested command**: `/polish`

### H2. 建筑升级成功反馈极弱
- **位置**: `src/pages/BuildingsPage.tsx:162-173`
- **严重级别**: High
- **类别**: UX / Design
- **描述**: 升级成功只显示纯文本"升级成功"，2秒后消失。没有动画、没有颜色变化、没有视觉强调。根据设计原则 #3（关键时刻浓墨重彩），建造和升级应该是重要的正向反馈时刻。
- **影响**: 玩家感知不到升级的成就感，游戏反馈感弱。
- **建议**: 添加 Framer Motion 动画（淡入+缩放），使用赭石色或绿色强调，添加✓图标。
- **Suggested command**: `/animate`, `/delight`

### H3. 事件记录中建造事件重复
- **位置**: `src/stores/sectStore.ts`（tryUpgradeBuilding 方法）
- **严重级别**: High
- **类别**: Game Logic
- **描述**: 每次建造或升级建筑时产生两条事件：一条"建造 XXX"、一条"XXX 升级至 Lv1"。同一次操作产生冗余记录。
- **影响**: 事件日志被冗余信息污染，玩家需要翻更多才能找到有用信息。
- **建议**: 建造新建筑只生成一条事件（"建造 XXX 完成"），升级只生成一条事件（"XXX 升级至 LvN"）。
- **Suggested command**: 自行修复

### H4. 移动端首页资源信息重复
- **位置**: `src/pages/SectPage.tsx:64-70` + `src/components/common/ResourceRate.tsx`
- **严重级别**: High
- **类别**: UX / Responsive
- **描述**: `ResourceRate` 组件已经显示了灵草产出率（"+0.1/s"），但 `SectPage` 又在下方额外显示了一次 `灵草 +0.10/s`（当 herbRate > 0 时）。移动端 TopBar 也显示了资源数值，导致资源信息在三处重复。
- **影响**: 浪费移动端宝贵的屏幕空间，信息冗余。
- **建议**: 移除 `SectPage.tsx` 中多余的 herbRate 显示，让 ResourceRate 组件统一处理所有资源产出率。
- **Suggested command**: `/distill`

### H5. 移动端角色卡片信息缺失
- **位置**: `src/components/common/CharacterCard.tsx`
- **严重级别**: High
- **类别**: UX / Responsive
- **描述**: 移动端角色卡片只显示名字、状态、境界、功法，缺少修炼进度（修为 X/100）和修炼速率（+X.X/s）。桌面端显示完整的进度条和速率。
- **影响**: 移动端玩家无法一眼看到修炼进度，需要点击进入详情页，增加了操作步骤。
- **建议**: 移动端卡片至少应显示进度条（可以是简化版）。
- **Suggested command**: `/adapt`

### H6. 巡逻状态用"冒险中"标签，术语混淆
- **位置**: `src/stores/sectStore.ts`（startPatrol 方法）
- **严重级别**: High
- **类别**: Game Design / UX
- **描述**: 角色巡逻时状态标记为"冒险中"，与真正的秘境探索使用相同标签。玩家无法区分角色是在做 60 秒的巡逻还是在进行多层的秘境探索。
- **影响**: 两个完全不同的游戏活动使用了相同的状态标签，造成混淆。
- **建议**: 添加独立状态 'patrolling'（巡逻中），在 UI 中用不同颜色/标签区分。
- **Suggested command**: 自行修复

### H7. 无障碍性严重不足
- **位置**: 全局
- **严重级别**: High
- **类别**: Accessibility
- **描述**:
  1. 整个应用只有 2 个 `role` 属性和 2 个 `tabIndex` 属性
  2. 没有任何 `aria-label`、`aria-describedby`、`aria-live` 属性
  3. 自定义按钮元素（如建筑卡片、角色卡片）没有键盘支持（无 `onKeyDown`）
  4. 没有焦点可见性样式（focus indicator）
  5. 使用 `<div>` 而非 `<button>` 的自定义交互元素无法通过键盘激活
- **影响**: 使用键盘或屏幕阅读器的用户完全无法操作游戏。
- **建议**: 至少为所有自定义交互元素添加 `role="button"`、`tabIndex={0}`、`onKeyDown`、`aria-label`。
- **Suggested command**: `/harden`

### H8. CSS Module 中硬编码颜色
- **位置**: `src/pages/VaultPage.module.css:178,194`, `src/pages/CharactersPage.module.css:48,73,149,274,280,344`
- **严重级别**: High
- **类别**: Theming
- **描述**: 多个 CSS Module 中使用 `color: #fff` 硬编码白色，而非使用 CSS 变量（如 `var(--color-bg)` 或专门的 `--color-text-on-accent` 变量）。
- **影响**: 如果未来支持暗色模式或调整主题色，这些硬编码值不会跟随变化。
- **建议**: 在 `theme.css` 中添加 `--color-text-on-accent: #fff` 变量，替换所有硬编码的 `#fff`。
- **Suggested command**: `/normalize`

### H9. 锻造失败仍扣除资源
- **位置**: `src/stores/sectStore.ts:1028-1032`
- **严重级别**: High
- **类别**: Game Logic / Bug
- **描述**: `forgeEquipment` 在调用 `forgeEquipmentSystem`（判断锻造是否成功）**之前**就已经 `set()` 扣除了矿石和灵石。如果锻造失败（返回 null），资源已经被消耗。
- **影响**: 玩家在锻造失败时不仅没得到装备，还白白损失了资源。对于高级装备（25% 成功率），这意味着每次尝试有 75% 概率白赔资源。
- **建议**: 先调用 `forgeEquipmentSystem` 判断结果，只有成功时才扣除资源。
- **Suggested command**: 自行修复

### H10. Consumable 类型缺少 recipeId 字段
- **位置**: `src/types/item.ts:31-34`
- **严重级别**: High
- **类别**: Code Quality / Type Safety
- **描述**: `Consumable` 接口没有 `recipeId` 字段，但代码中通过 `(item as any).recipeId` 广泛使用（sectStore 3 处、adventureStore 2 处、BreakthroughPanel 1 处）。这是类型定义缺失。
- **影响**: 类型检查形同虚设，重构时容易引入 bug。
- **建议**: 在 `Consumable` 接口中添加 `recipeId?: string` 字段，移除所有 `as any` 断言。

### H11. 灵石可以变为负数（clampResources 不钳制灵石）
- **位置**: `src/systems/economy/ResourceEngine.ts:42-49`
- **严重级别**: High
- **类别**: Game Logic / Bug
- **描述**: `clampResources` 函数钳制了 `spiritEnergy`、`herb`、`ore`，但**灵石直接透传不钳制**。在突破消耗或购买大量物品时，灵石可能变为负数。
- **影响**: 玩家可能"欠债"消耗灵石，游戏经济系统失衡。
- **建议**: 在 `clampResources` 中添加灵石的钳制逻辑（如果有上限），或在扣费前检查余额。

### H12. 模态框/弹窗缺乏无障碍支持
- **位置**: `src/pages/AdventurePage.tsx:227`, `src/pages/BuildingsPage.tsx:478,550,654`
- **严重级别**: High
- **类别**: Accessibility
- **描述**: 所有模态框/弹窗/抽屉缺少 `role="dialog"`、`aria-modal="true"`、焦点陷阱和 Escape 键关闭支持。
- **影响**: 屏幕阅读器用户无法正确识别模态框，键盘用户可能被困在模态框中无法关闭。
- **建议**: 添加 dialog role、焦点管理和 Escape 键处理。
- **Suggested command**: `/harden`

---

## Medium-Severity Issues

### M1. AdventurePage 大量内联样式
- **位置**: `src/pages/AdventurePage.tsx:87-117`（约 10 处）
- **严重级别**: Medium
- **类别**: Code Quality
- **描述**: 巡逻区域的布局和样式使用内联 `style={{}}` 属性，而非 CSS Module。
- **影响**: 维护困难，无法利用 CSS 缓存，不符合项目使用 CSS Module 的一致模式。
- **建议**: 将内联样式迁移到 AdventurePage.module.css。
- **Suggested command**: `/normalize`

### M2. App.tsx Loading 屏幕使用内联样式
- **位置**: `src/App.tsx:73-77`
- **严重级别**: Medium
- **类别**: Code Quality
- **描述**: 加载屏幕使用 `style={{ display: 'flex', ... }}` 和 `style={{ fontSize: '1.25rem', ... }}`。
- **影响**: 与项目其他部分使用 CSS Module 的模式不一致。
- **建议**: 创建 LoadingScreen 组件或使用 CSS 类。

### M3. 突破面板使用 `as any` 类型断言
- **位置**: `src/components/cultivation/BreakthroughPanel.tsx:32`
- **严重级别**: Medium
- **类别**: Code Quality
- **描述**: `vault.some(item => item.type === 'consumable' && (item as any).recipeId === cost.pillId)` 使用 `as any` 绕过类型检查。
- **影响**: 可能隐藏类型错误，重构时容易引入 bug。
- **建议**: 为 Consumable 类型添加 `recipeId` 字段定义，或使用类型守卫。

### M4. 灵气可能变为负数
- **位置**: `src/stores/sectStore.ts:847-876`
- **严重级别**: Medium
- **类别**: Game Logic
- **描述**: `tickAll` 中计算灵气消耗后，没有将灵气值钳制为 ≥ 0。如果消耗超过产出（多个修炼角色同时消耗），灵气会变为负数。
- **影响**: 负数的灵气在 UI 中显示为负值，不符合游戏逻辑。修炼应该在没有灵气时停止或降低效率。
- **建议**: 在计算后添加 `updatedSpiritEnergy = Math.max(0, updatedSpiritEnergy)`，并在灵气为 0 时停止修炼进度增长。

### M5. 突破是完全自动的，玩家无选择权
- **位置**: `src/stores/sectStore.ts:878-957`
- **严重级别**: Medium
- **类别**: Game Design
- **描述**: 当修为达到 100% 且满足突破条件时，系统自动执行突破（有 5% 失败率）。玩家无法选择等待更好的时机（如使用丹药降低失败率、等待 Buff 等）。
- **影响**: 对于有失败惩罚（修为清零）的突破，自动执行可能不是玩家想要的策略。
- **建议**: 至少对有失败风险的突破添加手动确认选项。可以在设置中添加"自动突破"开关。

### M6. 无 React.memo 优化
- **位置**: 全局组件
- **严重级别**: Medium
- **类别**: Performance
- **描述**: 所有组件都是普通函数组件，没有任何 `React.memo` 包装。在每秒 tick 更新的场景下，所有组件都会重新渲染。
- **影响**: 随着角色和建筑数量增加，不必要的重渲染会导致性能下降。
- **建议**: 对 `CharacterCard`、`ResourceRate`、`ProgressBar` 等高频渲染组件使用 `React.memo`。
- **Suggested command**: `/optimize`

### M7. 秘境列表显示"解锁"文字但不可交互
- **位置**: `src/pages/AdventurePage.tsx:160-180`
- **严重级别**: Medium
- **类别**: UX
- **描述**: 未解锁的秘境旁边显示"解锁"文字（如"炼气期 圆满 解锁"），但这只是描述文本，不是按钮。玩家可能尝试点击"解锁"文字但没有反应。
- **影响**: 看起来像可交互元素但实际上不是，违反 Nielsen 启发式原则。
- **建议**: 将"解锁"文字改为灰色不可用状态，或改为"需要: 炼气期 圆满"更明确的描述。

### M8. BottomNav 缺少 active 指示器（移动端）
- **位置**: `src/components/common/BottomNav.tsx`
- **严重级别**: Medium
- **类别**: UX
- **描述**: 从 snapshot 中看，底部导航栏只显示文字标签，没有高亮当前页面的指示。玩家需要靠文字区分自己在哪个页面。
- **建议**: 添加当前页面的视觉指示器（如下划线、颜色变化、背景色）。

### M9. globals.css 中硬编码背景色
- **位置**: `src/styles/globals.css:88`
- **严重级别**: Medium
- **类别**: Theming
- **描述**: `background-color: #ede7db;` 没有使用 CSS 变量。theme.css 中已定义 `--color-bg-paper`。
- **影响**: 不一致的主题变量使用。
- **建议**: 替换为 `background-color: var(--color-bg-paper)`。

### M10. 建筑页面"仓库"Tab 功能与独立仓库页面重复
- **位置**: `src/pages/BuildingsPage.tsx`（VaultTab）与 `src/pages/VaultPage.tsx`
- **严重级别**: Medium
- **类别**: UX / Architecture
- **描述**: 建筑页面内的"仓库"Tab 和独立的"仓库"页面显示完全相同的内容。两个入口增加了导航混乱。
- **影响**: 玩家可能不清楚两个仓库入口的区别，且需要维护两处相同逻辑。
- **建议**: 移除建筑页面的仓库 Tab，或将其改为建筑专用的快捷操作面板（如快速消耗资源）。

### M11. Zustand Store 订阅过宽导致每秒全量重渲染
- **位置**: `src/pages/SectPage.tsx:9`, `src/pages/BuildingsPage.tsx:100`, `src/pages/AdventurePage.tsx:37`, `src/components/common/TopBar.tsx:14`
- **严重级别**: Medium
- **类别**: Performance
- **描述**: 多个组件使用 `useSectStore((s) => s.sect)` 订阅整个 sect 对象。游戏每秒 tick 更新资源，导致所有这些组件及其子组件全部重渲染。
- **影响**: 随着游戏数据增长（更多角色、更多物品），性能会逐渐下降。
- **建议**: 使用选择器订阅具体字段，如 `useSectStore((s) => s.sect.resources)` 而非整个 sect。
- **Suggested command**: `/optimize`

### M12. enhanceItem 存在竞态条件
- **位置**: `src/stores/sectStore.ts:607-632`
- **严重级别**: Medium
- **类别**: Game Logic / Bug
- **描述**: `enhanceItem` 方法先 `set()` 扣除资源，再 `get()` 读取背包，再 `set()` 更新物品。两次 `set()` 之间如果有其他操作修改了背包（如 transferItemToVault），backpackIndex 会失效。
- **影响**: 可能强化错误的物品或导致状态不一致。
- **建议**: 将两次 `set()` 合并为一次原子操作。

### M13. Boss 事件使用非空断言
- **位置**: `src/systems/roguelike/EventSystem.ts:203`
- **严重级别**: Medium
- **类别**: Game Logic
- **描述**: `ENEMY_TEMPLATES.find((e) => e.isBoss)!` 使用非空断言。如果没有 Boss 模板，会崩溃。
- **建议**: 添加 fallback（如使用普通敌人模板或跳过事件）。

### M14. getMaxSimultaneousRuns 高等级返回 undefined
- **位置**: `src/stores/adventureStore.ts:684`
- **严重级别**: Medium
- **类别**: Game Logic
- **描述**: 当宗门等级超出 `SECT_LEVEL_TABLE` 范围时，`getMaxSimultaneousRuns` 返回 `undefined`。`undefined >= N` 为 `false`，导致可以同时进行无限次秘境。
- **影响**: 高等级玩家可能 exploit 同时进行大量秘境。
- **建议**: 对超出表范围的等级使用最后一个有效值作为默认值。

### M15. 缺少 focus-visible 焦点样式
- **位置**: 全局 CSS
- **严重级别**: Medium
- **类别**: Accessibility
- **描述**: 整个应用没有 `:focus-visible` 样式。键盘用户无法看到当前焦点在哪个元素上。
- **影响**: 违反 WCAG 2.4.7（焦点可见）。键盘导航完全不可用。
- **建议**: 在 `globals.css` 中添加全局 `:focus-visible` 样式。
- **Suggested command**: `/harden`

### M16. 未定义的 CSS 变量使用了不匹配的 fallback 颜色
- **位置**: `src/pages/BuildingsPage.module.css:381,386`, `src/components/building/MarketPanel.module.css:77`
- **严重级别**: Medium
- **类别**: Theming
- **描述**: 使用了 `var(--color-info, #2196f3)` 和 `var(--color-accent-purple, #9c27b0)`，这些变量在 `theme.css` 中未定义。fallback 颜色是 Material Design 蓝紫色，与水墨风格不匹配。
- **建议**: 要么在 theme.css 中定义这些变量（使用水墨风格的颜色），要么直接使用匹配主题的颜色值。

---

## Low-Severity Issues

### L1. 首页弟子列表点击不进入详情（桌面端）
- **位置**: `src/pages/SectPage.tsx:114-126`
- **严重级别**: Low
- **类别**: UX
- **描述**: 首页弟子列表中的角色卡片点击无响应。需要导航到弟子页面才能查看详情。
- **影响**: 增加了一个导航步骤。
- **建议**: 首页弟子卡片点击后跳转到弟子详情页，或在首页展开一个简要面板。

### L2. 天劫秘境名称后有多余空格
- **位置**: `src/data/events.ts`
- **严重级别**: Low
- **类别**: Bug
- **描述**: 冒险页面显示"渡劫飞升 "（末尾有空格）。
- **影响**: 微小的显示瑕疵。
- **建议**: 去掉名称末尾空格。

### L3. 角色技能区显示 skillId 而非技能名称
- **位置**: `src/pages/CharactersPage.tsx:402`
- **严重级别**: Low
- **类别**: UX
- **描述**: 当角色装备了技能时，技能槽显示的是 skillId（如 "basic_attack"），而非人类可读的技能名称。
- **影响**: 玩家看到的技能名是内部 ID，不友好。
- **建议**: 添加 skillId 到中文名称的映射表。

### L4. 没有"新手指引"或空状态引导
- **位置**: 全局
- **严重级别**: Low
- **类别**: UX
- **描述**: 新游戏开始时没有任何引导。仓库为空只显示"仓库为空"，没有提示如何获取物品。冒险页面的秘境全部锁定，没有提示如何解锁。
- **影响**: 新玩家可能不知道该做什么。
- **建议**: 在关键页面添加简短的提示文字（如"升级弟子境界以解锁更多秘境"）。
- **Suggested command**: `/onboard`

### L5. EquipPanel 和 EnhancePanel 使用内联样式
- **位置**: `src/components/inventory/EquipPanel.tsx:46`, `src/components/inventory/EnhancePanel.tsx:24`
- **严重级别**: Low
- **类别**: Code Quality
- **描述**: 小量内联样式。
- **建议**: 迁移到对应 CSS Module 文件。

### L6. 加载屏幕使用英文 "Loading..."
- **位置**: `src/App.tsx:77`
- **严重级别**: Low
- **类别**: i18n
- **描述**: 游戏全部是中文，但加载界面使用英文 "Loading..."。
- **建议**: 改为"加载中..."或使用水墨风格的加载动画。

---

## Patterns & Systemic Issues

1. **自定义交互元素缺乏可访问性** — 整个应用大量使用 `<div onClick>` 作为按钮，没有标准的 button 语义、键盘支持或 ARIA 属性。
2. **状态标签复用** — 'adventuring' 状态被巡逻和秘境探索共用，导致 UI 混淆。需要更细粒度的状态区分。
3. **内联样式散布** — AdventurePage 是最严重的，但 EquipPanel、EnhancePanel、App.tsx 也有。应统一迁移到 CSS Module。
4. **CSS 变量使用不一致** — theme.css 定义了完善的变量体系，但 CSS Module 中仍使用硬编码值（#fff）。

---

## Positive Findings

1. **完善的 CSS 变量体系** — `theme.css` 定义了完整的设计令牌（颜色、间距、阴影、字体），覆盖主要 UI 需求。
2. **合理的 Zustand store 架构** — 将状态拆分为 gameStore、sectStore、adventureStore、eventLogStore 四个关注点清晰的 store。
3. **完善的 IndexedDB 持久化** — v2 schema 使用 per-entity 存储，支持离线追赶，auto-save 有 debounce。
4. **完整测试覆盖** — 28+ 测试文件覆盖所有核心系统。
5. **响应式架构基础良好** — 移动端 BottomNav / 桌面端 Sidebar 的切换机制工作正常。
6. **水墨美学方向正确** — 没有陷入 AI 典型的渐变/发光/玻璃拟态陷阱，保持了古朴克制的设计感。
7. **useMemo 使用得当** — 关键计算（资源产出率、角色过滤、队伍统计等）都有 memo 化。
8. **游戏系统全面** — 修炼、突破、装备、炼丹、锻造、秘境、巡逻、宠物、功法等系统齐全。

---

## Recommendations by Priority

### 1. Immediate (Critical Blockers)
1. **C0**: 修复巡逻次数永不重置（游戏破坏性 Bug）
2. **C1**: 降低建筑功能面板解锁门槛（Lv1 解锁基础使用）
3. **C2**: 添加 Error Boundary
4. **C3**: 修复角色状态显示冲突
5. **H9**: 修复锻造失败仍扣资源

### 2. Short-term (This Sprint)
6. **H1**: 完善巡逻系统 UI（角色名、进度条、剩余次数）
7. **H2**: 升级成功动画反馈
8. **H3**: 去除重复建造事件
9. **H4**: 移除移动端重复资源显示
10. **H5**: 移动端角色卡片添加进度条
11. **H6**: 巡逻添加独立状态
12. **H10**: 修复 Consumable 类型定义
13. **H11**: 灵石负数钳制
14. **H7+H12**: 核心交互元素无障碍支持（ARIA + 模态框）

### 3. Medium-term (Next Sprint)
15. **H8**: CSS 硬编码颜色迁移到变量
16. **M1-M2**: 清理内联样式
17. **M4**: 灵气负数钳制
18. **M5**: 突破策略选择
19. **M6+M11**: React.memo + Store 选择器优化
20. **M7**: 秘境解锁提示优化
21. **M8**: BottomNav active 指示器
22. **M12-M16**: 竞态条件、Boss 断言、无限秘境、焦点样式等

### 4. Long-term (Nice-to-have)
23. **L1**: 首页角色卡片交互
24. **L4**: 新手引导
25. **L6**: 中文加载界面
26. **Dark mode 支持**

---

## Suggested Commands for Fixes

| 问题 | 建议命令 |
|------|---------|
| 无 Error Boundary、可访问性缺失、灵气负数 | `/harden` |
| 升级成功反馈、巡逻 UI 完善 | `/polish`, `/delight` |
| 升级成功动画 | `/animate` |
| 硬编码颜色、内联样式、重复显示 | `/normalize`, `/distill` |
| 性能优化（React.memo） | `/optimize` |
| 新手引导 | `/onboard` |
| 移动端卡片信息缺失 | `/adapt` |
| 建筑面板门槛、巡逻状态等游戏设计问题 | 自行修复 |
