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
    expect(screen.getByText('宗门营造')).toBeInTheDocument()
    expect(screen.getByText('当前营造重点')).toBeInTheDocument()
    expect(screen.queryByText('宗门生态')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('招收'))
    expect(screen.getByTestId('building-subpanel')).toBeInTheDocument()
    expect(screen.getByText('招募概览')).toBeInTheDocument()
    expect(screen.queryByText('宗门生态')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('仓库'))
    expect(screen.getByText('藏物去向')).toBeInTheDocument()

    fireEvent.click(screen.getByText('炼丹'))
    expect(screen.getByTestId('building-subpanel')).toBeInTheDocument()
    expect(screen.queryByText(/生态偏置/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('锻造'))
    expect(screen.queryByText(/生态偏置/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('参悟'))
    expect(screen.queryByText(/生态偏置/)).not.toBeInTheDocument()
  })
})
