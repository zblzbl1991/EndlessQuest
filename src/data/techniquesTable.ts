import type { Technique } from '../types/technique'

/**
 * All 12 techniques organized by tier.
 *
 * bonuses are flat additive stat bonuses — all active as soon as the technique
 * is learned (no comprehension thresholds).
 */

export const TECHNIQUES: Technique[] = [
  // ─── Mortal (凡品) — 3 techniques ──────────────────────────────
  {
    id: 'qingxin',
    name: '清心诀',
    description: '最基础的修炼功法，均衡提升各项能力，适合初入修途之人。',
    tier: 'mortal',
    element: 'neutral',
    bonuses: [
      { type: 'hp', value: 10 },
      { type: 'atk', value: 2 },
      { type: 'def', value: 2 },
      { type: 'spd', value: 1 },
    ],
    requirements: { minRealm: 0, minComprehension: 5 },
  },
  {
    id: 'lieyan',
    name: '烈焰心法',
    description: '以烈焰之力淬炼经脉，攻击大幅提升。',
    tier: 'mortal',
    element: 'fire',
    bonuses: [
      { type: 'atk', value: 5 },
      { type: 'crit', value: 0.02 },
    ],
    requirements: { minRealm: 0, minComprehension: 8 },
  },
  {
    id: 'houtu',
    name: '厚土诀',
    description: '汲取大地之力强化肉身，生命与防御大幅提升。',
    tier: 'mortal',
    element: 'neutral',
    bonuses: [
      { type: 'hp', value: 20 },
      { type: 'def', value: 4 },
    ],
    requirements: { minRealm: 0, minComprehension: 8 },
  },

  // ─── Spirit (灵品) — 3 techniques ─────────────────────────────
  {
    id: 'fentian',
    name: '焚天诀',
    description: '烈焰心法的进阶功法，焚尽万物，攻击力极高。',
    tier: 'spirit',
    element: 'fire',
    bonuses: [
      { type: 'atk', value: 12 },
      { type: 'crit', value: 0.03 },
      { type: 'critDmg', value: 0.1 },
    ],
    requirements: { minRealm: 1, minComprehension: 12 },
  },
  {
    id: 'xuanbing',
    name: '玄冰诀',
    description: '以玄冰之力护体，防御与生命极强，攻击较弱。',
    tier: 'spirit',
    element: 'ice',
    bonuses: [
      { type: 'hp', value: 40 },
      { type: 'def', value: 8 },
    ],
    requirements: { minRealm: 1, minComprehension: 12 },
  },
  {
    id: 'leiyu',
    name: '雷御诀',
    description: '引雷电之力驾驭全身，速度极快，修炼效率提升。',
    tier: 'spirit',
    element: 'lightning',
    bonuses: [
      { type: 'spd', value: 5 },
      { type: 'cultivationRate', value: 0.1 },
    ],
    requirements: { minRealm: 1, minComprehension: 12 },
  },

  // ─── Immortal (仙品) — 3 techniques ──────────────────────────
  {
    id: 'leishen',
    name: '雷神体',
    description: '雷御诀的进阶体修功法，速度与暴击极强，如雷神降世。',
    tier: 'immortal',
    element: 'lightning',
    bonuses: [
      { type: 'spd', value: 12 },
      { type: 'crit', value: 0.06 },
      { type: 'critDmg', value: 0.2 },
    ],
    requirements: { minRealm: 2, minComprehension: 18 },
  },
  {
    id: 'bumiejinshen',
    name: '不灭金身',
    description: '传说中的体修绝学，肉身几乎不灭，生命与防御极强。',
    tier: 'immortal',
    element: 'neutral',
    bonuses: [
      { type: 'hp', value: 80 },
      { type: 'def', value: 15 },
    ],
    requirements: { minRealm: 2, minComprehension: 18 },
  },
  {
    id: 'jiuzhuan',
    name: '九转轮回',
    description: '轮回之力加持，各项属性均衡提升，攻守兼备。',
    tier: 'immortal',
    element: 'neutral',
    bonuses: [
      { type: 'hp', value: 30 },
      { type: 'atk', value: 8 },
      { type: 'def', value: 8 },
      { type: 'spd', value: 5 },
    ],
    requirements: { minRealm: 2, minComprehension: 18 },
  },

  // ─── Divine (神品) — 2 techniques ─────────────────────────────
  {
    id: 'wanjianguizong',
    name: '万剑归宗',
    description: '万剑齐发毁天灭地，攻击力无与伦比。',
    tier: 'divine',
    element: 'neutral',
    bonuses: [
      { type: 'atk', value: 25 },
      { type: 'crit', value: 0.08 },
      { type: 'critDmg', value: 0.3 },
    ],
    requirements: { minRealm: 3, minComprehension: 25 },
  },
  {
    id: 'taishang',
    name: '太上忘情',
    description: '太上忘情，断绝七情六欲，各项属性均衡且极强。',
    tier: 'divine',
    element: 'ice',
    bonuses: [
      { type: 'hp', value: 40 },
      { type: 'atk', value: 15 },
      { type: 'def', value: 12 },
      { type: 'spd', value: 8 },
    ],
    requirements: { minRealm: 3, minComprehension: 25 },
  },

  // ─── Chaos (混沌品) — 1 technique ─────────────────────────────
  {
    id: 'hunduntiangong',
    name: '混沌天功',
    description: '传说中的混沌功法，天地初开时便已存在，得之者可逆天改命。',
    tier: 'chaos',
    element: 'neutral',
    bonuses: [
      { type: 'hp', value: 60 },
      { type: 'atk', value: 30 },
      { type: 'def', value: 20 },
      { type: 'spd', value: 15 },
      { type: 'crit', value: 0.1 },
      { type: 'critDmg', value: 0.4 },
    ],
    requirements: { minRealm: 4, minComprehension: 30 },
  },
]

export function getTechniqueById(id: string): Technique | undefined {
  return TECHNIQUES.find(t => t.id === id)
}
