// src/systems/economy/BuildingEffects.ts
// Buff calculation functions for all 6 "empty" buildings.

import type { BuildingType } from '../../types/sect'

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

export function getBuildingLevel(
  buildings: { type: BuildingType; level: number }[],
  type: BuildingType,
): number {
  return buildings.find((b) => b.type === type)?.level ?? 0
}

// ---------------------------------------------------------------------------
// Market (坊市) – refresh +1/day per level, quality cap = level
// ---------------------------------------------------------------------------

export interface MarketBuff {
  dailyRefreshCount: number
  qualityCapIndex: number
}

export function getMarketBuff(marketLevel: number): MarketBuff {
  return {
    dailyRefreshCount: 1 + marketLevel,
    qualityCapIndex: marketLevel,
  }
}

export function getMarketUnlockLevel(): number {
  return 3
}

// ---------------------------------------------------------------------------
// Alchemy (丹炉) – potion effect +20% per level
// ---------------------------------------------------------------------------

export interface AlchemyBuff {
  potionEffectMult: number
}

export function getAlchemyBuff(alchemyLevel: number): AlchemyBuff {
  return {
    potionEffectMult: 1 + 0.2 * alchemyLevel,
  }
}

export function getAlchemyUnlockLevel(): number {
  return 3
}

// ---------------------------------------------------------------------------
// Forge (炼器坊) – success +10% per level, cost -10% per level (cap 70%)
// ---------------------------------------------------------------------------

export interface ForgeBuff {
  successBonus: number
  costReduction: number
}

export function getForgeBuff(forgeLevel: number): ForgeBuff {
  return {
    successBonus: 0.1 * forgeLevel,
    costReduction: Math.min(0.7, 0.1 * forgeLevel),
  }
}

export function getForgeUnlockLevel(): number {
  return 3
}

// ---------------------------------------------------------------------------
// Scripture Hall (藏经阁) – comprehension +15% per level
// ---------------------------------------------------------------------------

export interface ScriptureBuff {
  comprehensionMult: number
}

export function getScriptureBuff(scriptureLevel: number): ScriptureBuff {
  return {
    comprehensionMult: 1 + 0.15 * scriptureLevel,
  }
}

export function getStudyUnlockLevel(): number {
  return 3
}

// ---------------------------------------------------------------------------
// Recruitment Pavilion (聚仙台) – recruit cost -10% per level (min 40%)
// ---------------------------------------------------------------------------

export interface RecruitBuff {
  costMult: number
}

export function getRecruitBuff(recruitLevel: number): RecruitBuff {
  return {
    costMult: Math.max(0.4, 1 - 0.1 * recruitLevel),
  }
}

export function getTargetedRecruitUnlockLevel(): number {
  return 3
}

// ---------------------------------------------------------------------------
// Training Hall (传功殿) – cultivation speed +10% per level
// ---------------------------------------------------------------------------

export interface TrainingBuff {
  speedMult: number
}

export function getTrainingBuff(trainingLevel: number): TrainingBuff {
  return {
    speedMult: 1 + 0.1 * trainingLevel,
  }
}

export function getGroupTransmissionUnlockLevel(): number {
  return 3
}

// ---------------------------------------------------------------------------
// Convenience multipliers that take buildings array directly
// ---------------------------------------------------------------------------

export function getTrainingSpeedMult(
  buildings: { type: BuildingType; level: number }[],
): number {
  return getTrainingBuff(getBuildingLevel(buildings, 'trainingHall')).speedMult
}

export function getEnhanceSuccessBonus(
  buildings: { type: BuildingType; level: number }[],
): number {
  return getForgeBuff(getBuildingLevel(buildings, 'forge')).successBonus
}

export function getEnhanceCostReduction(
  buildings: { type: BuildingType; level: number }[],
): number {
  return getForgeBuff(getBuildingLevel(buildings, 'forge')).costReduction
}

export function getRecruitCostMult(
  buildings: { type: BuildingType; level: number }[],
): number {
  return getRecruitBuff(getBuildingLevel(buildings, 'recruitmentPavilion')).costMult
}

export function getComprehensionSpeedMult(
  buildings: { type: BuildingType; level: number }[],
): number {
  // BUG FIX: return comprehensionMult (not speedMult) as intended by the
  // building system design.
  return getScriptureBuff(getBuildingLevel(buildings, 'scriptureHall')).comprehensionMult
}

export function getPotionEffectMult(
  buildings: { type: BuildingType; level: number }[],
): number {
  return getAlchemyBuff(getBuildingLevel(buildings, 'alchemyFurnace')).potionEffectMult
}
