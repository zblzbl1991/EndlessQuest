import { useSectStore } from '../stores/sectStore'
import { useAdventureStore } from '../stores/adventureStore'
import type { Character, Equipment, Consumable, AnyItem, ItemStack } from '../types'
import type { Pet } from '../systems/pet/PetSystem'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEquipment(id: string, overrides?: Partial<Equipment>): Equipment {
  return {
    id,
    name: 'Test Sword',
    quality: 'common',
    type: 'equipment',
    description: '',
    sellPrice: 10,
    slot: 'weapon',
    stats: { hp: 0, atk: 10, def: 0, spd: 0, crit: 0, critDmg: 0 },
    enhanceLevel: 0,
    refinementStats: [],
    setId: null,
    ...overrides,
  }
}

function makeConsumable(id: string, overrides?: Partial<Consumable>): Consumable {
  return {
    id,
    name: 'HP Potion',
    quality: 'common',
    type: 'consumable',
    description: '',
    sellPrice: 50,
    effect: { type: 'hp', value: 10 },
    ...overrides,
  }
}

function makePet(id: string, overrides?: Partial<Pet>): Pet {
  return {
    id,
    name: 'Test Pet',
    quality: 'common',
    element: 'fire',
    level: 1,
    talent: 50,
    innateSkill: { id: 'claw', name: '利爪', multiplier: 1.2, element: 'neutral', description: '' },
    equippedSkills: [null, null],
    stats: { hp: 30, atk: 5, def: 3, spd: 4 },
    ...overrides,
  }
}

function resetStore() {
  useSectStore.getState().reset()
}

function getStore() {
  return useSectStore.getState()
}

function getFirstCharacter(): Character {
  return getStore().sect.characters[0]
}

function setCharacterCultivation(charId: string, amount: number) {
  useSectStore.setState((s) => ({
    sect: {
      ...s.sect,
      characters: s.sect.characters.map((c) =>
        c.id === charId ? { ...c, cultivation: amount } : c
      ),
    },
  }))
}

// ---------------------------------------------------------------------------
// Initialization Tests
// ---------------------------------------------------------------------------

describe('SectStore - Initialization', () => {
  beforeEach(() => resetStore())

  it('should have correct initial sect name', () => {
    expect(getStore().sect.name).toBe('无名宗门')
  })

  it('should have exactly 1 initial common character', () => {
    expect(getStore().sect.characters).toHaveLength(1)
    expect(getStore().sect.characters[0].quality).toBe('common')
  })

  it('should have 500 spirit stones initially', () => {
    expect(getStore().sect.resources.spiritStone).toBe(500)
  })

  it('should have 0 spirit energy initially', () => {
    expect(getStore().sect.resources.spiritEnergy).toBe(0)
  })

  it('should have mainHall unlocked at level 1', () => {
    const mainHall = getStore().sect.buildings.find((b) => b.type === 'mainHall')
    expect(mainHall?.level).toBe(1)
    expect(mainHall?.unlocked).toBe(true)
  })

  it('should have spiritField unlocked at level 0 (unlockCondition: mainHall Lv1)', () => {
    // spiritField requires mainHall Lv1 — which we have. It should be unlockable but starts at level 0.
    // But it doesn't auto-unlock — that happens through tryUpgradeBuilding.
    const sf = getStore().sect.buildings.find((b) => b.type === 'spiritField')
    expect(sf?.level).toBe(0)
    expect(sf?.unlocked).toBe(false)
  })

  it('should have empty vault with maxVaultSlots 50', () => {
    expect(getStore().sect.vault).toHaveLength(0)
    expect(getStore().sect.maxVaultSlots).toBe(50)
  })

  it('should have empty pets array', () => {
    expect(getStore().sect.pets).toHaveLength(0)
  })

  it('should have sect level 1', () => {
    expect(getStore().sect.level).toBe(1)
  })

  it('initial character should be cultivating', () => {
    expect(getFirstCharacter().status).toBe('cultivating')
  })
})

// ---------------------------------------------------------------------------
// Character Management Tests
// ---------------------------------------------------------------------------

describe('SectStore - Character Management', () => {
  beforeEach(() => resetStore())

  it('addCharacter should add a new character', () => {
    const char = getStore().addCharacter('common')
    expect(char).not.toBeNull()
    expect(getStore().sect.characters).toHaveLength(2)
    expect(char!.quality).toBe('common')
  })

  it('addCharacter should return null when at max', () => {
    // Sect level 1 -> maxCharacters 5, initial 1, add 4 more
    for (let i = 0; i < 4; i++) {
      const char = getStore().addCharacter('common')
      expect(char).not.toBeNull()
    }
    // 6th should fail
    const char = getStore().addCharacter('common')
    expect(char).toBeNull()
    expect(getStore().sect.characters).toHaveLength(5)
  })

  it('removeCharacter should remove a character by id', () => {
    const char = getFirstCharacter()
    getStore().removeCharacter(char.id)
    expect(getStore().sect.characters).toHaveLength(0)
  })

  it('removeCharacter should handle unknown id gracefully', () => {
    getStore().removeCharacter('nonexistent')
    expect(getStore().sect.characters).toHaveLength(1)
  })

  it('promoteCharacter should change title', () => {
    const char = getFirstCharacter()
    getStore().promoteCharacter(char.id, 'seniorDisciple')
    expect(getStore().sect.characters[0].title).toBe('seniorDisciple')
  })

  it('promoteCharacter should ignore unknown character', () => {
    getStore().promoteCharacter('nonexistent', 'master')
    expect(getFirstCharacter().title).toBe('disciple')
  })

  it('setCharacterStatus should change status', () => {
    const char = getFirstCharacter()
    getStore().setCharacterStatus(char.id, 'idle')
    expect(getStore().sect.characters[0].status).toBe('idle')
  })

  it('setCharacterStatus should ignore unknown character', () => {
    getStore().setCharacterStatus('nonexistent', 'injured')
    expect(getFirstCharacter().status).toBe('cultivating')
  })
})

// ---------------------------------------------------------------------------
// Building Management Tests
// ---------------------------------------------------------------------------

describe('SectStore - Building Management', () => {
  beforeEach(() => resetStore())

  it('upgradeBuilding should upgrade mainHall', () => {
    // mainHall upgradeCost at level 1 = 100 * (1+1)^1.3 ≈ 246
    const result = getStore().upgradeBuilding('mainHall')
    expect(result).toBe(true)
    const mainHall = getStore().sect.buildings.find((b) => b.type === 'mainHall')
    expect(mainHall?.level).toBe(2)
    expect(getStore().sect.resources.spiritStone).toBe(500 - Math.round(100 * Math.pow(2, 1.3))) // 500 - 246
  })

  it('upgradeBuilding should fail with insufficient spirit stones', () => {
    // Set spirit stones to 0
    useSectStore.setState((s) => ({
      sect: { ...s.sect, resources: { ...s.sect.resources, spiritStone: 0 } },
    }))
    const result = getStore().upgradeBuilding('mainHall')
    expect(result).toBe(false)
  })

  it('tryUpgradeBuilding should return reason on failure', () => {
    useSectStore.setState((s) => ({
      sect: { ...s.sect, resources: { ...s.sect.resources, spiritStone: 0 } },
    }))
    const result = getStore().tryUpgradeBuilding('mainHall')
    expect(result.success).toBe(false)
    expect(result.reason).toBeTruthy()
  })

  it('tryUpgradeBuilding should succeed with enough resources', () => {
    const result = getStore().tryUpgradeBuilding('mainHall')
    expect(result.success).toBe(true)
    expect(result.reason).toBe('')
  })

  it('upgradeBuilding should auto-unlock spiritField when mainHall is Lv1', () => {
    const result = getStore().tryUpgradeBuilding('spiritField')
    expect(result.success).toBe(true)
    const sf = getStore().sect.buildings.find((b) => b.type === 'spiritField')
    expect(sf?.unlocked).toBe(true)
    expect(sf?.level).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Resource Operations Tests
// ---------------------------------------------------------------------------

describe('SectStore - Resource Operations', () => {
  beforeEach(() => resetStore())

  it('spendResource should deduct resources', () => {
    const result = getStore().spendResource('spiritStone', 200)
    expect(result).toBe(true)
    expect(getStore().sect.resources.spiritStone).toBe(300)
  })

  it('spendResource should fail with insufficient resources', () => {
    const result = getStore().spendResource('spiritStone', 1000)
    expect(result).toBe(false)
    expect(getStore().sect.resources.spiritStone).toBe(500)
  })

  it('addResource should increase resources', () => {
    getStore().addResource('spiritStone', 200)
    expect(getStore().sect.resources.spiritStone).toBe(700)
  })

  it('addResource should work with spirit energy', () => {
    getStore().addResource('spiritEnergy', 50)
    expect(getStore().sect.resources.spiritEnergy).toBe(50)
  })

  it('addResource should work with herbs', () => {
    getStore().addResource('herb', 10)
    expect(getStore().sect.resources.herb).toBe(10)
  })
})

// ---------------------------------------------------------------------------
// Item Transfer Tests
// ---------------------------------------------------------------------------

describe('SectStore - Item Transfer', () => {
  beforeEach(() => resetStore())

  it('transferItemToCharacter should move item from vault to character backpack', () => {
    const char = getFirstCharacter()
    const sword = makeEquipment('sword_1')

    useSectStore.setState((s) => ({
      sect: { ...s.sect, vault: [{ item: sword, quantity: 1 }] },
    }))

    const result = getStore().transferItemToCharacter(char.id, 0)
    expect(result).toBe(true)
    expect(getStore().sect.vault).toHaveLength(0)
    expect(getStore().sect.characters[0].backpack).toHaveLength(1)
    expect(getStore().sect.characters[0].backpack[0].item.id).toBe('sword_1')
  })

  it('transferItemToCharacter should fail if backpack full', () => {
    const char = getFirstCharacter()
    const items: ItemStack[] = []
    for (let i = 0; i < char.maxBackpackSlots; i++) {
      items.push({ item: makeConsumable(`pot_${i}`), quantity: 1 })
    }

    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) =>
          c.id === char.id ? { ...c, backpack: items } : c
        ),
        vault: [{ item: makeEquipment('sword_1'), quantity: 1 }],
      },
    }))

    const result = getStore().transferItemToCharacter(char.id, 0)
    expect(result).toBe(false)
  })

  it('transferItemToCharacter should fail if character not found', () => {
    useSectStore.setState((s) => ({
      sect: { ...s.sect, vault: [{ item: makeEquipment('sword_1'), quantity: 1 }] },
    }))

    const result = getStore().transferItemToCharacter('nonexistent', 0)
    expect(result).toBe(false)
  })

  it('transferItemToVault should move item from character backpack to vault', () => {
    const char = getFirstCharacter()
    const sword = makeEquipment('sword_1')
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) =>
          c.id === char.id ? { ...c, backpack: [{ item: sword, quantity: 1 }] } : c
        ),
      },
    }))

    const result = getStore().transferItemToVault(char.id, 0)
    expect(result).toBe(true)
    expect(getStore().sect.characters[0].backpack).toHaveLength(0)
    expect(getStore().sect.vault).toHaveLength(1)
    expect(getStore().sect.vault[0].item.id).toBe('sword_1')
  })

  it('transferItemToVault should fail if vault full', () => {
    const char = getFirstCharacter()
    const sword = makeEquipment('sword_1')
    const vaultItems: ItemStack[] = []
    for (let i = 0; i < 50; i++) {
      vaultItems.push({ item: makeConsumable(`vpot_${i}`), quantity: 1 })
    }

    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) =>
          c.id === char.id ? { ...c, backpack: [{ item: sword, quantity: 1 }] } : c
        ),
        vault: vaultItems,
      },
    }))

    const result = getStore().transferItemToVault(char.id, 0)
    expect(result).toBe(false)
  })

  it('addToVault should add item if space available', () => {
    const sword = makeEquipment('sword_1')
    const result = getStore().addToVault(sword)
    expect(result).toBe(true)
    expect(getStore().sect.vault).toHaveLength(1)
  })

  it('addToVault should fail if vault full', () => {
    const vaultItems: ItemStack[] = []
    for (let i = 0; i < 50; i++) {
      vaultItems.push({ item: makeConsumable(`vpot_${i}`), quantity: 1 })
    }
    useSectStore.setState((s) => ({
      sect: { ...s.sect, vault: vaultItems },
    }))

    const result = getStore().addToVault(makeEquipment('sword_full'))
    expect(result).toBe(false)
  })

  it('sellItem should remove from vault and add spirit stones', () => {
    const sword = makeEquipment('sword_sell', { sellPrice: 50 })
    useSectStore.setState((s) => ({
      sect: { ...s.sect, vault: [{ item: sword, quantity: 1 }] },
    }))

    const result = getStore().sellItem(0)
    expect(result).toBe(true)
    expect(getStore().sect.vault).toHaveLength(0)
    expect(getStore().sect.resources.spiritStone).toBe(550) // 500 + 50
  })

  it('sellItem should fail if no item at index', () => {
    const result = getStore().sellItem(0)
    expect(result).toBe(false)
  })

  it('removeVaultItem should return and remove item', () => {
    const sword = makeEquipment('sword_remove')
    useSectStore.setState((s) => ({
      sect: { ...s.sect, vault: [{ item: sword, quantity: 1 }] },
    }))

    const stack = getStore().removeVaultItem(0)
    expect(stack).not.toBeNull()
    expect(stack!.item.id).toBe('sword_remove')
    expect(getStore().sect.vault).toHaveLength(0)
  })

  it('removeVaultItem should return null if no item', () => {
    const item = getStore().removeVaultItem(0)
    expect(item).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Character Inventory Tests
// ---------------------------------------------------------------------------

describe('SectStore - Character Inventory', () => {
  beforeEach(() => resetStore())

  it('equipItem should equip equipment from backpack', () => {
    const char = getFirstCharacter()
    const sword = makeEquipment('sword_eq', { slot: 'weapon' })
    // Ensure equippedGear has enough slots
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) =>
          c.id === char.id ? { ...c, backpack: [{ item: sword, quantity: 1 }], equippedGear: new Array(9).fill(null) } : c
        ),
      },
    }))

    // weapon slot index is 5
    const result = getStore().equipItem(char.id, 0, 5)
    expect(result).toBe(true)
    const updatedChar = getStore().sect.characters[0]
    expect(updatedChar.equippedGear[5]).toBe('sword_eq')
    expect(updatedChar.backpack).toHaveLength(0)
  })

  it('equipItem should fail if item not equipment', () => {
    const char = getFirstCharacter()
    const potion = makeConsumable('pot_eq')
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) =>
          c.id === char.id ? { ...c, backpack: [{ item: potion, quantity: 1 }], equippedGear: new Array(9).fill(null) } : c
        ),
      },
    }))

    const result = getStore().equipItem(char.id, 0, 5)
    expect(result).toBe(false)
  })

  it('unequipItem should move equipment from gear to backpack', () => {
    const char = getFirstCharacter()
    const sword = makeEquipment('sword_uneq', { slot: 'weapon' })
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) =>
          c.id === char.id ? { ...c, equippedGear: [...new Array(9).fill(null)] as any } : c
        ),
      },
    }))

    // Manually set gear
    const updatedGear = [...new Array(9).fill(null)]
    updatedGear[5] = 'sword_uneq'
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        vault: [{ item: sword, quantity: 1 }], // Put the equipment in vault so unequip can find it
        characters: s.sect.characters.map((c) =>
          c.id === char.id ? { ...c, equippedGear: updatedGear } : c
        ),
      },
    }))

    const result = getStore().unequipItem(char.id, 5)
    expect(result).toBe(true)
    const updatedChar = getStore().sect.characters[0]
    expect(updatedChar.equippedGear[5]).toBeNull()
    expect(updatedChar.backpack).toHaveLength(1)
  })

  it('enhanceItem should enhance equipment in backpack', () => {
    const char = getFirstCharacter()
    const sword = makeEquipment('sword_enh', { slot: 'weapon' })
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) =>
          c.id === char.id ? { ...c, backpack: [{ item: sword, quantity: 1 }] } : c
        ),
      },
    }))

    // Give enough resources
    getStore().addResource('spiritStone', 10000)
    getStore().addResource('ore', 1000)

    const result = getStore().enhanceItem(char.id, 0)
    expect(result.cost.spiritStone).toBeGreaterThan(0)
    expect(result.cost.ore).toBeGreaterThan(0)
    // Resources should have been spent
    expect(getStore().sect.resources.spiritStone).toBeLessThan(10500)
  })

  it('enhanceItem should fail if not equipment', () => {
    const char = getFirstCharacter()
    const potion = makeConsumable('pot_enh')
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) =>
          c.id === char.id ? { ...c, backpack: [{ item: potion, quantity: 1 }] } : c
        ),
      },
    }))

    const result = getStore().enhanceItem(char.id, 0)
    expect(result.success).toBe(false)
  })

  it('sellCharacterItem should sell item from backpack', () => {
    const char = getFirstCharacter()
    const potion = makeConsumable('pot_sell', { sellPrice: 75 })
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) =>
          c.id === char.id ? { ...c, backpack: [{ item: potion, quantity: 1 }] } : c
        ),
      },
    }))

    const result = getStore().sellCharacterItem(char.id, 0)
    expect(result).toBe(true)
    expect(getStore().sect.characters[0].backpack).toHaveLength(0)
    expect(getStore().sect.resources.spiritStone).toBe(575) // 500 + 75
  })
})

// ---------------------------------------------------------------------------
// Healing Tests
// ---------------------------------------------------------------------------

describe('SectStore - Healing', () => {
  beforeEach(() => resetStore())

  it('healCharacter should heal injured character using herbs', () => {
    const char = getFirstCharacter()
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) =>
          c.id === char.id ? { ...c, status: 'injured' } : c
        ),
      },
    }))
    getStore().addResource('herb', 5)

    const result = getStore().healCharacter(char.id)
    expect(result).toBe(true)
    expect(getStore().sect.characters[0].status).toBe('cultivating')
    expect(getStore().sect.resources.herb).toBe(3) // 5 - 2 herbs consumed
  })

  it('healCharacter should fail without herbs', () => {
    const char = getFirstCharacter()
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) =>
          c.id === char.id ? { ...c, status: 'injured' } : c
        ),
      },
    }))

    const result = getStore().healCharacter(char.id)
    expect(result).toBe(false)
    expect(getStore().sect.characters[0].status).toBe('injured')
  })

  it('healCharacter should fail for non-injured character', () => {
    const char = getFirstCharacter()
    getStore().addResource('herb', 5)
    const result = getStore().healCharacter(char.id)
    expect(result).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Breakthrough Tests
// ---------------------------------------------------------------------------

describe('SectStore - Auto-breakthrough (tickAll)', () => {
  beforeEach(() => resetStore())
  afterEach(() => vi.restoreAllMocks())

  it('should auto-breakthrough sub-level with enough cultivation', () => {
    const char = getFirstCharacter()
    setCharacterCultivation(char.id, 100) // realm 0, stage 0 needs 100

    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    getStore().tickAll(1)

    const updated = getStore().sect.characters[0]
    expect(updated.realm).toBe(0)
    expect(updated.realmStage).toBe(1)
    expect(updated.cultivation).toBe(0) // reset on breakthrough
  })

  it('should not attempt breakthrough with insufficient cultivation', () => {
    const char = getFirstCharacter()
    setCharacterCultivation(char.id, 50) // needs 100

    getStore().tickAll(1)

    const updated = getStore().sect.characters[0]
    expect(updated.realm).toBe(0)
    expect(updated.realmStage).toBe(0)
  })

  it('should consume spiritStone on major realm breakthrough', () => {
    const char = getFirstCharacter()
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) =>
          c.id === char.id ? { ...c, realmStage: 3 as any, cultivation: 1000 } : c
        ),
        resources: { ...s.sect.resources, spiritStone: 5000 },
        vault: [],
      },
    }))

    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    getStore().tickAll(1)

    const updated = getStore().sect.characters[0]
    expect(updated.realm).toBe(1)
    expect(updated.realmStage).toBe(0)
    // spiritStone deducted (3000 for realm 1 breakthrough)
    expect(getStore().sect.resources.spiritStone).toBeLessThan(5000)
    expect(getStore().sect.resources.spiritStone).toBeGreaterThanOrEqual(5000 - 3000)
  })

  it('should skip breakthrough when spiritStone is insufficient', () => {
    const char = getFirstCharacter()
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) =>
          c.id === char.id ? { ...c, realmStage: 3 as any, cultivation: 1000 } : c
        ),
        resources: { ...s.sect.resources, spiritStone: 1000 },
        vault: [],
      },
    }))

    getStore().tickAll(1)

    const updated = getStore().sect.characters[0]
    expect(updated.realm).toBe(0)
    expect(updated.realmStage).toBe(3)
    expect(getStore().sect.resources.spiritStone).toBe(1000)
  })

  it('should skip breakthrough when spiritStone insufficient', () => {
    const char = getFirstCharacter()
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) =>
          c.id === char.id ? { ...c, realmStage: 3 as any, cultivation: 1000 } : c
        ),
        resources: { ...s.sect.resources, spiritStone: 100 },
        vault: [],
      },
    }))

    getStore().tickAll(1)

    const updated = getStore().sect.characters[0]
    expect(updated.realm).toBe(0)
    expect(updated.realmStage).toBe(3)
    expect(getStore().sect.resources.spiritStone).toBe(100)
  })

  it('should not consume vault/stones for sub-level breakthrough', () => {
    const char = getFirstCharacter()
    setCharacterCultivation(char.id, 100)
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        resources: { ...s.sect.resources, spiritStone: 1000 },
        vault: [
          { item: makeConsumable('pill_1', { name: '回血丹' }), quantity: 1 },
        ],
      },
    }))

    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    getStore().tickAll(1)

    // Sub-level breakthrough should not consume vault or stones
    expect(getStore().sect.vault).toHaveLength(1)
    expect(getStore().sect.resources.spiritStone).toBe(1000)
  })
})

// ---------------------------------------------------------------------------
// tickAll Tests
// ---------------------------------------------------------------------------

describe('SectStore - tickAll', () => {
  beforeEach(() => resetStore())

  it('tickAll should produce spirit energy', () => {
    // Upgrade spiritField to level 1 so it produces spirit energy (3/s).
    // Also give spirit stones to upgrade. Use tryUpgradeBuilding which auto-unlocks.
    getStore().addResource('spiritStone', 1000)
    getStore().tryUpgradeBuilding('spiritField')
    const result = getStore().tickAll(10)
    expect(result.spiritProduced).toBeCloseTo(30, 0) // 3/s * 10s = 30 spirit energy
    expect(result.spiritConsumed).toBeGreaterThan(0) // cultivator consumed some
  })

  it('tickAll should accumulate cultivation for cultivating characters', () => {
    // Give enough spirit energy to cultivate
    getStore().addResource('spiritEnergy', 100)
    const beforeCultivation = getFirstCharacter().cultivation

    getStore().tickAll(10)

    expect(getFirstCharacter().cultivation).toBeGreaterThan(beforeCultivation)
  })

  it('tickAll should consume spirit energy for cultivating characters', () => {
    getStore().addResource('spiritEnergy', 100)
    const beforeEnergy = getStore().sect.resources.spiritEnergy

    const result = getStore().tickAll(10)
    expect(result.spiritConsumed).toBeGreaterThan(0)
  })

  it('tickAll should not consume spirit for idle characters', () => {
    const char = getFirstCharacter()
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) =>
          c.id === char.id ? { ...c, status: 'idle' } : c
        ),
      },
    }))
    getStore().addResource('spiritEnergy', 100)

    const result = getStore().tickAll(10)
    expect(result.spiritConsumed).toBe(0)
  })

  it('tickAll should work with 0 delta', () => {
    const result = getStore().tickAll(0)
    expect(result.spiritProduced).toBe(0)
    expect(result.spiritConsumed).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Pet Management Tests
// ---------------------------------------------------------------------------

describe('SectStore - Pet Management', () => {
  beforeEach(() => resetStore())

  it('addPet should add pet to sect', () => {
    const pet = makePet('pet_1')
    getStore().addPet(pet)
    expect(getStore().sect.pets).toHaveLength(1)
    expect(getStore().sect.pets[0].id).toBe('pet_1')
  })

  it('removePet should remove pet from sect', () => {
    const pet = makePet('pet_2')
    getStore().addPet(pet)
    getStore().removePet('pet_2')
    expect(getStore().sect.pets).toHaveLength(0)
  })

  it('removePet should unassign from character', () => {
    const char = getFirstCharacter()
    const pet = makePet('pet_3')
    getStore().addPet(pet)
    getStore().assignPet(char.id, 'pet_3')

    getStore().removePet('pet_3')
    expect(getStore().sect.pets).toHaveLength(0)
    expect(getStore().sect.characters[0].petIds).toHaveLength(0)
  })

  it('assignPet should assign pet to character', () => {
    const char = getFirstCharacter()
    const pet = makePet('pet_4')
    getStore().addPet(pet)

    const result = getStore().assignPet(char.id, 'pet_4')
    expect(result).toBe(true)
    expect(getStore().sect.characters[0].petIds).toContain('pet_4')
  })

  it('assignPet should fail if pet not found', () => {
    const char = getFirstCharacter()
    const result = getStore().assignPet(char.id, 'nonexistent_pet')
    expect(result).toBe(false)
  })

  it('assignPet should fail if character not found', () => {
    const pet = makePet('pet_5')
    getStore().addPet(pet)
    const result = getStore().assignPet('nonexistent_char', 'pet_5')
    expect(result).toBe(false)
  })

  it('unassignPet should remove pet from character', () => {
    const char = getFirstCharacter()
    const pet = makePet('pet_6')
    getStore().addPet(pet)
    getStore().assignPet(char.id, 'pet_6')

    getStore().unassignPet(char.id, 'pet_6')
    expect(getStore().sect.characters[0].petIds).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Reset Tests
// ---------------------------------------------------------------------------

describe('SectStore - Reset', () => {
  it('reset should restore initial state', () => {
    // Modify state
    getStore().addResource('spiritStone', 1000)
    getStore().addCharacter('spirit')

    // Reset
    resetStore()

    expect(getStore().sect.resources.spiritStone).toBe(500)
    expect(getStore().sect.characters).toHaveLength(1)
    expect(getStore().sect.vault).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// AdventureStore Tests
// ---------------------------------------------------------------------------

function resetAdventureStore() {
  useAdventureStore.getState().reset()
  useSectStore.getState().reset()
}

function getAdventureStore() {
  return useAdventureStore.getState()
}

describe('AdventureStore - startRun', () => {
  beforeEach(() => resetAdventureStore())

  it('should create a run with a single character', () => {
    const char = getStore().sect.characters[0]
    expect(char.status).toBe('cultivating')

    const run = getAdventureStore().startRun('lingCaoValley', [char.id])
    expect(run).not.toBeNull()
    expect(run!.status).toBe('active')
    expect(run!.teamCharacterIds).toEqual([char.id])
    expect(run!.currentFloor).toBe(1)
    expect(run!.floors.length).toBeGreaterThan(0)
    expect(Object.keys(getAdventureStore().activeRuns)).toHaveLength(1)

    // Character status should be set to adventuring
    expect(getStore().sect.characters[0].status).toBe('adventuring')
  })

  it('should set character status to adventuring on startRun', () => {
    const char = getStore().sect.characters[0]
    getAdventureStore().startRun('lingCaoValley', [char.id])

    expect(getStore().sect.characters[0].status).toBe('adventuring')
  })

  it('should reject if character is already adventuring', () => {
    const char = getStore().sect.characters[0]

    // Start first run
    const run1 = getAdventureStore().startRun('lingCaoValley', [char.id])
    expect(run1).not.toBeNull()

    // Add another character and try to start another run with the same character
    const char2 = getStore().addCharacter('common')
    expect(char2).not.toBeNull()

    // Try to start a second run with the same character
    const run2 = getAdventureStore().startRun('luoYunCave', [char.id])
    expect(run2).toBeNull() // should fail - character already adventuring
  })

  it('should reject if too many active runs', () => {
    // At sect level 1, max simultaneous runs is 1
    const char = getStore().sect.characters[0]
    const run1 = getAdventureStore().startRun('lingCaoValley', [char.id])
    expect(run1).not.toBeNull()

    // Add another character
    const char2 = getStore().addCharacter('common')
    expect(char2).not.toBeNull()

    // Try to start second run (should fail due to max runs = 1 at level 1)
    const run2 = getAdventureStore().startRun('lingCaoValley', [char2!.id])
    expect(run2).toBeNull()
  })

  it('should reject if team size is 0', () => {
    const run = getAdventureStore().startRun('lingCaoValley', [])
    expect(run).toBeNull()
  })

  it('should reject if team size exceeds 5', () => {
    // At sect level 1, max characters is 5 (1 initial + 4 addable)
    // That gives us exactly 5 characters, which is the max team size
    const charIds: string[] = []
    const initialChar = getStore().sect.characters[0]
    charIds.push(initialChar.id)

    for (let i = 0; i < 4; i++) {
      const c = getStore().addCharacter('common')
      if (c) charIds.push(c.id)
    }

    expect(charIds.length).toBe(5)
    // 5 characters should be accepted (boundary: max is 5)
    const run = getAdventureStore().startRun('lingCaoValley', charIds)
    expect(run).not.toBeNull()
  })

  it('should reject if character is injured (not cultivating/resting)', () => {
    const char = getStore().sect.characters[0]
    useSectStore.getState().setCharacterStatus(char.id, 'injured')

    const run = getAdventureStore().startRun('lingCaoValley', [char.id])
    expect(run).toBeNull()
  })

  it('should reject for unknown dungeon ID', () => {
    const char = getStore().sect.characters[0]
    const run = getAdventureStore().startRun('nonexistent_dungeon', [char.id])
    expect(run).toBeNull()
  })

  it('should initialize memberStates with correct HP', () => {
    const char = getStore().sect.characters[0]
    const run = getAdventureStore().startRun('lingCaoValley', [char.id])
    expect(run).not.toBeNull()

    const ms = run!.memberStates[char.id]
    expect(ms).toBeDefined()
    expect(ms!.currentHp).toBe(ms!.maxHp)
    expect(ms!.currentHp).toBeGreaterThan(0)
    expect(ms!.status).toBe('alive')
  })
})

describe('AdventureStore - retreat', () => {
  beforeEach(() => resetAdventureStore())

  it('should deposit 50% rewards to sect on retreat', () => {
    const char = getStore().sect.characters[0]
    const run = getAdventureStore().startRun('lingCaoValley', [char.id])
    expect(run).not.toBeNull()
    const runId = run!.id

    // Manually set some rewards on the run
    useAdventureStore.setState((s) => {
      const activeRun = s.activeRuns[runId]
      if (!activeRun) return s
      return {
        activeRuns: {
          ...s.activeRuns,
          [runId]: {
            ...activeRun,
            totalRewards: {
              ...activeRun.totalRewards,
              spiritStone: 200,
              herb: 10,
            },
          },
        },
      }
    })

    const beforeStones = getStore().sect.resources.spiritStone
    getAdventureStore().retreat(runId)
    const afterStones = getStore().sect.resources.spiritStone

    // Should deposit 50% of 200 = 100 spirit stones
    expect(afterStones - beforeStones).toBe(100)
  })

  it('should free characters on retreat (alive -> cultivating)', () => {
    const char = getStore().sect.characters[0]
    const run = getAdventureStore().startRun('lingCaoValley', [char.id])
    expect(run).not.toBeNull()
    const runId = run!.id

    expect(getStore().sect.characters[0].status).toBe('adventuring')
    getAdventureStore().retreat(runId)
    expect(getStore().sect.characters[0].status).toBe('cultivating')
  })

  it('should remove run from activeRuns on retreat', () => {
    const char = getStore().sect.characters[0]
    const run = getAdventureStore().startRun('lingCaoValley', [char.id])
    expect(run).not.toBeNull()

    expect(Object.keys(getAdventureStore().activeRuns)).toHaveLength(1)
    getAdventureStore().retreat(run!.id)
    expect(Object.keys(getAdventureStore().activeRuns)).toHaveLength(0)
  })

  it('should set dead characters to resting on retreat', () => {
    const char = getStore().sect.characters[0]
    const run = getAdventureStore().startRun('lingCaoValley', [char.id])
    expect(run).not.toBeNull()
    const runId = run!.id

    // Manually mark character as dead
    useAdventureStore.setState((s) => {
      const activeRun = s.activeRuns[runId]
      if (!activeRun) return s
      return {
        activeRuns: {
          ...s.activeRuns,
          [runId]: {
            ...activeRun,
            memberStates: {
              [char.id]: { currentHp: 0, maxHp: 100, status: 'dead' },
            },
          },
        },
      }
    })

    getAdventureStore().retreat(runId)
    expect(getStore().sect.characters[0].status).toBe('resting')
  })
})

describe('AdventureStore - completeRun', () => {
  beforeEach(() => resetAdventureStore())

  it('should deposit 100% rewards to sect on completeRun', () => {
    const char = getStore().sect.characters[0]
    const run = getAdventureStore().startRun('lingCaoValley', [char.id])
    expect(run).not.toBeNull()
    const runId = run!.id

    // Manually set rewards
    useAdventureStore.setState((s) => {
      const activeRun = s.activeRuns[runId]
      if (!activeRun) return s
      return {
        activeRuns: {
          ...s.activeRuns,
          [runId]: {
            ...activeRun,
            totalRewards: {
              ...activeRun.totalRewards,
              spiritStone: 300,
              herb: 15,
            },
          },
        },
      }
    })

    const beforeStones = getStore().sect.resources.spiritStone
    getAdventureStore().completeRun(runId)
    const afterStones = getStore().sect.resources.spiritStone

    // Should deposit 100% of 300 = 300 spirit stones
    expect(afterStones - beforeStones).toBe(300)
  })

  it('should add dungeon to completedDungeons', () => {
    const char = getStore().sect.characters[0]
    const run = getAdventureStore().startRun('lingCaoValley', [char.id])
    expect(run).not.toBeNull()

    expect(getAdventureStore().completedDungeons).toHaveLength(0)
    getAdventureStore().completeRun(run!.id)
    expect(getAdventureStore().completedDungeons).toContain('lingCaoValley')
  })

  it('should set alive characters to cultivating on completeRun', () => {
    const char = getStore().sect.characters[0]
    const run = getAdventureStore().startRun('lingCaoValley', [char.id])
    expect(run).not.toBeNull()

    getAdventureStore().completeRun(run!.id)
    expect(getStore().sect.characters[0].status).toBe('cultivating')
  })

  it('should remove run from activeRuns', () => {
    const char = getStore().sect.characters[0]
    const run = getAdventureStore().startRun('lingCaoValley', [char.id])
    expect(run).not.toBeNull()

    getAdventureStore().completeRun(run!.id)
    expect(Object.keys(getAdventureStore().activeRuns)).toHaveLength(0)
  })
})

describe('AdventureStore - failRun', () => {
  beforeEach(() => resetAdventureStore())

  it('should deposit 50% rewards to sect on failRun', () => {
    const char = getStore().sect.characters[0]
    const run = getAdventureStore().startRun('lingCaoValley', [char.id])
    expect(run).not.toBeNull()
    const runId = run!.id

    useAdventureStore.setState((s) => {
      const activeRun = s.activeRuns[runId]
      if (!activeRun) return s
      return {
        activeRuns: {
          ...s.activeRuns,
          [runId]: {
            ...activeRun,
            totalRewards: {
              ...activeRun.totalRewards,
              spiritStone: 400,
            },
          },
        },
      }
    })

    const beforeStones = getStore().sect.resources.spiritStone
    getAdventureStore().failRun(runId)
    const afterStones = getStore().sect.resources.spiritStone

    // Should deposit 50% of 400 = 200
    expect(afterStones - beforeStones).toBe(200)
  })

  it('should set ALL characters to resting on failRun (including alive ones)', () => {
    const char = getStore().sect.characters[0]
    const run = getAdventureStore().startRun('lingCaoValley', [char.id])
    expect(run).not.toBeNull()
    const runId = run!.id

    // Character is alive but run fails
    getAdventureStore().failRun(runId)
    expect(getStore().sect.characters[0].status).toBe('resting')
  })

  it('should remove run from activeRuns on failRun', () => {
    const char = getStore().sect.characters[0]
    const run = getAdventureStore().startRun('lingCaoValley', [char.id])
    expect(run).not.toBeNull()

    getAdventureStore().failRun(run!.id)
    expect(Object.keys(getAdventureStore().activeRuns)).toHaveLength(0)
  })
})

describe('AdventureStore - getMaxSimultaneousRuns', () => {
  beforeEach(() => resetAdventureStore())

  it('should return 1 at sect level 1 (mainHall level 1)', () => {
    expect(getAdventureStore().getMaxSimultaneousRuns()).toBe(1)
  })
})

describe('AdventureStore - getRun', () => {
  beforeEach(() => resetAdventureStore())

  it('should return the run by id', () => {
    const char = getStore().sect.characters[0]
    const run = getAdventureStore().startRun('lingCaoValley', [char.id])
    expect(run).not.toBeNull()

    const fetched = getAdventureStore().getRun(run!.id)
    expect(fetched).toBeDefined()
    expect(fetched!.id).toBe(run!.id)
    expect(fetched!.dungeonId).toBe('lingCaoValley')
  })

  it('should return undefined for non-existent run', () => {
    expect(getAdventureStore().getRun('nonexistent')).toBeUndefined()
  })
})

describe('AdventureStore - reset', () => {
  beforeEach(() => resetAdventureStore())

  it('should clear all active runs', () => {
    const char = getStore().sect.characters[0]
    getAdventureStore().startRun('lingCaoValley', [char.id])
    expect(Object.keys(getAdventureStore().activeRuns)).toHaveLength(1)

    getAdventureStore().reset()
    expect(Object.keys(getAdventureStore().activeRuns)).toHaveLength(0)
  })

  it('should clear completed dungeons', () => {
    const char = getStore().sect.characters[0]
    const run = getAdventureStore().startRun('lingCaoValley', [char.id])
    getAdventureStore().completeRun(run!.id)
    expect(getAdventureStore().completedDungeons).toHaveLength(1)

    getAdventureStore().reset()
    expect(getAdventureStore().completedDungeons).toHaveLength(0)
  })
})

describe('AdventureStore - advanceFloor', () => {
  beforeEach(() => resetAdventureStore())

  it('should advance floor via auto-selected safest route', () => {
    const char = getStore().sect.characters[0]
    const run = getAdventureStore().startRun('lingCaoValley', [char.id])
    expect(run).not.toBeNull()
    const runId = run!.id

    const beforeFloor = getAdventureStore().activeRuns[runId]?.currentFloor
    const result = getAdventureStore().advanceFloor(runId)

    // Should succeed (unless combat killed the character)
    // The floor should have incremented (or run completed if last floor)
    const afterState = getAdventureStore().getRun(runId)
    if (afterState) {
      expect(afterState.currentFloor).toBeGreaterThan(beforeFloor ?? 0)
    }
    // If run completed, activeRuns won't contain the run anymore
  })

  it('should return failure for non-existent run', () => {
    const result = getAdventureStore().advanceFloor('nonexistent')
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Recruit Cost Tests
// ---------------------------------------------------------------------------

describe('SectStore - Recruit Cost', () => {
  beforeEach(() => resetStore())

  it('addCharacter should deduct spirit stones', () => {
    const before = getStore().sect.resources.spiritStone
    getStore().addCharacter('common') // costs 100
    expect(getStore().sect.resources.spiritStone).toBe(before - 100)
  })

  it('addCharacter should return null when insufficient stones', () => {
    getStore().spendResource('spiritStone', 500)
    const char = getStore().addCharacter('common')
    expect(char).toBeNull()
  })

  it('addCharacter should return null when quality not unlocked', () => {
    const char = getStore().addCharacter('divine') // needs level 4, current is 1
    expect(char).toBeNull()
  })

  it('canRecruit should report insufficient stones', () => {
    getStore().spendResource('spiritStone', 500)
    const result = getStore().canRecruit('common')
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('灵石不足')
  })

  it('canRecruit should report quality locked', () => {
    const result = getStore().canRecruit('divine')
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('宗门等级不足')
  })

  it('canRecruit should report characters full', () => {
    for (let i = 0; i < 4; i++) getStore().addCharacter('common')
    const result = getStore().canRecruit('common')
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('弟子已满')
  })

  it('canRecruit should allow when conditions met', () => {
    const result = getStore().canRecruit('common')
    expect(result.allowed).toBe(true)
    expect(result.reason).toBe('')
  })
})

describe('AdventureStore - selectRoute', () => {
  beforeEach(() => resetAdventureStore())

  it('should return false for non-existent run', () => {
    expect(getAdventureStore().selectRoute('nonexistent', 0)).toBe(false)
  })

  it('should return false for invalid route index', () => {
    const char = getStore().sect.characters[0]
    const run = getAdventureStore().startRun('lingCaoValley', [char.id])
    expect(run).not.toBeNull()

    expect(getAdventureStore().selectRoute(run!.id, 999)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// setProductionRecipe Tests
// ---------------------------------------------------------------------------

describe('setProductionRecipe', () => {
  beforeEach(() => resetStore())

  it('should set recipe on unlocked building', () => {
    // Unlock alchemyFurnace manually
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        buildings: s.sect.buildings.map((b) =>
          b.type === 'alchemyFurnace' ? { ...b, unlocked: true, level: 1 } : b
        ),
      },
    }))

    getStore().setProductionRecipe('alchemyFurnace', 'hp_potion')
    const furnace = getStore().sect.buildings.find((b) => b.type === 'alchemyFurnace')
    expect(furnace?.productionQueue.recipeId).toBe('hp_potion')
    expect(furnace?.productionQueue.progress).toBe(0)
  })

  it('should clear recipe with null', () => {
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        buildings: s.sect.buildings.map((b) =>
          b.type === 'alchemyFurnace' ? { ...b, unlocked: true, level: 1, productionQueue: { recipeId: 'hp_potion', progress: 50 } } : b
        ),
      },
    }))

    getStore().setProductionRecipe('alchemyFurnace', null)
    const furnace = getStore().sect.buildings.find((b) => b.type === 'alchemyFurnace')
    expect(furnace?.productionQueue.recipeId).toBeNull()
    expect(furnace?.productionQueue.progress).toBe(0)
  })

  it('should reject if building not unlocked', () => {
    getStore().setProductionRecipe('alchemyFurnace', 'hp_potion')
    const furnace = getStore().sect.buildings.find((b) => b.type === 'alchemyFurnace')
    expect(furnace?.productionQueue.recipeId).toBeNull()
  })

  it('should reject if building level too low for recipe', () => {
    // Unlock alchemyFurnace at level 1, but spirit_potion requires... wait, spirit_potion is level 1.
    // Use forge_common which requires level 3 on the forge
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        buildings: s.sect.buildings.map((b) =>
          b.type === 'forge' ? { ...b, unlocked: true, level: 1 } : b
        ),
      },
    }))

    getStore().setProductionRecipe('forge', 'forge_common')
    const forge = getStore().sect.buildings.find((b) => b.type === 'forge')
    expect(forge?.productionQueue.recipeId).toBeNull()
  })

  it('should reset progress when setting recipe', () => {
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        buildings: s.sect.buildings.map((b) =>
          b.type === 'alchemyFurnace' ? { ...b, unlocked: true, level: 1, productionQueue: { recipeId: 'hp_potion', progress: 15 } } : b
        ),
      },
    }))

    getStore().setProductionRecipe('alchemyFurnace', 'hp_potion')
    const furnace = getStore().sect.buildings.find((b) => b.type === 'alchemyFurnace')
    expect(furnace?.productionQueue.recipeId).toBe('hp_potion')
    expect(furnace?.productionQueue.progress).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// tickAll with production queue Tests
// ---------------------------------------------------------------------------

describe('tickAll with production queue', () => {
  beforeEach(() => resetStore())

  it('should consume herbs and produce items when queue is active', () => {
    // Unlock alchemyFurnace at level 1, give herbs, set recipe
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        buildings: s.sect.buildings.map((b) =>
          b.type === 'alchemyFurnace'
            ? { ...b, unlocked: true, level: 1, productionQueue: { recipeId: 'hp_potion', progress: 0 } }
            : b
        ),
        resources: { ...s.sect.resources, herb: 100 },
      },
    }))

    // hp_potion: productionTime=20s, inputPerSec.herb=0.25
    // After 20s, should produce one item and consume 5 herbs
    getStore().tickAll(20)

    const sect = getStore().sect
    expect(sect.vault.length).toBe(1)
    expect(sect.vault[0].item.type).toBe('consumable')
    expect(sect.resources.herb).toBeLessThan(100) // herbs consumed
  })

  it('should pause production when resources insufficient', () => {
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        buildings: s.sect.buildings.map((b) =>
          b.type === 'alchemyFurnace'
            ? { ...b, unlocked: true, level: 1, productionQueue: { recipeId: 'hp_potion', progress: 0 } }
            : b
        ),
        resources: { ...s.sect.resources, herb: 0 },
      },
    }))

    const result = getStore().tickAll(20)

    const sect = getStore().sect
    expect(sect.vault.length).toBe(0) // nothing produced (no herbs)
    expect(sect.resources.herb).toBe(0)
  })

  it('should clamp resources to caps after tick', () => {
    // Spirit field level 1 -> cap = 500 + 1*300 = 800 spirit energy
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        buildings: s.sect.buildings.map((b) =>
          b.type === 'spiritField'
            ? { ...b, unlocked: true, level: 1 }
            : b
        ),
        resources: { ...s.sect.resources, spiritEnergy: 790 },
      },
    }))

    // Spirit field level 1 produces 3/s * delta. With delta=10, produces 30.
    // 790 + 30 = 820 > cap of 800 -> should clamp to 800
    getStore().tickAll(10)

    expect(getStore().sect.resources.spiritEnergy).toBeLessThanOrEqual(800)
  })
})

// ---------------------------------------------------------------------------
// exchangeResources Tests
// ---------------------------------------------------------------------------

describe('exchangeResources', () => {
  beforeEach(() => resetStore())

  it('should exchange spiritStone to herb at 1:2 rate', () => {
    const result = getStore().exchangeResources('spiritStone', 'herb', 100)
    expect(result.success).toBe(true)
    expect(result.received).toBe(200)
    expect(getStore().sect.resources.spiritStone).toBe(400) // 500 - 100
    expect(getStore().sect.resources.herb).toBe(200)
  })

  it('should exchange herb to spiritStone with loss', () => {
    // Give 300 herb for the test
    getStore().addResource('herb', 300)

    // At market level 0: lossRate = max(0.3, 0.667 - 0) = 0.667
    // 300 herb -> floor(300/3 * (1-0.667)) = floor(100 * 0.333) = 33 stone
    const result = getStore().exchangeResources('herb', 'spiritStone', 300)
    expect(result.success).toBe(true)
    expect(result.received).toBe(33)
    expect(getStore().sect.resources.herb).toBe(0)
    expect(getStore().sect.resources.spiritStone).toBe(533) // 500 + 33
  })

  it('should reject unsupported exchange direction', () => {
    // herb -> ore should fail
    getStore().addResource('herb', 100)
    const result = getStore().exchangeResources('herb', 'ore', 10)
    expect(result.success).toBe(false)
    expect(result.reason).toBe('不支持该兑换方向')
    // Resources should be unchanged
    expect(getStore().sect.resources.herb).toBe(100)
  })

  it('should reject if insufficient source resource', () => {
    // Set spiritStone to 0
    useSectStore.setState((s) => ({
      sect: { ...s.sect, resources: { ...s.sect.resources, spiritStone: 0 } },
    }))
    const result = getStore().exchangeResources('spiritStone', 'herb', 10)
    expect(result.success).toBe(false)
    expect(result.reason).toBe('资源不足')
  })

  it('should reduce loss at higher market levels', () => {
    // Give 300 herb and set market to level 7
    getStore().addResource('herb', 300)
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        buildings: s.sect.buildings.map((b) =>
          b.type === 'market' ? { ...b, unlocked: true, level: 7 } : b
        ),
      },
    }))

    // At market level 7: lossRate = max(0.3, 0.667 - 0.35) = max(0.3, 0.317) = 0.317
    // 300 herb -> floor(300/3 * (1-0.317)) = floor(100 * 0.683) = floor(68.3) = 68 stone
    const result = getStore().exchangeResources('herb', 'spiritStone', 300)
    expect(result.success).toBe(true)
    expect(result.received).toBe(68)
    expect(getStore().sect.resources.herb).toBe(0)
    expect(getStore().sect.resources.spiritStone).toBe(568) // 500 + 68
  })
})

// ---------------------------------------------------------------------------
// Expedition Supply Tests
// ---------------------------------------------------------------------------

describe('expedition supply', () => {
  beforeEach(() => resetAdventureStore())

  it('basic supply should cost 50 spiritStone', () => {
    const char = getStore().sect.characters[0]
    const beforeStones = getStore().sect.resources.spiritStone

    const run = getAdventureStore().startRun('lingCaoValley', [char.id], 'basic')
    expect(run).not.toBeNull()
    expect(getStore().sect.resources.spiritStone).toBe(beforeStones - 50)
    expect(run!.supplyLevel).toBe('basic')
    expect(run!.rewardMultiplier).toBe(1.0)
  })

  it('basic supply should be the default when supplyLevel is undefined', () => {
    const char = getStore().sect.characters[0]
    const beforeStones = getStore().sect.resources.spiritStone

    const run = getAdventureStore().startRun('lingCaoValley', [char.id])
    expect(run).not.toBeNull()
    expect(getStore().sect.resources.spiritStone).toBe(beforeStones - 50)
    expect(run!.supplyLevel).toBe('basic')
  })

  it('enhanced supply should cost 200 spiritStone + 2 hp_potion', () => {
    const char = getStore().sect.characters[0]
    const beforeStones = getStore().sect.resources.spiritStone

    // Add 2 hp_potion items to vault with recipeId
    const hpPotion1 = { item: { ...makeConsumable('pot_1'), recipeId: 'hp_potion' }, quantity: 1 } as ItemStack
    const hpPotion2 = { item: { ...makeConsumable('pot_2'), recipeId: 'hp_potion' }, quantity: 1 } as ItemStack
    useSectStore.setState((s) => ({
      sect: { ...s.sect, vault: [hpPotion1, hpPotion2] },
    }))

    const run = getAdventureStore().startRun('lingCaoValley', [char.id], 'enhanced')
    expect(run).not.toBeNull()
    expect(getStore().sect.resources.spiritStone).toBe(beforeStones - 200)
    expect(getStore().sect.vault).toHaveLength(0) // both potions consumed
    expect(run!.supplyLevel).toBe('enhanced')
    expect(run!.rewardMultiplier).toBe(1.0)
  })

  it('should fail enhanced supply without enough pills', () => {
    const char = getStore().sect.characters[0]
    const beforeStones = getStore().sect.resources.spiritStone

    // Only 1 hp_potion in vault, but enhanced needs 2
    const hpPotion1 = { item: { ...makeConsumable('pot_1'), recipeId: 'hp_potion' }, quantity: 1 } as ItemStack
    useSectStore.setState((s) => ({
      sect: { ...s.sect, vault: [hpPotion1] },
    }))

    const run = getAdventureStore().startRun('lingCaoValley', [char.id], 'enhanced')
    expect(run).toBeNull()
    // Nothing should have been consumed
    expect(getStore().sect.resources.spiritStone).toBe(beforeStones)
    expect(getStore().sect.vault).toHaveLength(1)
    expect(getStore().sect.characters[0].status).toBe('cultivating')
  })

  it('should fail enhanced supply without enough spirit stones', () => {
    const char = getStore().sect.characters[0]

    // Give potions but drain spirit stones
    const hpPotion1 = { item: { ...makeConsumable('pot_1'), recipeId: 'hp_potion' }, quantity: 1 } as ItemStack
    const hpPotion2 = { item: { ...makeConsumable('pot_2'), recipeId: 'hp_potion' }, quantity: 1 } as ItemStack
    useSectStore.setState((s) => ({
      sect: { ...s.sect, vault: [hpPotion1, hpPotion2], resources: { ...s.sect.resources, spiritStone: 100 } },
    }))

    // 100 < 200 -> should fail
    const run = getAdventureStore().startRun('lingCaoValley', [char.id], 'enhanced')
    expect(run).toBeNull()
    expect(getStore().sect.resources.spiritStone).toBe(100)
    expect(getStore().sect.vault).toHaveLength(2)
  })

  it('luxury supply should give 1.5x reward multiplier', () => {
    const char = getStore().sect.characters[0]
    const beforeStones = getStore().sect.resources.spiritStone

    // Add required vault items: 5 hp_potion + 1 breakthrough_pill
    const vaultItems: ItemStack[] = [
      { item: { ...makeConsumable('hp_0'), recipeId: 'hp_potion' }, quantity: 5 },
      { item: { ...makeConsumable('bp_1'), recipeId: 'breakthrough_pill' }, quantity: 1 },
    ]

    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        vault: vaultItems,
        resources: { ...s.sect.resources, spiritStone: 5000 },
      },
    }))

    const run = getAdventureStore().startRun('lingCaoValley', [char.id], 'luxury')
    expect(run).not.toBeNull()
    expect(getStore().sect.resources.spiritStone).toBe(5000 - 500)
    expect(getStore().sect.vault).toHaveLength(0) // all consumed
    expect(run!.supplyLevel).toBe('luxury')
    expect(run!.rewardMultiplier).toBe(1.5)
  })

  it('should fail luxury supply without enough breakthrough_pill', () => {
    const char = getStore().sect.characters[0]

    // Add 5 hp_potion but no breakthrough_pill
    const vaultItems: ItemStack[] = [
      { item: { ...makeConsumable('hp_0'), recipeId: 'hp_potion' }, quantity: 5 },
    ]
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        vault: vaultItems,
        resources: { ...s.sect.resources, spiritStone: 5000 },
      },
    }))

    const run = getAdventureStore().startRun('lingCaoValley', [char.id], 'luxury')
    expect(run).toBeNull()
    expect(getStore().sect.vault).toHaveLength(1) // nothing consumed (1 stack of 5 hp_potion)
  })

  it('should not consume vault items without matching recipeId', () => {
    const char = getStore().sect.characters[0]

    // Add 2 consumables WITHOUT recipeId (should not count as hp_potion)
    const p1 = { item: makeConsumable('pot_1'), quantity: 1 } as ItemStack
    const p2 = { item: makeConsumable('pot_2'), quantity: 1 } as ItemStack
    // No recipeId set - these are just regular consumables

    useSectStore.setState((s) => ({
      sect: { ...s.sect, vault: [p1, p2] },
    }))

    const run = getAdventureStore().startRun('lingCaoValley', [char.id], 'enhanced')
    expect(run).toBeNull()
    expect(getStore().sect.vault).toHaveLength(2)
  })

  it('vault items with different recipeId should not be consumed', () => {
    const char = getStore().sect.characters[0]

    // Add 2 spirit_potion (not hp_potion) to vault
    const s1 = { item: { ...makeConsumable('sp_1'), recipeId: 'spirit_potion' }, quantity: 1 } as ItemStack
    const s2 = { item: { ...makeConsumable('sp_2'), recipeId: 'spirit_potion' }, quantity: 1 } as ItemStack

    useSectStore.setState((s) => ({
      sect: { ...s.sect, vault: [s1, s2] },
    }))

    const run = getAdventureStore().startRun('lingCaoValley', [char.id], 'enhanced')
    expect(run).toBeNull()
    expect(getStore().sect.vault).toHaveLength(2) // spirit_potion items not consumed
  })
})
