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

  it('does not render action agenda or cultivation diagnosis on the sect homepage', () => {
    render(
      <MemoryRouter>
        <SectPage />
      </MemoryRouter>
    )

    expect(screen.queryByText('修行要务')).not.toBeInTheDocument()
    expect(screen.queryByText('宗门诊脉')).not.toBeInTheDocument()
    expect(screen.getByText('资源总览')).toBeInTheDocument()
  })

  it('renders the split status summary labels for disciples', () => {
    render(
      <MemoryRouter>
        <SectPage />
      </MemoryRouter>
    )

    expect(screen.getAllByText('修炼中').length).toBeGreaterThan(0)
    expect(screen.getByText('派遣中')).toBeInTheDocument()
    expect(screen.getByText('秘境中')).toBeInTheDocument()
    expect(screen.getByText('研习中')).toBeInTheDocument()
    expect(screen.getByText('恢复中')).toBeInTheDocument()
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

    expect(screen.getByText('最近探索')).toBeInTheDocument()
    expect(screen.queryByText(/进行中的秘境/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '查看明细' })).toHaveAttribute('href', '/adventure/report/report_1')
  })
})
