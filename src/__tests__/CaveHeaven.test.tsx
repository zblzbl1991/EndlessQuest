import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  CAVE_HEAVENS,
  caveHeavenSlotCount,
  unlockedCaveHeavens,
  calcAptitude,
  aggregateCaveHeavenEffects,
} from '../data/caveHeavens'
import { useSectStore } from '../stores/sectStore'
import { useEventLogStore } from '../stores/eventLogStore'
import { MemoryRouter } from 'react-router-dom'
import CaveHeavenPanel from '../components/sect/CaveHeavenPanel'
import type { Character } from '../types/character'

// ─── V2.2 工单 04：洞天福地派驻配置层 ──────────────────────────────────────

function disciple(realm: number, quality: Character['quality'] = 'spirit'): Character {
  return {
    id: `cave-${realm}-${quality}`,
    name: `弟子${realm}${quality}`,
    title: 'disciple',
    quality,
    realm,
    realmStage: 3 as Character['realmStage'],
    cultivation: 0,
    baseStats: { hp: 100, atk: 15, def: 8, spd: 10, crit: 0.05, critDmg: 1.5 },
    cultivationStats: { spiritPower: 50, maxSpiritPower: 50, comprehension: 20, spiritualRoot: 20, fortune: 5 },
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

describe('洞天解锁与资质', () => {
  it('槽位：化神 1 → 渡劫 5，封顶 5', () => {
    expect(caveHeavenSlotCount(3)).toBe(0)
    expect(caveHeavenSlotCount(4)).toBe(1)
    expect(caveHeavenSlotCount(6)).toBe(3)
    expect(caveHeavenSlotCount(8)).toBe(5)
    expect(caveHeavenSlotCount(12)).toBe(5)
  })

  it('逐洞天解锁：真仙全部可用', () => {
    expect(unlockedCaveHeavens(4)).toHaveLength(1)
    expect(unlockedCaveHeavens(8)).toHaveLength(5)
  })

  it('资质归一：高品质高灵根更高', () => {
    const high = calcAptitude(disciple(8, 'chaos'))
    const low = calcAptitude(disciple(8, 'common'))
    expect(high).toBeGreaterThan(low)
    expect(high).toBeLessThanOrEqual(1)
    expect(low).toBeGreaterThan(0)
  })
})

describe('被动聚合', () => {
  const characters = [disciple(8, 'divine')]

  it('派驻灵泉洞：修炼加成按资质', () => {
    const result = aggregateCaveHeavenEffects(8, { springCave: characters[0].id }, characters)
    expect(result.cultivationMult).toBeGreaterThan(0)
    expect(result.cultivationMult).toBeLessThanOrEqual(0.06) // 满资质封顶 perAptitude
  })

  it('撤出（空派驻）即失效', () => {
    const result = aggregateCaveHeavenEffects(8, {}, characters)
    expect(result.cultivationMult).toBe(0)
  })

  it('未解锁的洞天不生效（锁定槽派驻无效）', () => {
    // bestRealm 4 只解锁 1 槽（灵泉洞）；派驻悟道崖（需渡劫）不生效
    const result = aggregateCaveHeavenEffects(4, { daoCliff: characters[0].id }, characters)
    expect(result.breakthroughBonus).toBe(0)
  })

  it('派驻弟子非 idle 状态不生效', () => {
    const busy = { ...characters[0], status: 'adventuring' as const }
    const result = aggregateCaveHeavenEffects(8, { springCave: busy.id }, [busy])
    expect(result.cultivationMult).toBe(0)
  })
})

describe('store action 与 UI', () => {
  beforeEach(() => {
    useSectStore.getState().reset()
    useEventLogStore.getState().reset()
  })

  it('assignCaveHeaven：解锁验证 + 派驻/撤出 + 事件', () => {
    useSectStore.setState((s) => ({
      sect: { ...s.sect, characters: [disciple(8, 'divine')] },
    }))
    const store = useSectStore.getState()
    // 未解锁
    expect(store.assignCaveHeaven('springCave', sect8CharId(store, 'cave-4-divine')).success).toBe(true) // 化神可解锁灵泉洞
    // 撤出
    expect(useSectStore.getState().assignCaveHeaven('springCave', null).success).toBe(true)
    expect(useSectStore.getState().sect.caveHeavenAssignments).toEqual({})
    // 派驻 + 事件
    expect(store.assignCaveHeaven('springCave', sect8CharId(store, 'cave-4-divine')).success).toBe(true)
    expect(useEventLogStore.getState().events.some((e) => e.message.includes('灵泉洞'))).toBe(true)
  })

  it('面板渲染洞天列表与派驻下拉', () => {
    useSectStore.setState((s) => ({
      sect: { ...s.sect, characters: [disciple(8, 'divine')] },
    }))
    render(
      <MemoryRouter>
        <CaveHeavenPanel />
      </MemoryRouter>
    )
    expect(screen.getByText('洞天福地')).toBeInTheDocument()
    expect(screen.getByText('灵泉洞')).toBeInTheDocument()
    // 渡劫期宗门 5 洞全解锁
    expect(screen.getAllByRole('combobox')).toHaveLength(5)
    fireEvent.change(screen.getByLabelText('灵泉洞派驻'), {
      target: { value: useSectStore.getState().sect.characters[0].id },
    })
    expect(screen.getByTestId('cave-bonus-springCave').textContent).toContain('资质')
  })
})

/** 取 store 中目标弟子的实际 id（夹具 id 带 realm/quality）。 */
function sect8CharId(store: ReturnType<typeof useSectStore.getState>, prefix: string): string {
  return store.sect.characters.find((c) => c.id.startsWith(prefix))?.id ?? ''
}
