import { create } from 'zustand'

const initialState = {
  saveSlot: 1,
  lastOnlineTime: Date.now(),
  isPaused: false,
  currentGameDay: 1,
  dayProgressSec: 0,
}

interface GameStore {
  saveSlot: number
  lastOnlineTime: number
  isPaused: boolean
  currentGameDay: number
  dayProgressSec: number
  startGame(): void
  stopGame(): void
  pauseGame(): void
  resumeGame(): void
  reset(): void
}

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,
  startGame: () => set({ isPaused: false, lastOnlineTime: Date.now() }),
  stopGame: () => set({ isPaused: true }),
  pauseGame: () => set({ isPaused: true }),
  resumeGame: () => set({ isPaused: false, lastOnlineTime: Date.now() }),
  reset: () => set(initialState),
}))
