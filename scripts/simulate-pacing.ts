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
