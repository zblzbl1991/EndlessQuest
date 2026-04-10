import type { StateCreator } from 'zustand'
import type { SectStore } from './types'
import type { ItemQuality } from '../../types/item'

export const createCodexSlice: StateCreator<SectStore, [], [], Partial<SectStore>> = (set, get) => ({
  encounterMonster: (enemyId: string): void => {
    const { sect } = get()
    const current = sect.monsterCodex[enemyId]
    if (current === 'killed') return
    if (current === 'encountered') return

    set((state) => ({
      sect: {
        ...state.sect,
        monsterCodex: { ...state.sect.monsterCodex, [enemyId]: 'encountered' },
      },
    }))
  },

  killMonster: (enemyId: string): void => {
    const { sect } = get()
    if (sect.monsterCodex[enemyId] === 'killed') return

    set((state) => ({
      sect: {
        ...state.sect,
        monsterCodex: { ...state.sect.monsterCodex, [enemyId]: 'killed' },
      },
    }))
  },

  discoverEquipment: (setId: string, quality: ItemQuality): void => {
    const { sect } = get()
    const currentQualities = sect.equipmentCodex[setId]
    if (currentQualities?.has(quality)) return

    set((state) => {
      const existing = state.sect.equipmentCodex[setId] ?? new Set<string>()
      const updated = new Set(existing)
      updated.add(quality)
      return {
        sect: {
          ...state.sect,
          equipmentCodex: { ...state.sect.equipmentCodex, [setId]: updated },
        },
      }
    })
  },
})
