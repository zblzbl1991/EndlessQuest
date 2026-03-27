import type { Building } from '../../types/sect'
import type { BuildingType } from '../../types/sect'
import { SYNERGIES, type Synergy } from '../../data/buildings'

/**
 * Get all currently active synergies based on building levels.
 */
export function getActiveSynergies(buildings: Building[]): Synergy[] {
  return SYNERGIES.filter((synergy) =>
    synergy.requirements.every((req) => {
      const building = buildings.find((b) => b.type === req.building)
      return building && building.unlocked && building.level >= req.level
    }),
  )
}

/**
 * Get the total synergy multiplier bonus for a specific building.
 * Returns 1.0 + sum of all applicable synergy bonuses.
 * Special case: "开源节流" (market quality cap +1) is excluded from multiplier.
 */
export function getSynergyBonus(targetBuilding: BuildingType, buildings: Building[]): number {
  const active = getActiveSynergies(buildings)
  let bonus = 0

  for (const synergy of active) {
    if (synergy.effect.target === targetBuilding) {
      if (synergy.id === 'market_mining') continue
      bonus += synergy.effect.value
    }
  }

  return 1 + bonus
}

/**
 * Get the quality cap bonus for market from synergies.
 * Returns extra quality levels (0 or 1).
 */
export function getMarketQualityCapBonus(buildings: Building[]): number {
  const active = getActiveSynergies(buildings)
  return active.some(s => s.id === 'market_mining') ? 1 : 0
}
