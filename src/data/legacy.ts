import type { LegacyBonus } from '../types/sect'

export interface LegacyRewardTier {
  ascensionCount: number
  statBonus: number
  description: string
  bonusType: 'statBonus' | 'qualityFloor' | 'technique' | 'dungeon' | 'chaosQuality'
  bonusValue?: string | number
}

export type LegacyPerkId = 'extraTemplateAlpha' | 'swiftRecovery' | 'omenInsight' | 'extraTemplateOmega'

export interface LegacyPerkDef {
  id: LegacyPerkId
  ascensionCount: number
  name: string
  description: string
}

export const LEGACY_PERKS: LegacyPerkDef[] = [
  {
    id: 'extraTemplateAlpha',
    ascensionCount: 1,
    name: '远征加签',
    description: '远征模板槽位提升至 4 个，飞升后可以保留更多挂机预案。',
  },
  {
    id: 'swiftRecovery',
    ascensionCount: 2,
    name: '养元回春',
    description: '休养弟子每日额外恢复 1 天，挂机折损更容易自行消化。',
  },
  {
    id: 'omenInsight',
    ascensionCount: 4,
    name: '天机风闻',
    description: '宗门更容易遇到正向山门风闻，离线报告也会整理成更清晰的风闻摘要。',
  },
  {
    id: 'extraTemplateOmega',
    ascensionCount: 7,
    name: '万象推演',
    description: '远征模板槽位提升至 5 个，高风险冲层与副产线巡猎可以长期并行。',
  },
]

export const LEGACY_REWARD_TIERS: LegacyRewardTier[] = [
  {
    ascensionCount: 1,
    statBonus: 5,
    description: '初始灵石翻倍，并解锁第 4 个远征模板槽',
    bonusType: 'statBonus',
    bonusValue: 1000,
  },
  {
    ascensionCount: 2,
    statBonus: 10,
    description: '弟子休养速度提升，挂机失利更容易自行恢复',
    bonusType: 'qualityFloor',
    bonusValue: 'spirit',
  },
  {
    ascensionCount: 3,
    statBonus: 15,
    description: '解锁隐藏功法',
    bonusType: 'technique',
    bonusValue: 'hongmengdaojue',
  },
  {
    ascensionCount: 4,
    statBonus: 20,
    description: '山门风闻转旺，更容易遇到正向宗门事件',
    bonusType: 'statBonus',
  },
  {
    ascensionCount: 5,
    statBonus: 25,
    description: '解锁隐藏秘境',
    bonusType: 'dungeon',
    bonusValue: 'guixuRift',
  },
  {
    ascensionCount: 7,
    statBonus: 35,
    description: '解锁第 5 个远征模板槽',
    bonusType: 'statBonus',
  },
  {
    ascensionCount: 10,
    statBonus: 50,
    description: '解锁混沌品质弟子概率',
    bonusType: 'chaosQuality',
  },
]

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

export function getUnlockedLegacyPerks(ascensionCount: number): LegacyPerkDef[] {
  return LEGACY_PERKS.filter((perk) => ascensionCount >= perk.ascensionCount)
}

export function getLegacyTemplateCapacity(ascensionCount: number): number {
  let capacity = 3
  if (ascensionCount >= 1) capacity = 4
  if (ascensionCount >= 7) capacity = 5
  return capacity
}

export function getLegacyRecoveryBonusDays(ascensionCount: number): number {
  return ascensionCount >= 2 ? 1 : 0
}

export function getLegacyPositiveEventBias(ascensionCount: number): number {
  return ascensionCount >= 4 ? 0.35 : 0
}
