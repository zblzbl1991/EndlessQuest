# IndexedDB 统一数据持久化 设计文档

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将所有游戏数据统一到 IndexedDB 中按实体独立存储，并通过 write-through 机制自动持久化，消除 localStorage 依赖和大 blob 序列化问题。

**Architecture:** 将现有 `save` store 中的 Sect 大 blob 拆分为 `meta`、`characters`、`buildings`、`vault`、`pets` 五个独立 object store。通过 Zustand `subscribe` + debounce 监听状态变更，在单次 IDB transaction 中原子写入所有受影响的实体 stores。

**Tech Stack:** IndexedDB (idb 库), Zustand 5 subscribe API

---

## 1. 现状分析

### 当前存储结构

| 数据 | 存储位置 | 方式 |
|------|---------|------|
| 整个 Sect（弟子/建筑/仓库/资源/功法/宠物） | IndexedDB `save` store | 一个 JSON blob |
| 冒险队伍 | IndexedDB `adventure` store | 独立记录 |
| 事件日志 | IndexedDB `history` store | 独立记录 |
| Save meta | localStorage `eq_save_meta` | 小 JSON |
| 资源缓存（图片） | IndexedDB `resources` store | Blob |

### 痛点

1. **Sect 作为大 blob**：读写时整体序列化/反序列化，无法独立操作单条记录
2. **localStorage 残留**：Save meta 还在 localStorage，需要额外的跨存储协调
3. **缺少独立数据表**：无法按 ID/索引查询单个实体
4. **手动定时存档**：依赖 `setInterval`，存在数据丢失风险

---

## 2. 新 IndexedDB Schema (DB_VERSION = 2)

```
meta        — keyPath: slot        (宗门元数据 + save meta)
characters  — keyPath: id          (弟子)
buildings   — keyPath: type        (建筑)
vault       — keyPath: id          (仓库物品)
pets        — keyPath: id          (宠物)
adventure   — keyPath: id          (已有，不变)
history     — autoIncrement        (已有，不变)
resources   — keyPath: key         (已有，不变)
```

### meta store 记录结构

```typescript
interface SaveMeta {
  slot: number           // 存档槽位，当前固定为 1
  version: 5             // 存档版本
  lastOnlineTime: number  // 上次在线时间
  // 宗门级数据（从 Sect 中提取的非实体数据）
  sectName: string
  sectLevel: number
  resources: Resources    // { spiritStone, spiritEnergy, herb, ore }
  techniqueCodex: string[]
  maxVaultSlots: number
  totalAdventureRuns: number
  totalBreakthroughs: number
  lastTransmissionTime: number
}
```

### 数据分布

| 原 Sect 字段 | 新归属 store |
|-------------|-------------|
| name, level, resources, techniqueCodex, maxVaultSlots, totalAdventureRuns, totalBreakthroughs, lastTransmissionTime | `meta` |
| characters[] | `characters` |
| buildings[] | `buildings` |
| vault[] | `vault` |
| pets[] | `pets` |

---

## 3. Write-Through 机制

### 架构

```
sectStore.setState()
       ↓
subscribe selector: s => s.sect
       ↓
debounce 500ms
       ↓
compare with last saved snapshot (JSON.stringify)
       ↓ (有变更)
IDB transaction: readwrite [characters, buildings, vault, pets, meta]
  ├─ characters: put each character
  ├─ buildings:  put each building
  ├─ vault:      put each item
  ├─ pets:       put each pet
  └─ meta:       put meta record
```

### 关键设计

1. **subscribe selector**：`s => s.sect` 监听整个 sect 对象
2. **Debounce 500ms**：避免每秒 tick 触发多次写入。tick 间隔通常 1s，500ms debounce 保证每次 tick 最多一次写入
3. **Snapshot 比较**：用 `JSON.stringify` 缓存上次存档快照，无变更时跳过写入（tick 中如果 cultivation 没变就跳过）
4. **单事务原子性**：所有实体在一个 transaction 中写入，保证数据一致性
5. **visibilitychange 作为主要保存触发**：监听 `visibilitychange` 事件（页面切到后台/最小化），比 `beforeunload` 更可靠（浏览器保证在页面冻结前触发）
6. **beforeunload 作为兜底**：也注册 `beforeunload` 处理器，但 acknowledge 它不能 `await` async IDB 写入——浏览器可能终止页面。这是 best-effort 保障
7. **beforeunload 与 debounce 互斥**：`beforeunload` 处理器先 `clearTimeout` 取消 pending debounce，再调用 `saveGame()`，避免并发写入

### startAutoSave / stopAutoSave API

```typescript
// 返回 unsubscribe 函数
export function startAutoSave(): () => void {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let lastSnapshot: string | null = null

  const unsub = useSectStore.subscribe(
    (s) => s.sect,
    (sect) => {
      const snapshot = JSON.stringify(sect)
      if (snapshot === lastSnapshot) return  // 无变更，跳过
      lastSnapshot = snapshot

      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        debounceTimer = null
        saveGame()
      }, 500)
    },
  )

  const saveNow = () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = null
    lastSnapshot = JSON.stringify(useSectStore.getState().sect)
    saveGame()  // best-effort, no await
  }

  document.addEventListener('visibilitychange', saveNow)
  window.addEventListener('beforeunload', saveNow)

  return () => {
    unsub()
    document.removeEventListener('visibilitychange', saveNow)
    window.removeEventListener('beforeunload', saveNow)
    if (debounceTimer) clearTimeout(debounceTimer)
  }
}
```

### 初始化

- 在 `App.tsx` 的启动流程中调用 `startAutoSave()` 激活 subscribe
- 返回的 cleanup 函数在组件卸载时调用
- 移除现有的 `useAutoSave.ts` 定时器机制（由 write-through 替代）

---

## 4. Save/Load 流程

### saveGame()（强制立即保存接口）

```typescript
export async function saveGame(): Promise<void> {
  // 无 debounce，立即写入
  // 用于 beforeunload、visibilitychange、手动存档等场景
  const sect = useSectStore.getState().sect
  const db = await getDB()
  const tx = db.transaction(['meta', 'characters', 'buildings', 'vault', 'pets'], 'readwrite')

  // 写 meta
  await tx.objectStore('meta').put({
    slot: 1,
    version: 5,
    lastOnlineTime: Date.now(),
    sectName: sect.name,
    sectLevel: sect.level,
    resources: sect.resources,
    techniqueCodex: sect.techniqueCodex,
    maxVaultSlots: sect.maxVaultSlots,
    totalAdventureRuns: sect.totalAdventureRuns,
    totalBreakthroughs: sect.totalBreakthroughs,
    lastTransmissionTime: sect.lastTransmissionTime,
  })

  // 写 entities
  for (const c of sect.characters) await tx.objectStore('characters').put(c)
  for (const b of sect.buildings) await tx.objectStore('buildings').put(b)
  for (const i of sect.vault) await tx.objectStore('vault').put(i)
  for (const p of sect.pets) await tx.objectStore('pets').put(p)

  // 清除已删除的实体（对比 snapshot）
  const charKeys = await tx.objectStore('characters').getAllKeys()
  for (const k of charKeys) {
    if (!sect.characters.some(c => c.id === k)) await tx.objectStore('characters').delete(k)
  }
  const vaultKeys = await tx.objectStore('vault').getAllKeys()
  for (const k of vaultKeys) {
    if (!sect.vault.some(i => i.id === k)) await tx.objectStore('vault').delete(k)
  }
  const petKeys = await tx.objectStore('pets').getAllKeys()
  for (const k of petKeys) {
    if (!sect.pets.some(p => p.id === k)) await tx.objectStore('pets').delete(k)
  }

  await tx.done
}
```

### loadGame()

```typescript
export async function loadGame(): Promise<boolean> {
  try {
    const db = await getDB()
    const meta = await db.get('meta', 1)
    if (!meta) return false

    // 1. 重建 sect
    const characters = await db.getAll('characters')
    const buildings = await db.getAll('buildings')
    const vault = await db.getAll('vault')
    const pets = await db.getAll('pets')

    // 2. 完整性检查：meta 存在但实体 stores 为空，视为存档损坏
    if (characters.length === 0 && buildings.length === 0) {
      // 所有实体为空但 meta 存在——可能是首次迁移失败或存档损坏
      // 返回 false，让用户重新开始
      return false
    }

    const sect: Sect = {
      name: meta.sectName,
      level: meta.sectLevel,
      resources: meta.resources,
      buildings: buildings,
      characters: characters,
      vault: vault,
      maxVaultSlots: meta.maxVaultSlots,
      pets: pets,
      totalAdventureRuns: meta.totalAdventureRuns,
      totalBreakthroughs: meta.totalBreakthroughs,
      lastTransmissionTime: meta.lastTransmissionTime,
      techniqueCodex: meta.techniqueCodex,
    }

    useSectStore.setState({ sect })

    // 3. 加载 adventure
    const advRecords = await db.getAll('adventure')
    if (advRecords.length > 0) {
      const activeRuns: Record<string, DungeonRun> = {}
      for (const rec of advRecords) {
        activeRuns[(rec as { id: string }).id] = (rec as { run: DungeonRun }).run
      }
      useAdventureStore.setState({ activeRuns })
    }

    // 4. 加载事件日志（新功能：从 history store 恢复）
    const historyRecords = await db.getAll('history')
    if (historyRecords.length > 0) {
      // 取最近 MAX_EVENTS 条，按 timestamp 降序
      const events = historyRecords
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 200)
      useEventLogStore.setState({ events })
    }

    // 5. 设置 gameStore
    useGameStore.setState({ lastOnlineTime: meta.lastOnlineTime })

    return true
  } catch (e) {
    console.error('Load failed:', e)
    return false
  }
}
```

### hasSaveData()

```typescript
// ⚠️ 现在是异步的——因为需要查询 IndexedDB
export async function hasSaveData(): Promise<boolean> {
  try {
    const db = await getDB()
    const meta = await db.get('meta', 1)
    return meta != null
  } catch {
    return false
  }
}
```

**所有调用者必须 `await hasSaveData()`**，包括：
- `App.tsx` 中的启动逻辑
- `SaveSystem.test.ts` 中的所有测试用例

### clearSaveData()

```typescript
export async function clearSaveData(): Promise<void> {
  try {
    const db = await getDB()
    const tx = db.transaction(
      ['meta', 'characters', 'buildings', 'vault', 'pets', 'adventure', 'history', 'resources'],
      'readwrite',
    )
    await tx.objectStore('meta').clear()
    await tx.objectStore('characters').clear()
    await tx.objectStore('buildings').clear()
    await tx.objectStore('vault').clear()
    await tx.objectStore('pets').clear()
    await tx.objectStore('adventure').clear()
    await tx.objectStore('history').clear()
    await tx.objectStore('resources').clear()
    await tx.done
  } catch (e) {
    console.error('Clear failed:', e)
  }
  // 不再需要操作 localStorage
}
```

---

## 5. Migration (v4 blob → v5 per-entity)

在 `db.ts` 的 `upgrade()` 回调中处理。IDB `upgrade()` 在一个事务中执行，浏览器保证原子性——如果事务中止，所有变更回滚。

```typescript
upgrade(db, oldVersion, newVersion, transaction) {
  // 创建所有新 object stores（如果不存在）

  if (oldVersion < 2) {
    // 在 upgrade transaction 内完成拆分
    const saveStore = transaction.objectStore('save')
    const allSaves = saveStore.getAll()  // 在事务内读取

    allSaves.then(async (records) => {
      const saveRecord = records.find(r => r.slot === 1)
      if (!saveRecord?.sect) return

      const sect = saveRecord.sect
      const db2 = db   // upgrade 事务内可以直接操作新 stores

      // 写入 meta
      await db2.put('meta', {
        slot: 1,
        version: 5,
        lastOnlineTime: Date.now(),
        sectName: sect.name,
        sectLevel: sect.level,
        resources: sect.resources,
        techniqueCodex: sect.techniqueCodex ?? ['qingxin', 'lieyan', 'houtu'],
        maxVaultSlots: sect.maxVaultSlots,
        totalAdventureRuns: sect.totalAdventureRuns ?? 0,
        totalBreakthroughs: sect.totalBreakthroughs ?? 0,
        lastTransmissionTime: sect.lastTransmissionTime ?? 0,
      })

      // 拆分实体
      for (const c of (sect.characters ?? [])) await db2.put('characters', c)
      for (const b of (sect.buildings ?? [])) await db2.put('buildings', b)
      for (const i of (sect.vault ?? [])) await db2.put('vault', i)
      for (const p of (sect.pets ?? [])) await db2.put('pets', p)

      // 删除旧 save store
      db2.deleteObjectStore('save')
    })

    // localStorage 清理：不在 upgrade 事务内
    // 在 loadGame() 成功后延迟清理（failure-tolerant）
  }
}
```

### localStorage 清理策略（容错）

`localStorage.removeItem(META_KEY)` 不在 upgrade 事务内执行，避免事务回滚后 localStorage 已被清理的不一致状态。

**清理时机**：在 `loadGame()` 成功加载 v5 数据后，检查并清理残留的 localStorage：

```typescript
// loadGame() 末尾，成功后：
if (localStorage.getItem(META_KEY)) {
  localStorage.removeItem(META_KEY)
}
if (localStorage.getItem(OLD_SAVE_KEY)) {
  localStorage.removeItem(OLD_SAVE_KEY)
}
```

**回退场景**：如果升级成功但 localStorage 未清理，下次加载时 `loadGame()` 会发现 IDB `meta` store 有数据（v5），直接加载成功并清理 localStorage。不会出现不可恢复的状态。

---

## 6. 受影响文件

### 修改
- `src/systems/save/db.ts` — DB_VERSION 2, 新 object stores, migration
- `src/systems/save/SaveSystem.ts` — 重写 save/load/clear, 移除 localStorage, hasSaveData 改为 async
- `src/stores/sectStore.ts` — 如果有手动 saveGame 调用则移除
- `src/App.tsx` — 用 startAutoSave() 替换现有 useAutoSave，await hasSaveData()
- `src/__tests__/SaveSystem.test.ts` — 所有 hasSaveData() 调用加 await，更新存档/迁移测试

### 删除
- `src/hooks/useAutoSave.ts` — 被 startAutoSave 替代（如果存在）
- localStorage 的所有引用（META_KEY, OLD_SAVE_KEY）

---

## 7. 不做的事

- **不加索引**：当前数据量（5-30 弟子、50 物品）不需要索引加速
- **不改 Zustand store 结构**：`Sect` 类型保持不变，仍然作为内存中的聚合对象
- **不改 adventure/history/resources stores**：它们已经是独立存储
- **不做 delta save**：每次写入整个实体（characters store 写所有弟子），不做字段级别的 diff。实现简单，性能足够
- **不持久化 shopState**：每日商店状态目前是运行时生成的，刷新后会重新生成（这是已有行为，不在本次改动范围）
- **不持久化 completedDungeons / patrol 状态**：这些是 adventureStore 的运行时状态（已有行为，不在本次范围）
- **不处理 history store 的 write-through**：事件日志的写入由 eventLogStore 独立管理（已有 history store 持久化逻辑），不纳入 sectStore 的 write-through
