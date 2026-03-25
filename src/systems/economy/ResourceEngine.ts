// src/systems/economy/ResourceEngine.ts

import { getSpiritFieldRate } from '../../data/buildings'

export interface BuildingLevels {
  spiritField: number  // 灵田 level, 0 = not built
  mainHall: number
}

export interface ProductionBonuses {
  techniqueMultiplier: number
  discipleMultiplier: number
}

export interface ResourceRates {
  spiritEnergy: number  // per second
  herb: number          // per second
  ore: number           // per second (0 in Phase 2)
  spiritStone: number   // per second (0 in Phase 2)
}

export function calcResourceRates(
  buildingLevels: BuildingLevels,
  bonuses: ProductionBonuses = { techniqueMultiplier: 1, discipleMultiplier: 1 }
): ResourceRates {
  const totalMult = bonuses.techniqueMultiplier * bonuses.discipleMultiplier
  const sfLevel = buildingLevels.spiritField

  // Spirit energy: uses the canonical getSpiritFieldRate formula (1 + (level-1)*3)
  // Minimum 1/s (zero-resource protection)
  const spiritEnergy = Math.max(1, getSpiritFieldRate(sfLevel) * totalMult)

  // Herb: only from spirit field (0.1 per level)
  const herb = sfLevel > 0 ? 0.1 * sfLevel * totalMult : 0

  return {
    spiritEnergy,
    herb,
    ore: 0,
    spiritStone: 0,
  }
}
