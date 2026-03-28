/**
 * Blessings are run-build modifiers that enhance the team during a dungeon run.
 * Each blessing has a directional effect, not a generic stat buff.
 */

export type BlessingEffectType =
  | 'atkBoost'      // Increase attack power
  | 'critBoost'     // Increase crit chance
  | 'spiritRegen'   // Increase spirit power regeneration
  | 'hpBoost'       // Increase max HP
  | 'defBoost'      // Increase defense
  | 'healOnKill'    // Heal when defeating an enemy
  | 'lootBonus'     // Increase loot quality

export interface Blessing {
  id: string
  name: string
  description: string
  effectType: BlessingEffectType
  /** Per-stack value for the effect (e.g., 0.1 = 10% per stack) */
  value: number
  /** Maximum number of stacks allowed */
  maxStacks: number
}

export const BLESSINGS: Blessing[] = [
  {
    id: 'flame_heart',
    name: '烈焰之心',
    description: '攻击提升 15%',
    effectType: 'atkBoost',
    value: 0.15,
    maxStacks: 3,
  },
  {
    id: 'thunder_pulse',
    name: '雷脉',
    description: '暴击率提升 8%',
    effectType: 'critBoost',
    value: 0.08,
    maxStacks: 3,
  },
  {
    id: 'spirit_spring',
    name: '灵泉',
    description: '每回合灵力恢复 +5',
    effectType: 'spiritRegen',
    value: 5,
    maxStacks: 2,
  },
  {
    id: 'iron_body',
    name: '铁骨',
    description: '气血上限提升 20%',
    effectType: 'hpBoost',
    value: 0.2,
    maxStacks: 3,
  },
  {
    id: 'mountain_shield',
    name: '山岳之盾',
    description: '防御提升 15%',
    effectType: 'defBoost',
    value: 0.15,
    maxStacks: 3,
  },
  {
    id: 'bloodthirst',
    name: '嗜血',
    description: '击杀敌人后回复 10% 气血',
    effectType: 'healOnKill',
    value: 0.1,
    maxStacks: 2,
  },
  {
    id: 'golden_touch',
    name: '点金手',
    description: '战斗奖励提升 20%',
    effectType: 'lootBonus',
    value: 0.2,
    maxStacks: 2,
  },
  {
    id: 'frost_blade',
    name: '寒刃',
    description: '攻击提升 10%，防御提升 10%',
    effectType: 'atkBoost',
    value: 0.1,
    maxStacks: 2,
  },
  {
    id: 'void_eye',
    name: '虚空之眼',
    description: '暴击率提升 5%，暴击伤害提升 20%',
    effectType: 'critBoost',
    value: 0.05,
    maxStacks: 2,
  },
  {
    id: 'dragon_breath',
    name: '龙息',
    description: '攻击提升 25%，但防御降低 10%',
    effectType: 'atkBoost',
    value: 0.25,
    maxStacks: 1,
  },
]

/** Look up a blessing by its id */
export function getBlessingById(id: string): Blessing | undefined {
  return BLESSINGS.find(b => b.id === id)
}

/** Pick N random blessings (no duplicates) for an event reward choice */
export function pickRandomBlessings(count: number): Blessing[] {
  const shuffled = [...BLESSINGS].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}
