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

describe('Game loop store integration', () => {
  beforeEach(() => {
    usePlayerStore.getState().reset()
    useInventoryStore.getState().reset()
    useSectStore.getState().reset()
  })

  it('playerStore.tick() should accumulate cultivation', () => {
    // Give enough spirit energy (need 2/s, test with 10 for 1 second)
    const result = usePlayerStore.getState().tick(10, 1)
    expect(result.cultivationGained).toBe(5)
    expect(result.spiritSpent).toBe(2)
    expect(usePlayerStore.getState().player.cultivation).toBe(5)
  })

  it('playerStore.tick() should not cultivate without spirit energy', () => {
    const result = usePlayerStore.getState().tick(0, 1)
    expect(result.cultivationGained).toBe(0)
    expect(usePlayerStore.getState().player.cultivation).toBe(0)
  })

  it('playerStore.attemptBreakthrough() should succeed with enough cultivation', () => {
    // Set cultivation to 100 (need 100 for first breakthrough)
    usePlayerStore.getState().tick(100, 20) // tick 20 seconds with enough spirit = 100 cultivation gained
    const player = usePlayerStore.getState().player
    expect(player.cultivation).toBe(100)

    const result = usePlayerStore.getState().attemptBreakthrough()
    expect(result.success).toBe(true)
    expect(result.newStage).toBe(1)
    expect(usePlayerStore.getState().player.cultivation).toBe(0) // consumed
    expect(usePlayerStore.getState().player.baseStats.hp).toBeGreaterThan(100) // stats grew
  })

  it('inventoryStore.tickResourceProduction() should produce resources', () => {
    useInventoryStore.getState().tickResourceProduction(10)
    const resources = useInventoryStore.getState().resources
    expect(resources.spiritEnergy).toBe(10) // 1/s × 10s
    expect(resources.herb).toBe(0) // no spiritField yet
  })
})
