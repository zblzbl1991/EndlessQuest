import type { StateCreator } from 'zustand'
import type { SectStore } from './types'
import type { AnyItem, Consumable, Equipment } from '../../types'
import { findEquipmentById } from './initial'
import { attemptEnhance } from '../../systems/equipment/EquipmentEngine'
import { getBuildingLevel, getForgeBuff } from '../../systems/economy/BuildingEffects'
import { addItemToStacks, removeStackAtIndex } from '../../systems/item/ItemStackUtils'

export const createItemSlice: StateCreator<SectStore, [], [], Partial<SectStore>> = (set, get) => ({
  transferItemToCharacter: (characterId: string, vaultIndex: number) => {
    const { sect } = get()
    const char = sect.characters.find((c) => c.id === characterId)
    if (!char) return false
    const stack = sect.vault[vaultIndex]
    if (!stack) return false

    const isStackable = stack.item.type === 'consumable' && (stack.item as Consumable).recipeId
    if (isStackable) {
      const existingBp = char.backpack.findIndex(
        (s) => s.item.type === 'consumable' && (s.item as Consumable).recipeId === (stack.item as Consumable).recipeId
      )
      if (existingBp === -1 && char.backpack.length >= char.maxBackpackSlots) return false
    } else {
      if (char.backpack.length >= char.maxBackpackSlots) return false
    }

    const { stacks: newVault, removed } = removeStackAtIndex(sect.vault, vaultIndex)
    if (!removed) return false
    const newBackpack = addItemToStacks(char.backpack, removed.item)

    set((s) => ({
      sect: {
        ...s.sect,
        vault: newVault,
        characters: s.sect.characters.map((c) => (c.id === characterId ? { ...c, backpack: newBackpack } : c)),
      },
    }))
    return true
  },

  transferItemToVault: (characterId: string, backpackIndex: number) => {
    const { sect } = get()
    const char = sect.characters.find((c) => c.id === characterId)
    if (!char) return false
    const stack = char.backpack[backpackIndex]
    if (!stack) return false

    const isStackable = stack.item.type === 'consumable' && (stack.item as Consumable).recipeId
    if (isStackable) {
      const existing = sect.vault.findIndex(
        (s) => s.item.type === 'consumable' && (s.item as Consumable).recipeId === (stack.item as Consumable).recipeId
      )
      if (existing === -1 && sect.vault.length >= sect.maxVaultSlots) return false
    } else {
      if (sect.vault.length >= sect.maxVaultSlots) return false
    }

    const { stacks: newBackpack, removed } = removeStackAtIndex(char.backpack, backpackIndex)
    if (!removed) return false
    const newVault = addItemToStacks(sect.vault, removed.item)

    set((s) => ({
      sect: {
        ...s.sect,
        vault: newVault,
        characters: s.sect.characters.map((c) => (c.id === characterId ? { ...c, backpack: newBackpack } : c)),
      },
    }))
    return true
  },

  addToVault: (item: AnyItem) => {
    const { sect } = get()
    const isConsumableWithRecipe = item.type === 'consumable' && (item as Consumable).recipeId
    if (!isConsumableWithRecipe && sect.vault.length >= sect.maxVaultSlots) return false
    if (isConsumableWithRecipe) {
      const existing = sect.vault.findIndex(
        (s) => s.item.type === 'consumable' && (s.item as Consumable).recipeId === (item as Consumable).recipeId
      )
      if (existing === -1 && sect.vault.length >= sect.maxVaultSlots) return false
    }
    const newVault = addItemToStacks(sect.vault, item)
    set((s) => ({ sect: { ...s.sect, vault: newVault } }))
    return true
  },

  sellItem: (vaultIndex: number) => {
    const { sect } = get()
    const stack = sect.vault[vaultIndex]
    if (!stack) return false
    const { stacks: newVault, removed } = removeStackAtIndex(sect.vault, vaultIndex)
    if (!removed) return false
    set((s) => ({
      sect: {
        ...s.sect,
        vault: newVault,
        resources: {
          ...s.sect.resources,
          spiritStone: s.sect.resources.spiritStone + removed.item.sellPrice,
        },
      },
    }))
    return true
  },

  removeVaultItem: (vaultIndex: number) => {
    const { sect } = get()
    const { stacks: newVault, removed } = removeStackAtIndex(sect.vault, vaultIndex)
    if (removed) {
      set((s) => ({ sect: { ...s.sect, vault: newVault } }))
    }
    return removed
  },

  equipItem: (characterId: string, backpackIndex: number, slotIndex: number) => {
    const { sect } = get()
    const char = sect.characters.find((c) => c.id === characterId)
    if (!char) return false

    const stack = char.backpack[backpackIndex]
    if (!stack || stack.item.type !== 'equipment') return false
    const item = stack.item as Equipment

    // Ensure equippedGear array has enough slots
    const gear = [...char.equippedGear]
    while (gear.length <= slotIndex) gear.push(null)

    // If there's already something in that slot, swap it to backpack
    const prevGearId = gear[slotIndex]
    let newBackpack = [...char.backpack]
    newBackpack.splice(backpackIndex, 1)
    if (prevGearId) {
      const prevItem = findEquipmentById(sect, prevGearId)
      if (prevItem) newBackpack = addItemToStacks(newBackpack, prevItem)
    }

    gear[slotIndex] = item.id

    set((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) =>
          c.id === characterId ? { ...c, backpack: newBackpack, equippedGear: gear } : c
        ),
      },
    }))
    return true
  },

  unequipItem: (characterId: string, slotIndex: number) => {
    const { sect } = get()
    const char = sect.characters.find((c) => c.id === characterId)
    if (!char) return false

    const gear = [...char.equippedGear]
    if (slotIndex < 0 || slotIndex >= gear.length) return false

    const gearId = gear[slotIndex]
    if (!gearId) return false

    // Find the equipment
    const equipment = findEquipmentById(sect, gearId)
    if (!equipment) return false

    // Check backpack space
    if (char.backpack.length >= char.maxBackpackSlots) return false

    gear[slotIndex] = null

    set((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) =>
          c.id === characterId ? { ...c, equippedGear: gear, backpack: addItemToStacks(c.backpack, equipment) } : c
        ),
      },
    }))
    return true
  },

  enhanceItem: (characterId: string, backpackIndex: number) => {
    const { sect } = get()
    const char = sect.characters.find((c) => c.id === characterId)
    if (!char) {
      return { success: false, newLevel: 0, cost: { spiritStone: 0, ore: 0 } }
    }

    const stack = char.backpack[backpackIndex]
    if (!stack || stack.item.type !== 'equipment') {
      return { success: false, newLevel: 0, cost: { spiritStone: 0, ore: 0 } }
    }
    const item = stack.item as Equipment

    const forgeLevel = getBuildingLevel(sect.buildings, 'forge')
    const forgeBuff = getForgeBuff(forgeLevel)
    const result = attemptEnhance(item, forgeBuff.successBonus, forgeBuff.costReduction)

    // Check if we have enough resources
    if (sect.resources.spiritStone < result.cost.spiritStone) {
      return { success: false, newLevel: item.enhanceLevel, cost: result.cost }
    }
    if (sect.resources.ore < result.cost.ore) {
      return { success: false, newLevel: item.enhanceLevel, cost: result.cost }
    }

    // Spend resources
    set((s) => ({
      sect: {
        ...s.sect,
        resources: {
          ...s.sect.resources,
          spiritStone: s.sect.resources.spiritStone - result.cost.spiritStone,
          ore: s.sect.resources.ore - result.cost.ore,
        },
      },
    }))

    // Update item if enhancement succeeded
    if (result.success) {
      const newBackpack = [...get().sect.characters.find((c) => c.id === characterId)!.backpack]
      newBackpack[backpackIndex] = { ...stack, item: { ...item, enhanceLevel: result.newLevel } }
      set((s) => ({
        sect: {
          ...s.sect,
          characters: s.sect.characters.map((c) => (c.id === characterId ? { ...c, backpack: newBackpack } : c)),
        },
      }))
    }

    return result
  },

  sellCharacterItem: (characterId: string, backpackIndex: number) => {
    const { sect } = get()
    const char = sect.characters.find((c) => c.id === characterId)
    if (!char) return false
    const stack = char.backpack[backpackIndex]
    if (!stack) return false
    const { stacks: newBackpack, removed } = removeStackAtIndex(char.backpack, backpackIndex)
    if (!removed) return false
    set((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) => (c.id === characterId ? { ...c, backpack: newBackpack } : c)),
        resources: {
          ...s.sect.resources,
          spiritStone: s.sect.resources.spiritStone + removed.item.sellPrice,
        },
      },
    }))
    return true
  },
})
