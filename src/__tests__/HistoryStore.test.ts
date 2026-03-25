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
    // 'prev' cursor = newest first; breakthrough (ts -1000) is newer than dungeonComplete (ts -2000)
    expect(all[0].type).toBe('breakthrough')
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
