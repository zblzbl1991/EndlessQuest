import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import OfflineReportModal from '../components/common/OfflineReportModal'

describe('OfflineReportModal', () => {
  it('renders a highlighted offline reward sheet', () => {
    const onClose = vi.fn()

    render(
      <OfflineReportModal
        report={{
          offlineSeconds: 5400,
          resourcesGained: { spiritStone: 120, spiritEnergy: 88, herb: 16, ore: 9 },
          breakthroughs: [{ characterName: '测试弟子', targetRealm: '筑基', success: true }],
          itemsCrafted: [{ name: '聚气丹', quantity: 2 }],
          taxIncome: 30,
        }}
        onClose={onClose}
      />
    )

    expect(screen.getByText('离线修炼报告')).toBeInTheDocument()
    expect(screen.getByText('资源收获')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '收取' })).toBeInTheDocument()
    expect(screen.getByTestId('offline-highlight')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '收取' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders a calm empty-state fallback when there are no special gains', () => {
    render(
      <OfflineReportModal
        report={{
          offlineSeconds: 120,
          resourcesGained: { spiritStone: 0, spiritEnergy: 0, herb: 0, ore: 0 },
          breakthroughs: [],
          itemsCrafted: [],
          taxIncome: 0,
        }}
        onClose={() => {}}
      />
    )

    expect(screen.getByText('离线期间无特殊收获')).toBeInTheDocument()
  })
})
