import { describe, it, expect } from 'vitest'
import { calcDaoYunGain, getLegacyDaoEssenceMult } from '../data/legacy'
import { LEGACY_TREE, getLegacyNodeUpgradeCost } from '../data/legacyTree'
import { calcCultivationRate } from '../systems/cultivation/CultivationEngine'
import type { Character } from '../types/character'

// ─── 道韵经济（V2.1 map 工单 01）：深度+速度双维 + 无限水槽 ───────────────
//
// 校准律（凡界段，完整"每世最优 ≥ 上世 ×2"延至工单 10 仙界深度空间）：
//   L1 rush 停滞  —— 同峰值重复飞升，收益增幅仅来自线性次数项（≤ ×1.25）
//   L2 推深单调优 —— 峰值每高一个数量级，收益增幅 ≥ rush 重复
//   L3 水槽有效   —— 道韵精粹等级在多世模拟中逐世上升，飞升树不再于 4~5 世内饱和

const ASCEND_PEAK = 1e40 // canAscend 门槛：渡劫期（境界 8）的修为下限

interface RunState {
  daoYun: number
  tree: Record<string, number>
  ascCount: number
}

function finiteNodes(): typeof LEGACY_TREE {
  return LEGACY_TREE.filter((n) => n.id !== 'daoEssence')
}

function greedySpend(state: RunState): RunState {
  const next = { ...state, tree: { ...state.tree } }
  // 先把有限节点按"当前可负担的最便宜下一级"买满
  let progressed = true
  while (progressed) {
    progressed = false
    for (const node of finiteNodes()) {
      const level = next.tree[node.id] ?? 0
      const cost = getLegacyNodeUpgradeCost(node.id, level)
      if (cost !== null && next.daoYun >= cost) {
        next.daoYun -= cost
        next.tree[node.id] = level + 1
        progressed = true
      }
    }
  }
  // 余量全部灌进无限水槽
  for (;;) {
    const level = next.tree['daoEssence'] ?? 0
    const cost = getLegacyNodeUpgradeCost('daoEssence', level)
    if (cost === null || next.daoYun < cost) break
    next.daoYun -= cost
    next.tree['daoEssence'] = level + 1
  }
  return next
}

/** 模拟 n 世：peakStrategy 给出第 n 世（1-based）的本世修为峰值。 */
function simulateRuns(runs: number, peakStrategy: (run: number) => number): { states: RunState[]; gains: number[] } {
  const states: RunState[] = [{ daoYun: 0, tree: {}, ascCount: 0 }]
  const gains: number[] = []
  for (let run = 1; run <= runs; run++) {
    const prev = states[run - 1]
    const gain = calcDaoYunGain(peakStrategy(run), 8, prev.ascCount)
    const spent = greedySpend({ ...prev, daoYun: prev.daoYun + gain })
    spent.ascCount = prev.ascCount + 1
    states.push(spent)
    gains.push(gain)
  }
  return { states, gains }
}

describe('daoYun calibration laws (map 工单 01)', () => {
  it('L1 rush 停滞：同峰值重复飞升，逐世收益增幅 ≤ ×1.25', () => {
    const { gains } = simulateRuns(10, () => ASCEND_PEAK)
    for (let i = 1; i < gains.length; i++) {
      expect(gains[i]).toBeGreaterThan(gains[i - 1])
      expect(gains[i] / gains[i - 1]).toBeLessThanOrEqual(1.25 + 1 / gains[i - 1] + 1e-9)
    }
  })

  it('L2 推深单调优：每世多推深一个数量级，收益增幅 ≥ rush 重复', () => {
    const rush = simulateRuns(10, () => ASCEND_PEAK).gains
    const push = simulateRuns(10, (run) => ASCEND_PEAK * 10 ** (run - 1)).gains
    for (let i = 0; i < push.length; i++) {
      expect(push[i]).toBeGreaterThanOrEqual(rush[i])
      if (i > 0) {
        expect(push[i] / push[i - 1]).toBeGreaterThanOrEqual(rush[i] / rush[i - 1])
      }
    }
  })

  it('L3 水槽有效：有限树不再 4~5 世内饱和，饱和后道韵持续流入无限水槽', () => {
    const { states } = simulateRuns(20, (run) => ASCEND_PEAK * 10 ** (run - 1))
    // 旧 4^n 公式下有限树（≈2930 道韵）在第 4~5 次飞升即满——线性次数项下第 5 世远未满
    const finiteMaxTotal = finiteNodes().reduce((sum, n) => sum + n.maxLevel, 0)
    const finiteTotalAfter5 = finiteNodes().reduce(
      (sum, node) => sum + Math.min(states[5].tree[node.id] ?? 0, node.maxLevel),
      0
    )
    expect(finiteTotalAfter5).toBeLessThan(finiteMaxTotal)
    // 有限树需求在 20 世内可达（长期目标存在），此后水槽逐世吸收、不再停滞
    const finiteMaxed = finiteNodes().every((n) => (states[20].tree[n.id] ?? 0) >= n.maxLevel)
    expect(finiteMaxed).toBe(true)
    for (let run = 16; run <= 20; run++) {
      const essence = states[run].tree['daoEssence'] ?? 0
      expect(essence).toBeGreaterThan(states[run - 1].tree['daoEssence'] ?? 0)
    }
  })
})

describe('daoEssence infinite sink node', () => {
  it('成本按 costGrowth 1.18 增长且 9999 级内不封顶', () => {
    expect(getLegacyNodeUpgradeCost('daoEssence', 0)).toBe(20)
    expect(getLegacyNodeUpgradeCost('daoEssence', 1)).toBeCloseTo(20 * 1.18, 6)
    expect(getLegacyNodeUpgradeCost('daoEssence', 10)).toBeCloseTo(20 * 1.18 ** 10, 6)
    expect(getLegacyNodeUpgradeCost('daoEssence', 9998)).not.toBeNull()
    expect(getLegacyNodeUpgradeCost('daoEssence', 9999)).toBeNull()
  })

  it('效果查询 ×1.03/级', () => {
    expect(getLegacyDaoEssenceMult(undefined)).toBe(1)
    expect(getLegacyDaoEssenceMult({})).toBe(1)
    expect(getLegacyDaoEssenceMult({ daoEssence: 3 })).toBeCloseTo(1.03 ** 3, 10)
    expect(getLegacyDaoEssenceMult({ daoEssence: 100 })).toBeCloseTo(1.03 ** 100, 6)
  })

  it('修为速率经 legacyRateMult 真实放大（与有限节点共用乘区）', () => {
    const character = baseDisciple()
    const base = calcCultivationRate(character, [], 1)
    const withTree = calcCultivationRate(character, [], 2 ** 1 * getLegacyDaoEssenceMult({ daoEssence: 2 }))
    expect(withTree / base).toBeCloseTo(2 * 1.03 ** 2, 10)
  })
})

function baseDisciple(): Character {
  return {
    id: 'sink-test',
    name: '精粹',
    title: 'disciple',
    quality: 'common',
    realm: 0,
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
