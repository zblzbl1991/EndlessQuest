import { useGameStore } from '../stores/gameStore'
import { usePlayerStore } from '../stores/playerStore'
import { useInventoryStore } from '../stores/inventoryStore'
import { useSectStore } from '../stores/sectStore'

describe('Zustand stores initialization', () => {
  beforeEach(() => {
    useGameStore.getState().reset()
    usePlayerStore.getState().reset()
    useInventoryStore.getState().reset()
    useSectStore.getState().reset()
  })

  it('gameStore should initialize with default settings', () => {
    const state = useGameStore.getState()
    expect(state.saveSlot).toBe(1)
    expect(state.lastOnlineTime).toBeGreaterThan(0)
  })

  it('playerStore should have correct initial stats', () => {
    const state = usePlayerStore.getState()
    expect(state.player.baseStats.hp).toBe(100)
    expect(state.player.baseStats.atk).toBe(15)
    expect(state.player.cultivationStats.maxSpiritPower).toBe(50)
  })

  it('inventoryStore should start with 50 slots', () => {
    const state = useInventoryStore.getState()
    expect(state.maxSlots).toBe(50)
    expect(state.items).toHaveLength(0)
  })

  it('sectStore should have mainHall unlocked at level 1', () => {
    const state = useSectStore.getState()
    const mainHall = state.buildings.find((b) => b.type === 'mainHall')
    expect(mainHall?.level).toBe(1)
    expect(mainHall?.unlocked).toBe(true)
  })
})
