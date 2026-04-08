# EndlessQuest 回归冒烟测试手册

基于 chrome-devtools MCP 的玩家视角回归测试流程。使用 `testFixture` 预置中期存档数据，一键加载后执行全页面验证。

## 测试数据概要

通过 `?loadTestSave=true` URL 参数加载预置中期存档（`src/systems/save/testFixture.ts`），数据如下：

| 维度 | 值 |
|------|-----|
| 宗门 | 天机阁 (Lv3)，剑道路线，已解锁 2 节点 |
| 资源 | 灵石 12800 / 灵气 420 / 灵草 85 / 矿材 42 |
| 弟子 | 6 人（仙品 1 / 灵品 2 / 凡品 3） |
| 建筑 | 主殿 3、灵田 3x2、灵矿 3x2、坊市 2、丹炉 2(生产中)、锻器坊 1、藏经阁 1、聚仙台(未解锁) |
| 仓库 | 18 件物品（仙品/灵品/凡品装备、丹药、材料、功法残卷） |
| 灵宠 | 2 只（小火狐-灵品 / 灵鹿-仙品） |
| 功法 | 6 部（清心诀、烈焰心法、厚土诀、焚天诀、玄冰诀、雷御诀） |
| 里程碑 | 3 个（首次灵品招募、首次渡劫成功、首次秘境通关） |
| 探索 | 7 次总运行（5 完成 / 2 失败），最高 8 层 |

### 弟子清单

| ID | 姓名 | 品质 | 境界 | 修炼路线 | 状态 | 建筑 | 灵宠 |
|----|------|------|------|----------|------|------|------|
| char_test_01 | 李青云 | 灵品 | 筑基中期 | 剑道 | 空闲 | — | 小火狐 |
| char_test_02 | 王铁柱 | 灵品 | 筑基初期 | 体修 | 空闲 | 灵矿 | — |
| char_test_03 | 张小凡 | 凡品 | 炼气圆满 | 无 | 空闲 | 灵田 | — |
| char_test_04 | 陈灵儿 | 凡品 | 炼气中期 | 丹道 | 空闲 | 灵田 | — |
| char_test_05 | 赵无极 | 仙品 | 金丹初期 | 剑道 | 空闲 | — | 灵鹿 |
| char_test_06 | 林小龙 | 凡品 | 炼气后期 | 无 | 恢复中(2天) | — | — |

## 前置条件

1. Vite dev server 运行中：`npm run dev`
2. 浏览器已通过 chrome-devtools MCP 连接
3. 测试基础 URL：`http://localhost:5173/EndlessQuest/`

## 测试矩阵

| # | 页面 | 路由 | 核心验证点 |
|---|------|------|-----------|
| 0 | 初始化 | `?loadTestSave=true` | 测试数据加载 |
| 1 | 宗门总览 | `/` | 信息展示完整性、方针系统 |
| 2 | 弟子 | `/characters` | 列表渲染、详情展开、功法参悟 |
| 3 | 建筑 | `/buildings` | 建筑列表、升级交互、协同显示 |
| 4 | 秘境 | `/adventure` | 自动运转、组队出发、战报入口 |
| 5 | 战报 | `/adventure/report/:id` | 时间线、战斗过程 |
| 6 | 仓库 | `/vault` | 物品列表、标签切换、数量堆叠 |
| 7 | 记录 | `/log` | 事件日志、筛选功能 |
| 8 | 移动端 | 全页面 | 375x812 响应式布局 |

---

## 测试步骤

### Phase 0: 加载测试数据

```
1. navigate_page → http://localhost:5173/EndlessQuest/?loadTestSave=true
2. wait_for ["天机阁"] → 等待数据加载完成
3. take_snapshot → 确认页面标题为 "无尽仙途 | EndlessQuest"
4. list_console_messages [types: error, warn] → 记录错误/警告
```

**检查点**:
- [ ] 页面无白屏（无 Vite 编译错误 overlay）
- [ ] URL 中 `loadTestSave` 参数已自动清除
- [ ] 侧边导航 6 项全部显示（宗门/弟子/建筑/秘境/仓库/记录）
- [ ] 无 console error
- [ ] 宗门名称显示 "天机阁"
- [ ] 宗门等级显示 "Lv3" 或 "位阶 3"

### Phase 1: 宗门总览页 (SectPage)

```
1. navigate_page → /
2. take_screenshot [fullPage: true] → 保存截图
3. take_snapshot → 检查页面结构
```

**检查点**:
- [ ] 宗门名称 "天机阁"、等级 "Lv3" 显示
- [ ] 资源面板：灵石 ~12800、灵气 ~420、灵草 ~85、矿材 ~42（数值会因 tick 变化）
- [ ] 资源产出速率显示（灵田 +灵气/秒、灵矿 +灵石/秒）
- [ ] 弟子状态统计：空闲 5 / 恢复 1（林小龙）
- [ ] 建筑协同列表无重复条目
- [ ] 方针按钮 7 个（敛锋/守衡/审机/逐隙/压魄/逆劫/焚命）
- [ ] 命运标签 5 个（引机/近劫/藏魔/续脉/折运）
- [ ] 飞升区域条件与按钮状态
- [ ] 宗门统计数据（63 战 / 48 胜 / 187 击杀）
- [ ] **回归注意**: 建筑协同中 "丹火同炉" 应只出现一次或区分命名
- [ ] **回归注意**: 宗门路线显示 "剑道" 标识

### Phase 2: 弟子页面 (CharactersPage)

```
1. navigate_page → /characters
2. take_snapshot → 检查弟子列表
3. 点击 "李青云" 卡片 → 进入详情
4. take_snapshot → 检查详情页
5. 依次展开 "战斗画像" / "命运" / "功法" / "背包"
6. take_snapshot → 检查展开内容
7. 点击 "返回" → 回到列表
8. 点击 "赵无极" 卡片 → 检查仙品弟子详情
9. take_snapshot → 确认装备面板 9 槽位中有 5 件装备
10. 点击 "返回" → 回到列表
11. 点击 "林小龙" 卡片 → 检查恢复状态
12. take_snapshot → 确认 "恢复中" 状态显示
```

**检查点**:
- [ ] 弟子池数量显示 "6"
- [ ] 弟子卡片排序：按品质/境界排列
- [ ] 每张卡片显示：名称、品质色、状态 badge、境界、功法数、修为进度条
- [ ] 李青云详情：灵品质色、筑基中期、剑道标签、3 部功法（清心/烈焰/焚天）、灵宠 "小火狐"
- [ ] 李青云装备面板：4 件装备（碧水剑/灵纹护额/踏风靴/青锋剑）
- [ ] 李青云功法参悟度：清心 65% / 烈焰 42% / 焚天 18%
- [ ] 李青云背包：回气丹 x5
- [ ] 赵无极详情：仙品质色、金丹初期、称号 "master"、6 部功法
- [ ] 赵无极装备面板：5 件装备（天罡冠/天罡战甲/流星护腕/轻灵靴/雷鸣剑）
- [ ] 赵无极天赋 "天灵根" 显示
- [ ] 林小龙详情：状态显示 "恢复中(2天)"、天劫伤疤 fateTag
- [ ] "返回"按钮可用

### Phase 3: 建筑页面 (BuildingsPage)

```
1. navigate_page → /buildings
2. take_screenshot + take_snapshot
```

**检查点**:
- [ ] 8 栋建筑全部显示
- [ ] 主殿 Lv3 — 显示 "资源地块上限 2"
- [ ] 灵田 Lv3 x2 — 显示灵气/灵草产出速率
- [ ] 灵矿 Lv3 x2 — 显示灵石/矿材产出速率
- [ ] 坊市 Lv2 — 显示每日刷新次数
- [ ] 丹炉 Lv2 — 显示丹药效力加成、生产队列状态（精炼灵草进行中）
- [ ] 锻器坊 Lv1 — 显示锻造成功率加成
- [ ] 藏经阁 Lv1 — 显示藏经容量
- [ ] 聚仙台 — 未解锁，显示解锁条件 "主殿 Lv3"
- [ ] 建筑协同列表无重复
- [ ] 升级按钮显示正确灵石费用
- [ ] 已解锁建筑有升级按钮，未解锁有建造按钮
- [ ] 弟子分配显示：王铁柱@灵矿、张小凡@灵田、陈灵儿@灵田

### Phase 4: 秘境页面 (AdventurePage)

```
1. navigate_page → /adventure
2. take_snapshot → 检查自动运转区域
3. 检查最近探索记录（应有 7 条历史）
4. 点击 "组队出发" → 弹出组队面板
5. take_snapshot → 检查组队 UI
6. 选择弟子（赵无极 + 李青云） → 确认出发
7. take_snapshot → 确认出发按钮启用
8. 选择秘境 → 确认出发
9. wait_for ["失利", "成功", "归来", "战报"]
10. take_snapshot → 检查探索结果
```

**检查点**:
- [ ] 自动运转区域显示当前状态（下一次结算倒计时）
- [ ] 最近探索记录展示（7 次总运行/5 完成/2 失败）
- [ ] 组队面板：意图选择（守成/争锋/寻机）、战术选择
- [ ] 出战弟子列表正确显示 6 人（排除恢复中的林小龙）
- [ ] 已选人数计数正确
- [ ] 可选秘境列表及解锁状态
- [ ] 探索完成后显示结果卡片
- [ ] **回归注意**: 探索结果卡片中 "未归" 状态应有明确说明

### Phase 5: 仓库页面 (VaultPage)

```
1. navigate_page → /vault
2. take_snapshot → 检查宗门仓库
3. 切换到 "弟子背包" 标签
4. take_snapshot → 检查弟子背包视图
5. 切换回 "宗门仓库"
6. take_snapshot → 确认切换正常
```

**检查点**:
- [ ] 宗门仓库 / 弟子背包 标签切换可用
- [ ] 仓库物品 18 件：装备（仙品天罡冠/天罡战甲/雷鸣剑、灵品碧水剑等）、丹药（回气丹x12、疗伤丹x8）、材料（精炼灵草x15、精炼矿材x8）、功法残卷x1
- [ ] 物品品质色正确（仙品/灵品/凡品）
- [ ] 仓库容量 "18/50" 显示
- [ ] 弟子背包视图可按弟子切换
- [ ] 装备显示属性（攻击/防御/速度等）
- [ ] 丹药显示堆叠数量
- [ ] 材料显示类别标签

### Phase 6: 记录页面 (LogPage)

```
1. navigate_page → /log
2. take_snapshot → 检查事件列表
```

**检查点**:
- [ ] 里程碑数量 3 个（首次灵品招募/首次渡劫成功/首次秘境通关）
- [ ] 事件列表按时间倒序
- [ ] 事件类型图标（突破/招募/探险/失败/顿悟）
- [ ] **回归注意**: 所有事件文本应为中文，检查是否有 "Dungeon xxx failed"、"Team entered dungeon xxx" 等英文

### Phase 7: 战报页 (AdventureReportPage) — 需先完成一次探索

```
1. 从秘境页点击最新 "查看过程" 链接
2. take_snapshot → 检查战报头部
3. take_snapshot → 检查时间线内容
4. 点击 "战斗过程" tab（如有）
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
- [ ] 弟子详情在移动端可用（点击/返回手势）
- [ ] 弟子卡片信息在窄屏不溢出

---

## 快速回归命令序列

以下为可直接在 Claude Code 中执行的 MCP 命令序列，适用于快速回归：

```
# 1. 加载测试数据
navigate_page → http://localhost:5173/EndlessQuest/?loadTestSave=true
wait_for → ["天机阁"]
take_snapshot

# 2. 宗门总览
navigate_page → /
take_screenshot [fullPage: true]

# 3. 弟子列表
navigate_page → /characters
take_snapshot

# 4. 建筑
navigate_page → /buildings
take_snapshot

# 5. 秘境
navigate_page → /adventure
take_snapshot

# 6. 仓库
navigate_page → /vault
take_snapshot

# 7. 记录
navigate_page → /log
take_snapshot

# 8. 移动端
resize_page [width: 375, height: 812]
navigate_page → /
take_screenshot
navigate_page → /characters
take_screenshot
navigate_page → /buildings
take_screenshot
navigate_page → /adventure
take_screenshot
navigate_page → /vault
take_screenshot
navigate_page → /log
take_screenshot
resize_page [width: 1400, height: 900]
```

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
