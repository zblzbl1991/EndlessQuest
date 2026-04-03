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
})

describe('SectPage', () => {
  beforeEach(() => {
    useSectStore.getState().reset()
    useAdventureStore.getState().reset()
    useGameStore.getState().reset()
    vi.mocked(clearSaveData).mockClear()
  })

  it('renders a light overview instead of directive homepage guidance', () => {
    render(
      <MemoryRouter>
        <SectPage />
      </MemoryRouter>
    )

    expect(screen.getByText('要务')).toBeInTheDocument()
    expect(screen.getByTestId('sect-hero')).toBeInTheDocument()
    expect(screen.getByTestId('sect-midground-grid')).toBeInTheDocument()
    expect(screen.queryByText('行动指引')).not.toBeInTheDocument()
    expect(screen.queryByText('行动优先级')).not.toBeInTheDocument()
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

    expect(screen.getByText('战报')).toBeInTheDocument()
    expect(screen.queryByText(/进行中的秘境/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '查看详情' })).toHaveAttribute('href', '/adventure/report/report_1')
  })

  it('keeps disciple information at overview level without rendering the disciple list', () => {
    render(
      <MemoryRouter>
        <SectPage />
      </MemoryRouter>
    )

    expect(screen.getAllByText('弟子').length).toBeGreaterThan(0)
    expect(screen.queryByText('弟子列表')).not.toBeInTheDocument()
    expect(screen.queryByText(useSectStore.getState().sect.characters[0]!.name)).not.toBeInTheDocument()
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
