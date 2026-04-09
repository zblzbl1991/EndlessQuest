# 子任务A: 后端 — 弟子等级系统 + 存档导出导入

## Goal

实现弟子等级系统（品质→属性倍率，境界→等级上限，秘境→经验）和存档导出导入功能。

## R1: 弟子等级系统

### Character 类型变更 (`src/types/character.ts`)

在 `Character` 接口中添加两个新字段：
```typescript
level: number    // 当前等级，默认 1
xp: number       // 当前经验值，默认 0
```

### 境界等级上限 (`src/data/realms.ts`)

添加导出常量：
```typescript
export const REALM_LEVEL_CAPS: number[] = [10, 20, 30, 40, 50, 60]
// 索引对应 realm 0-5
```

添加辅助函数：
```typescript
export function getRealmLevelCap(realmIndex: number): number
```

### 品质等级属性 (`src/data/` 下新建或复用)

新建 `src/data/levelSystem.ts`：
```typescript
import type { CharacterQuality } from '../types/character'

export const QUALITY_LEVEL_STATS: Record<CharacterQuality, { hp: number; atk: number; def: number }> = {
  common:   { hp: 2,  atk: 1, def: 1 },
  spirit:   { hp: 4,  atk: 2, def: 2 },
  immortal: { hp: 6,  atk: 3, def: 3 },
  divine:   { hp: 8,  atk: 4, def: 4 },
  chaos:    { hp: 12, atk: 6, def: 6 },
}

export function calcXpToNextLevel(level: number): number {
  return level * 100
}

export function getRealmLevelCap(realmIndex: number): number {
  return [10, 20, 30, 40, 50, 60][realmIndex] ?? 10
}

export interface LevelUpResult {
  levelsGained: number
  xpRemaining: number
  statBoost: { hp: number; atk: number; def: number }
}

/**
 * 尝试用给定 xp 升级角色。
 * 返回升级结果（可能升多级）。
 * 受境界等级上限限制。
 */
export function tryLevelUp(
  currentLevel: number,
  currentXp: number,
  xpGain: number,
  quality: CharacterQuality,
  realmIndex: number
): LevelUpResult
```

`tryLevelUp` 实现逻辑：
1. newXp = currentXp + xpGain
2. 循环：while level < cap && newXp >= calcXpToNextLevel(level)
3. 每次升级：newXp -= calcXpToNextLevel(level), level++, 累加品质属性
4. 返回 { levelsGained, xpRemaining: newXp, statBoost }

### DungeonGrowthSystem 变更 (`src/systems/character/DungeonGrowthSystem.ts`)

修改 `DungeonGrowthResult` 添加 `xpGain` 字段：
```typescript
export interface DungeonGrowthResult {
  statBoost: { hp: number; atk: number; def: number }
  cultivationGain: number
  xpGain: number  // 新增：秘境经验
}
```

修改 `calcDungeonGrowth`：
- `xpGain = floorsCleared * 100`（固定每层100经验）
- `statBoost` 改为全 0（属性增长改为由升级系统驱动）
- `cultivationGain` 保持不变

### Store 变更 (`src/stores/sectStore/characterSlice.ts`)

添加新的 action（或复用现有）：
- 在 `applyDungeonGrowth`（或 adventureStore 完成秘境的地方）调用 `tryLevelUp`
- 更新 character.level, character.xp, character.baseStats

具体地，在 `src/stores/adventureStore.ts` 中处理秘境完成时：
1. 调用 `calcDungeonGrowth()` 获得 `xpGain`
2. 调用 `tryLevelUp(char.level, char.xp, xpGain, char.quality, char.realm)`
3. 如果 `levelsGained > 0`：更新 char.level, char.xp, char.baseStats += statBoost
4. 否则只更新 char.xp

### CharacterEngine 变更 (`src/systems/character/CharacterEngine.ts`)

在 `generateCharacter()` 返回的对象中添加：
```typescript
level: 1,
xp: 0,
```

### 突破时检查等级上限

在突破成功的处理逻辑中（`BreakthroughCoordinator.ts` 或 `characterSlice.ts` 的突破 action），
突破后如果新境界的等级上限 > 旧上限，不需要额外操作——`tryLevelUp` 自然会在下次获得经验时利用新的上限。
但应该 emit 一个事件通知玩家："境界突破，等级上限提升至 X"。

### SaveSystem 迁移 (`src/systems/save/SaveSystem.ts`)

在 `loadGame()` 的 character map 中添加：
```typescript
level: normalizeFiniteNumber(c.level, 1),
xp: normalizeFiniteNumber(c.xp, 0),
```

版本号无需更改（新字段有默认值，向下兼容）。

## R2: 存档导出导入

### 导出函数 (`src/systems/save/SaveSystem.ts`)

```typescript
export async function exportSaveData(): Promise<string> {
  const db = await getDB()
  const data = {
    version: 8,
    exportedAt: Date.now(),
    meta: await db.get('meta', 1),
    characters: await db.getAll('characters'),
    buildings: await db.getAll('buildings'),
    vault: await db.getAll('vault'),
    pets: await db.getAll('pets'),
    adventure: await db.getAll('adventure'),
    history: await db.getAll('history'),
    resources: await db.getAll('resources'),
  }
  return JSON.stringify(data)
}
```

### 导入函数

```typescript
export async function importSaveData(jsonString: string): Promise<boolean> {
  // 1. 解析 JSON
  // 2. 校验 version 和必要字段
  // 3. 清空现有数据
  // 4. 写入所有 stores
  // 5. 返回 true/false
}
```

### UI 入口

在 `src/pages/EventLogPage.tsx`（日志页是最适合放"系统"功能的地方）
或者新建一个简单的设置面板。

**推荐方案**：在 EventLogPage 顶部添加"存档管理"区块，包含：
- 导出存档按钮（触发文件下载）
- 导入存档按钮（触发文件选择）
- 导入确认弹窗

文件下载使用：
```typescript
const blob = new Blob([json], { type: 'application/json' })
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = `endlessquest_save_${new Date().toISOString().slice(0, 10)}.json`
a.click()
```

## Acceptance Criteria

- [ ] Character 接口包含 level 和 xp 字段
- [ ] 新角色默认 level=1, xp=0
- [ ] 秘境完成获得经验，经验足够时自动升级
- [ ] 境界限制等级上限，无法超过
- [ ] 升级时根据品质增加属性
- [ ] 旧存档加载时 level 默认为 1, xp 默认为 0
- [ ] 存档可以导出为 JSON 文件
- [ ] JSON 文件可以导入恢复存档
- [ ] 导入前有确认提示
- [ ] `npm run lint` 和 `npx tsc -b` 通过

## 技术约束

- 不要引入新依赖
- 遵循项目代码风格（Prettier: 单引号、无分号、2空格缩进）
- 新文件放在正确的目录下（data/ 放数据表，systems/ 放逻辑）
- Store action 使用 Zustand slice 模式
