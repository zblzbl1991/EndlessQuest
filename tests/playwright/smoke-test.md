# EndlessQuest Chrome DevTools 冒烟测试手册

基于 chrome-devtools MCP 的玩家视角冒烟测试流程。适用于 Claude Code 会话中手动执行或 semi-automated 回归测试。

## 前置条件

1. Vite dev server 运行中：`npm run dev`
2. 浏览器已通过 chrome-devtools MCP 连接
3. 测试 URL：`http://localhost:5173/EndlessQuest/`

## 测试矩阵

| # | 页面 | 路由 | 核心验证点 |
|---|------|------|-----------|
| 1 | 宗门总览 | `/` | 信息展示完整性、方针系统 |
| 2 | 弟子 | `/characters` | 列表渲染、详情展开、招募流程 |
| 3 | 建筑 | `/buildings` | 建筑列表、升级交互、协同显示 |
| 4 | 秘境 | `/adventure` | 自动运转、组队出发、战报入口 |
| 5 | 仓库 | `/vault` | 物品列表、标签切换 |
| 6 | 记录 | `/log` | 事件日志、筛选功能 |
| 7 | 战报 | `/adventure/report/:id` | 时间线、战斗过程 |
| 8 | 移动端 | 全页面 | 375x812 响应式布局 |

---

## 测试步骤

### Phase 0: 环境检查

```
1. navigate_page → http://localhost:5173/EndlessQuest/
2. take_snapshot → 确认页面标题为 "无尽仙途 | EndlessQuest"
3. list_console_messages [types: error, warn] → 记录错误/警告
```

**检查点**:
- [ ] 页面无白屏（无 Vite 编译错误 overlay）
- [ ] 侧边导航 6 项全部显示（宗门/弟子/建筑/秘境/仓库/记录）
- [ ] 无 console error

### Phase 1: 宗门总览页 (SectPage)

```
1. navigate_page → /
2. take_screenshot [fullPage: true] → 保存截图
3. take_snapshot → 检查页面结构
```

**检查点**:
- [ ] 宗门名称、等级显示
- [ ] 资源面板（灵石/灵气/灵草/矿材）及产出速率
- [ ] 弟子状态统计（修炼中/派遣中/秘境中/研习中/恢复中）
- [ ] 建筑协同列表无重复条目
- [ ] 方针按钮 7 个（敛锋/守衡/审机/逐隙/压魄/逆劫/焚命）
- [ ] 命运标签 5 个（引机/近劫/藏魔/续脉/折运）
- [ ] 飞升区域条件与按钮状态
- [ ] 宗门统计数据
- [ ] **回归注意**: 建筑协同中 "丹火同炉" 应只出现一次或区分命名

### Phase 2: 弟子页面 (CharactersPage)

```
1. navigate_page → /characters
2. take_snapshot → 检查弟子列表
3. 点击弟子卡片 → 进入详情
4. take_snapshot → 检查详情页
5. 依次展开 "战斗画像" / "命运" / "功法" / "背包"
6. take_snapshot → 检查展开内容
```

**检查点**:
- [ ] 弟子池数量显示正确
- [ ] 弟子卡片显示：名称、品质、状态、境界、功法、修为进度
- [ ] 详情页：基础属性、修炼资质、装备面板
- [ ] 战斗画像：流派、主动技列表
- [ ] 命运：命苗信息
- [ ] "返回"按钮可用

### Phase 3: 建筑页面 (BuildingsPage)

```
1. navigate_page → /buildings
2. take_screenshot + take_snapshot
```

**检查点**:
- [ ] 建筑列表完整（主殿/灵矿/灵田/坊市/丹炉/锻器坊/藏经阁/聚仙台）
- [ ] 每个建筑显示：名称、等级、描述、升级按钮或建造按钮
- [ ] 未解锁建筑显示解锁条件
- [ ] 建筑协同列表无重复
- [ ] 升级按钮显示正确费用

### Phase 4: 秘境页面 (AdventurePage)

```
1. navigate_page → /adventure
2. take_snapshot → 检查自动运转区域
3. 点击 "组队出发" → 弹出组队面板
4. take_snapshot → 检查组队 UI
5. 选择弟子 → 确认出发按钮启用
6. 点击 "确认出发" → 执行探索
7. wait_for ["失利", "成功", "归来", "战报"]
8. take_snapshot → 检查探索结果
```

**检查点**:
- [ ] 自动运转区域显示当前状态（下一次结算倒计时）
- [ ] 最近探索记录展示（结果、层数、收益）
- [ ] 组队面板：意图选择（守成/争锋/寻机）、战术选择
- [ ] 出战弟子列表、已选人数
- [ ] 可选秘境列表及解锁状态
- [ ] 探索完成后显示结果卡片
- [ ] **回归注意**: 探索结果卡片中 "未归" 状态应有明确说明

### Phase 5: 战报页 (AdventureReportPage)

```
1. 从秘境页点击 "查看过程" 链接
2. take_snapshot → 检查战报头部
3. take_snapshot → 检查时间线内容
4. 点击 "战斗过程" tab
5. take_snapshot → 检查战斗记录
```

**检查点**:
- [ ] 战报头部：秘境名、意图、结果、到达层数
- [ ] 归宗结果区域（归/未归/重伤归宗）
- [ ] 时间线：逐层事件记录，每条带层数标记
- [ ] 结算资源汇总
- [ ] **回归注意**: 到达层数应与时间线最后一层一致（无 off-by-one）
- [ ] **回归注意**: "战斗过程" tab 应有数据，不能显示 "本局无战斗记录"
- [ ] **回归注意**: 所有文本应为中文，无英文混入

### Phase 6: 仓库页面 (VaultPage)

```
1. navigate_page → /vault
2. take_snapshot
```

**检查点**:
- [ ] 宗门仓库 / 弟子背包 标签切换
- [ ] 物品列表显示品质色、属性
- [ ] 仓库容量显示

### Phase 7: 记录页面 (LogPage)

```
1. navigate_page → /log
2. take_snapshot → 检查事件列表
```

**检查点**:
- [ ] 里程碑数量
- [ ] 事件列表按时间倒序
- [ ] 事件类型图标（突破/招募/探险/失败/顿悟）
- [ ] **回归注意**: 所有事件文本应为中文，检查是否有 "Dungeon xxx failed"、"Team entered dungeon xxx" 等英文

### Phase 8: 移动端响应式

```
1. resize_page [width: 375, height: 812]
2. navigate_page → /
3. take_screenshot
4. take_snapshot → 确认底部导航替代侧边栏
5. 依次检查 /characters, /buildings, /adventure, /vault, /log
6. resize_page [width: 1400, height: 900] → 恢复桌面端
```

**检查点**:
- [ ] 底部标签导航显示（非侧边栏）
- [ ] 内容单列布局
- [ ] 无水平溢出
- [ ] 各页面可正常渲染

---

## 已知问题追踪 (2026-04-06 首次测试)

| ID | 严重度 | 页面 | 描述 | 状态 |
|----|--------|------|------|------|
| SMOKE-01 | P0 | 全局 | 事件日志大量英文未翻译（"Dungeon xxx failed"等） | open |
| SMOKE-02 | P0 | 全局 | adventureStore.ts:443 缺少逗号导致白屏 | **fixed** |
| SMOKE-03 | P0 | 秘境 | "守成"策略自动运转不断送弟子去死 | open |
| SMOKE-04 | P1 | 战报 | 到达层数显示 off-by-one（实际到第5层显示第4层） | open |
| SMOKE-05 | P1 | 战报 | "战斗过程"tab无数据 | open |
| SMOKE-06 | P1 | 建筑 | "丹火同炉"协同条目重复 | open |
| SMOKE-07 | P1 | 秘境 | "未归"弟子状态含义不明 | open |
| SMOKE-08 | P2 | 总览 | 新手引导缺失 | open |
| SMOKE-09 | P2 | 总览 | 信息过载，一屏信息量过大 | open |
| SMOKE-10 | P2 | 总览 | "重置宗门"按钮无确认弹窗 | open |
| SMOKE-11 | P3 | 全局 | 策略关键词中英混用（"profit route"等） | open |
