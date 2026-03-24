import { create } from 'zustand'
import type { AnyItem, Resources } from '../types'
import { calcResourceRates } from '../systems/economy/ResourceEngine'
import { attemptEnhance } from '../systems/equipment/EquipmentEngine'
import { useSectStore } from './sectStore'

interface InventoryState {
  items: AnyItem[]
  maxSlots: number
  resources: Resources
  addItem: (item: AnyItem) => boolean
  removeItem: (index: number) => AnyItem | null
  addResource: (type: keyof Resources, amount: number) => void
  spendResource: (type: keyof Resources, amount: number) => boolean
  sellItem: (index: number) => { success: boolean; spiritStone: number }
  enhanceItem: (index: number) => { success: boolean; newLevel: number; cost: { spiritStone: number; ore: number } }
  tickResourceProduction: (deltaSec: number) => void
  reset: () => void
}

const initialResources: Resources = {
  spiritStone: 500, spiritEnergy: 0, herb: 0, ore: 0,
  fairyJade: 0, scrollFragment: 0, heavenlyTreasure: 0, beastSoul: 0,
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  items: [],
  maxSlots: 50,
  resources: { ...initialResources },
  addItem: (item) => {
    if (get().items.length >= get().maxSlots) return false
    set((s) => ({ items: [...s.items, item] }))
    return true
  },
  removeItem: (index) => {
    const item = get().items[index]
    if (!item) return null
    set((s) => ({ items: s.items.filter((_, i) => i !== index) }))
    return item
  },
  addResource: (type, amount) =>
    set((s) => ({ resources: { ...s.resources, [type]: s.resources[type] + amount } })),
  spendResource: (type, amount) => {
    const current = get().resources[type]
    if (current < amount) return false
    set((s) => ({ resources: { ...s.resources, [type]: current - amount } }))
    return true
  },
  sellItem: (index) => {
    const item = get().items[index]
    if (!item) return { success: false, spiritStone: 0 }
    set((s) => ({
      items: s.items.filter((_, i) => i !== index),
      resources: { ...s.resources, spiritStone: s.resources.spiritStone + item.sellPrice },
    }))
    return { success: true, spiritStone: item.sellPrice }
  },
  enhanceItem: (index) => {
    const item = get().items[index]
    if (!item || item.type !== 'equipment') return { success: false, newLevel: 0, cost: { spiritStone: 0, ore: 0 } }

    const result = attemptEnhance(item)
    if (get().resources.spiritStone < result.cost.spiritStone) return { success: false, newLevel: item.enhanceLevel, cost: result.cost }
    if (get().resources.ore < result.cost.ore) return { success: false, newLevel: item.enhanceLevel, cost: result.cost }

    // Spend resources
    set((s) => ({
      resources: {
        ...s.resources,
        spiritStone: s.resources.spiritStone - result.cost.spiritStone,
        ore: s.resources.ore - result.cost.ore,
      },
    }))

    if (result.success) {
      const newItems = [...get().items]
      newItems[index] = { ...item, enhanceLevel: result.newLevel }
      set((s) => ({ items: newItems }))
    }

    return result
  },
  tickResourceProduction: (deltaSec) => {
    const sectState = useSectStore.getState()
    const sfLevel = sectState.buildings.find((b) => b.type === 'spiritField')?.level ?? 0
    const mainHallLevel = sectState.buildings.find((b) => b.type === 'mainHall')?.level ?? 0
    const rates = calcResourceRates({ spiritField: sfLevel, mainHall: mainHallLevel })
    set((s) => ({
      resources: {
        ...s.resources,
        spiritEnergy: s.resources.spiritEnergy + rates.spiritEnergy * deltaSec,
        herb: s.resources.herb + rates.herb * deltaSec,
      },
    }))
  },
  reset: () => set({ items: [], maxSlots: 50, resources: { ...initialResources } }),
}))
