import type { Technique } from '../types/technique'

/**
 * All 12 techniques organized by tier.
 *
 * fixedBonuses are stored in order of their comprehension threshold:
 *   threshold = comprehensionNeeded (technique index in the bonuses array + 1)
 *   Each technique has at most 2 bonuses at 30% and 70% of its comprehensionDifficulty.
 *
 * comprehensionNeeded for bonus[i] = technique.comprehensionDifficulty * [0.3, 0.7][i]
 */

export const TECHNIQUES: Technique[] = [
  // ─── Mortal (凡品) — 3 techniques ──────────────────────────────
  {
    id: 'qingxin',
    name: '清心诀',
    description: '最基础的修炼功法，均衡提升各项能力，适合初入修途之人。',
    tier: 'mortal',
    element: 'neutral',
    growthModifiers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, crit: 1.0, critDmg: 1.0 },
    fixedBonuses: [],
    requirements: { minRealm: 0, minComprehension: 5 },
    comprehensionDifficulty: 1,
  },
  {
    id: 'lieyan',
    name: '烈焰心法',
    description: '以烈焰之力淬炼经脉，攻击大幅提升，防御略有下降。',
    tier: 'mortal',
    element: 'fire',
    growthModifiers: { hp: 0.9, atk: 1.3, def: 0.9, spd: 1.0, crit: 1.1, critDmg: 1.1 },
    fixedBonuses: [
      { type: 'atk', value: 5 },   // 30% comprehension threshold
    ],
    requirements: { minRealm: 0, minComprehension: 8 },
    comprehensionDifficulty: 1,
  },
  {
    id: 'houtu',
    name: '厚土诀',
    description: '汲取大地之力强化肉身，生命与防御大幅提升，速度略减。',
    tier: 'mortal',
    element: 'neutral',
    growthModifiers: { hp: 1.3, atk: 0.8, def: 1.3, spd: 0.9, crit: 0.9, critDmg: 1.0 },
    fixedBonuses: [
      { type: 'hp', value: 50 },   // 30% comprehension threshold
    ],
    requirements: { minRealm: 0, minComprehension: 8 },
    comprehensionDifficulty: 1,
  },

  // ─── Spirit (灵品) — 3 techniques ─────────────────────────────
  {
    id: 'fentian',
    name: '焚天诀',
    description: '烈焰心法的进阶功法，焚尽万物，攻击力极高。',
    tier: 'spirit',
    element: 'fire',
    growthModifiers: { hp: 0.7, atk: 1.8, def: 0.6, spd: 1.1, crit: 1.4, critDmg: 1.3 },
    fixedBonuses: [
      { type: 'atk', value: 15 },    // 30% comprehension threshold
      { type: 'crit', value: 0.05 },  // 70% comprehension threshold
    ],
    requirements: { minRealm: 1, minComprehension: 12 },
    comprehensionDifficulty: 2,
  },
  {
    id: 'xuanbing',
    name: '玄冰诀',
    description: '以玄冰之力护体，防御与生命极强，攻击较弱。',
    tier: 'spirit',
    element: 'ice',
    growthModifiers: { hp: 1.5, atk: 0.6, def: 1.8, spd: 0.8, crit: 0.7, critDmg: 1.0 },
    fixedBonuses: [
      { type: 'def', value: 10 },   // 30% comprehension threshold
      { type: 'hp', value: 100 },   // 70% comprehension threshold
    ],
    requirements: { minRealm: 1, minComprehension: 12 },
    comprehensionDifficulty: 2,
  },
  {
    id: 'leiyu',
    name: '雷御诀',
    description: '引雷电之力驾驭全身，速度极快，修炼效率提升。',
    tier: 'spirit',
    element: 'lightning',
    growthModifiers: { hp: 0.9, atk: 1.0, def: 0.8, spd: 1.8, crit: 1.1, critDmg: 1.1 },
    fixedBonuses: [
      { type: 'spd', value: 8 },           // 30% comprehension threshold
      { type: 'cultivationRate', value: 0.1 },  // 70% comprehension threshold
    ],
    requirements: { minRealm: 1, minComprehension: 12 },
    comprehensionDifficulty: 2,
  },

  // ─── Immortal (仙品) — 3 techniques ──────────────────────────
  {
    id: 'leishen',
    name: '雷神体',
    description: '雷御诀的进阶体修功法，速度与暴击极强，如雷神降世。',
    tier: 'immortal',
    element: 'lightning',
    growthModifiers: { hp: 0.8, atk: 1.2, def: 0.9, spd: 1.8, crit: 1.5, critDmg: 1.4 },
    fixedBonuses: [
      { type: 'spd', value: 15 },     // 30% comprehension threshold
      { type: 'crit', value: 0.08 },   // 70% comprehension threshold
    ],
    requirements: { minRealm: 2, minComprehension: 18 },
    comprehensionDifficulty: 3,
  },
  {
    id: 'bumiejinshen',
    name: '不灭金身',
    description: '传说中的体修绝学，肉身几乎不灭，生命与防御极强。',
    tier: 'immortal',
    element: 'neutral',
    growthModifiers: { hp: 1.8, atk: 0.8, def: 1.6, spd: 0.7, crit: 0.8, critDmg: 1.0 },
    fixedBonuses: [
      { type: 'hp', value: 200 },    // 30% comprehension threshold
      { type: 'def', value: 15 },    // 70% comprehension threshold
    ],
    requirements: { minRealm: 2, minComprehension: 18 },
    comprehensionDifficulty: 3,
  },
  {
    id: 'jiuzhuan',
    name: '九转轮回',
    description: '轮回之力加持，各项属性均衡提升，攻守兼备。',
    tier: 'immortal',
    element: 'neutral',
    growthModifiers: { hp: 1.2, atk: 1.2, def: 1.2, spd: 1.2, crit: 1.2, critDmg: 1.2 },
    fixedBonuses: [
      { type: 'hp', value: 100 },    // 30% comprehension threshold
      { type: 'atk', value: 10 },    // 70% comprehension threshold
    ],
    requirements: { minRealm: 2, minComprehension: 18 },
    comprehensionDifficulty: 3,
  },

  // ─── Divine (神品) — 2 techniques ─────────────────────────────
  {
    id: 'wanjianguizong',
    name: '万剑归宗',
    description: '万剑齐发毁天灭地，攻击力无与伦比。',
    tier: 'divine',
    element: 'neutral',
    growthModifiers: { hp: 0.6, atk: 2.0, def: 0.5, spd: 1.2, crit: 1.6, critDmg: 1.5 },
    fixedBonuses: [
      { type: 'atk', value: 30 },     // 30% comprehension threshold
      { type: 'crit', value: 0.1 },   // 70% comprehension threshold
    ],
    requirements: { minRealm: 3, minComprehension: 25 },
    comprehensionDifficulty: 4,
  },
  {
    id: 'taishang',
    name: '太上忘情',
    description: '太上忘情，断绝七情六欲，各项属性均衡且极强。',
    tier: 'divine',
    element: 'ice',
    growthModifiers: { hp: 1.3, atk: 1.3, def: 1.3, spd: 1.3, crit: 1.3, critDmg: 1.3 },
    fixedBonuses: [
      { type: 'hp', value: 20 },     // 30% comprehension threshold
      { type: 'atk', value: 20 },    // 70% comprehension threshold
    ],
    requirements: { minRealm: 3, minComprehension: 25 },
    comprehensionDifficulty: 4,
  },

  // ─── Chaos (混沌品) — 1 technique ─────────────────────────────
  {
    id: 'hunduntiangong',
    name: '混沌天功',
    description: '传说中的混沌功法，天地初开时便已存在，得之者可逆天改命。',
    tier: 'chaos',
    element: 'neutral',
    growthModifiers: { hp: 1.5, atk: 1.5, def: 1.5, spd: 1.5, crit: 1.5, critDmg: 1.5 },
    fixedBonuses: [
      { type: 'hp', value: 50 },     // 30% comprehension threshold
      { type: 'atk', value: 50 },    // 70% comprehension threshold
    ],
    requirements: { minRealm: 4, minComprehension: 30 },
    comprehensionDifficulty: 5,
  },
]

export function getTechniqueById(id: string): Technique | undefined {
  return TECHNIQUES.find(t => t.id === id)
}

/**
 * Get the comprehension thresholds for a technique's fixed bonuses.
 * Returns an array of comprehension values needed to unlock each bonus.
 * Bonus 0 requires comprehensionDifficulty * 0.3
 * Bonus 1 requires comprehensionDifficulty * 0.7
 */
export function getBonusThresholds(technique: Technique): number[] {
  const thresholds: number[] = []
  if (technique.fixedBonuses.length >= 1) {
    thresholds.push(technique.comprehensionDifficulty * 0.3)
  }
  if (technique.fixedBonuses.length >= 2) {
    thresholds.push(technique.comprehensionDifficulty * 0.7)
  }
  return thresholds
}

/**
 * Get active fixed bonuses for a technique based on current comprehension level.
 */
export function getActiveBonuses(
  technique: Technique,
  comprehension: number,
): Array<{ type: string; value: number }> {
  const thresholds = getBonusThresholds(technique)
  return technique.fixedBonuses.filter((_, i) => comprehension >= thresholds[i])
}
