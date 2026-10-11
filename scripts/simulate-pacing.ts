/**
 * EndlessQuest V2 节奏模拟脚本（设计稿 §5.1 / §十三 校准）。
 *
 * 打印九境成本/速率/耗时表、突破灵石与灵石收入的覆盖校验，
 * 以及"前 7 天"首世/二世节奏映射。与运行时共用同一公式源
 * （src/data/realms.ts），改参后重跑即可。
 *
 * 运行方式：
 *   npx vitest run src/__tests__/PacingModel.test.ts   （校验 + console.table）
 *   npx tsx scripts/simulate-pacing.ts                 （独立打印）
 */
import {
  REALMS,
  REALM_EXP,
  BREAKTHROUGH_COSTS,
  getRealmCost,
  getRealmSpeedMult,
  getRealmEconomyMult,
  PACING_TIME_GROWTH,
} from '../src/data/realms'

const BASE_CULTIVATION_RATE = 5

function realmSeconds(realmIndex: number, charFactor: number): number {
  const rate = BASE_CULTIVATION_RATE * charFactor * getRealmSpeedMult(realmIndex)
  return getRealmCost(realmIndex) / rate
}

const table = REALM_EXP.map((exp, i) => {
  const seconds = realmSeconds(i, 1)
  const geniusSeconds = seconds / 8 // 天灵根+高悟性+满功法 ≈ ×8
  // 站在本境 i 时：前方成本 = 进入 i+1 的成本（不是已付的进入 i 的成本）
  const cost = BREAKTHROUGH_COSTS[i + 1]?.spiritStone ?? 0
  // 收入按目标境界缩放（tickSlice 同款语义：getRealmEconomyMult(bestRealm + 1)）
  const income = 0.5 * getRealmEconomyMult(Math.min(i + 1, REALM_EXP.length - 1))
  return {
    境界: REALMS[i].name,
    境界成本: `1e${exp}`,
    基础速率: `${(BASE_CULTIVATION_RATE * getRealmSpeedMult(i)).toExponential(2)}/s`,
    本境耗时: `${(seconds / 3600).toFixed(1)}h`,
    天资弟子上限: `${(geniusSeconds / 3600).toFixed(1)}h`,
    累计自然天: (realmSeconds(0, 1) * (PACING_TIME_GROWTH ** (i + 1) - 1) / 86400).toFixed(2),
    入下境灵石: cost.toExponential(2),
    灵石收入: `${income.toExponential(2)}/s`,
    攒石耗时占比: `${((cost / income / seconds) * 100).toFixed(0)}%`,
  }
})

console.table(table)

const totalDays = (realmSeconds(0, 1) * (PACING_TIME_GROWTH ** 9 - 1)) / 86400
console.log(`首世（无飞升加成）到渡劫的自然总时长：约 ${totalDays.toFixed(2)} 天`)
console.log('设计目标：D1 筑基 → D5 首飞；二世起由道韵全局倍率压缩（见工单 05）。')

// ---------------------------------------------------------------------------
// 多世道韵经济（V2.1 map 工单 01 校准律的打印版；权威断言在
// src/__tests__/DaoYunEconomy.test.ts，随 npm test 全量执行）
// ---------------------------------------------------------------------------

const ASCEND_PEAK = 1e40
const DAO_YUN_PEAK_EXP = 0.15

const FINITE_TREE_TOTAL = 2930 // 有限节点满级总道韵（daoxin310+stoneVein465+spiritWell465+temporal175+battle620+fortune620+heart225+heaven50）

function daoYunGain(peak: number, ascCount: number): number {
  const peakTerm = 10 * Math.pow(peak / 1e40, DAO_YUN_PEAK_EXP)
  return Math.floor(peakTerm * 3.4 * (1 + 0.25 * ascCount))
}

const strategies = {
  rush: (_run: number) => ASCEND_PEAK,
  push: (run: number) => ASCEND_PEAK * 10 ** (run - 1),
}

for (const [name, peakOf] of Object.entries(strategies)) {
  const rows: Record<string, string | number>[] = []
  let spentFinite = 0
  let essenceLevels = 0
  let prevGain = 0
  let ok = true
  for (let run = 1; run <= 10; run++) {
    const gain = daoYunGain(peakOf(run), run - 1)
    const finiteBudget = Math.max(0, Math.min(FINITE_TREE_TOTAL - spentFinite, gain + 0))
    spentFinite += finiteBudget
    const overflow = gain - finiteBudget
    essenceLevels += Math.floor(Math.log(1 + (0.18 * (overflow + 0)) / 20) / Math.log(1.18))
    if (prevGain > 0) {
      if (name === 'rush' && gain / prevGain > 1.25 + 1e-9) ok = false
      if (name === 'push' && gain / prevGain < 1.4) ok = false
    }
    prevGain = gain
    rows.push({ 世: run, 本世峰值: peakOf(run).toExponential(1), 道韵: gain, 有限树进度: `${Math.min(100, Math.round((spentFinite / FINITE_TREE_TOTAL) * 100))}%`, 精粹等级: essenceLevels })
  }
  console.table(rows)
  if (!ok) {
    console.error(`[simulate-pacing] 校准律违反（${name}）：rush 增幅应 ≤×1.25，推深增幅应 ≥×1.41`)
    process.exitCode = 1
  }
}
console.log('校准律：rush 同峰值增幅 ≤×1.25（停滞）；推深每数量级 ≥×1.41（单调优）。完整"每世最优≥×2"待工单 10（仙界深度）。')

// ---------------------------------------------------------------------------
// 建筑再投资比（V2.1 map 工单 03 验收）：Generator 化后经营层不卡墙。
// 模型：玩家保持五座 Generator 在"朴素水平" L_i = 1 + 10×境界i（每境 +10 级），
// 计算升下一级五座的总成本 / 本境灵石收入。前期应有感知（比值高、需取舍），
// 中后期必须 < 60%（升级不再构成墙）。
// ---------------------------------------------------------------------------

import { GENERATOR_SPECS, getBatchUpgradeInfo } from '../src/data/buildings'

const GEN_KEYS = Object.keys(GENERATOR_SPECS) as (keyof typeof GENERATOR_SPECS)[]

console.log('\n—— 建筑再投资比（朴素水平 L=1+10i，升下一级五座总成本 / 本境收入）——')
const buildingRows = REALM_EXP.map((_, i) => {
  const level = 1 + 10 * i
  // 仅计当前世界层的凡界 Generator（仙界建筑 1e42 起步，不属凡界再投资；炼气期只有灵田/灵矿）
  const unlockedGens = i === 0 ? (['spiritField', 'spiritMine'] as (keyof typeof GENERATOR_SPECS)[]) : GEN_KEYS.filter((k) => !k.startsWith('immortal'))
  let nextLevelCost = 0
  for (const key of unlockedGens) {
    nextLevelCost += getBatchUpgradeInfo(key, level, 1, Number.POSITIVE_INFINITY).totalCost
  }
  // 本境收入：灵矿在 L 级的基础速率 × 目标境界经济耦合 × 本境修炼耗时
  const mineRate = 0.5 * Math.pow(1.1, level - 1)
  const economyMult = Math.pow(10, ((REALM_EXP[Math.min(i + 1, REALM_EXP.length - 1)] - REALM_EXP[0]) * 0.9))
  const realmDur = getRealmCost(i) / (BASE_CULTIVATION_RATE * getRealmSpeedMult(i))
  const income = mineRate * economyMult * realmDur
  const ratio = nextLevelCost / income
  return { 境界: REALMS[i].name, 建筑等级: `L${level}`, 升级成本: nextLevelCost.toExponential(2), 本境收入: income.toExponential(2), 再投资比: `${(ratio * 100).toFixed(1)}%`, _ratio: ratio }
})
console.table(buildingRows.map(({ _ratio, ...r }) => r))

for (const row of buildingRows) {
  const budget = row.境界 === '炼气期' ? 2.5 : 0.6
  if (row._ratio > budget) {
    console.error(`[simulate-pacing] 建筑再投资比超预算：${row.境界} ${(row._ratio * 100).toFixed(1)}% > ${budget * 100}%`)
    process.exitCode = 1
  }
}
console.log('预算：炼气期 ≤250%（取舍感），其后每境 ≤60%（不卡墙）。')

// ---------------------------------------------------------------------------
// 灵气瓶颈表（V2.1 map 工单 04 验收）：消耗 2×2^realm 缩放后，
// "正常建设"（灵田等级 L=1+10i）能维持弟子修炼供给比 ≥0.9，不卡墙；
// 疏于建设（灵田落后一半）则产生可感知的修为缩水。
// ---------------------------------------------------------------------------

const SPIRIT_FIELD_COUNT = 2 // 主殿 Lv4（筑基）起可扩建第二座

function spiritSupply(fieldLevel: number, realmIndex: number): number {
  // 3×1.1^(lv-1) × 座数 × 里程碑（Lv10 ×2、Lv50 ×3）
  const base = fieldLevel < 1 ? 0 : 3 * Math.pow(1.1, fieldLevel - 1)
  const milestone = (fieldLevel >= 50 ? 3 : fieldLevel >= 10 ? 2 : 1)
  return base * (realmIndex >= 1 ? SPIRIT_FIELD_COUNT : 1) * milestone
}

console.log('—— 灵气瓶颈表（弟子数 N=min(10, 2+3i)，供给比目标 ≥0.9）——')
const spiritRows: { 境界: string; 弟子数: number; 需求每秒: number; 正常建设: string; 落后建设: string; _minLevel: number }[] = []
for (let i = 0; i < REALM_EXP.length; i++) {
  // 炼气期弟子上限被灵气供给封住（cap = floor(3/2) = 1）——瓶颈机制的正常形态
  const n = i === 0 ? 1 : Math.min(10, 2 + 3 * i)
  const demand = n * 2 * 2 ** i / 0.9
  // 求 L_min：供给 ≥ 需求 的最低灵田等级（里程碑档位随等级自洽）
  let minLevel = 1
  for (let L = 1; L <= 400; L++) {
    if (spiritSupply(L, i) >= demand) { minLevel = L; break }
    if (L === 400) minLevel = NaN
  }
  const normalLevel = 1 + 10 * i
  const ratioNormal = demand === 0 ? 1 : spiritSupply(normalLevel, i) / (n * 2 * 2 ** i)
  const ratioLag = spiritSupply(Math.max(1, Math.floor(normalLevel / 2)), i) / (n * 2 * 2 ** i)
  spiritRows.push({
    境界: REALMS[i].name,
    弟子数: n,
    需求每秒: n * 2 * 2 ** i,
    正常建设: `L${normalLevel} ratio=${ratioNormal.toFixed(2)}`,
    落后建设: `ratio=${Math.min(1, ratioLag).toFixed(2)}`,
    _minLevel: minLevel,
  })
}
console.table(spiritRows.map(({ _minLevel, ...r }) => r))

for (const row of spiritRows) {
  const i = spiritRows.indexOf(row)
  const normalLevel = 1 + 10 * i
  // A1 正常建设够用：L_min ≤ 1+10i
  if (!(row._minLevel <= normalLevel)) {
    console.error(`[simulate-pacing] 灵气死锁：${row.境界} 维持供给需灵田 L${row._minLevel} > 正常建设 L${normalLevel}`)
    process.exitCode = 1
  }
  // A2 瓶颈真实：筑基起每境都需要可感知的灵田投入（炼气期由弟子上限封住，豁免）
  if (i >= 1 && !(row._minLevel > 1)) {
    console.error(`[simulate-pacing] 瓶颈失真：${row.境界} L_min=1，灵田不再重要`)
    process.exitCode = 1
  }
  // A4 疏于建设产生缩水（落后一半 → ratio < 0.9）
  const lagRatio = Math.min(1, spiritSupply(Math.max(1, Math.floor(normalLevel / 2)), i) / (row.弟子数 * 2 * 2 ** i))
  if (i >= 2 && !(lagRatio < 0.9)) {
    console.error(`[simulate-pacing] 缩水教学缺失：${row.境界} 落后建设 ratio=${lagRatio.toFixed(2)} ≥ 0.9`)
    process.exitCode = 1
  }
}
console.log('校准：正常建设（L=1+10i）供给比 ≥0.9；落后一半可感知缩水；无死锁境界。')

// ---------------------------------------------------------------------------
// 大循环轮次表（V2.1 map 工单 10）：轮 = 一次证道周期。
// 轮内飞升序列（peak 随仙界推进 1e40→1e100）驱动道韵；轮末证道折算本源，
// 本源树为下一轮提供全局倍率。校准律终局断言：
//   L1 每轮最优道韵 ≥ 上轮 ×2（仙界深度兑现 map 决策 2）
//   L2 每轮全局修炼倍率 ≥ 上轮 ×2（时间压缩可持续）
//   L3 证道轮的最优本源 ≥ 上轮 ×3 下限校验（工单 09 校准律：×2^k × 树倍率）
// ---------------------------------------------------------------------------

interface CycleRow {
  轮: number
  轮内峰值序列: string
  末次飞升道韵: number
  轮道韵合计: number
  证道本源: number
  全局倍率_修为: number
  凡界耗时_天: number
  _optimal: number
}

const BASE_CYCLE_DAYS = 3.55 // 首世到渡劫（V2 基线，工单 04 锁定）

function cycleTable(): CycleRow[] {
  const peaks = [1e40, 1e50, 1e65, 1e80, 1e100]
  const peakRealms = [8, 9, 10, 11, 12]
  let daoYun = 0
  let genesis = 0
  let provingCount = 0
  let ascCount = 0
  let tree = {} // 飞升树（daoxin 精粹等简化为道韵消耗池）
  const genesisTree: Record<string, number> = {}
  const rows: CycleRow[] = []

  for (let cycle = 1; cycle <= 4; cycle++) {
    let cycleDaoYun = 0
    let optimal = 0
    for (let i = 0; i < peaks.length; i++) {
      // 与运行时同源（data/legacy.ts / data/genesisTree.ts）
      const daoYunMult = 2 ** (genesisTree['daoEssenceSea'] ?? 0)
      const gain = Math.floor(
        10 * Math.pow(peaks[i] / 1e40, 0.15) * (1 + 0.3 * peakRealms[i]) * (1 + 0.25 * ascCount) * daoYunMult
      )
      cycleDaoYun += gain
      optimal = Math.max(optimal, gain)
      daoYun += gain
      ascCount += 1
    }
    const gGain = Math.floor(3 * 1 * 2.2 * 2 ** provingCount)
    genesis += gGain
    // 简化支出：每轮把道韵灌飞升树 daoxin（×2/级，成本 10×2^L）与本源树凡尘逆旅（×2/级，成本 6×2^L）
    let spent = 0
    while (true) {
      const lvl = tree['daoxin'] ?? 0
      const cost = 10 * 2 ** lvl
      if (daoYun >= cost && lvl < 8) { daoYun -= cost; spent += cost; tree['daoxin'] = lvl + 1 } else break
    }
    // 道韵精粹无限水槽（工单 01）：吸收轮内道韵通胀
    while (true) {
      const lvl = tree['daoEssence'] ?? 0
      const cost = 20 * 1.18 ** lvl
      if (daoYun >= cost) { daoYun -= cost; spent += cost; tree['daoEssence'] = lvl + 1 } else break
    }
    // 本源之海（道韵获取 ×2/级）：跨轮 L1 的主驱动
    while (true) {
      const lvl = genesisTree['daoEssenceSea'] ?? 0
      const cost = 5 * 2 ** lvl
      if (genesis >= cost && lvl < 5) { genesis -= cost; genesisTree['daoEssenceSea'] = lvl + 1 } else break
    }
    while (true) {
      const lvl = genesisTree['samsaraMortal'] ?? 0
      const cost = 3 * 2 ** lvl
      if (genesis >= cost && lvl < 4) { genesis -= cost; genesisTree['samsaraMortal'] = lvl + 1 } else break
    }
    provingCount += 1
    const globalMult = 2 ** (tree['daoxin'] ?? 0) * 2 ** (genesisTree['samsaraMortal'] ?? 0)
    rows.push({
      轮: cycle,
      轮内峰值序列: peaks.map((p) => p.toExponential(0)).join('→'),
      末次飞升道韵: optimal,
      轮道韵合计: cycleDaoYun,
      证道本源: gGain,
      全局倍率_修为: globalMult,
      凡界耗时_天: +(BASE_CYCLE_DAYS / globalMult).toFixed(3),
      _optimal: optimal,
    })
  }
  return rows
}

const cycleRows = cycleTable()
console.log('—— 大循环轮次表（轮 = 证道周期；轮内飞升驱动道韵，轮末证道折算本源）——')
console.table(cycleRows.map(({ _optimal, ...r }) => r))

for (let i = 1; i < cycleRows.length; i++) {
  const prev = cycleRows[i - 1]
  const curr = cycleRows[i]
  // L1 每轮最优道韵 ≥ 上轮 ×2（map 决策 2 的完整兑现）
  if (!(curr._optimal >= prev._optimal * 2)) {
    console.error(`[simulate-pacing] 校准律 L1 违反：第 ${curr.轮} 轮最优道韵 ${curr._optimal} < 上轮 ×2`)
    process.exitCode = 1
  }
  // L2 每轮全局修炼倍率 ≥ 上轮 ×2
  if (!(curr.全局倍率_修为 >= prev.全局倍率_修为 * 2)) {
    console.error(`[simulate-pacing] 校准律 L2 违反：第 ${curr.轮} 轮全局倍率未翻倍`)
    process.exitCode = 1
  }
  // L3 证道本源 ≥ 上轮 ×2 下限（公式 2^count 保证；配合树倍率合成工单 09 的 ≥×3 全局律）
  if (!(curr.证道本源 >= prev.证道本源 * 2)) {
    console.error(`[simulate-pacing] 校准律 L3 违反：第 ${curr.轮} 轮证道本源未翻倍`)
    process.exitCode = 1
  }
}
console.log('校准律（终局）：L1 每轮最优道韵 ≥×2；L2 全局倍率每轮翻倍；L3 证道本源每轮翻倍。')
