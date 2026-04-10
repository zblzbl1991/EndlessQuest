# 弟子深度随机化 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将弟子生成系统从品质决定一切改为多维度独立随机叠加（五行亲和 + 成长倍率 + 天赋词缀），实现暗黑式组合爆炸。

**Architecture:** 3 个并行轨道独立开发（五行元素系统、成长倍率、天赋词缀数据），然后 1 个集成阶段串联所有改动（CharacterEngine 重写 + 存档迁移 + UI）。每个轨道产出独立可测试的模块。

**Tech Stack:** React 19 + TypeScript 5.9 + Zustand 5 + Vitest 4 + IndexedDB

**Spec:** `docs/superpowers/specs/2026-04-10-disciple-deep-randomization-design.md`

---

## 并行策略

### Phase 1：3 个并行轨道（互不依赖，可 worktree 隔离）

| 轨道 | 范围 | 核心文件 | 预估步骤 |
|------|------|---------|---------|
| A. 五行元素系统 | Element 类型 + 克制表 + 全量数据迁移 + 战斗集成 | types/skill.ts, data/skills.ts, data/activeSkills.ts, data/techniquesTable.ts, data/enemies.ts, systems/combat/CombatEngine.ts | ~12 |
| B. 成长倍率系统 | 类型定义 + 生成算法 + 等级/突破/秘境集成 | types/character.ts(部分), data/levelSystem.ts, systems/cultivation/CultivationEngine.ts, systems/cultivation/BreakthroughCoordinator.ts, systems/character/DungeonGrowthSystem.ts | ~10 |
| C. 天赋词缀系统 | 效果类型 + 80 词缀数据 + 词缀生成器 | types/talent.ts(更新), data/talentAffixes.ts(新), systems/character/TalentAffixGenerator.ts(新) | ~12 |

### Phase 2：集成（依赖 Phase 1 全部完成）

| 任务 | 范围 | 核心文件 |
|------|------|---------|
| D. CharacterEngine 重写 | 整合三个轨道到角色生成 | systems/character/CharacterEngine.ts |
| E. 存档迁移 | v8→v9 迁移逻辑 | systems/save/SaveSystem.ts |
| F. UI 展示 | 弟子详情展示新维度 | pages/CharactersPage.tsx, 相关组件 |
| G. CLAUDE.md 更新 | Roguelike 描述修正 | CLAUDE.md |

---

## Track A：五行元素系统

### Task A1：Element 类型和克制表

**Files:**
- Modify: `src/types/skill.ts`
- Test: `src/__tests__/skills.test.ts`

- [ ] **Step 1: 修改 Element 类型和 COUNTER_MAP**

在 `src/types/skill.ts` 中：

```typescript
// 替换旧 Element
export type Element = 'metal' | 'wood' | 'earth' | 'water' | 'fire' | 'neutral'

// 替换旧 ELEMENT_NAMES
export const ELEMENT_NAMES: Record<Element, string> = {
  metal: '金',
  wood: '木',
  earth: '土',
  water: '水',
  fire: '火',
  neutral: '无',
}

// 替换旧 COUNTER_MAP（金克木、木克土、土克水、水克火、火克金）
export const COUNTER_MAP: Partial<Record<Element, Element>> = {
  metal: 'wood',
  wood: 'earth',
  earth: 'water',
  water: 'fire',
  fire: 'metal',
}
```

- [ ] **Step 2: 修改 getElementMultiplier**

在 `src/data/skills.ts` 中，更新 `getElementMultiplier` 使用新的 COUNTER_MAP，保持克制逻辑不变（克制 1.5x，被克制 0.75x，其余 1.0x）。

- [ ] **Step 3: 写测试验证克制矩阵**

```typescript
// src/__tests__/skills.test.ts
import { getElementMultiplier } from '../data/skills'

describe('五行克制', () => {
  test('金克木返回 1.5', () => expect(getElementMultiplier('metal', 'wood')).toBe(1.5))
  test('木克土返回 1.5', () => expect(getElementMultiplier('wood', 'earth')).toBe(1.5))
  test('土克水返回 1.5', () => expect(getElementMultiplier('earth', 'water')).toBe(1.5))
  test('水克火返回 1.5', () => expect(getElementMultiplier('water', 'fire')).toBe(1.5))
  test('火克金返回 1.5', () => expect(getElementMultiplier('fire', 'metal')).toBe(1.5))
  test('被克制返回 0.75', () => expect(getElementMultiplier('wood', 'metal')).toBe(0.75))
  test('无克制关系返回 1.0', () => expect(getElementMultiplier('metal', 'fire')).toBe(1.0))
  test('neutral 对任何元素返回 1.0', () => {
    expect(getElementMultiplier('neutral', 'fire')).toBe(1.0)
    expect(getElementMultiplier('fire', 'neutral')).toBe(1.0)
  })
})
```

- [ ] **Step 4: 运行测试**

Run: `npx vitest run src/__tests__/skills.test.ts`
Expected: PASS

- [ ] **Step 5: 迁移 activeSkills.ts 的元素**

在 `src/data/activeSkills.ts` 中，将所有技能的 element 字段迁移：
- `ice` → `water`
- `lightning` → `metal`
- `healing` → `wood`
- `fire` → `fire`（不变）
- `neutral` → `neutral`（不变）

- [ ] **Step 6: 迁移 techniquesTable.ts 的元素**

在 `src/data/techniquesTable.ts` 中，将所有功法的 element 字段做相同迁移。注意：功法中有 `neutral` 元素保留不变。

- [ ] **Step 7: 迁移 enemies.ts 的元素**

在 `src/data/enemies.ts` 中，将所有敌人的 element 字段做相同迁移。

- [ ] **Step 8: 运行全量编译检查**

Run: `npx tsc -b`
Expected: 无类型错误

- [ ] **Step 9: 运行全量测试**

Run: `npx vitest run`
Expected: 所有现有测试通过（可能有 test fixture 中的旧元素值需要更新）

- [ ] **Step 10: 修复测试 fixture**

如果测试失败，更新 `src/__tests__/` 中所有硬编码的旧元素值（`ice` → `water`，`lightning` → `metal`，`healing` → `wood`）。

- [ ] **Step 11: 在 CombatEngine 中添加元素亲和加成**

在 `src/systems/combat/CombatEngine.ts` 的 `simulateCombat` 函数中，在计算 `elementMult` 之后（约 line 236），添加元素亲和加成逻辑：

```typescript
// 现有：const elementMult = getElementMultiplier(usedSkill.element, target.element)
// 在 elementMult 应用之前，检查攻击者的元素亲和
if (attacker.elementAffinity?.primary === usedSkill.element) {
  elementMult *= 1.20 // 主亲和 +20%
} else if (attacker.elementAffinity?.secondary === usedSkill.element) {
  elementMult *= 1.10 // 副亲和 +10%
}
```

注意：CombatUnit 类型需要新增 `elementAffinity` 字段（可选），在构建 CombatUnit 时从 Character 传入。

- [ ] **Step 12: 运行战斗测试**

Run: `npx vitest run src/__tests__/CombatEngine.test.ts`
Expected: PASS

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat: migrate 3-element to 5-element (wuxing) system

- Replace fire/ice/lightning with metal/wood/earth/water/fire cycle
- Migrate all skills, techniques, enemies to new elements
- Add element affinity damage bonus in combat (20% primary, 10% secondary)"
```

---

## Track B：成长倍率系统

### Task B1：GrowthMultipliers 类型和生成算法

**Files:**
- Modify: `src/types/character.ts`（新增 GrowthMultipliers）
- Create: `src/systems/character/GrowthMultiplierSystem.ts`
- Test: `src/__tests__/GrowthMultiplierSystem.test.ts`

- [ ] **Step 1: 新增 GrowthMultipliers 类型**

在 `src/types/character.ts` 中添加：

```typescript
export interface GrowthMultipliers {
  hp: number
  atk: number
  def: number
  spd: number
  crit: number
  critDmg: number
}
```

- [ ] **Step 2: 创建 GrowthMultiplierSystem.ts**

在 `src/systems/character/GrowthMultiplierSystem.ts` 中实现生成算法：

```typescript
import type { CharacterQuality, GrowthMultipliers } from '../../types/character'

const GROWTH_CONFIG: Record<CharacterQuality, {
  min: number; max: number; sumMin: number; sumMax: number
}> = {
  common:  { min: 0.6, max: 1.3, sumMin: 4.0, sumMax: 6.5 },
  spirit:  { min: 0.6, max: 1.4, sumMin: 4.5, sumMax: 7.0 },
  immortal:{ min: 0.6, max: 1.5, sumMin: 5.0, sumMax: 7.5 },
  divine:  { min: 0.7, max: 1.6, sumMin: 5.5, sumMax: 8.0 },
  chaos:   { min: 0.8, max: 1.7, sumMin: 6.0, sumMax: 8.5 },
}

const GROWTH_KEYS = ['hp', 'atk', 'def', 'spd', 'crit', 'critDmg'] as const

export function generateGrowthMultipliers(quality: CharacterQuality): GrowthMultipliers {
  const config = GROWTH_CONFIG[quality]
  const MAX_ATTEMPTS = 10

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const values = GROWTH_KEYS.map(() =>
      config.min + Math.random() * (config.max - config.min)
    )
    const sum = values.reduce((a, b) => a + b, 0)

    if (sum >= config.sumMin && sum <= config.sumMax) {
      return Object.fromEntries(
        GROWTH_KEYS.map((key, i) => [key, Math.round(values[i] * 100) / 100])
      ) as GrowthMultipliers
    }
  }

  // Fallback: 使用最后一次生成的值
  const values = GROWTH_KEYS.map(() =>
    config.min + Math.random() * (config.max - config.min)
  )
  return Object.fromEntries(
    GROWTH_KEYS.map((key, i) => [key, Math.round(values[i] * 100) / 100])
  ) as GrowthMultipliers
}

export function getDefaultGrowthMultipliers(): GrowthMultipliers {
  return { hp: 1, atk: 1, def: 1, spd: 1, crit: 1, critDmg: 1 }
}
```

- [ ] **Step 3: 写测试**

```typescript
// src/__tests__/GrowthMultiplierSystem.test.ts
import { generateGrowthMultipliers, getDefaultGrowthMultipliers } from '../systems/character/GrowthMultiplierSystem'

describe('GrowthMultiplierSystem', () => {
  test('生成的倍率在品质对应范围内', () => {
    for (let i = 0; i < 100; i++) {
      const gm = generateGrowthMultipliers('common')
      for (const key of ['hp', 'atk', 'def', 'spd', 'crit', 'critDmg'] as const) {
        expect(gm[key]).toBeGreaterThanOrEqual(0.6)
        expect(gm[key]).toBeLessThanOrEqual(1.3)
      }
    }
  })

  test('总和在约束范围内', () => {
    for (let i = 0; i < 100; i++) {
      const gm = generateGrowthMultipliers('common')
      const sum = Object.values(gm).reduce((a, b) => a + b, 0)
      expect(sum).toBeGreaterThanOrEqual(4.0)
      expect(sum).toBeLessThanOrEqual(6.5)
    }
  })

  test('混沌品质倍率范围更大', () => {
    const gm = generateGrowthMultipliers('chaos')
    for (const key of ['hp', 'atk', 'def', 'spd', 'crit', 'critDmg'] as const) {
      expect(gm[key]).toBeGreaterThanOrEqual(0.8)
      expect(gm[key]).toBeLessThanOrEqual(1.7)
    }
  })

  test('默认倍率全为 1.0', () => {
    const gm = getDefaultGrowthMultipliers()
    for (const key of ['hp', 'atk', 'def', 'spd', 'crit', 'critDmg'] as const) {
      expect(gm[key]).toBe(1)
    }
  })
})
```

- [ ] **Step 4: 运行测试**

Run: `npx vitest run src/__tests__/GrowthMultiplierSystem.test.ts`
Expected: PASS

- [ ] **Step 5: 集成到 levelSystem.ts**

修改 `src/data/levelSystem.ts` 的 `tryLevelUp` 函数，接受可选的 `growthMultipliers` 参数：

```typescript
export function tryLevelUp(
  currentLevel: number,
  currentXp: number,
  xpGain: number,
  quality: CharacterQuality,
  realmIndex: number,
  growthMultipliers?: GrowthMultipliers  // 新参数
): LevelUpResult {
  // ... 现有逻辑 ...
  while (level < cap && xp >= calcXpToNextLevel(level)) {
    xp -= calcXpToNextLevel(level)
    level++
    levelsGained++
    const gm = growthMultipliers ?? { hp: 1, atk: 1, def: 1 }
    hp += Math.round(perLevel.hp * gm.hp)
    atk += Math.round(perLevel.atk * gm.atk)
    def += Math.round(perLevel.def * gm.def)
  }
  // ...
}
```

- [ ] **Step 6: 集成到 CultivationEngine.ts calcStatGrowth**

修改 `src/systems/cultivation/CultivationEngine.ts` 的 `calcStatGrowth` 函数（私有），接受 growthMultipliers 参数：

在 major realm 分支中：
```typescript
hp:  Math.floor(currentStats.hp * MAJOR_REALM_STAT_MULT * (gm?.hp ?? 1))
atk: Math.floor(currentStats.atk * MAJOR_REALM_STAT_MULT * (gm?.atk ?? 1))
def: Math.floor(currentStats.def * MAJOR_REALM_STAT_MULT * (gm?.def ?? 1))
spd: Math.floor(currentStats.spd * MAJOR_REALM_STAT_MULT * (gm?.spd ?? 1))
```

在 sub-level 分支中同理。

- [ ] **Step 7: 集成到 DungeonGrowthSystem.ts**

修改 `src/systems/character/DungeonGrowthSystem.ts` 的 `calcDungeonGrowth`，接受可选的 `growthMultipliers`：

```typescript
export function calcDungeonGrowth(
  floorsCleared: number,
  quality: CharacterQuality,
  growthMultipliers?: GrowthMultipliers
): DungeonGrowthResult {
  const mult = QUALITY_GROWTH_MULT[quality]
  const gm = growthMultipliers ?? { hp: 1, atk: 1, def: 1 }
  return {
    statBoost: {
      hp:  Math.floor(2 * floorsCleared * mult * gm.hp),
      atk: Math.floor(1 * floorsCleared * mult * gm.atk),
      def: Math.floor(1 * floorsCleared * mult * gm.def),
    },
    cultivationGain: Math.floor(10 * floorsCleared * mult),
  }
}
```

- [ ] **Step 8: 运行编译和测试**

Run: `npx tsc -b && npx vitest run`
Expected: 编译通过，现有测试仍然通过（新参数可选）

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add growth multipliers system

- GrowthMultipliers type with per-stat 0.6~1.7 range
- Quality-based range constraints with sum normalization
- Integration into level-up, breakthrough, dungeon growth"
```

---

## Track C：天赋词缀系统

### Task C1：词缀效果类型

**Files:**
- Modify: `src/types/talent.ts`（新增词缀相关类型）
- Modify: `src/types/index.ts`（导出新类型）

- [ ] **Step 1: 在 talent.ts 中新增词缀效果类型**

```typescript
// 新增词缀效果类型
export type TalentAffixPosition = 'prefix' | 'suffix'
export type TalentAffixRarity = 'common' | 'rare' | 'epic' | 'legendary'

export type TalentAffixEffect =
  | { type: 'flatStat'; stat: TalentStat; minValue: number; maxValue: number }
  | { type: 'elementDamage'; element: string; minValue: number; maxValue: number }
  | { type: 'conditional'; trigger: string; effect: { stat: string; minValue: number; maxValue: number }; threshold?: number }
  | { type: 'chance'; description: string; minValue: number; maxValue: number; effect: { stat: string; value: number } }
  | { type: 'modifier'; target: string; minValue: number; maxValue: number }

export interface TalentAffix {
  id: string
  name: string
  position: TalentAffixPosition
  rarity: TalentAffixRarity
  description: string
  effects: TalentAffixEffect[]
}

export interface TalentAffixInstance {
  affixId: string
  name: string
  position: TalentAffixPosition
  rarity: TalentAffixRarity
  description: string
  resolvedEffects: Array<{ type: string; stat?: string; value: number; element?: string; target?: string }>
}
```

注意：`TalentAffixInstance` 是角色上实际存储的实例，`resolvedEffects` 已将 min/max range 解析为固定值。

- [ ] **Step 2: 更新 types/index.ts 导出**

在 `src/types/index.ts` 中添加新类型的导出。

### Task C2：80 词缀数据文件

**Files:**
- Create: `src/data/talentAffixes.ts`

- [ ] **Step 3: 创建 talentAffixes.ts**

80 个词缀定义（40 前缀 + 40 后缀），按稀有度分层。文件较大，按以下结构组织：

```typescript
// 前缀（40 个）: 普通15 + 稀有12 + 史诗8 + 传说5
// 后缀（40 个）: 普通15 + 稀有12 + 史诗8 + 传说5
export const TALENT_AFFIXES: TalentAffix[] = [
  // === 前缀 - 普通 (15) ===
  { id: 'prefix_wuti', name: '武体', position: 'prefix', rarity: 'common',
    description: '天生力道惊人',
    effects: [{ type: 'flatStat', stat: 'atk', minValue: 2, maxValue: 5 }] },
  { id: 'prefix_tiebi', name: '铁壁', position: 'prefix', rarity: 'common',
    description: '皮肉坚韧如铁',
    effects: [{ type: 'flatStat', stat: 'def', minValue: 1, maxValue: 4 }] },
  // ... 其余 13 个普通前缀（速度型、暴击型、生存型、修炼型、生产型各覆盖）

  // === 前缀 - 稀有 (12) ===
  // 5 个元素强化前缀（金/木/水/火/土各一）+ 7 个属性强化前缀

  // === 前缀 - 史诗 (8) ===
  // 复合效果前缀（如战魂、不死、天道等）

  // === 前缀 - 传说 (5) ===
  // 超强复合效果前缀

  // === 后缀 - 普通 (15) ===
  // 基础战斗/生存特效

  // === 后缀 - 稀有 (12) ===
  // 探险/掉落/经验加成

  // === 后缀 - 史诗 (8) ===
  // 强力条件触发效果

  // === 后缀 - 传说 (5) ===
  // 顶级特殊能力
]
```

具体的 80 个词缀需要按 spec 中"词缀设计方向"编写：
- 前缀普通：15 个单属性词缀覆盖所有 TalentStat
- 前缀稀有：5 元素强化 + 7 双属性/复合
- 前缀史诗：8 个三属性/条件效果
- 前缀传说：5 个顶级复合效果
- 后缀各层级同理

- [ ] **Step 4: 创建词缀查询工具函数**

```typescript
export function getAffixesByPosition(position: TalentAffixPosition): TalentAffix[]
export function getAffixesByRarity(rarity: TalentAffixRarity, position?: TalentAffixPosition): TalentAffix[]
export function getAffixById(id: string): TalentAffix | undefined
```

### Task C3：词缀生成器

**Files:**
- Create: `src/systems/character/TalentAffixGenerator.ts`
- Test: `src/__tests__/TalentAffixGenerator.test.ts`

- [ ] **Step 5: 创建词缀生成器**

```typescript
import type { CharacterQuality } from '../../types/character'
import type { TalentAffix, TalentAffixInstance, TalentAffixRarity } from '../../types/talent'
import { TALENT_AFFIXES, getAffixesByPosition, getAffixesByRarity } from '../../data/talentAffixes'

// 品质 → 前缀/后缀概率和稀有度池
const AFFIX_CONFIG: Record<CharacterQuality, {
  prefixChance: number
  prefixRarities: TalentAffixRarity[]
  suffixChance: number
  suffixRarities: TalentAffixRarity[]
}> = {
  common:   { prefixChance: 0.6, prefixRarities: ['common'], suffixChance: 0.3, suffixRarities: ['common'] },
  spirit:   { prefixChance: 0.5, prefixRarities: ['common', 'rare'], suffixChance: 0.4, suffixRarities: ['common', 'rare'] },
  immortal: { prefixChance: 0.6, prefixRarities: ['common', 'rare', 'epic'], suffixChance: 0.5, suffixRarities: ['common', 'rare', 'epic'] },
  divine:   { prefixChance: 0.7, prefixRarities: ['rare', 'epic', 'legendary'], suffixChance: 0.6, suffixRarities: ['rare', 'epic', 'legendary'] },
  chaos:    { prefixChance: 0.8, prefixRarities: ['epic', 'legendary'], suffixChance: 0.7, suffixRarities: ['epic', 'legendary'] },
}

export function rollAffixes(quality: CharacterQuality): {
  prefix?: TalentAffixInstance
  suffix?: TalentAffixInstance
} {
  const config = AFFIX_CONFIG[quality]
  const result: { prefix?: TalentAffixInstance; suffix?: TalentAffixInstance } = {}

  // 摇前缀
  if (Math.random() < config.prefixChance) {
    const pool = TALENT_AFFIXES.filter(a =>
      a.position === 'prefix' && config.prefixRarities.includes(a.rarity)
    )
    if (pool.length > 0) {
      const affix = pool[Math.floor(Math.random() * pool.length)]
      result.prefix = resolveAffix(affix)
    }
  }

  // 摇后缀
  if (Math.random() < config.suffixChance) {
    const pool = TALENT_AFFIXES.filter(a =>
      a.position === 'suffix' && config.suffixRarities.includes(a.rarity)
    )
    if (pool.length > 0) {
      const affix = pool[Math.floor(Math.random() * pool.length)]
      result.suffix = resolveAffix(affix)
    }
  }

  return result
}

function resolveAffix(affix: TalentAffix): TalentAffixInstance {
  return {
    affixId: affix.id,
    name: affix.name,
    position: affix.position,
    rarity: affix.rarity,
    description: affix.description,
    resolvedEffects: affix.effects.map(eff => {
      const value = eff.minValue + Math.random() * (eff.maxValue - eff.minValue)
      const base: Record<string, unknown> = { type: eff.type, value: Math.round(value * 1000) / 1000 }
      if ('stat' in eff) base.stat = eff.stat
      if ('element' in eff) base.element = eff.element
      if ('target' in eff) base.target = eff.target
      return base as TalentAffixInstance['resolvedEffects'][number]
    }),
  }
}
```

- [ ] **Step 6: 写词缀生成器测试**

```typescript
// src/__tests__/TalentAffixGenerator.test.ts
import { rollAffixes } from '../systems/character/TalentAffixGenerator'

describe('TalentAffixGenerator', () => {
  test('凡品弟子只有普通稀有度词缀', () => {
    for (let i = 0; i < 50; i++) {
      const result = rollAffixes('common')
      if (result.prefix) expect(result.prefix.rarity).toBe('common')
      if (result.suffix) expect(result.suffix.rarity).toBe('common')
    }
  })

  test('混沌弟子只有史诗/传说稀有度词缀', () => {
    for (let i = 0; i < 50; i++) {
      const result = rollAffixes('chaos')
      if (result.prefix) expect(['epic', 'legendary']).toContain(result.prefix.rarity)
      if (result.suffix) expect(['epic', 'legendary']).toContain(result.suffix.rarity)
    }
  })

  test('词缀数值在定义范围内', () => {
    for (let i = 0; i < 50; i++) {
      const result = rollAffixes('immortal')
      if (result.prefix) {
        for (const eff of result.prefix.resolvedEffects) {
          expect(eff.value).toBeGreaterThan(0)
        }
      }
    }
  })

  test('凡品弟子大约 60% 有前缀，30% 有后缀', () => {
    let prefixCount = 0, suffixCount = 0
    for (let i = 0; i < 200; i++) {
      const result = rollAffixes('common')
      if (result.prefix) prefixCount++
      if (result.suffix) suffixCount++
    }
    expect(prefixCount).toBeGreaterThan(90) // ~120
    expect(prefixCount).toBeLessThan(150)
    expect(suffixCount).toBeGreaterThan(40) // ~60
    expect(suffixCount).toBeLessThan(90)
  })
})
```

- [ ] **Step 7: 运行测试**

Run: `npx vitest run src/__tests__/TalentAffixGenerator.test.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add talent affix system with 80 affixes

- Structured TalentAffixEffect union type (5 effect types)
- 80 affixes (40 prefix + 40 suffix) across 4 rarity tiers
- Affix generator with quality-based probability and rarity gating
- Resolved affix instances with rolled values"
```

---

## Phase 2：集成（顺序执行，依赖 Phase 1 合并）

### Task D：CharacterEngine 重写

**Files:**
- Modify: `src/types/character.ts`（Character 接口新增字段 + ElementAffinity）
- Modify: `src/systems/character/CharacterEngine.ts`（重写 generateCharacter）
- Test: `src/__tests__/CharacterEngine.test.ts`（重写测试）

- [ ] **Step 1: 更新 Character 类型**

在 `src/types/character.ts` 中：
- 新增 `ElementAffinity` 接口
- 新增 `elementAffinity: ElementAffinity`
- 新增 `growthMultipliers: GrowthMultipliers`
- 新增 `prefix?: TalentAffixInstance`
- 新增 `suffix?: TalentAffixInstance`

- [ ] **Step 2: 更新所有引用 Character.talents 的代码**

全局搜索 `talents` 引用，替换为 `prefix`/`suffix`：
- `src/stores/sectStore/characterSlice.ts`
- `src/pages/CharactersPage.tsx`
- 其他引用

- [ ] **Step 3: 重写 generateCharacter**

在 `src/systems/character/CharacterEngine.ts` 中，`generateCharacter` 函数集成三个新维度：

```typescript
export function generateCharacter(quality: CharacterQuality, activeRoute: SectRouteId | null = null): Character {
  // 1. 元素亲和
  const elements: Element[] = ['metal', 'wood', 'earth', 'water', 'fire']
  const primary = elements[Math.floor(Math.random() * elements.length)]
  const secondaryChance = { common: 0, spirit: 0.2, immortal: 0.4, divine: 0.6, chaos: 0.8 }[quality]
  const secondary = Math.random() < secondaryChance
    ? elements.filter(e => e !== primary)[Math.floor(Math.random() * 4)]
    : undefined
  const elementAffinity: ElementAffinity = { primary, secondary }

  // 2. 成长倍率
  const growthMultipliers = generateGrowthMultipliers(quality)

  // 3. 天赋词缀
  const { prefix, suffix } = rollAffixes(quality)

  // 4. 原有逻辑（品质、属性、专长、命格等）保持不变
  // ...

  return { /* ...所有字段..., elementAffinity, growthMultipliers, prefix, suffix */ }
}
```

- [ ] **Step 4: 重写 CharacterEngine 测试**

更新测试验证新字段正确生成。

- [ ] **Step 5: 运行全量测试**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: integrate 3 randomization dimensions into character generation

- Element affinity (5 elements + secondary)
- Growth multipliers (6 stats, quality-gated ranges)
- Talent affixes (prefix + suffix from 80 pool)"
```

### Task E：存档迁移

**Files:**
- Modify: `src/systems/save/SaveSystem.ts`

- [ ] **Step 7: 实现存档迁移 v8→v9**

在 `SaveSystem.ts` 的加载逻辑中，`meta.version < 9` 分支添加：

```typescript
if (meta.version < 9) {
  for (const char of rawCharacters) {
    // 迁移 talents → prefix/suffix
    if (char.talents && char.talents.length > 0 && !char.prefix) {
      const mapped = migrateOldTalents(char.talents)
      char.prefix = mapped.prefix
      char.suffix = mapped.suffix
      delete char.talents
    }
    // 填充 elementAffinity
    if (!char.elementAffinity) {
      const elements = ['metal', 'wood', 'earth', 'water', 'fire']
      char.elementAffinity = {
        primary: elements[Math.floor(Math.random() * 5)]
      }
    }
    // 填充 growthMultipliers
    if (!char.growthMultipliers) {
      char.growthMultipliers = { hp: 1, atk: 1, def: 1, spd: 1, crit: 1, critDmg: 1 }
    }
  }
  meta.version = 9
}
```

`migrateOldTalents` 函数按 spec 中的映射表实现。

- [ ] **Step 8: 更新 CURRENT_VERSION**

确保 SaveSystem 保存时使用 version 9。

- [ ] **Step 9: 写迁移测试**

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: save migration v8→v9 for character randomization"
```

### Task F：UI 展示

**Files:**
- Modify: `src/pages/CharactersPage.tsx`
- 相关组件

- [ ] **Step 11: 弟子详情展示五行亲和**

显示主亲和/副亲和的元素名称和颜色标识。

- [ ] **Step 12: 弟子详情展示成长倍率**

用条形图或数值展示 6 维成长倍率。

- [ ] **Step 13: 弟子详情展示天赋词缀**

显示前缀和后缀的名称、描述、效果。

- [ ] **Step 14: 角色卡片简要展示**

在角色列表卡片上用颜色点标识亲和元素，用文字标识词缀名。

- [ ] **Step 15: Commit**

```bash
git add -A
git commit -m "feat: UI for element affinity, growth multipliers, talent affixes"
```

### Task G：CLAUDE.md 更新

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 16: 更新 Roguelike 描述**

按 spec 第六节替换描述。

- [ ] **Step 17: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update roguelike description to emphasize entity randomization"
```
