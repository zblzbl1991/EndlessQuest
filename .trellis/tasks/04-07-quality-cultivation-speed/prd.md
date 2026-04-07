# Quality-Driven Cultivation Speed

## Goal

让资质（quality）对修炼速度产生显著影响，使高资质弟子成为真正的核心资源，提升招募好弟子的爽感。

## Requirements

- 修炼速度公式改用双属性乘法：灵根指数加成 × 悟性线性加成
- comprehension 参与修炼速度计算
- 保持境界衰减、功法加成、命格加成的现有结构

## Technical Approach

### New Formula

```
rate = BASE * rootBonus * compBonus * realmMult * techniqueMult * fateTagMod
```

- **rootBonus** = `(spiritualRoot / 10) ^ 0.85` — 指数曲线，高灵根收益递增
- **compBonus** = `1 + (comprehension - 10) * 0.015` — 线性微调

### Multiplier Table (nominal, no variance)

| Quality | rootBonus | compBonus | **Total** | **vs common** |
|---------|-----------|-----------|-----------|---------------|
| common  | 1.00x     | 1.00x     | 1.00x     | baseline      |
| spirit  | 1.37x     | 1.045x    | 1.43x     | 1.4x          |
| immortal| 1.72x     | 1.12x     | 1.93x     | 1.9x          |
| divine  | 2.32x     | 1.225x    | 2.84x     | 2.8x          |
| chaos   | 2.86x     | 1.30x     | 3.72x     | 3.7x          |

Chaos is ~3.7x faster than common (with ±10%/±20% variance, practical range ~3-4x).

## Acceptance Criteria

- [ ] 混沌资质弟子修炼速度约为普通资质的 3~4 倍
- [ ] 悟性对修炼速度有可感知的正向影响
- [ ] 所有现有测试通过（公式变更需要更新断言值）
- [ ] 新公式有对应测试覆盖

## Definition of Done

- Lint / typecheck pass
- Tests added/updated
- CultivationDisplay UI helper 同步更新

## Out of Scope

- 不改境界系统、突破机制
- 不改招募成本或概率
- 不改功法/命格系统
- fortune 不参与修炼速度

## Technical Notes

### Key Files to Modify
- `src/systems/cultivation/CultivationEngine.ts` — calcCultivationRate: 替换 spiritualRootBonus 为 rootBonus+compBonus
- `src/systems/cultivation/CultivationDisplay.ts` — UI 显示可能需要同步
- `src/__tests__/CultivationEngine.test.ts` — 更新测试断言

### Key Files (read-only reference)
- `src/types/character.ts` — CultivationStats 接口（不改）
- `src/data/realms.ts` — 境界数据（不改）
- `src/systems/character/CharacterEngine.ts` — QUALITY_STATS（不改）
