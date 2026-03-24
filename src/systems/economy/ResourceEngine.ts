// src/systems/economy/ResourceEngine.ts

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

// Base production rates per second (with level 1 building)
const BASE_RATES = {
  spiritEnergy: 1,      // always at least 1/s even with no buildings
  herb: 0.1,
  ore: 0,
  spiritStone: 0,
} as const

// Building multiplier: level 0 = 0x (no production), level 1 = 1x, etc.
// spiritField produces spiritEnergy and herb
function getBuildingMultiplier(level: number): number {
  return level > 0 ? level : 0
}

export function calcResourceRates(
  buildingLevels: BuildingLevels,
  bonuses: ProductionBonuses = { techniqueMultiplier: 1, discipleMultiplier: 1 }
): ResourceRates {
  const sfMult = getBuildingMultiplier(buildingLevels.spiritField)
  const totalMult = bonuses.techniqueMultiplier * bonuses.discipleMultiplier

  // Spirit energy: minimum 1/s (zero-resource protection)
  const spiritEnergyBase = Math.max(BASE_RATES.spiritEnergy, BASE_RATES.spiritEnergy * sfMult)
  const spiritEnergy = spiritEnergyBase * totalMult

  // Herb: only from spirit field
  const herb = BASE_RATES.herb * sfMult * totalMult

  return {
    spiritEnergy,
    herb,
    ore: BASE_RATES.ore,
    spiritStone: BASE_RATES.spiritStone,
  }
}
