import type { StateCreator } from 'zustand'
import type { SectStore } from './types'
import { canAscend as checkCanAscend, performAscension as doAscension } from '../../systems/sect/LegacySystem'

export const createLegacySlice: StateCreator<SectStore, [], [], Partial<SectStore>> = (set, get) => ({
  performAscension: () => {
    const { sect } = get()
    const check = checkCanAscend(sect)
    if (!check.canAscend) return

    const { newSect } = doAscension(sect)
    set({ sect: newSect })
  },
})
