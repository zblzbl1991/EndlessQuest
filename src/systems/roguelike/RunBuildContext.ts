import type { RunBuildBiasContext } from '../../types/runBuild'
import { useSectStore } from '../../stores/sectStore'

/** Shared helper: build the bias context for run generation from current sect state. */
export function getRunBuildBiasContext(): RunBuildBiasContext {
  const sect = useSectStore.getState().sect
  return {
    routeId: sect.activeRoute,
    buildingLevels: Object.fromEntries(sect.buildings.map((building) => [building.type, building.level])),
  }
}
