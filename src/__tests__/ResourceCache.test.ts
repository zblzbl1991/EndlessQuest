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
    // fake-indexeddb deserializes Blob as a plain object, so assert on the cached structure
    expect(cached!.key).toBe('test/hello.txt')
    expect(cached!.blob).toBeDefined()
  })

  it('should return undefined for missing key', async () => {
    const cached = await getCachedResource('nonexistent')
    expect(cached).toBeUndefined()
  })

  it('should overwrite existing cache', async () => {
    const blob1 = new Blob(['old'], { type: 'text/plain' })
    const blob2 = new Blob(['new'], { type: 'text/plain' })
    await setCachedResource('test/hello.txt', blob1, 'v1')
    const beforeSecondPut = Date.now()
    await setCachedResource('test/hello.txt', blob2, 'v2')

    const cached = await getCachedResource('test/hello.txt')
    expect(cached!.version).toBe('v2')
    expect(cached!.cachedAt).toBeGreaterThanOrEqual(beforeSecondPut)
  })
})
