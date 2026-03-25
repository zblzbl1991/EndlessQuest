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
