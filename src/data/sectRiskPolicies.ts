import type { SectRiskPolicyProfile, SectRiskPolicyId } from '../types/destiny'

// Migration map: old 7-policy ids → new 3-policy ids
export const POLICY_MIGRATION_MAP: Record<string, SectRiskPolicyId> = {
  lianfeng: 'conservative',
  shouheng: 'conservative',
  shenji: 'balanced',
  zhuxi: 'balanced',
  yapo: 'aggressive',
  niejie: 'aggressive',
  fenming: 'aggressive',
}

export const SECT_RISK_POLICIES: Record<SectRiskPolicyId, SectRiskPolicyProfile> = {
  conservative: {
    id: 'conservative',
    name: '保守',
    description: '求稳为先。保全弟子、回避高风险，适合积蓄实力的阶段。',
    executorStrategy: 'steady',
    tacticalPreset: 'conservative',
    highRiskRecruitBias: -14,
    coreFocusWeight: 0.85,
    retreatAvgHpThreshold: 0.52,
    retreatLowHpThreshold: 0.32,
    maxCoreDisciples: 1,
  },
  balanced: {
    id: 'balanced',
    name: '均衡',
    description: '攻守兼备。保留适度机会，不回避也不主动追逐高风险。',
    executorStrategy: 'profit',
    tacticalPreset: 'balanced',
    highRiskRecruitBias: 0,
    coreFocusWeight: 1.0,
    retreatAvgHpThreshold: 0.4,
    retreatLowHpThreshold: 0.22,
    maxCoreDisciples: 2,
  },
  aggressive: {
    id: 'aggressive',
    name: '激进',
    description: '主动撞险。更快养出强者，也更容易付出代价或打出神局。',
    executorStrategy: 'combat',
    tacticalPreset: 'burst',
    highRiskRecruitBias: 20,
    coreFocusWeight: 1.55,
    retreatAvgHpThreshold: 0.24,
    retreatLowHpThreshold: 0.12,
    maxCoreDisciples: 3,
  },
}

export const SECT_RISK_POLICY_LIST = Object.values(SECT_RISK_POLICIES)

export function getPolicyProfile(id: SectRiskPolicyId): SectRiskPolicyProfile {
  return SECT_RISK_POLICIES[id]
}

export function getPolicyIndex(id: SectRiskPolicyId): number {
  return ['conservative', 'balanced', 'aggressive'].indexOf(id)
}

/** Migrate old 7-policy id to new 3-policy id. Returns input unchanged if already new. */
export function migratePolicyId(id: string): SectRiskPolicyId {
  if (id in SECT_RISK_POLICIES) return id as SectRiskPolicyId
  return POLICY_MIGRATION_MAP[id] ?? 'balanced'
}
