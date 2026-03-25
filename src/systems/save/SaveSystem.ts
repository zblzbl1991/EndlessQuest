import type { Sect } from '../../types'
import type { DungeonRun } from '../../types'
import { useSectStore } from '../../stores/sectStore'
import { useAdventureStore } from '../../stores/adventureStore'
import { useGameStore } from '../../stores/gameStore'
import { getDB } from './db'

const META_KEY = 'eq_save_meta'
const OLD_SAVE_KEY = 'endlessquest_save'

interface SaveMeta {
  version: 3
  lastOnlineTime: number
  saveSlot: number
}

export async function saveGame(): Promise<void> {
  try {
    const db = await getDB()
    const tx = db.transaction(['save', 'adventure'], 'readwrite')

    const sect = useSectStore.getState().sect
    await tx.objectStore('save').put({
      slot: 1,
      timestamp: Date.now(),
      version: 3,
      sect,
    })

    const activeRuns = useAdventureStore.getState().activeRuns
    const advStore = tx.objectStore('adventure')
    for (const run of Object.values(activeRuns)) {
      await advStore.put({ id: run.id, run })
    }
    const allKeys = await advStore.getAllKeys()
    for (const key of allKeys) {
      if (!(key as string in activeRuns)) {
        await advStore.delete(key)
      }
    }

    await tx.done

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
    if (localStorage.getItem(OLD_SAVE_KEY) && !localStorage.getItem(META_KEY)) {
      await migrateV2ToV3()
    }

    const metaRaw = localStorage.getItem(META_KEY)
    if (!metaRaw) return false

    const meta: SaveMeta = JSON.parse(metaRaw)
    if (meta.version < 3) {
      await clearSaveData()
      return false
    }

    const db = await getDB()

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

    const advRecords = await db.getAll('adventure')
    if (advRecords.length > 0) {
      const activeRuns: Record<string, DungeonRun> = {}
      for (const rec of advRecords) {
        activeRuns[(rec as { id: string; run: DungeonRun }).id] = (rec as { id: string; run: DungeonRun }).run
      }
      useAdventureStore.setState({ activeRuns })
    }

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

  const advData = data.adventureStore as { activeRuns?: Record<string, DungeonRun> } | undefined
  if (advData?.activeRuns) {
    const advStore = tx.objectStore('adventure')
    for (const run of Object.values(advData.activeRuns)) {
      await advStore.put({ id: run.id, run })
    }
  }

  await tx.done

  const gameData = data.gameStore as { saveSlot?: number; lastOnlineTime?: number } | undefined
  const meta: SaveMeta = {
    version: 3,
    lastOnlineTime: gameData?.lastOnlineTime ?? Date.now(),
    saveSlot: gameData?.saveSlot ?? 1,
  }
  localStorage.setItem(META_KEY, JSON.stringify(meta))
  localStorage.removeItem(OLD_SAVE_KEY)
}
