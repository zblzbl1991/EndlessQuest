import { create } from 'zustand'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EventType =
  | 'breakthrough_success'
  | 'breakthrough_failure'
  | 'building_upgrade'
  | 'building_build'
  | 'recruit'
  | 'adventure_start'
  | 'adventure_complete'
  | 'adventure_fail'
  | 'patrol_complete'
  | 'item_crafted'
  | 'technique_unlocked'
  | 'breakthrough_comprehension'

export interface GameEvent {
  id: string
  timestamp: number
  type: EventType
  message: string
}

export interface EventLogStore {
  events: GameEvent[]
  addEvent: (type: EventType, message: string) => void
  reset: () => void
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

const MAX_EVENTS = 200
let _counter = 0

export const useEventLogStore = create<EventLogStore>((set) => ({
  events: [],

  addEvent: (type, message) => {
    const evt: GameEvent = {
      id: 'evt_' + Date.now() + '_' + (++_counter),
      timestamp: Date.now(),
      type,
      message,
    }
    set((s) => ({
      events: [evt, ...s.events].slice(0, MAX_EVENTS),
    }))
  },

  reset: () => set({ events: [] }),
}))

// ---------------------------------------------------------------------------
// Convenience: standalone emit (no hook needed)
// ---------------------------------------------------------------------------

export function emitEvent(type: EventType, message: string): void {
  useEventLogStore.getState().addEvent(type, message)
}
