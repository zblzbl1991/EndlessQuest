import type { SectPath } from '../../types/sect'
import { getPathEffects } from '../../data/sectPaths'
import type { PathEffect } from '../../data/sectPaths'

/**
 * A flat map from effect type to its value.
 * For multiplier effects, the value represents the multiplier (e.g. 1.1 = +10%).
 * For flat effects, the value is the flat bonus (e.g. 3 = +3 slots).
 */
export type PathEffectMap = Record<string, number>

/**
 * Build a PathEffectMap from sect path state.
 * Returns a map of effect type -> value for quick lookup in game systems.
 */
export function buildPathEffectMap(pathId: SectPath, unlockedNodeIds: string[]): PathEffectMap {
  const effects = getPathEffects(pathId, unlockedNodeIds)
  return buildEffectMapFromList(effects)
}

/**
 * Build a PathEffectMap from an array of PathEffect entries.
 * For multiplier effects that appear multiple times, values are multiplied together.
 * For additive effects, values are summed.
 */
export function buildEffectMapFromList(effects: PathEffect[]): PathEffectMap {
  const map: PathEffectMap = {}
  for (const effect of effects) {
    if (effect.type in map) {
      map[effect.type] *= effect.value
    } else {
      map[effect.type] = effect.value
    }
  }
  return map
}

/**
 * Get a multiplier effect from the map, defaulting to 1 (no change).
 */
export function getMultEffect(map: PathEffectMap, type: string): number {
  return map[type] ?? 1
}

/**
 * Get an additive/flat effect from the map, defaulting to 0 (no bonus).
 */
export function getFlatEffect(map: PathEffectMap, type: string): number {
  return map[type] ?? 0
}

// ---------------------------------------------------------------------------
// Sect path combat effects interface
// ---------------------------------------------------------------------------

/**
 * Combat-relevant sect path effects passed to combat unit creation and combat simulation.
 * This is a subset of PathEffectMap that only includes combat fields,
 * making it clear what effects combat systems care about.
 */
export interface SectPathCombatEffects {
  atk: number
  crit: number
  spd: number
  bossDmg: number
  aoeDmg: number
}

const EMPTY_COMBAT_EFFECTS: SectPathCombatEffects = {
  atk: 1,
  crit: 1,
  spd: 1,
  bossDmg: 1,
  aoeDmg: 1,
}

/**
 * Extract combat-relevant effects from a PathEffectMap.
 */
export function getCombatEffects(map: PathEffectMap): SectPathCombatEffects {
  return {
    atk: getMultEffect(map, 'atk'),
    crit: getMultEffect(map, 'crit'),
    spd: getMultEffect(map, 'spd'),
    bossDmg: getMultEffect(map, 'bossDmg'),
    aoeDmg: getMultEffect(map, 'aoeDmg'),
  }
}

/**
 * Return the empty (no-op) combat effects.
 */
export function getEmptyCombatEffects(): SectPathCombatEffects {
  return { ...EMPTY_COMBAT_EFFECTS }
}
