# Project: EndlessQuest

仙侠放置 Roguelike Web 游戏。

## Architecture

React 19 + TypeScript + Zustand + CSS Modules + Vitest + IndexedDB

## Current Status

Core Product Overhaul 已完成（2026-03-27 ~ 03-29），项目已具备完整的核心循环：

- **宗门仪表盘**：行动导向的 SectPage，修行要务卡片引导优先级
- **秘境构筑**：战术预设、祝福/遗珍系统、道途分支、局内 RunBuild
- **弟子命运**：专长→角色推荐、命运标签（劫伤/心魔/顿悟/道心）
- **宗门路线**：丹道/剑道/御兽三条路线，各含解锁节点
- **宗门历史**：里程碑记录（首次招募/渡劫/boss 通关）

详见 `docs/superpowers/specs/2026-03-30-core-product-overhaul-completion.md`。

## Next Up

角色成长深度设计（P2）：修炼路线、元素亲和、技能装备、宠物战斗集成、精炼系统、套装加成、天赋扩展、功法参悟度。详见 `docs/superpowers/specs/2026-03-29-character-progression-design.md`。

## Design Context

### Users
仙侠放置游戏爱好者与 Roguelike 策略玩家的交集人群。熟悉修仙放置/挂机类手游，也喜欢以撒、杀戮尖塔等 Roguelike 的策略深度。主要在碎片时间和晚间放松时段游玩。

### Brand Personality
**古朴、禅意、有力量感**

### Aesthetic Direction
浅色水墨风格 + 仙侠手游 UI 布局。宣纸色为底，水墨晕染为装饰，赭石色为强调。避免 MMO 式重度 UI（太多按钮/弹窗/数字堆砌/满屏发光特效）。移动端底部标签栏 + 桌面端左侧侧边栏，CSS 响应式切换。

### Responsive Strategy
- **断点**：640px（移动/平板）、1024px（平板/桌面）
- **移动端（< 640px）**：底部标签导航、单列布局、底部抽屉弹窗、44px 最小触控区域
- **桌面端（≥ 1024px）**：左侧固定侧边栏导航、多列网格、面板并排、居中弹窗
- **参考风格**：修仙手游 PC 模拟器的原生化适配

### Design Principles

1. **留白即呼吸** — 水墨画的灵魂在于留白。UI 通过充足的间距和留白让界面"透气"。信息密度适度，宁可多一层点击也不要一次展示太多。
2. **水墨晕染，不张扬** — 视觉效果以水墨质感为主（渐变、晕染、淡入淡出）。日常界面保持清淡素雅，避免霓虹发光、厚重描边、过度饱和的颜色。
3. **关键时刻，浓墨重彩** — 日常界面保持禅意和克制，但境界突破、通关秘境、获得稀有物品等成就时刻必须有强烈的视觉反馈。反差越大，冲击越强。
4. **信息层级如山水远近** — 像山水画有近景中景远景，UI 有清晰的层级关系。最重要的信息最近最清晰，次要信息渐远渐淡。
5. **移动优先，逐级增强** — 基础布局以移动端为起点，通过 `min-width` 媒体查询逐步增强桌面端体验。移动端底部导航，桌面端侧边栏导航，CSS 响应式切换。
6. **宽屏不浪费** — 桌面端不简单居中放大移动端布局，而是重新组织信息：列表变多列网格、面板可并排、详情可侧滑展开。保持禅意克制，不因空间充裕而堆砌信息。
7. **可操作即可见** — 玩家可执行的操作（建造、升级、锻造等）必须有明确的赭石色实心按钮提示，不可操作时切换为灰底灰字禁用态。所有按钮必须有 ready/disabled 两种状态，不能回归浏览器默认样式。

### Pixel Icon System
- **风格**：水墨像素 — 像素图标使用项目水墨配色（赭石、墨灰、宣纸），不使用鲜艳复古色
- **格式**：React SVG 组件，24×24 viewBox，`shape-rendering: crispEdges`
- **调色板**：复用 theme.css 的 `--color-accent`(赭石)、`--color-text`(墨色)、`--color-quality-*`(品质色)、`--color-bg`(纸色) 等 token
- **类别**：建筑(8)、境界(6)、角色状态(8)、品质(5)、装备槽位(9)、元素(5)、资源(4)、系统UI 等
- **组件**：`<PixelIcon name="..." size={24} />` 统一入口，支持 variant 属性切换品质/元素配色

## Design Docs

- 完成总结：`docs/superpowers/specs/2026-03-30-core-product-overhaul-completion.md`
- 下一步设计：`docs/superpowers/specs/2026-03-29-character-progression-design.md`
- 已归档方案：`docs/superpowers/specs/2026-03-27-core-product-overhaul.md`
- 已归档路线图：`docs/superpowers/plans/2026-03-27-core-product-overhaul-roadmap.md`
