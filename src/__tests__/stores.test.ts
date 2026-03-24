import { useGameStore } from '../stores/gameStore'
import { usePlayerStore } from '../stores/playerStore'
import { useInventoryStore } from '../stores/inventoryStore'
// TODO: Re-enable after sectStore rewrite (Task 11)
// import { useSectStore } from '../stores/sectStore'

describe('Zustand stores initialization', () => {
  beforeEach(() => {
    useGameStore.getState().reset()
    usePlayerStore.getState().reset()
    useInventoryStore.getState().reset()
    // TODO: Re-enable after sectStore rewrite (Task 11)
    // useSectStore.getState().reset()
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

  // TODO: Re-enable after sectStore rewrite (Task 11)
  // it('sectStore should have mainHall unlocked at level 1', () => {
  //   const state = useSectStore.getState()
  //   const mainHall = state.buildings.find((b) => b.type === 'mainHall')
  //   expect(mainHall?.level).toBe(1)
  //   expect(mainHall?.unlocked).toBe(true)
  // })
})

describe('Game loop store integration', () => {
  beforeEach(() => {
    usePlayerStore.getState().reset()
    useInventoryStore.getState().reset()
    // TODO: Re-enable after sectStore rewrite (Task 11)
    // useSectStore.getState().reset()
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

describe('Equipment store integration', () => {
  beforeEach(() => {
    usePlayerStore.getState().reset()
    useInventoryStore.getState().reset()
  })

  it('should equip item by slot index', () => {
    const success = usePlayerStore.getState().equipItem('test_item_1', 5) // weapon slot
    expect(success).toBe(true)
    expect(usePlayerStore.getState().player.equippedGear[5]).toBe('test_item_1')
  })

  it('should unequip item and return id', () => {
    usePlayerStore.getState().equipItem('test_item_1', 5)
    const prev = usePlayerStore.getState().unequipItem(5)
    expect(prev).toBe('test_item_1')
    expect(usePlayerStore.getState().player.equippedGear[5]).toBeNull()
  })

  it('should reject invalid slot index on equip', () => {
    expect(usePlayerStore.getState().equipItem('test', -1)).toBe(false)
    expect(usePlayerStore.getState().equipItem('test', 9)).toBe(false)
  })

  it('should reject invalid slot index on unequip', () => {
    expect(usePlayerStore.getState().unequipItem(-1)).toBeNull()
    expect(usePlayerStore.getState().unequipItem(9)).toBeNull()
  })

  it('should get total stats with equipped gear', () => {
    usePlayerStore.getState().equipItem('test_item_1', 5) // weapon slot
    const mockEquipment = {
      id: 'test_item_1',
      name: 'Iron Sword',
      quality: 'common' as const,
      type: 'equipment' as const,
      description: '',
      sellPrice: 10,
      slot: 'weapon' as const,
      stats: { hp: 0, atk: 10, def: 0, spd: 0, crit: 0, critDmg: 0 },
      enhanceLevel: 0,
      refinementStats: [],
      setId: null,
    }
    const total = usePlayerStore.getState().getTotalStats((id) =>
      id === 'test_item_1' ? mockEquipment : undefined
    )
    expect(total.hp).toBe(100) // base only
    expect(total.atk).toBe(25) // base 15 + weapon 10
    expect(total.def).toBe(8)  // base only
  })

  it('should getEquippedItemIds return current gear array', () => {
    usePlayerStore.getState().equipItem('item_a', 0)
    usePlayerStore.getState().equipItem('item_b', 5)
    const ids = usePlayerStore.getState().getEquippedItemIds()
    expect(ids[0]).toBe('item_a')
    expect(ids[5]).toBe('item_b')
    expect(ids[1]).toBeNull()
  })

  it('should sell item and gain spirit stone', () => {
    useInventoryStore.getState().addItem({
      id: 'sell_test', name: 'Test', quality: 'common', type: 'consumable', description: '', sellPrice: 50,
      effect: { type: 'hp', value: 10 },
    } as any)
    const initialStone = useInventoryStore.getState().resources.spiritStone
    const result = useInventoryStore.getState().sellItem(0)
    expect(result.success).toBe(true)
    expect(result.spiritStone).toBe(50)
    expect(useInventoryStore.getState().resources.spiritStone).toBe(initialStone + 50)
  })

  it('should not sell non-existent item', () => {
    const result = useInventoryStore.getState().sellItem(0)
    expect(result.success).toBe(false)
    expect(result.spiritStone).toBe(0)
  })

  it('should enhance equipment item', () => {
    useInventoryStore.getState().addItem({
      id: 'enhance_test', name: 'Sword', quality: 'common', type: 'equipment', description: '', sellPrice: 10,
      slot: 'weapon', stats: { hp: 0, atk: 10, def: 0, spd: 0, crit: 0, critDmg: 0 },
      enhanceLevel: 0, refinementStats: [], setId: null,
    })
    // Give enough resources for enhancement
    useInventoryStore.getState().addResource('spiritStone', 10000)
    useInventoryStore.getState().addResource('ore', 1000)
    const result = useInventoryStore.getState().enhanceItem(0)
    expect(result.cost.spiritStone).toBeGreaterThan(0)
    expect(result.cost.ore).toBeGreaterThan(0)
    // Result depends on RNG but cost should always be deducted
    expect(useInventoryStore.getState().resources.spiritStone).toBeLessThan(10500)
  })

  it('should not enhance non-equipment item', () => {
    useInventoryStore.getState().addItem({
      id: 'potion', name: 'HP Potion', quality: 'common', type: 'consumable', description: '', sellPrice: 10,
      effect: { type: 'hp', value: 10 },
    } as any)
    const result = useInventoryStore.getState().enhanceItem(0)
    expect(result.success).toBe(false)
  })

  it('should not enhance without enough resources', () => {
    useInventoryStore.getState().addItem({
      id: 'enhance_poor', name: 'Sword', quality: 'common', type: 'equipment', description: '', sellPrice: 10,
      slot: 'weapon', stats: { hp: 0, atk: 10, def: 0, spd: 0, crit: 0, critDmg: 0 },
      enhanceLevel: 0, refinementStats: [], setId: null,
    })
    const result = useInventoryStore.getState().enhanceItem(0)
    expect(result.success).toBe(false)
    // Cost should still be returned so UI can show what's needed
    expect(result.cost.spiritStone).toBeGreaterThan(0)
  })
})
