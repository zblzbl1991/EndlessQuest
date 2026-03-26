// src/systems/economy/BuildingEffects.ts
// Buff calculation functions for buildings.

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
// Scripture Hall (藏经阁) – study unlock
// ---------------------------------------------------------------------------

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
// Convenience multipliers that take buildings array directly
// ---------------------------------------------------------------------------

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

export function getPotionEffectMult(
  buildings: { type: BuildingType; level: number }[],
): number {
  return getAlchemyBuff(getBuildingLevel(buildings, 'alchemyFurnace')).potionEffectMult
}
