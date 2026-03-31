import type { StateCreator } from 'zustand'
import type { SectStore } from './types'
import { createInitialState } from './initial'

export const createMiscSlice: StateCreator<SectStore, [], [], Partial<SectStore>> = (set, get) => ({
  healCharacter: (characterId: string) => {
    const { sect } = get()
    const char = sect.characters.find((c) => c.id === characterId)
    if (!char) return false
    if (char.status !== 'injured') return false
    if (sect.resources.herb < 2) return false

    set((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) =>
          c.id === characterId ? { ...c, status: 'idle' as const, injuryTimer: 0 } : c
        ),
        resources: {
          ...s.sect.resources,
          herb: s.sect.resources.herb - 2,
        },
      },
    }))
    return true
  },

  clearOfflineAccumulator: () => {
    set((s) => ({
      sect: {
        ...s.sect,
        offlineAccumulator: {
          resourcesGained: { spiritStone: 0, spiritEnergy: 0, herb: 0, ore: 0 },
          breakthroughs: [],
          itemsCrafted: [],
          taxIncome: 0,
        },
      },
    }))
  },

  reset: () => set({ ...createInitialState(), shopState: null }),
})
