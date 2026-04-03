// src/systems/sect/SectEngine.ts

import type { Building } from '../../types'
import type { SectRouteId } from '../../data/sectRoutes'
import type { Character } from '../../types/character'
import { calcSectLevel, getMaxSimultaneousRuns } from '../character/CharacterEngine'
import { calcResourceRates } from '../economy/ResourceEngine'
import type { ProductionBonuses } from '../economy/ResourceEngine'
import { calcCultivationRate } from '../cultivation/CultivationEngine'
import { getBuildingBonus } from '../character/SpecialtySystem'
import { getSynergyBonus } from '../economy/SynergySystem'
import { calcBuildingRouteBonus } from './SectRouteSystem'

// Re-export for backward compatibility.
export { calcSectLevel, getMaxSimultaneousRuns }

/** Spirit energy consumed per second by each idle (cultivating) disciple. */
const SPIRIT_ENERGY_PER_DISCIPLE = 2

/**
 * Calculate the maximum number of disciples the sect can sustain
 * based on current resource production capacity.
 *
 * The cap ensures spirit energy net production never goes negative:
 *   spiritEnergyProduction >= disciples × SPIRIT_ENERGY_PER_DISCIPLE
 *
 * All multipliers (technique, specialty, synergy, route) are included.
 */
export function calcMaxDisciplesByResources(
  buildings: Building[],
  characters: Character[],
  activeRoute: SectRouteId | null
): number {
  const sfLevel = buildings.find((b) => b.type === 'spiritField')?.level ?? 0
  const sfCount = buildings.find((b) => b.type === 'spiritField')?.count ?? 0
  const smLevel = buildings.find((b) => b.type === 'spiritMine')?.level ?? 0
  const smCount = buildings.find((b) => b.type === 'spiritMine')?.count ?? 0
  const mhLevel = buildings.find((b) => b.type === 'mainHall')?.level ?? 0

  // No spirit fields → can only sustain 1 disciple (minimum)
  if (sfLevel === 0 || sfCount === 0) return 1

  // Technique multiplier from best cultivating character
  const maxTechRate = characters
    .filter((c) => c.status === 'idle' && c.learnedTechniques.length > 0)
    .reduce((max, c) => {
      const rate = calcCultivationRate(c, c.learnedTechniques)
      const baseRate = calcCultivationRate(c, [])
      if (baseRate === 0) return max
      return Math.max(max, rate / baseRate)
    }, 1)

  const bonuses: ProductionBonuses = { techniqueMultiplier: maxTechRate, discipleMultiplier: 1 }

  const rates = calcResourceRates(
    {
      spiritField: sfLevel,
      spiritFieldCount: sfCount,
      spiritMine: smLevel,
      spiritMineCount: smCount,
      mainHall: mhLevel,
    },
    bonuses
  )

  // Specialty bonuses from disciples assigned to spirit field
  const fieldSpecialties = characters
    .filter((c) => c.status === 'training' && c.assignedBuilding === 'spiritField')
    .flatMap((c) => c.specialties)
  rates.spiritEnergy *= getBuildingBonus('spiritField', fieldSpecialties)

  // Synergy bonuses
  rates.spiritEnergy *= getSynergyBonus('spiritField', buildings)

  // Route bonuses
  rates.spiritEnergy *= calcBuildingRouteBonus(activeRoute, 'spiritField')

  const maxDisciples = Math.floor(rates.spiritEnergy / SPIRIT_ENERGY_PER_DISCIPLE)
  return Math.max(1, maxDisciples)
}
