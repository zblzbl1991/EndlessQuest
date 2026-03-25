# Responsive Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 EndlessQuest 从纯移动端（480px 锁定）改造为响应式布局，支持移动端底部导航 + 桌面端侧边栏导航。

**Architecture:** 纯 CSS 响应式方案。通过媒体查询切换导航模式（底部标签栏 ↔ 左侧边栏），各页面通过 `min-width` 媒体查询渐进增强桌面端布局。导航切换完全由 CSS 驱动，无需 JS 检测设备类型。

**Tech Stack:** React 19 + CSS Modules + CSS Custom Properties + Media Queries

**Spec:** `docs/superpowers/specs/2026-03-25-responsive-design.md`

---

## File Map

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/styles/theme.css` | 修改 | 新增布局变量和缺失变量 |
| `src/styles/globals.css` | 修改 | 移除 480px 约束，添加响应式 padding |
| `src/components/common/Sidebar.tsx` | 新建 | 桌面端侧边栏导航组件 |
| `src/components/common/Sidebar.module.css` | 新建 | 侧边栏样式 |
| `src/components/common/TopBar.tsx` | 修改 | 无改动（CSS 驱动响应式） |
| `src/components/common/TopBar.module.css` | 修改 | 移除 480px，桌面端隐藏资源 |
| `src/components/common/BottomNav.module.css` | 修改 | 桌面端隐藏 |
| `src/App.tsx` | 修改 | 添加 Sidebar 组件 |
| `src/pages/SectPage.module.css` | 修改 | 移除 480px，添加桌面端网格 |
| `src/pages/CharactersPage.module.css` | 修改 | 移除 480px，添加桌面端网格 |
| `src/pages/BuildingsPage.module.css` | 修改 | 移除 480px，添加桌面端网格和弹窗适配 |
| `src/pages/AdventurePage.module.css` | 修改 | 移除 480px，添加桌面端网格、弹窗适配 |
| `src/pages/VaultPage.module.css` | 修改 | 移除 480px，添加桌面端两列布局 |

---

### Task 1: 主题变量更新

**Files:**
- Modify: `src/styles/theme.css`

- [ ] **Step 1: 添加布局变量和修复缺失变量**

在 `theme.css` 的 `:root` 中，在 `/* Transition */` 块之后添加：

```css
  /* Layout */
  --sidebar-width: 200px;
  --topbar-height: 52px;
  --bottomnav-height: 64px;

  /* Missing - now defined */
  --font-mono: 'Consolas', 'Courier New', monospace;
  --color-warning: #e67e22;
```

- [ ] **Step 2: 验证构建**

Run: `npx tsc --noEmit && npx vite build`
Expected: 编译和构建成功

- [ ] **Step 3: Commit**

```bash
git add src/styles/theme.css
git commit -m "feat(responsive): add layout and missing CSS variables to theme"
```

---

### Task 2: 全局布局改造

**Files:**
- Modify: `src/styles/globals.css`

- [ ] **Step 1: 移除 body 480px 约束**

将 `globals.css` 第 15-23 行的 body 规则替换为：

```css
body {
  font-family: var(--font-sans);
  color: var(--color-text);
  background-color: var(--color-bg);
  min-height: 100vh;
  margin: 0;
  overflow-x: hidden;
}
```

- [ ] **Step 2: 更新 page-content 响应式**

将 `.page-content`（第 67-73 行）替换为：

```css
.page-content {
  flex: 1;
  padding: var(--space-md);
  padding-bottom: 72px;
  position: relative;
  z-index: 1;
}

@media (min-width: 1024px) {
  .page-content {
    padding-left: var(--sidebar-width);
    padding-bottom: 0;
  }
}
```

- [ ] **Step 3: 更新桌面端 body 背景**

在文件末尾添加桌面端背景样式，使水墨纹理在全屏铺开时更自然：

```css
@media (min-width: 1024px) {
  body {
    background-color: #ede7db;
  }

  body::before {
    background:
      radial-gradient(ellipse at 15% 50%, rgba(196, 181, 160, 0.1) 0%, transparent 50%),
      radial-gradient(ellipse at 85% 20%, rgba(196, 181, 160, 0.08) 0%, transparent 50%),
      radial-gradient(ellipse at 50% 80%, rgba(139, 69, 19, 0.05) 0%, transparent 50%);
  }
}
```

- [ ] **Step 4: 验证构建**

Run: `npx tsc --noEmit && npx vite build`
Expected: 编译和构建成功

- [ ] **Step 5: Commit**

```bash
git add src/styles/globals.css
git commit -m "feat(responsive): remove 480px constraint, add responsive page-content padding"
```

---

### Task 3: 创建侧边栏组件

**Files:**
- Create: `src/components/common/Sidebar.tsx`
- Create: `src/components/common/Sidebar.module.css`

- [ ] **Step 1: 创建侧边栏样式**

创建 `src/components/common/Sidebar.module.css`：

```css
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: var(--sidebar-width);
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(8px);
  border-right: 1px solid var(--color-border-light);
  display: flex;
  flex-direction: column;
  z-index: 50;
  padding: var(--space-lg) 0;
}

.sidebarHeader {
  padding: 0 var(--space-lg);
  margin-bottom: var(--space-lg);
  padding-bottom: var(--space-md);
  border-bottom: 1px solid var(--color-border-light);
}

.sectName {
  font-family: var(--font-serif);
  font-size: 15px;
  font-weight: 700;
  color: var(--color-accent);
  margin-bottom: var(--space-xs);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.resourceItem {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.resourceLabel {
  color: var(--color-text-tertiary);
}

.resourceValue {
  font-weight: 500;
  color: var(--color-text);
}

.navList {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 var(--space-sm);
}

.navItem {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: all var(--transition-fast);
  min-height: 44px;
  border-left: 3px solid transparent;
}

.navItem:hover {
  background: var(--color-panel);
  color: var(--color-text);
}

.navActive {
  color: var(--color-accent);
  font-weight: 600;
  background: rgba(139, 69, 19, 0.06);
  border-left-color: var(--color-accent);
}

.navIcon {
  font-size: 16px;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.navLabel {
  flex: 1;
}

/* Hide sidebar on mobile/tablet */
@media (max-width: 1023px) {
  .sidebar {
    display: none;
  }
}
```

- [ ] **Step 2: 创建侧边栏组件**

创建 `src/components/common/Sidebar.tsx`：

```tsx
import { NavLink } from 'react-router-dom'
import { useSectStore } from '../../stores/sectStore'
import styles from './Sidebar.module.css'

const navItems = [
  { to: '/', label: '宗门', icon: '⛩' },
  { to: '/characters', label: '弟子', icon: '👤' },
  { to: '/buildings', label: '建筑', icon: '🏯' },
  { to: '/adventure', label: '秘境', icon: '⚔' },
  { to: '/vault', label: '仓库', icon: '📦' },
]

export default function Sidebar() {
  const sect = useSectStore((s) => s.sect)

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <div className={styles.sectName}>{sect.name}</div>
        <div className={styles.resourceItem}>
          <span className={styles.resourceLabel}>灵石</span>
          <span className={styles.resourceValue}>{Math.floor(sect.resources.spiritStone).toLocaleString()}</span>
        </div>
      </div>
      <nav className={styles.navList}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navActive : ''}`
            }
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span className={styles.navLabel}>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 3: 验证构建**

Run: `npx tsc --noEmit && npx vite build`
Expected: 编译和构建成功

- [ ] **Step 4: Commit**

```bash
git add src/components/common/Sidebar.tsx src/components/common/Sidebar.module.css
git commit -m "feat(responsive): add desktop sidebar navigation component"
```

---

### Task 4: 导航组件响应式

**Files:**
- Modify: `src/components/common/TopBar.module.css`
- Modify: `src/components/common/BottomNav.module.css`
- Modify: `src/App.tsx`

- [ ] **Step 1: TopBar 响应式**

将 `TopBar.module.css` 第 1-16 行的 `.topBar` 替换为：

```css
.topBar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-sm) var(--space-md);
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--color-border-light);
  position: sticky;
  top: 0;
  z-index: 50;
  width: 100%;
  box-sizing: border-box;
}

@media (max-width: 1023px) {
  .topBar {
    max-width: 480px;
    margin: 0 auto;
  }
}

@media (min-width: 1024px) {
  .topBar {
    padding-left: var(--sidebar-width);
  }

  .topBar .resources {
    display: none;
  }
}
```

- [ ] **Step 2: BottomNav 响应式**

在 `BottomNav.module.css` 末尾添加：

```css
@media (min-width: 1024px) {
  .nav {
    display: none;
  }
}
```

- [ ] **Step 3: App.tsx 添加 Sidebar**

在 `App.tsx` 中：
1. 在 import 区域添加：`import Sidebar from './components/common/Sidebar'`
2. 在 `<BrowserRouter>` 内、`<TopBar />` 之前添加 `<Sidebar />`

最终的 return JSX：
```tsx
return (
  <BrowserRouter>
    <Sidebar />
    <TopBar />
    <div className="page-content">
      <Routes>
        <Route path="/" element={<SectPage />} />
        <Route path="/characters" element={<CharactersPage />} />
        <Route path="/buildings" element={<BuildingsPage />} />
        <Route path="/adventure" element={<AdventurePage />} />
        <Route path="/vault" element={<VaultPage />} />
      </Routes>
    </div>
    <BottomNav />
  </BrowserRouter>
)
```

- [ ] **Step 4: 验证构建**

Run: `npx tsc --noEmit && npx vite build`
Expected: 编译和构建成功

- [ ] **Step 5: Commit**

```bash
git add src/components/common/TopBar.module.css src/components/common/BottomNav.module.css src/App.tsx
git commit -m "feat(responsive): wire up sidebar, hide bottom nav on desktop, adjust topbar"
```

---

### Task 5: SectPage 响应式

**Files:**
- Modify: `src/pages/SectPage.module.css`

- [ ] **Step 1: 移除 480px 约束并添加响应式**

将 `.page`（第 1-6 行）替换为：

```css
.page {
  padding: var(--space-md);
  padding-bottom: 80px;
  max-width: 480px;
  margin: 0 auto;
}

@media (min-width: 1024px) {
  .page {
    max-width: none;
    padding-bottom: var(--space-lg);
  }
}
```

在文件末尾添加：

```css
@media (min-width: 1024px) {
  .resourceGrid {
    grid-template-columns: 1fr 1fr 1fr 1fr;
  }

  .characterList {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-sm);
  }
}
```

- [ ] **Step 2: 验证构建**

Run: `npx tsc --noEmit && npx vite build`
Expected: 编译和构建成功

- [ ] **Step 3: Commit**

```bash
git add src/pages/SectPage.module.css
git commit -m "feat(responsive): SectPage desktop layout - 4-col resources, 2-col characters"
```

---

### Task 6: CharactersPage 响应式

**Files:**
- Modify: `src/pages/CharactersPage.module.css`

- [ ] **Step 1: 移除 480px 约束并添加响应式**

将 `.page`（第 3-8 行）替换为：

```css
.page {
  padding: var(--space-md);
  padding-bottom: 80px;
  max-width: 480px;
  margin: 0 auto;
}

@media (min-width: 1024px) {
  .page {
    max-width: none;
    padding-bottom: var(--space-lg);
  }
}
```

在文件末尾添加：

```css
@media (min-width: 1024px) {
  .gridView {
    grid-template-columns: 1fr 1fr 1fr;
  }

  .statsGrid {
    grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr;
  }

  .backpackGrid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-xs);
  }
}
```

- [ ] **Step 2: 验证构建**

Run: `npx tsc --noEmit && npx vite build`
Expected: 编译和构建成功

- [ ] **Step 3: Commit**

```bash
git add src/pages/CharactersPage.module.css
git commit -m "feat(responsive): CharactersPage desktop - 3-col grid, 6-col stats, 2-col backpack"
```

---

### Task 7: BuildingsPage 响应式

**Files:**
- Modify: `src/pages/BuildingsPage.module.css`

- [ ] **Step 1: 移除 480px 约束**

将 `.page`（第 3-8 行）替换为：

```css
.page {
  padding: var(--space-md);
  padding-bottom: 80px;
  max-width: 480px;
  margin: 0 auto;
}

@media (min-width: 1024px) {
  .page {
    max-width: none;
    padding-bottom: var(--space-lg);
  }
}
```

- [ ] **Step 2: 添加桌面端网格和弹窗适配**

在文件末尾添加：

```css
@media (min-width: 1024px) {
  .buildingsGrid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-sm);
  }

  .qualitySelect {
    grid-template-columns: 1fr 1fr 1fr 1fr;
  }
}

/* Transfer modal: centered dialog on desktop */
@media (min-width: 1024px) {
  .transferModal {
    align-items: center;
    justify-content: center;
  }

  .transferModalContent {
    max-width: 600px;
    border-radius: var(--radius-lg);
    max-height: 80vh;
  }
}
```

- [ ] **Step 3: 验证构建**

Run: `npx tsc --noEmit && npx vite build`
Expected: 编译和构建成功

- [ ] **Step 4: Commit**

```bash
git add src/pages/BuildingsPage.module.css
git commit -m "feat(responsive): BuildingsPage desktop - 2-col buildings, 4-col quality, centered modal"
```

---

### Task 8: AdventurePage 响应式

**Files:**
- Modify: `src/pages/AdventurePage.module.css`

- [ ] **Step 1: 移除 480px 约束**

将 `.page`（第 1-6 行）替换为：

```css
.page {
  padding: var(--space-md);
  padding-bottom: 80px;
  max-width: 480px;
  margin: 0 auto;
}

@media (min-width: 1024px) {
  .page {
    max-width: none;
    padding-bottom: var(--space-lg);
  }
}
```

- [ ] **Step 2: 添加桌面端布局和弹窗适配**

在文件末尾添加：

```css
@media (min-width: 1024px) {
  .dungeonList {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-sm);
  }

  .memberItem {
    grid-template-columns: 100px 1fr 60px;
  }

  .logList {
    max-height: 250px;
  }
}

/* Team builder: centered dialog on desktop */
@media (min-width: 1024px) {
  .overlay {
    align-items: center;
    justify-content: center;
  }

  .teamBuilder {
    max-width: 600px;
    border-radius: var(--radius-lg);
    max-height: 85vh;
  }
}
```

- [ ] **Step 3: 验证构建**

Run: `npx tsc --noEmit && npx vite build`
Expected: 编译和构建成功

- [ ] **Step 4: Commit**

```bash
git add src/pages/AdventurePage.module.css
git commit -m "feat(responsive): AdventurePage desktop - 2-col dungeons, wider team view, centered modal"
```

---

### Task 9: VaultPage 响应式

**Files:**
- Modify: `src/pages/VaultPage.module.css`

- [ ] **Step 1: 移除 480px 约束**

将 `.page`（第 1-6 行）替换为：

```css
.page {
  padding: var(--space-md);
  padding-bottom: 80px;
  max-width: 480px;
  margin: 0 auto;
}

@media (min-width: 1024px) {
  .page {
    max-width: none;
    padding-bottom: var(--space-lg);
  }
}
```

- [ ] **Step 2: 桌面端两列布局**

在文件末尾添加：

```css
@media (min-width: 1024px) {
  .itemGrid {
    grid-template-columns: 1fr 1fr 1fr;
    gap: var(--space-sm);
  }

  .charSelector {
    max-height: 300px;
  }
}
```

注意：VaultPage 的物品详情面板在桌面端暂保持嵌入式布局（下方显示），因为改为侧滑面板需要 JSX 结构变更。后续可考虑升级为两列 grid 布局。

- [ ] **Step 3: 验证构建**

Run: `npx tsc --noEmit && npx vite build`
Expected: 编译和构建成功

- [ ] **Step 4: Commit**

```bash
git add src/pages/VaultPage.module.css
git commit -m "feat(responsive): VaultPage desktop - 3-col item grid, taller char selector"
```

---

### Task 10: 最终验证

**Files:** 无新改动

- [ ] **Step 1: 运行全部测试**

Run: `npx vitest run`
Expected: 373 passing tests（与改造前一致，CSS 变更不影响业务逻辑测试）

- [ ] **Step 2: 构建验证**

Run: `npx vite build`
Expected: 构建成功，输出 JS/CSS 文件

- [ ] **Step 3: 视觉验证**

Run: `npx vite` — 在浏览器中验证以下场景：
1. 默认移动端视口（< 480px）：底部导航可见，侧边栏隐藏，内容居中 480px
2. 平板视口（768px）：底部导航可见，侧边栏隐藏
3. 桌面视口（>= 1024px）：侧边栏可见，底部导航隐藏，内容区 padding-left: 200px，TopBar 资源隐藏
4. 检查各页面在桌面端的网格列数是否正确
5. 检查 BuildingsPage 和 AdventurePage 弹窗在桌面端是否居中
