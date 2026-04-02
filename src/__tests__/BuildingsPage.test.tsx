import { fireEvent, render, screen } from '@testing-library/react'
import BuildingsPage from '../pages/BuildingsPage'
import { useSectStore } from '../stores/sectStore'

describe('BuildingsPage', () => {
  beforeEach(() => {
    useSectStore.getState().reset()
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        buildings: s.sect.buildings.map((building) => ({
          ...building,
          unlocked: true,
          level: building.type === 'mainHall' ? 5 : 3,
        })),
      },
    }))
  })

  it('does not show sect ecology blocks or ecology bias copy', () => {
    render(<BuildingsPage />)

    expect(screen.getByTestId('buildings-hero')).toBeInTheDocument()
    expect(screen.getAllByText('建筑').length).toBeGreaterThan(0)
    expect(screen.getByText('当前重点')).toBeInTheDocument()
    expect(screen.queryByText('宗门生态')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('招收'))
    expect(screen.getByTestId('building-subpanel')).toBeInTheDocument()
    expect(screen.getByText(/弟子数量:/)).toBeInTheDocument()
    expect(screen.queryByText('宗门生态')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('仓库'))
    expect(screen.getByText(/仓库容量:/)).toBeInTheDocument()

    fireEvent.click(screen.getByText('炼丹'))
    expect(screen.getByTestId('building-subpanel')).toBeInTheDocument()
    expect(screen.queryByText(/生态偏置/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('锻造'))
    expect(screen.queryByText(/生态偏置/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('参悟'))
    expect(screen.queryByText(/生态偏置/)).not.toBeInTheDocument()
  })

  it('renders buildings page interactions in Chinese', () => {
    render(<BuildingsPage />)

    expect(screen.queryByText('MAX')).not.toBeInTheDocument()
    expect(screen.queryByText('Core sect building.')).not.toBeInTheDocument()
    expect(
      screen.queryByText(/Sect tier|Daily refreshes|Potion power|Forge success|Codex cap|Recruit cost/)
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getAllByText('选择配方')[0]!)
    expect(screen.getByRole('button', { name: '关闭' })).toBeInTheDocument()
  })
})
