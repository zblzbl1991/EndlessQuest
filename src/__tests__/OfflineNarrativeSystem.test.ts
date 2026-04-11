import { describe, expect, it } from 'vitest'
import { createInitialState } from '../stores/sectStore/initial'
import { buildOfflineNarrative } from '../systems/sect/OfflineNarrativeSystem'

describe('buildOfflineNarrative', () => {
  it('surfaces the guixu endgame loop in offline notable events', () => {
    const sect = createInitialState().sect
    sect.archiveMilestones = [
      { id: 'legacyForgePair', unlockedAt: 1 },
      { id: 'legacyForgeTrinity', unlockedAt: 2 },
    ]
    sect.automationSettings.activeTemplateId = 'guixuResonance'

    const narrative = buildOfflineNarrative({
      sect,
      accumulator: {
        resourcesGained: { spiritStone: 0, spiritEnergy: 0, herb: 0, ore: 0 },
        breakthroughs: [],
        itemsCrafted: [],
        taxIncome: 0,
      },
      recentReports: [
        {
          id: 'guixu_report',
          dungeonId: 'guixuRift',
          teamCharacterIds: [],
          strategy: 'steady',
          tacticalPreset: 'balanced',
          startedAt: 1,
          finishedAt: 2,
          result: 'completed',
          floorsCleared: 12,
          rewards: { spiritStone: 360, spiritEnergy: 0, herb: 0, ore: 20 },
          itemRewardCount: 3,
        },
      ],
      recentReportDetails: [
        {
          id: 'guixu_report',
          config: {
            dungeonId: 'guixuRift',
            teamCharacterIds: [],
            supplyLevel: 'basic',
            tacticalPreset: 'balanced',
            automationStrategy: 'steady',
          },
          dungeonId: 'guixuRift',
          teamCharacterIds: [],
          startedAt: 1,
          finishedAt: 2,
          result: 'completed',
          floorsCleared: 12,
          rewards: { spiritStone: 360, spiritEnergy: 0, herb: 0, ore: 20 },
          itemRewards: [
            {
              id: 'gc_1',
              name: '归墟潮晶',
              type: 'material',
              description: '',
              quality: 'chaos',
              sellPrice: 0,
              category: 'other',
            },
            {
              id: 'gc_2',
              name: '归墟潮晶',
              type: 'material',
              description: '',
              quality: 'chaos',
              sellPrice: 0,
              category: 'other',
            },
            {
              id: 'as_1',
              name: '渊息残片',
              type: 'material',
              description: '',
              quality: 'chaos',
              sellPrice: 0,
              category: 'other',
            },
          ],
          finalMemberStates: {},
          teamSnapshot: {},
          discipleMutations: {},
          steps: [],
        },
      ],
      recentEvents: [],
    })

    expect(narrative.notableEvents.some((event) => event.title === '终盘循环')).toBe(true)
    expect(narrative.notableEvents.some((event) => event.detail.includes('推进到第 12 层'))).toBe(true)
    expect(narrative.nextSuggestion).toContain('终盘循环')
    expect(narrative.loopRewards?.title).toBe('归墟终盘收获')
    expect(narrative.loopRewards?.tideCrystalCount).toBe(2)
    expect(narrative.loopRewards?.abyssShardCount).toBe(1)
  })
})
