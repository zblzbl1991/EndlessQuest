# Responsive Design Spec

将 EndlessQuest 从纯移动端布局（480px 锁定）改造为响应式布局，支持移动端与桌面端双端适配。

## 设计背景

当前应用全局锁定 `max-width: 480px`，零媒体查询，所有弹窗为底部抽屉模式。需要改造为移动端底部导航 + 桌面端左侧侧边栏，桌面端充分利用更宽屏幕展示更多信息。

## 断点策略

| 断点 | 范围 | 导航 | 布局 | 弹窗 |
|------|------|------|------|------|
| 移动端 | < 640px | 底部标签栏 | 单列 | 底部抽屉 |
| 平板端 | 640px - 1023px | 底部标签栏 | 适当增加列数 | 底部抽屉 |
| 桌面端 | >= 1024px | 左侧侧边栏 | 多列网格、面板并排 | 居中对话框 |

## 一、全局框架改造

### globals.css

- `body`：移除 `max-width: 480px`，改为 `width: 100%`
- `body::before`：水墨纹理从 480px 居中改为全屏铺开
- `.page-content`：
  - 移动端：保持 `padding-bottom: 72px`（底部导航空间）
  - 桌面端：`padding-left: var(--sidebar-width)`，无底部 padding
- 移除 `#root` 上可能的宽度约束

### theme.css 新增变量

```css
--sidebar-width: 200px;
--topbar-height: 52px;
--bottomnav-height: 64px;
--font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
--color-warning: #e67e22;
```

## 二、导航切换

### 新建 Sidebar 组件

- 固定左侧，`width: 200px`，水墨风格面板背景
- 内容结构（从上到下）：
  1. 宗门名（serif 字体，14px）
  2. 灵石数量显示（带图标）
  3. 分隔线
  4. 5 个导航链接：宗门 / 弟子 / 建筑 / 秘境 / 仓库
  5. 底部装饰性留白
- 导航项：当前页面左侧 3px 赭石色竖条高亮，文字加粗
- 导航项高度 `min-height: 44px`，图标 + 文字水平排列
- `z-index: 50`

### 显示/隐藏（纯 CSS）

```css
/* 移动端 + 平板端 */
@media (max-width: 1023px) {
  .sidebar { display: none; }
}

/* 桌面端 */
@media (min-width: 1024px) {
  .bottomNav { display: none; }
  .page-content { padding-left: var(--sidebar-width); padding-bottom: 0; }
}
```

### TopBar 调整

- 移动端：保持现状（sticky 顶部，显示宗门名 + 灵石）
- 桌面端：隐藏灵石显示（已移至侧边栏），TopBar 仅显示页面标题
- 移除所有 `max-width: 480px` 约束

### App.tsx 改动

- 在 `<BrowserRouter>` 内同时渲染 `TopBar`、`Sidebar`、`page-content`、`BottomNav`
- Sidebar 放在最外层，与 TopBar 同级

## 三、各页面响应式布局

### SectPage

| 区域 | 移动端 | 桌面端（>=1024px） |
|------|--------|-------------------|
| 资源总览 | 2x2 网格 | 4x1 横排 |
| 资源产出 | 横排 flex | 保持不变 |
| 弟子概况 | 横排 flex（3 项） | 保持不变 |
| 弟子列表 | 单列 flex | 2 列网格 |
| 冒险进行中 | 单列 | 2 列网格 |

### CharactersPage

| 区域 | 移动端 | 桌面端（>=1024px） |
|------|--------|-------------------|
| 角色网格 | 2 列 | 3 列 |
| 角色列表 | 单列 | 2 列 |
| 详情-基础属性 | 3 列网格 | 6 列网格 |
| 详情-修炼属性 | 3 列网格 | 4 列网格 |
| 详情-装备槽 | 3 列网格 | 保持 3 列 |
| 详情-背包 | 单列列表 | 2 列网格 |
| 详情-技能 | 5 列 | 保持 5 列 |

### BuildingsPage

| 区域 | 移动端 | 桌面端（>=1024px） |
|------|--------|-------------------|
| 建筑列表 | 单列 | 2 列网格 |
| 品质选择 | 2x2 网格 | 4x1 横排 |
| 转移弹窗 | 底部抽屉 | 居中对话框 |

### AdventurePage

| 区域 | 移动端 | 桌面端（>=1024px） |
|------|--------|-------------------|
| 秘境列表 | 单列 | 2 列网格 |
| 队伍成员 | grid 60px 1fr 40px | grid 100px 1fr 60px |
| 事件日志 | max-height 100px | max-height 250px |
| 组队弹窗 | 底部抽屉 | 居中对话框 |

### VaultPage

| 区域 | 移动端 | 桌面端（>=1024px） |
|------|--------|-------------------|
| 物品网格 | 1 列 | 3-4 列 |
| 物品详情 | 嵌入下方（垂直流） | 右侧固定面板（grid 2 列布局：左边物品列表，右边详情） |

## 四、弹窗适配

所有使用底部抽屉模式的弹窗在桌面端变为居中对话框：

涉及的弹窗：
1. BuildingsPage 转移弹窗（`transferModal`）
2. AdventurePage 组队弹窗（`teamBuilder`）

CSS 转换规则：
```css
@media (min-width: 1024px) {
  .overlay {
    align-items: center; /* 替代 align-items: flex-end */
    justify-content: center;
  }
  .modalContent {
    max-width: 600px;
    border-radius: var(--radius-lg); /* 四角圆角 */
    max-height: 80vh;
  }
}
```

## 五、其他修复

1. 定义 `--font-mono`（AdventurePage 事件日志使用，当前未定义）
2. 定义 `--color-warning`（AdventurePage 伤害状态使用，当前未定义）
3. 统一移除所有 `.page` 上的 `max-width: 480px`
4. 桌面端移除各页面的 `padding-bottom: 80px`（由全局 `.page-content` 的 padding-left 替代导航空间）

## 六、不涉及的改动

- 不改变任何业务逻辑或数据流
- 不引入新的依赖
- 不重构组件结构（保持现有组件拆分方式）
- 不改变配色方案或字体
- 不修改测试（CSS 变更不影响现有测试）
