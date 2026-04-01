import { describe, expect, it } from 'vitest'
import { buildAdventureReportInsight } from '../systems/roguelike/AdventureReportInsightSystem'
import type { AdventureReport } from '../types/adventure'

const report: AdventureReport = {
  id: 'report_1',
  config: {
    dungeonId: 'lingCaoValley',
    teamCharacterIds: ['c1'],
    supplyLevel: 'basic',
    tacticalPreset: 'balanced',
    automationStrategy: 'steady',
  },
  dungeonId: 'lingCaoValley',
  teamCharacterIds: ['c1'],
  startedAt: 1,
  finishedAt: 2,
  result: 'retreated',
  floorsCleared: 3,
  rewards: { spiritStone: 60, spiritEnergy: 0, herb: 8, ore: 0 },
  itemRewards: [],
  finalMemberStates: {
    c1: { currentHp: 22, maxHp: 100, status: 'wounded' },
  },
  teamSnapshot: {
    c1: { name: '李清风', quality: 'spirit', realm: 1, realmStage: 2 },
  },
  discipleMutations: {
    c1: ['sword_intent'],
  },
  steps: [
    {
      id: 'step_1',
      type: 'blessing_decision',
      timestamp: 1,
      floor: 1,
      summary: '选择祝福：战意凝神',
      detail: '队伍选择了更偏战斗的临场强化。',
    },
    {
      id: 'step_2',
      type: 'member_state_changed',
      timestamp: 1,
      floor: 3,
      summary: '弟子血线下滑',
      detail: '李清风在中层战斗后状态明显走低。',
    },
    {
      id: 'step_3',
      type: 'run_retreated',
      timestamp: 2,
      floor: 3,
      summary: '主动撤退',
      detail: '守成策略判断当前队伍状态需要回撤。',
    },
  ],
}

describe('AdventureReportInsightSystem', () => {
  it('extracts core disciple, key build, turning point, and cause', () => {
    const insight = buildAdventureReportInsight(report, new Map())

    expect(insight.coreName).toBe('李清风')
    expect(insight.keyBuild).toContain('战意凝神')
    expect(insight.turningPoint).toContain('主动撤退')
    expect(insight.cause).toContain('回撤')
  })

  it('handles legacy reports without disciple mutations', () => {
    const legacyReport = {
      ...report,
      discipleMutations: undefined,
    } as unknown as AdventureReport

    const insight = buildAdventureReportInsight(legacyReport, new Map([['c1', '李清风']]))

    expect(insight.coreName).toBe('李清风')
    expect(insight.mutationHighlights).toEqual([])
    expect(insight.turningPoint).toContain('主动撤退')
  })

  it('prefers report team snapshots when the live roster no longer has the disciple', () => {
    const insight = buildAdventureReportInsight(report, new Map())

    expect(insight.coreName).toBe('李清风')
    expect(insight.mutationHighlights[0]).toContain('李清风')
  })
})
