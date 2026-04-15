import { describe, it, expect } from 'vitest'
import {
  getRiskRewardModifier,
  getRiskRewardModifierWithCampaign,
  getArchetypeFitLabel,
  buildGambleNarrative,
} from '../systems/adventure/RiskRewardSystem'

describe('ArchetypeRiskLoopIntegration', () => {
  describe('getRiskRewardModifierWithCampaign', () => {
    it('returns base modifier when no campaign is active', () => {
      const base = getRiskRewardModifier('gamble', 'swordBurst', undefined)
      const withCampaign = getRiskRewardModifierWithCampaign('gamble', 'swordBurst', undefined, null)
      expect(withCampaign.rewardMultiplier).toBe(base.rewardMultiplier)
      expect(withCampaign.failureRecoveryPenalty).toBe(base.failureRecoveryPenalty)
    })

    it('expeditionPrep boosts reward and reduces penalties', () => {
      const base = getRiskRewardModifier('gamble', 'swordBurst', undefined)
      const withCampaign = getRiskRewardModifierWithCampaign('gamble', 'swordBurst', undefined, 'expeditionPrep')
      expect(withCampaign.rewardMultiplier).toBeGreaterThan(base.rewardMultiplier)
      expect(withCampaign.failureRecoveryPenalty).toBeLessThan(base.failureRecoveryPenalty)
      expect(withCampaign.injuryChanceMultiplier).toBeLessThan(base.injuryChanceMultiplier)
    })

    it('recoverySprint reduces recovery and injury penalties', () => {
      const base = getRiskRewardModifier('destiny', undefined, undefined)
      const withCampaign = getRiskRewardModifierWithCampaign('destiny', undefined, undefined, 'recoverySprint')
      expect(withCampaign.failureRecoveryPenalty).toBeLessThan(base.failureRecoveryPenalty)
      expect(withCampaign.injuryChanceMultiplier).toBeLessThan(base.injuryChanceMultiplier)
    })

    it('forgeSprint boosts reward for gamble tier', () => {
      const base = getRiskRewardModifier('gamble', undefined, undefined)
      const withCampaign = getRiskRewardModifierWithCampaign('gamble', undefined, undefined, 'forgeSprint')
      expect(withCampaign.rewardMultiplier).toBeGreaterThan(base.rewardMultiplier)
    })

    it('realmSprint does not change risk modifiers', () => {
      const base = getRiskRewardModifier('press', undefined, undefined)
      const withCampaign = getRiskRewardModifierWithCampaign('press', undefined, undefined, 'realmSprint')
      expect(withCampaign.rewardMultiplier).toBe(base.rewardMultiplier)
      expect(withCampaign.failureRecoveryPenalty).toBe(base.failureRecoveryPenalty)
    })

    it('clamps failure recovery to 0 with recoverySprint on safe tier', () => {
      const result = getRiskRewardModifierWithCampaign('safe', undefined, undefined, 'recoverySprint')
      expect(result.failureRecoveryPenalty).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Route-Risk compatibility', () => {
    it('swordBurst matches gamble template well', () => {
      const result = getArchetypeFitLabel('swordBurst', {
        title: '押注奇遇',
        exclusiveRewards: ['首通突破'],
        likelyPenalty: ['弟子重伤'],
        bestForArchetypes: ['swordBurst', 'beastHarvest'],
      })
      expect(result.fit).toBe('good')
    })

    it('pillSustain does not match gamble template', () => {
      const result = getArchetypeFitLabel('pillSustain', {
        title: '押注奇遇',
        exclusiveRewards: ['首通突破'],
        likelyPenalty: ['弟子重伤'],
        bestForArchetypes: ['swordBurst', 'beastHarvest'],
      })
      expect(result.fit).toBe('poor')
    })

    it('arrayGuard matches destiny template', () => {
      const result = getArchetypeFitLabel('arrayGuard', {
        title: '命数之搏',
        exclusiveRewards: ['归墟独占遗材'],
        likelyPenalty: ['主力队伍严重疲劳'],
        bestForArchetypes: ['arrayGuard', 'swordBurst'],
      })
      expect(result.fit).toBe('good')
    })
  })

  describe('buildGambleNarrative', () => {
    it('returns empty string for non-high-risk tiers', () => {
      const result = buildGambleNarrative({
        riskTier: 'safe',
        archetype: 'swordBurst',
        campaign: null,
        result: 'completed',
        archetypeFit: 'good',
      })
      expect(result).toBe('')
    })

    it('returns narrative for completed high-risk with expeditionPrep', () => {
      const result = buildGambleNarrative({
        riskTier: 'gamble',
        archetype: 'swordBurst',
        campaign: 'expeditionPrep',
        result: 'completed',
        archetypeFit: 'good',
      })
      expect(result).toContain('远征专项')
      expect(result).toContain('更稳')
    })

    it('returns narrative for completed high-risk with good archetype fit', () => {
      const result = buildGambleNarrative({
        riskTier: 'destiny',
        archetype: 'swordBurst',
        campaign: null,
        result: 'completed',
        archetypeFit: 'good',
      })
      expect(result).toContain('路线与高风险模板高度适配')
    })

    it('returns narrative for failed high-risk with poor archetype fit', () => {
      const result = buildGambleNarrative({
        riskTier: 'gamble',
        archetype: 'pillSustain',
        campaign: null,
        result: 'failed',
        archetypeFit: 'poor',
      })
      expect(result).toContain('路线与模板不适配')
    })

    it('returns narrative for failed high-risk with recoverySprint', () => {
      const result = buildGambleNarrative({
        riskTier: 'gamble',
        archetype: 'swordBurst',
        campaign: 'recoverySprint',
        result: 'failed',
        archetypeFit: 'neutral',
      })
      expect(result).toContain('恢复专项')
      expect(result).toContain('战损')
    })

    it('returns narrative for failed without campaign', () => {
      const result = buildGambleNarrative({
        riskTier: 'gamble',
        archetype: 'swordBurst',
        campaign: null,
        result: 'failed',
        archetypeFit: 'neutral',
      })
      expect(result).toContain('专项准备')
    })
  })
})
