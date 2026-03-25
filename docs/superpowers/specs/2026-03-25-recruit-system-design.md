# 招募系统重构 — Design Spec

**日期：** 2026-03-25
**分支：** feat/sect-redesign

## 目标

将现有的免费固定属性招募改为：消耗灵石、属性随机浮动、随机天赋的 Roguelike 招募体验。混沌品质通过神品招募小概率升级获得。

## 设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 解锁进度 | 复用宗门等级 | 已有系统，无需额外进度字段 |
| 招募消耗 | 仅灵石 | 简单直观 |
| 属性浮动 | 基础值 ± 浮动比例 | Roguelike 核心体验 |
| 天赋系统 | 按品质递增槽位 | 高品质更有价值 |
| 混沌获得 | 神品招募 0.5% 升级 | 保留稀有感 |

---

## 1. 类型系统

### 1.1 新增 Talent 类型

文件：`src/types/talent.ts`（新建）

```typescript
export type TalentId = string

export interface Talent {
  id: TalentId
  name: string
  description: string
  effect: {
    stat: 'spiritualRoot' | 'comprehension' | 'fortune'
          | 'hp' | 'atk' | 'def' | 'spd' | 'crit' | 'critDmg'
          | 'maxSpiritPower'
    value: number
  }
  rarity: 'common' | 'rare' | 'epic'
}

export const TALENT_RARITY_NAMES: Record<TalentRarity, string> = {
  common: '凡',
  rare: '良',
  epic: '绝',
}

export type TalentRarity = 'common' | 'rare' | 'epic'
```

### 1.2 Character 类型变更

文件：`src/types/character.ts`

新增字段：
```typescript
export interface Character {
  // ... 现有字段
  talents: Talent[]  // 新增
}
```

---

## 2. 天赋数据表

文件：`src/data/talents.ts`（新建）

### 2.1 天赋池（12个）

| ID | 名称 | 稀有度 | 效果 |
|----|------|--------|------|
| wugu | 武骨 | common | atk +3 |
| tiebi | 铁壁 | common | def +2 |
| feiying | 飞影 | common | spd +2 |
| huixin_combat | 会心 | common | crit +0.03 |
| shayi | 杀意 | common | critDmg +0.2 |
| lingxin | 灵心 | common | maxSpiritPower +20 |
| tianmai | 天脉 | rare | spiritualRoot +5 |
| huixin | 慧心 | rare | comprehension +5 |
| qiyun | 气运 | rare | fortune +5 |
| xianti | 仙体 | rare | hp +15 |
| taiji | 太极 | epic | spiritualRoot +8, comprehension +3 |
| busizun | 不死尊 | epic | hp +30, def +5 |

注：taiji 和 busizun 是双属性天赋，effect 为数组。

### 2.2 品质天赋权重

| 品质 | common权重 | rare权重 | epic权重 | 天赋数量 |
|------|-----------|---------|---------|---------|
| 凡品 | 70% | 30% | 0% | 0~1 (40%概率1个) |
| 灵品 | 60% | 35% | 5% | 0~1 (50%概率1个) |
| 仙品 | 50% | 40% | 10% | 0~2 (60%概率≥1, 25%概率2个) |
| 神品 | 40% | 45% | 15% | 1~2 (80%概率≥1, 40%概率2个) |
| 混沌 | 30% | 45% | 25% | 1~3 (100%概率≥1, 50%概率≥2, 20%概率3个) |

同一天赋不重复出现在同一个弟子身上。

---

## 3. CharacterEngine 改造

文件：`src/systems/character/CharacterEngine.ts`

### 3.1 属性浮动

浮动范围（QUALITY_VARIANCE）：

| 品质 | 浮动范围 |
|------|---------|
| 凡品 | ±20% |
| 灵品 | ±18% |
| 仙品 | ±15% |
| 神品 | ±12% |
| 混沌 | ±10% |

公式：
```
实际值 = 基础值 × (1 + random(-范围, +范围))
```

- hp, atk, def, spd, spiritualRoot, comprehension, fortune, maxSpiritPower 取整
- crit, critDmg 保留3位小数

### 3.2 天赋效果叠加

天赋效果在生成时直接加到 cultivationStats / baseStats 上。天赋是永久加成。

### 3.3 generateCharacter 流程

1. 取 QUALITY_STATS[quality] 基础值
2. 对 baseStats 和 cultivationStats 的每个属性应用浮动
3. 根据品质天赋权重表 roll 天赋数量
4. 按权重随机选取天赋（不重复）
5. 天赋效果叠加到对应属性
6. 混沌品质特殊处理：仅通过神品 0.5% 升级触发
7. 返回完整 Character（含 talents 字段）

### 3.4 新增导出函数

```typescript
// 招募费用
export const RECRUIT_COSTS: Record<CharacterQuality, number> = {
  common: 100,
  spirit: 500,
  immortal: 2000,
  divine: 8000,
  chaos: 50000,  // 不可直接招募，仅参考
}

export function getRecruitCost(quality: CharacterQuality): number

// 解锁检查
export function isQualityUnlocked(quality: CharacterQuality, sectLevel: number): boolean

// 可招募品质列表
export function getAvailableQualities(sectLevel: number): CharacterQuality[]
```

### 3.5 解锁等级表

| 品质 | 所需宗门等级 |
|------|------------|
| 凡品 | Lv1 |
| 灵品 | Lv2 |
| 仙品 | Lv3 |
| 神品 | Lv4 |
| 混沌 | 不可直接招募 |

---

## 4. SectStore 改造

文件：`src/stores/sectStore.ts`

### 4.1 addCharacter 改造

```typescript
addCharacter(quality: CharacterQuality): Character | null
```

流程：
1. 检查人数上限（不变）
2. 获取招募费用 `getRecruitCost(quality)`
3. 检查灵石是否足够，不足返回 null
4. 扣除灵石
5. 调用 `generateCharacter(quality)` 生成弟子
6. 返回弟子

### 4.2 新增 canRecruit 方法

```typescript
canRecruit(quality: CharacterQuality): { allowed: boolean; reason: string }
```

返回值示例：
- `{ allowed: true, reason: '' }`
- `{ allowed: false, reason: '灵石不足' }`
- `{ allowed: false, reason: '弟子已满' }`
- `{ allowed: false, reason: '宗门等级不足' }`

---

## 5. UI 改造

文件：`src/pages/BuildingsPage.tsx`（RecruitTab 部分）

### 5.1 品质选择

现有4个品质按钮保持不变，每个按钮下方显示招募费用。

### 5.2 招募按钮

显示 `招收凡品弟子 (100灵石)` 格式。灵石不足时按钮置灰。

### 5.3 招募结果弹层

招募成功后弹出展示：
- 姓名 + 品质标签
- 浮动后属性值（带颜色标注）
- 天赋列表（按稀有度着色）
- 确认/关闭按钮

属性颜色规则：
- 浮动 > +10%：绿色
- 浮动 -10% ~ +10%：默认色
- 浮动 < -10%：红色

天赋颜色：
- common：默认色
- rare：蓝色
- epic：紫色

---

## 6. 文件变更清单

| 操作 | 文件 |
|------|------|
| 新建 | `src/types/talent.ts` |
| 新建 | `src/data/talents.ts` |
| 修改 | `src/types/character.ts`（新增 talents 字段） |
| 修改 | `src/types/index.ts`（导出 Talent 类型） |
| 修改 | `src/systems/character/CharacterEngine.ts`（属性浮动 + 天赋 + 费用函数） |
| 修改 | `src/stores/sectStore.ts`（addCharacter 消费灵石 + canRecruit） |
| 修改 | `src/pages/BuildingsPage.tsx`（RecruitTab 费用显示 + 结果弹层） |
| 修改 | `src/pages/BuildingsPage.module.css`（天赋样式 + 属性颜色） |
| 新建 | `src/__tests__/CharacterEngine.test.ts`（扩展浮动 + 天赋测试） |
| 新建 | `src/__tests__/talents.test.ts`（天赋数据 + 权重测试） |

## 7. 不变的部分

- 宗门等级系统（已有）
- 解锁进度（复用 sect.level）
- 混沌品质的 Type 定义（已有，不可直接选择）
- SaveSystem（talents 在 Character 上，自动跟随现有存档结构）
