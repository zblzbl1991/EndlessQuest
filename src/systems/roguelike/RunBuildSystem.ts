import type { BlessingId, RelicId, Resources } from '../../types'
import type { RunBuildBiasContext } from '../../types/runBuild'
import type { CombatUnit } from '../combat/CombatEngine'
import type { DiscipleMutationId } from '../../data/discipleMutations'
import { getDiscipleMutationDef } from '../../data/discipleMutations'

const ALL_BLESSINGS: BlessingId[] = [
  'stoneHarvest',
  'verdantBounty',
  'ironBody',
  'galeStride',
  'battleFocus',
  'flame_heart',
  'iron_wall',
  'jade_pulse',
  'spirit_spring',
  'keen_eye',
  'reaper_mark',
  'golden_touch',
  'wind_step',
]

const ALL_RELICS: RelicId[] = [
  'jadeGourd',
  'merchantSeal',
  'warBanner',
  'mirror_shard',
  'jade_armor',
  'blood_vial',
  'golden_scale',
]

export interface RunBuild {
  blessings: Array<{ id: string; stacks?: number }>
  relics: Array<{ id: string }>
}

export type MutationMap = Record<string, DiscipleMutationId[]>

const LEGACY_BLESSING_MULTIPLIERS: Record<
  string,
  Partial<Pick<CombatUnit, 'atk' | 'def' | 'spd' | 'crit' | 'maxHp'>>
> = {
  flame_heart: { atk: 1.15 },
  iron_wall: { def: 1.15 },
  wind_step: { atk: 1.15 },
  jade_pulse: { maxHp: 1.12 },
  keen_eye: { crit: 0.05 },
}

const LEGACY_RELIC_MULTIPLIERS: Record<string, Partial<Pick<CombatUnit, 'atk' | 'def' | 'spd' | 'crit'>>> = {
  jade_armor: { def: 1.2 },
  mirror_shard: { crit: 0.04 },
}

const BLESSING_ROUTE_WEIGHTS: Record<
  NonNullable<RunBuildBiasContext['routeId']>,
  Partial<Record<BlessingId, number>>
> = {
  alchemy: { verdantBounty: 5, ironBody: 4, galeStride: 1, golden_touch: 3, jade_pulse: 2 },
  sword: { battleFocus: 5, galeStride: 4, stoneHarvest: 1, flame_heart: 3, wind_step: 2, keen_eye: 2 },
  beast: { galeStride: 4, stoneHarvest: 3, ironBody: 2, iron_wall: 2, reaper_mark: 2 },
}

const BLESSING_BUILDING_WEIGHTS: Partial<
  Record<string, { minLevel: number; weights: Partial<Record<BlessingId, number>> }>
> = {
  alchemyFurnace: { minLevel: 3, weights: { verdantBounty: 4, ironBody: 3, golden_touch: 2 } },
  forge: { minLevel: 3, weights: { battleFocus: 4, galeStride: 2, stoneHarvest: 1, flame_heart: 2, wind_step: 1 } },
  scriptureHall: { minLevel: 3, weights: { galeStride: 2, ironBody: 2, verdantBounty: 1, spirit_spring: 2 } },
  spiritField: { minLevel: 3, weights: { ironBody: 3, verdantBounty: 2, jade_pulse: 1 } },
  spiritMine: { minLevel: 3, weights: { stoneHarvest: 3, battleFocus: 1, keen_eye: 1 } },
}

export function getBlessingWeight(id: BlessingId, context: RunBuildBiasContext = {}): number {
  let weight = 1

  if (context.routeId) {
    weight += BLESSING_ROUTE_WEIGHTS[context.routeId]?.[id] ?? 0
  }

  for (const [buildingType, config] of Object.entries(BLESSING_BUILDING_WEIGHTS)) {
    if (!config) continue
    const level =
      context.buildingLevels?.[buildingType as keyof NonNullable<RunBuildBiasContext['buildingLevels']>] ?? 0
    if (level >= config.minLevel) {
      weight += config.weights[id] ?? 0
    }
  }

  return weight
}

export function pickBlessingOptions(
  ownedBlessings: BlessingId[],
  count = 3,
  rng: () => number = Math.random,
  context: RunBuildBiasContext = {}
): BlessingId[] {
  const pool = ALL_BLESSINGS.filter((id) => !ownedBlessings.includes(id))
  const picked: BlessingId[] = []
  while (pool.length > 0 && picked.length < count) {
    const weighted = pool
      .map((id) => ({ id, weight: getBlessingWeight(id, context) }))
      .sort((a, b) => b.weight - a.weight || ALL_BLESSINGS.indexOf(a.id) - ALL_BLESSINGS.indexOf(b.id))
    const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0)
    let roll = rng() * totalWeight
    let selected = weighted[weighted.length - 1]?.id ?? pool[0]

    for (const entry of weighted) {
      roll -= entry.weight
      if (roll <= 0) {
        selected = entry.id
        break
      }
    }

    picked.push(selected)
    pool.splice(pool.indexOf(selected), 1)
  }
  return picked
}

export function pickRelicReward(ownedRelics: RelicId[], rng: () => number = Math.random): RelicId | null {
  const pool = ALL_RELICS.filter((id) => !ownedRelics.includes(id))
  if (pool.length === 0) return null
  return pool[Math.floor(rng() * pool.length)]
}

export function applyRunRewardModifiers(reward: Resources, blessings: BlessingId[], relics: RelicId[]): Resources {
  let spiritStoneMult = 1
  let herbMult = 1

  if (blessings.includes('stoneHarvest')) spiritStoneMult *= 1.3
  if (blessings.includes('verdantBounty')) herbMult *= 1.3
  if (relics.includes('warBanner')) spiritStoneMult *= 1.1
  if (blessings.includes('golden_touch')) {
    spiritStoneMult *= 1.2
    herbMult *= 1.2
  }
  if (relics.includes('golden_scale')) spiritStoneMult *= 1.25

  return {
    ...reward,
    spiritStone: Math.floor((reward.spiritStone || 0) * spiritStoneMult),
    herb: Math.floor((reward.herb || 0) * herbMult),
  }
}

export function applyMutationRewardModifiers(reward: Resources, mutationIds: DiscipleMutationId[]): Resources {
  let spiritStoneMult = 1
  let herbMult = 1
  let oreMult = 1

  for (const mutationId of mutationIds) {
    const mutation = getDiscipleMutationDef(mutationId)
    spiritStoneMult += mutation.reward.spiritStone ?? 0
    herbMult += mutation.reward.herb ?? 0
    oreMult += mutation.reward.ore ?? 0
  }

  return {
    ...reward,
    spiritStone: Math.floor((reward.spiritStone || 0) * spiritStoneMult),
    herb: Math.floor((reward.herb || 0) * herbMult),
    ore: Math.floor((reward.ore || 0) * oreMult),
  }
}

export function applyRunCombatModifiers(unit: CombatUnit, blessings: BlessingId[], relics: RelicId[]): CombatUnit {
  let atkMult = 1
  let defMult = 1
  let spdMult = 1

  if (blessings.includes('battleFocus')) atkMult *= 1.15
  if (blessings.includes('galeStride')) spdMult *= 1.15
  if (blessings.includes('flame_heart')) atkMult *= 1.15
  if (blessings.includes('wind_step')) atkMult *= 1.15
  if (blessings.includes('iron_wall')) defMult *= 1.15
  if (relics.includes('warBanner')) {
    atkMult *= 1.1
    defMult *= 1.1
  }
  if (relics.includes('jade_armor')) defMult *= 1.2

  // hpBoost: increase maxHp
  let maxHpMult = 1
  if (blessings.includes('jade_pulse')) maxHpMult *= 1.12

  // critBoost: flat crit addition
  let critBonus = 0
  if (blessings.includes('keen_eye')) critBonus += 0.05
  if (relics.includes('mirror_shard')) critBonus += 0.04

  const newMaxHp = Math.floor(unit.maxHp * maxHpMult)

  // spiritRegen: extra spirit per combat turn
  const spiritRegenBonus = blessings.includes('spirit_spring') ? 5 : (unit.spiritRegenBonus ?? 0)

  // healOnKill: heal ratio of maxHp on enemy kill
  const healOnKillRatio = blessings.includes('reaper_mark') ? 0.1 : (unit.healOnKillRatio ?? 0)

  return {
    ...unit,
    atk: Math.floor(unit.atk * atkMult),
    def: Math.floor(unit.def * defMult),
    spd: Math.floor(unit.spd * spdMult),
    maxHp: newMaxHp,
    hp: Math.min(unit.hp, newMaxHp),
    crit: Math.min(1, unit.crit + critBonus),
    spiritRegenBonus,
    healOnKillRatio,
  }
}

export function applyMutationCombatModifiers(unit: CombatUnit, mutationIds: DiscipleMutationId[]): CombatUnit {
  let atkMult = 1
  let defMult = 1
  let spdMult = 1

  for (const mutationId of mutationIds) {
    const mutation = getDiscipleMutationDef(mutationId)
    atkMult += mutation.combat.atk ?? 0
    defMult += mutation.combat.def ?? 0
    spdMult += mutation.combat.spd ?? 0
  }

  return {
    ...unit,
    atk: Math.floor(unit.atk * atkMult),
    def: Math.floor(unit.def * defMult),
    spd: Math.floor(unit.spd * spdMult),
  }
}

export function applyRunRecovery(currentHp: number, maxHp: number, blessings: BlessingId[], relics: RelicId[]): number {
  let healRatio = 0
  if (blessings.includes('ironBody')) healRatio += 0.06
  if (relics.includes('jadeGourd')) healRatio += 0.04
  if (relics.includes('blood_vial')) healRatio += 0.08
  return Math.min(maxHp, currentHp + Math.floor(maxHp * healRatio))
}

/** Check whether the team has the healOnKill blessing (reaper_mark). */
export function hasHealOnKill(blessings: BlessingId[]): boolean {
  return blessings.includes('reaper_mark')
}

/** Apply healOnKill effect: heal 10% maxHp on enemy kill. */
export function applyHealOnKill(unit: CombatUnit, blessings: BlessingId[]): CombatUnit {
  if (!hasHealOnKill(blessings)) return unit
  const healAmount = Math.floor(unit.maxHp * 0.1)
  return { ...unit, hp: Math.min(unit.maxHp, unit.hp + healAmount) }
}

/** Check whether the team has the spiritRegen blessing (spirit_spring). */
export function hasSpiritRegen(blessings: BlessingId[]): boolean {
  return blessings.includes('spirit_spring')
}

/** Return the per-turn spirit power bonus from spiritRegen blessing. */
export function getSpiritRegenBonus(blessings: BlessingId[]): number {
  if (!hasSpiritRegen(blessings)) return 0
  return 5
}

export function getShopCostMultiplier(relics: RelicId[]): number {
  return relics.includes('merchantSeal') ? 0.8 : 1
}

export function applyRunBuild(units: CombatUnit[], build: RunBuild): CombatUnit[] {
  return units.map((unit) => {
    let atk = unit.atk
    let def = unit.def
    let spd = unit.spd
    let maxHp = unit.maxHp
    let crit = unit.crit

    for (const blessing of build.blessings) {
      const mods = LEGACY_BLESSING_MULTIPLIERS[blessing.id]
      if (!mods) continue
      if (mods.atk) atk = Math.floor(atk * mods.atk)
      if (mods.def) def = Math.floor(def * mods.def)
      if (mods.spd) spd = Math.floor(spd * mods.spd)
      if (mods.maxHp) maxHp = Math.floor(maxHp * mods.maxHp)
      if (mods.crit) crit = Math.min(1, crit + mods.crit)
    }

    for (const relic of build.relics) {
      const mods = LEGACY_RELIC_MULTIPLIERS[relic.id]
      if (!mods) continue
      if (mods.atk) atk = Math.floor(atk * mods.atk)
      if (mods.def) def = Math.floor(def * mods.def)
      if (mods.spd) spd = Math.floor(spd * mods.spd)
      if (mods.crit) crit = Math.min(1, crit + mods.crit)
    }

    return {
      ...unit,
      atk,
      def,
      spd,
      maxHp,
      hp: Math.min(unit.hp, maxHp),
      crit,
    }
  })
}
