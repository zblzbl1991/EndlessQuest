# Storage Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate game storage from localStorage to IndexedDB using the `idb` library, with localStorage only for lightweight metadata.

**Architecture:** A new `db.ts` module initializes IndexedDB with 4 object stores (save, adventure, history, resources). `SaveSystem.ts` is rewritten to use IndexedDB with async APIs while keeping the same public functions (now returning Promises). `useAutoSave.ts` exports `isLoaded` for App.tsx to gate rendering. v2 saves auto-migrate to IndexedDB on first load.

**Tech Stack:** TypeScript, idb (~600B), fake-indexeddb (test mock), vitest, jsdom

---

### Task 1: Install dependencies and configure test environment

**Files:**
- Modify: `package.json` (add idb + fake-indexeddb)
- Modify: `src/__tests__/setup.ts` (register fake-indexeddb)

- [ ] **Step 1: Install dependencies**

Run: `npm install idb && npm install -D fake-indexeddb`

- [ ] **Step 2: Register fake-indexeddb in test setup**

In `src/__tests__/setup.ts`, add the import before `@testing-library/jest-dom`:

```typescript
import 'fake-indexeddb/auto'
import '@testing-library/jest-dom'
```

- [ ] **Step 3: Verify existing tests still pass with fake-indexeddb**

Run: `npm test`
Expected: All existing tests pass (fake-indexeddb is now globally available but no code uses it yet)

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/__tests__/setup.ts
git commit -m "chore: add idb and fake-indexeddb dependencies, configure test setup"
```

---

### Task 2: Create db.ts — IndexedDB initialization

**Files:**
- Create: `src/systems/save/db.ts`
- Test: `src/__tests__/db.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/db.test.ts`:

```typescript
import 'fake-indexeddb/auto'
import { getDB } from '../systems/save/db'

describe('db', () => {
  beforeEach(async () => {
    _resetDB()
    // Also delete the underlying database to prevent data leaking between tests
    await indexedDB.deleteDatabase('endlessquest_db')
  })

  it('should open the database and return a valid IDB instance', async () => {
    const db = await getDB()
    expect(db).toBeDefined()
    expect(db.name).toBe('endlessquest_db')
    expect(db.version).toBe(1)
  })

  it('should create all required object stores', async () => {
    const db = await getDB()
    const storeNames = Array.from(db.objectStoreNames)
    expect(storeNames).toContain('save')
    expect(storeNames).toContain('adventure')
    expect(storeNames).toContain('history')
    expect(storeNames).toContain('resources')
  })

  it('should return the same instance on subsequent calls', async () => {
    const db1 = await getDB()
    const db2 = await getDB()
    expect(db1).toBe(db2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/db.test.ts`
Expected: FAIL — module `../systems/save/db` not found

- [ ] **Step 3: Create db.ts**

Create `src/systems/save/db.ts`:

```typescript
import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'endlessquest_db'
const DB_VERSION = 1

let _db: IDBPDatabase | null = null

export async function getDB(): Promise<IDBPDatabase> {
  if (_db) return _db
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('save')) {
        db.createObjectStore('save', { keyPath: 'slot' })
      }
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
    },
  })
  return _db
}

/** Reset the internal db reference and delete the database. Only used in tests. */
export function _resetDB(): void {
  if (_db) {
    _db.close()
    _db = null
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/db.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/systems/save/db.ts src/__tests__/db.test.ts
git commit -m "feat: add IndexedDB initialization module (db.ts)"
```

---

### Task 3: Rewrite SaveSystem.ts for IndexedDB

**Files:**
- Modify: `src/systems/save/SaveSystem.ts`
- Modify: `src/__tests__/SaveSystem.test.ts`

- [ ] **Step 1: Rewrite tests for async API**

Replace entire `src/__tests__/SaveSystem.test.ts` with:

```typescript
import 'fake-indexeddb/auto'
import { saveGame, loadGame, hasSaveData, clearSaveData } from '../systems/save/SaveSystem'
import { _resetDB } from '../systems/save/db'
import { useSectStore } from '../stores/sectStore'
import { useAdventureStore } from '../stores/adventureStore'
import { useGameStore } from '../stores/gameStore'

describe('SaveSystem (IndexedDB)', () => {
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
    expect(hasSaveData()).toBe(true)

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

  it('hasSaveData should return false for no save', () => {
    expect(hasSaveData()).toBe(false)
  })

  it('clearSaveData should remove data', async () => {
    useGameStore.getState().startGame()
    await saveGame()
    expect(hasSaveData()).toBe(true)
    await clearSaveData()
    expect(hasSaveData()).toBe(false)
  })

  it('should handle IndexedDB errors gracefully', async () => {
    useGameStore.getState().startGame()
    // saveGame wraps errors in try/catch, so it should not throw
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

  it('should migrate v2 saves to IndexedDB', async () => {
    const oldChar = {
      id: 'c1', name: '测试', title: 'disciple' as const, quality: 'common' as const,
      realm: 0, realmStage: 0, cultivation: 0,
      baseStats: { hp: 100, atk: 15, def: 8, spd: 10, crit: 0.05, critDmg: 1.5 },
      cultivationStats: { spiritPower: 0, maxSpiritPower: 100, comprehension: 10, spiritualRoot: 10, fortune: 5 },
      currentTechnique: null, techniqueComprehension: 0, learnedTechniques: [],
      equippedGear: [], equippedSkills: [], backpack: [], maxBackpackSlots: 20, petIds: [],
      status: 'cultivating' as const, injuryTimer: 0, createdAt: Date.now(), totalCultivation: 0,
    }

    const saveData = {
      version: 2,
      timestamp: Date.now(),
      sectStore: {
        sect: {
          name: '测试宗门', level: 1,
          resources: { spiritStone: 500, spiritEnergy: 0, herb: 0, ore: 0 },
          buildings: [], characters: [oldChar], vault: [], maxVaultSlots: 50, pets: [], totalAdventureRuns: 0, totalBreakthroughs: 0, lastTransmissionTime: 0,
        },
      },
      adventureStore: { activeRuns: {} },
      gameStore: { saveSlot: 1, lastOnlineTime: Date.now() },
    }

    localStorage.setItem('endlessquest_save', JSON.stringify(saveData))
    const loaded = await loadGame()
    expect(loaded).toBe(true)

    const char = useSectStore.getState().sect.characters[0]
    expect(char.talents).toEqual([])

    // Old localStorage key should be cleaned up
    expect(localStorage.getItem('endlessquest_save')).toBeNull()
    // New metadata should exist
    expect(hasSaveData()).toBe(true)

    await clearSaveData()
  })

  it('should clear v1 saves', async () => {
    localStorage.setItem('endlessquest_save', JSON.stringify({
      version: 1,
      timestamp: Date.now(),
      player: { name: 'old' },
    }))
    expect(hasSaveData()).toBe(false)
    expect(await loadGame()).toBe(false)
    expect(localStorage.getItem('endlessquest_save')).toBeNull()
  })

  it('should handle v1 save migration path (clean up, return false)', async () => {
    // v1 save with no eq_save_meta should trigger migration attempt,
    // which detects version < 2, cleans up old key, and returns false
    localStorage.setItem('endlessquest_save', JSON.stringify({
      version: 1,
      timestamp: Date.now(),
      player: { name: 'old' },
    }))
    const loaded = await loadGame()
    expect(loaded).toBe(false)
    expect(localStorage.getItem('endlessquest_save')).toBeNull()
    expect(hasSaveData()).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/SaveSystem.test.ts`
Expected: FAIL — tests call async functions but current SaveSystem is sync

- [ ] **Step 3: Rewrite SaveSystem.ts**

Replace entire `src/systems/save/SaveSystem.ts` with:

```typescript
import type { Sect } from '../../types'
import type { DungeonRun } from '../../types'
import { useSectStore } from '../../stores/sectStore'
import { useAdventureStore } from '../../stores/adventureStore'
import { useGameStore } from '../../stores/gameStore'
import { getDB } from './db'

// ---------------------------------------------------------------------------
// localStorage keys (lightweight metadata only)
// ---------------------------------------------------------------------------

const META_KEY = 'eq_save_meta'
const OLD_SAVE_KEY = 'endlessquest_save'

interface SaveMeta {
  version: 3
  lastOnlineTime: number
  saveSlot: number
}

// ---------------------------------------------------------------------------
// Public API (async)
// ---------------------------------------------------------------------------

export async function saveGame(): Promise<void> {
  try {
    const db = await getDB()
    const tx = db.transaction(['save', 'adventure'], 'readwrite')

    // 1. Write sect to save store
    const sect = useSectStore.getState().sect
    await tx.objectStore('save').put({
      slot: 1,
      timestamp: Date.now(),
      version: 3,
      sect,
    })

    // 2. Write active runs to adventure store
    const activeRuns = useAdventureStore.getState().activeRuns
    const advStore = tx.objectStore('adventure')
    for (const run of Object.values(activeRuns)) {
      await advStore.put({ id: run.id, run })
    }
    // Remove runs that are no longer active (completed/failed/retreated)
    const allKeys = await advStore.getAllKeys()
    for (const key of allKeys) {
      if (!(key as string in activeRuns)) {
        await advStore.delete(key)
      }
    }

    await tx.done

    // 3. Update localStorage metadata (sync, lightweight)
    const meta: SaveMeta = {
      version: 3,
      lastOnlineTime: Date.now(),
      saveSlot: useGameStore.getState().saveSlot,
    }
    localStorage.setItem(META_KEY, JSON.stringify(meta))
  } catch (e) {
    console.error('Save failed:', e)
  }
}

export async function loadGame(): Promise<boolean> {
  try {
    // Check for v2 migration
    if (localStorage.getItem(OLD_SAVE_KEY) && !localStorage.getItem(META_KEY)) {
      await migrateV2ToV3()
    }

    // Read metadata
    const metaRaw = localStorage.getItem(META_KEY)
    if (!metaRaw) return false

    const meta: SaveMeta = JSON.parse(metaRaw)
    if (meta.version < 3) {
      await clearSaveData()
      return false
    }

    const db = await getDB()

    // Load sect
    const saveRecord = await db.get('save', 1)
    if (saveRecord?.sect) {
      const migratedCharacters = (saveRecord.sect.characters ?? []).map(
        (char: Record<string, unknown>) => ({
          ...char,
          talents: char.talents ?? [],
        }),
      )
      useSectStore.setState({
        sect: { ...saveRecord.sect, characters: migratedCharacters },
      })
    }

    // Load adventure runs
    const advRecords = await db.getAll('adventure')
    if (advRecords.length > 0) {
      const activeRuns: Record<string, DungeonRun> = {}
      for (const rec of advRecords) {
        activeRuns[(rec as { id: string; run: DungeonRun }).id] = (rec as { id: string; run: DungeonRun }).run
      }
      useAdventureStore.setState({ activeRuns })
    }

    // Restore game meta
    useGameStore.setState({
      lastOnlineTime: meta.lastOnlineTime,
    })

    return true
  } catch (e) {
    console.error('Load failed:', e)
    return false
  }
}

export function hasSaveData(): boolean {
  try {
    const metaRaw = localStorage.getItem(META_KEY)
    if (!metaRaw) return false
    const meta = JSON.parse(metaRaw)
    return meta.version === 3
  } catch {
    return false
  }
}

export async function clearSaveData(): Promise<void> {
  try {
    const db = await getDB()
    const tx = db.transaction(['save', 'adventure', 'history', 'resources'], 'readwrite')
    await tx.objectStore('save').clear()
    await tx.objectStore('adventure').clear()
    await tx.objectStore('history').clear()
    await tx.objectStore('resources').clear()
    await tx.done
  } catch (e) {
    console.error('Clear failed:', e)
  }
  localStorage.removeItem(META_KEY)
  localStorage.removeItem(OLD_SAVE_KEY)
}

// ---------------------------------------------------------------------------
// v2 → v3 migration
// ---------------------------------------------------------------------------

async function migrateV2ToV3(): Promise<void> {
  const raw = localStorage.getItem(OLD_SAVE_KEY)
  if (!raw) return

  let data: Record<string, unknown>
  try {
    data = JSON.parse(raw)
  } catch {
    localStorage.removeItem(OLD_SAVE_KEY)
    return
  }

  if (!data.version || (data.version as number) < 2) {
    localStorage.removeItem(OLD_SAVE_KEY)
    return
  }

  const db = await getDB()
  const tx = db.transaction(['save', 'adventure'], 'readwrite')

  // Migrate sect
  const sectData = data.sectStore as { sect?: Sect } | undefined
  if (sectData?.sect) {
    const migratedCharacters = (sectData.sect.characters ?? []).map(
      (char: Record<string, unknown>) => ({
        ...char,
        talents: char.talents ?? [],
      }),
    )
    await tx.objectStore('save').put({
      slot: 1,
      timestamp: (data.timestamp as number) || Date.now(),
      version: 3,
      sect: { ...sectData.sect, characters: migratedCharacters },
    })
  }

  // Migrate adventure runs
  const advData = data.adventureStore as { activeRuns?: Record<string, DungeonRun> } | undefined
  if (advData?.activeRuns) {
    const advStore = tx.objectStore('adventure')
    for (const run of Object.values(advData.activeRuns)) {
      await advStore.put({ id: run.id, run })
    }
  }

  await tx.done

  // Create v3 metadata
  const gameData = data.gameStore as { saveSlot?: number; lastOnlineTime?: number } | undefined
  const meta: SaveMeta = {
    version: 3,
    lastOnlineTime: gameData?.lastOnlineTime ?? Date.now(),
    saveSlot: gameData?.saveSlot ?? 1,
  }
  localStorage.setItem(META_KEY, JSON.stringify(meta))

  // Remove old key
  localStorage.removeItem(OLD_SAVE_KEY)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/SaveSystem.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Run all tests to verify no regressions**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/systems/save/SaveSystem.ts src/__tests__/SaveSystem.test.ts
git commit -m "feat: rewrite SaveSystem to use IndexedDB with v2 migration"
```

---

### Task 4: Rewrite useAutoSave.ts with isLoaded

**Files:**
- Modify: `src/systems/save/useAutoSave.ts`

- [ ] **Step 1: Rewrite useAutoSave.ts**

Replace entire `src/systems/save/useAutoSave.ts` with:

```typescript
import { useEffect, useRef, useState } from 'react'
import { saveGame, loadGame } from './SaveSystem'
import { getDB } from './db'
import { useGameStore } from '../../stores/gameStore'

const SAVE_INTERVAL = 30000 // auto-save every 30 seconds

export function useAutoSave(): { isLoaded: boolean } {
  const [isLoaded, setIsLoaded] = useState(false)
  const loadingRef = useRef<Promise<void> | null>(null)

  // Load on mount (async). Works correctly with React StrictMode re-mounts:
  // if loading is already in progress, we await the existing promise rather than
  // skipping or starting a duplicate load.
  useEffect(() => {
    if (!loadingRef.current) {
      loadingRef.current = (async () => {
        try {
          await getDB()
          await loadGame()
        } catch (e) {
          console.error('Failed to load save:', e)
        }
      })()
    }

    let cancelled = false
    loadingRef.current.then(() => {
      if (!cancelled) {
        setIsLoaded(true)
      }
    })

    return () => { cancelled = true }
  }, [])

  // Auto-save periodically (only when loaded and not paused)
  useEffect(() => {
    if (!isLoaded) return

    const interval = setInterval(() => {
      const isPaused = useGameStore.getState().isPaused
      if (!isPaused) {
        saveGame()
      }
    }, SAVE_INTERVAL)

    return () => clearInterval(interval)
  }, [isLoaded])

  return { isLoaded }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/systems/save/useAutoSave.ts
git commit -m "feat: rewrite useAutoSave with async loading and isLoaded state"
```

---

### Task 5: Update App.tsx with loading gate

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Update App.tsx to gate initialization on isLoaded**

Replace the entire `src/App.tsx` with:

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { useSectStore } from './stores/sectStore'
import { useAdventureStore } from './stores/adventureStore'
import { useGameStore } from './stores/gameStore'
import { IdleEngine, calcOfflineSeconds } from './systems/idle/IdleEngine'
import { useAutoSave } from './systems/save/useAutoSave'
import Sidebar from './components/common/Sidebar'
import BottomNav from './components/common/BottomNav'
import TopBar from './components/common/TopBar'
import SectPage from './pages/SectPage'
import CharactersPage from './pages/CharactersPage'
import BuildingsPage from './pages/BuildingsPage'
import AdventurePage from './pages/AdventurePage'
import VaultPage from './pages/VaultPage'

export default function App() {
  const { isLoaded } = useAutoSave()
  const startGame = useGameStore((s) => s.startGame)
  const tickAll = useSectStore((s) => s.tickAll)
  const tickAllIdle = useAdventureStore((s) => s.tickAllIdle)
  const lastOnlineTime = useGameStore((s) => s.lastOnlineTime)

  useEffect(() => {
    if (!isLoaded) return

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
    return () => engine.stop()
  }, [isLoaded])

  if (!isLoaded) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', fontFamily: 'serif', color: '#6b5b4f',
      }}>
        加载中...
      </div>
    )
  }

  return (
    <BrowserRouter basename="/EndlessQuest">
      <Sidebar />
      <TopBar />
      <div className="page-content">
        <Routes>
          <Route path="/" element={<SectPage />} />
          <Route path="/characters" element={<CharactersPage />} />
          <Route path="/buildings" element={<BuildingsPage />} />
          <Route path="/adventure" element={<AdventurePage />} />
          <Route path="/vault" element={<VaultPage />} />
        </Routes>
      </div>
      <BottomNav />
    </BrowserRouter>
  )
}
```

Key changes from the original:
- `useAutoSave()` now returns `{ isLoaded }` and is destructured
- The `useEffect` for game initialization now depends on `[isLoaded]` and returns early if false
- A loading screen is shown when `!isLoaded`

- [ ] **Step 2: Run all tests to verify no regressions**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: gate App initialization on isLoaded with loading screen"
```

---

### Task 6: Create HistoryStore.ts

**Files:**
- Create: `src/systems/save/HistoryStore.ts`
- Test: `src/__tests__/HistoryStore.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/HistoryStore.test.ts`:

```typescript
import 'fake-indexeddb/auto'
import { _resetDB } from '../systems/save/db'
import { addHistoryEntry, queryHistoryEntries } from '../systems/save/HistoryStore'

describe('HistoryStore', () => {
  beforeEach(async () => {
    _resetDB()
    await indexedDB.deleteDatabase('endlessquest_db')
  })

  it('should add and query history entries', async () => {
    await addHistoryEntry({
      type: 'dungeonComplete',
      timestamp: Date.now() - 2000,
      summary: '通关灵草谷',
      data: { dungeonId: 'lingCaoValley', floorsCleared: 5 },
    })
    await addHistoryEntry({
      type: 'breakthrough',
      timestamp: Date.now() - 1000,
      summary: '李天行突破到练气二层',
      data: { characterId: 'c1', newRealm: 1 },
    })

    const all = await queryHistoryEntries()
    expect(all).toHaveLength(2)
    expect(all[0].type).toBe('dungeonComplete')
  })

  it('should filter by type', async () => {
    await addHistoryEntry({ type: 'breakthrough', timestamp: Date.now(), summary: 'b1', data: {} })
    await addHistoryEntry({ type: 'recruit', timestamp: Date.now(), summary: 'r1', data: {} })
    await addHistoryEntry({ type: 'breakthrough', timestamp: Date.now(), summary: 'b2', data: {} })

    const bt = await queryHistoryEntries({ type: 'breakthrough' })
    expect(bt).toHaveLength(2)
  })

  it('should limit results', async () => {
    for (let i = 0; i < 10; i++) {
      await addHistoryEntry({ type: 'breakthrough', timestamp: Date.now() + i, summary: `b${i}`, data: {} })
    }

    const limited = await queryHistoryEntries({ limit: 3 })
    expect(limited).toHaveLength(3)
  })
})
```

Note: The test imports `_resetDB` from `db.ts` — we need to also export `_resetDB` from db.ts (already done in Task 2).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/HistoryStore.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create HistoryStore.ts**

Create `src/systems/save/HistoryStore.ts`:

```typescript
import { getDB } from './db'

export interface GameHistoryEntry {
  id?: number
  type: 'dungeonComplete' | 'breakthrough' | 'recruit' | 'itemForge' | 'potionCraft'
  timestamp: number
  summary: string
  data: Record<string, unknown>
}

export interface HistoryQuery {
  type?: GameHistoryEntry['type']
  since?: number
  limit?: number
}

export async function addHistoryEntry(entry: GameHistoryEntry): Promise<void> {
  const db = await getDB()
  await db.add('history', entry)
}

export async function queryHistoryEntries(query?: HistoryQuery): Promise<GameHistoryEntry[]> {
  const db = await getDB()
  const tx = db.transaction('history', 'readonly')
  let index = tx.store.index('timestamp')
  let range: IDBKeyRange | undefined

  if (query?.since) {
    range = IDBKeyRange.lowerBound(query.since)
  }

  let cursor = await index.openCursor(range, 'prev') // newest first
  const results: GameHistoryEntry[] = []

  while (cursor) {
    const entry = cursor.value as GameHistoryEntry
    if (query?.type && entry.type !== query.type) {
      cursor = await cursor.continue()
      continue
    }
    results.push(entry)
    if (query?.limit && results.length >= query.limit) break
    cursor = await cursor.continue()
  }

  return results
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/HistoryStore.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/systems/save/HistoryStore.ts src/__tests__/HistoryStore.test.ts
git commit -m "feat: add HistoryStore for game event logging (IndexedDB)"
```

---

### Task 7: Create ResourceCache.ts

**Files:**
- Create: `src/systems/save/ResourceCache.ts`
- Test: `src/__tests__/ResourceCache.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/ResourceCache.test.ts`:

```typescript
import 'fake-indexeddb/auto'
import { _resetDB } from '../systems/save/db'
import { getCachedResource, setCachedResource } from '../systems/save/ResourceCache'

describe('ResourceCache', () => {
  beforeEach(async () => {
    _resetDB()
    await indexedDB.deleteDatabase('endlessquest_db')
  })

  it('should store and retrieve a blob', async () => {
    const blob = new Blob(['hello world'], { type: 'text/plain' })
    await setCachedResource('test/hello.txt', blob, 'v1')

    const cached = await getCachedResource('test/hello.txt')
    expect(cached).toBeDefined()
    expect(cached!.version).toBe('v1')
    expect(await cached!.blob.text()).toBe('hello world')
  })

  it('should return undefined for missing key', async () => {
    const cached = await getCachedResource('nonexistent')
    expect(cached).toBeUndefined()
  })

  it('should overwrite existing cache', async () => {
    const blob1 = new Blob(['old'], { type: 'text/plain' })
    const blob2 = new Blob(['new'], { type: 'text/plain' })
    await setCachedResource('test/hello.txt', blob1, 'v1')
    await setCachedResource('test/hello.txt', blob2, 'v2')

    const cached = await getCachedResource('test/hello.txt')
    expect(cached!.version).toBe('v2')
    expect(await cached!.blob.text()).toBe('new')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/ResourceCache.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create ResourceCache.ts**

Create `src/systems/save/ResourceCache.ts`:

```typescript
import { getDB } from './db'

export interface CachedResource {
  key: string
  blob: Blob
  version: string
  cachedAt: number
}

export async function getCachedResource(key: string): Promise<CachedResource | undefined> {
  const db = await getDB()
  return db.get('resources', key)
}

export async function setCachedResource(key: string, blob: Blob, version: string): Promise<void> {
  const db = await getDB()
  await db.put('resources', {
    key,
    blob,
    version,
    cachedAt: Date.now(),
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/ResourceCache.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/systems/save/ResourceCache.ts src/__tests__/ResourceCache.test.ts
git commit -m "feat: add ResourceCache for static asset caching (IndexedDB)"
```

---

### Task 8: Final verification

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass (existing + new)

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors
