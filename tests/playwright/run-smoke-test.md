# Claude Code 冒烟测试提示词

将以下内容直接粘贴到 Claude Code 会话中即可执行回归测试。需要 chrome-devtools MCP 处于连接状态。

---

## 提示词

```
请执行 EndlessQuest 冒烟测试。

前置条件：npm run dev 已启动，chrome-devtools MCP 已连接。

请按以下步骤依次执行，每步用 take_screenshot 保存截图到 tests/playwright/screenshots/ 目录，用 take_snapshot 检查页面内容，记录所有发现的问题。

测试完成后汇总报告，对照 tests/playwright/smoke-test.md 中的已知问题列表（SMOKE-01 ~ SMOKE-11）逐条验证是否修复。

步骤：
1. navigate_page → http://localhost:5173/EndlessQuest/
   - 检查无白屏、侧边导航6项、资源面板
   - list_console_messages [types: error, warn]

2. 导航到 /characters
   - 检查弟子列表、点击一个弟子看详情、展开折叠区域

3. 导航到 /buildings
   - 检查建筑列表、升级按钮、建筑协同无重复

4. 导航到 /adventure
   - 检查自动运转、点击组队出发、选弟子、确认出发
   - wait_for 结果后查看记录卡片

5. 点击 "查看过程" 进入战报页
   - 检查头部信息、时间线是否有中文、点击"战斗过程"tab是否有数据

6. 导航到 /vault 和 /log
   - 检查仓库物品列表、事件日志是否有英文

7. resize_page [375x812] → 检查移动端布局 → 恢复 [1400x900]
```

---

## 检查点速查

回归测试时重点关注：
- [ ] 无 Vite 编译错误 / 白屏
- [ ] 无 console error
- [ ] 所有面向玩家的文本为中文（无 "Dungeon xxx failed"、"Team entered" 等）
- [ ] 战报到达层数与时间线一致
- [ ] 战斗过程 tab 有数据
- [ ] 建筑协同无重复条目
- [ ] 移动端底部导航正常显示
