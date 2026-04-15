import { describe, it, expect } from 'vitest'
import {
  getRiskRewardModifier,
  getRiskRewardModifierWithCampaign,
  getRiskDescription,
  getFailurePenaltyDescription,
  isArchetypeFitForRisk,
  getArchetypeFitLabel,
} from '../systems/adventure/RiskRewardSystem'

describe('RiskRewardSystem', () => {
  describe('getRiskRewardModifier', () => {
    it('returns safe defaults for undefined risk tier', () => {
      const mod = getRiskRewardModifier(undefined, undefined, undefined)
      expect(mod.rewardMultiplier).toBe(1.0)
      expect(mod.injuryChanceMultiplier).toBe(0.8)
    })

    it('returns correct modifier for gamble tier', () => {
      const mod = getRiskRewardModifier('gamble', undefined, undefined)
      expect(mod.rewardMultiplier).toBe(1.5)
      expect(mod.failureRecoveryPenalty).toBe(1.0)
    })

    it('returns correct modifier for destiny tier', () => {
      const mod = getRiskRewardModifier('destiny', undefined, undefined)
      expect(mod.rewardMultiplier).toBe(2.0)
      expect(mod.injuryChanceMultiplier).toBe(1.5)
    })

    it('adds archetype bonus for swordBurst with gamble', () => {
      const mod = getRiskRewardModifier('gamble', 'swordBurst', undefined)
      expect(mod.rewardMultiplier).toBe(1.7) // 1.5 + 0.2
    })

    it('adds archetype bonus for pillSustain with safe', () => {
      const mod = getRiskRewardModifier('safe', 'pillSustain', undefined)
      expect(mod.rewardMultiplier).toBe(1.1) // 1.0 + 0.1
    })

    it('does not add bonus for mismatched archetype and risk', () => {
      const mod = getRiskRewardModifier('gamble', 'pillSustain', undefined)
      expect(mod.rewardMultiplier).toBe(1.5) // no bonus
    })
  })

  describe('getRiskDescription', () => {
    it('returns description for each risk tier', () => {
      expect(getRiskDescription('safe')).toContain('稳定')
      expect(getRiskDescription('press')).toContain('适度冒险')
      expect(getRiskDescription('gamble')).toContain('高风险')
      expect(getRiskDescription('destiny')).toContain('终极')
    })

    it('returns default for undefined', () => {
      expect(getRiskDescription(undefined)).toContain('未知')
    })
  })

  describe('getFailurePenaltyDescription', () => {
    it('returns penalties for gamble', () => {
      const penalties = getFailurePenaltyDescription('gamble')
      expect(penalties.length).toBeGreaterThanOrEqual(2)
    })

    it('returns more penalties for destiny than safe', () => {
      const safe = getFailurePenaltyDescription('safe')
      const destiny = getFailurePenaltyDescription('destiny')
      expect(destiny.length).toBeGreaterThan(safe.length)
    })
  })

  describe('isArchetypeFitForRisk', () => {
    it('returns true for matching archetype', () => {
      const result = isArchetypeFitForRisk('swordBurst', {
        title: '押注奇遇',
        exclusiveRewards: ['首通突破'],
        likelyPenalty: ['弟子重伤'],
        bestForArchetypes: ['swordBurst'],
      })
      expect(result).toBe(true)
    })

    it('returns false for non-matching archetype', () => {
      const result = isArchetypeFitForRisk('pillSustain', {
        title: '押注奇遇',
        exclusiveRewards: ['首通突破'],
        likelyPenalty: ['弟子重伤'],
        bestForArchetypes: ['swordBurst'],
      })
      expect(result).toBe(false)
    })

    it('returns true when archetype is undefined', () => {
      expect(isArchetypeFitForRisk(undefined, undefined)).toBe(true)
    })
  })

  describe('getArchetypeFitLabel', () => {
    it('returns good for matching archetype', () => {
      const result = getArchetypeFitLabel('swordBurst', {
        title: '押注奇遇',
        exclusiveRewards: ['首通突破'],
        likelyPenalty: ['弟子重伤'],
        bestForArchetypes: ['swordBurst'],
      })
      expect(result.fit).toBe('good')
    })

    it('returns poor for non-matching archetype', () => {
      const result = getArchetypeFitLabel('pillSustain', {
        title: '押注奇遇',
        exclusiveRewards: ['首通突破'],
        likelyPenalty: ['弟子重伤'],
        bestForArchetypes: ['swordBurst'],
      })
      expect(result.fit).toBe('poor')
    })

    it('returns neutral when no data', () => {
      const result = getArchetypeFitLabel(undefined, undefined)
      expect(result.fit).toBe('neutral')
    })
  })

  describe('getRiskRewardModifierWithCampaign', () => {
    it('returns base modifier when campaign is null', () => {
      const base = getRiskRewardModifier('gamble', undefined, undefined)
      const withCampaign = getRiskRewardModifierWithCampaign('gamble', undefined, undefined, null)
      expect(withCampaign.rewardMultiplier).toBe(base.rewardMultiplier)
    })

    it('expeditionPrep boosts gamble reward multiplier', () => {
      const base = getRiskRewardModifier('gamble', undefined, undefined)
      const withCampaign = getRiskRewardModifierWithCampaign('gamble', undefined, undefined, 'expeditionPrep')
      expect(withCampaign.rewardMultiplier).toBeGreaterThan(base.rewardMultiplier)
    })

    it('recoverySprint reduces failure recovery penalty', () => {
      const base = getRiskRewardModifier('destiny', undefined, undefined)
      const withCampaign = getRiskRewardModifierWithCampaign('destiny', undefined, undefined, 'recoverySprint')
      expect(withCampaign.failureRecoveryPenalty).toBeLessThan(base.failureRecoveryPenalty)
    })
  })
})
