import type { StateCreator } from 'zustand'
import type { SectStore } from './types'
import type { Resources, ResourceType } from '../../types'

export const createResourceSlice: StateCreator<SectStore, [], [], SectStore> = (set, _get) => ({
  spendResource: (type: keyof Resources, amount: number) => {
    const { sect } = _get()
    if (sect.resources[type] < amount) return false
    set((s) => ({
      sect: {
        ...s.sect,
        resources: { ...s.sect.resources, [type]: s.sect.resources[type] - amount },
        stats: {
          ...s.sect.stats,
          ...(type === 'spiritStone' ? { totalSpiritStoneSpent: s.sect.stats.totalSpiritStoneSpent + amount } : {}),
        },
      },
    }))
    return true
  },

  addResource: (type: keyof Resources, amount: number) => {
    set((s) => ({
      sect: {
        ...s.sect,
        resources: { ...s.sect.resources, [type]: s.sect.resources[type] + amount },
        stats: {
          ...s.sect.stats,
          ...(type === 'spiritStone' ? { totalSpiritStoneEarned: s.sect.stats.totalSpiritStoneEarned + amount } : {}),
        },
      },
    }))
  },

  exchangeResources: (from: ResourceType, to: ResourceType, amount: number) => {
    const { sect } = _get()

    // Validate exchange direction
    const supportedPairs: Array<[ResourceType, ResourceType]> = [
      ['spiritStone', 'herb'],
      ['spiritStone', 'ore'],
      ['herb', 'spiritStone'],
      ['ore', 'spiritStone'],
    ]
    const isValid = supportedPairs.some(([f, t]) => f === from && t === to)
    if (!isValid) {
      return { success: false, reason: '不支持该兑换方向' }
    }

    // Check source resource
    if (sect.resources[from] < amount) {
      return { success: false, reason: '资源不足' }
    }

    // Calculate market level and loss rate
    const marketLevel = sect.buildings.find((b) => b.type === 'market')?.level ?? 0
    const lossRate = Math.max(0.3, 0.667 - 0.05 * marketLevel)

    // Calculate received amount
    let received: number
    if (from === 'spiritStone') {
      // Buying: 1 spiritStone -> 2 herb/ore
      received = amount * 2
    } else {
      // Selling: herb/ore -> spiritStone with loss
      received = Math.floor((amount / 3) * (1 - lossRate))
    }

    // Deduct source, add received
    set((s) => ({
      sect: {
        ...s.sect,
        resources: {
          ...s.sect.resources,
          [from]: s.sect.resources[from] - amount,
          [to]: s.sect.resources[to] + received,
        },
      },
    }))

    return { success: true, received }
  },
})
