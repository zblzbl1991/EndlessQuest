import type { RiskTier, SectArchetype, ExpeditionRewardFocus } from '../../types'
import type { RiskHookDescriptor } from '../../types/sect'

export interface RiskRewardModifier {
  rewardMultiplier: number
  failureRecoveryPenalty: number
  injuryChanceMultiplier: number
  supplyConsumptionMultiplier: number
}

const RISK_TIER_MODIFIERS: Record<RiskTier, RiskRewardModifier> = {
  safe: {
    rewardMultiplier: 1.0,
    failureRecoveryPenalty: 0.5,
    injuryChanceMultiplier: 0.8,
    supplyConsumptionMultiplier: 1.0,
  },
  press: {
    rewardMultiplier: 1.2,
    failureRecoveryPenalty: 0.7,
    injuryChanceMultiplier: 1.0,
    supplyConsumptionMultiplier: 1.1,
  },
  gamble: {
    rewardMultiplier: 1.5,
    failureRecoveryPenalty: 1.0,
    injuryChanceMultiplier: 1.3,
    supplyConsumptionMultiplier: 1.2,
  },
  destiny: {
    rewardMultiplier: 2.0,
    failureRecoveryPenalty: 1.5,
    injuryChanceMultiplier: 1.5,
    supplyConsumptionMultiplier: 1.4,
  },
}

const ARCHETYPE_RISK_BONUS: Record<SectArchetype, Partial<Record<RiskTier, number>>> = {
  swordBurst: { press: 0.1, gamble: 0.2, destiny: 0.15 },
  pillSustain: { safe: 0.1, press: 0.05 },
  arrayGuard: { safe: 0.05, press: 0.1, destiny: 0.1 },
  beastHarvest: { safe: 0.1, press: 0.05, gamble: 0.05 },
}

/** Get the reward modifier for a given risk tier, archetype, and reward focus */
export function getRiskRewardModifier(
  riskTier: RiskTier | undefined,
  archetype: SectArchetype | undefined,
  _rewardFocus: ExpeditionRewardFocus | undefined
): RiskRewardModifier {
  const base = RISK_TIER_MODIFIERS[riskTier ?? 'safe']
  const archetypeBonus = archetype ? (ARCHETYPE_RISK_BONUS[archetype]?.[riskTier ?? 'safe'] ?? 0) : 0

  return {
    ...base,
    rewardMultiplier: base.rewardMultiplier + archetypeBonus,
  }
}

/** Get a human-readable risk description */
export function getRiskDescription(riskTier: RiskTier | undefined): string {
  switch (riskTier) {
    case 'safe':
      return '低风险低回报的稳定修行路线，适合日常挂机。'
    case 'press':
      return '适度冒险以获取更多资源，弟子疲劳度会略增。'
    case 'gamble':
      return '高风险高回报的押注路线，失败代价沉重但成功收益可观。'
    case 'destiny':
      return '以宗门命运为赌注的终极押注，成功可获独占终盘素材，失败则节奏大退。'
    default:
      return '风险等级未知。'
  }
}

/** Get the failure penalty bundle description */
export function getFailurePenaltyDescription(riskTier: RiskTier | undefined): string[] {
  switch (riskTier) {
    case 'safe':
      return ['少量资源损失', '弟子短暂恢复']
    case 'press':
      return ['中等资源损失', '弟子疲劳增加']
    case 'gamble':
      return ['大量资源损失', '弟子重伤需长时间恢复', '宗门节奏受挫']
    case 'destiny':
      return ['巨额资源损失', '主力队伍严重疲劳', '宗门节奏大幅回退', '可能丢失关键突破窗口']
    default:
      return ['未知后果']
  }
}

/** Check if an archetype is well-suited for a given risk tier */
export function isArchetypeFitForRisk(
  archetype: SectArchetype | undefined,
  riskHook: RiskHookDescriptor | undefined
): boolean {
  if (!archetype || !riskHook) return true
  return riskHook.bestForArchetypes.includes(archetype)
}

/** Get archetype fit label */
export function getArchetypeFitLabel(
  archetype: SectArchetype | undefined,
  riskHook: RiskHookDescriptor | undefined
): { label: string; fit: 'good' | 'neutral' | 'poor' } {
  if (!archetype || !riskHook) return { label: '适配未知', fit: 'neutral' }
  const isFit = riskHook.bestForArchetypes.includes(archetype)
  if (isFit) {
    return { label: '路线适配', fit: 'good' }
  }
  return { label: '路线不适配', fit: 'poor' }
}
