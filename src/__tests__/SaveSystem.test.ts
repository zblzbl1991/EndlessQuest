import 'fake-indexeddb/auto'
import { saveGame, loadGame, hasSaveData, clearSaveData } from '../systems/save/SaveSystem'
import { _resetDB, getDB } from '../systems/save/db'
import { useSectStore } from '../stores/sectStore'
import { useAdventureStore } from '../stores/adventureStore'
import { useGameStore } from '../stores/gameStore'

describe('SaveSystem (per-entity IndexedDB)', () => {
  beforeEach(async () => {
    _resetDB()
    await indexedDB.deleteDatabase('endlessquest_db')
    localStorage.clear()
    useSectStore.getState().reset()
    useAdventureStore.getState().reset()
    useGameStore.getState().reset()
  })

  it('should save and load data', async () => {
    useSectStore.getState().addResource('spiritStone', 1000)
    useGameStore.getState().startGame()

    await saveGame()
    expect(await hasSaveData()).toBe(true)

    useSectStore.getState().reset()
    useGameStore.getState().reset()

    const result = await loadGame()
    expect(result).toBe(true)
    expect(useSectStore.getState().sect.resources.spiritStone).toBe(1500)
    expect(useGameStore.getState().lastOnlineTime).toBeGreaterThan(0)
  })

  it('loadGame should return false when no save', async () => {
    expect(await loadGame()).toBe(false)
  })

  it('hasSaveData should return false for no save', async () => {
    expect(await hasSaveData()).toBe(false)
  })

  it('clearSaveData should remove data', async () => {
    useGameStore.getState().startGame()
    await saveGame()
    expect(await hasSaveData()).toBe(true)
    await clearSaveData()
    expect(await hasSaveData()).toBe(false)
  })

  it('should handle IndexedDB errors gracefully', async () => {
    useGameStore.getState().startGame()
    await expect(saveGame()).resolves.not.toThrow()
  })

  it('should preserve adventure active runs through save/load', async () => {
    useAdventureStore.setState({
      activeRuns: {
        test_run_1: {
          id: 'test_run_1',
          dungeonId: 'lingCaoValley',
          teamCharacterIds: ['c1'],
          currentFloor: 3,
          floors: [],
          memberStates: {
            c1: { currentHp: 80, maxHp: 100, status: 'alive' },
          },
          totalRewards: {
            spiritStone: 200, spiritEnergy: 0, herb: 10, ore: 0,
          },
          itemRewards: [],
          eventLog: [{ timestamp: Date.now(), message: 'test log' }],
          status: 'active',
        },
      },
    })

    await saveGame()
    useAdventureStore.getState().reset()

    const result = await loadGame()
    expect(result).toBe(true)
    expect(useAdventureStore.getState().activeRuns['test_run_1']).toBeDefined()
    expect(useAdventureStore.getState().activeRuns['test_run_1'].currentFloor).toBe(3)
  })

  it('should save characters to independent store', async () => {
    const sect = useSectStore.getState().sect
    expect(sect.characters.length).toBeGreaterThan(0)

    await saveGame()
    const db = await getDB()
    const chars = await db.getAll('characters')
    expect(chars.length).toBe(sect.characters.length)
  })

  it('should clean up stale localStorage on load', async () => {
    // Simulate stale v4 meta in localStorage
    localStorage.setItem('eq_save_meta', JSON.stringify({ version: 4, lastOnlineTime: Date.now(), saveSlot: 1 }))

    useGameStore.getState().startGame()
    await saveGame()
    // localStorage should be cleaned on load
    await loadGame()
    expect(localStorage.getItem('eq_save_meta')).toBeNull()
  })

  it('should delete vault items when removed from sect', async () => {
    useGameStore.getState().startGame()
    await saveGame()

    // Manually add an item to simulate an existing vault item
    const db = await getDB()
    const testItem = {
      id: 'test_item_1',
      name: 'Test Item',
      quality: 'common' as const,
      type: 'equipment' as const,
      slot: 'weapon' as const,
      description: 'test',
      sellPrice: 10,
      enhanceLevel: 0,
      refinementStats: [],
      setId: null,
      stats: { hp: 0, atk: 0, def: 0, spd: 0, crit: 0, critDmg: 0 },
    }
    await db.put('vault', testItem)

    // Save without the item in sect → should be cleaned up
    await saveGame()
    const vaultItems = await db.getAll('vault')
    expect(vaultItems.length).toBe(0)
  })

  it('should save buildings to independent store', async () => {
    useGameStore.getState().startGame()
    await saveGame()

    const db = await getDB()
    const buildings = await db.getAll('buildings')
    expect(buildings.length).toBeGreaterThan(0)
  })
})
