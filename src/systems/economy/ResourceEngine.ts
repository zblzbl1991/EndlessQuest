// src/systems/economy/ResourceEngine.ts

import { getSpiritFieldRate, getSpiritMineRate, getSpiritMineOreRate } from '../../data/buildings'

export interface BuildingLevels {
  spiritField: number
  spiritMine: number
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
  const smLevel = buildingLevels.spiritMine

  const spiritEnergy = sfLevel > 0 ? getSpiritFieldRate(sfLevel) * totalMult : 0
  const spiritStone = smLevel > 0 ? getSpiritMineRate(smLevel) * totalMult : 0
  const herb = sfLevel > 0 ? 0.1 * sfLevel * totalMult : 0
  const ore = smLevel > 0 ? getSpiritMineOreRate(smLevel) * totalMult : 0

  return { spiritEnergy, spiritStone, herb, ore }
}
