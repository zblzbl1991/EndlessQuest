import type { SectRouteId } from '../../data/sectRoutes'
import { SECT_ROUTES } from '../../data/sectRoutes'
import type { BuildingType } from '../../types/sect'

/**
 * Get the active route for a given sect.
 * Returns the route definition or null if no route is active.
 */
export function getActiveRoute(routeId: SectRouteId | null) {
  return routeId ? SECT_ROUTES[routeId] ?? null : null
}

/**
 * Calculate route effects on building production.
 * Returns a multiplier for >= 1 if the route is active.
 */
export function calcBuildingRouteBonus(
  routeId: SectRouteId | null,
  buildingType: BuildingType,
): number {
  const route = getActiveRoute(routeId)
  if (!route) return 1
  return route.buildingBonus[buildingType] ?? 1
}
