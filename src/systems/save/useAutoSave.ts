import { useEffect, useRef, useState } from 'react'
import { saveGame, loadGame } from './SaveSystem'
import { getDB } from './db'
import { useGameStore } from '../../stores/gameStore'

const SAVE_INTERVAL = 30000 // auto-save every 30 seconds

export function useAutoSave(): { isLoaded: boolean } {
  const [isLoaded, setIsLoaded] = useState(false)
  const loadingRef = useRef<Promise<void> | null>(null)

  useEffect(() => {
    if (!loadingRef.current) {
      loadingRef.current = (async () => {
        try {
          await getDB()
          await loadGame()
        } catch (e) {
          console.error('Failed to load save:', e)
        }
      })()
    }

    let cancelled = false
    loadingRef.current.then(() => {
      if (!cancelled) {
        setIsLoaded(true)
      }
    })

    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!isLoaded) return

    const interval = setInterval(() => {
      const isPaused = useGameStore.getState().isPaused
      if (!isPaused) {
        saveGame()
      }
    }, SAVE_INTERVAL)

    return () => clearInterval(interval)
  }, [isLoaded])

  return { isLoaded }
}
