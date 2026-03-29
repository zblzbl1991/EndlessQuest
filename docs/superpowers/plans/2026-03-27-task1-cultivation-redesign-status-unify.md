# Task 1 + 修炼重设计：状态统一 & 自动修炼

> **合并自：** core-product-overhaul-roadmap Task 1 + cultivation-redesign spec
> **目标：** 移除 `cultivating`/`secluded` 状态，idle 即自动修炼，所有突破需灵石，实现自动突破

---

## 步骤

- [ ] **Step 1: 写失败测试** — store 测试覆盖：idle 自动修炼、idle 自动突破、小境界灵石消耗、移除 secluded/cultivating 相关逻辑
- [ ] **Step 2: 运行测试确认失败** — `npm test -- stores.test.ts CultivationEngine.test.ts`
- [ ] **Step 3: 更新 CharacterStatus 类型** — 移除 `cultivating` 和 `secluded`，保留 idle/adventuring/patrolling/training/resting/injured
- [ ] **Step 4: 新增
- 小境界突破灵石消耗表** — `src/data/realms.ts` 加入 MINOR_BREAKTHROUGH_COSTS
- [ ] **Step 5: 更新 CultivationEngine** — canBreakthrough 增加灵石检查，新增 autoBreakthrough 逻辑
- [ ] **Step 6: 更新 sectStore tickAll** — idle 角色自动修炼、自动突破、移除 seclusion 逻辑、移除 cultivating 分支
- [ ] **Step 7: 更新 adventureStore** — 冒险/派遣结束时 cultivating → idle
- [ ] **Step 8: 更新 StatusBadge** — 移除 cultivating/secluded 条目，idle 显示"修炼中"
- [ ] **Step 9: 更新 CharactersPage** — 移除闭关按钮/筛选逻辑，idle tab 匹配 idle 状态，training 加入筛选
- [ ] **Step 10: 更新 SectPage** — 修复弟子概况统计（加入 training 计数）
- [ ] **Step 11: 更新 CharacterCard** — 移除 cultivating 条件判断，idle 显示修炼进度
- [ ] **Step 12: 更新 BreakthroughPanel** — 显示小境界灵石消耗和灵石是否足够
- [ ] **Step 13: 更新 SaveSystem** — 新增存档迁移（cultivating/secluded → idle）
- [ ] **Step 14: 运行测试** — `npm test -- stores.test.ts CultivationEngine.test.ts`
- [ ] **Step 15: 运行构建** — `npm run build`
- [ ] **Step 16: Commit** — `feat: merge cultivating/secluded into idle with auto-cultivation`

---

## 关键文件

### 修改
- `src/types/character.ts`
- `src/data/realms.ts`
- `src/systems/cultivation/CultivationEngine.ts`
- `src/stores/sectStore.ts`
- `src/stores/adventureStore.ts`
- `src/components/common/StatusBadge.tsx`
- `src/components/common/CharacterCard.tsx`
- `src/components/cultivation/BreakthroughPanel.tsx`
- `src/pages/CharactersPage.tsx`
- `src/pages/SectPage.tsx`
- `src/systems/save/SaveSystem.ts`

### 测试
- `src/__tests__/stores.test.ts`
- `src/__tests__/CultivationEngine.test.ts`
