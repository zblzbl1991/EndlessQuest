import { describe, expect, it } from 'vitest'
import {
  createLegacyExpeditionTemplates,
  ensureUnlockedExpeditionTemplates,
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
})
