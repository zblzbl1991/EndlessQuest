/**
 * Relics are rare rule-changing items found during dungeon runs.
 * They modify the combat rules in unique ways, not just stat buffs.
 */

export type RelicRule =
  | 'defBoost'        // Flat defense boost
  | 'critAlways'      // Guaranteed crit when HP is below a threshold
  | 'spiritShield'    // Absorb first N damage per combat
  | 'secondWind'      // Revive once with partial HP when killed
  | 'thorns'          // Reflect a fraction of damage back to attacker

export interface Relic {
  id: string
  name: string
  description: string
  rule: RelicRule
  /** Numeric parameter for the rule (e.g., defense amount, threshold fraction) */
  value: number
}

export const RELICS: Relic[] = [
  {
    id: 'jade_armor',
    name: '玉魄铠',
    description: '防御 +8',
    rule: 'defBoost',
    value: 8,
  },
  {
    id: 'mirror_shard',
    name: '幻镜碎片',
    description: '气血低于 30% 时，暴击必定触发',
    rule: 'critAlways',
    value: 0.3,
  },
  {
    id: 'spirit_barrier',
    name: '灵力屏障',
    description: '每场战斗开始时吸收前 20 点伤害',
    rule: 'spiritShield',
    value: 20,
  },
  {
    id: 'phoenix_feather',
    name: '凤羽',
    description: '首次阵亡时复活，恢复 30% 气血',
    rule: 'secondWind',
    value: 0.3,
  },
  {
    id: 'thorned_ring',
    name: '荆棘指环',
    description: '受到伤害时反弹 15% 给攻击者',
    rule: 'thorns',
    value: 0.15,
  },
]

/** Look up a relic by its id */
export function getRelicById(id: string): Relic | undefined {
  return RELICS.find(r => r.id === id)
}
