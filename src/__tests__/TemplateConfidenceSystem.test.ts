import { describe, it, expect } from 'vitest'
import {
  getOrCreateConfidenceEntry,
  adjustTemplateConfidence,
  getConfidenceStatus,
  getConfidenceTrend,
  getRiskTierConfidenceModifier,
} from '../systems/adventure/TemplateConfidenceSystem'
import type { TemplateConfidenceEntry } from '../types'

describe('TemplateConfidenceSystem', () => {
  describe('getOrCreateConfidenceEntry', () => {
    it('returns existing entry if found', () => {
      const entries: TemplateConfidenceEntry[] = [{ templateId: 'steadyHarvest', score: 60, lastAdjustedAtDay: 5 }]
      const entry = getOrCreateConfidenceEntry(entries, 'steadyHarvest', 10)
      expect(entry.score).toBe(60)
      expect(entry.lastAdjustedAtDay).toBe(5)
    })

    it('creates new entry with default score 50', () => {
      const entries: TemplateConfidenceEntry[] = []
      const entry = getOrCreateConfidenceEntry(entries, 'steadyHarvest', 10)
      expect(entry.score).toBe(50)
      expect(entry.templateId).toBe('steadyHarvest')
      expect(entry.lastAdjustedAtDay).toBeNull()
    })
  })

  describe('adjustTemplateConfidence', () => {
    it('increases confidence on success', () => {
      const result = adjustTemplateConfidence([], 'steadyHarvest', true, 1)
      const entry = result.find((e) => e.templateId === 'steadyHarvest')
      expect(entry).toBeDefined()
      expect(entry!.score).toBe(55) // 50 + 5
    })

    it('decreases confidence on failure', () => {
      const result = adjustTemplateConfidence([], 'steadyHarvest', false, 1)
      const entry = result.find((e) => e.templateId === 'steadyHarvest')
      expect(entry).toBeDefined()
      expect(entry!.score).toBe(42) // 50 - 8
    })

    it('adds consecutive win bonus', () => {
      const result = adjustTemplateConfidence([], 'steadyHarvest', true, 1, 'win')
      const entry = result.find((e) => e.templateId === 'steadyHarvest')
      expect(entry!.score).toBe(58) // 50 + 5 + 3
    })

    it('adds consecutive loss penalty', () => {
      const result = adjustTemplateConfidence([], 'steadyHarvest', false, 1, 'loss')
      const entry = result.find((e) => e.templateId === 'steadyHarvest')
      expect(entry!.score).toBe(38) // 50 - 8 - 4
    })

    it('clamps score to min 0', () => {
      const entries: TemplateConfidenceEntry[] = [{ templateId: 'steadyHarvest', score: 3, lastAdjustedAtDay: 1 }]
      const result = adjustTemplateConfidence(entries, 'steadyHarvest', false, 2, 'loss')
      const entry = result.find((e) => e.templateId === 'steadyHarvest')
      expect(entry!.score).toBe(0)
    })

    it('clamps score to max 100', () => {
      const entries: TemplateConfidenceEntry[] = [{ templateId: 'steadyHarvest', score: 97, lastAdjustedAtDay: 1 }]
      const result = adjustTemplateConfidence(entries, 'steadyHarvest', true, 2, 'win')
      const entry = result.find((e) => e.templateId === 'steadyHarvest')
      expect(entry!.score).toBe(100)
    })

    it('updates existing entry', () => {
      const entries: TemplateConfidenceEntry[] = [
        { templateId: 'steadyHarvest', score: 60, lastAdjustedAtDay: 5 },
        { templateId: 'breakthroughPush', score: 40, lastAdjustedAtDay: 3 },
      ]
      const result = adjustTemplateConfidence(entries, 'steadyHarvest', true, 10)
      expect(result.length).toBe(2)
      const entry = result.find((e) => e.templateId === 'steadyHarvest')
      expect(entry!.score).toBe(65)
      expect(entry!.lastAdjustedAtDay).toBe(10)
    })
  })

  describe('getConfidenceStatus', () => {
    it('returns stable for high score', () => {
      const status = getConfidenceStatus({ templateId: 't1', score: 80, lastAdjustedAtDay: 1 })
      expect(status.status).toBe('stable')
    })

    it('returns optimizable for medium score', () => {
      const status = getConfidenceStatus({ templateId: 't1', score: 55, lastAdjustedAtDay: 1 })
      expect(status.status).toBe('optimizable')
    })

    it('returns volatile for low score', () => {
      const status = getConfidenceStatus({ templateId: 't1', score: 35, lastAdjustedAtDay: 1 })
      expect(status.status).toBe('volatile')
    })

    it('returns suggest_downgrade for very low score', () => {
      const status = getConfidenceStatus({ templateId: 't1', score: 15, lastAdjustedAtDay: 1 })
      expect(status.status).toBe('suggest_downgrade')
    })

    it('returns stable for undefined entry', () => {
      const status = getConfidenceStatus(undefined)
      expect(status.status).toBe('stable')
      expect(status.entry.score).toBe(50)
    })
  })

  describe('getConfidenceTrend', () => {
    it('returns up when score increased', () => {
      expect(getConfidenceTrend(50, 60)).toBe('up')
    })

    it('returns down when score decreased', () => {
      expect(getConfidenceTrend(60, 50)).toBe('down')
    })

    it('returns unchanged when equal', () => {
      expect(getConfidenceTrend(50, 50)).toBe('unchanged')
    })

    it('returns unknown when undefined', () => {
      expect(getConfidenceTrend(undefined, 50)).toBe('unknown')
    })
  })

  describe('getRiskTierConfidenceModifier', () => {
    it('returns higher modifier for higher risk tiers', () => {
      expect(getRiskTierConfidenceModifier('safe')).toBeLessThan(getRiskTierConfidenceModifier('gamble'))
      expect(getRiskTierConfidenceModifier('gamble')).toBeLessThan(getRiskTierConfidenceModifier('destiny'))
    })
  })
})
