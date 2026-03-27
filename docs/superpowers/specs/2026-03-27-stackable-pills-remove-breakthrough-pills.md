# 丹药叠加 + 移除突破丹

日期：2026-03-27

## 背景

当前系统中每个丹药占用一个仓库/背包格子，不支持堆叠。大境界突破需要对应丹药 + 灵石，丹药成为弟子境界提升的严重瓶颈。

## 需求

1. 丹药按 `recipeId` 叠加，同类型只占一个格子，无数量上限
2. 完全移除突破丹（自动配方 + 手工配方）
3. 大境界突破只需灵石，灵石消耗大幅提高

## 设计

### 1. 类型系统 — 引入 ItemStack

新增 `ItemStack` 类型（`src/types/item.ts`）：

```typescript
interface ItemStack {
  item: AnyItem
  quantity: number
}
```

存储类型变更：
- `Sect.vault: ItemStack[]`
- `Character.backpack: ItemStack[]`

非消耗品（装备、材料、功法卷轴）quantity 始终为 1。

### 2. 丹药叠加逻辑

**添加消耗品**：有相同 `recipeId` 的 ItemStack 存在则 `quantity++`，否则新建。

**移除消耗品**：`quantity--`，到 0 时移除整个 ItemStack。

**非消耗品**：始终 quantity: 1，直接添加/移除整个 ItemStack。

**丹炉产出**：找到对应 recipeId 的 ItemStack 增加 quantity，而非创建新条目。

### 3. 移除突破丹

删除内容：
- `BREAKTHROUGH_COSTS` 中的 `pillId` 字段，简化为 `{ spiritStone: number }`
- `AUTO_RECIPES` 中的 4 个突破丹配方（foundation_pill, golden_core_pill, nascent_soul_pill, spirit_transformation_pill）
- `ALCHEMY_RECIPES` 中的 breakthrough_pill 配方

修改内容：
- `sectStore.ts` tickAll 大境界突破：移除丹药检查和消耗，只检查灵石
- `adventureStore.ts` 中相关引用一并清理

### 4. 大境界突破灵石调整

| 境界 | 旧灵石 | 新灵石 |
|------|--------|--------|
| 筑基 | 500 | 3,000 |
| 金丹 | 2,000 | 15,000 |
| 元婴 | 8,000 | 80,000 |
| 化神 | 30,000 | 350,000 |

### 5. UI 影响

- VaultPage / CharactersPage：消耗品显示 "物品名 × 数量"
- BuildingsPage：丹炉移除突破丹选项，只保留回血丹和灵气丹
- 物品转移（vault ↔ backpack）遵循叠加逻辑

### 6. 存档兼容

SaveSystem 加载时检测 vault/backpack 中是否为旧格式（直接 AnyItem[]），自动包装为 `{ item, quantity: 1 }`。

### 7. 不受影响

- 装备、材料、功法卷轴不叠加
- 秘境探险消耗补给品逻辑不变（改为扣减 quantity）
- 小境界突破逻辑不变
