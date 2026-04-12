import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AdventurePage from '../pages/AdventurePage'
import { useAdventureStore } from '../stores/adventureStore'
import { useEventLogStore } from '../stores/eventLogStore'
import { useSectStore } from '../stores/sectStore'

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

function seedAdventureState() {
  const baseCharacter = useSectStore.getState().sect.characters[0]

  useSectStore.setState((s) => ({
    sect: {
      ...s.sect,
      characters: [
        {
          ...baseCharacter,
          id: 'hero_1',
          name: '顾长风',
          realm: 4,
          realmStage: 3,
          status: 'idle',
        },
      ],
    },
  }))

  useAdventureStore.setState({
    reports: [
      {
        id: 'report_recent',
        dungeonId: 'lingCaoValley',
        teamCharacterIds: ['hero_1'],
        strategy: 'steady',
        tacticalPreset: 'balanced',
        startedAt: 1,
        finishedAt: 2,
        result: 'completed',
        floorsCleared: 4,
        rewards: { spiritStone: 80, spiritEnergy: 0, herb: 6, ore: 0 },
        itemRewardCount: 0,
      },
    ],
    reportDetails: {
      report_recent: {
        id: 'report_recent',
        config: {
          dungeonId: 'lingCaoValley',
          teamCharacterIds: ['hero_1'],
          supplyLevel: 'basic',
          tacticalPreset: 'balanced',
          automationStrategy: 'steady',
        },
        dungeonId: 'lingCaoValley',
        teamCharacterIds: ['hero_1'],
        startedAt: 1,
        finishedAt: 2,
        result: 'completed',
        floorsCleared: 4,
        rewards: { spiritStone: 80, spiritEnergy: 0, herb: 6, ore: 0 },
        itemRewards: [],
        finalMemberStates: {
          hero_1: { currentHp: 90, maxHp: 100, status: 'alive' },
        },
        teamSnapshot: {
          hero_1: { name: '顾长风', quality: 'common', realm: 4, realmStage: 3 },
        },
        discipleMutations: {},
        steps: [],
      },
    },
  })
}

function seedGuixuTemplate(overrides?: {
  riskTolerance?: 'conservative' | 'balanced' | 'risky'
  supplyLevel?: 'basic' | 'enhanced' | 'luxury'
  rewardFocus?: 'resources' | 'materials' | 'techniques' | 'pets' | 'progress'
}) {
  useSectStore.setState((s) => ({
    sect: {
      ...s.sect,
      archiveMilestones: [
        { id: 'legacyForgePair', unlockedAt: 1 },
        { id: 'legacyForgeTrinity', unlockedAt: 2 },
      ],
      automationSettings: {
        ...s.sect.automationSettings,
        activeTemplateId: 'guixuResonance',
        expeditionTemplates: [
          ...s.sect.automationSettings.expeditionTemplates.filter((template) => template.id !== 'guixuResonance'),
          {
            id: 'guixuResonance',
            name: '归墟回响',
            enabled: true,
            dungeonId: 'guixuRift',
            teamRule: 'topPower',
            supplyLevel: overrides?.supplyLevel ?? 'luxury',
            riskTolerance: overrides?.riskTolerance ?? 'risky',
            rewardFocus: overrides?.rewardFocus ?? 'materials',
            fallbackOnFailure: 'downgrade_dungeon',
            notes: '用于验证终盘归墟材料预估。',
          },
        ],
      },
    },
  }))
}

function seedGuixuReport(
  tideCrystalCount: number,
  abyssShardCount: number,
  result: 'completed' | 'failed' = 'completed'
) {
  useAdventureStore.setState((state) => ({
    ...state,
    reports: [
      {
        id: 'report_guixu',
        dungeonId: 'guixuRift',
        teamCharacterIds: ['hero_1'],
        strategy: 'steady',
        tacticalPreset: result === 'failed' ? 'balanced' : 'burst',
        startedAt: 11,
        finishedAt: 12,
        result,
        floorsCleared: result === 'failed' ? 10 : 15,
        rewards: { spiritStone: result === 'failed' ? 320 : 520, spiritEnergy: 0, herb: 0, ore: 20 },
        itemRewardCount: tideCrystalCount + abyssShardCount,
      },
    ],
    reportDetails: {
      report_guixu: {
        id: 'report_guixu',
        config: {
          dungeonId: 'guixuRift',
          teamCharacterIds: ['hero_1'],
          supplyLevel: 'luxury',
          tacticalPreset: result === 'failed' ? 'balanced' : 'burst',
          automationStrategy: 'steady',
        },
        dungeonId: 'guixuRift',
        teamCharacterIds: ['hero_1'],
        startedAt: 11,
        finishedAt: 12,
        result,
        floorsCleared: result === 'failed' ? 10 : 15,
        rewards: { spiritStone: result === 'failed' ? 320 : 520, spiritEnergy: 0, herb: 0, ore: 20 },
        itemRewards: [
          ...Array.from({ length: tideCrystalCount }, (_, index) => createChaosMaterial(`gc_${index + 1}`, '归墟潮晶')),
          ...Array.from({ length: abyssShardCount }, (_, index) => createChaosMaterial(`as_${index + 1}`, '渊息残片')),
        ],
        finalMemberStates: {
          hero_1: { currentHp: result === 'failed' ? 28 : 72, maxHp: 100, status: 'alive' },
        },
        teamSnapshot: {
          hero_1: { name: '顾长风', quality: 'common', realm: 4, realmStage: 3 },
        },
        discipleMutations: {},
        steps: [],
      },
    },
  }))
}

describe('AdventurePage', () => {
  beforeEach(() => {
    useSectStore.getState().reset()
    useAdventureStore.getState().reset()
    useEventLogStore.getState().reset()
    seedAdventureState()
  })

  it('shows the idle automation anchors on the page', () => {
    render(
      <MemoryRouter>
        <AdventurePage />
      </MemoryRouter>
    )

    expect(screen.getByTestId('adventure-hero')).toBeInTheDocument()
    expect(screen.getByText('自动运转')).toBeInTheDocument()
    expect(screen.getByText('最近探索记录')).toBeInTheDocument()
    expect(screen.getByText('一键出发')).toBeInTheDocument()
  })

  it('opens team builder via custom link', () => {
    render(
      <MemoryRouter>
        <AdventurePage />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByText('自定义'))

    expect(screen.getByText('本局意图')).toBeInTheDocument()
    expect(screen.getByText('战术')).toBeInTheDocument()
    expect(screen.getByText('出战弟子')).toBeInTheDocument()
    expect(screen.getByText(/已选 0 \/ 5/)).toBeInTheDocument()
  })

  it('renders player-facing adventure copy in Chinese', () => {
    render(
      <MemoryRouter>
        <AdventurePage />
      </MemoryRouter>
    )

    expect(screen.getAllByText('灵草谷').length).toBeGreaterThan(0)
    expect(screen.getAllByText('通关').length).toBeGreaterThan(0)
  })

  it('surfaces failed automatic runs in the report list', () => {
    useAdventureStore.setState({
      reports: [
        {
          id: 'report_failed',
          dungeonId: 'luoYunCave',
          teamCharacterIds: ['hero_1', 'hero_2'],
          strategy: 'steady',
          tacticalPreset: 'balanced',
          startedAt: 5,
          finishedAt: 6,
          result: 'failed',
          floorsCleared: 2,
          rewards: { spiritStone: 40, spiritEnergy: 0, herb: 0, ore: 2 },
          itemRewardCount: 0,
        },
      ],
      reportDetails: {
        report_failed: {
          id: 'report_failed',
          config: {
            dungeonId: 'luoYunCave',
            teamCharacterIds: ['hero_1', 'hero_2'],
            supplyLevel: 'basic',
            tacticalPreset: 'balanced',
            automationStrategy: 'steady',
          },
          dungeonId: 'luoYunCave',
          teamCharacterIds: ['hero_1', 'hero_2'],
          startedAt: 5,
          finishedAt: 6,
          result: 'failed',
          floorsCleared: 2,
          rewards: { spiritStone: 40, spiritEnergy: 0, herb: 0, ore: 2 },
          itemRewards: [],
          finalMemberStates: {
            hero_1: { currentHp: 0, maxHp: 100, status: 'dead' },
            hero_2: { currentHp: 12, maxHp: 100, status: 'wounded' },
          },
          teamSnapshot: {
            hero_1: { name: '顾长风', quality: 'common', realm: 4, realmStage: 3 },
            hero_2: { name: '柳沉烟', quality: 'spirit', realm: 3, realmStage: 2 },
          },
          discipleMutations: {},
          postRunMemberOutcomes: {
            hero_1: { outcome: 'sacrificed' },
            hero_2: { outcome: 'recovering', recoveryDays: 3 },
          },
          steps: [],
        },
      },
    })

    render(
      <MemoryRouter>
        <AdventurePage />
      </MemoryRouter>
    )

    expect(screen.getAllByText('失利').length).toBeGreaterThan(0)
    expect(screen.getByText(/第 2 层/)).toBeInTheDocument()
  })

  it('marks guixu resonance as an endgame loop template after the trinity milestone', () => {
    seedGuixuTemplate()

    render(
      <MemoryRouter>
        <AdventurePage />
      </MemoryRouter>
    )

    expect(screen.getAllByText('终盘循环').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/三遗齐鸣已成/).length).toBeGreaterThan(0)
  })

  it('shows a guixu loop efficiency preview and compares it with the latest haul', () => {
    seedGuixuTemplate()
    seedGuixuReport(5, 3)

    render(
      <MemoryRouter>
        <AdventurePage />
      </MemoryRouter>
    )

    expect(screen.getByTestId('guixu-loop-preview')).toBeInTheDocument()
    expect(screen.getByText('深潜搏材')).toBeInTheDocument()
    expect(screen.getByText(/潮晶 5-6，残片 3-4/)).toBeInTheDocument()
    expect(screen.getByText(/连续失利/)).toBeInTheDocument()
    expect(screen.getByTestId('guixu-loop-reality')).toBeInTheDocument()
    expect(screen.getByText('最近实收')).toBeInTheDocument()
    expect(screen.getByText(/潮晶 5 · 残片 3 · 推进至第 15 层/)).toBeInTheDocument()
    expect(screen.getByText('符合预估')).toBeInTheDocument()
    expect(screen.getByTestId('guixu-loop-advice')).toBeInTheDocument()
    expect(screen.getByText('试一轮推进收益')).toBeInTheDocument()
  })

  it('offers one-click stabilization when the guixu haul falls below estimate', () => {
    seedGuixuTemplate({ riskTolerance: 'risky', supplyLevel: 'enhanced', rewardFocus: 'materials' })
    seedGuixuReport(2, 1, 'failed')

    render(
      <MemoryRouter>
        <AdventurePage />
      </MemoryRouter>
    )

    expect(screen.getByText('低于预估')).toBeInTheDocument()
    expect(screen.getByText('改成均衡风险')).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: '一键套用' })[0]!)

    const updatedTemplate = useSectStore
      .getState()
      .sect.automationSettings.expeditionTemplates.find((template) => template.id === 'guixuResonance')

    expect(updatedTemplate?.riskTolerance).toBe('balanced')
  })

  it('shows the latest applied guixu adjustment on the template card', () => {
    seedGuixuTemplate()
    seedGuixuReport(5, 3)
    useEventLogStore
      .getState()
      .addEvent('automation_adjusted', '已按离线建议调整归墟回响：风险改为均衡。', {
        templateId: 'guixuResonance',
        source: 'offline_report',
      })

    render(
      <MemoryRouter>
        <AdventurePage />
      </MemoryRouter>
    )

    expect(screen.getByTestId('guixu-adjustment-banner')).toBeInTheDocument()
    expect(screen.getByText(/风险改为均衡/)).toBeInTheDocument()
  })
})
