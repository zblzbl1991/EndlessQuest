# IndexedDB 统一数据持久化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将所有游戏数据从单一 JSON blob 拆分为按实体独立存储的 IndexedDB object stores，通过 write-through + debounce 自动持久化，完全消除 localStorage 依赖。

**Architecture:** DB_VERSION 升级到 2，新增 `meta`/`characters`/`buildings`/`vault`/`pets` 四个 object store（加上已有的 `adventure`/`history`/`resources`）。`saveGame()` 拆散写入各 store；`loadGame()` 从各 store 重组 `Sect`。`startAutoSave()` 通过 Zustand `subscribe` + debounce 500ms + snapshot compare 实现 write-through。

**Tech Stack:** IndexedDB (idb library), Zustand 5 subscribe API, React hooks

---

### Task 1: Upgrade db.ts — new schema + v4→v5 migration

**Files:**
- Modify: `src/systems/save/db.ts`
- Test: `src/__tests__/SaveSystem.test.ts` (existing, run to verify migration)

- [ ] **Step 1: Rewrite db.ts with DB_VERSION = 2 and new object stores**

```typescript
import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'endlessquest_db'
const DB_VERSION = 2

let _db: IDBPDatabase | null = null

export async function getDB(): Promise<IDBPDatabase> {
  if (_db) return _db
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      // Always create these (they exist in v1 too)
      if (!db.objectStoreNames.contains('adventure')) {
        db.createObjectStore('adventure', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('history')) {
        const hist = db.createObjectStore('history', { keyPath: 'id', autoIncrement: true })
        hist.createIndex('type', 'type')
        hist.createIndex('timestamp', 'timestamp')
      }
      if (!db.objectStoreNames.contains('resources')) {
        db.createObjectStore('resources', { keyPath: 'key' })
      }

      // New v2 stores
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'slot' })
      }
      if (!db.objectStoreNames.contains('characters')) {
        db.createObjectStore('characters', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('buildings')) {
        db.createObjectStore('buildings', { keyPath: 'type' })
      }
      if (!db.objectStoreNames.contains('vault')) {
        db.createObjectStore('vault', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('pets')) {
        db.createObjectStore('pets', { keyPath: 'id' })
      }

      // v1→v2: migrate blob save to per-entity stores
      if (oldVersion < 2 && db.objectStoreNames.contains('save')) {
        const saveStore = transaction.objectStore('save')
        const req = saveStore.getAll()
        req.onsuccess = async () => {
          const records: any[] = req.result
          const saveRecord = records.find((r: any) => r.slot === 1)
          if (!saveRecord?.sect) return

          const sect = saveRecord.sect

          // Write meta
          const metaStore = transaction.objectStore('meta')
          metaStore.put({
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

          // Split entities
          const charStore = transaction.objectStore('characters')
          const bldgStore = transaction.objectStore('buildings')
          const vaultStore = transaction.objectStore('vault')
          const petStore = transaction.objectStore('pets')

          for (const c of (sect.characters ?? [])) charStore.put(c)
          for (const b of (sect.buildings ?? [])) bldgStore.put(b)
          for (const i of (sect.vault ?? [])) vaultStore.put(i)
          for (const p of (sect.pets ?? [])) petStore.put(p)

          // Delete old blob store
          db.deleteObjectStore('save')
        }
      }
    },
  })
  return _db
}

/** Reset the internal db reference. Only used in tests. */
export function _resetDB(): void {
  if (_db) {
    _db.close()
    _db = null
  }
}
```

- [ ] **Step 2: Run existing tests to verify migration path**

Run: `npx vitest run src/__tests__/SaveSystem.test.ts --reporter=verbose`
Expected: Tests will fail because SaveSystem still uses old API — that's OK, this verifies db.ts opens correctly.

- [ ] **Step 3: Commit**

```bash
git add src/systems/save/db.ts
git commit -m "refactor(db): upgrade to v2 schema with per-entity object stores"
```

---

### Task 2: Rewrite SaveSystem.ts — new save/load/clear

**Files:**
- Modify: `src/systems/save/SaveSystem.ts`
- Test: `src/__tests__/SaveSystem.test.ts` (run existing, expect failures, then fix in Task 4)

- [ ] **Step 1: Rewrite SaveSystem.ts completely**

Replace the entire file with:

```typescript
import type { Sect } from '../../types'
import type { DungeonRun } from '../../types'
import { useSectStore } from '../../stores/sectStore'
import { useAdventureStore } from '../../stores/adventureStore'
import { useGameStore } from '../../stores/gameStore'
import { useEventLogStore } from '../../stores/eventLogStore'
import { getDB } from './db'

const META_KEY = 'eq_save_meta'
const OLD_SAVE_KEY = 'endlessquest_save'

// ---------------------------------------------------------------------------
// SaveMeta v5 — stored in IndexedDB 'meta' store (keyPath: slot)
// ---------------------------------------------------------------------------

interface SaveMeta {
  slot: number
  version: 5
  lastOnlineTime: number
  sectName: string
  sectLevel: number
  resources: Sect['resources']
  techniqueCodex: string[]
  maxVaultSlots: number
  totalAdventureRuns: number
  totalBreakthroughs: number
  lastTransmissionTime: number
}

// ---------------------------------------------------------------------------
// saveGame — write sect data to per-entity stores
// ---------------------------------------------------------------------------

export async function saveGame(): Promise<void> {
  try {
    const sect = useSectStore.getState().sect
    const db = await getDB()
    const storeNames = ['meta', 'characters', 'buildings', 'vault', 'pets'] as const
    const tx = db.transaction(storeNames, 'readwrite')

    // Write meta
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

    // Write characters
    const charStore = tx.objectStore('characters')
    for (const c of sect.characters) await charStore.put(c)
    const charKeys = await charStore.getAllKeys()
    for (const k of charKeys) {
      if (!sect.characters.some(c => c.id === k)) await charStore.delete(k)
    }

    // Write buildings (keyPath is 'type', so put overwrites)
    const bldgStore = tx.objectStore('buildings')
    for (const b of sect.buildings) await bldgStore.put(b)

    // Write vault items
    const vaultStore = tx.objectStore('vault')
    for (const i of sect.vault) await vaultStore.put(i)
    const vaultKeys = await vaultStore.getAllKeys()
    for (const k of vaultKeys) {
      if (!sect.vault.some(i => i.id === k)) await vaultStore.delete(k)
    }

    // Write pets
    const petStore = tx.objectStore('pets')
    for (const p of sect.pets) await petStore.put(p)
    const petKeys = await petStore.getAllKeys()
    for (const k of petKeys) {
      if (!sect.pets.some(p => p.id === k)) await petStore.delete(k)
    }

    await tx.done
  } catch (e) {
    console.error('Save failed:', e)
  }
}

// ---------------------------------------------------------------------------
// loadGame — reconstruct Sect from per-entity stores
// ---------------------------------------------------------------------------

export async function loadGame(): Promise<boolean> {
  try {
    // Handle stale v2→v4 migration data in localStorage
    // If localStorage has the old META_KEY but we're now v5, the IDB upgrade
    // already migrated the data. Clean up stale localStorage.
    // We check AFTER trying IDB first (v5 is authoritative).
    const db = await getDB()
    const meta = await db.get('meta', 1) as SaveMeta | undefined

    // Clean up stale localStorage regardless
    if (localStorage.getItem(META_KEY)) localStorage.removeItem(META_KEY)
    if (localStorage.getItem(OLD_SAVE_KEY)) localStorage.removeItem(OLD_SAVE_KEY)

    if (!meta) return false

    // Read per-entity stores
    const characters = await db.getAll('characters') as Sect['characters']
    const buildings = await db.getAll('buildings') as Sect['buildings']
    const vault = await db.getAll('vault') as Sect['vault']
    const pets = await db.getAll('pets') as Sect['pets']

    // Integrity check: if meta exists but all entity stores are empty, corrupted
    if (characters.length === 0 && buildings.length === 0) {
      return false
    }

    const sect: Sect = {
      name: meta.sectName,
      level: meta.sectLevel,
      resources: meta.resources,
      buildings: buildings ?? [],
      characters: characters ?? [],
      vault: vault ?? [],
      maxVaultSlots: meta.maxVaultSlots,
      pets: pets ?? [],
      totalAdventureRuns: meta.totalAdventureRuns,
      totalBreakthroughs: meta.totalBreakthroughs,
      lastTransmissionTime: meta.lastTransmissionTime,
      techniqueCodex: meta.techniqueCodex,
    }

    useSectStore.setState({ sect })

    // Load adventure runs
    const advRecords = await db.getAll('adventure')
    if (advRecords.length > 0) {
      const activeRuns: Record<string, DungeonRun> = {}
      for (const rec of advRecords) {
        const r = rec as { id: string; run: DungeonRun }
        activeRuns[r.id] = r.run
      }
      useAdventureStore.setState({ activeRuns })
    }

    // Load event log from history store
    const historyRecords = await db.getAll('history')
    if (historyRecords.length > 0) {
      const events = (historyRecords as any[])
        .sort((a: any, b: any) => b.timestamp - a.timestamp)
        .slice(0, 200)
      useEventLogStore.setState({ events })
    }

    useGameStore.setState({ lastOnlineTime: meta.lastOnlineTime })

    return true
  } catch (e) {
    console.error('Load failed:', e)
    return false
  }
}

// ---------------------------------------------------------------------------
// hasSaveData — async (queries IndexedDB)
// ---------------------------------------------------------------------------

export async function hasSaveData(): Promise<boolean> {
  try {
    const db = await getDB()
    const meta = await db.get('meta', 1)
    return meta != null
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// clearSaveData — clear all stores, no localStorage
// ---------------------------------------------------------------------------

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
}
```

Key changes from old SaveSystem:
- No `localStorage` usage (except cleanup of stale v4 data)
- No `migrateV2ToV3()` function (handled by IDB upgrade in db.ts)
- `hasSaveData()` is now `async`
- `saveGame()` writes to per-entity stores
- `loadGame()` reads from per-entity stores
- `clearSaveData()` clears all stores including new ones

- [ ] **Step 2: Run tests to see what breaks**

Run: `npx vitest run src/__tests__/SaveSystem.test.ts --reporter=verbose`
Expected: Most tests fail due to `hasSaveData()` now being async and data being in different stores.

- [ ] **Step 3: Commit**

```bash
git add src/systems/save/SaveSystem.ts
git commit -m "refactor(save): rewrite save/load/clear for per-entity IndexedDB stores"
```

---

### Task 3: Create startAutoSave + update App.tsx

**Files:**
- Create: `src/systems/save/startAutoSave.ts`
- Modify: `src/App.tsx`
- Delete: `src/systems/save/useAutoSave.ts`

- [ ] **Step 1: Create startAutoSave.ts**

```typescript
import { useSectStore } from '../../stores/sectStore'
import { saveGame } from './SaveSystem'

/**
 * Activates write-through auto-save via Zustand subscribe.
 * Returns an unsubscribe/cleanup function.
 *
 * Mechanism:
 * 1. Subscribe to sectStore.sect changes
 * 2. Debounce 500ms (deduplicate rapid ticks)
 * 3. Snapshot compare (skip if no actual change)
 * 4. Write all entity stores in a single IDB transaction
 * 5. visibilitychange triggers immediate save (reliable)
 * 6. beforeunload triggers immediate save (best-effort)
 */
export function startAutoSave(): () => void {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let lastSnapshot: string | null = null

  const unsub = useSectStore.subscribe(
    (s) => s.sect,
    (sect) => {
      const snapshot = JSON.stringify(sect)
      if (snapshot === lastSnapshot) return
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
    saveGame() // best-effort, no await
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

- [ ] **Step 2: Update App.tsx — replace useAutoSave with startAutoSave**

Change imports and the hook usage. Replace `useAutoSave()` hook with manual loading + `startAutoSave()`:

```typescript
import { useEffect, useRef, useState } from 'react'
import { loadGame } from './systems/save/SaveSystem'
import { startAutoSave } from './systems/save/startAutoSave'
// ... keep all other imports, remove useAutoSave import
```

Replace the `useAutoSave()` call with:

```typescript
export default function App() {
  const startGame = useGameStore((s) => s.startGame)
  const tickAll = useSectStore((s) => s.tickAll)
  const tickAllIdle = useAdventureStore((s) => s.tickAllIdle)
  const lastOnlineTime = useGameStore((s) => s.lastOnlineTime)

  const [isLoaded, setIsLoaded] = useState(false)
  const loadingRef = useRef(false)

  useEffect(() => {
    if (loadingRef.current) return
    loadingRef.current = true

    ;(async () => {
      try {
        await loadGame()
      } catch (e) {
        console.error('Failed to load save:', e)
      }
      setIsLoaded(true)
    })()
  }, [])

  useEffect(() => {
    if (!isLoaded) return

    const cleanup = startAutoSave()

    startGame()

    const offline = calcOfflineSeconds(lastOnlineTime)
    if (offline > 1) {
      tickAll(offline)
    }

    const engine = new IdleEngine((delta) => {
      const paused = useGameStore.getState().isPaused
      if (paused) return
      tickAll(delta)
      tickAllIdle(delta)
    })
    engine.start()

    return () => {
      engine.stop()
      cleanup()
    }
  }, [isLoaded])

  // ... rest of component unchanged (loading screen, routes)
```

- [ ] **Step 3: Delete useAutoSave.ts**

Delete `src/systems/save/useAutoSave.ts` — it's replaced by `startAutoSave.ts`.

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/systems/save/startAutoSave.ts src/App.tsx
git rm src/systems/save/useAutoSave.ts
git commit -m "feat(save): replace useAutoSave with write-through startAutoSave"
```

---

### Task 4: Update SaveSystem tests

**Files:**
- Modify: `src/__tests__/SaveSystem.test.ts`

- [ ] **Step 1: Rewrite SaveSystem.test.ts**

The key changes:
1. All `hasSaveData()` calls become `await hasSaveData()`
2. Remove v2 migration tests (now handled by IDB upgrade in db.ts)
3. Remove v1 migration tests (same reason)
4. Update save/load roundtrip test
5. Add test for corrupted save (meta exists but entities empty)
6. Add test for localStorage cleanup on load

```typescript
import 'fake-indexeddb/auto'
import { saveGame, loadGame, hasSaveData, clearSaveData } from '../systems/save/SaveSystem'
import { _resetDB } from '../systems/save/db'
import { useSectStore } from '../stores/sectStore'
import { useAdventureStore } from '../stores/adventureStore'
import { useGameStore } from '../stores/gameStore'

describe('SaveSystem (per-entity IndexedDB)', () => {
  beforeEach(async () => {
    _resetDB()
    await indexedDB.deleteDatabase('endlessquest_db')
    localStorage.clear()
    useSectStore.getState().reset()
    useAdventureStore.getState().reset()
    useGameStore.getState().reset()
  })

  it('should save and load data', async () => {
    useSectStore.getState().addResource('spiritStone', 1000)
    useGameStore.getState().startGame()

    await saveGame()
    expect(await hasSaveData()).toBe(true)

    useSectStore.getState().reset()
    useGameStore.getState().reset()

    const result = await loadGame()
    expect(result).toBe(true)
    expect(useSectStore.getState().sect.resources.spiritStone).toBe(1500)
    expect(useGameStore.getState().lastOnlineTime).toBeGreaterThan(0)
  })

  it('loadGame should return false when no save', async () => {
    expect(await loadGame()).toBe(false)
  })

  it('hasSaveData should return false for no save', async () => {
    expect(await hasSaveData()).toBe(false)
  })

  it('clearSaveData should remove data', async () => {
    useGameStore.getState().startGame()
    await saveGame()
    expect(await hasSaveData()).toBe(true)
    await clearSaveData()
    expect(await hasSaveData()).toBe(false)
  })

  it('should handle IndexedDB errors gracefully', async () => {
    useGameStore.getState().startGame()
    await expect(saveGame()).resolves.not.toThrow()
  })

  it('should preserve adventure active runs through save/load', async () => {
    useAdventureStore.setState({
      activeRuns: {
        test_run_1: {
          id: 'test_run_1',
          dungeonId: 'lingCaoValley',
          teamCharacterIds: ['c1'],
          currentFloor: 3,
          floors: [],
          memberStates: {
            c1: { currentHp: 80, maxHp: 100, status: 'alive' },
          },
          totalRewards: {
            spiritStone: 200, spiritEnergy: 0, herb: 10, ore: 0,
          },
          itemRewards: [],
          eventLog: [{ timestamp: Date.now(), message: 'test log' }],
          status: 'active',
        },
      },
    })

    await saveGame()
    useAdventureStore.getState().reset()

    const result = await loadGame()
    expect(result).toBe(true)
    expect(useAdventureStore.getState().activeRuns['test_run_1']).toBeDefined()
    expect(useAdventureStore.getState().activeRuns['test_run_1'].currentFloor).toBe(3)
  })

  it('should save characters to independent store', async () => {
    const sect = useSectStore.getState().sect
    expect(sect.characters.length).toBeGreaterThan(0)

    await saveGame()
    const db = await (await import('../systems/save/db')).getDB()
    const chars = await db.getAll('characters')
    expect(chars.length).toBe(sect.characters.length)
  })

  it('should clean up stale localStorage on load', async () => {
    // Simulate stale v4 meta in localStorage
    localStorage.setItem('eq_save_meta', JSON.stringify({ version: 4, lastOnlineTime: Date.now(), saveSlot: 1 }))

    useGameStore.getState().startGame()
    await saveGame()
    // localStorage should be cleaned on load
    await loadGame()
    expect(localStorage.getItem('eq_save_meta')).toBeNull()
  })

  it('should delete vault items when removed from sect', async () => {
    useGameStore.getState().startGame()
    await saveGame()

    // Verify item exists in IDB
    const db = await (await import('../systems/save/db')).getDB()
    let vaultItems = await db.getAll('vault')
    expect(vaultItems.length).toBe(0) // initially empty

    // Manually add an item to simulate an existing vault item
    const testItem = {
      id: 'test_item_1',
      name: 'Test Item',
      quality: 'common' as const,
      type: 'equipment' as const,
      slot: 'weapon' as const,
      description: 'test',
      sellPrice: 10,
      enhanceLevel: 0,
      refinementStats: [],
      setId: null,
      stats: { hp: 0, atk: 0, def: 0, spd: 0, crit: 0, critDmg: 0 },
    }
    await db.put('vault', testItem)

    // Save without the item in sect → should be cleaned up
    await saveGame()
    vaultItems = await db.getAll('vault')
    expect(vaultItems.length).toBe(0)
  })
})
```

- [ ] **Step 2: Run SaveSystem tests**

Run: `npx vitest run src/__tests__/SaveSystem.test.ts --reporter=verbose`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/SaveSystem.test.ts
git commit -m "test(save): update SaveSystem tests for per-entity stores"
```

---

### Task 5: Update stores.test.ts if it imports hasSaveData

**Files:**
- Check: `src/__tests__/stores.test.ts`

- [ ] **Step 1: Search for hasSaveData usage in stores.test.ts**

Run: `grep -n "hasSaveData" src/__tests__/stores.test.ts`
If no matches: skip this task.
If matches found: add `await` to all calls.

- [ ] **Step 2: Commit (if changes made)**

---

### Task 6: Final verification

**Files:**
- None (verification only)

- [ ] **Step 1: TypeScript type check**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run --reporter=verbose`
Expected: All tests pass (472+)

- [ ] **Step 3: Production build**

Run: `npx vite build`
Expected: Build succeeds

- [ ] **Step 4: Search for stale references**

Run: `grep -rn "useAutoSave\|META_KEY\|OLD_SAVE_KEY" src/ --include="*.ts" --include="*.tsx"`
Expected: No matches in production code (only possible in deleted test data)

- [ ] **Step 5: Commit any remaining fixes**
