import { create } from 'zustand'
import type { DungeonRun } from '../types'

interface AdventureState {
  currentRun: DungeonRun | null
  completedDungeons: string[]
  startRun: (dungeonId: string, mode: 'idle' | 'manual') => void
  endRun: () => void
  reset: () => void
}

export const useAdventureStore = create<AdventureState>((set) => ({
  currentRun: null,
  completedDungeons: [],
  startRun: (dungeonId, mode) =>
    set({
      currentRun: {
        dungeonId, currentLayer: 1, teamHp: [], mode,
        buffs: [], tempSkills: [], currency: 0,
        startedAt: Date.now(), paused: false,
      },
    }),
  endRun: () =>
    set((s) => ({
      currentRun: null,
      completedDungeons: s.currentRun ? [...s.completedDungeons, s.currentRun.dungeonId] : s.completedDungeons,
    })),
  reset: () => set({ currentRun: null, completedDungeons: [] }),
}))
