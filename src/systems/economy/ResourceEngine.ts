// src/systems/economy/ResourceEngine.ts

import {
  getSpiritFieldHerbRate,
  getSpiritFieldRate,
  getSpiritMineOreRate,
  getSpiritMineRate,
} from '../../data/buildings'
import { REALM_EXP, getRealmStoneFloor } from '../../data/realms'
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
 * Formula: (5000 + mainHallLevel * 3000) * max(1, mainHallLevel - 2)          -- mainHallLevel <= 2
 *          (5000 + mainHallLevel * 3000) * 1.5 ^ (mainHallLevel - 2)          -- mainHallLevel > 2
 *
 * The exponential segment keeps storage ahead of late-game sinks: at main hall
 * level 10 the soft cap is ~897k, so the hard cap (soft cap * 5, see tickSlice)
 * comfortably covers the 1.5M final breakthrough cost.
 */
export function calcSpiritStoneCap(mainHallLevel: number): number {
  if (mainHallLevel <= 2) return 5000 + mainHallLevel * 3000
  return Math.round((5000 + mainHallLevel * 3000) * Math.pow(1.5, mainHallLevel - 2))
}

/**
 * Apply spirit stone soft cap decay to production rate.
 * When spirit stones exceed cap, production rate decays: actualRate = rate * (cap / current).
 * Minimum 10% production rate.
 */
export function applySpiritStoneDecay(rate: number, currentSpiritStone: number, mainHallLevel: number): number {
  const cap = calcSpiritStoneCap(mainHallLevel)
  if (currentSpiritStone <= cap) return rate
  const decayFactor = Math.max(0.1, cap / currentSpiritStone)
  return rate * decayFactor
}

export function clampResources(resources: Resources, caps: ResourceCaps, spiritStoneHardCap?: number): Resources {
  const spiritStone =
    spiritStoneHardCap != null ? Math.min(resources.spiritStone, spiritStoneHardCap) : resources.spiritStone
  return {
    spiritStone,
    spiritEnergy: Math.min(resources.spiritEnergy, caps.spiritEnergy),
    herb: Math.min(resources.herb, caps.herb),
    ore: Math.min(resources.ore, caps.ore),
  }
}

/**
 * Hard storage cap the tick clamps spirit stones to: main-hall soft cap ×5
 * with a realm-driven floor. The floor is keyed to the NEXT realm so the
 * upcoming breakthrough cost always fits with 10× headroom — keying it to the
 * current realm left the cap ~10^(ΔEXP-1)× short and permanently blocked every
 * major breakthrough past 金丹 (the B1 wall, reintroduced by the V2 curve).
 */
export function getSectStoneCap(mainHallLevel: number, bestRealm: number): number {
  const targetRealm = Math.min(Math.max(bestRealm + 1, 1), REALM_EXP.length - 1)
  return Math.max(calcSpiritStoneCap(mainHallLevel) * 5, getRealmStoneFloor(targetRealm))
}
