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

    expect(screen.queryByText('宗门生态')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('招收'))
    expect(screen.queryByText('宗门生态')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('炼丹'))
    expect(screen.queryByText(/生态偏置/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('锻造'))
    expect(screen.queryByText(/生态偏置/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('参悟'))
    expect(screen.queryByText(/生态偏置/)).not.toBeInTheDocument()
  })
})
