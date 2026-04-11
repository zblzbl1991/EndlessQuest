import { describe, expect, it } from 'vitest'
import { resolveLegacyExpeditionOutcome } from '../data/legacyExpeditions'

describe('resolveLegacyExpeditionOutcome', () => {
  it('returns no legacy rewards for regular dungeons', () => {
    const outcome = resolveLegacyExpeditionOutcome({
      dungeonId: 'lingCaoValley',
      result: 'completed',
      floorsCleared: 12,
      isFirstClear: false,
    })

    expect(outcome.bonusResources.spiritStone).toBe(0)
    expect(outcome.bonusItems).toHaveLength(0)
    expect(outcome.branchTags).toHaveLength(0)
    expect(outcome.reportEntries).toHaveLength(0)
    expect(outcome.milestoneMessage).toBeUndefined()
  })

  it('grants exclusive materials when guixu rift is cleared', () => {
    const outcome = resolveLegacyExpeditionOutcome({
      dungeonId: 'guixuRift',
      result: 'completed',
      floorsCleared: 18,
      isFirstClear: false,
    })

    expect(outcome.bonusResources.spiritStone).toBe(220)
    expect(outcome.bonusResources.ore).toBe(18)
    expect(outcome.bonusItems.some((item) => item.name.includes('归墟潮晶'))).toBe(true)
    expect(outcome.bonusItems.some((item) => item.name.includes('渊息残片'))).toBe(true)
    expect(outcome.branchTags).toContain('深渊开匣')
    expect(outcome.milestoneMessage).toBeUndefined()
  })

  it('grants the legacy technique scroll on first clear', () => {
    const outcome = resolveLegacyExpeditionOutcome({
      dungeonId: 'guixuRift',
      result: 'completed',
      floorsCleared: 18,
      isFirstClear: true,
    })

    const legacyScroll = outcome.bonusItems.find((item) => item.type === 'techniqueScroll')
    expect(legacyScroll).toBeDefined()
    expect(legacyScroll?.type).toBe('techniqueScroll')
    if (legacyScroll?.type === 'techniqueScroll') {
      expect(legacyScroll.techniqueId).toBe('hongmengdaojue')
    }
    expect(outcome.milestoneMessage).toBeTruthy()
  })

  it('grants retreat salvage after reaching the middle layers', () => {
    const outcome = resolveLegacyExpeditionOutcome({
      dungeonId: 'guixuRift',
      result: 'retreated',
      floorsCleared: 5,
      isFirstClear: false,
    })

    expect(outcome.bonusResources.spiritStone).toBe(80)
    expect(outcome.bonusItems.some((item) => item.name.includes('归墟潮晶'))).toBe(true)
    expect(outcome.reportEntries.some((entry) => entry.summary.includes('带回遗产碎晶'))).toBe(true)
  })
})
