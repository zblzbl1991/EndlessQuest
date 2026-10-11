import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { attemptRecord, readRecords, RECORD_DEFS } from '../systems/sect/DaozuRecords'
import StatsPanel from '../components/sect/StatsPanel'
import { useSectStore } from '../stores/sectStore'
import { MemoryRouter } from 'react-router-dom'
import type { SectStats } from '../types'

// ─── V2.2 工单 05：道祖榜（本地自比纪录） ──────────────────────────────────

const baseStats = (): SectStats => ({
  totalSpiritStoneEarned: 0,
  totalSpiritStoneSpent: 0,
  totalBattles: 0,
  totalVictories: 0,
  totalKills: 0,
  maxFloorCleared: 0,
  totalRecruits: 0,
  totalBreakthroughAttempts: 0,
  totalBreakthroughSuccesses: 0,
  totalBuildingUpgrades: 0,
  totalAdventureRuns: 0,
  totalAdventureCompletions: 0,
  totalAdventureFailures: 0,
  totalPetCaptures: 0,
  totalPlayTime: 0,
  longestOfflineSeconds: 0,
  peakCultivationThisRun: 0,
})

describe('纪录判定', () => {
  it('首次创建（0 = 未创建）：任何正值都成立', () => {
    const stats = baseStats()
    expect(attemptRecord(stats, 'fastestTribulationSeconds', 3 * 86400)).toBe(0)
    expect(stats.fastestTribulationSeconds).toBe(3 * 86400)
  })

  it('更快打破：更新并返回旧值', () => {
    const stats = baseStats()
    attemptRecord(stats, 'fastestDaozuSeconds', 30 * 86400)
    const old = attemptRecord(stats, 'fastestDaozuSeconds', 25 * 86400)
    expect(old).toBe(30 * 86400)
    expect(stats.fastestDaozuSeconds).toBe(25 * 86400)
  })

  it('更慢不打破', () => {
    const stats = baseStats()
    attemptRecord(stats, 'bestDaoYunGain', 100)
    expect(attemptRecord(stats, 'bestDaoYunGain', 50)).toBeNull()
    expect(stats.bestDaoYunGain).toBe(100)
  })

  it('递增型纪录（峰值/道韵/证道次数）', () => {
    const stats = baseStats()
    attemptRecord(stats, 'bestPeakCultivation', 1e40)
    expect(attemptRecord(stats, 'bestPeakCultivation', 1e39)).toBeNull()
    expect(attemptRecord(stats, 'bestPeakCultivation', 1e41)).toBe(1e40)
    // daoProvingCount 为镜像字段（证道时直接写入），不经 attemptRecord
  })

  it('未知 key 返回 null', () => {
    const stats = baseStats()
    expect(attemptRecord(stats, 'notAKey' as never, 1)).toBeNull()
  })

  it('readRecords 缺省 0', () => {
    expect(readRecords(baseStats()).fastestTribulationSeconds).toBe(0)
    expect(RECORD_DEFS).toHaveLength(4)
  })
})

describe('StatsPanel 自我基准表', () => {
  it('渲染纪录表，未创建显示 —', () => {
    useSectStore.getState().reset()
    render(
      <MemoryRouter>
        <StatsPanel />
      </MemoryRouter>
    )
    expect(screen.getByTestId('daozu-records')).toBeInTheDocument()
    expect(screen.getByText('自我基准 · 道祖榜')).toBeInTheDocument()
    expect(screen.getByText('最快渡劫')).toBeInTheDocument()
  })

  it('有纪录时显示格式化值', () => {
    useSectStore.setState((s) => ({
      sect: { ...s.sect, stats: { ...s.sect.stats, fastestTribulationSeconds: 3.55 * 86400, daoProvingCount: 2 } },
    }))
    render(
      <MemoryRouter>
        <StatsPanel />
      </MemoryRouter>
    )
    expect(screen.getByText('3.55 天')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })
})
