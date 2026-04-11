import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SectPage from '../pages/SectPage'
import { useSectStore } from '../stores/sectStore'
import { useAdventureStore } from '../stores/adventureStore'
import { useGameStore } from '../stores/gameStore'
import { clearSaveData } from '../systems/save/SaveSystem'

vi.mock('../systems/save/SaveSystem', async () => {
  const actual = await vi.importActual<typeof import('../systems/save/SaveSystem')>('../systems/save/SaveSystem')

  return {
    ...actual,
    clearSaveData: vi.fn().mockResolvedValue(undefined),
  }
  it('surfaces the guixu endgame loop signal on the sect hub', () => {
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

    render(
      <MemoryRouter>
        <SectPage />
      </MemoryRouter>
    )

    expect(screen.getAllByText('终盘循环').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/三遗齐鸣已成/).length).toBeGreaterThan(0)
  })
})

describe('SectPage', () => {
  beforeEach(() => {
    useSectStore.getState().reset()
    useAdventureStore.getState().reset()
    useGameStore.getState().reset()
    vi.mocked(clearSaveData).mockClear()
  })

  it('renders the idle hub structure instead of the old directive homepage guidance', () => {
    render(
      <MemoryRouter>
        <SectPage />
      </MemoryRouter>
    )

    expect(screen.getByText('今日宗务')).toBeInTheDocument()
    expect(screen.getByText('瓶颈诊断')).toBeInTheDocument()
    expect(screen.getByText('挂机策略')).toBeInTheDocument()
    expect(screen.getByTestId('sect-hero')).toBeInTheDocument()
    expect(screen.getByTestId('sect-midground-grid')).toBeInTheDocument()
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0)
  })

  it('renders bottleneck and forecast summaries for idle management', () => {
    render(
      <MemoryRouter>
        <SectPage />
      </MemoryRouter>
    )

    expect(screen.getByText('瓶颈诊断')).toBeInTheDocument()
    expect(screen.getByText('下一轮预期')).toBeInTheDocument()
    expect(screen.getByText('挂机策略')).toBeInTheDocument()
  })

  it('renders page without inline adventure reports', () => {
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

    expect(screen.queryByText('战报')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '查看详情' })).not.toBeInTheDocument()
    expect(screen.getByTestId('sect-hero')).toBeInTheDocument()
  })

  it('keeps disciple information at overview level without rendering a full disciple list', () => {
    render(
      <MemoryRouter>
        <SectPage />
      </MemoryRouter>
    )

    expect(screen.getAllByText('弟子').length).toBeGreaterThan(0)
    expect(screen.queryByText('弟子列表')).not.toBeInTheDocument()

    const char = useSectStore.getState().sect.characters[0]!
    if (!char.fateGrid) {
      expect(screen.queryByText(char.name)).not.toBeInTheDocument()
    }
  })

  it('renders a reset button on the sect homepage', () => {
    render(
      <MemoryRouter>
        <SectPage />
      </MemoryRouter>
    )

    expect(screen.getByRole('button', { name: '重置宗门' })).toBeInTheDocument()
  })

  it('resets the current save after confirmation', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    useSectStore.setState((state) => ({
      sect: {
        ...state.sect,
        name: '旧山门',
        level: 9,
        resources: {
          ...state.sect.resources,
          spiritStone: 12345,
        },
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
    })
    useGameStore.setState({ saveSlot: 3, isPaused: true, lastOnlineTime: 1 })

    render(
      <MemoryRouter>
        <SectPage />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: '重置宗门' }))

    await waitFor(() => {
      expect(useSectStore.getState().sect.level).toBe(1)
      expect(useAdventureStore.getState().reports).toHaveLength(0)
      expect(useGameStore.getState().saveSlot).toBe(1)
      expect(clearSaveData).toHaveBeenCalledTimes(1)
    })

    expect(confirmSpy).toHaveBeenCalledWith('确认重置当前宗门档案吗？此操作会清空当前进度。')
    confirmSpy.mockRestore()
  })
})
