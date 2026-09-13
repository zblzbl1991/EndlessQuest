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
    daoYun: 0, // daoYun accumulates on Sect.legacy via performAscension, not from tiers
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

// ---------------------------------------------------------------------------
// 道韵（Prestige currency）与飞升树效果查询
// ---------------------------------------------------------------------------

/**
 * 道韵公式（设计稿 §7.2）：
 *   floor( (本世最高修为)^0.1 / 1000 × (1 + 0.3 × 最高境界index) × 4^历史飞升次数 )
 *
 * 幂 0.1 使道韵随境界曲线温和超线性增长；境界项奖励打得越深。次数项取 4^n：
 * 境界表只有 9 境时本世峰值修为封顶于 1e40，若沿用线性 (1+0.25n) 项，同峰值下
 * 每次飞升只多 ~25%，违反 §7.2"每多飞升一次道韵至少为上一次 4 倍"的校准律——
 * 4^n 恰好兑现该规则（首飞渡劫 ≈ 34，二飞 ≈ 136，三飞 ≈ 545 …）。
 */
export function calcDaoYunGain(
  peakCultivationThisRun: number,
  highestRealmIndex: number,
  ascensionCount: number
): number {
  const peak = Math.max(0, peakCultivationThisRun)
  if (peak <= 0) return 0
  const peakTerm = Math.pow(peak, 0.1) / 1000
  const realmTerm = 1 + 0.3 * Math.max(0, highestRealmIndex)
  const ascensionTerm = Math.pow(4, Math.max(0, ascensionCount))
  return Math.floor(peakTerm * realmTerm * ascensionTerm)
}

function treeLevel(tree: Record<string, number> | undefined, nodeId: string): number {
  return tree?.[nodeId] ?? 0
}

/** 修炼之道"道心通明"：修为速率 ×2/级。 */
export function getLegacyCultivationMult(tree?: Record<string, number>): number {
  return 2 ** treeLevel(tree, 'daoxin')
}

/** 资源之道"灵脉充盈"：灵石产量 ×3/级。 */
export function getLegacyStoneMult(tree?: Record<string, number>): number {
  return 3 ** treeLevel(tree, 'stoneVein')
}

/** 资源之道"灵泉涌动"：灵气产量 ×3/级。 */
export function getLegacyEnergyMult(tree?: Record<string, number>): number {
  return 3 ** treeLevel(tree, 'spiritWell')
}

/** 资源之道"时光洞悉"：离线收益上限 +24h/级。 */
export function getLegacyOfflineBonusHours(tree?: Record<string, number>): number {
  return 24 * treeLevel(tree, 'temporalInsight')
}

/** 战斗之道"战意凌霄"：弟子战斗属性 ×2/级（折算为属性加成百分比，并入 statBonus 管线）。 */
export function getLegacyBattleStatBonus(tree?: Record<string, number>): number {
  return 100 * treeLevel(tree, 'battleAura')
}

/** 战斗之道"财气亨通"：秘境资源收益 ×2/级。 */
export function getLegacyDropMult(tree?: Record<string, number>): number {
  return 2 ** treeLevel(tree, 'fortuneCharm')
}

/** 战斗之道"道心坚定"：突破成功率 +5%/级（即失败率减免）。 */
export function getLegacyBreakthroughBonus(tree?: Record<string, number>): number {
  return 0.05 * treeLevel(tree, 'heartSteadfast')
}

/** 天机之道"天机推演"：是否解锁自动飞升。 */
export function isAutoAscendUnlocked(tree?: Record<string, number>): boolean {
  return treeLevel(tree, 'heavenPivot') > 0
}

/** 飞升 statBonus 与飞升树战斗节点的合并属性加成（createCharacterCombatUnit 消费）。 */
export function getEffectiveLegacyStatBonus(legacy: LegacyBonus, tree?: Record<string, number>): number {
  return legacy.statBonus + getLegacyBattleStatBonus(tree)
}
