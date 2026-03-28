import type { AnyItem } from './item'
import type { Resources } from './sect'
import type { ShopOffer } from '../systems/roguelike/EventSystem'
import type { TacticPreset } from './runBuild'
import type { RunBuild } from '../systems/roguelike/RunBuildSystem'

export type EventType = 'combat' | 'random' | 'shop' | 'rest' | 'boss' | 'ancient_cave'

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
  reward: { spiritStone: number; herb: number; ore: number }
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

export type SupplyLevel = 'basic' | 'enhanced' | 'luxury'

/** Supply cost configuration per level */
export interface SupplyCost {
  spiritStone: number
  /** Items to consume from vault, keyed by recipeId, value = count required */
  vaultItems: Record<string, number>
  /** Reward multiplier applied on completion (default 1.0) */
  rewardMultiplier: number
}

export const SUPPLY_COSTS: Record<SupplyLevel, SupplyCost> = {
  basic: { spiritStone: 50, vaultItems: {}, rewardMultiplier: 1.0 },
  enhanced: { spiritStone: 200, vaultItems: { hp_potion: 2 }, rewardMultiplier: 1.0 },
  luxury: { spiritStone: 500, vaultItems: { hp_potion: 5, breakthrough_pill: 1 }, rewardMultiplier: 1.5 },
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
  /** Accumulated time for current floor (seconds) */
  floorTimer?: number
  /** Supply level chosen for this expedition */
  supplyLevel: SupplyLevel
  /** Reward multiplier from supply level (default 1.0 for backward compat) */
  rewardMultiplier: number
  /** Pending shop offers from the last shop event */
  pendingShopOffers: ShopOffer[]
  /** Tactical preset for combat AI during this run */
  tacticPreset?: TacticPreset
  /** Current run-build (blessings and relics) */
  runBuild?: RunBuild
}
