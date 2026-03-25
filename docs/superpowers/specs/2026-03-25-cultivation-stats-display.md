# Cultivation Stats Display

Date: 2026-03-25
Status: Approved

## Problem

CharacterCard (弟子列表) 修炼进度只显示一个进度条，没有任何数值。CharacterDetail (详情页) 有进度数值但缺少修炼速度。玩家无法快速了解弟子的修炼效率。

## Solution

在修炼进度条附近显示修为进度和基础修炼速度。

### CharacterCard (弟子列表卡片)

进度条下方新增一行紧凑文字：

```
修为 350/1000 · +5.2/s
```

- 仅修炼中状态显示
- 使用 `calcCultivationRate(character, technique)` 计算速度
- 小字号，不显著增加卡片高度

### CharacterDetail (弟子详情页)

进度条旁的数值行追加速度：

```
350 / 1000 (+5.2/s)
```

- 速度放在括号内，附在修为数值后面
- 底部"修炼"区域的"修炼速度"文字保留不变

## Technical Notes

- 速度使用 `calcCultivationRate()` 返回值，不含 spiritRatio 和 trainingMult（数值稳定）
- CharacterCard 已有 technique 查询逻辑，可复用
- CharacterDetail 的 `cultivationSpeed` 变量当前用 `spiritualRoot * 0.5` 简化计算，需替换为 `calcCultivationRate()`

## Files Changed

| File | Change |
|------|--------|
| `src/components/common/CharacterCard.tsx` | 进度条下方添加修为/速度文字 |
| `src/components/common/CharacterCard.module.css` | 新增 stats 文字样式 |
| `src/pages/CharactersPage.tsx` | 进度数值行追加速度显示，替换简化速度计算 |
| `src/pages/CharactersPage.module.css` | 调整 progressText 样式 |
