import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AdventurePage from '../pages/AdventurePage'
import AdventureReportPage from '../pages/AdventureReportPage'
import { getDiscipleMutationDef } from '../data/discipleMutations'
import { useAdventureStore } from '../stores/adventureStore'
import { useSectStore } from '../stores/sectStore'

function seedReport() {
  const baseCharacter = useSectStore.getState().sect.characters[0]
  useSectStore.setState((s) => ({
    sect: {
      ...s.sect,
      characters: [
        {
          ...baseCharacter,
          id: 'c1',
          name: '测试弟子',
        },
      ],
    },
  }))

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
        discipleMutations: {
          c1: ['sword_intent', 'lucky_omen'],
        },
        steps: [
          {
            id: 'step_0',
            type: 'run_started',
            timestamp: 1,
            floor: 1,
            summary: '开始探索',
            detail: '队伍进入灵草谷。',
          },
          {
            id: 'step_1',
            type: 'blessing_decision',
            timestamp: 1,
            floor: 1,
            summary: '选择祝福：战斗专注',
            detail: '队伍选择了更偏战斗的临场强化。',
            decisionReason: '稳健推进优先保证生存',
          },
          {
            id: 'step_2',
            type: 'member_state_changed',
            timestamp: 1,
            floor: 3,
            summary: '弟子血线下滑',
            detail: '测试弟子在中层战斗后保持稳定输出，但血线已进入警戒区。',
          },
          {
            id: 'step_3',
            type: 'auto_choice_made',
            timestamp: 2,
            floor: 5,
            summary: '获得遗物：战旗',
            detail: '战旗提高了后续战斗的压制能力。',
          },
          {
            id: 'step_4',
            type: 'run_completed',
            timestamp: 2,
            floor: 5,
            summary: '通关完成',
            detail: '队伍保持血线并成功清图。',
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
    expect(screen.getByText('守成')).toBeInTheDocument()
    expect(screen.getByText('查看过程')).toBeInTheDocument()
    expect(
      screen.getAllByText((_, node) => {
        const text = node?.textContent ?? ''
        return text.includes('核心弟子') && text.includes('测试弟子')
      }).length
    ).toBeGreaterThan(0)
    expect(screen.getByText('转折点')).toBeInTheDocument()
    expect(screen.getByText('异变')).toBeInTheDocument()
    expect(
      screen.getAllByText((_, node) => {
        const text = node?.textContent ?? ''
        return text.includes('测试弟子') && text.includes(getDiscipleMutationDef('sword_intent').name)
      }).length
    ).toBeGreaterThan(0)
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
    expect(screen.getByTestId('report-highlight')).toBeInTheDocument()
    expect(screen.getByText('测试弟子')).toBeInTheDocument()
    expect(screen.getByText('选择祝福：战斗专注')).toBeInTheDocument()
    expect(screen.getByText('获得遗物：战旗')).toBeInTheDocument()
    expect(screen.getByText('异变')).toBeInTheDocument()
    expect(
      screen.getAllByText((_, node) => {
        const text = node?.textContent ?? ''
        return text.includes('测试弟子') && text.includes(getDiscipleMutationDef('sword_intent').name)
      }).length
    ).toBeGreaterThan(0)
    expect(screen.getByText('队伍保持血线并成功清图。')).toBeInTheDocument()
  })
})
