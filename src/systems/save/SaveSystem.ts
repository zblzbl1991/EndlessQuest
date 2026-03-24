// src/systems/save/SaveSystem.ts

const SAVE_KEY = 'endlessquest_save'

export interface SaveData {
  version: number
  timestamp: number
  player?: any
  inventory?: any
  sect?: any
  pets?: any
  adventure?: any
  game?: any
}

export function saveGame(data: SaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('Save failed:', e)
  }
}

export function loadGame(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (e) {
    console.error('Load failed:', e)
    return null
  }
}

export function hasSaveData(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null
}

export function clearSaveData(): void {
  localStorage.removeItem(SAVE_KEY)
}
