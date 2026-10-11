import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AUTOMATION_ITEMS, getAutomationState, isAutomationUnlocked } from '../data/automationUnlocks'
import { useSectStore } from '../stores/sectStore'
import { useEventLogStore } from '../stores/eventLogStore'
import { useGameStore } from '../stores/gameStore'
import { getCultivationNeeded, getBreakthroughResourceCost } from '../data/realms'
import { generateEquipment } from '../systems/item/ItemGenerator'
import type { Character } from '../types/character'
import type { ItemStack } from '../types/item'
import AutomationPanel from '../components/sect/AutomationPanel'

// ─── V2.1 工单 05：自动化节奏修正（解锁表 + gating + 手动突破入口） ─────────

function disciple(realm: number, stage = 0, cultivation = 0): Character {
  return {
    id: `d${realm}-${stage}-${Math.random().toString(36).slice(2, 7)}`,
    name: `弟子${realm}${stage}`,
    title: 'disciple',
    quality: 'common',
    realm,
    realmStage: stage as Character['realmStage'],
    cultivation,
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
    totalCultivation: cultivation,
    specialties: [],
    assignedBuilding: null,
    cultivationPath: 'sword',
    investedSpiritStone: 0,
    techniqueComprehension: {},
  }
}

describe('自动化解锁表', () => {
  it('境界类解锁矩阵', () => {
    const sect = (bestRealm: number) => ({ characters: [disciple(bestRealm)] }) as never
    expect(isAutomationUnlocked(sect(0), 'autoEquip')).toBe(false)
    expect(isAutomationUnlocked(sect(1), 'autoEquip')).toBe(true)
    expect(isAutomationUnlocked(sect(2), 'autoMinorBreakthrough')).toBe(false)
    expect(isAutomationUnlocked(sect(3), 'autoMinorBreakthrough')).toBe(true)
    expect(isAutomationUnlocked(sect(3), 'autoMajorBreakthrough')).toBe(false)
    expect(isAutomationUnlocked(sect(4), 'autoMajorBreakthrough')).toBe(true)
  })

  it('里程碑能力类与飞升树节点类解锁', () => {
    const b = (type: string, level: number) => ({
      type,
      level,
      count: 1,
      unlocked: true,
      productionQueue: { recipeId: null, progress: 0 },
    })
    const withMine25 = { characters: [disciple(0)], buildings: [b('spiritMine', 25)] } as never
    expect(isAutomationUnlocked(withMine25, 'autoSellJunk')).toBe(true)
    const noNode = { characters: [disciple(0)], buildings: [], legacyTree: {} } as never
    expect(isAutomationUnlocked(noNode, 'autoAscend')).toBe(false)
    const withNode = { ...noNode, legacyTree: { heavenPivot: 1 } } as never
    expect(isAutomationUnlocked(withNode, 'autoAscend')).toBe(true)
  })

  it('面板三态：locked / available / on', () => {
    const lockedSect = { characters: [disciple(0)], buildings: [], legacyTree: {} } as never
    expect(getAutomationState(lockedSect, 'autoMinorBreakthrough')).toBe('locked')
    const baseAutomation = { autoBreakthrough: false, autoMajorBreakthrough: false, autoAscend: false }
    const availableSect = {
      characters: [disciple(3)],
      buildings: [],
      legacyTree: {},
      automationSettings: baseAutomation,
    } as never
    expect(getAutomationState(availableSect, 'autoMinorBreakthrough')).toBe('available')
    const onSect = {
      ...availableSect,
      automationSettings: { ...baseAutomation, autoBreakthrough: true },
    } as never
    expect(getAutomationState(onSect, 'autoMinorBreakthrough')).toBe('on')
    // 常驻自动化解锁即"生效中"
    expect(getAutomationState(availableSect, 'autoRecruit')).toBe('on')
  })
})

describe('tick 突破 gating', () => {
  beforeEach(() => {
    useSectStore.getState().reset()
    useEventLogStore.getState().reset()
    useGameStore.getState().reset()
  })

  const majorCost = getBreakthroughResourceCost(2, 3)

  it('bestRealm < 元婴：即使旧档 autoBreakthrough=true 也不自动突破', () => {
    const char = disciple(2, 2, getCultivationNeeded(2, 2) + 10)
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        characters: [char],
        resources: { ...s.sect.resources, spiritStone: majorCost.spiritStone + 1e6, herb: 500, spiritEnergy: 5000 },
        automationSettings: { ...s.sect.automationSettings, autoBreakthrough: true },
      },
    }))
    useSectStore.getState().tickAll(1)
    const after = useSectStore.getState().sect.characters[0]
    expect(after.realmStage).toBe(2)
  })

  it('bestRealm ≥ 元婴：小境界自动突破生效', () => {
    // 小境界突破 90% 成功率，mock random 固定成功（0.5 落在成功区）
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    afterEach(() => vi.restoreAllMocks())
    const char = disciple(2, 2, getCultivationNeeded(2, 2) + 10)
    const elder = disciple(3)
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        characters: [char, elder],
        resources: { ...s.sect.resources, spiritStone: majorCost.spiritStone + 1e6, herb: 500, spiritEnergy: 5000 },
        automationSettings: { ...s.sect.automationSettings, autoBreakthrough: true },
      },
    }))
    useSectStore.getState().tickAll(1)
    const after = useSectStore.getState().sect.characters[0]
    expect(after.realmStage).toBe(3)
  })

  it('大境界突破需化神 + autoMajorBreakthrough', () => {
    // 天劫 roll 固定成功（0.5 > 元婴劫失败率 ~0.11）
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    afterEach(() => vi.restoreAllMocks())
    const char = disciple(2, 3, getCultivationNeeded(2, 3) + 10)
    const elder = disciple(4)
    const state = (autoMajor: boolean) => ({
      sect: {
        ...s(),
        characters: [char, elder],
        resources: { ...s().resources, spiritStone: majorCost.spiritStone + 1e6, herb: 500, spiritEnergy: 5000 },
        automationSettings: {
          ...s().automationSettings,
          autoBreakthrough: true,
          autoMajorBreakthrough: autoMajor,
        },
      },
    })
    const s = () => useSectStore.getState().sect
    useSectStore.setState(state(false) as never)
    useSectStore.getState().tickAll(1)
    expect(useSectStore.getState().sect.characters[0].realm).toBe(2)

    // 重置修为（上一轮可能已突破，重建夹具）
    const char2 = disciple(2, 3, getCultivationNeeded(2, 3) + 10)
    useSectStore.setState((st) => ({
      sect: { ...st.sect, characters: [char2, disciple(4)] },
    }))
    useSectStore.setState((st) => ({
      sect: {
        ...st.sect,
        resources: { ...st.sect.resources, spiritStone: majorCost.spiritStone + 1e6, herb: 500 },
        automationSettings: { ...st.sect.automationSettings, autoMajorBreakthrough: true },
      },
    }))
    useSectStore.getState().tickAll(1)
    expect(useSectStore.getState().sect.characters[0].realm).toBe(3)
  })
})

describe('手动突破入口（attemptBreakthrough）', () => {
  beforeEach(() => {
    useSectStore.getState().reset()
    useEventLogStore.getState().reset()
  })

  it('资源齐备时突破成功并扣费', () => {
    const cost = getBreakthroughResourceCost(0, 0)
    const char = disciple(0, 0, getCultivationNeeded(0, 0) + 10)
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        characters: [char],
        resources: { ...s.sect.resources, spiritStone: cost.spiritStone + 1000, herb: 100 },
      },
    }))
    const result = useSectStore.getState().attemptBreakthrough(char.id)
    expect(result.success).toBe(true)
    expect(useSectStore.getState().sect.characters[0].realmStage).toBe(1)
  })

  it('条件不足时失败并给出原因', () => {
    const char = disciple(0, 0, 1)
    useSectStore.setState((s) => ({ sect: { ...s.sect, characters: [char] } }))
    const result = useSectStore.getState().attemptBreakthrough(char.id)
    expect(result.success).toBe(false)
    expect(result.reason.length).toBeGreaterThan(0)
  })
})

describe('自动出售凡品（灵矿 Lv25）', () => {
  beforeEach(() => {
    useSectStore.getState().reset()
    useEventLogStore.getState().reset()
  })

  it('仓库接近满位时清理凡品并入账灵石', () => {
    const junk = generateEquipment('weapon', 'common')
    const stacks: ItemStack[] = Array.from({ length: 45 }, (_, i) => ({
      id: `junk-${i}`,
      item: { ...junk, id: `junk-item-${i}` },
      quantity: 1,
    }))
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        buildings: s.sect.buildings.map((b) => (b.type === 'spiritMine' ? { ...b, level: 25 } : b)),
        vault: stacks,
      },
    }))
    const before = useSectStore.getState().sect
    useSectStore.getState().tickAll(1)
    const after = useSectStore.getState().sect
    expect(after.vault.length).toBeLessThan(before.vault.length)
    expect(after.stats.totalSpiritStoneEarned).toBeGreaterThan(0)
  })
})

describe('自动化面板（SectPage 组件）', () => {
  beforeEach(() => {
    useSectStore.getState().reset()
  })

  it('渲染分组与三态，开关可切换', () => {
    useSectStore.setState((s) => ({
      sect: { ...s.sect, characters: [disciple(3)] },
    }))
    render(<AutomationPanel />)
    expect(screen.getByText('修炼')).toBeInTheDocument()
    const minorItem = screen.getByText('小境界自动突破').closest('div')!
    expect(minorItem.textContent).toContain('未开启') // 元婴解锁但 autoBreakthrough 默认 false
    fireEvent.click(screen.getByRole('button', { name: '小境界自动突破开关' }))
    expect(screen.getByRole('button', { name: '小境界自动突破开关' }).textContent).toBe('关')
  })
})
