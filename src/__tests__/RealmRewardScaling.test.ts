import { describe, it, expect } from 'vitest'
import { scaleDungeonResources } from '../systems/adventure/RewardEconomy'
import { getRealmEconomyMult } from '../data/realms'

/**
 * P2-8：秘境资源收益按境界缩放（§九.4）。灵石/灵草/矿材乘目标境界经济倍率，
 * 灵气不缩放（生产链底层瓶颈，与 tickSlice 语义一致）。
 */

const BASE = { spiritStone: 100, spiritEnergy: 50, herb: 20, ore: 10 }

describe('scaleDungeonResources', () => {
  it('灵石/灵草/矿材按目标境界倍率缩放', () => {
    const out = scaleDungeonResources(BASE, 2) // 目标境 3（元婴，EXP 9）
    const mult = getRealmEconomyMult(3)
    expect(out.spiritStone).toBeCloseTo(100 * mult, 6)
    expect(out.herb).toBeCloseTo(20 * mult, 6)
    expect(out.ore).toBeCloseTo(10 * mult, 6)
  })

  it('灵气不缩放（生产链底层瓶颈）', () => {
    const out = scaleDungeonResources(BASE, 7)
    expect(out.spiritEnergy).toBe(50)
  })

  it('境界越高收益越高', () => {
    const low = scaleDungeonResources(BASE, 0)
    const high = scaleDungeonResources(BASE, 7)
    expect(high.spiritStone).toBeGreaterThan(low.spiritStone)
  })

  it('对越界 bestRealm 安全', () => {
    const out = scaleDungeonResources(BASE, 99)
    expect(Number.isFinite(out.spiritStone)).toBe(true)
    expect(out.spiritStone).toBeGreaterThan(0)
  })
})
