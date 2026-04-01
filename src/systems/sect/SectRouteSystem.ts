import type { SectRouteId } from '../../data/sectRoutes'
import { SECT_ROUTES } from '../../data/sectRoutes'
import type { BuildingType } from '../../types/sect'
import type { Resources } from '../../types/sect'

/**
 * Get the active route for a given sect.
 * Returns the route definition or null if no route is active.
 */
export function getActiveRoute(routeId: SectRouteId | null) {
  return routeId ? (SECT_ROUTES[routeId] ?? null) : null
}

/**
 * Calculate route effects on building production.
 * Returns a multiplier for >= 1 if the route is active.
 */
export function calcBuildingRouteBonus(routeId: SectRouteId | null, buildingType: BuildingType): number {
  const route = getActiveRoute(routeId)
  if (!route) return 1
  return route.buildingBonus[buildingType] ?? 1
}

/**
 * Calculate how strongly the active route should bias an adventure reward resource.
 * Returns 1 when the route does not care about that resource.
 */
export function calcAdventureRouteRewardBonus(routeId: SectRouteId | null, resourceType: keyof Resources): number {
  if (!routeId) return 1

  const bonusTable: Record<SectRouteId, Partial<Record<keyof Resources, number>>> = {
    alchemy: { spiritStone: 1.05, herb: 1.15 },
    sword: { spiritStone: 1.1, ore: 1.1 },
    beast: { spiritStone: 1.05, spiritEnergy: 1.1, herb: 1.05 },
  }

  return bonusTable[routeId]?.[resourceType] ?? 1
}

/**
 * Mild combat bonuses that make route identity visible in exploration without overwhelming disciple build.
 */
export function calcAdventureRouteCombatBonus(routeId: SectRouteId | null): {
  atk: number
  def: number
  spd: number
} {
  if (!routeId) {
    return { atk: 1, def: 1, spd: 1 }
  }

  const bonusTable: Record<SectRouteId, { atk: number; def: number; spd: number }> = {
    alchemy: { atk: 1, def: 1.06, spd: 1.02 },
    sword: { atk: 1.12, def: 1, spd: 1.04 },
    beast: { atk: 1.04, def: 1.02, spd: 1.1 },
  }

  return bonusTable[routeId]
}

/**
 * Additive pet-capture bias from the active route.
 */
export function calcPetCaptureRouteBonus(routeId: SectRouteId | null): number {
  if (!routeId) return 0

  const bonusTable: Record<SectRouteId, number> = {
    alchemy: 0.03,
    sword: 0.02,
    beast: 0.12,
  }

  return bonusTable[routeId] ?? 0
}
