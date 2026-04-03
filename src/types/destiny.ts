import type { AutomationStrategy, TacticalPreset } from './adventure'
import type { CultivationPath } from './character'

// ---------------------------------------------------------------------------
// Sect Risk Policy (主方针)
// ---------------------------------------------------------------------------

export type SectRiskPolicyId = 'lianfeng' | 'shouheng' | 'shenji' | 'zhuxi' | 'yapo' | 'niejie' | 'fenming'

export const SECT_RISK_POLICY_ORDER: SectRiskPolicyId[] = [
  'lianfeng',
  'shouheng',
  'shenji',
  'zhuxi',
  'yapo',
  'niejie',
  'fenming',
]

// ---------------------------------------------------------------------------
// Destiny Amplifier (命运标签)
// ---------------------------------------------------------------------------

export type DestinyAmplifierId = 'yinji' | 'jinjie' | 'cangmo' | 'xumai' | 'zheyun'

// ---------------------------------------------------------------------------
// Destiny Seed (命苗)
// ---------------------------------------------------------------------------

export type DestinySeedId =
  | 'fortuneSeed'
  | 'tribulationSeed'
  | 'abyssSeed'
  | 'guardianSeed'
  | 'plunderSeed'
  | 'afterglowSeed'
  | 'anomalySeed'

// ---------------------------------------------------------------------------
// Destiny Stage & Risk
// ---------------------------------------------------------------------------

export type DestinyStage = 'seed' | 'stirring' | 'formed' | 'mutated' | 'heavenmarked'

export type DestinyRiskLevel = 'safe' | 'drifting' | 'danger' | 'calamity'

// ---------------------------------------------------------------------------
// Destiny State (per character)
// ---------------------------------------------------------------------------

export interface DestinyState {
  seedId: DestinySeedId
  stage: DestinyStage
  exposure: number
  instability: number
  riskLevel: DestinyRiskLevel
  matchedAmplifiers: DestinyAmplifierId[]
  dominantStyle?: 'burst' | 'tank' | 'control' | 'sacrifice' | 'summon'
  lastMajorEvent?: {
    type: 'stirred' | 'formed' | 'mutated' | 'shock' | 'heavenmarked'
    at: number
    summary: string
  }
}

// ---------------------------------------------------------------------------
// Dark Current (宗门暗流)
// ---------------------------------------------------------------------------

export interface SectDarkCurrent {
  fortune: number
  tribulation: number
  abyss: number
  guardian: number
  plunder: number
  afterglow: number
  anomaly: number
  lastShiftAt: number | null
}

// ---------------------------------------------------------------------------
// Strategy Settings (宗门策略)
// ---------------------------------------------------------------------------

export interface SectStrategySettings {
  activePolicy: SectRiskPolicyId
  activeAmplifiers: DestinyAmplifierId[]
  switchCooldownDays: number
  lastSwitchedAt: number | null
}

// ---------------------------------------------------------------------------
// Policy Profile (主方针配置)
// ---------------------------------------------------------------------------

export interface SectRiskPolicyProfile {
  id: SectRiskPolicyId
  name: string
  description: string
  executorStrategy: AutomationStrategy
  tacticalPreset: TacticalPreset
  rareSeedMultiplier: number
  highRiskRecruitBias: number
  coreFocusWeight: number
  mutationExposureMultiplier: number
  highVarianceRouteWeight: number
  eventChaosWeight: number
  retreatAvgHpThreshold: number
  retreatLowHpThreshold: number
  darkCurrentGainMultiplier: number
  darkCurrentDecayPerDay: number
  tianmingChanceMultiplier: number
  maxCoreDisciples: number
}

// ---------------------------------------------------------------------------
// Amplifier Profile (命运标签配置)
// ---------------------------------------------------------------------------

export interface DestinyAmplifierProfile {
  id: DestinyAmplifierId
  name: string
  description: string
  seedWeightBias: Partial<Record<DestinySeedId, number>>
  instabilityGain: number
  coreAmplifyWeight: number
  mutationWeightBias: number
  darkCurrentBias: Partial<Record<keyof Omit<SectDarkCurrent, 'lastShiftAt'>, number>>
}

// ---------------------------------------------------------------------------
// Seed Definition (命苗定义)
// ---------------------------------------------------------------------------

export interface DestinySeedDef {
  id: DestinySeedId
  name: string
  description: string
  darkCurrentFamily: keyof Omit<SectDarkCurrent, 'lastShiftAt'>
  defaultCombatStyle: 'burst' | 'tank' | 'control' | 'sacrifice' | 'summon'
  baseRisk: number
}

// ---------------------------------------------------------------------------
// Auto Cultivation Profile
// ---------------------------------------------------------------------------

export interface AutoCultivationProfile {
  preferredCombatStyle: 'burst' | 'tank' | 'control' | 'sacrifice' | 'summon'
  statWeights: { hp: number; atk: number; def: number; spd: number; crit: number }
  pathBias: Partial<Record<CultivationPath, number>>
  riskAmplification: number
}

// ---------------------------------------------------------------------------
// Run Executor Bias (秘境执行偏置)
// ---------------------------------------------------------------------------

export interface RunExecutorBias {
  routeRiskBias: number
  mutationEventBias: number
  rewardEventBias: number
  recoveryEventBias: number
  petCaptureBias: number
}

// ---------------------------------------------------------------------------
// Destiny Event Record (宿命事件记录)
// ---------------------------------------------------------------------------

export interface DestinyEventRecord {
  type: 'exposure_gain' | 'stage_advance' | 'risk_change' | 'shock' | 'heavenmarked'
  characterId: string
  timestamp: number
  detail: string
  before?: Partial<DestinyState>
  after?: Partial<DestinyState>
}

// ---------------------------------------------------------------------------
// Constants & Thresholds
// ---------------------------------------------------------------------------

export const DESTINY_STAGE_THRESHOLDS: Record<DestinyStage, { min: number; max: number }> = {
  seed: { min: 0, max: 39 },
  stirring: { min: 40, max: 89 },
  formed: { min: 90, max: 159 },
  mutated: { min: 160, max: 239 },
  heavenmarked: { min: 240, max: Infinity },
}

export const DESTINY_RISK_THRESHOLDS: Record<DestinyRiskLevel, { min: number; max: number }> = {
  safe: { min: 0, max: 24 },
  drifting: { min: 25, max: 59 },
  danger: { min: 60, max: 109 },
  calamity: { min: 110, max: Infinity },
}

export const DESTINY_STAGE_NAMES: Record<DestinyStage, string> = {
  seed: '命苗',
  stirring: '萌动',
  formed: '成格',
  mutated: '异变',
  heavenmarked: '天命',
}

export const DESTINY_RISK_NAMES: Record<DestinyRiskLevel, string> = {
  safe: '安',
  drifting: '浮',
  danger: '危',
  calamity: '劫',
}
