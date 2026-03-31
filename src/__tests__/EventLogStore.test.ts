import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { emitEvent, useEventLogStore } from '../stores/eventLogStore'
import { queryHistoryEntries } from '../systems/save/HistoryStore'
import { _resetDB } from '../systems/save/db'

describe('EventLogStore persistence', () => {
  beforeEach(async () => {
    _resetDB()
    await indexedDB.deleteDatabase('endlessquest_db')
    useEventLogStore.getState().reset()
  })

  afterEach(() => {
    useEventLogStore.getState().reset()
  })

  it('should persist emitted events into the history store', async () => {
    emitEvent('recruit', '招收弟子 柳清风')
    await new Promise((resolve) => setTimeout(resolve, 0))

    const history = await queryHistoryEntries()
    expect(history).toHaveLength(1)
    expect(history[0].summary).toBe('招收弟子 柳清风')
  })
})
