import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { bumpOfflineAccumulator, countEquipmentItems } from '../systems/sect/OfflineStats'
import { MemoryRouter } from 'react-router-dom'
import OfflineReportModal from '../components/common/OfflineReportModal'
import { useSectStore } from '../stores/sectStore'
import { useEventLogStore } from '../stores/eventLogStore'
import { useGameStore } from '../stores/gameStore'

// ─── V2.2 工单 01：闭关报告完整版（击杀/装备/秘境统计） ────────────────────

describe('bumpOfflineAccumulator（统一累加漏斗）', () => {
  const base = {
    resourcesGained: { spiritStone: 0, spiritEnergy: 0, herb: 0, ore: 0 },
    breakthroughs: [],
    itemsCrafted: [],
    taxIncome: 0,
  }

  it('增量累加且负值视为 0', () => {
    let acc = bumpOfflineAccumulator({ ...base } as never, {
      kills: 10,
      equipmentGained: 3,
      dungeonRuns: 1,
      dungeonFloorsCleared: 7,
    })
    acc = bumpOfflineAccumulator(acc, { kills: 5, equipmentSold: -4 })
    expect(acc.kills).toBe(15)
    expect(acc.equipmentGained).toBe(3)
    expect(acc.equipmentSold).toBe(0)
    expect(acc.dungeonRuns).toBe(1)
    expect(acc.dungeonFloorsCleared).toBe(7)
  })

  it('旧档缺字段的 accumulator 照常累加（可选字段兼容）', () => {
    const legacy = { ...base, taxIncome: 5 } as never
    const acc = bumpOfflineAccumulator(legacy, { kills: 3 })
    expect(acc.kills).toBe(3)
    expect(acc.taxIncome).toBe(5)
  })

  it('countEquipmentItems：只计装备、按叠层数量', () => {
    expect(
      countEquipmentItems([
        { type: 'equipment', quantity: 1 },
        { type: 'consumable', quantity: 5 },
        { type: 'equipment', quantity: 3 },
        { type: 'material' },
      ])
    ).toBe(4)
  })
})

describe('sectStore.bumpOfflineStats action', () => {
  beforeEach(() => {
    useSectStore.getState().reset()
    useEventLogStore.getState().reset()
    useGameStore.getState().reset()
  })

  it('多次调用累计、飞升后清零', () => {
    useSectStore.getState().bumpOfflineStats({ kills: 10, dungeonRuns: 2, dungeonFloorsCleared: 9 })
    useSectStore.getState().bumpOfflineStats({ kills: 4, equipmentGained: 2 })
    let acc = useSectStore.getState().sect.offlineAccumulator
    expect(acc.kills).toBe(14)
    expect(acc.dungeonRuns).toBe(2)
    expect(acc.equipmentGained).toBe(2)

    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) => ({ ...c, realm: 8 })),
        // canAscend 要求全建筑 ≥5
        buildings: s.sect.buildings.map((b) => ({ ...b, level: Math.max(5, b.level) })),
      },
    }))
    useSectStore.getState().performAscension()
    acc = useSectStore.getState().sect.offlineAccumulator
    expect(acc.kills).toBe(0)
    expect(acc.dungeonRuns).toBe(0)
    expect(acc.equipmentGained).toBe(0)
  })

  it('手动出售装备计入 equipmentSold', () => {
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        vault: [
          {
            id: 'eq-1',
            item: {
              id: 'sword-1',
              name: '铁剑',
              type: 'equipment' as const,
              quality: 'common' as const,
              slot: 'weapon' as const,
              description: '',
              sellPrice: 10,
              stats: { hp: 1, atk: 1, def: 1, spd: 1, crit: 0, critDmg: 1 },
            },
            quantity: 2,
          },
        ],
      },
    }))
    expect(useSectStore.getState().sellItem(0)).toBe(true)
    expect(useSectStore.getState().sect.offlineAccumulator.equipmentSold).toBe(2)
  })
})

describe('OfflineReportModal 战斗与探索分区', () => {
  const base = {
    offlineSeconds: 3600,
    resourcesGained: { spiritStone: 0, spiritEnergy: 0, herb: 0, ore: 0 },
    breakthroughs: [],
    itemsCrafted: [],
    taxIncome: 0,
  }

  it('有统计时渲染分区', () => {
    render(
      <MemoryRouter>
        <OfflineReportModal
          report={{
            ...base,
            combatStats: { kills: 128, dungeonRuns: 4, dungeonFloorsCleared: 33, equipmentGained: 9, equipmentSold: 5 },
          }}
          onClose={() => {}}
        />
      </MemoryRouter>
    )
    expect(screen.getByText('战斗与探索')).toBeInTheDocument()
    expect(screen.getByText('击败敌人')).toBeInTheDocument()
    expect(screen.getByText('128')).toBeInTheDocument()
    const explore = screen.getByText('秘境探索').parentElement ?? null
    expect(explore?.textContent).toContain('4')
    expect(explore?.textContent).toContain('33')
    const gained = screen.getByText('装备获取').parentElement ?? null
    expect(gained?.textContent).toContain('9')
    const sold = screen.getByText('出售/分解').parentElement ?? null
    expect(sold?.textContent).toContain('5')
  })

  it('全零时不渲染分区', () => {
    render(
      <MemoryRouter>
        <OfflineReportModal
          report={{
            ...base,
            combatStats: { kills: 0, dungeonRuns: 0, dungeonFloorsCleared: 0, equipmentGained: 0, equipmentSold: 0 },
          }}
          onClose={() => {}}
        />
      </MemoryRouter>
    )
    expect(screen.queryByText('战斗与探索')).not.toBeInTheDocument()
  })
})
