export interface TargetableUnit {
  id: string
  hp: number
  maxHp: number
  aggro: number
}

/** Select target for attack skills: highest aggro */
export function selectAttackTarget(enemies: TargetableUnit[]): string | null {
  const alive = enemies.filter((e) => e.hp > 0)
  if (alive.length === 0) return null
  return alive.reduce((a, b) => (a.aggro >= b.aggro ? a : b)).id
}

/** Select target for support/heal skills: lowest HP% */
export function selectSupportTarget(allies: TargetableUnit[]): string | null {
  const alive = allies.filter((a) => a.hp > 0)
  if (alive.length === 0) return null
  return alive.reduce((a, b) => (a.hp / a.maxHp <= b.hp / b.maxHp ? a : b)).id
}

/** Increase aggro on hit */
export function increaseAggro(currentAggro: number, isCrit: boolean): number {
  return currentAggro + (isCrit ? 2 : 1)
}
