import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SectPage from '../pages/SectPage'
import { useSectStore } from '../stores/sectStore'
import { useAdventureStore } from '../stores/adventureStore'
import { useGameStore } from '../stores/gameStore'
import { useEventLogStore } from '../stores/eventLogStore'

describe('SectPage loop summary', () => {
  beforeEach(() => {
    useSectStore.getState().reset()
    useAdventureStore.getState().reset()
    useGameStore.getState().reset()
    useEventLogStore.getState().reset()
  })

  it('surfaces the latest guixu material haul on the sect hub', () => {
    useSectStore.setState((state) => ({
      sect: {
        ...state.sect,
        archiveMilestones: [
          { id: 'legacyForgePair', unlockedAt: 1 },
          { id: 'legacyForgeTrinity', unlockedAt: 2 },
        ],
        automationSettings: {
          ...state.sect.automationSettings,
          activeTemplateId: 'guixuResonance',
        },
      },
    }))

    useAdventureStore.setState({
      reports: [
        {
          id: 'report_guixu',
          dungeonId: 'guixuRift',
          teamCharacterIds: [],
          strategy: 'steady',
          tacticalPreset: 'balanced',
          startedAt: 1,
          finishedAt: 2,
          result: 'completed',
          floorsCleared: 14,
          rewards: { spiritStone: 420, spiritEnergy: 0, herb: 0, ore: 24 },
          itemRewardCount: 3,
        },
      ],
      reportDetails: {
        report_guixu: {
          id: 'report_guixu',
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
          floorsCleared: 14,
          rewards: { spiritStone: 420, spiritEnergy: 0, herb: 0, ore: 24 },
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
      },
    })

    render(
      <MemoryRouter>
        <SectPage />
      </MemoryRouter>
    )

    expect(screen.getByTestId('sect-guixu-loop-yield')).toHaveTextContent('潮晶 2')
    expect(screen.getByTestId('sect-guixu-loop-yield')).toHaveTextContent('残片 1')
    expect(screen.getByTestId('sect-guixu-loop-yield')).toHaveTextContent('14')
  })

  it('shows the latest applied guixu adjustment on the sect hub', () => {
    useSectStore.setState((state) => ({
      sect: {
        ...state.sect,
        archiveMilestones: [{ id: 'legacyForgePair', unlockedAt: 1 }],
        automationSettings: {
          ...state.sect.automationSettings,
          activeTemplateId: 'guixuResonance',
        },
      },
    }))

    useEventLogStore.getState().addEvent('automation_adjusted', '已按离线建议调整归墟回响：风险改为均衡。', {
      templateId: 'guixuResonance',
      source: 'offline_report',
    })

    render(
      <MemoryRouter>
        <SectPage />
      </MemoryRouter>
    )

    expect(screen.getByTestId('sect-template-adjustment')).toHaveTextContent('风险改为均衡')
  })
})
