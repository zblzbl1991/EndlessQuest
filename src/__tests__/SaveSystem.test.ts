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

  it('should migrate v2 saves missing talents field', () => {
    const oldChar = {
      id: 'c1', name: '测试', title: 'disciple' as const, quality: 'common' as const,
      realm: 0, realmStage: 0, cultivation: 0,
      baseStats: { hp: 100, atk: 15, def: 8, spd: 10, crit: 0.05, critDmg: 1.5 },
      cultivationStats: { spiritPower: 0, maxSpiritPower: 100, comprehension: 10, spiritualRoot: 10, fortune: 5 },
      currentTechnique: null, techniqueComprehension: 0, learnedTechniques: [],
      equippedGear: [], equippedSkills: [], backpack: [], maxBackpackSlots: 20, petIds: [],
      status: 'cultivating' as const, injuryTimer: 0, createdAt: Date.now(), totalCultivation: 0,
    }

    const saveData = {
      version: 2,
      timestamp: Date.now(),
      sectStore: {
        sect: {
          name: '测试宗门', level: 1,
          resources: { spiritStone: 500, spiritEnergy: 0, herb: 0, ore: 0, fairyJade: 0, scrollFragment: 0, heavenlyTreasure: 0, beastSoul: 0 },
          buildings: [], characters: [oldChar], vault: [], maxVaultSlots: 50, pets: [], totalAdventureRuns: 0, totalBreakthroughs: 0,
        },
      },
      adventureStore: { activeRuns: {} },
      gameStore: { saveSlot: 0, lastOnlineTime: Date.now() },
    }

    localStorage.setItem('endlessquest_save', JSON.stringify(saveData))
    const loaded = loadGame()
    expect(loaded).toBe(true)

    const char = useSectStore.getState().sect.characters[0]
    expect(char.talents).toEqual([])
    expect(Array.isArray(char.talents)).toBe(true)

    clearSaveData()
  })
})
