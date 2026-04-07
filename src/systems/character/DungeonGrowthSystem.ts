import type { CharacterQuality } from '../../types/character'

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
export function calcDungeonGrowth(floorsCleared: number, quality: CharacterQuality): DungeonGrowthResult {
  const mult = QUALITY_GROWTH_MULT[quality] ?? 1

  return {
    statBoost: {
      hp: Math.floor(2 * floorsCleared * mult),
      atk: Math.floor(1 * floorsCleared * mult),
      def: Math.floor(1 * floorsCleared * mult),
    },
    cultivationGain: Math.floor(10 * floorsCleared * mult),
  }
}
