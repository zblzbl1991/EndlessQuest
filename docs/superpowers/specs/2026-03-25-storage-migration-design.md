# 存储系统迁移 — Design Spec

**日期：** 2026-03-25
**分支：** feat/sect-redesign

## 目标

将游戏存储从 localStorage 全面迁移到 IndexedDB，采用混合策略：IndexedDB 存储结构化游戏数据，localStorage 仅保留启动时需要的轻量元数据。同时建立历史记录和资源缓存的基础设施。

## 设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| IndexedDB 封装 | `idb` 库（~600B） | 极小体积，Promise API，社区广泛使用 |
| 存档策略 | 单存档 + 架构可扩展多槽位 | 当前只需单存档，key 为 slot number 预留扩展 |
| 历史记录 | 基础设施先行，UI 后续 | 建好读写能力，不阻塞当前功能 |
| 资源缓存 | 基础设施先行，UI 后续 | 当前无图片/音频资源，预留 API |
| 存档版本 | v2 → v3 | IndexedDB 格式为新版本，自动迁移旧存档 |

---

## 1. IndexedDB 数据库架构

数据库名：`endlessquest_db`，版本号：1

| Object Store | Key | Indexes | 说明 |
|-------------|-----|---------|------|
| `save` | `slot` (number) | — | 完整宗门存档，当前 slot=1 |
| `adventure` | `runId` (string) | `status`, `startedAt` | 活跃秘境 Runs |
| `history` | `id` (autoIncrement) | `type`, `timestamp` | 游戏历史记录 |
| `resources` | `key` (string) | — | 静态资源 Blob 缓存 |

### 1.1 save store 结构

```typescript
interface SaveRecord {
  slot: number               // 主键，当前固定为 1
  timestamp: number           // 保存时间
  version: 3                  // 存档版本
  sect: Sect                  // 完整宗门数据（弟子、建筑、资源、仓库、宠物）
}
```

### 1.2 adventure store 结构

```typescript
interface AdventureRecord {
  runId: string               // 主键
  status: 'active' | 'completed' | 'failed'
  startedAt: number           // 开始时间
  run: DungeonRun             // 完整 Run 数据
}
```

### 1.3 history store 结构

```typescript
interface GameHistoryEntry {
  id?: number                 // autoIncrement 主键
  type: 'dungeonComplete' | 'breakthrough' | 'recruit' | 'itemForge' | 'potionCraft'
  timestamp: number
  summary: string
  data: Record<string, unknown>
}
```

### 1.4 resources store 结构

```typescript
interface CachedResource {
  key: string                 // 主键，如 'img/character/common.png'
  blob: Blob
  version: string             // 缓存版本控制
  cachedAt: number
}
```

---

## 2. localStorage 保留内容

只保留两个轻量 key：

| Key | 内容 | 说明 |
|-----|------|------|
| `eq_save_meta` | `{ version: 3, lastOnlineTime: number, saveSlot: number }` | 启动时同步判断有无存档 |
| `eq_settings` | `{ volume: number, ... }` | 游戏设置（未来使用） |

`eq_save_meta` 在每次保存时同步更新。`hasSaveData()` 只需读此值，无需访问 IndexedDB。

---

## 3. SaveSystem 重构

文件：`src/systems/save/SaveSystem.ts`

### 3.1 公共 API 变化

```typescript
// 改为 async（内部走 IndexedDB）
export function saveGame(): Promise<void>
export function loadGame(): Promise<boolean>
export function clearSaveData(): Promise<void>

// 保持同步（只读 localStorage 元数据）
export function hasSaveData(): boolean
```

### 3.2 saveGame 流程

1. 从 `useSectStore.getState().sect` 收集宗门数据
2. 从 `useAdventureStore.getState().activeRuns` 收集秘境数据
3. 写入 IndexedDB `save` store（slot=1, 完整 sect）
4. 写入 IndexedDB `adventure` store（每个 activeRun 一条记录，put 操作）
5. 同步更新 localStorage `eq_save_meta`（version, lastOnlineTime, saveSlot）

### 3.3 loadGame 流程

1. 同步检查 localStorage `eq_save_meta`，判断是否有存档
2. 如有存档，从 IndexedDB `save` store 读取 slot=1 的记录
3. 从 IndexedDB `adventure` store 读取所有 status='active' 的记录
4. 恢复数据到 `useSectStore` 和 `useAdventureStore`
5. 恢复 `useGameStore` 的 `lastOnlineTime`

### 3.4 clearSaveData 流程

1. 清除 IndexedDB 所有 4 个 object store 的数据
2. 清除 localStorage `eq_save_meta`

### 3.5 v2 存档迁移

在 `loadGame()` 中检测：
- 如果 localStorage 有 `endlessquest_save` key 但无 `eq_save_meta` key → 触发迁移
- 解析旧 JSON，将 sect 数据写入 IndexedDB `save` store（slot=1）
- 将 activeRuns 写入 IndexedDB `adventure` store
- 创建 `eq_save_meta` 到 localStorage
- 删除旧的 `endlessquest_save` key
- 迁移完成后正常继续加载流程

---

## 4. useAutoSave 改造

文件：`src/systems/save/useAutoSave.ts`

### 4.1 变化

- `loadGame()` 变为 async，需要在 useEffect 中 await
- `saveGame()` 变为 async，定时器中调用（fire-and-forget，Promise 自动处理）
- 导出一个 `isLoaded` ref 或 state，供 App 组件判断是否可以渲染游戏

### 4.2 接口

```typescript
export function useAutoSave(): { isLoaded: boolean }
```

返回 `isLoaded` 状态：
- `false`：正在加载存档 / 正在初始化 IndexedDB
- `true`：存档加载完成，游戏可以渲染

---

## 5. 应用启动流程

文件：`src/App.tsx`

### 5.1 变化

```
App mount → 显示 LoadingScreen（isLoaded=false）
  ↓
useAutoSave 内部：
  1. 打开 IndexedDB（await db.openDB()）
  2. 检查 localStorage hasSaveData()
  3. 如有存档 → await loadGame()
  4. 如无存档 → 使用默认初始状态
  5. 设置 isLoaded = true
  ↓
LoadingScreen 隐藏 → 渲染游戏界面
```

### 5.2 LoadingScreen

简单的居中文字"加载中..."，水墨风格。无需复杂动画，只需避免白屏闪烁。

---

## 6. 新增模块

### 6.1 db.ts — IndexedDB 初始化

文件：`src/systems/save/db.ts`

职责：
- 使用 `idb` 库封装 `openDB()`
- 定义数据库名 `endlessquest_db`、版本号 1
- 定义 4 个 object store 及其 indexes
- 导出 `getDB()` 单例函数（lazy init）

```typescript
import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'endlessquest_db'
const DB_VERSION = 1

let _db: IDBPDatabase | null = null

export async function getDB(): Promise<IDBPDatabase> {
  if (_db) return _db
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // save store
      if (!db.objectStoreNames.contains('save')) {
        db.createObjectStore('save', { keyPath: 'slot' })
      }
      // adventure store
      if (!db.objectStoreNames.contains('adventure')) {
        const adv = db.createObjectStore('adventure', { keyPath: 'runId' })
        adv.createIndex('status', 'status')
        adv.createIndex('startedAt', 'startedAt')
      }
      // history store
      if (!db.objectStoreNames.contains('history')) {
        const hist = db.createObjectStore('history', { keyPath: 'id', autoIncrement: true })
        hist.createIndex('type', 'type')
        hist.createIndex('timestamp', 'timestamp')
      }
      // resources store
      if (!db.objectStoreNames.contains('resources')) {
        db.createObjectStore('resources', { keyPath: 'key' })
      }
    },
  })
  return _db
}
```

### 6.2 HistoryStore.ts — 历史记录

文件：`src/systems/save/HistoryStore.ts`

职责：
- 提供 `addHistory(entry)` 和 `queryHistory(type?, since?, limit?)` 函数
- 读写 IndexedDB `history` store
- **本次不接入 UI**，仅在关键事件点（breakthrough、dungeon complete 等）调用 `addHistory()`

### 6.3 ResourceCache.ts — 资源缓存

文件：`src/systems/save/ResourceCache.ts`

职责：
- 提供 `getCached(key)` 和 `setCache(key, blob, version)` 函数
- 读写 IndexedDB `resources` store
- **本次不接入实际资源**，预留 API 供未来使用

---

## 7. 存档兼容

### 7.1 v2 → v3 迁移

| 情况 | 处理 |
|------|------|
| localStorage 有 `endlessquest_save`（v2） | 自动迁移到 IndexedDB，删除旧 key |
| localStorage 有 `eq_save_meta`（v3） | 正常加载 IndexedDB |
| 两者都没有 | 新游戏 |
| `eq_save_meta.version < 3` | 版本不兼容，清除存档 |

### 7.2 迁移安全

- 迁移成功后才删除旧 localStorage key
- 迁移失败时不删除旧数据，下次启动可重试
- 迁移过程中显示 loading 界面

---

## 8. 测试策略

### 8.1 SaveSystem 测试

- 使用 `fake-indexeddb` mock IndexedDB 环境
- 测试正常保存/加载流程
- 测试 v2 迁移流程
- 测试无存档时的行为
- 测试存档损坏时的错误处理

### 8.2 HistoryStore 测试

- 测试写入和按类型/时间查询
- 测试分页

### 8.3 ResourceCache 测试

- 测试写入和读取 Blob

### 8.4 useAutoSave 测试

- 测试加载完成状态
- 测试定时保存

---

## 9. 文件变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `src/systems/save/db.ts` | IndexedDB 初始化 + idb 封装 |
| 修改 | `src/systems/save/SaveSystem.ts` | 全面改为 IndexedDB，API async，v2 迁移 |
| 修改 | `src/systems/save/useAutoSave.ts` | 适配 async，导出 isLoaded |
| 新建 | `src/systems/save/HistoryStore.ts` | 历史记录读写 |
| 新建 | `src/systems/save/ResourceCache.ts` | 资源缓存读写 |
| 修改 | `src/App.tsx` | Loading 状态 + 等待存档加载 |
| 修改 | `src/__tests__/SaveSystem.test.ts` | 适配 async + fake-indexeddb |
| 新建 | `src/__tests__/HistoryStore.test.ts` | 历史记录测试 |
| 新建 | `src/__tests__/ResourceCache.test.ts` | 资源缓存测试 |
| 修改 | `package.json` | 添加 `idb` + `fake-indexeddb` 依赖 |

## 10. 不变的部分

- 三个 Zustand store 的接口和内部逻辑不变
- UI 组件不变
- 游戏系统（combat, cultivation, roguelike 等）不变
- SaveSystem 的公共语义（saveGame, loadGame, hasSaveData, clearSaveData）不变，仅从同步变为异步
