// src/systems/economy/ResourceEngine.ts

import {
  getSpiritFieldHerbRate,
  getSpiritFieldRate,
  getSpiritMineOreRate,
  getSpiritMineRate,
} from '../../data/buildings'
import type { ResourceCaps, Resources } from '../../types/sect'

export type { Resources }

export interface BuildingLevels {
  spiritField: number
  spiritFieldCount: number
  spiritMine: number
  spiritMineCount: number
  mainHall: number
}

export interface ProductionBonuses {
  techniqueMultiplier: number
  discipleMultiplier: number
}

export interface ResourceRates {
  spiritEnergy: number
  herb: number
  ore: number
  spiritStone: number
}

export function calcResourceRates(
  buildingLevels: BuildingLevels,
  bonuses: ProductionBonuses = { techniqueMultiplier: 1, discipleMultiplier: 1 }
): ResourceRates {
  const totalMult = bonuses.techniqueMultiplier * bonuses.discipleMultiplier
  const sfLevel = buildingLevels.spiritField
  const sfCount = Math.max(0, buildingLevels.spiritFieldCount)
  const smLevel = buildingLevels.spiritMine
  const smCount = Math.max(0, buildingLevels.spiritMineCount)

  const spiritEnergy = sfLevel > 0 ? getSpiritFieldRate(sfLevel) * sfCount * totalMult : 0
  const spiritStone = smLevel > 0 ? getSpiritMineRate(smLevel) * smCount * totalMult : 0
  const herb = sfLevel > 0 ? getSpiritFieldHerbRate(sfLevel) * sfCount * totalMult : 0
  const ore = smLevel > 0 ? getSpiritMineOreRate(smLevel) * smCount * totalMult : 0

  return { spiritEnergy, spiritStone, herb, ore }
}

/**
 * Calculate sect tax (spirit stone income from main hall).
 * Formula: sectLevel * discipleCount * 0.05 per second
 */
export function calcTaxRate(sectLevel: number, discipleCount: number): number {
  return sectLevel * discipleCount * 0.05
}

/**
 * Calculate spirit stone soft cap based on main hall level.
 * Formula: (5000 + mainHallLevel * 3000) * max(1, mainHallLevel - 2)
 */
export function calcSpiritStoneCap(mainHallLevel: number): number {
  if (mainHallLevel <= 2) return 5000 + mainHallLevel * 3000
  return (5000 + mainHallLevel * 3000) * Math.max(1, mainHallLevel - 2)
}

/**
 * Apply spirit stone soft cap decay to production rate.
 * When spirit stones exceed cap, production rate decays: actualRate = rate * (cap / current).
 * Minimum 10% production rate. Tax income is NOT affected.
 */
export function applySpiritStoneDecay(rate: number, currentSpiritStone: number, mainHallLevel: number): number {
  const cap = calcSpiritStoneCap(mainHallLevel)
  if (currentSpiritStone <= cap) return rate
  const decayFactor = Math.max(0.1, cap / currentSpiritStone)
  return rate * decayFactor
}

export function clampResources(resources: Resources, caps: ResourceCaps): Resources {
  return {
    spiritStone: resources.spiritStone,
    spiritEnergy: Math.min(resources.spiritEnergy, caps.spiritEnergy),
    herb: Math.min(resources.herb, caps.herb),
    ore: Math.min(resources.ore, caps.ore),
  }
}
