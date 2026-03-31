import type { BlessingId, RelicId, Resources } from '../../types'
import type { CombatUnit } from '../combat/CombatEngine'

const ALL_BLESSINGS: BlessingId[] = ['stoneHarvest', 'verdantBounty', 'ironBody', 'galeStride', 'battleFocus']
const ALL_RELICS: RelicId[] = ['jadeGourd', 'merchantSeal', 'warBanner']

export interface RunBuild {
  blessings: Array<{ id: string; stacks?: number }>
  relics: Array<{ id: string }>
}

const LEGACY_BLESSING_MULTIPLIERS: Record<string, Partial<Pick<CombatUnit, 'atk' | 'def' | 'spd'>>> = {
  flame_heart: { atk: 1.2 },
  iron_wall: { def: 1.2 },
  wind_step: { spd: 1.15 },
}

const LEGACY_RELIC_MULTIPLIERS: Record<string, Partial<Pick<CombatUnit, 'atk' | 'def' | 'spd'>>> = {
  jade_armor: { def: 1.25 },
  mirror_shard: { atk: 1.1 },
}

export function pickBlessingOptions(
  ownedBlessings: BlessingId[],
  count = 3,
  rng: () => number = Math.random
): BlessingId[] {
  const pool = ALL_BLESSINGS.filter((id) => !ownedBlessings.includes(id))
  const picked: BlessingId[] = []
  while (pool.length > 0 && picked.length < count) {
    const index = Math.floor(rng() * pool.length)
    picked.push(pool.splice(index, 1)[0])
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

  return {
    ...reward,
    spiritStone: Math.floor(reward.spiritStone * spiritStoneMult),
    herb: Math.floor(reward.herb * herbMult),
  }
}

export function applyRunCombatModifiers(unit: CombatUnit, blessings: BlessingId[], relics: RelicId[]): CombatUnit {
  let atkMult = 1
  let defMult = 1
  let spdMult = 1

  if (blessings.includes('battleFocus')) atkMult *= 1.15
  if (blessings.includes('galeStride')) spdMult *= 1.15
  if (relics.includes('warBanner')) {
    atkMult *= 1.1
    defMult *= 1.1
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
  if (blessings.includes('ironBody')) healRatio += 0.12
  if (relics.includes('jadeGourd')) healRatio += 0.08
  return Math.min(maxHp, currentHp + Math.floor(maxHp * healRatio))
}

export function getShopCostMultiplier(relics: RelicId[]): number {
  return relics.includes('merchantSeal') ? 0.8 : 1
}

export function applyRunBuild(units: CombatUnit[], build: RunBuild): CombatUnit[] {
  return units.map((unit) => {
    let atk = unit.atk
    let def = unit.def
    let spd = unit.spd

    for (const blessing of build.blessings) {
      const mods = LEGACY_BLESSING_MULTIPLIERS[blessing.id]
      if (!mods) continue
      if (mods.atk) atk = Math.floor(atk * mods.atk)
      if (mods.def) def = Math.floor(def * mods.def)
      if (mods.spd) spd = Math.floor(spd * mods.spd)
    }

    for (const relic of build.relics) {
      const mods = LEGACY_RELIC_MULTIPLIERS[relic.id]
      if (!mods) continue
      if (mods.atk) atk = Math.floor(atk * mods.atk)
      if (mods.def) def = Math.floor(def * mods.def)
      if (mods.spd) spd = Math.floor(spd * mods.spd)
    }

    return {
      ...unit,
      atk,
      def,
      spd,
    }
  })
}
