import { useEffect, useRef } from 'react'
import { saveGame, loadGame } from './SaveSystem'
import { useGameStore } from '../../stores/gameStore'

const SAVE_INTERVAL = 30000 // auto-save every 30 seconds

export function useAutoSave() {
  const loaded = useRef(false)

  // Load on mount
  useEffect(() => {
    if (loaded.current) return
    loadGame()
    loaded.current = true
  }, [])

  // Auto-save periodically (only when not paused)
  useEffect(() => {
    const interval = setInterval(() => {
      const isPaused = useGameStore.getState().isPaused
      if (!isPaused) {
        saveGame()
      }
    }, SAVE_INTERVAL)

    return () => clearInterval(interval)
  }, [])
}
