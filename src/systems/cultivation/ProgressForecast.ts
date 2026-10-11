/**
 * 进度前瞻（V2.1 map 工单 06）：回访会话里"下一步等什么、还要多久"。
 *
 * 纯函数、无副作用；速率/收入为快速近似——包含境界曲线、飞升树、建筑
 * Milestone 与灵气供给比等主导乘区，不含指派/协同/灵潮等次要修正，
 * 误差不改变 ETA 的数量级（"约 3 小时"级别）。
 */
import type { Sect } from '../../types'
import type { Character } from '../../types/character'
import { getCultivationNeeded, getRealmName, REALM_EXP } from '../../data/realms'
import {
  getNextMilestone,
  getScriptureCultivationMult,
  getSectMilestoneCultivationMult,
  getSectMilestoneRateMult,
  GENERATOR_SPECS,
} from '../../data/buildings'
import { getLegacyCultivationMult, getLegacyDaoEssenceMult, getLegacyStoneMult } from '../../data/legacy'
import { getRealmEconomyMult } from '../../data/realms'
import { calcCultivationRate, calcSpiritCostPerSecond } from './CultivationEngine'
import { calcResourceRates } from '../economy/ResourceEngine'
import { getCultivationEconomySnapshot } from './CultivationDisplay'
import { safeExpCost } from '../../utils/Decimal'

/**
 * 建筑 + 飞升树的修炼乘区（tickSlice 同款；抽出共享避免两处漂移）。
 */
export function getBuildingCultivationMult(sect: Sect): number {
  const scriptureLevel = sect.buildings.find((b) => b.type === 'scriptureHall')?.level ?? 0
  return (
    getScriptureCultivationMult(scriptureLevel) *
    getSectMilestoneCultivationMult(sect.buildings, sect.techniqueCodex.length)
  )
}

/** 灵石收入快速近似（主导乘区：境界经济耦合 + 飞升树 + Milestone）。 */
export function getApproxStoneIncome(sect: Sect): number {
  const sf = sect.buildings.find((b) => b.type === 'spiritField')
  const sm = sect.buildings.find((b) => b.type === 'spiritMine')
  const rates = calcResourceRates({
    spiritField: sf?.level ?? 0,
    spiritFieldCount: sf?.count ?? 1,
    spiritMine: sm?.level ?? 0,
    spiritMineCount: sm?.count ?? 1,
    mainHall: sect.buildings.find((b) => b.type === 'mainHall')?.level ?? 1,
  })
  const bestRealm = sect.characters.reduce((max, c) => Math.max(max, c.realm), 0)
  return (
    rates.spiritStone *
    getRealmEconomyMult(bestRealm + 1) *
    getLegacyStoneMult(sect.legacyTree) *
    getLegacyDaoEssenceMult(sect.legacyTree) *
    getSectMilestoneRateMult(sect.buildings, 'spiritStone')
  )
}

export interface BreakthroughForecast {
  characterName: string
  fromName: string
  toName: string
  isMajor: boolean
  /** 供给充足时的预计秒数；Infinity 表示速率为 0（无法预估）。 */
  etaSeconds: number
  /** 当前灵气供给比（< 0.9 时 UI 高亮"实际会更慢"）。 */
  spiritRatio: number
}

/** 全宗修为最快抵达下一次突破的弟子前瞻。 */
export function forecastNextBreakthrough(sect: Sect): BreakthroughForecast | null {
  const snapshot = getCultivationEconomySnapshot(sect)
  const rateMult =
    getLegacyCultivationMult(sect.legacyTree) *
    getLegacyDaoEssenceMult(sect.legacyTree) *
    getBuildingCultivationMult(sect)

  let best: (BreakthroughForecast & { _eta: number }) | null = null
  for (const char of sect.characters) {
    if (char.status !== 'idle') continue
    const needed = getCultivationNeeded(char.realm, char.realmStage)
    if (!Number.isFinite(needed)) continue
    const gap = Math.max(0, needed - char.cultivation)
    const rate = calcCultivationRate(char, char.learnedTechniques, rateMult) * snapshot.spiritRatio
    const eta = rate > 0 ? gap / rate : Infinity
    const isMajor = char.realmStage >= 3
    const toName = isMajor
      ? getRealmName(Math.min(char.realm + 1, REALM_EXP.length - 1), 0)
      : getRealmName(char.realm, (char.realmStage + 1) as Character['realmStage'])
    if (!best || eta < best._eta) {
      best = {
        _eta: eta,
        characterName: char.name,
        fromName: getRealmName(char.realm, char.realmStage),
        toName,
        isMajor,
        etaSeconds: eta,
        spiritRatio: snapshot.spiritRatio,
      }
    }
  }
  return best
}

export interface MilestoneForecast {
  buildingName: string
  currentLevel: number
  targetLevel: number
  milestoneName: string
  milestoneDesc: string
  stonesNeeded: number
  etaSeconds: number
}

/** 距离最近的可达成建筑里程碑前瞻。 */
export function forecastNextMilestone(sect: Sect): MilestoneForecast | null {
  const income = getApproxStoneIncome(sect)
  let best: MilestoneForecast | null = null

  for (const building of sect.buildings) {
    if (!building.unlocked || building.level <= 0) continue
    const next = getNextMilestone(building.type, building.level)
    if (!next) continue

    const def = GENERATOR_SPECS[building.type as keyof typeof GENERATOR_SPECS]
    let stonesNeeded = 0
    if (def) {
      for (let lv = building.level; lv < next.level; lv++) {
        stonesNeeded += safeExpCost(def.baseCost, def.growth, lv)
      }
    } else {
      // 服务型建筑沿用多项式成本的近似（无 GENERATOR_SPEC）
      stonesNeeded = next.level * 200
    }
    const eta = income > 0 ? stonesNeeded / income : Infinity
    const defName = building.type === 'spiritField' ? '灵田' : building.type === 'spiritMine' ? '灵矿' : building.type

    if (!best || eta < best.etaSeconds) {
      best = {
        buildingName: defName,
        currentLevel: building.level,
        targetLevel: next.level,
        milestoneName: next.name,
        milestoneDesc: next.description,
        stonesNeeded,
        etaSeconds: eta,
      }
    }
  }
  return best
}

/** 人性化时长：30-90 秒会话里一眼读懂的粒度。 */
export function formatEta(seconds: number): string {
  if (!Number.isFinite(seconds)) return '无法预估'
  if (seconds < 60) return '1 分钟内'
  const minutes = seconds / 60
  if (minutes < 60) return `约 ${Math.ceil(minutes)} 分钟`
  const hours = minutes / 60
  if (hours < 24) return `约 ${Math.ceil(hours)} 小时`
  const days = hours / 24
  if (days <= 30) return `约 ${Math.ceil(days)} 天`
  return '30 天以上'
}

/** 弟子灵气需求（境界感知）——前瞻卡解释"为什么慢"。 */
export function getSectSpiritDemandPerSecond(sect: Sect): number {
  return sect.characters
    .filter((c) => c.status === 'idle')
    .reduce((sum, c) => sum + calcSpiritCostPerSecond(c.realm), 0)
}
