import type { CharacterQuality, GrowthMultipliers } from '../../types/character'

const QUALITY_GROWTH_MULT: Record<CharacterQuality, number> = {
  common: 1,
  spirit: 1.2,
  immortal: 1.5,
  divine: 2,
  chaos: 3,
}

export interface DungeonGrowthResult {
  /** Base stat boosts: hp, atk, def */
  statBoost: { hp: number; atk: number; def: number }
  /** Cultivation progress gained */
  cultivationGain: number
}

/**
 * Calculate permanent stat and cultivation growth from a dungeon run.
 * Only applied on completed or retreated runs (not failed).
 */
export function calcDungeonGrowth(
  floorsCleared: number,
  quality: CharacterQuality,
  growthMultipliers?: GrowthMultipliers
): DungeonGrowthResult {
  const mult = QUALITY_GROWTH_MULT[quality] ?? 1
  const gm = growthMultipliers ?? { hp: 1, atk: 1, def: 1 }

  return {
    statBoost: {
      hp: Math.floor(2 * floorsCleared * mult * gm.hp),
      atk: Math.floor(1 * floorsCleared * mult * gm.atk),
      def: Math.floor(1 * floorsCleared * mult * gm.def),
    },
    cultivationGain: Math.floor(10 * floorsCleared * mult),
  }
}
