# EndlessQuest

## What This Is

仙侠放置 Roguelike Web 游戏。玩家以宗门为单位经营弟子、修炼突破、组建队伍探索秘境，在碎片时间完成经营判断和单局冒险押注。水墨风格 UI，移动端底部导航 + 桌面端侧边栏。

## Core Value

玩家用很少的操作完成真实的经营判断、弟子培养和单局冒险押注。

## Requirements

### Validated

- ✓ 宗门总览（SectPage）— 轻提示总览，展示经营/弟子/冒险三类各 1 条代表性变化
- ✓ 弟子管理（CharactersPage）— 弟子池、角色定位、装备/修炼/功法详情
- ✓ 建筑经营（BuildingsPage）— 升级、生产、炼丹、锻造、坊市、藏经阁、招募
- ✓ 秘境冒险（AdventurePage）— 意图选择（守成/争锋/寻机）、战术预设、局内构筑（祝福/遗珍）、战报
- ✓ 宗门宝库（VaultPage）— 共享储物、物品转移、出售
- ✓ 修炼突破系统 — 境界体系（炼气→筑基→金丹→元婴→化神）、双资源突破（灵石+灵力）
- ✓ 命运标签 — 突破/渡劫后果标签（天劫伤痕/心魔种子/顿悟/道心稳固）
- ✓ 宗门路线 — 丹道/剑道/御兽三条路线，含解锁节点
- ✓ 宗门历史里程碑 — 首次招募/渡劫/boss 通关记录
- ✓ 放置引擎 — 1 秒 tick 循环、自动修炼、自动存档（IndexedDB）、离线追赶
- ✓ 自动化系统 — 日循环自动招募/突破/派遣、弟子恢复状态、失败恢复机制
- ✓ 战斗系统 — 回合制、元素克制、技能/装备属性计算
- ✓ 物品系统 — 品质体系（common→chaos）、掉落表、装备槽位
- ✓ 宠物系统 — 宠物生成、喂养、品质
- ✓ 功法系统 — 功法学习、突破时参悟触发
- ✓ 水墨风格 UI — 清墨轻岚基调、像素图标系统、响应式布局（移动/桌面）

### Active

- [ ] 角色成长深度 — 修炼路线、元素亲和、技能装备、宠物战斗集成
- [ ] 精炼系统 UI 接入
- [ ] 套装加成系统
- [ ] 天赋扩展（机制型天赋）
- [ ] 功法参悟度系统
- [ ] 专长系统集成（rollSpecialties 接入 generateCharacter）
- [ ] 称号晋升系统
- [ ] 页面轻量化重构（弟子页/秘境页 automation-first）

### Out of Scope

- 多人对战/排行榜 — 当前为单机放置游戏
- 服务器端架构 — 纯客户端 SPA，IndexedDB 本地存档
- 声音/音乐 — 暂无音频系统计划
- 国际化 — 仅中文

## Context

### 技术环境
- React 19 + TypeScript 5.9 + Zustand 5 + CSS Modules + Vitest + IndexedDB
- Vite 8 构建，纯 SPA 无服务端
- 240 个源文件，373 个测试，18 个测试文件
- 详见 `.planning/codebase/` 下的代码库映射文档

### 设计上下文
- 用户群：仙侠放置游戏爱好者与 Roguelike 策略玩家的交集
- 品牌气质：古朴、禅意、有力量感
- 美术方向：浅色水墨风格 + 仙侠手游 UI 布局
- 日常清墨轻岚基调，关键时刻赭石/印泥高光
- 移动优先逐级增强，平板端（640-1023px）需独立设计

### 已知技术问题（来自 CONCERNS.md）
- tickSlice.ts 中突破逻辑重复约 150 行
- 品质标签/顺序定义分散在 7 处
- 120 处跨 Store 直接访问（useSectStore.getState()）
- 平板断点仅 StatsPanel 实现，其他页面缺失
- 模态框缺少焦点捕获，可点击卡片缺少 role="button"
- adventureStore.ts 中 2 处乱码中文字符串

## Constraints

- **Tech Stack**: React 19 + TypeScript + Zustand + CSS Modules — 已锁定，不引入新 UI 框架
- **Browser Only**: 纯客户端 SPA，所有数据存 IndexedDB — 无服务端依赖
- **水墨风格**: 必须遵循清墨轻岚设计系统 — 不使用 MMO 式重度 UI
- **移动优先**: 布局以移动端为起点，逐级增强桌面端
- **存档兼容**: 新字段必须有迁移逻辑，旧存档必须可加载

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 宗门为中心（非玩家个体） | 放置游戏以"经营"为核心乐趣 | ✓ Good |
| Zustand slice pattern | 单一大 store 可管理，slice 拆分职责 | ⚠️ Revisit — tickSlice 已 520 行 |
| 纯函数系统层 | 系统 export 函数无副作用，store 调用并应用结果 | ✓ Good |
| CSS Modules | 组件级样式隔离，配合水墨主题变量 | ✓ Good |
| IndexedDB per-entity stores | 大存档性能优于 localStorage blob | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-02 after Phase 1 Foundation completion*
