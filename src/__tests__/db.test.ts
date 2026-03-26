import 'fake-indexeddb/auto'
import { getDB, _resetDB } from '../systems/save/db'

describe('db', () => {
  beforeEach(async () => {
    _resetDB()
    await indexedDB.deleteDatabase('endlessquest_db')
  })

  it('should open the database and return a valid IDB instance', async () => {
    const db = await getDB()
    expect(db).toBeDefined()
    expect(db.name).toBe('endlessquest_db')
    expect(db.version).toBe(2)
  })

  it('should create all required object stores', async () => {
    const db = await getDB()
    const storeNames = Array.from(db.objectStoreNames)
    expect(storeNames).toContain('meta')
    expect(storeNames).toContain('characters')
    expect(storeNames).toContain('buildings')
    expect(storeNames).toContain('vault')
    expect(storeNames).toContain('pets')
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
