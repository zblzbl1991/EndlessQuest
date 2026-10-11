import { describe, it, expect } from 'vitest'
import {
  EQUIPMENT_AFFIXES,
  EQUIPMENT_AFFIX_BY_ID,
  rollEquipmentAffixes,
  affixCountByTier,
  affixValueSlot,
  aggregateEquipmentAffixes,
  spiritLevelFromExp,
  spiritLevelBonus,
  tierFromQuality,
  EQUIPMENT_TIER_NAMES,
} from '../data/equipmentAffixes'
import { getEffectiveStats } from '../systems/equipment/EquipmentEngine'
import type { Equipment } from '../types/item'

// ─── V2.2 工单 03：装备机制词条（30+ 池 / 阶位映射 / 器灵 / 分解口径） ──────

function makeEquipment(overrides: Partial<Equipment> = {}): Equipment {
  return {
    id: 'eq-test',
    name: '测试剑',
    type: 'equipment',
    quality: 'divine',
    slot: 'weapon',
    description: '',
    sellPrice: 100,
    stats: { hp: 10, atk: 100, def: 10, spd: 5, crit: 0.05, critDmg: 1.5 },
    enhanceLevel: 0,
    refinementStats: [],
    setId: null,
    ...overrides,
  }
}

describe('词缀池数据完整性（30+ 条）', () => {
  it('至少 30 条、id 唯一、数值表单调不减、效果种类覆盖 12 类', () => {
    expect(EQUIPMENT_AFFIXES.length).toBeGreaterThanOrEqual(30)
    const ids = new Set<string>()
    const kinds = new Set<string>()
    for (const affix of EQUIPMENT_AFFIXES) {
      expect(ids.has(affix.id)).toBe(false)
      ids.add(affix.id)
      kinds.add(affix.effect.kind)
      expect(affix.values[2]).toBeGreaterThanOrEqual(affix.values[1])
      expect(affix.values[1]).toBeGreaterThanOrEqual(affix.values[0])
    }
    expect(kinds.size).toBeGreaterThanOrEqual(12)
    expect(EQUIPMENT_AFFIX_BY_ID.size).toBe(EQUIPMENT_AFFIXES.length)
  })

  it('条数-阶位映射：1/1/2/2/3/3/4/5/6', () => {
    for (let tier = 1; tier <= 9; tier++) {
      expect(affixCountByTier(tier)).toBe([0, 1, 1, 2, 2, 3, 3, 4, 5, 6][tier])
    }
  })

  it('roll：条数正确、同 id 不重复', () => {
    for (let attempt = 0; attempt < 10; attempt++) {
      const rolled = rollEquipmentAffixes(9, () => (attempt * 0.13) % 1)
      expect(rolled).toHaveLength(6)
      expect(new Set(rolled.map((r) => r.id)).size).toBe(6)
    }
  })

  it('品质 → 缺省阶位折算', () => {
    expect(tierFromQuality('common')).toBe(1)
    expect(tierFromQuality('spirit')).toBe(3)
    expect(tierFromQuality('immortal')).toBe(5)
    expect(tierFromQuality('divine')).toBe(7)
    expect(tierFromQuality('chaos')).toBe(9)
    expect(EQUIPMENT_TIER_NAMES[9]).toBe('鸿蒙')
  })
})

describe('词条聚合（真实生效口径）', () => {
  it('百分比属性 + 机制值聚合', () => {
    const eq1 = makeEquipment({ id: 'a', affixes: [{ id: 'aff_atk', tier: 7 }] }) // atkPct 0.18
    const eq2 = makeEquipment({
      id: 'b',
      affixes: [
        { id: 'aff_lifesteal', tier: 7 },
        { id: 'aff_thorns', tier: 4 },
      ],
    })
    const agg = aggregateEquipmentAffixes([eq1, eq2])
    expect(agg.atkPct).toBeCloseTo(0.18, 10)
    expect(agg.lifesteal).toBeCloseTo(0.16, 10)
    expect(agg.thorns).toBeCloseTo(0.14, 10) // tier4 → aff_thorns values[1]
  })

  it('修炼/吞灵/回流/熟练度聚合', () => {
    const eq = makeEquipment({
      affixes: [
        { id: 'aff_cultivation', tier: 7 },
        { id: 'aff_devour', tier: 7 },
        { id: 'aff_spiritflow', tier: 7 },
        { id: 'aff_mastery', tier: 7 },
      ],
    })
    const agg = aggregateEquipmentAffixes([eq])
    expect(agg.cultivationMult).toBeCloseTo(0.22, 10)
    expect(agg.devourOnKill).toBeCloseTo(10, 10)
    expect(agg.spiritFlowOnVictory).toBeCloseTo(12, 10)
    expect(agg.masteryMult).toBeCloseTo(0.35, 10)
  })

  it('数值档随词条自身 tier 取（affixValueSlot）', () => {
    expect(affixValueSlot(1)).toBe(0)
    expect(affixValueSlot(5)).toBe(1)
    expect(affixValueSlot(9)).toBe(2)
  })
})

describe('器灵成长', () => {
  it('等级曲线 floor(sqrt(exp/25)) 封顶 10 级', () => {
    expect(spiritLevelFromExp(0)).toBe(0)
    expect(spiritLevelFromExp(25)).toBe(1)
    expect(spiritLevelFromExp(100)).toBe(2)
    expect(spiritLevelFromExp(10000)).toBe(10)
  })

  it('器灵加成进 getEffectiveStats（每级 +2% flat 属性）', () => {
    const plain = getEffectiveStats(makeEquipment())
    const withSpirit = getEffectiveStats(makeEquipment({ spiritExp: 100 })) // 器灵 2 级 → ×1.04
    expect(withSpirit.atk / plain.atk).toBeCloseTo(1.04, 6)
    expect(withSpirit.crit).toBeCloseTo(plain.crit, 10) // 暴击不受器灵 flat 乘区
  })
})
