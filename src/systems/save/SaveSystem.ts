// src/systems/save/SaveSystem.ts

import type { Sect } from '../../types'
import type { DungeonRun } from '../../types'
import { useSectStore } from '../../stores/sectStore'
import { useAdventureStore } from '../../stores/adventureStore'
import { useGameStore } from '../../stores/gameStore'

const SAVE_KEY = 'endlessquest_save'

export interface SaveData {
  version: 2
  timestamp: number
  sectStore: { sect: Sect }
  adventureStore: { activeRuns: Record<string, DungeonRun> }
  gameStore: { saveSlot: number; lastOnlineTime: number }
}

export function saveGame(): void {
  try {
    const data: SaveData = {
      version: 2,
      timestamp: Date.now(),
      sectStore: { sect: useSectStore.getState().sect },
      adventureStore: { activeRuns: useAdventureStore.getState().activeRuns },
      gameStore: {
        saveSlot: useGameStore.getState().saveSlot,
        lastOnlineTime: useGameStore.getState().lastOnlineTime,
      },
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('Save failed:', e)
  }
}

export function loadGame(): boolean {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return false

    const data = JSON.parse(raw)
    if (data.version < 2) {
      clearSaveData()
      return false
    }

    // Restore sect state
    if (data.sectStore?.sect) {
      useSectStore.setState({ sect: data.sectStore.sect })
    }

    // Restore adventure state (only activeRuns — dungeons/completedDungeons are derived)
    if (data.adventureStore?.activeRuns) {
      useAdventureStore.setState({ activeRuns: data.adventureStore.activeRuns })
    }

    // Restore game state
    if (data.gameStore) {
      useGameStore.setState({
        saveSlot: data.gameStore.saveSlot,
        lastOnlineTime: data.gameStore.lastOnlineTime,
      })
    }

    return true
  } catch (e) {
    console.error('Load failed:', e)
    return false
  }
}

export function hasSaveData(): boolean {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return false
    const data = JSON.parse(raw)
    return data.version === 2
  } catch {
    return false
  }
}

export function clearSaveData(): void {
  localStorage.removeItem(SAVE_KEY)
}
