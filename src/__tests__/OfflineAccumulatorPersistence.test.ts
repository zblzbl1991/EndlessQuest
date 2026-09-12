import 'fake-indexeddb/auto'
import { saveGame, loadGame } from '../systems/save/SaveSystem'
import { _resetDB } from '../systems/save/db'
import { useSectStore } from '../stores/sectStore'
import { useAdventureStore } from '../stores/adventureStore'
import { useEventLogStore } from '../stores/eventLogStore'
import { useGameStore } from '../stores/gameStore'

describe('offlineAccumulator persistence (B7)', () => {
  beforeEach(async () => {
    _resetDB()
    await indexedDB.deleteDatabase('endlessquest_db')
    localStorage.clear()
    useSectStore.getState().reset()
    useAdventureStore.getState().reset()
    useEventLogStore.getState().reset()
    useGameStore.getState().reset()
  })

  it('survives a save/load round-trip', async () => {
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        offlineAccumulator: {
          resourcesGained: { spiritStone: 123, spiritEnergy: 45, herb: 6, ore: 7 },
          breakthroughs: [{ characterName: '张三', targetRealm: '筑基期', success: true }],
          itemsCrafted: [{ name: '回血丹', quantity: 3 }],
          taxIncome: 99,
        },
      },
    }))
    useGameStore.getState().startGame()

    await saveGame()

    useSectStore.getState().reset()
    useGameStore.getState().reset()

    const ok = await loadGame()
    expect(ok).toBe(true)

    const acc = useSectStore.getState().sect.offlineAccumulator
    expect(acc.resourcesGained).toEqual({ spiritStone: 123, spiritEnergy: 45, herb: 6, ore: 7 })
    expect(acc.breakthroughs).toEqual([{ characterName: '张三', targetRealm: '筑基期', success: true }])
    expect(acc.itemsCrafted).toEqual([{ name: '回血丹', quantity: 3 }])
    expect(acc.taxIncome).toBe(99)
  })

  it('falls back to an empty accumulator for saves without one', async () => {
    useGameStore.getState().startGame()
    await saveGame()
    useSectStore.getState().reset()
    useGameStore.getState().reset()

    const ok = await loadGame()
    expect(ok).toBe(true)
    const acc = useSectStore.getState().sect.offlineAccumulator
    expect(acc.resourcesGained).toEqual({ spiritStone: 0, spiritEnergy: 0, herb: 0, ore: 0 })
    expect(acc.breakthroughs).toEqual([])
    expect(acc.itemsCrafted).toEqual([])
    expect(acc.taxIncome).toBe(0)
  })
})
