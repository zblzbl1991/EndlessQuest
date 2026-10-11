/**
 * 证道 Prestige②（V2.1 工单 09，设计稿 §2 四层循环 / §7.4）：
 * 大循环终点——道祖后证道，重置凡界与仙界，折算大道本源。
 *
 * 校准律（工单 09/10）：每轮证道的全局产出倍率 ≥ 上轮 ×3——由公式次数项 2^count
 * 与本源树大道之干 ×2/级 合成；仙界封顶 1e100 后"深度"不存在，证道维度是时间压缩。
 */
import type { Sect, Building } from '../../types/sect'
import type { Character } from '../../types/character'
import { BUILDING_DEFS } from '../../data/buildings'
import { IMMORTAL_REALM_INDEX, REALM_EXP } from '../../data/realms'
import {
  getGenesisTreeTotalLevel,
  isTranscendGateOpen,
  getGenesisStartingStoneMult,
  getGenesisExtraGuardians,
  getGenesisStartingDaoYun,
  isAutoProveDaoUnlocked,
} from '../../data/genesisTree'

// ---------------------------------------------------------------------------
// 大道本源公式
// ---------------------------------------------------------------------------

/** 峰值幂：每 tenfold ×1.58（强于道韵的 0.15——证道周期长，斜率应更高）。 */
export const GENESIS_PEAK_EXP = 0.2
/** 峰值锚点：道祖圆满（1e100）→ 1。 */
export const GENESIS_PEAK_ANCHOR = 1e100

/**
 * 大道本源 = floor( 3 × (峰值/1e100)^0.2 × (1 + 0.4 × (仙界最高境界 − 9)) × 2^证道次数 )
 * 首证（道祖圆满、峰值 1e100、零次）：3 × 1 × 2.2 × 1 ≈ 6~7 本源——本源树前 2 列可点。
 */
export function calcGenesisGain(
  peakCultivationThisRun: number,
  highestRealmIndex: number,
  daoProvingCount: number
): number {
  const peak = Math.max(0, peakCultivationThisRun)
  if (peak <= 0) return 0
  const peakTerm = 3 * Math.pow(peak / GENESIS_PEAK_ANCHOR, GENESIS_PEAK_EXP)
  const realmTerm = 1 + 0.4 * Math.max(0, highestRealmIndex - IMMORTAL_REALM_INDEX)
  const countTerm = 2 ** Math.max(0, daoProvingCount)
  return Math.floor(peakTerm * realmTerm * countTerm)
}

// ---------------------------------------------------------------------------
// 证道条件与结算
// ---------------------------------------------------------------------------

export interface DaoProvingCheck {
  canProve: boolean
  reasons: string[]
}

/** 证道条件：至少 1 名弟子达道祖期（realm 12）。 */
export function canProveDao(sect: Sect): DaoProvingCheck {
  const reasons: string[] = []
  const hasDaozu = sect.characters.some((c) => c.realm >= REALM_EXP.length - 1)
  if (!hasDaozu) reasons.push('需要至少 1 名弟子达到道祖期（境界 >= 12）')
  return { canProve: reasons.length === 0, reasons }
}

/** 超脱条件：超脱之门节点 + 本源树累计 30 级 + 一名道祖弟子。 */
export function canTranscend(sect: Sect): DaoProvingCheck {
  const reasons: string[] = []
  if (!isTranscendGateOpen(sect.genesisTree)) reasons.push('需点亮本源树"超脱之门"')
  if (getGenesisTreeTotalLevel(sect.genesisTree) < 30) reasons.push('本源树累计等级需达到 30 级')
  if (!sect.characters.some((c) => c.realm >= REALM_EXP.length - 1)) reasons.push('需要一名道祖期弟子镇世')
  return { canProve: reasons.length === 0, reasons }
}

/** 护法（跨双界）：证道重置凡界与仙界，保留境界最高的弟子但境界/修为归零。 */
function pickGuardian(characters: Character[], extraCount: number): Character[] {
  if (characters.length === 0) return []
  const sorted = [...characters].sort((a, b) => b.realm - a.realm || b.totalCultivation - a.totalCultivation)
  return sorted.slice(0, 1 + Math.max(0, extraCount))
}

function asProvingGuardian(char: Character): Character {
  return {
    ...char,
    realm: 0,
    realmStage: 0,
    cultivation: 0,
    totalCultivation: 0,
    cultivationEvent: undefined,
    status: 'idle',
    injuryTimer: 0,
    petIds: [],
  }
}

function resetBuilding(defType: string): Building {
  const isStarter = defType === 'mainHall' || defType === 'spiritMine' || defType === 'spiritField'
  return {
    type: defType as Building['type'],
    level: isStarter ? 1 : 0,
    count: isStarter ? 1 : 0,
    unlocked: isStarter,
    productionQueue: { recipeId: null, progress: 0 },
  }
}

export interface DaoProvingReport {
  previousCount: number
  newCount: number
  genesisGain: number
  genesisTotal: number
  guardianNames: string[]
}

/**
 * 证道结算：重置凡界**与仙界**（建筑/资源/境界）；保留本源/本源树/道韵+飞升树/
 * 图鉴/里程碑/统计。开局福利由造化之干提供（灵石倍率 / 额外护法 / 开局道韵）。
 */
export function performDaoProving(sect: Sect): { newSect: Sect; report: DaoProvingReport } {
  const newCount = sect.daoProvingCount + 1
  const highestRealm = sect.characters.reduce((max, c) => Math.max(max, c.realm), 0)
  const genesisGain = calcGenesisGain(sect.stats.peakCultivationThisRun ?? 0, highestRealm, sect.daoProvingCount)
  const genesisTotal = (sect.genesis ?? 0) + genesisGain

  const guardians = pickGuardian(sect.characters, getGenesisExtraGuardians(sect.genesisTree))
  const characters =
    guardians.length > 0 ? guardians.map(asProvingGuardian) : sect.characters.slice(0, 1).map(asProvingGuardian)

  // 证道重置全部建筑（凡界 + 仙界）——不参考旧值
  const prevByType = new Map(sect.buildings.map((b) => [b.type, b]))
  void prevByType
  const buildings: Building[] = BUILDING_DEFS.map((def) => resetBuilding(def.type))

  // 造化之干开局福利
  const startingStone = 500 * getGenesisStartingStoneMult(sect.genesisTree)
  const startingDaoYun = getGenesisStartingDaoYun(sect.genesisTree)

  const newSect: Sect = {
    ...sect,
    level: 1,
    resources: { spiritStone: startingStone, spiritEnergy: 0, herb: 0, ore: 0 },
    buildings,
    characters,
    vault: [],
    pets: [],
    genesis: genesisTotal,
    daoProvingCount: newCount,
    // genesisTree 跨证道保留（引用沿用）
    genesisTree: sect.genesisTree ?? {},
    stats: { ...sect.stats, peakCultivationThisRun: 0 },
    lastTransmissionTime: 0,
    autoRunDayCounter: 0,
    lastRandomEventTime: 0,
    offlineAccumulator: {
      resourcesGained: { spiritStone: 0, spiritEnergy: 0, herb: 0, ore: 0 },
      breakthroughs: [],
      itemsCrafted: [],
      taxIncome: 0,
      lowSpiritSeconds: 0,
    },
    // 道韵开局福利：直接注入 legacy.daoYun
    legacy: { ...sect.legacy, daoYun: (sect.legacy.daoYun ?? 0) + startingDaoYun },
  }

  const report: DaoProvingReport = {
    previousCount: sect.daoProvingCount,
    newCount,
    genesisGain,
    genesisTotal,
    guardianNames: characters.map((c) => c.name),
  }
  return { newSect, report }
}

// ---------------------------------------------------------------------------
// 超脱与自动证道
// ---------------------------------------------------------------------------

/** 超脱：结算标记（无尽模式入口）。完成条件由 canTranscend 校验。 */
export function performTranscendence(sect: Sect): Sect {
  return { ...sect, transcended: true }
}

/** 自动证道：天机证道节点 + 证道资格 + 预计本源 ≥ 门槛。 */
export function shouldAutoProveDao(sect: Sect, minGenesis: number): boolean {
  if (!isAutoProveDaoUnlocked(sect.genesisTree)) return false
  if (!canProveDao(sect).canProve) return false
  const highestRealm = sect.characters.reduce((max, c) => Math.max(max, c.realm), 0)
  const expected = calcGenesisGain(sect.stats.peakCultivationThisRun ?? 0, highestRealm, sect.daoProvingCount)
  return expected >= minGenesis
}
