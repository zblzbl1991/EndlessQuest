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
        teamSnapshot: {
          c1: { name: '测试弟子', quality: 'common', realm: 0, realmStage: 0 },
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

    expect(screen.getByText(/最近探索记录/)).toBeInTheDocument()
    // Compact report card: result badge and detail link
    expect(screen.getAllByText('通关').length).toBeGreaterThan(0)
    expect(screen.getByText('查看详情')).toBeInTheDocument()
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
    expect(screen.getAllByText('测试弟子').length).toBeGreaterThan(0)
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

  it('renders report detail highlight copy in Chinese', () => {
    render(
      <MemoryRouter initialEntries={['/adventure/report/report_1']}>
        <Routes>
          <Route path="/adventure/report/:reportId" element={<AdventureReportPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getAllByText('平衡').length).toBeGreaterThan(0)
    expect(screen.getByText('关键构筑')).toBeInTheDocument()
    expect(screen.queryByText(/build/i)).not.toBeInTheDocument()
  })

  it('renders exclusive loot in the reward summary when a report contains items', () => {
    useAdventureStore.setState((s) => ({
      reportDetails: {
        ...s.reportDetails,
        report_1: {
          ...s.reportDetails.report_1,
          itemRewards: [
            {
              id: 'legacy_material_1',
              name: '归墟潮晶',
              quality: 'spirit',
              type: 'material',
              description: '自归墟裂隙带回的遗产晶体。',
              sellPrice: 180,
              category: 'other',
            },
            {
              id: 'legacy_scroll_1',
              name: '鸿蒙道诀（遗产残卷）',
              quality: 'chaos',
              type: 'techniqueScroll',
              description: '遗产首通带回的残卷。',
              sellPrice: 3200,
              techniqueId: 'hongmengdaojue',
            },
          ],
        },
      },
    }))

    render(
      <MemoryRouter initialEntries={['/adventure/report/report_1']}>
        <Routes>
          <Route path="/adventure/report/:reportId" element={<AdventureReportPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('战利品')).toBeInTheDocument()
    expect(screen.getByText('归墟潮晶')).toBeInTheDocument()
    expect(screen.getByText('鸿蒙道诀（遗产残卷）')).toBeInTheDocument()
  })

  it('keeps report names readable even after the disciple is removed from the live roster', () => {
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        characters: [],
      },
    }))

    render(
      <MemoryRouter initialEntries={['/adventure/report/report_1']}>
        <Routes>
          <Route path="/adventure/report/:reportId" element={<AdventureReportPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getAllByText('测试弟子').length).toBeGreaterThan(0)
  })

  it('renders return outcomes for failed runs on the detail page', () => {
    useAdventureStore.setState({
      reports: [
        {
          id: 'report_failed',
          dungeonId: 'luoYunCave',
          teamCharacterIds: ['c1', 'c2'],
          strategy: 'steady',
          tacticalPreset: 'balanced',
          startedAt: 3,
          finishedAt: 4,
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
            teamCharacterIds: ['c1', 'c2'],
            supplyLevel: 'basic',
            tacticalPreset: 'balanced',
            automationStrategy: 'steady',
          },
          dungeonId: 'luoYunCave',
          teamCharacterIds: ['c1', 'c2'],
          startedAt: 3,
          finishedAt: 4,
          result: 'failed',
          floorsCleared: 2,
          rewards: { spiritStone: 40, spiritEnergy: 0, herb: 0, ore: 2 },
          itemRewards: [],
          finalMemberStates: {
            c1: { currentHp: 0, maxHp: 100, status: 'dead' },
            c2: { currentHp: 18, maxHp: 100, status: 'wounded' },
          },
          teamSnapshot: {
            c1: { name: '测试弟子', quality: 'common', realm: 0, realmStage: 0 },
            c2: { name: '林清河', quality: 'spirit', realm: 1, realmStage: 1 },
          },
          discipleMutations: {},
          postRunMemberOutcomes: {
            c1: { outcome: 'sacrificed' },
            c2: { outcome: 'recovering', recoveryDays: 4 },
          },
          steps: [
            {
              id: 'step_failed',
              type: 'run_failed',
              timestamp: 4,
              floor: 2,
              summary: '探索失败',
              detail: '队伍在洞窟深处溃散。',
            },
          ],
        },
      },
    })

    render(
      <MemoryRouter initialEntries={['/adventure/report/report_failed']}>
        <Routes>
          <Route path="/adventure/report/:reportId" element={<AdventureReportPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('归宗结果')).toBeInTheDocument()
    expect(screen.getByText('未归')).toBeInTheDocument()
    expect(screen.getByText('测试弟子')).toBeInTheDocument()
    expect(screen.getByText('重伤归宗')).toBeInTheDocument()
    expect(screen.getByText('林清河（4天）')).toBeInTheDocument()
  })

  it('removes dead disciples from the sect roster when an adventure resolves', () => {
    const character = useSectStore.getState().sect.characters[0]
    const run = useAdventureStore.getState().startRun('lingCaoValley', [character.id], 'basic')

    expect(run).not.toBeNull()

    useAdventureStore.setState((s) => ({
      activeRuns: {
        ...s.activeRuns,
        [run!.id]: {
          ...s.activeRuns[run!.id],
          memberStates: {
            ...s.activeRuns[run!.id].memberStates,
            [character.id]: { currentHp: 0, maxHp: 100, status: 'dead' },
          },
        },
      },
    }))

    useAdventureStore.getState().completeRun(run!.id)

    expect(useSectStore.getState().sect.characters.find((item) => item.id === character.id)).toBeUndefined()
  })

  it('surfaces the guixu endgame loop signal for trinity-state reports', () => {
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        archiveMilestones: [
          { id: 'legacyForgePair', unlockedAt: 1 },
          { id: 'legacyForgeTrinity', unlockedAt: 2 },
        ],
      },
    }))

    useAdventureStore.setState((s) => ({
      reports: [
        {
          ...s.reports[0],
          dungeonId: 'guixuRift',
        },
      ],
      reportDetails: {
        ...s.reportDetails,
        report_1: {
          ...s.reportDetails.report_1,
          dungeonId: 'guixuRift',
          itemRewards: [
            {
              id: 'legacy_tide_1',
              name: '归墟潮晶',
              quality: 'spirit',
              type: 'material',
              description: '',
              sellPrice: 180,
              category: 'other',
            },
            {
              id: 'legacy_shard_1',
              name: '渊息残片',
              quality: 'divine',
              type: 'material',
              description: '',
              sellPrice: 420,
              category: 'other',
            },
            {
              id: 'legacy_shard_2',
              name: '渊息残片',
              quality: 'divine',
              type: 'material',
              description: '',
              sellPrice: 420,
              category: 'other',
            },
          ],
        },
      },
    }))

    render(
      <MemoryRouter initialEntries={['/adventure/report/report_1']}>
        <Routes>
          <Route path="/adventure/report/:reportId" element={<AdventureReportPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByTestId('report-loop-signal')).toBeInTheDocument()
    expect(screen.getByText('归墟终盘循环')).toBeInTheDocument()
    expect(screen.getByText(/潮晶 1，残片 2/)).toBeInTheDocument()
  })
})
