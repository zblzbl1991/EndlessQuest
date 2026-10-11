import { describe, it, expect } from 'vitest'
import {
  REALM_EXP,
  BREAKTHROUGH_COSTS,
  getRealmCost,
  getBreakthroughResourceCost,
  getRealmEconomyMult,
} from '../data/realms'
import { getSectStoneCap } from '../systems/economy/ResourceEngine'

/**
 * P0 数值墙回归（2026-09 审计）：
 * - P0-1 灵石硬上限差一境：getRealmStoneFloor(bestRealm) 只保证"进入当前境"的成本，
 *   引擎却用它存"进入下一境"的钱 → 金丹圆满永久卡死。
 * - P0-2 经济倍率按当前境缩放（0.9 指数），跟不上 10^ΔEXP 的成本曲线 → 后期攒钱以年计。
 * - P0-3 最后一个境界（渡劫期）小境界成本为 Infinity → 最后一境永远走不完。
 *
 * 接缝选择：这三条公式原先内联在 tickSlice，测试无法触及（1356 个测试全部漏过），
 * 因此先提取为纯函数（getSectStoneCap / getRealmEconomyMult 对齐目标境）再在此锁定。
 */

const MAIN_HALL_MAX = 10
/** 满配灵矿基线产量：4 座 × lv10（getSpiritMineRate 上限 5/s），境界经济倍率之外的乘数另计。 */
const MAX_MINE_RATE = 4 * 5

describe('P0-1: 灵石硬上限必须容纳下一境突破成本', () => {
  it('站在境界 i 时，硬上限 ≥ 进入 i+1 的成本', () => {
    for (let realm = 0; realm < REALM_EXP.length; realm++) {
      const cap = getSectStoneCap(MAIN_HALL_MAX, realm)
      const cost = BREAKTHROUGH_COSTS[realm + 1]?.spiritStone
      if (cost === undefined) continue // 道祖为最后一境（工单 07）
      expect(cap).toBeGreaterThanOrEqual(cost)
    }
  })

  it('上限对下一境成本保留至少 2 倍余量（突破失败重试 + 波动）', () => {
    for (let realm = 0; realm < REALM_EXP.length - 1; realm++) {
      const cap = getSectStoneCap(MAIN_HALL_MAX, realm)
      const cost = BREAKTHROUGH_COSTS[realm + 1].spiritStone
      expect(cap).toBeGreaterThanOrEqual(cost * 2)
    }
  })

  it('所有小境界成本也在上限之内', () => {
    for (let realm = 0; realm < REALM_EXP.length; realm++) {
      const cap = getSectStoneCap(MAIN_HALL_MAX, realm)
      for (const stage of [0, 1, 2]) {
        const cost = getBreakthroughResourceCost(realm, stage).spiritStone
        expect(cost).toBeLessThanOrEqual(cap)
      }
    }
  })

  it('上限随最高境界单调不减', () => {
    for (let realm = 1; realm < REALM_EXP.length; realm++) {
      expect(getSectStoneCap(MAIN_HALL_MAX, realm)).toBeGreaterThanOrEqual(getSectStoneCap(MAIN_HALL_MAX, realm - 1))
    }
  })
})

describe('P0-2: 灵石收入对齐目标境界，覆盖下一境成本', () => {
  it('满建筑收入在一个境界设计时长内攒齐下一境突破成本', () => {
    for (let realm = 0; realm < REALM_EXP.length - 1; realm++) {
      const realmDuration = 600 * 2 ** realm // 设计锚点：首境 10 分钟、每境 ×2
      // 收入按"正在攒钱去往的目标境界"缩放（tickSlice 同款语义）
      const income = MAX_MINE_RATE * getRealmEconomyMult(realm + 1)
      const cost = BREAKTHROUGH_COSTS[realm + 1].spiritStone
      expect(income * realmDuration).toBeGreaterThan(cost)
    }
  })

  it('getRealmEconomyMult 对越界下标安全（不产生 NaN/Infinity）', () => {
    expect(Number.isFinite(getRealmEconomyMult(REALM_EXP.length))).toBe(true)
    expect(Number.isFinite(getRealmEconomyMult(999))).toBe(true)
    expect(getRealmEconomyMult(999)).toBeGreaterThan(0)
  })
})

describe('P0-3: 最后一个境界（渡劫期）的小境界成本必须有限', () => {
  it('渡劫期 stage 0-2 的成本有限且按本境成本比例', () => {
    for (const stage of [0, 1, 2]) {
      const cost = getBreakthroughResourceCost(8, stage).spiritStone
      expect(Number.isFinite(cost)).toBe(true)
      expect(cost).toBeGreaterThan(0)
    }
    // 工单 07：渡劫期小境界现锚定下一境（真仙）成本；"最后一境"特例移到道祖
    expect(getBreakthroughResourceCost(8, 0).spiritStone).toBeCloseTo(getRealmCost(9) * 0.0004) // basis(真仙)×0.02
    for (const stage of [0, 1, 2]) {
      const daozuCost = getBreakthroughResourceCost(12, stage).spiritStone
      expect(Number.isFinite(daozuCost)).toBe(true)
      expect(daozuCost).toBeGreaterThan(0)
    }
    expect(getBreakthroughResourceCost(12, 0).spiritStone).toBeCloseTo(getRealmCost(12) * 0.02)
    expect(getBreakthroughResourceCost(8, 1).spiritStone).toBeCloseTo(getRealmCost(9) * 0.0008) // basis×0.04
    expect(getBreakthroughResourceCost(8, 2).spiritStone).toBeCloseTo(getRealmCost(9) * 0.0016) // basis×0.08
  })

  it('全部境界全部阶段的小境界成本都有限', () => {
    for (let realm = 0; realm < REALM_EXP.length; realm++) {
      for (const stage of [0, 1, 2]) {
        const cost = getBreakthroughResourceCost(realm, stage).spiritStone
        expect(Number.isFinite(cost)).toBe(true)
      }
    }
  })
})
