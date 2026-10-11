import { describe, it, expect, beforeEach } from 'vitest'
import {
  calcSpiritCostPerSecond,
  calcCultivationRate,
  tick as cultivationTick,
} from '../systems/cultivation/CultivationEngine'
import { calcMaxDisciplesByResources } from '../systems/sect/SectEngine'
import { useSectStore } from '../stores/sectStore'
import { useEventLogStore } from '../stores/eventLogStore'
import { MemoryRouter } from 'react-router-dom'
import OfflineReportModal from '../components/common/OfflineReportModal'
import { render, screen } from '@testing-library/react'
import type { Character } from '../types/character'

// ─── V2.1 工单 04：灵气瓶颈重挂（消耗随境界 ×2 缩放） ─────────────────────

function disciple(realm: number): Character {
  return {
    id: `disc-${realm}`,
    name: `弟子${realm}`,
    title: 'disciple',
    quality: 'common',
    realm,
    realmStage: 0,
    cultivation: 0,
    baseStats: { hp: 100, atk: 15, def: 8, spd: 10, crit: 0.05, critDmg: 1.5 },
    cultivationStats: {
      spiritPower: 50,
      maxSpiritPower: 50,
      comprehension: 10,
      spiritualRoot: 10,
      fortune: 5,
    },
    learnedTechniques: [],
    equippedGear: [null, null, null, null, null, null, null, null, null],
    equippedSkills: [null, null, null, null, null],
    backpack: [],
    maxBackpackSlots: 20,
    petIds: [],
    talents: [],
    status: 'idle',
    injuryTimer: 0,
    createdAt: Date.now(),
    totalCultivation: 0,
    specialties: [],
    assignedBuilding: null,
    cultivationPath: 'sword',
    investedSpiritStone: 0,
    techniqueComprehension: {},
  }
}

describe('境界感知灵气消耗', () => {
  it('calcSpiritCostPerSecond：2 × 2^realm', () => {
    expect(calcSpiritCostPerSecond(0)).toBe(2)
    expect(calcSpiritCostPerSecond(1)).toBe(4)
    expect(calcSpiritCostPerSecond(4)).toBe(32)
    expect(calcSpiritCostPerSecond(8)).toBe(512)
    expect(calcSpiritCostPerSecond()).toBe(2) // 缺省炼气期，兼容旧签名
  })

  it('同量灵气下高境界弟子的灵气供给比更低', () => {
    const low = disciple(0)
    const high = disciple(4)
    // 10 灵气 / 10 秒：炼气期（2/s）供给比 0.5，化神期（32/s）仅 10/320 = 0.03125
    const lowResult = cultivationTick(low, 10, 10)
    const highResult = cultivationTick(high, 10, 10)
    expect(lowResult.spiritSpent).toBe(10)
    expect(lowResult.cultivationGained).toBeGreaterThan(0)
    expect(highResult.spiritSpent).toBe(10)
    // gained = rate × delta × spiritScale → scale = gained / (rate × delta)
    const lowScale = lowResult.cultivationGained / (calcCultivationRate(low, []) * 10)
    const highScale = highResult.cultivationGained / (calcCultivationRate(high, []) * 10)
    expect(lowScale).toBeCloseTo(0.5, 6)
    expect(highScale).toBeCloseTo(10 / 320, 6)
  })

  it('弟子上限按最高境界折算：同一灵田，高境界宗门可养弟子更少', () => {
    const buildings = [
      {
        type: 'spiritField' as const,
        level: 5,
        count: 1,
        unlocked: true,
        productionQueue: { recipeId: null, progress: 0 },
      },
      {
        type: 'spiritMine' as const,
        level: 1,
        count: 1,
        unlocked: true,
        productionQueue: { recipeId: null, progress: 0 },
      },
      {
        type: 'mainHall' as const,
        level: 2,
        count: 1,
        unlocked: true,
        productionQueue: { recipeId: null, progress: 0 },
      },
    ]
    const capRealm0 = calcMaxDisciplesByResources(buildings, [disciple(0)], null)
    const capRealm4 = calcMaxDisciplesByResources(buildings, [disciple(4)], null)
    expect(capRealm0).toBeGreaterThan(capRealm4)
    expect(capRealm4).toBeGreaterThanOrEqual(1)
    // 化神期消耗 ×16 → 上限应约为炼气期的 1/16（向下取整）
    expect(capRealm4).toBe(Math.max(1, Math.floor(capRealm0 / 16)))
  })
})

describe('灵气不足归因（offlineAccumulator.lowSpiritSeconds）', () => {
  beforeEach(() => {
    useSectStore.getState().reset()
    useEventLogStore.getState().reset()
  })

  it('灵气枯竭时 tick 累计短缺秒数，充足时不累计', () => {
    // 灵田 0 级无产出、灵气清零 → ratio = 0 < 0.95
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        resources: { ...s.sect.resources, spiritEnergy: 0 },
        buildings: s.sect.buildings.map((b) => (b.type === 'spiritField' ? { ...b, level: 0 } : b)),
      },
    }))
    useSectStore.getState().tickAll(5)
    expect(useSectStore.getState().sect.offlineAccumulator.lowSpiritSeconds).toBe(5)

    // 灵气充足：恢复灵田与灵气
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        resources: { ...s.sect.resources, spiritEnergy: 5000 },
        buildings: s.sect.buildings.map((b) => (b.type === 'spiritField' ? { ...b, level: 3 } : b)),
      },
    }))
    useSectStore.getState().tickAll(5)
    expect(useSectStore.getState().sect.offlineAccumulator.lowSpiritSeconds).toBe(5)
  })
})

describe('离线报告展示灵气短缺归因', () => {
  it('lowSpiritSeconds > 0 时展示归因行，否则不展示', () => {
    const base = {
      offlineSeconds: 3600,
      resourcesGained: { spiritStone: 0, spiritEnergy: 0, herb: 0, ore: 0 },
      breakthroughs: [],
      itemsCrafted: [],
      taxIncome: 0,
    }
    const { unmount } = render(
      <MemoryRouter>
        <OfflineReportModal report={{ ...base, lowSpiritSeconds: 3600 }} onClose={() => {}} />
      </MemoryRouter>
    )
    expect(screen.getByText(/灵气供给不足/)).toBeInTheDocument()
    expect(screen.getByText(/建议提升灵田等级/)).toBeInTheDocument()
    unmount()

    render(
      <MemoryRouter>
        <OfflineReportModal report={base} onClose={() => {}} />
      </MemoryRouter>
    )
    expect(screen.queryByText(/灵气供给不足/)).not.toBeInTheDocument()
  })
})
