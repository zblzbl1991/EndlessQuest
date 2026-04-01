import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SectPage from '../pages/SectPage'
import { useSectStore } from '../stores/sectStore'
import { useAdventureStore } from '../stores/adventureStore'

describe('SectPage', () => {
  beforeEach(() => {
    useSectStore.getState().reset()
    useAdventureStore.getState().reset()
  })

  it('renders the action dashboard and the priority agenda on the sect homepage', () => {
    render(
      <MemoryRouter>
        <SectPage />
      </MemoryRouter>
    )

    expect(screen.getByText('行动指引')).toBeInTheDocument()
    expect(screen.getByText('行动优先级')).toBeInTheDocument()
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0)
  })

  it('renders the focus summary from StatsPanel', () => {
    render(
      <MemoryRouter>
        <SectPage />
      </MemoryRouter>
    )

    expect(screen.getByText('当前重点')).toBeInTheDocument()
    expect(screen.getByText('建设')).toBeInTheDocument()
    expect(screen.getByText('流转正常')).toBeInTheDocument()
  })

  it('renders recent adventure summaries instead of live run progress when reports exist', () => {
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
    })

    render(
      <MemoryRouter>
        <SectPage />
      </MemoryRouter>
    )

    expect(screen.getByText('最近探险')).toBeInTheDocument()
    expect(screen.queryByText(/进行中的秘境/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '查看详情' })).toHaveAttribute('href', '/adventure/report/report_1')
  })
})
