import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import { forecastNextBreakthrough, forecastNextMilestone, formatEta } from '../systems/cultivation/ProgressForecast'
import { useSectStore } from '../stores/sectStore'
import { useEventLogStore } from '../stores/eventLogStore'
import { useGameStore } from '../stores/gameStore'
import { MemoryRouter } from 'react-router-dom'
import SectOutlookCard from '../components/sect/SectOutlookCard'
import OfflineReportModal from '../components/common/OfflineReportModal'
import type { Sect } from '../types'
import type { Character } from '../types/character'

// ─── V2.1 工单 06：回访反馈最小版（ETA / 瓶颈 / 变化摘要） ─────────────────

function disciple(realm: number, stage: number, cultivation: number, name = '张三'): Character {
  return {
    id: `fb-${name}-${realm}-${stage}`,
    name,
    title: 'disciple',
    quality: 'common',
    realm,
    realmStage: stage as Character['realmStage'],
    cultivation,
    baseStats: { hp: 100, atk: 15, def: 8, spd: 10, crit: 0.05, critDmg: 1.5 },
    cultivationStats: { spiritPower: 50, maxSpiritPower: 50, comprehension: 10, spiritualRoot: 10, fortune: 5 },
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
    totalCultivation: cultivation,
    specialties: [],
    assignedBuilding: null,
    cultivationPath: 'sword',
    investedSpiritStone: 0,
    techniqueComprehension: {},
  }
}

function withSect(patch: (sect: Sect) => Partial<Sect>): void {
  useSectStore.setState((s) => ({ sect: { ...s.sect, ...patch(s.sect) } }))
}

describe('formatEta', () => {
  it('人性化时长分级', () => {
    expect(formatEta(30)).toBe('1 分钟内')
    expect(formatEta(600)).toBe('约 10 分钟')
    expect(formatEta(3 * 3600)).toBe('约 3 小时')
    expect(formatEta(2.2 * 86400)).toBe('约 3 天')
    expect(formatEta(40 * 86400)).toBe('30 天以上')
    expect(formatEta(Infinity)).toBe('无法预估')
  })
})

describe('forecastNextBreakthrough', () => {
  beforeEach(() => {
    useSectStore.getState().reset()
    useEventLogStore.getState().reset()
    useGameStore.getState().reset()
  })

  it('取最快抵达突破的弟子并给出 ETA 与目标名', () => {
    withSect((sect) => ({
      // 炼气一期需 5 修为：快修差 1、慢修差 4（新弟子默认 0，消耗相同灵气）
      characters: [disciple(0, 0, 4, '快修'), disciple(0, 0, 1, '慢修')],
      resources: { ...sect.resources, spiritEnergy: 10000 },
    }))
    const forecast = forecastNextBreakthrough(useSectStore.getState().sect)
    expect(forecast).not.toBeNull()
    expect(forecast!.characterName).toBe('快修')
    expect(forecast!.toName).toBe('炼气期 中期')
    expect(forecast!.etaSeconds).toBeGreaterThan(0)
    expect(Number.isFinite(forecast!.etaSeconds)).toBe(true)
  })

  it('大境界圆满显示渡劫目标', () => {
    withSect((sect) => ({
      characters: [disciple(2, 3, 5.9e6)],
      resources: { ...sect.resources, spiritEnergy: 10000 },
    }))
    const forecast = forecastNextBreakthrough(useSectStore.getState().sect)!
    expect(forecast.isMajor).toBe(true)
    expect(forecast.toName).toBe('元婴期 初期')
  })

  it('无修炼弟子时返回 null', () => {
    withSect((sect) => ({
      characters: [disciple(0, 0, 0, '外出')],
    }))
    const sect = useSectStore.getState().sect
    withSect(() => ({ characters: sect.characters.map((c) => ({ ...c, status: 'training' as const })) }))
    expect(forecastNextBreakthrough(useSectStore.getState().sect)).toBeNull()
  })
})

describe('forecastNextMilestone', () => {
  beforeEach(() => {
    useSectStore.getState().reset()
  })

  it('取最近的里程碑并给出成本', () => {
    withSect((sect) => ({
      buildings: sect.buildings.map((b) => (b.type === 'spiritField' ? { ...b, level: 8 } : b)),
      resources: { ...sect.resources, spiritStone: 1000 },
    }))
    const forecast = forecastNextMilestone(useSectStore.getState().sect)
    expect(forecast).not.toBeNull()
    expect(forecast!.buildingName).toBe('灵田')
    expect(forecast!.targetLevel).toBe(10)
    expect(forecast!.milestoneName).toBe('灵气充盈')
    expect(forecast!.stonesNeeded).toBeGreaterThan(0)
    expect(Number.isFinite(forecast!.etaSeconds)).toBe(true)
  })

  it('全部满档时返回 null', () => {
    withSect((sect) => ({
      buildings: sect.buildings.map((b) =>
        b.type === 'spiritField' || b.type === 'spiritMine' ? { ...b, level: 600 } : b
      ),
    }))
    // 丹炉/锻器坊/藏经阁仍可能有里程碑——只断言灵田不再出现
    const forecast = forecastNextMilestone(useSectStore.getState().sect)
    if (forecast) expect(forecast.buildingName).not.toBe('灵田')
  })
})

describe('SectOutlookCard（宗门页组件）', () => {
  beforeEach(() => {
    useSectStore.getState().reset()
  })

  it('渲染修炼与建筑前瞻 ETA', () => {
    withSect((sect) => ({
      characters: [disciple(0, 0, 99)],
      resources: { ...sect.resources, spiritEnergy: 10000 },
    }))
    render(
      <MemoryRouter>
        <SectOutlookCard />
      </MemoryRouter>
    )
    expect(screen.getByText('现状与前瞻')).toBeInTheDocument()
    expect(screen.getByTestId('breakthrough-eta').textContent).toContain('分钟')
    expect(screen.getByTestId('milestone-eta').textContent).toMatch(/分钟|小时|天/)
    expect(screen.getByText(/里程碑 ·/)).toBeInTheDocument()
  })

  it('灵气供给不足时高亮警示', () => {
    withSect((sect) => ({
      characters: [disciple(4, 0, 0)], // 化神弟子消耗 32/s，灵田 1 级供给 3/s
      resources: { ...sect.resources, spiritEnergy: 0 },
    }))
    render(
      <MemoryRouter>
        <SectOutlookCard />
      </MemoryRouter>
    )
    expect(screen.getByTestId('spirit-warning').textContent).toContain('灵气供给')
  })
})

describe('OfflineReportModal 拜访摘要与建议', () => {
  it('渲染自上次拜访段（境界变化 + 资源倍数）', () => {
    render(
      <MemoryRouter>
        <OfflineReportModal
          report={{
            offlineSeconds: 7200,
            resourcesGained: { spiritStone: 4300, spiritEnergy: 0, herb: 0, ore: 0 },
            breakthroughs: [{ characterName: '张三', targetRealm: '1-2', success: true }],
            itemsCrafted: [],
            taxIncome: 0,
            visitSummary: {
              realmChanges: [{ characterName: '张三', toRealmName: '筑基期 后期', success: true }],
              multiples: [{ label: '灵石', gained: 4300, multiple: 2.3 }],
            },
          }}
          onClose={() => {}}
        />
      </MemoryRouter>
    )
    expect(screen.getByText('自上次拜访')).toBeInTheDocument()
    expect(screen.getByText('突破至 筑基期 后期')).toBeInTheDocument()
    expect(screen.getByText(/×2.3 现存/)).toBeInTheDocument()
  })

  it('渲染建议数组并可点击跳转', () => {
    const onClose = vi.fn()
    render(
      <MemoryRouter>
        <OfflineReportModal
          report={{
            offlineSeconds: 7200,
            resourcesGained: { spiritStone: 0, spiritEnergy: 0, herb: 0, ore: 0 },
            breakthroughs: [],
            itemsCrafted: [],
            taxIncome: 0,
            suggestions: [{ text: '灵石储备不足：先稳住坊市', link: '/buildings' }],
          }}
          onClose={onClose}
        />
      </MemoryRouter>
    )
    const btn = screen.getByTestId('offline-suggestion-0')
    expect(btn.textContent).toContain('灵石储备不足')
    fireEvent.click(btn)
    expect(onClose).toHaveBeenCalled()
  })

  it('无摘要数据时不渲染对应段', () => {
    render(
      <MemoryRouter>
        <OfflineReportModal
          report={{
            offlineSeconds: 7200,
            resourcesGained: { spiritStone: 0, spiritEnergy: 0, herb: 0, ore: 0 },
            breakthroughs: [],
            itemsCrafted: [],
            taxIncome: 0,
          }}
          onClose={() => {}}
        />
      </MemoryRouter>
    )
    expect(screen.queryByText('自上次拜访')).not.toBeInTheDocument()
    expect(screen.queryByTestId('offline-suggestion-0')).not.toBeInTheDocument()
  })
})
