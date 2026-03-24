import { create } from 'zustand'
import type { AnyItem, Resources } from '../types'

interface InventoryState {
  items: AnyItem[]
  maxSlots: number
  resources: Resources
  addItem: (item: AnyItem) => boolean
  removeItem: (index: number) => AnyItem | null
  addResource: (type: keyof Resources, amount: number) => void
  spendResource: (type: keyof Resources, amount: number) => boolean
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
  reset: () => set({ items: [], maxSlots: 50, resources: { ...initialResources } }),
}))
