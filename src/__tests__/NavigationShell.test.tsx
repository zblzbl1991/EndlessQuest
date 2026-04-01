import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Sidebar from '../components/common/Sidebar'
import BottomNav from '../components/common/BottomNav'
import { useSectStore } from '../stores/sectStore'

describe('Navigation shell', () => {
  beforeEach(() => {
    useSectStore.getState().reset()
  })

  it('renders shared desktop and mobile navigation labels without emoji fallback', () => {
    render(
      <MemoryRouter>
        <Sidebar />
        <BottomNav />
      </MemoryRouter>
    )

    const expectedLabels = ['宗门', '弟子', '建筑', '秘境', '仓库', '记录']

    const desktopNav = screen.getByRole('navigation', { name: '侧边导航' })
    const mobileNav = screen.getByRole('navigation', { name: '底部导航' })

    for (const label of expectedLabels) {
      expect(within(desktopNav).getByText(label)).toBeInTheDocument()
      expect(within(mobileNav).getByText(label)).toBeInTheDocument()
    }

    expect(screen.queryByText('⛩')).not.toBeInTheDocument()
    expect(screen.queryByText('👤')).not.toBeInTheDocument()
    expect(screen.queryByText('🏯')).not.toBeInTheDocument()
    expect(screen.queryByText('⚔')).not.toBeInTheDocument()
    expect(screen.queryByText('📦')).not.toBeInTheDocument()
    expect(screen.queryByText('📜')).not.toBeInTheDocument()
  })
})
