import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AdventureReportPage from '../pages/AdventureReportPage'
import { useAdventureStore } from '../stores/adventureStore'
import { useSectStore } from '../stores/sectStore'

describe('AdventureReportPage level summary', () => {
  beforeEach(() => {
    useSectStore.getState().reset()
    useAdventureStore.getState().reset()

    const baseCharacter = useSectStore.getState().sect.characters[0]
    useSectStore.setState((state) => ({
      sect: {
        ...state.sect,
        characters: [
          {
            ...baseCharacter,
            id: 'c_growth',
            name: 'Ling Qingzhu',
          },
        ],
      },
    }))

    useAdventureStore.setState({
      reports: [
        {
          id: 'report_growth',
          dungeonId: 'lingCaoValley',
          teamCharacterIds: ['c_growth'],
          strategy: 'steady',
          tacticalPreset: 'balanced',
          startedAt: 1,
          finishedAt: 2,
          result: 'completed',
          floorsCleared: 6,
          rewards: { spiritStone: 160, spiritEnergy: 0, herb: 10, ore: 2 },
          itemRewardCount: 0,
        },
      ],
      reportDetails: {
        report_growth: {
          id: 'report_growth',
          config: {
            dungeonId: 'lingCaoValley',
            teamCharacterIds: ['c_growth'],
            supplyLevel: 'basic',
            tacticalPreset: 'balanced',
            automationStrategy: 'steady',
          },
          dungeonId: 'lingCaoValley',
          teamCharacterIds: ['c_growth'],
          startedAt: 1,
          finishedAt: 2,
          result: 'completed',
          floorsCleared: 6,
          rewards: { spiritStone: 160, spiritEnergy: 0, herb: 10, ore: 2 },
          itemRewards: [],
          finalMemberStates: {
            c_growth: { currentHp: 88, maxHp: 100, status: 'alive' },
          },
          teamSnapshot: {
            c_growth: { name: 'Ling Qingzhu', quality: 'common', realm: 0, realmStage: 0 },
          },
          discipleMutations: {},
          dungeonGrowthApplied: {
            c_growth: {
              statBoost: 24,
              cultivationGain: 60,
              xpGained: 60,
              levelsGained: 1,
              levelAfter: 2,
              statGain: { hp: 2, atk: 1, def: 1 },
            },
          },
          steps: [
            {
              id: 'step_growth',
              type: 'run_completed',
              timestamp: 2,
              floor: 6,
              summary: 'Report complete',
              detail: 'The team finished the training route safely.',
            },
          ],
        },
      },
    })
  })

  it('shows level-up details inside the growth summary', () => {
    render(
      <MemoryRouter initialEntries={['/adventure/report/report_growth']}>
        <Routes>
          <Route path="/adventure/report/:reportId" element={<AdventureReportPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByTestId('report-timeline-scroll')).toBeInTheDocument()
    expect(screen.getByTestId('report-rewards-scroll')).toBeInTheDocument()
    expect(screen.getByTestId('report-growth-scroll')).toBeInTheDocument()
    const growthCard = screen.getByTestId('report-growth-c_growth')
    expect(growthCard.textContent).toContain('60')
    expect(growthCard.textContent).toContain('Lv.2')
    expect(growthCard.textContent).toContain('+2 /')
    expect(growthCard.textContent).toContain('+1 /')
  })
})
