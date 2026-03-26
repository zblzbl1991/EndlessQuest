import { useSectStore } from '../../stores/sectStore'
import { saveGame } from './SaveSystem'

/**
 * Activates write-through auto-save via Zustand subscribe.
 * Returns an unsubscribe/cleanup function.
 *
 * Mechanism:
 * 1. Subscribe to sectStore.sect changes
 * 2. Debounce 500ms (deduplicate rapid ticks)
 * 3. Snapshot compare (skip if no actual change)
 * 4. Write all entity stores in a single IDB transaction
 * 5. visibilitychange triggers immediate save (reliable)
 * 6. beforeunload triggers immediate save (best-effort)
 */
export function startAutoSave(): () => void {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let lastSnapshot: string | null = null

  const unsub = useSectStore.subscribe((state, prevState) => {
    if (state.sect === prevState.sect) return
    const snapshot = JSON.stringify(state.sect)
    if (snapshot === lastSnapshot) return
    lastSnapshot = snapshot

    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      saveGame()
    }, 500)
  })

  const saveNow = () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = null
    lastSnapshot = JSON.stringify(useSectStore.getState().sect)
    saveGame() // best-effort, no await
  }

  document.addEventListener('visibilitychange', saveNow)
  window.addEventListener('beforeunload', saveNow)

  return () => {
    unsub()
    document.removeEventListener('visibilitychange', saveNow)
    window.removeEventListener('beforeunload', saveNow)
    if (debounceTimer) clearTimeout(debounceTimer)
  }
}
