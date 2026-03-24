import { create } from 'zustand'
import type { AnyItem, Resources } from '../types'
import { calcResourceRates } from '../systems/economy/ResourceEngine'
import { useSectStore } from './sectStore'

interface InventoryState {
  items: AnyItem[]
  maxSlots: number
  resources: Resources
  addItem: (item: AnyItem) => boolean
  removeItem: (index: number) => AnyItem | null
  addResource: (type: keyof Resources, amount: number) => void
  spendResource: (type: keyof Resources, amount: number) => boolean
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
