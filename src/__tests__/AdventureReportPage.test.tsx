import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AdventurePage from '../pages/AdventurePage'
import AdventureReportPage from '../pages/AdventureReportPage'
import { useAdventureStore } from '../stores/adventureStore'
import { useSectStore } from '../stores/sectStore'

function seedReport() {
  useAdventureStore.setState({
    reports: [
      {
        id: 'report_1',
        dungeonId: 'lingCaoValley',
        teamCharacterIds: ['c1'],
        strategy: 'steady',
        tacticalPreset: 'balanced',
        startedAt: 1,
        finishedAt: 2,
        result: 'completed',
        floorsCleared: 5,
        rewards: { spiritStone: 120, spiritEnergy: 0, herb: 12, ore: 0 },
        itemRewardCount: 0,
      },
    ],
    reportDetails: {
      report_1: {
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
        result: 'completed',
        floorsCleared: 5,
        rewards: { spiritStone: 120, spiritEnergy: 0, herb: 12, ore: 0 },
        itemRewards: [],
        finalMemberStates: {
          c1: { currentHp: 80, maxHp: 100, status: 'alive' },
        },
        steps: [
          {
            id: 'step_1',
            type: 'floor_started',
            timestamp: 1,
            floor: 1,
            summary: '第 1 层开始',
            detail: '队伍进入第 1 层。',
          },
        ],
      },
    },
  })
}

describe('Adventure report pages', () => {
  beforeEach(() => {
    useSectStore.getState().reset()
    useAdventureStore.getState().reset()
    seedReport()
  })

  it('renders recent exploration summaries on the adventure page', () => {
    render(
      <MemoryRouter>
        <AdventurePage />
      </MemoryRouter>
    )

    expect(screen.getByText('最近探索记录')).toBeInTheDocument()
    expect(screen.getByText('稳健')).toBeInTheDocument()
    expect(screen.getByText('查看过程')).toBeInTheDocument()
    expect(screen.getAllByText('灵草谷').length).toBeGreaterThan(0)
  })

  it('renders the dedicated exploration report detail route', () => {
    render(
      <MemoryRouter initialEntries={['/adventure/report/report_1']}>
        <Routes>
          <Route path="/adventure/report/:reportId" element={<AdventureReportPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('探索过程')).toBeInTheDocument()
    expect(screen.getByText('第 1 层开始')).toBeInTheDocument()
    expect(screen.getByText('灵草谷')).toBeInTheDocument()
  })
})
