import 'fake-indexeddb/auto'
import { saveGame, loadGame } from '../systems/save/SaveSystem'
import { _resetDB } from '../systems/save/db'
import { useSectStore } from '../stores/sectStore'
import { useAdventureStore } from '../stores/adventureStore'
import { useEventLogStore } from '../stores/eventLogStore'
import { useGameStore } from '../stores/gameStore'

describe('save overflow guard (MAX_STORED_MAGNITUDE)', () => {
  beforeEach(async () => {
    _resetDB()
    await indexedDB.deleteDatabase('endlessquest_db')
    localStorage.clear()
    useSectStore.getState().reset()
    useAdventureStore.getState().reset()
    useEventLogStore.getState().reset()
    useGameStore.getState().reset()
  })

  it('resets cultivation past 1e300 to 0 on load', async () => {
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) => ({ ...c, cultivation: Number('1e400'), totalCultivation: 42 })),
      },
    }))
    useGameStore.getState().startGame()
    await saveGame()

    useSectStore.getState().reset()
    useGameStore.getState().reset()
    expect(await loadGame()).toBe(true)

    const loaded = useSectStore.getState().sect.characters[0]
    expect(loaded.cultivation).toBe(0)
    expect(loaded.totalCultivation).toBe(42)
  })

  it('keeps legitimate large values intact', async () => {
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) => ({ ...c, cultivation: 1.5e40 })),
      },
    }))
    useGameStore.getState().startGame()
    await saveGame()

    useSectStore.getState().reset()
    useGameStore.getState().reset()
    expect(await loadGame()).toBe(true)

    // v13 {m,e} 载荷往返保留 ~15 位相对精度（1 ulp 级）；绝对容差断言在此量级无意义
    const loaded = useSectStore.getState().sect.characters[0].cultivation
    expect(loaded / 1.5e40).toBeCloseTo(1, 13)
  })
})
