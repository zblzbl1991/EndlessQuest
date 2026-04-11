import { create } from 'zustand'
import { addHistoryEntry } from '../systems/save/HistoryStore'

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
  | 'dispatch_complete'
  | 'pet_capture'
  | 'item_crafted'
  | 'technique_unlocked'
  | 'breakthrough_comprehension'
  | 'milestone'
  | 'random_event'

export interface GameEvent {
  id: string
  timestamp: number
  type: EventType
  message: string
  data?: Record<string, unknown>
}

export interface EventLogStore {
  events: GameEvent[]
  addEvent: (type: EventType, message: string, data?: Record<string, unknown>) => void
  reset: () => void
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

const MAX_EVENTS = 500
let _counter = 0

function isLegacyEventData(data: Record<string, unknown> | undefined): boolean {
  return Boolean(data?.isLegacyEncounter || data?.legacyDungeonId || data?.legacyTechniqueId)
}

export const useEventLogStore = create<EventLogStore>((set) => ({
  events: [],

  addEvent: (type, message, data = {}) => {
    const evt: GameEvent = {
      id: 'evt_' + Date.now() + '_' + ++_counter,
      timestamp: Date.now(),
      type,
      message,
      data,
    }

    set((s) => {
      // Check if we should merge with the previous event
      const prev = s.events[0]
      const mergeableTypes: EventType[] = ['adventure_start', 'adventure_complete', 'adventure_fail']

      if (
        prev &&
        mergeableTypes.includes(prev.type) &&
        prev.type === type &&
        Date.now() - prev.timestamp < 60000 &&
        !isLegacyEventData(prev.data) &&
        !isLegacyEventData(data)
      ) {
        // Merge: increment count in data
        const count = ((prev.data?.mergedCount as number) ?? 1) + 1
        const merged: GameEvent = {
          ...prev,
          message: `弟子连番出征秘境，共探索 x${count}`,
          data: { ...prev.data, mergedCount: count },
        }
        return {
          events: [merged, ...s.events.slice(1)].slice(0, MAX_EVENTS),
        }
      }

      return {
        events: [evt, ...s.events].slice(0, MAX_EVENTS),
      }
    })
  },

  reset: () => set({ events: [] }),
}))

// ---------------------------------------------------------------------------
// Convenience: standalone emit (no hook needed)
// ---------------------------------------------------------------------------

export function emitEvent(type: EventType, message: string, data: Record<string, unknown> = {}): void {
  useEventLogStore.getState().addEvent(type, message, data)
  void addHistoryEntry({
    type,
    timestamp: Date.now(),
    summary: message,
    data,
  })
}
