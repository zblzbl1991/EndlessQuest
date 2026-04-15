import { describe, it, expect } from 'vitest'
import { getCampaignRiskModifiers, getCampaignEnhancement } from '../systems/sect/ProductionCampaignSystem'
import type { ProductionCampaign } from '../types/sect'

describe('ProductionCampaignRiskIntegration', () => {
  describe('getCampaignRiskModifiers', () => {
    it('returns default modifiers when no campaign is active', () => {
      const mods = getCampaignRiskModifiers(null)
      expect(mods.riskRewardBonus).toBe(0)
      expect(mods.failureRecoveryReduction).toBe(0)
      expect(mods.injuryChanceReduction).toBe(0)
      expect(mods.supplyLevelUpgradeChance).toBe(0)
      expect(mods.exclusiveRewardWeightBonus).toBe(0)
    })

    it('expeditionPrep boosts high-risk readiness', () => {
      const mods = getCampaignRiskModifiers('expeditionPrep')
      expect(mods.riskRewardBonus).toBe(0.15)
      expect(mods.failureRecoveryReduction).toBe(0.1)
      expect(mods.injuryChanceReduction).toBe(0.1)
      expect(mods.supplyLevelUpgradeChance).toBe(0.5)
      expect(mods.exclusiveRewardWeightBonus).toBe(0.3)
    })

    it('recoverySprint reduces failure recovery cost', () => {
      const mods = getCampaignRiskModifiers('recoverySprint')
      expect(mods.riskRewardBonus).toBe(0)
      expect(mods.failureRecoveryReduction).toBe(0.3)
      expect(mods.injuryChanceReduction).toBe(0.2)
    })

    it('forgeSprint boosts equipment-oriented rewards', () => {
      const mods = getCampaignRiskModifiers('forgeSprint')
      expect(mods.riskRewardBonus).toBe(0.1)
      expect(mods.exclusiveRewardWeightBonus).toBe(0.2)
    })

    it('realmSprint has no risk modifiers', () => {
      const mods = getCampaignRiskModifiers('realmSprint')
      expect(mods.riskRewardBonus).toBe(0)
      expect(mods.failureRecoveryReduction).toBe(0)
      expect(mods.injuryChanceReduction).toBe(0)
    })

    it('marketHarvest has no risk modifiers', () => {
      const mods = getCampaignRiskModifiers('marketHarvest')
      expect(mods.riskRewardBonus).toBe(0)
      expect(mods.failureRecoveryReduction).toBe(0)
    })

    it('all campaign types have valid risk modifiers', () => {
      const campaigns: ProductionCampaign[] = [
        'realmSprint',
        'forgeSprint',
        'recoverySprint',
        'expeditionPrep',
        'marketHarvest',
      ]
      for (const c of campaigns) {
        const mods = getCampaignRiskModifiers(c)
        expect(mods.riskRewardBonus).toBeGreaterThanOrEqual(0)
        expect(mods.failureRecoveryReduction).toBeGreaterThanOrEqual(0)
        expect(mods.injuryChanceReduction).toBeGreaterThanOrEqual(0)
        expect(mods.supplyLevelUpgradeChance).toBeGreaterThanOrEqual(0)
        expect(mods.exclusiveRewardWeightBonus).toBeGreaterThanOrEqual(0)
      }
    })
  })

  describe('getCampaignEnhancement', () => {
    it('enhances forgeSprint at forge level 7+', () => {
      const result = getCampaignEnhancement('forgeSprint', 7, 0, 0)
      expect(result.enhanced).toBe(true)
      expect(result.description).toContain('高阶锻造')
    })

    it('does not enhance forgeSprint below forge level 7', () => {
      const result = getCampaignEnhancement('forgeSprint', 6, 0, 0)
      expect(result.enhanced).toBe(false)
    })

    it('enhances recoverySprint at alchemy level 5+', () => {
      const result = getCampaignEnhancement('recoverySprint', 0, 5, 0)
      expect(result.enhanced).toBe(true)
      expect(result.description).toContain('高阶丹道')
    })

    it('enhances expeditionPrep at market level 4+', () => {
      const result = getCampaignEnhancement('expeditionPrep', 0, 0, 4)
      expect(result.enhanced).toBe(true)
      expect(result.description).toContain('坊市支援')
    })

    it('enhances realmSprint at alchemy level 3+', () => {
      const result = getCampaignEnhancement('realmSprint', 0, 3, 0)
      expect(result.enhanced).toBe(true)
      expect(result.description).toContain('丹道辅助')
    })

    it('enhances marketHarvest at market level 6+', () => {
      const result = getCampaignEnhancement('marketHarvest', 0, 0, 6)
      expect(result.enhanced).toBe(true)
      expect(result.description).toContain('坊市深耕')
    })

    it('does not enhance marketHarvest below market level 6', () => {
      const result = getCampaignEnhancement('marketHarvest', 0, 0, 5)
      expect(result.enhanced).toBe(false)
    })
  })
})
