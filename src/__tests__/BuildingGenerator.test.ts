import { describe, it, expect, beforeEach } from 'vitest'
import {
  BUILDING_DEFS,
  GENERATOR_SPECS,
  getBatchUpgradeInfo,
  getBuildingMaxLevel,
  getForgeMilestoneSuccessBonus,
  getMilestonesReached,
  getNextMilestone,
  getScriptureCultivationMult,
  getSectMilestoneAlchemyThroughput,
  getSectMilestoneCultivationMult,
  getSectMilestoneRateMult,
  getSpiritFieldHerbRate,
  getSpiritFieldRate,
  getSpiritMineOreRate,
  getSpiritMineRate,
  isCapabilityUnlocked,
} from '../data/buildings'
import { getForgeBuff } from '../systems/economy/BuildingEffects'
import { useSectStore } from '../stores/sectStore'
import { useEventLogStore } from '../stores/eventLogStore'
import type { Building } from '../types/sect'

// ─── V2.1 工单 03：建筑 Generator 化 + Milestone + 批量购买 ───────────────

const building = (type: Building['type'], level: number): Building => ({
  type,
  level,
  count: 1,
  unlocked: true,
  productionQueue: { recipeId: null, progress: 0 },
})

describe('Generator 成本曲线（设计稿 §6.1）', () => {
  it('指数成本：灵矿 1→2 级 = 200×1.17', () => {
    const def = BUILDING_DEFS.find((d) => d.type === 'spiritMine')!
    expect(def.upgradeCost(1).spiritStone).toBeCloseTo(200 * 1.17, 6)
    expect(def.upgradeCost(2).spiritStone).toBeCloseTo(200 * 1.17 ** 2, 6)
    expect(def.upgradeCost(1).herb).toBeUndefined()
    expect(def.upgradeCost(1).ore).toBeUndefined()
  })

  it('等级无上限：5000 级成本仍有限且封顶 1e300', () => {
    for (const type of Object.keys(GENERATOR_SPECS) as (keyof typeof GENERATOR_SPECS)[]) {
      const def = BUILDING_DEFS.find((d) => d.type === type)!
      expect(def.maxLevel).toBe(Number.POSITIVE_INFINITY)
      expect(Number.isFinite(def.upgradeCost(5000).spiritStone)).toBe(true)
      expect(def.upgradeCost(5000).spiritStone).toBeLessThanOrEqual(1e300)
    }
  })

  it('服务型建筑保留多项式 + 材料', () => {
    const market = BUILDING_DEFS.find((d) => d.type === 'market')!
    expect(market.upgradeCost(1).spiritStone).toBe(Math.round(200 * 2 ** 1.7))
    expect(market.upgradeCost(6).herb).toBeGreaterThan(0)
  })

  it('主殿上限随境界放宽：炼气 2 → 筑基 4 → 渡劫 18；Generator 无上限', () => {
    expect(getBuildingMaxLevel('mainHall', 0)).toBe(2)
    expect(getBuildingMaxLevel('mainHall', 1)).toBe(4)
    expect(getBuildingMaxLevel('mainHall', 8)).toBe(18)
    expect(getBuildingMaxLevel('spiritMine')).toBe(Number.POSITIVE_INFINITY)
    expect(getBuildingMaxLevel('market')).toBe(8)
  })
})

describe('Generator 产出曲线（1 级锚定旧值）', () => {
  it('灵气/灵草/灵石/矿材 1 级与旧线性曲线一致，之后指数增长', () => {
    expect(getSpiritFieldRate(1)).toBe(3)
    expect(getSpiritFieldRate(2)).toBeCloseTo(3.3, 10)
    expect(getSpiritFieldHerbRate(1)).toBeCloseTo(0.1, 10)
    expect(getSpiritFieldHerbRate(11)).toBeCloseTo(0.1 * 1.08 ** 10, 10)
    expect(getSpiritMineRate(1)).toBeCloseTo(0.5, 10)
    expect(getSpiritMineRate(2)).toBeCloseTo(0.55, 10)
    expect(getSpiritMineOreRate(1)).toBeCloseTo(0.05, 10)
  })
})

describe('Milestone 真实效果（四类代表性断言）', () => {
  it('灵田 rateMult：Lv10 灵气×2，Lv50 累计×6，Lv100 石/草/材 +50%', () => {
    const field10 = [building('spiritField', 10)]
    expect(getSectMilestoneRateMult(field10, 'spiritEnergy')).toBe(2)
    const field50 = [building('spiritField', 50)]
    expect(getSectMilestoneRateMult(field50, 'spiritEnergy')).toBe(6)
    const field100 = [building('spiritField', 100)]
    expect(getSectMilestoneRateMult(field100, 'spiritStone')).toBeCloseTo(1.5, 10)
    expect(getSectMilestoneRateMult(field100, 'herb')).toBeCloseTo(1.5, 10)
    expect(getSectMilestoneRateMult(field100, 'ore')).toBeCloseTo(1.5, 10)
  })

  it('灵矿 rateMult：Lv10 灵石×2、Lv100 再×3（累计 ×6）；Lv25 解锁自动出售', () => {
    const mine100 = [building('spiritMine', 100)]
    expect(getSectMilestoneRateMult(mine100, 'spiritStone')).toBe(6)
    expect(getSectMilestoneRateMult(mine100, 'ore')).toBe(3)
    expect(isCapabilityUnlocked([building('spiritMine', 25)], 'autoSellJunk')).toBe(true)
    expect(isCapabilityUnlocked([building('spiritMine', 24)], 'autoSellJunk')).toBe(false)
  })

  it('藏经阁：基础修炼效率 +2%/级（软上限 +200%），Lv100 每已学功法 +2%', () => {
    expect(getScriptureCultivationMult(0)).toBe(1)
    expect(getScriptureCultivationMult(1)).toBeCloseTo(1.02, 10)
    expect(getScriptureCultivationMult(50)).toBeCloseTo(2, 10)
    expect(getScriptureCultivationMult(200)).toBe(3)
    const halls = [building('scriptureHall', 100)]
    expect(getSectMilestoneCultivationMult(halls, 10)).toBeCloseTo(1.2, 10)
    expect(getSectMilestoneCultivationMult(halls, 0)).toBe(1)
    expect(isCapabilityUnlocked(halls, 'insightBoost')).toBe(true)
  })

  it('灵田 Lv250 灵压同频：每级修炼 +1%', () => {
    expect(getSectMilestoneCultivationMult([building('spiritField', 249)], 0)).toBe(1)
    expect(getSectMilestoneCultivationMult([building('spiritField', 250)], 0)).toBeCloseTo(1.01, 10)
    expect(getSectMilestoneCultivationMult([building('spiritField', 252)], 0)).toBeCloseTo(1.03, 10)
  })

  it('丹炉吞吐与锻器成功率', () => {
    expect(getSectMilestoneAlchemyThroughput([building('alchemyFurnace', 10)])).toBeCloseTo(1.5, 10)
    expect(getSectMilestoneAlchemyThroughput([building('alchemyFurnace', 50)])).toBeCloseTo(3, 10)
    expect(getForgeMilestoneSuccessBonus(9)).toBe(0)
    expect(getForgeMilestoneSuccessBonus(10)).toBeCloseTo(0.15, 10)
    expect(getForgeBuff(10).successBonus).toBeCloseTo(1 + 0.15, 10)
  })

  it('里程碑预告：getMilestonesReached / getNextMilestone', () => {
    expect(getMilestonesReached('spiritField', 9)).toHaveLength(0)
    expect(getNextMilestone('spiritField', 9)?.level).toBe(10)
    expect(getNextMilestone('spiritField', 600)).toBeNull()
  })
})

describe('批量购买（×1/×10/×100/MAX）', () => {
  it('×10 闭式解与逐级求和一致', () => {
    const info = getBatchUpgradeInfo('spiritMine', 1, 10, Number.POSITIVE_INFINITY)
    let manual = 0
    for (let i = 0; i < 10; i++) manual += 200 * 1.17 ** (1 + i)
    expect(info.levels).toBe(10)
    expect(info.totalCost).toBeCloseTo(manual, 0)
  })

  it('MAX：受灵石约束，多买一级即超出', () => {
    const stones = 10000
    const info = getBatchUpgradeInfo('spiritMine', 1, Number.POSITIVE_INFINITY, stones)
    expect(info.levels).toBeGreaterThanOrEqual(12)
    expect(info.totalCost).toBeLessThanOrEqual(stones)
    const nextLevel = 1 + info.levels
    expect(info.totalCost + 200 * 1.17 ** nextLevel).toBeGreaterThan(stones)
  })

  it('灵石不足一级时 levels = 0', () => {
    expect(getBatchUpgradeInfo('spiritMine', 1, 10, 100).levels).toBe(0)
    expect(getBatchUpgradeInfo('spiritMine', 1, 'max' as never, 100).levels).toBe(0)
  })

  it('服务型建筑受等级上限约束', () => {
    const info = getBatchUpgradeInfo('recruitmentPavilion', 5, 10, Number.POSITIVE_INFINITY)
    expect(info.levels).toBeLessThanOrEqual(1)
  })
})

describe('upgradeBuildingBatch（store action）', () => {
  beforeEach(() => {
    useSectStore.getState().reset()
    useEventLogStore.getState().reset()
  })

  it('连升生效：等级、灵石、统计一致，里程碑事件入日志', () => {
    useSectStore.setState((s) => ({
      sect: { ...s.sect, resources: { ...s.sect.resources, spiritStone: 6000 } },
    }))
    const before = useSectStore.getState().sect
    const result = useSectStore.getState().upgradeBuildingBatch('spiritMine', 10)
    expect(result.success).toBe(true)
    expect(result.levels).toBe(10)

    const after = useSectStore.getState().sect
    const mine = after.buildings.find((b) => b.type === 'spiritMine')!
    expect(mine.level).toBe(11)
    expect(before.resources.spiritStone - after.resources.spiritStone).toBe(5240) // 234×(1.17^10−1)/0.17
    expect(after.stats.totalBuildingUpgrades).toBe(10)

    const events = useEventLogStore.getState().events
    expect(events.some((e) => e.message.includes('里程碑达成') && e.message.includes('矿脉旺盛'))).toBe(true)
  })

  it('灵石不足时失败且状态不变', () => {
    useSectStore.setState((s) => ({
      sect: { ...s.sect, resources: { ...s.sect.resources, spiritStone: 50 } },
    }))
    const result = useSectStore.getState().upgradeBuildingBatch('spiritMine', 100)
    expect(result.success).toBe(false)
    expect(useSectStore.getState().sect.buildings.find((b) => b.type === 'spiritMine')!.level).toBe(1)
  })
})
