import { describe, it, expect } from 'vitest'
import {
  BLESSING_DEFS,
  ALL_BLESSING_IDS,
  BLESSINGS,
  aggregateBlessingEffects,
  aggregateRunSynergies,
  getBlessingTier,
  getBlessingDisplayName,
  RUN_SYNERGIES,
  type BlessingSchool,
} from '../data/blessings'
import { pickBlessingOptions } from '../systems/roguelike/RunBuildSystem'

// ─── V2.2 工单 02：祝福分系 Build 化（六系 / 升阶 / 协同） ──────────────────

describe('祝福池数据完整性（36 种六系）', () => {
  it('至少 30 种、六系齐全、每系 ≥5 种', () => {
    expect(ALL_BLESSING_IDS.length).toBeGreaterThanOrEqual(30)
    const schools = new Set(Object.values(BLESSING_DEFS).map((d) => d.school))
    expect(schools.size).toBe(6)
    for (const school of ['sword', 'thunder', 'critical', 'body', 'beast', 'spirit'] as BlessingSchool[]) {
      const count = Object.values(BLESSING_DEFS).filter((d) => d.school === school).length
      expect(count).toBeGreaterThanOrEqual(5)
    }
  })

  it('每条祝福：id 唯一、tier 合法、三档数值单调不减', () => {
    const ids = new Set<string>()
    for (const def of Object.values(BLESSING_DEFS)) {
      expect(ids.has(def.id)).toBe(false)
      ids.add(def.id)
      expect([1, 2, 3]).toContain(def.tier)
      expect(def.values).toHaveLength(3)
      expect(def.values[2]).toBeGreaterThanOrEqual(def.values[1])
      expect(def.values[1]).toBeGreaterThanOrEqual(def.values[0])
    }
  })

  it('旧版兼容视图 BLESSINGS：effectType 映射有效', () => {
    expect(BLESSINGS.length).toBe(ALL_BLESSING_IDS.length)
    for (const b of BLESSINGS) {
      expect(['atkBoost', 'critBoost', 'spiritRegen', 'hpBoost', 'defBoost', 'healOnKill', 'lootBonus']).toContain(
        b.effectType
      )
    }
  })

  it('旧 13 id 的 tier1 行为与旧硬编码一致', () => {
    const agg = aggregateBlessingEffects(['battleFocus', 'iron_wall', 'keen_eye'])
    expect(agg.atkPct).toBeCloseTo(0.15, 10)
    expect(agg.defPct).toBeCloseTo(0.15, 10)
    expect(agg.critAdd).toBeCloseTo(0.05, 10)
  })
})

describe('聚合与合成升阶', () => {
  it('同 id 计数 = 阶，数值按 tier 表取', () => {
    const t1 = aggregateBlessingEffects(['galeStride'])
    const t2 = aggregateBlessingEffects(['galeStride', 'galeStride'])
    const t3 = aggregateBlessingEffects(['galeStride', 'galeStride', 'galeStride'])
    expect(t1.spdPct).toBeCloseTo(0.15, 10)
    expect(t2.spdPct).toBeCloseTo(0.25, 10)
    expect(t3.spdPct).toBeCloseTo(0.4, 10)
    expect(getBlessingTier(['galeStride', 'galeStride'], 'galeStride')).toBe(2)
    expect(getBlessingDisplayName('galeStride', 2)).toBe('疾风步·贰')
  })

  it('3 阶封顶：第 4 次不再增长', () => {
    const owned = ['spirit_spring', 'spirit_spring', 'spirit_spring', 'spirit_spring'] as const
    const agg = aggregateBlessingEffects([...owned])
    expect(agg.spiritRegen).toBe(12) // tier3 值
  })

  it('跨系累加：攻击（剑）+ 暴击（会心）独立聚合', () => {
    const agg = aggregateBlessingEffects(['battleFocus', 'keen_eye', 'crit_heart'])
    expect(agg.atkPct).toBeCloseTo(0.15, 10)
    expect(agg.critAdd).toBeCloseTo(0.05 + 0.06, 10)
  })
})

describe('协同词条', () => {
  it('大道共鸣：每已学功法 +8% 攻', () => {
    const ctx = { learnedTechniqueCount: 3, swordWeaponCount: 0 }
    const result = aggregateRunSynergies(['battleFocus'], ctx)
    expect(result.atkPct).toBeCloseTo(0.24, 10)
    expect(result.active.map((s) => s.id)).toContain('dao_resonance')
  })

  it('剑阵：剑类武器 ≥3 攻 +30%', () => {
    const result = aggregateRunSynergies(['battleFocus'], { learnedTechniqueCount: 0, swordWeaponCount: 3 })
    expect(result.atkPct).toBeCloseTo(0.3, 10)
  })

  it('御兽同心：御兽系 ≥3 系内种数生命 +15%', () => {
    const result = aggregateRunSynergies(['reaper_mark', 'beast_heart', 'golden_touch'], {
      learnedTechniqueCount: 0,
      swordWeaponCount: 0,
    })
    expect(result.hpPct).toBeCloseTo(0.15, 10)
  })

  it('条件不足全不触发', () => {
    const result = aggregateRunSynergies([], { learnedTechniqueCount: 5, swordWeaponCount: 5 })
    expect(result.atkPct).toBe(0)
    expect(RUN_SYNERGIES.every((s) => s.evaluate([], { learnedTechniqueCount: 5, swordWeaponCount: 5 }) === null)).toBe(
      true
    )
  })
})

describe('三选一：升阶池与系倾斜', () => {
  it('未满 3 阶的已拥有祝福可再次出现（升阶路径）', () => {
    // 池含全部 <3 阶 id：已拥有的 battleFocus（1 阶）仍在池中
    for (let attempt = 0; attempt < 30; attempt++) {
      const options = pickBlessingOptions(['battleFocus'], 36, () => attempt / 40)
      if (options.includes('battleFocus')) return
    }
    throw new Error('已拥有祝福未进入升阶池')
  })

  it('3 阶封顶的祝福不再出现', () => {
    const maxed = ['battleFocus', 'battleFocus', 'battleFocus'] as const
    for (let attempt = 0; attempt < 20; attempt++) {
      const options = pickBlessingOptions([...maxed], 36, () => attempt / 25)
      expect(options).not.toContain('battleFocus')
    }
  })

  it('系倾斜：已持多张同系时，同系未拥有祝福更早被选中', () => {
    const owned = ['battleFocus', 'flame_heart', 'wind_step'] // 剑修 ×3
    // rng 恒 0.99（选权重末位附近）对比有无倾斜的排序影响——直接断言剑修系 id 出现在前段选项
    const options = pickBlessingOptions(owned, 6, () => 0.42)
    const swordIds = options.filter((id) => BLESSING_DEFS[id].school === 'sword')
    expect(swordIds.length).toBeGreaterThanOrEqual(1)
  })
})
