import type { AnyItem } from './item'
import type { Resources } from './sect'

export type EventType = 'combat' | 'random' | 'shop' | 'rest' | 'boss'

export interface Enemy {
  id: string
  name: string
  element: string
  stats: { hp: number; atk: number; def: number; spd: number }
  isBoss: boolean
}

export interface DungeonEvent {
  type: EventType
  id?: string
}

export interface RouteOption {
  id: string
  name: string
  description: string
  riskLevel: 'low' | 'medium' | 'high'
  events: DungeonEvent[]
  reward: { spiritStone: number; herb: number; ore: number; fairyJade: number }
}

export interface DungeonFloor {
  floor: number
  routes: RouteOption[]
  isBossFloor: boolean
}

export interface Dungeon {
  id: string
  name: string
  totalLayers: number
  eventsPerLayer: number
  unlockRealm: number
  unlockStage: number
  lootTable: Array<{ itemId: string; weight: number }>
}

export interface MemberState {
  currentHp: number
  maxHp: number
  status: 'alive' | 'dead' | 'wounded'
}

export interface LogEntry {
  timestamp: number
  message: string
}

export interface DungeonRun {
  id: string
  dungeonId: string
  teamCharacterIds: string[]
  currentFloor: number
  floors: DungeonFloor[]
  memberStates: Record<string, MemberState>
  totalRewards: Resources
  itemRewards: AnyItem[]
  eventLog: LogEntry[]
  status: 'active' | 'retreated' | 'completed' | 'failed'
}
