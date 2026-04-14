import { describe, it, expect } from 'vitest'
import {
  canStartProductionCampaign,
  getCampaignModifiers,
  getCampaignSummary,
  tickProductionCampaign,
} from '../systems/sect/ProductionCampaignSystem'
import type { ProductionCampaignState, ProductionCampaign } from '../types/sect'

const makeCampaignState = (overrides: Partial<ProductionCampaignState> = {}): ProductionCampaignState => ({
  activeCampaign: null,
  startedAtDay: null,
  durationHours: 8,
  cooldownHours: 4,
  cooldownRemainingHours: 0,
  ...overrides,
})

describe('ProductionCampaignSystem', () => {
  describe('canStartProductionCampaign', () => {
    it('allows start when no campaign is active and no cooldown', () => {
      const state = makeCampaignState()
      const result = canStartProductionCampaign(state, 'realmSprint')
      expect(result.canStart).toBe(true)
      expect(result.reason).toBe('')
    })

    it('blocks start when campaign is already active', () => {
      const state = makeCampaignState({ activeCampaign: 'forgeSprint' })
      const result = canStartProductionCampaign(state, 'realmSprint')
      expect(result.canStart).toBe(false)
      expect(result.reason).toContain('已有进行中的专项')
    })

    it('blocks start during cooldown', () => {
      const state = makeCampaignState({ cooldownRemainingHours: 3 })
      const result = canStartProductionCampaign(state, 'realmSprint')
      expect(result.canStart).toBe(false)
      expect(result.reason).toContain('冷却中')
    })

    it('allows all campaign types', () => {
      const state = makeCampaignState()
      const campaigns: ProductionCampaign[] = [
        'realmSprint',
        'forgeSprint',
        'recoverySprint',
        'expeditionPrep',
        'marketHarvest',
      ]
      for (const c of campaigns) {
        const result = canStartProductionCampaign(state, c)
        expect(result.canStart).toBe(true)
      }
    })
  })

  describe('getCampaignModifiers', () => {
    it('returns default modifiers when no campaign is active', () => {
      const mods = getCampaignModifiers(null)
      expect(mods.cultivationEfficiency).toBe(1)
      expect(mods.forgeEfficiency).toBe(1)
      expect(mods.recoveryEfficiency).toBe(1)
      expect(mods.expeditionEfficiency).toBe(1)
      expect(mods.marketEfficiency).toBe(1)
    })

    it('returns realmSprint modifiers', () => {
      const mods = getCampaignModifiers('realmSprint')
      expect(mods.cultivationEfficiency).toBe(1.3)
      expect(mods.expeditionEfficiency).toBe(0)
    })

    it('returns forgeSprint modifiers', () => {
      const mods = getCampaignModifiers('forgeSprint')
      expect(mods.forgeEfficiency).toBe(1.4)
    })

    it('returns recoverySprint modifiers', () => {
      const mods = getCampaignModifiers('recoverySprint')
      expect(mods.recoveryEfficiency).toBe(1.5)
    })

    it('returns expeditionPrep modifiers', () => {
      const mods = getCampaignModifiers('expeditionPrep')
      expect(mods.expeditionEfficiency).toBe(1.1)
    })

    it('returns marketHarvest modifiers', () => {
      const mods = getCampaignModifiers('marketHarvest')
      expect(mods.marketEfficiency).toBe(1.25)
    })
  })

  describe('getCampaignSummary', () => {
    it('returns summary for realmSprint', () => {
      const summary = getCampaignSummary('realmSprint')
      expect(summary.name).toBe('冲关专项')
      expect(summary.boosts.length).toBeGreaterThan(0)
      expect(summary.suppressions.length).toBeGreaterThan(0)
    })

    it('all campaigns have valid summaries', () => {
      const campaigns: ProductionCampaign[] = [
        'realmSprint',
        'forgeSprint',
        'recoverySprint',
        'expeditionPrep',
        'marketHarvest',
      ]
      for (const c of campaigns) {
        const summary = getCampaignSummary(c)
        expect(summary.name).toBeTruthy()
        expect(summary.summary).toBeTruthy()
        expect(summary.boosts.length).toBeGreaterThan(0)
        expect(summary.suppressions.length).toBeGreaterThan(0)
      }
    })
  })

  describe('tickProductionCampaign', () => {
    it('does nothing when no campaign is active and no cooldown', () => {
      const state = makeCampaignState()
      const result = tickProductionCampaign(state, 1)
      expect(result).toEqual(state)
    })

    it('reduces cooldown remaining', () => {
      const state = makeCampaignState({ cooldownRemainingHours: 4 })
      const result = tickProductionCampaign(state, 2)
      expect(result.cooldownRemainingHours).toBe(2)
    })

    it('clamps cooldown to zero', () => {
      const state = makeCampaignState({ cooldownRemainingHours: 1 })
      const result = tickProductionCampaign(state, 5)
      expect(result.cooldownRemainingHours).toBe(0)
    })

    it('returns unchanged state when campaign is active', () => {
      const state = makeCampaignState({ activeCampaign: 'realmSprint', startedAtDay: 1 })
      const result = tickProductionCampaign(state, 1)
      expect(result.activeCampaign).toBe('realmSprint')
    })
  })
})
