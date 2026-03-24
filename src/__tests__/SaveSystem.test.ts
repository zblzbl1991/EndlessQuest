import { saveGame, loadGame, hasSaveData, clearSaveData } from '../systems/save/SaveSystem'

describe('SaveSystem', () => {
  beforeEach(() => {
    clearSaveData()
  })

  it('should save and load data', () => {
    const data = {
      version: 1,
      timestamp: Date.now(),
      player: { name: 'test' },
      inventory: null,
      sect: null,
      pets: null,
      adventure: null,
      game: null,
    }
    saveGame(data)
    const loaded = loadGame()
    expect(loaded).not.toBeNull()
    expect(loaded!.player.name).toBe('test')
  })

  it('should return null when no save exists', () => {
    expect(loadGame()).toBeNull()
  })

  it('should detect existing save data', () => {
    expect(hasSaveData()).toBe(false)
    saveGame({
      version: 1,
      timestamp: Date.now(),
      player: null,
      inventory: null,
      sect: null,
      pets: null,
      adventure: null,
      game: null,
    })
    expect(hasSaveData()).toBe(true)
  })

  it('should clear save data', () => {
    saveGame({
      version: 1,
      timestamp: Date.now(),
      player: null,
      inventory: null,
      sect: null,
      pets: null,
      adventure: null,
      game: null,
    })
    expect(hasSaveData()).toBe(true)
    clearSaveData()
    expect(hasSaveData()).toBe(false)
  })

  it('should handle corrupted save data gracefully', () => {
    localStorage.setItem('endlessquest_save', 'not valid json{{{')
    const loaded = loadGame()
    expect(loaded).toBeNull()
  })

  it('should handle storage errors gracefully', () => {
    // Simulate quota exceeded
    const originalSetItem = localStorage.setItem.bind(localStorage)
    localStorage.setItem = () => { throw new DOMException('QuotaExceededError') }
    expect(() => saveGame({
      version: 1,
      timestamp: Date.now(),
      player: null,
      inventory: null,
      sect: null,
      pets: null,
      adventure: null,
      game: null,
    })).not.toThrow()
    localStorage.setItem = originalSetItem
  })

  it('should preserve complex nested data', () => {
    const complexData = {
      version: 1,
      timestamp: Date.now(),
      player: {
        name: '修仙者',
        realm: 2,
        cultivation: 1500.5,
        baseStats: { hp: 100, atk: 15, def: 8, spd: 10, crit: 0.05, critDmg: 1.5 },
      },
      inventory: {
        items: [{ id: 'item1', name: '灵剑' }],
        maxSlots: 50,
        resources: { spiritStone: 1000, spiritEnergy: 50 },
      },
      sect: {
        buildings: [{ type: 'mainHall', level: 3 }],
        disciples: [],
      },
      pets: null,
      adventure: null,
      game: { lastOnlineTime: Date.now() },
    }
    saveGame(complexData)
    const loaded = loadGame()
    expect(loaded).not.toBeNull()
    expect(loaded!.player.name).toBe('修仙者')
    expect(loaded!.player.realm).toBe(2)
    expect(loaded!.player.cultivation).toBe(1500.5)
    expect(loaded!.inventory.items).toHaveLength(1)
    expect(loaded!.inventory.resources.spiritStone).toBe(1000)
  })

  it('should overwrite previous save data', () => {
    saveGame({
      version: 1,
      timestamp: 1000,
      player: { name: 'first' },
      inventory: null,
      sect: null,
      pets: null,
      adventure: null,
      game: null,
    })
    saveGame({
      version: 1,
      timestamp: 2000,
      player: { name: 'second' },
      inventory: null,
      sect: null,
      pets: null,
      adventure: null,
      game: null,
    })
    const loaded = loadGame()
    expect(loaded).not.toBeNull()
    expect(loaded!.player.name).toBe('second')
    expect(loaded!.timestamp).toBe(2000)
  })
})
