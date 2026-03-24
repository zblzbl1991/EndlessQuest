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
  name: string
  description: string
  riskLevel: 'low' | 'medium' | 'high'
  events: DungeonEvent[]
}

export interface DungeonLayer {
  number: number
  routes: RouteOption[]
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

export interface DungeonRun {
  dungeonId: string
  currentLayer: number
  teamHp: number[]
  mode: 'idle' | 'manual'
  buffs: string[]
  tempSkills: string[]
  currency: number
  startedAt: number
  paused: boolean
}
