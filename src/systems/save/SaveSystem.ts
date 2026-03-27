import type { Sect } from '../../types'
import type { DungeonRun } from '../../types'
import { useSectStore } from '../../stores/sectStore'
import { useAdventureStore } from '../../stores/adventureStore'
import { useGameStore } from '../../stores/gameStore'
import { useEventLogStore } from '../../stores/eventLogStore'
import { getDB } from './db'
import { migrateToItemStacks } from '../item/ItemStackUtils'

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
    const activeRuns = useAdventureStore.getState().activeRuns
    const db = await getDB()
    const storeNames = ['meta', 'characters', 'buildings', 'vault', 'pets', 'adventure'] as const
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

    // Write buildings (keyPath is 'type', put overwrites)
    const bldgStore = tx.objectStore('buildings')
    for (const b of sect.buildings) await bldgStore.put(b)

    // Write vault items (ensure 'id' field at top level for keyPath)
    const vaultStore = tx.objectStore('vault')
    for (const s of sect.vault) await vaultStore.put({ id: s.item.id, ...s })
    const vaultKeys = await vaultStore.getAllKeys()
    const vaultItemIds = new Set(sect.vault.map(s => s.item.id))
    for (const k of vaultKeys) {
      if (!vaultItemIds.has(k as string)) await vaultStore.delete(k)
    }

    // Write pets
    const petStore = tx.objectStore('pets')
    for (const p of sect.pets) await petStore.put(p)
    const petKeys = await petStore.getAllKeys()
    for (const k of petKeys) {
      if (!sect.pets.some(p => p.id === k)) await petStore.delete(k)
    }

    // Write adventure runs
    const advStore = tx.objectStore('adventure')
    for (const run of Object.values(activeRuns)) {
      await advStore.put({ id: run.id, run })
    }
    const advKeys = await advStore.getAllKeys()
    for (const k of advKeys) {
      if (!(k as string in activeRuns)) await advStore.delete(k)
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
    const db = await getDB()
    const meta = await db.get('meta', 1) as SaveMeta | undefined

    // Clean up stale localStorage regardless
    if (localStorage.getItem(META_KEY)) localStorage.removeItem(META_KEY)
    if (localStorage.getItem(OLD_SAVE_KEY)) localStorage.removeItem(OLD_SAVE_KEY)

    if (!meta) return false

    // Read per-entity stores
    const rawCharacters = await db.getAll('characters') as Sect['characters']
    const buildings = await db.getAll('buildings') as Sect['buildings']
    const rawVault = await db.getAll('vault')
    const pets = await db.getAll('pets') as Sect['pets']

    // Integrity check: if meta exists but all entity stores are empty, corrupted
    if (rawCharacters.length === 0 && buildings.length === 0) {
      return false
    }

    // Migrate vault and backpacks to ItemStack format
    const vault = migrateToItemStacks(rawVault)
    const characters = rawCharacters.map(c => ({
      ...c,
      backpack: migrateToItemStacks(c.backpack),
      specialties: (c as any).specialties ?? [],
      assignedBuilding: (c as any).assignedBuilding ?? null,
    }))

    const sect: Sect = {
      name: meta.sectName,
      level: meta.sectLevel,
      resources: meta.resources,
      buildings: buildings ?? [],
      characters,
      vault,
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
        activeRuns[r.id] = { ...r.run, pendingShopOffers: (r.run as any).pendingShopOffers ?? [] }
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
