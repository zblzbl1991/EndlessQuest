import type { Character } from './character'
import type { ItemStack } from './item'
import type { Pet } from '../systems/pet/PetSystem'
import type { SectRouteId } from '../data/sectRoutes'
import type { SectStrategySettings } from './destiny'

export type SectPath = 'none' | 'pill' | 'sword' | 'beast'
export type ArchiveMilestoneId =
  | 'firstRareRecruit'
  | 'firstTribulationSuccess'
  | 'firstDungeonClear'
  | 'firstEpicRecruit'
  | 'firstLegendaryRecruit'
  | 'discipleCount5'
  | 'firstFoundationBreakthrough'
  | 'firstGoldenCoreBreakthrough'
  | 'firstNascentSoulBreakthrough'
  | 'firstDungeonLevel10'
  | 'adventureRuns10'
  | 'firstTechniqueUnlock'
  | 'firstPetCapture'
  | 'firstItemCraft'
  | 'sectLevel5'
  | 'guixuRiftFirstClear'
  | 'firstLegacyForge'
  | 'legacyForgePair'
  | 'legacyForgeTrinity'
export type CasualtyTolerance = 'conservative' | 'balanced' | 'risky'
export type ExpeditionTeamRule = 'topPower' | 'balanced' | 'reserveCore'
export type ExpeditionRewardFocus = 'resources' | 'materials' | 'techniques' | 'pets' | 'progress'
export type ExpeditionFallbackRule = 'downgrade_dungeon' | 'swap_team' | 'pause_template'
export type BuildingProductionFocus = 'balanced' | 'cultivation' | 'crafting'
export type OverflowSellRule = 'hold' | 'sell'
export type SpiritStoneOverflowRule = 'hold' | 'buyHerb' | 'buyOre'
export type SectArchetype = 'swordBurst' | 'pillSustain' | 'arrayGuard' | 'beastHarvest'

export type ProductionCampaign = 'realmSprint' | 'forgeSprint' | 'recoverySprint' | 'expeditionPrep' | 'marketHarvest'

export interface RouteShiftState {
  currentArchetype: SectArchetype
  lastShiftAtDay: number | null
  shiftCooldownDays: number
  pendingShift: SectArchetype | null
  blendDaysRemaining: number
}

export interface ProductionCampaignState {
  activeCampaign: ProductionCampaign | null
  startedAtDay: number | null
  durationHours: number
  cooldownHours: number
  cooldownRemainingHours: number
}
export type RiskTier = 'safe' | 'press' | 'gamble' | 'destiny'

export interface TemplateConfidenceEntry {
  templateId: string
  score: number
  lastAdjustedAtDay: number | null
}

export interface RiskHookDescriptor {
  title: string
  exclusiveRewards: string[]
  likelyPenalty: string[]
  bestForArchetypes: SectArchetype[]
}

export type BuildingType =
  | 'mainHall'
  | 'spiritField'
  | 'spiritMine'
  | 'market'
  | 'alchemyFurnace'
  | 'forge'
  | 'scriptureHall'
  | 'recruitmentPavilion'

export type ResourceType = 'spiritStone' | 'spiritEnergy' | 'herb' | 'ore'

export interface Resources {
  spiritStone: number
  spiritEnergy: number
  herb: number
  ore: number
}

/** 自动生产队列状态（仅加工层建筑使用） */
export interface ProductionQueue {
  recipeId: string | null // 当前生产配方 ID，null 表示空闲
  progress: number // 当前累积进度（秒）
}

/** 资源仓库上限（运行时计算，不持久化） */
export interface ResourceCaps {
  spiritEnergy: number
  herb: number
  ore: number
}

/** 离线收益累积器 */
export interface OfflineAccumulator {
  resourcesGained: Resources
  breakthroughs: { characterName: string; targetRealm: string; success: boolean }[]
  itemsCrafted: { name: string; quantity: number }[]
  taxIncome: number
}

export interface ExpeditionTemplate {
  id: string
  name: string
  enabled: boolean
  dungeonId: string | null
  teamRule: ExpeditionTeamRule
  supplyLevel: 'basic' | 'enhanced' | 'luxury'
  riskTolerance: CasualtyTolerance
  rewardFocus: ExpeditionRewardFocus
  fallbackOnFailure: ExpeditionFallbackRule
  notes?: string
  riskTier?: RiskTier
  riskHookDescriptor?: RiskHookDescriptor
}

export interface Building {
  type: BuildingType
  level: number
  count: number
  unlocked: boolean
  productionQueue: ProductionQueue
}

export interface LegacyBonus {
  ascensionCount: number
  statBonus: number
  unlockedTechniques: string[]
  unlockedDungeons: string[]
}

export interface ArchiveMilestoneEntry {
  id: ArchiveMilestoneId
  unlockedAt: number
}

/** 宗门累计统计 */
export interface SectStats {
  totalSpiritStoneEarned: number
  totalSpiritStoneSpent: number
  totalBattles: number
  totalVictories: number
  totalKills: number
  maxFloorCleared: number
  totalRecruits: number
  totalBreakthroughAttempts: number
  totalBreakthroughSuccesses: number
  totalBuildingUpgrades: number
  totalAdventureRuns: number
  totalAdventureCompletions: number
  totalAdventureFailures: number
  totalPetCaptures: number
  totalPlayTime: number
  longestOfflineSeconds: number
}

/** 怪物图鉴条目状态 */
export type MonsterCodexState = 'encountered' | 'killed'

export interface SectAutomationSettings {
  reserveSpiritStone: number
  reserveSpiritEnergy: number
  preferredDungeonId: string | null
  casualtyTolerance: CasualtyTolerance
  autoBreakthrough: boolean
  productionFocus: BuildingProductionFocus
  overflowTriggerRatio: number
  herbOverflowRule: OverflowSellRule
  oreOverflowRule: OverflowSellRule
  spiritStoneOverflowRule: SpiritStoneOverflowRule
  activeTemplateId: string
  expeditionTemplates: ExpeditionTemplate[]
  routeShift: RouteShiftState
  productionCampaign: ProductionCampaignState
  templateConfidence: TemplateConfidenceEntry[]
}

export interface Sect {
  name: string
  level: number
  resources: Resources
  buildings: Building[]
  characters: Character[]
  vault: ItemStack[]
  maxVaultSlots: number
  pets: Pet[]
  totalAdventureRuns: number
  totalBreakthroughs: number
  lastTransmissionTime: number
  techniqueCodex: string[] // 已解锁功法 ID 列表
  offlineAccumulator: OfflineAccumulator
  sectPath: SectPath
  activeRoute: SectRouteId | null
  unlockedPathNodeIds: string[]
  pathUnlockedAt: number | null
  legacy: LegacyBonus
  stats: SectStats
  archiveMilestones: ArchiveMilestoneEntry[]
  automationSettings: SectAutomationSettings
  currentArchetype: SectArchetype
  strategySettings: SectStrategySettings
  autoRunDayCounter: number
  lastRandomEventTime: number
  monsterCodex: Record<string, MonsterCodexState>
  equipmentCodex: Record<string, Set<string>>
}
