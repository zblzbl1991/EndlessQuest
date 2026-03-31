import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { emitEvent, useEventLogStore } from '../stores/eventLogStore'
import { queryHistoryEntries } from '../systems/save/HistoryStore'
import { _resetDB, getDB } from '../systems/save/db'

async function waitForHistoryCount(count: number): Promise<void> {
  const deadline = Date.now() + 3000
  while (Date.now() < deadline) {
    const history = await queryHistoryEntries()
    if (history.length >= count) return
    await new Promise((resolve) => setTimeout(resolve, 10))
  }

  throw new Error(`Timed out waiting for ${count} history entries`)
}

async function clearHistoryStore(): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('history', 'readwrite')
  await tx.objectStore('history').clear()
  await tx.done
}

describe('EventLogStore persistence', () => {
  beforeEach(async () => {
    _resetDB()
    await clearHistoryStore()
    useEventLogStore.getState().reset()
  })

  afterEach(() => {
    useEventLogStore.getState().reset()
  })

  it('should persist emitted events into the history store', async () => {
    emitEvent('recruit', '招收弟子 柳清风')
    await waitForHistoryCount(1)

    const history = await queryHistoryEntries()
    expect(history).toHaveLength(1)
    expect(history[0].summary).toBe('招收弟子 柳清风')
  })

  it('should persist structured payloads for adventure detail links', async () => {
    emitEvent('adventure_complete', '秘境 灵草谷 通关', {
      reportId: 'report_1',
      dungeonId: 'lingCaoValley',
      result: 'completed',
      floorsCleared: 5,
    })
    await waitForHistoryCount(1)

    const event = useEventLogStore.getState().events[0]
    const history = await queryHistoryEntries()

    expect(event.data).toEqual({
      reportId: 'report_1',
      dungeonId: 'lingCaoValley',
      result: 'completed',
      floorsCleared: 5,
    })
    expect(history[0].data).toEqual({
      reportId: 'report_1',
      dungeonId: 'lingCaoValley',
      result: 'completed',
      floorsCleared: 5,
    })
  })
})
