import type { RiskTier, SectArchetype, ExpeditionRewardFocus, ProductionCampaign } from '../../types'
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

// ---...--- Phase 4: Campaign modifiers for risk-reward closed loop ---...---

const CAMPAIGN_RISK_ADJUSTMENTS: Record<
  ProductionCampaign,
  { rewardBonus: number; recoveryReduction: number; injuryReduction: number }
> = {
  expeditionPrep: { rewardBonus: 0.15, recoveryReduction: 0.1, injuryReduction: 0.1 },
  recoverySprint: { rewardBonus: 0, recoveryReduction: 0.3, injuryReduction: 0.2 },
  forgeSprint: { rewardBonus: 0.1, recoveryReduction: 0, injuryReduction: 0 },
  realmSprint: { rewardBonus: 0, recoveryReduction: 0, injuryReduction: 0 },
  marketHarvest: { rewardBonus: 0, recoveryReduction: 0, injuryReduction: 0 },
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

/**
 * Get risk-reward modifier with campaign integration.
 * Campaigns can improve recovery, reduce injury chance, and boost rewards.
 */
export function getRiskRewardModifierWithCampaign(
  riskTier: RiskTier | undefined,
  archetype: SectArchetype | undefined,
  rewardFocus: ExpeditionRewardFocus | undefined,
  campaign: ProductionCampaign | null
): RiskRewardModifier {
  const base = getRiskRewardModifier(riskTier, archetype, rewardFocus)
  if (!campaign) return base

  const campaignAdj = CAMPAIGN_RISK_ADJUSTMENTS[campaign]
  return {
    rewardMultiplier: base.rewardMultiplier + campaignAdj.rewardBonus,
    failureRecoveryPenalty: Math.max(0, base.failureRecoveryPenalty - campaignAdj.recoveryReduction),
    injuryChanceMultiplier: Math.max(0, base.injuryChanceMultiplier - campaignAdj.injuryReduction),
    supplyConsumptionMultiplier: base.supplyConsumptionMultiplier,
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

/** Generate a narrative sentence about why a gamble was worth it or not */
export function buildGambleNarrative(input: {
  riskTier: RiskTier | undefined
  archetype: SectArchetype | undefined
  campaign: ProductionCampaign | null
  result: 'completed' | 'failed' | 'retreated'
  archetypeFit: 'good' | 'neutral' | 'poor'
}): string {
  const { riskTier, campaign, result, archetypeFit } = input
  const isHighRisk = riskTier === 'gamble' || riskTier === 'destiny'

  if (!isHighRisk) return ''

  if (result === 'completed') {
    if (campaign === 'expeditionPrep') {
      return '远征专项准备充分，本轮押注比预期更稳，收获也更满。'
    }
    if (archetypeFit === 'good') {
      return '路线与高风险模板高度适配，本轮押注充分发挥了宗门优势。'
    }
    return '本轮押注成功，但路线匹配度一般，若配合专项准备会更稳。'
  }

  if (result === 'failed') {
    if (archetypeFit === 'poor') {
      return '路线与模板不适配导致高风险发挥失常，建议先调整路线或降低风险档位。'
    }
    if (campaign === 'recoverySprint') {
      return '虽然本轮押注失利，但恢复专项有效降低了战损，宗门节奏未受重创。'
    }
    return '本轮押注失利，下次可考虑先开启远征专项准备再尝试。'
  }

  return ''
}
