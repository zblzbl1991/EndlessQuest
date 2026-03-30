import type { LegacyBonus } from '../types/sect'

export interface LegacyRewardTier {
  ascensionCount: number
  statBonus: number // percentage
  description: string
  bonusType: 'statBonus' | 'qualityFloor' | 'technique' | 'dungeon' | 'chaosQuality'
  bonusValue?: string | number
}

export const LEGACY_REWARD_TIERS: LegacyRewardTier[] = [
  {
    ascensionCount: 1,
    statBonus: 5,
    description: '初始灵石 x2 (1000)',
    bonusType: 'statBonus',
    bonusValue: 1000,
  },
  {
    ascensionCount: 2,
    statBonus: 10,
    description: '招募品质保底: 灵品',
    bonusType: 'qualityFloor',
    bonusValue: 'spirit',
  },
  {
    ascensionCount: 3,
    statBonus: 15,
    description: '解锁隐藏功法',
    bonusType: 'technique',
    bonusValue: 'hidden_1',
  },
  {
    ascensionCount: 5,
    statBonus: 25,
    description: '解锁隐藏秘境',
    bonusType: 'dungeon',
    bonusValue: 'hidden_dungeon_1',
  },
  {
    ascensionCount: 10,
    statBonus: 50,
    description: '解锁混沌品质弟子概率',
    bonusType: 'chaosQuality',
  },
]

/**
 * Returns the cumulative legacy bonuses for a given ascension count.
 * Accumulates stat bonus and collects all unlocked techniques/dungeons
 * from tiers at or below the current ascension count.
 */
export function getLegacyBonus(ascensionCount: number): LegacyBonus {
  let statBonus = 0
  const unlockedTechniques: string[] = []
  const unlockedDungeons: string[] = []

  for (const tier of LEGACY_REWARD_TIERS) {
    if (ascensionCount >= tier.ascensionCount) {
      statBonus = tier.statBonus
      if (tier.bonusType === 'technique' && typeof tier.bonusValue === 'string') {
        unlockedTechniques.push(tier.bonusValue)
      }
      if (tier.bonusType === 'dungeon' && typeof tier.bonusValue === 'string') {
        unlockedDungeons.push(tier.bonusValue)
      }
    }
  }

  return {
    ascensionCount,
    statBonus,
    unlockedTechniques,
    unlockedDungeons,
  }
}
