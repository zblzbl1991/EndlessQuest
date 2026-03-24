import { saveGame, loadGame, hasSaveData, clearSaveData } from '../systems/save/SaveSystem'
import { useSectStore } from '../stores/sectStore'
import { useAdventureStore } from '../stores/adventureStore'
import { useGameStore } from '../stores/gameStore'

describe('SaveSystem', () => {
  beforeEach(() => {
    clearSaveData()
    useSectStore.getState().reset()
    useAdventureStore.getState().reset()
    useGameStore.getState().reset()
  })

  it('should save and load data', () => {
    // Set some known state
    useSectStore.getState().addResource('spiritStone', 1000)
    useGameStore.getState().startGame()

    saveGame()
    expect(hasSaveData()).toBe(true)

    // Reset stores to initial
    useSectStore.getState().reset()
    useGameStore.getState().reset()

    // Load and verify
    const result = loadGame()
    expect(result).toBe(true)
    expect(useSectStore.getState().sect.resources.spiritStone).toBe(1500) // 500 initial + 1000
    expect(useGameStore.getState().lastOnlineTime).toBeGreaterThan(0)
  })

  it('loadGame should return false when no save', () => {
    expect(loadGame()).toBe(false)
  })

  it('loadGame should clear v1 saves and return false', () => {
    localStorage.setItem('endlessquest_save', JSON.stringify({
      version: 1,
      timestamp: Date.now(),
      player: { name: 'old' },
    }))
    expect(hasSaveData()).toBe(false) // v1 is not recognized
    expect(loadGame()).toBe(false)
    expect(localStorage.getItem('endlessquest_save')).toBeNull()
  })

  it('clearSaveData should remove data', () => {
    useGameStore.getState().startGame()
    saveGame()
    expect(hasSaveData()).toBe(true)
    clearSaveData()
    expect(hasSaveData()).toBe(false)
  })

  it('hasSaveData should return false for corrupted data', () => {
    localStorage.setItem('endlessquest_save', 'not valid json{{{')
    expect(hasSaveData()).toBe(false)
  })

  it('should handle storage errors gracefully', () => {
    const originalSetItem = localStorage.setItem.bind(localStorage)
    localStorage.setItem = () => { throw new DOMException('QuotaExceededError') }
    expect(() => saveGame()).not.toThrow()
    localStorage.setItem = originalSetItem
  })

  it('should preserve adventure active runs through save/load', () => {
    // Simulate having an active run by directly setting state
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
            fairyJade: 0, scrollFragment: 0, heavenlyTreasure: 0, beastSoul: 0,
          },
          itemRewards: [],
          eventLog: [{ timestamp: Date.now(), message: 'test log' }],
          status: 'active',
        },
      },
    })

    saveGame()
    useAdventureStore.getState().reset()

    const result = loadGame()
    expect(result).toBe(true)
    expect(useAdventureStore.getState().activeRuns['test_run_1']).toBeDefined()
    expect(useAdventureStore.getState().activeRuns['test_run_1'].currentFloor).toBe(3)
  })

  it('hasSaveData should return false for no save', () => {
    expect(hasSaveData()).toBe(false)
  })
})
