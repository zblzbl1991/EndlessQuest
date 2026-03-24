import { create } from 'zustand'

interface GameState {
  saveSlot: number
  lastOnlineTime: number
  isPaused: boolean
  setSaveSlot: (slot: number) => void
  updateLastOnlineTime: () => void
  setPaused: (paused: boolean) => void
  reset: () => void
}

const initialState = {
  saveSlot: 1,
  lastOnlineTime: Date.now(),
  isPaused: false,
}

export const useGameStore = create<GameState>((set) => ({
  ...initialState,
  setSaveSlot: (slot) => set({ saveSlot: slot }),
  updateLastOnlineTime: () => set({ lastOnlineTime: Date.now() }),
  setPaused: (paused) => set({ isPaused: paused }),
  reset: () => set(initialState),
}))
