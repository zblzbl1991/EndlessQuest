import type { AutomationStrategy, TacticalPreset } from './adventure'
import type { CultivationPath } from './character'

// ---------------------------------------------------------------------------
// Sect Risk Policy (主方针)
// ---------------------------------------------------------------------------

export type SectRiskPolicyId = 'conservative' | 'balanced' | 'aggressive'

export const SECT_RISK_POLICY_ORDER: SectRiskPolicyId[] = ['conservative', 'balanced', 'aggressive']

// ---------------------------------------------------------------------------
// Fate Grid (命格)
// ---------------------------------------------------------------------------

export type FateGridId =
  | 'dragonPhoenix'
  | 'overlordBody'
  | 'bloodSuppress'
  | 'ghostly'
  | 'undying'
  | 'lastStand'
  | 'warSpirit'
  | 'wisdom'
  | 'defiance'
  | 'lucky'

export type FateGridCategory = 'heavenly' | 'ghost' | 'emotional' | 'cultivation' | 'probability'

export type FateGridRarity = 'common' | 'rare' | 'epic' | 'legendary'

export const FATE_GRID_CATEGORY_NAMES: Record<FateGridCategory, string> = {
  heavenly: '天命格',
  ghost: '鬼咒格',
  emotional: '情绪格',
  cultivation: '修炼格',
  probability: '机率格',
}

export const FATE_GRID_RARITY_NAMES: Record<FateGridRarity, string> = {
  common: '凡',
  rare: '灵',
  epic: '仙',
  legendary: '神',
}

export interface FateGridEffects {
  // --- Cultivation ---
  cultivationSpeedModifier?: number
  techniqueComprehensionModifier?: number
  breakthroughSuccessBonus?: number
  breakthroughExpRetentionRate?: number
  breakthroughFailStackBonus?: number

  // --- Stats ---
  allStatGrowthModifier?: number
  constitutionGrowthModifier?: number

  // --- Combat ---
  attackModifier?: number
  critRateBonus?: number
  allStatBonus?: number
  enemyStatReduction?: number
  bossDamageBonus?: number
  darkSkillDamageBonus?: number
  ghostStrikeChance?: number
  ghostStrikeDamageRate?: number
  lethalSurvivalChance?: number
  postBattleRecoveryBonus?: number
  inCombatRegenRate?: number
  lethalDamageReduction?: number

  // --- Conditional combat ---
  lowHpAttackBonus?: Array<{ threshold: number; bonus: number }>
  lowHpCritBonus?: Array<{ threshold: number; bonus: number }>
  consecutiveBattleBonus?: { perBattle: number; maxStacks: number }

  // --- Adventure ---
  rareEventChanceBonus?: number
  lootQualityBonus?: number
  equipmentUpgradeChance?: number
  suddenInsightChance?: number
  retreatLootRetention?: number
  battleRouteExpBonus?: number

  // --- Pet ---
  petEffectBonus?: number
  tameSuccessBonus?: number

  // --- Penalty ---
  cultivationSpeedPenalty?: number
  heartDemonBonus?: number
  soloAttackBonus?: number
  teamAttackPenalty?: number
}

export interface FateGridDef {
  id: FateGridId
  name: string
  description: string
  category: FateGridCategory
  rarity: FateGridRarity
  effects: FateGridEffects
}

// ---------------------------------------------------------------------------
// Strategy Settings (宗门策略) — simplified
// ---------------------------------------------------------------------------

export interface SectStrategySettings {
  activePolicy: SectRiskPolicyId
  switchCooldownDays: number
  lastSwitchedAt: number | null
}

// ---------------------------------------------------------------------------
// Policy Profile (主方针配置) — simplified
// ---------------------------------------------------------------------------

export interface SectRiskPolicyProfile {
  id: SectRiskPolicyId
  name: string
  description: string
  executorStrategy: AutomationStrategy
  tacticalPreset: TacticalPreset
  highRiskRecruitBias: number
  coreFocusWeight: number
  retreatAvgHpThreshold: number
  retreatLowHpThreshold: number
  maxCoreDisciples: number
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
