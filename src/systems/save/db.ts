import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'endlessquest_db'
const DB_VERSION = 2

let _db: IDBPDatabase | null = null

export async function getDB(): Promise<IDBPDatabase> {
  if (_db) return _db
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, _newVersion, transaction) {
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
        saveStore.getAll().then(async (records: any[]) => {
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

          for (const c of (sect.characters ?? [])) await charStore.put(c)
          for (const b of (sect.buildings ?? [])) await bldgStore.put(b)
          for (const i of (sect.vault ?? [])) await vaultStore.put(i)
          for (const p of (sect.pets ?? [])) await petStore.put(p)

          // Delete old blob store
          db.deleteObjectStore('save')
        })
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
