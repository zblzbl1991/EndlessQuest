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

  it('renders guixu loop rewards when legacy materials were brought back offline', () => {
    render(
      <OfflineReportModal
        report={{
          offlineSeconds: 7200,
          resourcesGained: { spiritStone: 0, spiritEnergy: 0, herb: 0, ore: 0 },
          breakthroughs: [],
          itemsCrafted: [],
          taxIncome: 0,
          loopRewards: {
            title: '归墟终盘收获',
            detail: '离线期间共结算 2 份归墟战报，三遗齐鸣让回响稳定带回深层遗材。',
            tideCrystalCount: 3,
            abyssShardCount: 2,
          },
        }}
        onClose={() => {}}
      />
    )

    expect(screen.getByTestId('offline-loop-rewards')).toBeInTheDocument()
    expect(screen.getByText('归墟终盘收获')).toBeInTheDocument()
    expect(screen.getByText('归墟潮晶')).toBeInTheDocument()
    expect(screen.getByText('渊息残片')).toBeInTheDocument()
    expect(screen.getByText('x3')).toBeInTheDocument()
    expect(screen.getByText('x2')).toBeInTheDocument()
  })

  it('supports one-click loop adjustment from the offline report', () => {
    const onApplyLoopAdjustment = vi.fn()

    render(
      <OfflineReportModal
        report={{
          offlineSeconds: 7200,
          resourcesGained: { spiritStone: 0, spiritEnergy: 0, herb: 0, ore: 0 },
          breakthroughs: [],
          itemsCrafted: [],
          taxIncome: 0,
          loopAdjustment: {
            label: '低于预估',
            detail: '先把归墟推进层数稳住，再观察潮晶和残片是否回到预估区间。',
            actionLabel: '改成均衡风险',
          },
        }}
        onClose={() => {}}
        onApplyLoopAdjustment={onApplyLoopAdjustment}
      />
    )

    expect(screen.getByTestId('offline-loop-adjustment')).toBeInTheDocument()
    expect(screen.getByText('改成均衡风险')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '改成均衡风险' }))
    expect(onApplyLoopAdjustment).toHaveBeenCalledTimes(1)
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

    expect(screen.getByText('离线期间暂无特殊收获。')).toBeInTheDocument()
  })
})
