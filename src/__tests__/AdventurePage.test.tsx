import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AdventurePage from '../pages/AdventurePage'
import { useAdventureStore } from '../stores/adventureStore'
import { useSectStore } from '../stores/sectStore'

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
        discipleMutations: {},
        steps: [],
      },
    },
  })
}

describe('AdventurePage', () => {
  beforeEach(() => {
    useSectStore.getState().reset()
    useAdventureStore.getState().reset()
    seedAdventureState()
  })

  it('shows the balanced daily page anchors', () => {
    render(
      <MemoryRouter>
        <AdventurePage />
      </MemoryRouter>
    )

    expect(screen.getByTestId('adventure-hero')).toBeInTheDocument()
    expect(screen.getByText('最近探索记录')).toBeInTheDocument()
    expect(screen.getByText('任务派遣')).toBeInTheDocument()
    expect(screen.getByText('待启程秘境')).toBeInTheDocument()
  })

  it('reorders the team builder around intent, tactic, and team selection', () => {
    render(
      <MemoryRouter>
        <AdventurePage />
      </MemoryRouter>
    )

    fireEvent.click(screen.getAllByText('开始探索')[0]!)

    expect(screen.getByText('本局意图')).toBeInTheDocument()
    expect(screen.getByText('战术')).toBeInTheDocument()
    expect(screen.getByText('出战弟子')).toBeInTheDocument()
    expect(screen.getByText(/本次探索可能折损弟子/)).toBeInTheDocument()
  })

  it('renders player-facing adventure copy in Chinese and normalizes legacy route text', () => {
    useAdventureStore.setState((state) => ({
      reportDetails: {
        ...state.reportDetails,
        report_recent: {
          ...state.reportDetails.report_recent,
          steps: [
            {
              id: 'legacy_route',
              type: 'route_selected',
              timestamp: 2,
              floor: 2,
              summary: 'stable route chosen',
              detail: 'combat route was skipped for safety.',
            },
          ],
        },
      },
    }))

    render(
      <MemoryRouter>
        <AdventurePage />
      </MemoryRouter>
    )

    expect(screen.getAllByText('战术：平衡').length).toBeGreaterThan(0)
    expect(screen.getByText(/关键构筑：/)).toBeInTheDocument()
    expect(screen.queryByText(/build/i)).not.toBeInTheDocument()
    expect(screen.getByText('稳定')).toBeInTheDocument()
    expect(screen.getByText('战斗')).toBeInTheDocument()
  })
})
