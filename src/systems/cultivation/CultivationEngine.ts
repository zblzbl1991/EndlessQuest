import type { Player, BaseStats, RealmStage } from '../../types/player'
import { REALMS, getCultivationNeeded } from '../../data/realms'

// Base cultivation rate: 修为 per second
const BASE_CULTIVATION_RATE = 5

// Spirit energy cost per second during cultivation
const SPIRIT_COST_PER_SECOND = 2

// Realm difficulty multipliers (higher realms = harder to cultivate)
const REALM_CULTIVATION_MULT = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5]

// Stat growth per sub-level as fraction of major realm growth
const SUBLEVEL_STAT_FRACTION = 0.15

// Major realm stat multiplier
const MAJOR_REALM_STAT_MULT = 1.8

export interface TickResult {
  cultivationGained: number
  spiritSpent: number
  leveledUp: boolean
  newRealm: number
  newStage: RealmStage
}

export interface BreakthroughResult {
  success: boolean
  newRealm: number
  newStage: RealmStage
  oldStats: BaseStats
  newStats: BaseStats
}

export function calcCultivationRate(player: Player): number {
  const spiritualRoot = player.cultivationStats.spiritualRoot
  const rootBonus = 1 + (spiritualRoot - 10) * 0.02  // base 10 = +0%, each point +2%
  const realmMult = REALM_CULTIVATION_MULT[player.realm] ?? 0.5
  return BASE_CULTIVATION_RATE * rootBonus * realmMult
}

export function calcSpiritCostPerSecond(): number {
  return SPIRIT_COST_PER_SECOND
}

export function canCultivate(spiritEnergy: number): boolean {
  return spiritEnergy >= SPIRIT_COST_PER_SECOND
}

export function tick(
  player: Player,
  spiritEnergy: number,
  deltaSec: number
): TickResult {
  if (!canCultivate(spiritEnergy)) {
    return { cultivationGained: 0, spiritSpent: 0, leveledUp: false, newRealm: player.realm, newStage: player.realmStage }
  }

  const rate = calcCultivationRate(player)
  const gained = rate * deltaSec
  const spent = SPIRIT_COST_PER_SECOND * deltaSec

  // Check if we can level up
  const needed = getCultivationNeeded(player.realm, player.realmStage)
  let leveledUp = false
  let newRealm = player.realm
  let newStage = player.realmStage

  // Simple: just accumulate, breakthrough is a separate explicit action
  return { cultivationGained: gained, spiritSpent: spent, leveledUp, newRealm, newStage }
}

export function canBreakthrough(player: Player): boolean {
  const needed = getCultivationNeeded(player.realm, player.realmStage)
  return player.cultivation >= needed
}

function calcStatGrowth(currentStats: BaseStats, isMajorRealm: boolean): BaseStats {
  if (isMajorRealm) {
    return {
      hp: Math.floor(currentStats.hp * MAJOR_REALM_STAT_MULT),
      atk: Math.floor(currentStats.atk * MAJOR_REALM_STAT_MULT),
      def: Math.floor(currentStats.def * MAJOR_REALM_STAT_MULT),
      spd: Math.floor(currentStats.spd * MAJOR_REALM_STAT_MULT),
      crit: Math.min(currentStats.crit, 0.75),
      critDmg: currentStats.critDmg,
    }
  }

  // Sub-level: ~15% growth toward next major realm stats
  const nextRealmStats: BaseStats = {
    hp: Math.floor(currentStats.hp * MAJOR_REALM_STAT_MULT),
    atk: Math.floor(currentStats.atk * MAJOR_REALM_STAT_MULT),
    def: Math.floor(currentStats.def * MAJOR_REALM_STAT_MULT),
    spd: Math.floor(currentStats.spd * MAJOR_REALM_STAT_MULT),
    crit: currentStats.crit,
    critDmg: currentStats.critDmg,
  }

  const growth = (target: number, current: number) => {
    const diff = target - current
    return current + Math.floor(diff * SUBLEVEL_STAT_FRACTION)
  }

  return {
    hp: growth(nextRealmStats.hp, currentStats.hp),
    atk: growth(nextRealmStats.atk, currentStats.atk),
    def: growth(nextRealmStats.def, currentStats.def),
    spd: growth(nextRealmStats.spd, currentStats.spd),
    crit: currentStats.crit,
    critDmg: currentStats.critDmg,
  }
}

export function breakthrough(player: Player): BreakthroughResult {
  if (!canBreakthrough(player)) {
    return { success: false, newRealm: player.realm, newStage: player.realmStage, oldStats: player.baseStats, newStats: player.baseStats }
  }

  const oldStats = { ...player.baseStats }
  const realm = REALMS[player.realm]
  const nextStage = (player.realmStage + 1) as RealmStage
  const isMajorRealm = nextStage >= realm.stages.length

  const newStats = calcStatGrowth(oldStats, isMajorRealm)

  return {
    success: true,
    newRealm: isMajorRealm ? player.realm + 1 : player.realm,
    newStage: isMajorRealm ? 0 : nextStage,
    oldStats,
    newStats,
  }
}
