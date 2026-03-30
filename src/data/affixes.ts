import type { EnemyAffix } from '../types/adventure'

export interface AffixDef {
  id: EnemyAffix
  name: string
  description: string
  triggerChance: number // probability of appearing on elite/boss
}

export const AFFIX_DEFS: Record<EnemyAffix, AffixDef> = {
  berserk: { id: 'berserk', name: '狂暴', description: 'HP < 30% 时攻击力 +50%', triggerChance: 0.15 },
  shield: { id: 'shield', name: '护盾', description: '战斗开始获得 20% 最大HP护盾', triggerChance: 0.1 },
  spiritDrain: {
    id: 'spiritDrain',
    name: '灵力汲取',
    description: '每次攻击回复造成伤害 10% 的HP',
    triggerChance: 0.1,
  },
  swift: { id: 'swift', name: '疾行', description: '速度 +30%，每3回合额外攻击一次', triggerChance: 0.08 },
  tribulationBane: {
    id: 'tribulationBane',
    name: '雷劫',
    description: '攻击附带无视防御5%的额外伤害',
    triggerChance: 0.05,
  },
}

export function rollAffixes(pool: EnemyAffix[], count: number): EnemyAffix[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}
