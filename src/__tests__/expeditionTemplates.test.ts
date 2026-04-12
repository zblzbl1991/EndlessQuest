import { describe, expect, it } from 'vitest'
import {
  createLegacyExpeditionTemplates,
  ensureUnlockedExpeditionTemplates,
  getExpeditionLoopPreview,
  getSpecialExpeditionTemplateCount,
  getVisibleExpeditionTemplates,
} from '../data/expeditionTemplates'

describe('expedition templates', () => {
  it('should unlock the guixu resonance template after the paired legacy forge milestone', () => {
    const templates = ensureUnlockedExpeditionTemplates(
      createLegacyExpeditionTemplates(7),
      [{ id: 'legacyForgePair', unlockedAt: 1 }],
      5
    )
    expect(templates.some((template) => template.id === 'guixuResonance')).toBe(true)
    expect(getSpecialExpeditionTemplateCount([{ id: 'legacyForgePair', unlockedAt: 1 }])).toBe(1)
  })

  it('should keep special templates visible beyond the normal ascension template slots', () => {
    const templates = ensureUnlockedExpeditionTemplates(
      createLegacyExpeditionTemplates(0),
      [{ id: 'legacyForgePair', unlockedAt: 1 }],
      3
    )
    const visible = getVisibleExpeditionTemplates(templates, 0, [{ id: 'legacyForgePair', unlockedAt: 1 }])

    expect(visible.length).toBe(4)
    expect(visible[visible.length - 1]?.id).toBe('guixuResonance')
  })

  it('should build a stronger guixu loop preview after the trinity milestone', () => {
    const preview = getExpeditionLoopPreview(
      {
        id: 'guixuResonance',
        riskTolerance: 'risky',
        rewardFocus: 'materials',
        supplyLevel: 'luxury',
      },
      [
        { id: 'legacyForgePair', unlockedAt: 1 },
        { id: 'legacyForgeTrinity', unlockedAt: 2 },
      ]
    )

    expect(preview?.title).toBe('深潜搏材')
    expect(preview?.yieldSummary).toContain('潮晶 5-6')
    expect(preview?.yieldSummary).toContain('残片 3-4')
    expect(preview?.tideCrystalRange).toEqual({ min: 5, max: 6 })
    expect(preview?.abyssShardRange).toEqual({ min: 3, max: 4 })
    expect(preview?.recommendation).toContain('连续失利')
  })
})
