import { useEffect, useRef } from 'react'
import { saveGame, loadGame } from './SaveSystem'
import { useSectStore } from '../../stores/sectStore'
import { useAdventureStore } from '../../stores/adventureStore'
import { useGameStore } from '../../stores/gameStore'

const SAVE_INTERVAL = 30000 // auto-save every 30 seconds

export function useAutoSave() {
  const loaded = useRef(false)

  // Load on mount
  useEffect(() => {
    if (loaded.current) return
    const data = loadGame()
    if (!data) return
    loaded.current = true

    // Restore sect state
    if (data.sect) {
      useSectStore.setState({ sect: data.sect })
    }
    // Restore adventure state
    if (data.adventure) {
      useAdventureStore.setState(data.adventure)
    }
    // Restore game state
    if (data.game) {
      useGameStore.setState({
        lastOnlineTime: data.game.lastOnlineTime,
      })
    }
  }, [])

  // Auto-save periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const data = {
        version: 2,
        timestamp: Date.now(),
        sect: useSectStore.getState().sect,
        adventure: useAdventureStore.getState(),
        game: {
          lastOnlineTime: useGameStore.getState().lastOnlineTime,
        },
      }
      saveGame(data)
    }, SAVE_INTERVAL)

    return () => clearInterval(interval)
  }, [])
}
