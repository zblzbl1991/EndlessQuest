import type { Talent, TalentRarity } from '../types/talent'

export const ALL_TALENTS: Talent[] = [
  // === Common (15) ===
  {
    id: 'wugu',
    name: '武骨',
    description: '天生骨骼惊奇，近身搏击时力道更猛，攻击力有所增益。',
    effect: [{ stat: 'atk', value: 3 }],
    rarity: 'common',
  },
  {
    id: 'tiebi',
    name: '铁壁',
    description: '皮肉坚韧如铁，寻常兵刃难伤，防御力稳固。',
    effect: [{ stat: 'def', value: 2 }],
    rarity: 'common',
  },
  {
    id: 'feiying',
    name: '飞影',
    description: '身法轻盈，行动迅捷如飞，出手速度优于常人。',
    effect: [{ stat: 'spd', value: 2 }],
    rarity: 'common',
  },
  {
    id: 'huixin_combat',
    name: '会心',
    description: '直觉敏锐，能抓住对手的破绽一击致命。',
    effect: [{ stat: 'crit', value: 0.03 }],
    rarity: 'common',
  },
  {
    id: 'shayi',
    name: '杀意',
    description: '战斗时杀气外溢，致命一击的威力更强。',
    effect: [{ stat: 'critDmg', value: 0.2 }],
    rarity: 'common',
  },
  {
    id: 'lingxin',
    name: '灵心',
    description: '丹田宽广，灵力容量超群，持久战中不易枯竭。',
    effect: [{ stat: 'maxSpiritPower', value: 20 }],
    rarity: 'common',
  },
  {
    id: 'jingangti',
    name: '金刚体',
    description: '体魄异常壮硕，生命力旺盛，能承受更多伤害。',
    effect: [{ stat: 'hp', value: 8 }],
    rarity: 'common',
  },
  {
    id: 'minjie',
    name: '敏捷',
    description: '反应极快，身形灵活，出手与闪避皆优于常人。',
    effect: [
      { stat: 'spd', value: 1 },
      { stat: 'crit', value: 0.01 },
    ],
    rarity: 'common',
  },
  {
    id: 'tongling',
    name: '通灵',
    description: '与灵气亲和，冥想时更易入定，修炼效率略增。',
    effect: [{ stat: 'spiritualRoot', value: 2 }],
    rarity: 'common',
  },
  {
    id: 'mingrui',
    name: '敏锐',
    description: '五感超群，洞察力极强，能更快领悟功法奥妙。',
    effect: [{ stat: 'comprehension', value: 2 }],
    rarity: 'common',
  },
  {
    id: 'jiaqiang',
    name: '坚韧',
    description: '意志坚韧不拔，受伤后仍能坚持战斗，生命略有增益。',
    effect: [
      { stat: 'hp', value: 5 },
      { stat: 'def', value: 1 },
    ],
    rarity: 'common',
  },
  {
    id: 'lieyan_zhi',
    name: '烈焰志',
    description: '心如烈火，攻击时更具侵略性，攻击力微增。',
    effect: [{ stat: 'atk', value: 2 }],
    rarity: 'common',
  },
  {
    id: 'hanlin',
    name: '寒凛',
    description: '气息冷冽如冰，攻守之间带有一丝寒意。',
    effect: [
      { stat: 'def', value: 1 },
      { stat: 'atk', value: 1 },
    ],
    rarity: 'common',
  },
  {
    id: 'fuxing',
    name: '福星',
    description: '运势较好，偶尔能遇到意外收获。',
    effect: [{ stat: 'fortune', value: 2 }],
    rarity: 'common',
  },
  {
    id: 'zhuanzhu',
    name: '专注',
    description: '心无旁骛，修炼时不易走神，暴击伤害微增。',
    effect: [{ stat: 'critDmg', value: 0.1 }],
    rarity: 'common',
  },

  // === Rare (10) ===
  {
    id: 'tianmai',
    name: '天脉',
    description: '经脉天生通畅，灵力流转顺畅，灵根远超常人。',
    effect: [{ stat: 'spiritualRoot', value: 5 }],
    rarity: 'rare',
  },
  {
    id: 'huixin',
    name: '慧心',
    description: '悟性非凡，参悟功法事半功倍，天资聪颖之人。',
    effect: [{ stat: 'comprehension', value: 5 }],
    rarity: 'rare',
  },
  {
    id: 'qiyun',
    name: '气运',
    description: '天生福缘深厚，好运常伴左右，机遇不断。',
    effect: [{ stat: 'fortune', value: 5 }],
    rarity: 'rare',
  },
  {
    id: 'xianti',
    name: '仙体',
    description: '体质近乎仙人，生命力极为旺盛，远超凡人之躯。',
    effect: [{ stat: 'hp', value: 15 }],
    rarity: 'rare',
  },
  {
    id: 'pozhan',
    name: '破阵',
    description: '天生对弱点感知敏锐，攻击时更容易击中要害。',
    effect: [
      { stat: 'atk', value: 4 },
      { stat: 'crit', value: 0.02 },
    ],
    rarity: 'rare',
  },
  {
    id: 'fengxing',
    name: '风行',
    description: '如风般飘忽不定，速度极快，攻击时快人一步。',
    effect: [{ stat: 'spd', value: 4 }],
    rarity: 'rare',
  },
  {
    id: 'tiegu',
    name: '铁骨',
    description: '骨骼坚硬如铁，防御力大增，寻常攻击难以伤其根本。',
    effect: [
      { stat: 'def', value: 4 },
      { stat: 'hp', value: 8 },
    ],
    rarity: 'rare',
  },
  {
    id: 'mingxin',
    name: '明心',
    description: '心境澄明如镜，修炼时更易顿悟，灵力上限亦有所提升。',
    effect: [
      { stat: 'comprehension', value: 3 },
      { stat: 'maxSpiritPower', value: 15 },
    ],
    rarity: 'rare',
  },
  {
    id: 'shashen',
    name: '杀神',
    description: '战斗时杀意更浓，暴击伤害显著提升。',
    effect: [{ stat: 'critDmg', value: 0.35 }],
    rarity: 'rare',
  },
  {
    id: 'lingyuan',
    name: '灵源',
    description: '体内灵力充沛，灵力上限大幅提升，持久战优势明显。',
    effect: [{ stat: 'maxSpiritPower', value: 35 }],
    rarity: 'rare',
  },

  // === Epic (5) ===
  {
    id: 'taiji',
    name: '太极',
    description: '阴阳调和，道韵天成，灵根与悟性皆远超同辈。',
    effect: [
      { stat: 'spiritualRoot', value: 8 },
      { stat: 'comprehension', value: 3 },
    ],
    rarity: 'epic',
  },
  {
    id: 'busizun',
    name: '不死尊',
    description: '命硬如铁，生命力极其旺盛，纵使重伤亦可恢复如初。',
    effect: [
      { stat: 'hp', value: 30 },
      { stat: 'def', value: 5 },
    ],
    rarity: 'epic',
  },
  {
    id: 'tiandao',
    name: '天道',
    description: '天选之人，气运加身，命途坦荡，万事顺遂。',
    effect: [
      { stat: 'fortune', value: 8 },
      { stat: 'comprehension', value: 4 },
    ],
    rarity: 'epic',
  },
  {
    id: 'zhanhun',
    name: '战魂',
    description: '前世为战场英灵转世，战斗天赋极强，攻速兼备。',
    effect: [
      { stat: 'atk', value: 6 },
      { stat: 'spd', value: 3 },
      { stat: 'crit', value: 0.03 },
    ],
    rarity: 'epic',
  },
  {
    id: 'xuanming',
    name: '玄冥',
    description: '体内蕴含玄冥之力，灵根深厚，防御坚韧，攻守兼备。',
    effect: [
      { stat: 'spiritualRoot', value: 6 },
      { stat: 'def', value: 4 },
      { stat: 'hp', value: 12 },
    ],
    rarity: 'epic',
  },
]

const talentById = new Map<string, Talent>(ALL_TALENTS.map((t) => [t.id, t]))

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
