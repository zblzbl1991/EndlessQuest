import type { Talent, TalentRarity } from '../types/talent'

export const ALL_TALENTS: Talent[] = [
  // === Common (6) ===
  {
    id: 'wugu',
    name: '武骨',
    description: '攻击+3',
    effect: [{ stat: 'atk', value: 3 }],
    rarity: 'common',
  },
  {
    id: 'tiebi',
    name: '铁壁',
    description: '防御+2',
    effect: [{ stat: 'def', value: 2 }],
    rarity: 'common',
  },
  {
    id: 'feiying',
    name: '飞影',
    description: '速度+2',
    effect: [{ stat: 'spd', value: 2 }],
    rarity: 'common',
  },
  {
    id: 'huixin_combat',
    name: '会心',
    description: '暴击率+3%',
    effect: [{ stat: 'crit', value: 0.03 }],
    rarity: 'common',
  },
  {
    id: 'shayi',
    name: '杀意',
    description: '暴击伤害+20%',
    effect: [{ stat: 'critDmg', value: 0.2 }],
    rarity: 'common',
  },
  {
    id: 'lingxin',
    name: '灵心',
    description: '灵力上限+20',
    effect: [{ stat: 'maxSpiritPower', value: 20 }],
    rarity: 'common',
  },

  // === Rare (4) ===
  {
    id: 'tianmai',
    name: '天脉',
    description: '灵根+5',
    effect: [{ stat: 'spiritualRoot', value: 5 }],
    rarity: 'rare',
  },
  {
    id: 'huixin',
    name: '慧心',
    description: '悟性+5',
    effect: [{ stat: 'comprehension', value: 5 }],
    rarity: 'rare',
  },
  {
    id: 'qiyun',
    name: '气运',
    description: '气运+5',
    effect: [{ stat: 'fortune', value: 5 }],
    rarity: 'rare',
  },
  {
    id: 'xianti',
    name: '仙体',
    description: '生命+15',
    effect: [{ stat: 'hp', value: 15 }],
    rarity: 'rare',
  },

  // === Epic (2) ===
  {
    id: 'taiji',
    name: '太极',
    description: '灵根+8, 悟性+3',
    effect: [{ stat: 'spiritualRoot', value: 8 }, { stat: 'comprehension', value: 3 }],
    rarity: 'epic',
  },
  {
    id: 'busizun',
    name: '不死尊',
    description: '生命+30, 防御+5',
    effect: [{ stat: 'hp', value: 30 }, { stat: 'def', value: 5 }],
    rarity: 'epic',
  },
]

const talentById = new Map<string, Talent>(ALL_TALENTS.map(t => [t.id, t]))

export function getTalentById(id: string): Talent | undefined {
  return talentById.get(id)
}

export function getTalentsByRarity(): Record<TalentRarity, Talent[]> {
  const result: Record<TalentRarity, Talent[]> = {
    common: [],
    rare: [],
    epic: [],
  }
  for (const talent of ALL_TALENTS) {
    result[talent.rarity].push(talent)
  }
  return result
}
