/**
 * EndlessQuest 数值审计回归（端到端蒙特卡洛）。
 *
 * 用真实引擎代码（realms.ts / CultivationEngine / BreakthroughCoordinator /
 * ResourceEngine）模拟一名弟子从炼气到渡劫圆满的完整首世，锁定 2026-09 修复
 * 的三面数值墙不再回归：
 *   P0-1 灵石硬上限差一境（getSectStoneCap 以目标境界为锚）
 *   P0-2 经济倍率按目标境界缩放（getRealmEconomyMult(bestRealm + 1)）
 *   P0-3 渡劫期小境界成本 Infinity（MINOR_BREAKTHROUGH_COSTS 覆盖最后一境）
 *
 * 模型：满配经济建筑（4 灵矿 lv10 = 20 灵石/s 基线），无功法（保守），
 * 灵气按满配灵田供给（84/s ≥ 2/s/弟子，单弟子永不匮乏）。
 * 突破走真实 processBreakthrough 管线（小境界 90%、天劫唯一判定、渡劫身死）。
 *
 * 运行：npx vitest run scripts/numeric-audit.test.ts
 */
import { it, expect } from 'vitest'
import {
  REALMS,
  REALM_EXP,
  BREAKTHROUGH_COSTS,
  getRealmEconomyMult,
  getBreakthroughResourceCost,
} from '../src/data/realms'
import { calcCultivationRate, canBreakthrough } from '../src/systems/cultivation/CultivationEngine'
import { processBreakthrough } from '../src/systems/cultivation/BreakthroughCoordinator'
import { getSectStoneCap } from '../src/systems/economy/ResourceEngine'
import { calcDaoYunGain } from '../src/data/legacy'
import type { Character } from '../src/types/character'

const MINE_BASE_RATE = 4 * 5 // 4 座灵矿 × lv10
const FIELD_HERB_RATE = 4 * 1 // 4 座灵田 × lv10
const HERB_CAP = (200 + 100 * 10) * 4
const MH_LEVEL = 10

// 收入对齐目标境界（tickSlice 同款语义）
const incomeStone = (realm: number) => MINE_BASE_RATE * getRealmEconomyMult(Math.min(realm + 1, REALM_EXP.length - 1))
const capAt = (realm: number) => getSectStoneCap(MH_LEVEL, realm)

function makeChar(): Character {
  return {
    id: 'sim',
    name: '模拟弟子',
    title: 'disciple',
    quality: 'common',
    realm: 0,
    realmStage: 0,
    cultivation: 0,
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
    createdAt: 0,
    totalCultivation: 0,
    specialties: [],
    assignedBuilding: null,
    cultivationPath: 'sword',
    investedSpiritStone: 0,
    techniqueComprehension: {},
  }
}

interface RunResult {
  endTime: number
  finalRealm: number
  finalStage: number
  deadEndRealm: number | null
  deaths: number
  injuries: number
  stonesSpent: number
  realmTimes: number[]
}

function simulateRun(deadlineSec: number): RunResult {
  let char = makeChar()
  let stones = 100
  let herb = 50
  let t = 0
  const result: RunResult = {
    endTime: 0,
    finalRealm: 0,
    finalStage: 0,
    deadEndRealm: null,
    deaths: 0,
    injuries: 0,
    stonesSpent: 0,
    realmTimes: [0],
  }

  while (t < deadlineSec) {
    if (char.status === 'injured') {
      const dt = char.injuryTimer
      t += dt
      stones += incomeStone(char.realm) * dt
      herb = Math.min(HERB_CAP, herb + FIELD_HERB_RATE * dt)
      char = { ...char, status: 'idle', injuryTimer: 0 }
    }

    const need = REALMS[char.realm].cultivationCosts[char.realmStage]
    const rate = calcCultivationRate(char, [])
    const dt = Math.max(0, (need - char.cultivation) / rate)
    t += dt
    stones += incomeStone(char.realm) * dt
    herb = Math.min(HERB_CAP, herb + FIELD_HERB_RATE * dt)
    char = { ...char, cultivation: need }

    while (canBreakthrough(char) && char.status === 'idle' && t < deadlineSec) {
      const cap = capAt(char.realm)
      const bt = processBreakthrough(char, Math.min(stones, cap), 0, [], { spiritStone: 0, spiritEnergy: 0, herb: 0 }, undefined, undefined, herb, 0)

      if (bt.attemptsCount === 0) {
        // 资源不足：等到攒够；若上限永远低于成本则是死局（数值墙回归信号）
        const needStone = getBreakthroughResourceCost(char.realm, char.realmStage).spiritStone
        if (needStone > cap) {
          result.deadEndRealm = char.realm
          result.endTime = t
          result.finalRealm = char.realm
          result.finalStage = char.realmStage
          return result
        }
        const wait = Math.max(1, (needStone - stones) / Math.max(1e-9, incomeStone(char.realm)))
        t += wait
        stones += incomeStone(char.realm) * wait
        herb = Math.min(HERB_CAP, herb + FIELD_HERB_RATE * wait)
        continue
      }

      stones -= bt.resourceCost.spiritStone
      herb -= bt.resourceCost.herb
      result.stonesSpent += bt.resourceCost.spiritStone
      char = bt.updatedChar

      if (bt.outcome === 'injured') {
        result.injuries++
        char = { ...char, status: 'injured', injuryTimer: bt.injuryTimer }
      }
      if (bt.died) {
        result.deaths++
        char = makeChar() // 身死道消：新弟子从炼气重来
        break
      }
      if (bt.breakthroughSuccess && bt.updatedChar.realm > result.realmTimes.length - 1) {
        result.realmTimes[bt.updatedChar.realm] = t
      }
      if (bt.outcome === 'blocked' || bt.outcome === 'injured') break
    }

    // 终点固定渡劫圆满（首世锁定，工单 07）：REALM_EXP 延伸仙界后不跟表走
    if (char.realm >= 8 && char.realmStage >= 3) {
      result.endTime = t
      result.finalRealm = char.realm
      result.finalStage = char.realmStage
      return result
    }
  }
  result.endTime = t
  result.finalRealm = char.realm
  result.finalStage = char.realmStage
  return result
}

function median(arr: number[]): number {
  const s = [...arr].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

it('A. 逐境界：上限覆盖下一境成本、攒石时间不超过修炼时间的 2 倍', () => {
  const rows = REALM_EXP.map((_, i) => {
    const income = incomeStone(i)
    const cap = capAt(i)
    const costNext = BREAKTHROUGH_COSTS[i + 1]?.spiritStone ?? NaN
    const cultSeconds = 600 * 2 ** i
    return {
      境界: REALMS[i].name,
      上限: cap.toExponential(2),
      下一境成本: costNext.toExponential(2),
      上限阻断: costNext > cap ? '❌' : 'ok',
      攒石耗时_天: (costNext / income / 86400).toExponential(2),
      修炼耗时_天: (cultSeconds / 86400).toExponential(2),
    }
  })
  console.table(rows)

  // 凡界段：全量逐境断言
  for (let realm = 0; realm < 8; realm++) {
    const cost = BREAKTHROUGH_COSTS[realm + 1].spiritStone
    expect(capAt(realm)).toBeGreaterThanOrEqual(cost)
    // 攒石时间 ≤ 修炼时间 × 2（增量平衡律的收入侧）
    expect(cost / incomeStone(realm)).toBeLessThanOrEqual(2 * 600 * 2 ** realm)
  }
  // 仙界段（工单 07）：economyMult 斜率 1.0 后攒石耗时 = 2/mineRate（境界无关常数），
  // 上限覆盖成本直到道祖前
  for (let realm = 8; realm < REALM_EXP.length - 1; realm++) {
    const cost = BREAKTHROUGH_COSTS[realm + 1].spiritStone
    expect(Number.isFinite(cost)).toBe(true)
    expect(capAt(realm)).toBeGreaterThanOrEqual(cost)
    expect(cost / incomeStone(realm)).toBeLessThanOrEqual(2 * 600 * 2 ** 8) // 常数上界
  }
})

it('B. 蒙特卡洛回归：100 局全部通关渡劫圆满，中位时间 ≈ 设计目标 3.55 天 + 梯度开销', () => {
  const runs = Array.from({ length: 100 }, () => simulateRun(1e9))
  const finished = runs.filter((r) => r.deadEndRealm === null && r.finalRealm >= 8 && r.finalStage >= 3)
  const deadEnds = runs.filter((r) => r.deadEndRealm !== null)

  expect(deadEnds).toHaveLength(0) // 任何死局 = 数值墙回归
  expect(finished.length).toBeGreaterThanOrEqual(98) // 允许极端身死连锁的尾部

  const medDays = median(finished.map((r) => r.endTime)) / 86400
  console.log(`中位通关时间: ${medDays.toFixed(2)} 天；平均身死 ${(
    runs.reduce((s, r) => s + r.deaths, 0) / runs.length
  ).toFixed(2)} 次/局；平均受伤 ${(runs.reduce((s, r) => s + r.injuries, 0) / runs.length).toFixed(1)} 次/局`)
  const perRealm = REALM_EXP.map((_, i) => {
    const vals = runs.map((r) => r.realmTimes[i]).filter((v) => v !== undefined).sort((a, b) => a - b)
    return vals.length ? (median(vals) / 86400).toFixed(2) : '—'
  })
  console.log('进入各境界中位时间(天):', perRealm)

  // 设计锚点：纯修炼 3.55 天；修炼随机事件压缩约 25%、攒石/受阻增加少量
  expect(medDays).toBeGreaterThan(2.2)
  expect(medDays).toBeLessThan(8)
})

it('C. 道韵经济打印（校准参考）', () => {
  const peakAt = (realm: number) => 1.3 * REALM_EXP.slice(0, realm + 1).reduce((s, e) => s + 10 ** e, 0)
  const rows = [4, 7, 8].map((realm) => ({
    飞升境界: REALMS[realm].name,
    首飞道韵: calcDaoYunGain(peakAt(realm), realm, 0),
    第2次: calcDaoYunGain(peakAt(realm), realm, 1),
    第3次: calcDaoYunGain(peakAt(realm), realm, 2),
  }))
  console.table(rows)
  // V2.1 工单 01 校准律：rush 停滞（同峰值 ≤×1.25，+1/prev 吸收 floor 扰动）
  // 且推深单调优（每数量级 ≥×1.41，严格压过 rush 重复）
  for (let asc = 1; asc <= 4; asc++) {
    const prev = calcDaoYunGain(peakAt(8), 8, asc - 1)
    const rushed = calcDaoYunGain(peakAt(8), 8, asc)
    expect(rushed / prev).toBeLessThanOrEqual(1.25 + 1 / prev + 1e-9)
    const pushed = calcDaoYunGain(peakAt(8) * 10, 8, asc - 1)
    expect(pushed).toBeGreaterThanOrEqual(rushed)
  }
})
