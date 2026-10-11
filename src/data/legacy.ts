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
 * 道韵公式（V2.1 深度+速度双维，map 工单 01；取代 ba29b2c 的 4^n 次数项）：
 *   floor( 10 × (本世最高修为 / 1e40)^0.15 × (1 + 0.3 × 最高境界index) × (1 + 0.25 × 历史飞升次数) )
 *
 * 增长必须来自"推得更深"而不是"飞得更多"：peakTerm 锚定渡劫峰值（1e40 → 10），
 * 幂 0.15 使每推深一个数量级道韵 ×1.41，严格高于 rush 重复飞升的线性次数项 ×1.25——
 * 同峰值下重复飞升收益停滞（仅 ×1.25/次），推深单调更优。
 * 旧 4^n 项的前提（凡界封顶 1e40、"每世收益≥×4"只能靠次数项兑现）随仙界层
 * （工单 07 提供 1e50~1e100 深度空间）落地而废除，详见
 * .scratch/v21-endgame-ladder/issues/01-dao-yun-economy.md。
 */
export const DAO_YUN_PEAK_EXP = 0.15
export const DAO_YUN_PEAK_ANCHOR = 1e40

export function calcDaoYunGain(
  peakCultivationThisRun: number,
  highestRealmIndex: number,
  ascensionCount: number
): number {
  const peak = Math.max(0, peakCultivationThisRun)
  if (peak <= 0) return 0
  const peakTerm = 10 * Math.pow(peak / DAO_YUN_PEAK_ANCHOR, DAO_YUN_PEAK_EXP)
  const realmTerm = 1 + 0.3 * Math.max(0, highestRealmIndex)
  const ascensionTerm = 1 + 0.25 * Math.max(0, ascensionCount)
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

/** 天机之道"道韵精粹"：全体修为速率与资源产出 ×1.03/级（无限水槽节点，工单 01）。 */
export function getLegacyDaoEssenceMult(tree?: Record<string, number>): number {
  return 1.03 ** treeLevel(tree, 'daoEssence')
}

/** 飞升 statBonus 与飞升树战斗节点的合并属性加成（createCharacterCombatUnit 消费）。 */
export function getEffectiveLegacyStatBonus(legacy: LegacyBonus, tree?: Record<string, number>): number {
  return legacy.statBonus + getLegacyBattleStatBonus(tree)
}
