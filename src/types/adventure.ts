import type { AnyItem } from './item'
import type { Resources } from './sect'
import type { CharacterQuality, RealmStage } from './character'
import type { ShopOffer } from '../systems/roguelike/EventSystem'
import type { DiscipleMutationId } from '../data/discipleMutations'
import type { SectRiskPolicyId, DestinyAmplifierId, DestinyEventRecord } from './destiny'

export type EnemyAffix = 'berserk' | 'shield' | 'spiritDrain' | 'swift' | 'tribulationBane'
export type TacticalPreset = 'conservative' | 'balanced' | 'burst' | 'bossCounter'
export type BlessingId =
  | 'stoneHarvest'
  | 'verdantBounty'
  | 'ironBody'
  | 'galeStride'
  | 'battleFocus'
  | 'flame_heart'
  | 'iron_wall'
  | 'jade_pulse'
  | 'spirit_spring'
  | 'keen_eye'
  | 'reaper_mark'
  | 'golden_touch'
  | 'wind_step'
export type RelicId =
  | 'jadeGourd'
  | 'merchantSeal'
  | 'warBanner'
  | 'mirror_shard'
  | 'jade_armor'
  | 'blood_vial'
  | 'golden_scale'
// Persisted strategy ids remain stable for save compatibility; UI copy maps them to 守成 / 争锋 / 寻机.
export type AutomationStrategy = 'steady' | 'combat' | 'profit'

export type EventType = 'combat' | 'random' | 'shop' | 'rest' | 'boss' | 'ancient_cave'

export interface Enemy {
  id: string
  name: string
  element: string
  stats: { hp: number; atk: number; def: number; spd: number }
  isBoss: boolean
  affixes?: EnemyAffix[]
  affixPool?: EnemyAffix[]
  skillIds?: string[]
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

export interface AdventureRunConfig {
  dungeonId: string
  teamCharacterIds: string[]
  supplyLevel: SupplyLevel
  tacticalPreset: TacticalPreset
  automationStrategy: AutomationStrategy
}

export type AdventureReportResult = 'completed' | 'retreated' | 'failed'

export type AdventureReportStepType =
  | 'run_started'
  | 'floor_started'
  | 'route_considered'
  | 'route_selected'
  | 'event_resolved'
  | 'auto_choice_made'
  | 'shop_decision'
  | 'blessing_decision'
  | 'pet_decision'
  | 'reward_gained'
  | 'member_state_changed'
  | 'run_retreated'
  | 'run_failed'
  | 'run_completed'

export interface AdventureReportStep {
  id: string
  type: AdventureReportStepType
  timestamp: number
  floor: number | null
  summary: string
  detail: string
  decisionReason?: string
  snapshot?: {
    teamHp: Record<string, { currentHp: number; maxHp: number; status: MemberState['status'] }>
    rewards: Resources
    blessings: BlessingId[]
    relics: RelicId[]
    branchTags: string[]
    discipleMutations: Record<string, DiscipleMutationId[]>
  }
  meta?: Record<string, unknown>
}

export type AdventureMemberReturnOutcome = 'returned' | 'recovering' | 'sacrificed'

export interface AdventureMemberReturnRecord {
  outcome: AdventureMemberReturnOutcome
  recoveryDays?: number
}

export interface AdventureReport {
  id: string
  config: AdventureRunConfig
  dungeonId: string
  teamCharacterIds: string[]
  startedAt: number
  finishedAt: number
  result: AdventureReportResult
  floorsCleared: number
  rewards: Resources
  itemRewards: AnyItem[]
  finalMemberStates: Record<string, MemberState>
  teamSnapshot: Record<string, { name: string; quality: CharacterQuality; realm: number; realmStage: RealmStage }>
  discipleMutations: Record<string, DiscipleMutationId[]>
  postRunMemberOutcomes?: Record<string, AdventureMemberReturnRecord>
  steps: AdventureReportStep[]
  policySnapshot?: SectRiskPolicyId
  amplifierSnapshot?: DestinyAmplifierId[]
  destinyChanges?: DestinyEventRecord[]
}

export interface AdventureReportSummary {
  id: string
  dungeonId: string
  teamCharacterIds: string[]
  strategy: AutomationStrategy
  tacticalPreset: TacticalPreset
  startedAt: number
  finishedAt: number
  result: AdventureReportResult
  floorsCleared: number
  rewards: Resources
  itemRewardCount: number
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
  tacticalPreset: TacticalPreset
  blessings: BlessingId[]
  relics: RelicId[]
  branchTags: string[]
  pendingBlessingOptions: BlessingId[]
}
