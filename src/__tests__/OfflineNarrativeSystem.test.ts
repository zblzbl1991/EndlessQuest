import { describe, expect, it } from 'vitest'
import { createInitialState } from '../stores/sectStore/initial'
import { buildOfflineNarrative } from '../systems/sect/OfflineNarrativeSystem'

function createChaosMaterial(id: string, name: string) {
  return {
    id,
    name,
    type: 'material' as const,
    description: '',
    quality: 'chaos' as const,
    sellPrice: 0,
    category: 'other' as const,
  }
}

describe('buildOfflineNarrative', () => {
  it('surfaces the guixu endgame loop in offline notable events', () => {
    const sect = createInitialState().sect
    sect.archiveMilestones = [
      { id: 'legacyForgePair', unlockedAt: 1 },
      { id: 'legacyForgeTrinity', unlockedAt: 2 },
    ]
    sect.automationSettings.activeTemplateId = 'guixuResonance'
    sect.automationSettings.expeditionTemplates = [
      ...sect.automationSettings.expeditionTemplates.filter((template) => template.id !== 'guixuResonance'),
      {
        id: 'guixuResonance',
        name: '归墟回响',
        enabled: true,
        dungeonId: 'guixuRift',
        teamRule: 'topPower',
        supplyLevel: 'luxury',
        riskTolerance: 'risky',
        rewardFocus: 'materials',
        fallbackOnFailure: 'downgrade_dungeon',
        notes: 'offline test',
      },
    ]

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
            createChaosMaterial('gc_1', '归墟潮晶'),
            createChaosMaterial('gc_2', '归墟潮晶'),
            createChaosMaterial('as_1', '渊息残片'),
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
    expect(narrative.loopRewards?.title).toBe('归墟终盘收获')
    expect(narrative.loopRewards?.tideCrystalCount).toBe(2)
    expect(narrative.loopRewards?.abyssShardCount).toBe(1)
  })

  it('builds a stabilization suggestion when offline guixu haul falls below estimate', () => {
    const sect = createInitialState().sect
    sect.archiveMilestones = [
      { id: 'legacyForgePair', unlockedAt: 1 },
      { id: 'legacyForgeTrinity', unlockedAt: 2 },
    ]
    sect.automationSettings.activeTemplateId = 'guixuResonance'
    sect.automationSettings.expeditionTemplates = [
      ...sect.automationSettings.expeditionTemplates.filter((template) => template.id !== 'guixuResonance'),
      {
        id: 'guixuResonance',
        name: '归墟回响',
        enabled: true,
        dungeonId: 'guixuRift',
        teamRule: 'topPower',
        supplyLevel: 'enhanced',
        riskTolerance: 'risky',
        rewardFocus: 'materials',
        fallbackOnFailure: 'downgrade_dungeon',
        notes: 'offline test',
      },
    ]

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
          id: 'guixu_low',
          dungeonId: 'guixuRift',
          teamCharacterIds: [],
          strategy: 'steady',
          tacticalPreset: 'balanced',
          startedAt: 1,
          finishedAt: 2,
          result: 'failed',
          floorsCleared: 9,
          rewards: { spiritStone: 240, spiritEnergy: 0, herb: 0, ore: 12 },
          itemRewardCount: 2,
        },
      ],
      recentReportDetails: [
        {
          id: 'guixu_low',
          config: {
            dungeonId: 'guixuRift',
            teamCharacterIds: [],
            supplyLevel: 'enhanced',
            tacticalPreset: 'balanced',
            automationStrategy: 'steady',
          },
          dungeonId: 'guixuRift',
          teamCharacterIds: [],
          startedAt: 1,
          finishedAt: 2,
          result: 'failed',
          floorsCleared: 9,
          rewards: { spiritStone: 240, spiritEnergy: 0, herb: 0, ore: 12 },
          itemRewards: [createChaosMaterial('gc_1', '归墟潮晶'), createChaosMaterial('as_1', '渊息残片')],
          finalMemberStates: {},
          teamSnapshot: {},
          discipleMutations: {},
          steps: [],
        },
      ],
      recentEvents: [],
    })

    expect(narrative.loopAdjustment?.label).toBe('低于预估')
    expect(narrative.loopAdjustment?.actionLabel).toBe('改成均衡风险')
    expect(narrative.loopAdjustment?.changes?.riskTolerance).toBe('balanced')
  })

  // --- Phase 4 tests ---

  it('surfaces campaign preparation feedback when expeditionPrep is active', () => {
    const sect = createInitialState().sect
    sect.automationSettings.productionCampaign = {
      activeCampaign: 'expeditionPrep',
      startedAtDay: 1,
      durationHours: 8,
      cooldownHours: 4,
      cooldownRemainingHours: 0,
    }

    const narrative = buildOfflineNarrative({
      sect,
      accumulator: {
        resourcesGained: { spiritStone: 0, spiritEnergy: 0, herb: 0, ore: 0 },
        breakthroughs: [],
        itemsCrafted: [],
        taxIncome: 0,
      },
      recentReports: [],
      recentReportDetails: [],
      recentEvents: [],
    })

    expect(narrative.notableEvents.some((event) => event.title === '远征专项就绪')).toBe(true)
    expect(narrative.notableEvents.some((event) => event.detail.includes('高风险远征会更稳'))).toBe(true)
  })

  it('surfaces recovery campaign feedback when recovering disciples exist', () => {
    const sect = createInitialState().sect
    sect.automationSettings.productionCampaign = {
      activeCampaign: 'recoverySprint',
      startedAtDay: 1,
      durationHours: 8,
      cooldownHours: 4,
      cooldownRemainingHours: 0,
    }
    // Add a recovering character
    if (sect.characters.length > 0) {
      sect.characters[0] = { ...sect.characters[0], status: 'injured', injuryTimer: 100 }
    }

    const narrative = buildOfflineNarrative({
      sect,
      accumulator: {
        resourcesGained: { spiritStone: 0, spiritEnergy: 0, herb: 0, ore: 0 },
        breakthroughs: [],
        itemsCrafted: [],
        taxIncome: 0,
      },
      recentReports: [],
      recentReportDetails: [],
      recentEvents: [],
    })

    expect(narrative.notableEvents.some((event) => event.title === '恢复专项见效')).toBe(true)
  })

  it('surfaces gamble narrative for high-risk reports', () => {
    const sect = createInitialState().sect
    sect.automationSettings.activeTemplateId = 'breakthroughPush'
    sect.currentArchetype = 'swordBurst'

    const narrative = buildOfflineNarrative({
      sect,
      accumulator: {
        resourcesGained: { spiritStone: 0, spiritEnergy: 0, herb: 0, ore: 0 },
        breakthroughs: [],
        itemsCrafted: [],
        taxIncome: 0,
      },
      recentReports: [],
      recentReportDetails: [
        {
          id: 'gamble_report',
          config: {
            dungeonId: 'lingCaoValley',
            teamCharacterIds: [],
            supplyLevel: 'basic',
            tacticalPreset: 'balanced',
            automationStrategy: 'steady',
          },
          dungeonId: 'lingCaoValley',
          teamCharacterIds: [],
          startedAt: 1,
          finishedAt: 2,
          result: 'completed',
          floorsCleared: 5,
          rewards: { spiritStone: 100, spiritEnergy: 0, herb: 0, ore: 0 },
          itemRewards: [],
          finalMemberStates: {},
          teamSnapshot: {},
          discipleMutations: {},
          steps: [],
          riskTier: 'gamble',
          templateId: 'breakthroughPush',
        },
      ],
      recentEvents: [],
    })

    expect(narrative.notableEvents.some((event) => event.title === '押注收获')).toBe(true)
  })
})
