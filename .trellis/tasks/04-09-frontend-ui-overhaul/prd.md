# 子任务B: 前端 — 等级显示 + 信息密度优化 + 技能自定义

## Goal

优化弟子详情页的信息密度，添加等级显示和经验进度条，实现技能自定义 UI。

**重要**：此任务与后端任务并行开发。Character 接口将新增 `level: number` 和 `xp: number` 字段，你需要：
1. 先手动在 `src/types/character.ts` 中添加这两个字段（如果后端还没合并的话）
2. 或者写代码时防御性处理：`(character as any).level ?? 1`

## R1: 等级显示

### CharacterCard 摘要 (`src/components/common/CharacterCard.tsx`)

在卡片的境界名称旁边显示等级：
```
炼气期 初期 Lv.5
```

如果 `character.level` 不存在（旧代码），显示 `Lv.1`。

添加经验进度条（小型，在等级文字下方）：
- 使用已有的 `ProgressBar` 组件，variant="ink"
- 显示 `xp / xpToNextLevel`

### CharacterDetail 详情 (`src/pages/CharactersPage.tsx`)

在详情头部（`detailHeader`）中添加等级信息：
- 在境界名称下方显示 "等级 X / 上限 Y"
- 添加经验进度条
- 等级上限由境界决定：[10, 20, 30, 40, 50, 60][realm]

需要在 CharactersPage.tsx 中引入辅助函数：
```typescript
function calcXpToNextLevel(level: number): number {
  return level * 100
}
function getRealmLevelCap(realmIndex: number): number {
  return [10, 20, 30, 40, 50, 60][realmIndex] ?? 10
}
```

或者如果后端已经在 `src/data/levelSystem.ts` 中定义了，直接 import。

## R2: 信息密度优化

### 目标

CharacterDetail 的核心列（coreColumn）目前一次性展示 5-6 个 section：
1. 修炼与突破
2. 当前状态（仅秘境中显示）
3. 基础属性
4. 修炼资质
5. 装备

### 方案：将核心列也改为 FoldSection

将"基础属性"、"修炼资质"、"装备"改为使用已有的 `FoldSection` 组件（折叠区块）：
- "修炼与突破" — **默认展开**（最重要）
- "基础属性" — **默认折叠**，summary 显示 HP/ATK/DEF 简要数值
- "修炼资质" — **默认折叠**，summary 显示灵根/悟性简要
- "装备" — **默认展开**（玩家常操作）

这样打开详情页时只看到：身份信息 + 修炼进度 + 突破面板 + 装备，而不是全部6个区块。

## R3: 技能自定义 UI

### 当前状态

战斗画像在 supportColumn 的 FoldSection 中，展示自动分配的技能列表。玩家只能看，不能改。

### 新增：技能槽位编辑

在"战斗画像"FoldSection 的"当前主动技"区域下方添加：
- 每个技能槽位旁边有一个小的切换按钮
- 点击后展开该槽位的可用技能列表
- 可用技能 = 当前境界解锁的所有技能（通过 `getTierUnlockThreshold` 过滤）
- 当前自动推荐的技能标记为"推荐"
- 选择后更新 `character.equippedSkills[slotIndex]`

### Store Action

需要在 `characterSlice.ts` 中添加或使用现有 action：
```typescript
updateCharacterSkill(characterId: string, slotIndex: number, skillId: string | null): void
```

这个 action 应该：
1. 更新 equippedSkills[slotIndex]
2. 不改变其他槽位

### 技能选择器组件

在 `src/components/` 下新建 `SkillSlotEditor` 组件（或在 CharactersPage.tsx 内部定义）：

Props:
```typescript
{
  character: Character
  slotIndex: number
  currentSkillId: string | null
  onSkillSelect: (slotIndex: number, skillId: string | null) => void
}
```

显示：
- 当前技能名称 + 切换按钮
- 展开后显示可用技能列表
- 每个技能显示：名称、类别、灵力消耗、CD、推荐标记
- 选中的技能高亮

### 数据来源

从 `src/data/activeSkills.ts` 获取：
- `ACTIVE_SKILLS` — 所有技能定义
- `getTierUnlockThreshold()` — 境界解锁阈值
- `buildCharacterSkillLoadout()` — 推荐配置

技能按角色境界过滤：只有 `skill.tier <= getTierUnlockThreshold(character.realm)` 的技能可选。

## 关键文件

- `src/types/character.ts` — 添加 level/xp 字段
- `src/components/common/CharacterCard.tsx` — 等级显示
- `src/pages/CharactersPage.tsx` — 详情页重构 + 技能自定义
- `src/data/activeSkills.ts` — 技能数据，参考但不修改
- `src/components/common/ProgressBar.tsx` — 经验进度条

## Acceptance Criteria

- [ ] CharacterCard 显示等级和经验进度
- [ ] CharacterDetail 显示等级/上限和经验条
- [ ] 核心列的"基础属性"和"修炼资质"默认折叠
- [ ] 折叠区块 summary 显示关键数值摘要
- [ ] 战斗画像中每个技能槽位可点击切换
- [ ] 技能选择器显示可用技能列表，标记推荐
- [ ] 选择技能后正确更新 equippedSkills
- [ ] 旧存档（无 level 字段）不崩溃
- [ ] `npm run lint` 和 `npx tsc -b` 通过

## 技术约束

- 不要引入新依赖
- 遵循项目代码风格（Prettier: 单引号、无分号、2空格缩进）
- 复用已有的 FoldSection、ProgressBar、PixelIcon 组件
- CSS 使用 CSS Modules，放在 CharactersPage.module.css 中
- 技能选择器的样式应匹配项目水墨风格（参考已有组件的 CSS）
