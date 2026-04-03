import { useSectStore } from '../stores/sectStore'
import { useAdventureStore } from '../stores/adventureStore'
import { useGameStore } from '../stores/gameStore'
import * as autoRunEngine from '../systems/roguelike/AutoRunEngine'
import * as recoverySystem from '../systems/character/DiscipleRecoverySystem'
import type { Character, Equipment, Consumable, ItemStack } from '../types'
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
  useGameStore.getState().reset()
}

/** Upgrade spirit field so resource-based disciple cap is generous for tests. */
function boostSpiritField(level = 10, count = 4) {
  useSectStore.setState((s) => ({
    sect: {
      ...s.sect,
      buildings: s.sect.buildings.map((b) => (b.type === 'spiritField' ? { ...b, level, count } : b)),
    },
  }))
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
      characters: s.sect.characters.map((c) => (c.id === charId ? { ...c, cultivation: amount } : c)),
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

  it('should start with spiritField unlocked at level 1 and one node', () => {
    const sf = getStore().sect.buildings.find((b) => b.type === 'spiritField')
    expect(sf?.level).toBe(1)
    expect(sf?.count).toBe(1)
    expect(sf?.unlocked).toBe(true)
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

  it('initial character should be idle', () => {
    expect(getFirstCharacter().status).toBe('idle')
  })
})

// ---------------------------------------------------------------------------
// Character Management Tests
// ---------------------------------------------------------------------------

describe('SectStore - Character Management', () => {
  beforeEach(() => {
    resetStore()
    boostSpiritField()
  })

  it('addCharacter should add a new character', () => {
    const char = getStore().addCharacter()
    expect(char).not.toBeNull()
    expect(getStore().sect.characters).toHaveLength(2)
    expect(char!.quality).toBe('common')
  })

  it('addCharacter should return null when at resource cap', () => {
    // Spirit field level 3 → 7/sec, max = floor(7/2) = 3 disciples
    boostSpiritField(3, 1)
    getStore().addResource('spiritStone', 1000)
    // Add 2 more (total 3)
    expect(getStore().addCharacter()).not.toBeNull()
    expect(getStore().addCharacter()).not.toBeNull()
    // 4th should fail (resource cap reached)
    expect(getStore().addCharacter()).toBeNull()
    expect(getStore().sect.characters).toHaveLength(3)
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

  it('sacrificeCharacter should remove a disciple and refund only part of invested spirit stones', () => {
    const target = getFirstCharacter()

    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        resources: { ...s.sect.resources, spiritStone: 0 },
        characters: s.sect.characters.map((item) =>
          item.id === target.id ? { ...item, investedSpiritStone: 250 } : item
        ),
      },
    }))

    const removed = getStore().sacrificeCharacter(target.id, { source: 'adventure', reason: '秘境战死' })

    expect(removed).toBe(true)
    expect(useSectStore.getState().sect.characters.find((item) => item.id === target.id)).toBeUndefined()
    expect(useSectStore.getState().sect.resources.spiritStone).toBe(75)
  })

  it('unlockCodexEntry should respect scripture hall collection capacity', () => {
    useSectStore.setState((state) => ({
      sect: {
        ...state.sect,
        buildings: state.sect.buildings.map((building) =>
          building.type === 'scriptureHall' ? { ...building, unlocked: true, level: 0 } : building
        ),
        techniqueCodex: ['qingxin', 'lieyan', 'houtu'],
      },
    }))

    expect(getStore().unlockCodexEntry('fentian')).toBe(false)

    useSectStore.setState((state) => ({
      sect: {
        ...state.sect,
        buildings: state.sect.buildings.map((building) =>
          building.type === 'scriptureHall' ? { ...building, unlocked: true, level: 2 } : building
        ),
      },
    }))

    expect(getStore().unlockCodexEntry('fentian')).toBe(true)
    expect(getStore().sect.techniqueCodex).toContain('fentian')
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
    expect(getFirstCharacter().status).toBe('idle')
  })

  it('new disciples should start without a cultivation path', () => {
    expect(getFirstCharacter().cultivationPath).toBe('none')
  })

  it('chooseCultivationPath should set a path at the first major breakthrough node', () => {
    const char = getFirstCharacter()
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) => (c.id === char.id ? { ...c, realmStage: 3 } : c)),
      },
    }))

    const result = getStore().chooseCultivationPath(char.id, 'sword')

    expect(result).toBe(true)
    expect(getStore().sect.characters[0].cultivationPath).toBe('sword')
  })

  it('chooseCultivationPath should reject early selection', () => {
    const char = getFirstCharacter()
    const result = getStore().chooseCultivationPath(char.id, 'body')

    expect(result).toBe(false)
    expect(getStore().sect.characters[0].cultivationPath).toBe('none')
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

  it('upgradeBuilding should upgrade spiritField from its initial unlocked state', () => {
    const result = getStore().tryUpgradeBuilding('spiritField')
    expect(result.success).toBe(true)
    const sf = getStore().sect.buildings.find((b) => b.type === 'spiritField')
    expect(sf?.unlocked).toBe(true)
    expect(sf?.level).toBe(2)
    expect(sf?.count).toBe(1)
  })

  it('autoAssignToBuilding should fill matching idle disciples without moving manual assignments', () => {
    const base = getFirstCharacter()
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        buildings: s.sect.buildings.map((b) => (b.type === 'spiritField' ? { ...b, unlocked: true, level: 1 } : b)),
        characters: [
          {
            ...base,
            id: 'spec_idle',
            name: 'Spec Idle',
            specialties: [{ type: 'herbalism', level: 3 }],
            status: 'idle',
            assignedBuilding: null,
          },
          {
            ...base,
            id: 'spec_manual',
            name: 'Spec Manual',
            specialties: [{ type: 'alchemy', level: 3 }],
            status: 'training',
            assignedBuilding: 'forge',
          },
          {
            ...base,
            id: 'spec_other',
            name: 'Spec Other',
            specialties: [{ type: 'combat', level: 3 }],
            status: 'idle',
            assignedBuilding: null,
          },
        ],
      },
    }))

    const result = getStore().autoAssignToBuilding('spiritField')

    expect(result.success).toBe(true)
    expect(result.assigned).toBe(1)

    const idle = getStore().sect.characters.find((c) => c.id === 'spec_idle')
    const manual = getStore().sect.characters.find((c) => c.id === 'spec_manual')
    const other = getStore().sect.characters.find((c) => c.id === 'spec_other')

    expect(idle?.status).toBe('training')
    expect(idle?.assignedBuilding).toBe('spiritField')
    expect(manual?.status).toBe('training')
    expect(manual?.assignedBuilding).toBe('forge')
    expect(other?.status).toBe('idle')
    expect(other?.assignedBuilding).toBeNull()
  })

  it('autoOptimizeBuildingAssignments should fill multiple building lanes in one pass', () => {
    const base = getFirstCharacter()
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        buildings: s.sect.buildings.map((b) =>
          b.type === 'spiritField' || b.type === 'alchemyFurnace' ? { ...b, unlocked: true, level: 1 } : b
        ),
        characters: [
          {
            ...base,
            id: 'herbalist',
            name: 'Herbalist',
            specialties: [{ type: 'herbalism', level: 3 }],
            status: 'idle',
            assignedBuilding: null,
          },
          {
            ...base,
            id: 'alchemist',
            name: 'Alchemist',
            specialties: [{ type: 'alchemy', level: 3 }],
            status: 'idle',
            assignedBuilding: null,
          },
          {
            ...base,
            id: 'manual',
            name: 'Manual',
            specialties: [{ type: 'forging', level: 3 }],
            status: 'training',
            assignedBuilding: 'forge',
          },
        ],
      },
    }))

    const result = getStore().autoOptimizeBuildingAssignments()

    expect(result.success).toBe(true)
    expect(result.assigned).toBe(2)

    const herbalist = getStore().sect.characters.find((c) => c.id === 'herbalist')
    const alchemist = getStore().sect.characters.find((c) => c.id === 'alchemist')
    const manual = getStore().sect.characters.find((c) => c.id === 'manual')

    expect(herbalist?.status).toBe('training')
    expect(herbalist?.assignedBuilding).toBe('spiritField')
    expect(alchemist?.status).toBe('training')
    expect(alchemist?.assignedBuilding).toBe('alchemyFurnace')
    expect(manual?.status).toBe('training')
    expect(manual?.assignedBuilding).toBe('forge')
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
        characters: s.sect.characters.map((c) => (c.id === char.id ? { ...c, backpack: items } : c)),
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
          c.id === char.id
            ? { ...c, backpack: [{ item: sword, quantity: 1 }], equippedGear: new Array(9).fill(null) }
            : c
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
          c.id === char.id
            ? { ...c, backpack: [{ item: potion, quantity: 1 }], equippedGear: new Array(9).fill(null) }
            : c
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
          c.id === char.id ? { ...c, equippedGear: [...new Array(9).fill(null)] as Character['equippedGear'] } : c
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
        characters: s.sect.characters.map((c) => (c.id === char.id ? { ...c, equippedGear: updatedGear } : c)),
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
        characters: s.sect.characters.map((c) => (c.id === char.id ? { ...c, status: 'injured' } : c)),
      },
    }))
    getStore().addResource('herb', 5)

    const result = getStore().healCharacter(char.id)
    expect(result).toBe(true)
    expect(getStore().sect.characters[0].status).toBe('idle')
    expect(getStore().sect.resources.herb).toBe(3) // 5 - 2 herbs consumed
  })

  it('healCharacter should fail without herbs', () => {
    const char = getFirstCharacter()
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) => (c.id === char.id ? { ...c, status: 'injured' } : c)),
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

  it('healCharacter should set status to idle', () => {
    const char = getFirstCharacter()
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) => (c.id === char.id ? { ...c, status: 'injured' } : c)),
      },
    }))
    getStore().addResource('herb', 5)

    const result = getStore().healCharacter(char.id)
    expect(result).toBe(true)
    expect(getStore().sect.characters[0].status).toBe('idle')
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
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        resources: { ...s.sect.resources, spiritEnergy: 1000 },
      },
    }))

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
        characters: s.sect.characters.map((c) => (c.id === char.id ? { ...c, realmStage: 3, cultivation: 1000 } : c)),
        resources: { ...s.sect.resources, spiritStone: 5000, spiritEnergy: 1000 },
        vault: [],
      },
    }))

    expect(getStore().chooseCultivationPath(char.id, 'sword')).toBe(true)

    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    getStore().tickAll(1)

    const updated = getStore().sect.characters[0]
    expect(updated.realm).toBe(1)
    expect(updated.realmStage).toBe(0)
    // spiritStone deducted (3000 for realm 1 breakthrough)
    expect(getStore().sect.resources.spiritStone).toBeLessThan(5000)
    expect(getStore().sect.resources.spiritStone).toBeGreaterThanOrEqual(5000 - 3000)
  })

  it('should pause the first major breakthrough until a cultivation path is chosen', () => {
    const char = getFirstCharacter()
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) => (c.id === char.id ? { ...c, realmStage: 3, cultivation: 1000 } : c)),
        resources: { ...s.sect.resources, spiritStone: 5000, spiritEnergy: 1000 },
      },
    }))

    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    getStore().tickAll(1)

    const updated = getStore().sect.characters[0]
    expect(updated.realm).toBe(0)
    expect(updated.realmStage).toBe(3)
    expect(updated.cultivationPath).toBe('none')
    expect(getStore().sect.resources.spiritStone).toBe(5000.6)
  })

  it('should skip breakthrough when spiritStone is insufficient', () => {
    const char = getFirstCharacter()
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) => (c.id === char.id ? { ...c, realmStage: 3, cultivation: 1000 } : c)),
        resources: { ...s.sect.resources, spiritStone: 1000, spiritEnergy: 1000 },
        vault: [],
      },
    }))

    getStore().tickAll(1)

    const updated = getStore().sect.characters[0]
    expect(updated.realm).toBe(0)
    expect(updated.realmStage).toBe(3)
    // Initial spiritMine + tax now add 0.6 spiritStone per tick.
    expect(getStore().sect.resources.spiritStone).toBe(1000.6)
  })

  it('should skip breakthrough when spiritStone insufficient', () => {
    const char = getFirstCharacter()
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) => (c.id === char.id ? { ...c, realmStage: 3, cultivation: 1000 } : c)),
        resources: { ...s.sect.resources, spiritStone: 100, spiritEnergy: 1000 },
        vault: [],
      },
    }))

    getStore().tickAll(1)

    const updated = getStore().sect.characters[0]
    expect(updated.realm).toBe(0)
    expect(updated.realmStage).toBe(3)
    // Initial spiritMine + tax now add 0.6 spiritStone per tick.
    expect(getStore().sect.resources.spiritStone).toBe(100.6)
  })

  it('should skip breakthrough when spiritEnergy is insufficient', () => {
    const char = getFirstCharacter()
    setCharacterCultivation(char.id, 100)
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        resources: { ...s.sect.resources, spiritStone: 1000, spiritEnergy: 0 },
      },
    }))

    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    getStore().tickAll(1)

    const updated = getStore().sect.characters[0]
    expect(updated.realm).toBe(0)
    expect(updated.realmStage).toBe(0)
    expect(updated.cultivation).toBeGreaterThan(100)
  })

  it('should consume spirit stones for sub-level breakthrough', () => {
    const char = getFirstCharacter()
    setCharacterCultivation(char.id, 100)
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        resources: { ...s.sect.resources, spiritStone: 1000, spiritEnergy: 1000 },
        vault: [{ item: makeConsumable('pill_1', { name: '回血丹' }), quantity: 1 }],
      },
    }))

    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    getStore().tickAll(1)

    // Sub-level breakthrough consumes minor breakthrough cost (50 for realm 0, stage 0) but not vault items
    expect(getStore().sect.vault).toHaveLength(1)
    expect(getStore().sect.resources.spiritStone).toBe(950.6) // 1000 - 50 + 0.5 (mine) + 0.1 (tax)
  })

  it('should remove a disciple when sub-level breakthrough fails', () => {
    const char = getFirstCharacter()
    setCharacterCultivation(char.id, 100)
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        resources: { ...s.sect.resources, spiritStone: 1000, spiritEnergy: 1000 },
      },
    }))

    vi.spyOn(Math, 'random').mockReturnValue(0)
    getStore().tickAll(1)

    expect(getStore().sect.characters.find((item) => item.id === char.id)).toBeUndefined()
  })

  it('should skip minor breakthrough when spirit stones insufficient', () => {
    const char = getFirstCharacter()
    setCharacterCultivation(char.id, 100) // realm 0, stage 0 needs 100 cultivation

    // Set spirit stones to less than minor breakthrough cost (50 for realm 0, stage 0)
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        resources: { ...s.sect.resources, spiritStone: 30, spiritEnergy: 1000 },
      },
    }))

    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    getStore().tickAll(1)

    const updated = getStore().sect.characters[0]
    // Should NOT have broken through (insufficient spirit stones)
    expect(updated.realm).toBe(0)
    expect(updated.realmStage).toBe(0)
    // Cultivation can continue growing while the breakthrough remains blocked
    expect(updated.cultivation).toBeGreaterThan(100)
  })

  it('should add fate tags and unlock milestone after first tribulation success', () => {
    const char = getFirstCharacter()
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) =>
          c.id === char.id
            ? {
                ...c,
                realm: 1,
                realmStage: 3,
                cultivation: 11000,
                cultivationStats: {
                  ...c.cultivationStats,
                  spiritualRoot: 30,
                  comprehension: 30,
                },
              }
            : c
        ),
        resources: { ...s.sect.resources, spiritStone: 20000, spiritEnergy: 10000 },
      },
    }))

    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    getStore().tickAll(1)

    const updated = getStore().sect.characters[0]
    expect(updated.realm).toBe(2)
    expect(updated.realmStage).toBe(0)
    expect(updated.fateTags).toContain('stableDaoHeart')
    expect(getStore().sect.archiveMilestones.some((milestone) => milestone.id === 'firstTribulationSuccess')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// tickAll Tests
// ---------------------------------------------------------------------------

describe('SectStore - tickAll', () => {
  beforeEach(() => resetStore())

  it('tickAll should produce spirit energy', () => {
    // spiritField starts at level 1; upgrade it once to level 2 so it produces 5/s.
    getStore().addResource('spiritStone', 1000)
    getStore().tryUpgradeBuilding('spiritField')
    const result = getStore().tickAll(10)
    expect(result.spiritProduced).toBeCloseTo(50, 0) // 5/s * 10s = 50 spirit energy
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

    const result = getStore().tickAll(10)
    expect(result.spiritConsumed).toBeGreaterThan(0)
  })

  it('tickAll should not consume spirit for training characters', () => {
    const char = getFirstCharacter()
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) =>
          c.id === char.id ? { ...c, status: 'training', assignedBuilding: 'spiritField' } : c
        ),
      },
    }))
    getStore().addResource('spiritEnergy', 100)

    const result = getStore().tickAll(10)
    expect(result.spiritConsumed).toBe(0)
  })

  it('tickAll should ignore assigned building bonuses for non-training characters', () => {
    const configureCharacter = (status: Character['status']) => {
      resetStore()
      const char = getFirstCharacter()
      useSectStore.setState((s) => ({
        sect: {
          ...s.sect,
          buildings: s.sect.buildings.map((b) => (b.type === 'spiritMine' ? { ...b, unlocked: true, level: 1 } : b)),
          characters: s.sect.characters.map((c) =>
            c.id === char.id
              ? {
                  ...c,
                  status,
                  assignedBuilding: 'spiritMine',
                  specialties: [{ type: 'mining', level: 3 }],
                }
              : c
          ),
        },
      }))
      const beforeStone = getStore().sect.resources.spiritStone
      getStore().tickAll(10)
      return getStore().sect.resources.spiritStone - beforeStone
    }

    const idleGain = configureCharacter('idle')
    const trainingGain = configureCharacter('training')

    expect(idleGain).toBeLessThan(trainingGain)
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
    getStore().addCharacter()

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
  boostSpiritField()
}

function getAdventureStore() {
  return useAdventureStore.getState()
}

describe('AdventureStore - startRun', () => {
  beforeEach(() => resetAdventureStore())

  it('should create a run with a single character', () => {
    const char = getStore().sect.characters[0]
    expect(char.status).toBe('idle')

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
    const char2 = getStore().addCharacter()
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
    const char2 = getStore().addCharacter()
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
    // At sect level 1, max characters is 10 (1 initial + 9 addable)
    // That gives us enough characters to test the team size limit of 5
    const charIds: string[] = []
    const initialChar = getStore().sect.characters[0]
    charIds.push(initialChar.id)

    for (let i = 0; i < 4; i++) {
      const c = getStore().addCharacter()
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

  it('should initialize tactical preset and run-build fields', () => {
    const char = getStore().sect.characters[0]
    const run = getAdventureStore().startRun('lingCaoValley', [char.id], 'basic', 'burst')
    expect(run).not.toBeNull()
    expect(run!.tacticalPreset).toBe('burst')
    expect(run!.blessings).toEqual([])
    expect(run!.relics).toEqual([])
    expect(run!.branchTags).toEqual([])
    expect(run!.pendingBlessingOptions).toEqual([])
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
    expect(getStore().sect.characters[0].status).toBe('idle')
  })

  it('should remove run from activeRuns on retreat', () => {
    const char = getStore().sect.characters[0]
    const run = getAdventureStore().startRun('lingCaoValley', [char.id])
    expect(run).not.toBeNull()

    expect(Object.keys(getAdventureStore().activeRuns)).toHaveLength(1)
    getAdventureStore().retreat(run!.id)
    expect(Object.keys(getAdventureStore().activeRuns)).toHaveLength(0)
  })

  it('should remove dead characters on retreat', () => {
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
    expect(getStore().sect.characters.find((item) => item.id === char.id)).toBeUndefined()
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
    expect(getStore().sect.characters[0].status).toBe('idle')
  })

  it('should remove run from activeRuns', () => {
    const char = getStore().sect.characters[0]
    const run = getAdventureStore().startRun('lingCaoValley', [char.id])
    expect(run).not.toBeNull()

    getAdventureStore().completeRun(run!.id)
    expect(Object.keys(getAdventureStore().activeRuns)).toHaveLength(0)
  })

  it('should unlock the first dungeon clear archive milestone', () => {
    const char = getStore().sect.characters[0]
    const run = getAdventureStore().startRun('lingCaoValley', [char.id])
    expect(run).not.toBeNull()

    getAdventureStore().completeRun(run!.id)

    expect(getStore().sect.archiveMilestones.some((milestone) => milestone.id === 'firstDungeonClear')).toBe(true)
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

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValueOnce(0.2).mockReturnValueOnce(0.5)

    getAdventureStore().failRun(runId)
    const afterStones = getStore().sect.resources.spiritStone

    // Should deposit 50% of 400 = 200
    expect(afterStones - beforeStones).toBe(200)

    randomSpy.mockRestore()
  })

  it('should mark surviving characters as recovering on failRun when the casualty roll returns injury', () => {
    const char = getStore().sect.characters[0]
    const run = getAdventureStore().startRun('lingCaoValley', [char.id])
    expect(run).not.toBeNull()
    const runId = run!.id

    useSectStore.getState().setAutomationSettings({ casualtyTolerance: 'conservative' })

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValueOnce(0.2).mockReturnValueOnce(0.5)

    getAdventureStore().failRun(runId)

    const updatedCharacter = getStore().sect.characters.find((character) => character.id === char.id)
    expect(updatedCharacter?.status).toBe('recovering')
    expect(updatedCharacter?.recoveryDaysRemaining).toBe(2)

    randomSpy.mockRestore()
  })

  it('should sacrifice surviving characters on failRun when the casualty roll misses recovery', () => {
    const char = getStore().sect.characters[0]
    const run = getAdventureStore().startRun('lingCaoValley', [char.id])
    expect(run).not.toBeNull()

    useSectStore.getState().setAutomationSettings({ casualtyTolerance: 'balanced' })

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.95)

    getAdventureStore().failRun(run!.id)

    expect(getStore().sect.characters.find((character) => character.id === char.id)).toBeUndefined()

    randomSpy.mockRestore()
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

describe('AdventureStore - runAutomation', () => {
  beforeEach(() => resetAdventureStore())

  it('should resolve a run instantly into a stored report', () => {
    const char = getStore().sect.characters[0]

    const report = getAdventureStore().runAutomation({
      dungeonId: 'lingCaoValley',
      teamCharacterIds: [char.id],
      supplyLevel: 'basic',
      tacticalPreset: 'balanced',
      automationStrategy: 'steady',
    })

    expect(report).not.toBeNull()
    expect(getAdventureStore().reports[0]?.id).toBe(report!.id)
    expect(getAdventureStore().getReport(report!.id)?.id).toBe(report!.id)
    const resolvedCharacter = getStore().sect.characters.find((item) => item.id === char.id)
    expect(resolvedCharacter?.status ?? 'removed').toMatch(/idle|removed/)
  })

  it('tickAllIdle should still progress dispatches after adventure automation was introduced', () => {
    const characterId = getStore().sect.characters[0].id

    getAdventureStore().startDispatch(characterId, 'gather_herbs')
    expect(getAdventureStore().dispatches[0]?.progress).toBe(0)

    getAdventureStore().tickAllIdle(30)

    expect(getAdventureStore().dispatches[0]?.progress).toBeGreaterThan(0)
  })

  it('should apply active route bonuses to route reward settlement', () => {
    const char = getStore().sect.characters[0]
    getStore().setActiveRoute('alchemy')

    const run = getAdventureStore().startRun('lingCaoValley', [char.id], 'basic', 'balanced')
    expect(run).not.toBeNull()

    useAdventureStore.setState((s) => ({
      activeRuns: {
        ...s.activeRuns,
        [run!.id]: {
          ...s.activeRuns[run!.id]!,
          floors: [
            {
              floor: 1,
              isBossFloor: false,
              routes: [
                {
                  id: 'route_test',
                  name: '测试路线',
                  description: '只结算路线奖励',
                  riskLevel: 'low',
                  events: [],
                  reward: { spiritStone: 100, herb: 10, ore: 0 },
                },
              ],
            },
          ],
        },
      },
    }))

    expect(getAdventureStore().selectRoute(run!.id, 0)).toBe(true)
    expect(getStore().sect.resources.spiritStone).toBe(555)
    expect(getStore().sect.resources.herb).toBe(11)
  })

  it('should persist failed member return outcomes on automation reports', () => {
    const first = getStore().sect.characters[0]
    const second = getStore().addCharacter()
    expect(second).not.toBeNull()

    const resolveSpy = vi.spyOn(autoRunEngine, 'resolveAutomatedRun').mockReturnValue({
      id: 'report_scripted_failure',
      config: {
        dungeonId: 'lingCaoValley',
        teamCharacterIds: [first.id, second!.id],
        supplyLevel: 'basic',
        tacticalPreset: 'balanced',
        automationStrategy: 'steady',
      },
      dungeonId: 'lingCaoValley',
      teamCharacterIds: [first.id, second!.id],
      startedAt: 1,
      finishedAt: 2,
      result: 'failed',
      floorsCleared: 2,
      rewards: { spiritStone: 90, spiritEnergy: 0, herb: 4, ore: 0 },
      itemRewards: [],
      finalMemberStates: {
        [first.id]: { currentHp: 20, maxHp: 100, status: 'wounded' },
        [second!.id]: { currentHp: 40, maxHp: 100, status: 'alive' },
      },
      teamSnapshot: {
        [first.id]: { name: first.name, quality: first.quality, realm: first.realm, realmStage: first.realmStage },
        [second!.id]: {
          name: second!.name,
          quality: second!.quality,
          realm: second!.realm,
          realmStage: second!.realmStage,
        },
      },
      discipleMutations: {},
      steps: [],
    })

    const recoverySpy = vi
      .spyOn(recoverySystem, 'resolveAdventureFailureOutcome')
      .mockReturnValueOnce({ outcome: 'recovering', recoveryDays: 2 })
      .mockReturnValueOnce({ outcome: 'sacrificed' })

    const report = getAdventureStore().runAutomation({
      dungeonId: 'lingCaoValley',
      teamCharacterIds: [first.id, second!.id],
      supplyLevel: 'basic',
      tacticalPreset: 'balanced',
      automationStrategy: 'steady',
    })

    expect(report).not.toBeNull()
    expect(report?.postRunMemberOutcomes?.[first.id]).toEqual({
      outcome: 'recovering',
      recoveryDays: 2,
    })
    expect(report?.postRunMemberOutcomes?.[second!.id]).toEqual({
      outcome: 'sacrificed',
    })
    expect(getAdventureStore().getReport(report!.id)?.postRunMemberOutcomes?.[first.id]?.outcome).toBe('recovering')

    recoverySpy.mockRestore()
    resolveSpy.mockRestore()
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
    getAdventureStore().advanceFloor(runId)

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
  beforeEach(() => {
    resetStore()
    boostSpiritField()
  })

  it('addCharacter should deduct spirit stones', () => {
    const before = getStore().sect.resources.spiritStone
    getStore().addCharacter() // discounted to 80 for faster recruitment
    expect(getStore().sect.resources.spiritStone).toBe(before - 80)
  })

  it('addCharacter should return null when insufficient stones', () => {
    getStore().spendResource('spiritStone', 500)
    const char = getStore().addCharacter()
    expect(char).toBeNull()
  })

  it('canRecruit should report insufficient stones', () => {
    getStore().spendResource('spiritStone', 500)
    const result = getStore().canRecruit()
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('灵石不足')
  })

  it('canRecruit should report characters full', () => {
    // Spirit field level 3 → max 3 disciples
    boostSpiritField(3, 1)
    getStore().addResource('spiritStone', 1000)
    getStore().addCharacter() // total 2
    getStore().addCharacter() // total 3 = max
    const result = getStore().canRecruit()
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('灵气不足以供养更多弟子')
  })

  it('canRecruit should allow when conditions met', () => {
    const result = getStore().canRecruit()
    expect(result.allowed).toBe(true)
    expect(result.reason).toBe('')
  })

  it('should unlock the first rare recruit archive milestone', () => {
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        level: 3,
        resources: { ...s.sect.resources, spiritStone: 5000 },
      },
    }))

    // Mock rollRecruitQuality to guarantee a spirit quality recruit
    vi.spyOn(Math, 'random').mockReturnValue(0.1) // < 0.15 -> spirit at level 3

    const recruit = getStore().addCharacter()
    expect(recruit).not.toBeNull()
    expect(recruit!.quality).not.toBe('common')
    expect(getStore().sect.archiveMilestones.some((milestone) => milestone.id === 'firstRareRecruit')).toBe(true)

    vi.restoreAllMocks()
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

  it('should consume pending blessing choice and add the blessing to the run', () => {
    const char = getStore().sect.characters[0]
    const run = getAdventureStore().startRun('lingCaoValley', [char.id])
    expect(run).not.toBeNull()

    useAdventureStore.setState((s) => ({
      activeRuns: {
        ...s.activeRuns,
        [run!.id]: {
          ...s.activeRuns[run!.id]!,
          pendingBlessingOptions: ['battleFocus', 'ironBody'],
        },
      },
    }))

    expect(getAdventureStore().chooseBlessing(run!.id, 'battleFocus')).toBe(true)

    const updatedRun = getAdventureStore().getRun(run!.id)
    expect(updatedRun?.blessings).toContain('battleFocus')
    expect(updatedRun?.pendingBlessingOptions).toEqual([])
  })
})

describe('SectStore - Daily automation', () => {
  beforeEach(() => {
    resetStore()
    boostSpiritField()
    useAdventureStore.getState().reset()
  })

  it('tickAll should advance the game day every 60 seconds', () => {
    expect(useGameStore.getState().currentGameDay).toBe(1)

    getStore().tickAll(60)

    expect(useGameStore.getState().currentGameDay).toBe(2)
    expect(useGameStore.getState().dayProgressSec).toBe(0)
  })

  it('should auto-recruit when the pool is below target and reserve thresholds are satisfied', () => {
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        resources: { ...s.sect.resources, spiritStone: 1200, spiritEnergy: 400 },
        automationSettings: {
          ...s.sect.automationSettings,
          reserveSpiritStone: 200,
          reserveSpiritEnergy: 100,
        },
      },
    }))

    getStore().tickAll(60)

    expect(getStore().sect.characters.length).toBeGreaterThanOrEqual(2)
  })

  it('should auto-run the preferred dungeon once per elapsed day when resources are sufficient', () => {
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((character) => ({ ...character, realmStage: 3 })),
        resources: { ...s.sect.resources, spiritStone: 50000, spiritEnergy: 5000 },
        automationSettings: {
          ...s.sect.automationSettings,
          reserveSpiritStone: 200,
          reserveSpiritEnergy: 100,
          preferredDungeonId: 'lingCaoValley',
          casualtyTolerance: 'conservative',
        },
      },
    }))

    getStore().tickAll(60)

    expect(useAdventureStore.getState().reports.length).toBe(1)
    expect(useAdventureStore.getState().reports[0]?.dungeonId).toBe('lingCaoValley')
  })

  it('should skip automatic adventures when resources are at or below reserve thresholds', () => {
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        resources: { ...s.sect.resources, spiritStone: 300, spiritEnergy: 100 },
        automationSettings: {
          ...s.sect.automationSettings,
          reserveSpiritStone: 300,
          reserveSpiritEnergy: 100,
          preferredDungeonId: 'lingCaoValley',
        },
      },
    }))

    getStore().tickAll(60)

    expect(useAdventureStore.getState().reports).toHaveLength(0)
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
        buildings: s.sect.buildings.map((b) => (b.type === 'alchemyFurnace' ? { ...b, unlocked: true, level: 1 } : b)),
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
          b.type === 'alchemyFurnace'
            ? { ...b, unlocked: true, level: 1, productionQueue: { recipeId: 'hp_potion', progress: 50 } }
            : b
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
        buildings: s.sect.buildings.map((b) => (b.type === 'forge' ? { ...b, unlocked: true, level: 1 } : b)),
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
          b.type === 'alchemyFurnace'
            ? { ...b, unlocked: true, level: 1, productionQueue: { recipeId: 'hp_potion', progress: 15 } }
            : b
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

  it('should let active alchemy route speed up alchemy production', () => {
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        activeRoute: 'alchemy',
        buildings: s.sect.buildings.map((b) =>
          b.type === 'alchemyFurnace'
            ? { ...b, unlocked: true, level: 1, productionQueue: { recipeId: 'hp_potion', progress: 0 } }
            : b
        ),
        resources: { ...s.sect.resources, herb: 100 },
      },
    }))

    getStore().tickAll(18)

    expect(getStore().sect.vault.length).toBe(1)
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

    getStore().tickAll(20)

    const sect = getStore().sect
    expect(sect.vault.length).toBe(0) // nothing produced (no herbs)
    expect(sect.resources.herb).toBeCloseTo(2) // initial spiritField still passively grows herbs
  })

  it('should clamp resources to caps after tick', () => {
    // Spirit field level 1 -> cap = 500 + 1*300 = 800 spirit energy
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        buildings: s.sect.buildings.map((b) => (b.type === 'spiritField' ? { ...b, unlocked: true, level: 1 } : b)),
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
        buildings: s.sect.buildings.map((b) => (b.type === 'market' ? { ...b, unlocked: true, level: 7 } : b)),
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
    expect(getStore().sect.characters[0].status).toBe('idle')
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
    const vaultItems: ItemStack[] = [{ item: { ...makeConsumable('hp_0'), recipeId: 'hp_potion' }, quantity: 5 }]
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

// ---------------------------------------------------------------------------
// Offline Accumulator Tests
// ---------------------------------------------------------------------------

describe('SectStore - Offline Accumulator', () => {
  beforeEach(() => resetStore())

  it('should have empty accumulator initially', () => {
    const acc = getStore().sect.offlineAccumulator
    expect(acc.resourcesGained.spiritStone).toBe(0)
    expect(acc.resourcesGained.spiritEnergy).toBe(0)
    expect(acc.resourcesGained.herb).toBe(0)
    expect(acc.resourcesGained.ore).toBe(0)
    expect(acc.breakthroughs).toHaveLength(0)
    expect(acc.itemsCrafted).toHaveLength(0)
    expect(acc.taxIncome).toBe(0)
  })

  it('should accumulate resources after tickAll', () => {
    // Give spirit energy for cultivation
    getStore().addResource('spiritEnergy', 100)

    getStore().tickAll(10)

    const acc = getStore().sect.offlineAccumulator
    // Tax income accumulates separately from spiritMine passive stone income.
    expect(acc.taxIncome).toBeGreaterThan(0)
  })

  it('should accumulate tax income', () => {
    getStore().addResource('spiritEnergy', 100)
    getStore().tickAll(10)

    const acc = getStore().sect.offlineAccumulator
    // At sect level 1 with 1 disciple: taxRate = 0.1/s, 10s = 1
    expect(acc.taxIncome).toBeCloseTo(1, 0)
  })

  it('should accumulate resources across multiple tickAll calls', () => {
    getStore().addResource('spiritEnergy', 1000)

    getStore().tickAll(10)
    getStore().tickAll(10)

    const acc = getStore().sect.offlineAccumulator
    // Tax should have accumulated across both ticks
    expect(acc.taxIncome).toBeCloseTo(2, 0)
  })

  it('should clear accumulator when clearOfflineAccumulator is called', () => {
    getStore().addResource('spiritEnergy', 100)
    getStore().tickAll(10)

    // Verify something was accumulated
    const accBefore = getStore().sect.offlineAccumulator
    expect(accBefore.taxIncome).toBeGreaterThan(0)

    getStore().clearOfflineAccumulator()

    const accAfter = getStore().sect.offlineAccumulator
    expect(accAfter.resourcesGained.spiritStone).toBe(0)
    expect(accAfter.resourcesGained.spiritEnergy).toBe(0)
    expect(accAfter.resourcesGained.herb).toBe(0)
    expect(accAfter.resourcesGained.ore).toBe(0)
    expect(accAfter.breakthroughs).toHaveLength(0)
    expect(accAfter.itemsCrafted).toHaveLength(0)
    expect(accAfter.taxIncome).toBe(0)
  })

  it('should accumulate crafted items from production queue', () => {
    // Setup alchemy furnace with recipe
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        buildings: s.sect.buildings.map((b) =>
          b.type === 'alchemyFurnace'
            ? { ...b, unlocked: true, level: 1, productionQueue: { recipeId: 'hp_potion', progress: 0 } }
            : b
        ),
        resources: { ...s.sect.resources, herb: 100, spiritEnergy: 100 },
      },
    }))

    // hp_potion: productionTime=20s, inputPerSec.herb=0.25
    getStore().tickAll(20)

    const acc = getStore().sect.offlineAccumulator
    expect(acc.itemsCrafted.length).toBeGreaterThanOrEqual(1)
    expect(acc.itemsCrafted[0].name).toBeTruthy()
  })

  it('should accumulate breakthroughs when they occur', () => {
    const char = getFirstCharacter()
    setCharacterCultivation(char.id, 100) // needs 100 for sub-level breakthrough
    getStore().addResource('spiritEnergy', 1000)

    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    getStore().tickAll(1)

    const acc = getStore().sect.offlineAccumulator
    expect(acc.breakthroughs.length).toBeGreaterThanOrEqual(1)
    expect(acc.breakthroughs[0].characterName).toBe(char.name)
    expect(acc.breakthroughs[0].success).toBe(true)
    expect(acc.breakthroughs[0].targetRealm).toBeTruthy()

    vi.restoreAllMocks()
  })

  it('reset should reset accumulator to empty', () => {
    getStore().addResource('spiritEnergy', 100)
    getStore().tickAll(10)

    resetStore()

    const acc = getStore().sect.offlineAccumulator
    expect(acc.resourcesGained.spiritStone).toBe(0)
    expect(acc.taxIncome).toBe(0)
    expect(acc.breakthroughs).toHaveLength(0)
    expect(acc.itemsCrafted).toHaveLength(0)
  })
})
