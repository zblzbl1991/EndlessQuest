import type { TalentAffix, TalentAffixPosition, TalentAffixRarity } from '../types/talent'

export const TALENT_AFFIXES: TalentAffix[] = [
  // ========== PREFIX COMMON (15) ==========

  {
    id: 'prefix_common_wuti',
    name: '武体',
    position: 'prefix',
    rarity: 'common',
    description: '天生体质强健，近身搏击力道更猛。',
    effects: [{ type: 'flatStat', stat: 'atk', minValue: 2, maxValue: 5 }],
  },
  {
    id: 'prefix_common_tiebi',
    position: 'prefix',
    rarity: 'common',
    name: '铁壁',
    description: '皮肉坚韧如铁，寻常兵刃难伤。',
    effects: [{ type: 'flatStat', stat: 'def', minValue: 1, maxValue: 4 }],
  },
  {
    id: 'prefix_common_jifeng',
    name: '疾风',
    position: 'prefix',
    rarity: 'common',
    description: '身法轻盈如风，出手速度优于常人。',
    effects: [{ type: 'flatStat', stat: 'spd', minValue: 1, maxValue: 4 }],
  },
  {
    id: 'prefix_common_ruimu',
    name: '锐目',
    position: 'prefix',
    rarity: 'common',
    description: '目光锐利，能精准捕捉对手破绽。',
    effects: [{ type: 'flatStat', stat: 'crit', minValue: 0.02, maxValue: 0.05 }],
  },
  {
    id: 'prefix_common_shaxin',
    name: '杀心',
    position: 'prefix',
    rarity: 'common',
    description: '战斗时杀气外溢，致命一击更狠。',
    effects: [{ type: 'flatStat', stat: 'critDmg', minValue: 0.1, maxValue: 0.3 }],
  },
  {
    id: 'prefix_common_linghai',
    name: '灵海',
    position: 'prefix',
    rarity: 'common',
    description: '丹田宽广，灵力容量超群。',
    effects: [{ type: 'flatStat', stat: 'maxSpiritPower', minValue: 10, maxValue: 30 }],
  },
  {
    id: 'prefix_common_jingang',
    name: '金刚',
    position: 'prefix',
    rarity: 'common',
    description: '体魄壮硕，生命力旺盛。',
    effects: [{ type: 'flatStat', stat: 'hp', minValue: 5, maxValue: 15 }],
  },
  {
    id: 'prefix_common_lingqiao',
    name: '灵巧',
    position: 'prefix',
    rarity: 'common',
    description: '身形灵巧，反应敏捷，出手与闪避皆优。',
    effects: [
      { type: 'flatStat', stat: 'spd', minValue: 1, maxValue: 3 },
      { type: 'flatStat', stat: 'crit', minValue: 0.01, maxValue: 0.02 },
    ],
  },
  {
    id: 'prefix_common_tongling',
    name: '通灵',
    position: 'prefix',
    rarity: 'common',
    description: '与灵气亲和，冥想时更易入定。',
    effects: [{ type: 'flatStat', stat: 'spiritualRoot', minValue: 1, maxValue: 4 }],
  },
  {
    id: 'prefix_common_huijue',
    name: '慧觉',
    position: 'prefix',
    rarity: 'common',
    description: '悟性出众，洞察力极强。',
    effects: [{ type: 'flatStat', stat: 'comprehension', minValue: 1, maxValue: 4 }],
  },
  {
    id: 'prefix_common_jianren',
    name: '坚韧',
    position: 'prefix',
    rarity: 'common',
    description: '意志坚韧，受伤后仍能坚持战斗。',
    effects: [
      { type: 'flatStat', stat: 'hp', minValue: 3, maxValue: 10 },
      { type: 'flatStat', stat: 'def', minValue: 1, maxValue: 3 },
    ],
  },
  {
    id: 'prefix_common_lieyan',
    name: '烈焰',
    position: 'prefix',
    rarity: 'common',
    description: '心如烈火，攻击时更具侵略性。',
    effects: [{ type: 'flatStat', stat: 'atk', minValue: 1, maxValue: 4 }],
  },
  {
    id: 'prefix_common_bingxin',
    name: '冰心',
    position: 'prefix',
    rarity: 'common',
    description: '气息冷冽如冰，攻守兼备。',
    effects: [
      { type: 'flatStat', stat: 'def', minValue: 1, maxValue: 3 },
      { type: 'flatStat', stat: 'atk', minValue: 1, maxValue: 3 },
    ],
  },
  {
    id: 'prefix_common_fuyun',
    name: '福运',
    position: 'prefix',
    rarity: 'common',
    description: '运势较好，偶尔能遇到意外收获。',
    effects: [{ type: 'flatStat', stat: 'fortune', minValue: 1, maxValue: 4 }],
  },
  {
    id: 'prefix_common_zhuanzhu',
    name: '专注',
    position: 'prefix',
    rarity: 'common',
    description: '心无旁骛，暴击伤害微增。',
    effects: [{ type: 'flatStat', stat: 'critDmg', minValue: 0.05, maxValue: 0.15 }],
  },

  // ========== PREFIX RARE (12) ==========

  {
    id: 'prefix_rare_tianmai',
    name: '天脉',
    position: 'prefix',
    rarity: 'rare',
    description: '经脉天生通畅，灵力流转顺畅，灵根远超常人。',
    effects: [{ type: 'flatStat', stat: 'spiritualRoot', minValue: 3, maxValue: 8 }],
  },
  {
    id: 'prefix_rare_huixin',
    name: '慧心',
    position: 'prefix',
    rarity: 'rare',
    description: '悟性非凡，参悟功法事半功倍。',
    effects: [{ type: 'flatStat', stat: 'comprehension', minValue: 3, maxValue: 8 }],
  },
  {
    id: 'prefix_rare_tianyun',
    name: '天运',
    position: 'prefix',
    rarity: 'rare',
    description: '天生福缘深厚，好运常伴左右。',
    effects: [{ type: 'flatStat', stat: 'fortune', minValue: 3, maxValue: 8 }],
  },
  {
    id: 'prefix_rare_xianti',
    name: '仙体',
    position: 'prefix',
    rarity: 'rare',
    description: '体质近乎仙人，生命力极为旺盛。',
    effects: [{ type: 'flatStat', stat: 'hp', minValue: 10, maxValue: 25 }],
  },
  {
    id: 'prefix_rare_pozhan',
    name: '破阵',
    position: 'prefix',
    rarity: 'rare',
    description: '天生对弱点感知敏锐，攻击更易击中要害。',
    effects: [
      { type: 'flatStat', stat: 'atk', minValue: 3, maxValue: 7 },
      { type: 'flatStat', stat: 'crit', minValue: 0.01, maxValue: 0.03 },
    ],
  },
  {
    id: 'prefix_rare_fengxing',
    name: '风行',
    position: 'prefix',
    rarity: 'rare',
    description: '如风般飘忽不定，速度极快。',
    effects: [{ type: 'flatStat', stat: 'spd', minValue: 3, maxValue: 7 }],
  },
  {
    id: 'prefix_rare_tiegu',
    name: '铁骨',
    position: 'prefix',
    rarity: 'rare',
    description: '骨骼坚硬如铁，防御力大增。',
    effects: [
      { type: 'flatStat', stat: 'def', minValue: 3, maxValue: 6 },
      { type: 'flatStat', stat: 'hp', minValue: 5, maxValue: 12 },
    ],
  },
  {
    id: 'prefix_rare_mingxin',
    name: '明心',
    position: 'prefix',
    rarity: 'rare',
    description: '心境澄明如镜，修炼时更易顿悟。',
    effects: [
      { type: 'flatStat', stat: 'comprehension', minValue: 2, maxValue: 5 },
      { type: 'flatStat', stat: 'maxSpiritPower', minValue: 10, maxValue: 20 },
    ],
  },
  {
    id: 'prefix_rare_shashen',
    name: '杀神',
    position: 'prefix',
    rarity: 'rare',
    description: '战斗时杀意更浓，暴击伤害显著提升。',
    effects: [{ type: 'flatStat', stat: 'critDmg', minValue: 0.2, maxValue: 0.45 }],
  },
  {
    id: 'prefix_rare_lingyuan',
    name: '灵源',
    position: 'prefix',
    rarity: 'rare',
    description: '体内灵力充沛，灵力上限大幅提升。',
    effects: [{ type: 'flatStat', stat: 'maxSpiritPower', minValue: 20, maxValue: 45 }],
  },
  {
    id: 'prefix_rare_lieyanzhi',
    name: '烈焰之',
    position: 'prefix',
    rarity: 'rare',
    description: '体内蕴含烈焰之力，火属性伤害增强。',
    effects: [{ type: 'elementDamage', element: 'fire', minValue: 0.08, maxValue: 0.15 }],
  },
  {
    id: 'prefix_rare_hanbingzhi',
    name: '寒冰之',
    position: 'prefix',
    rarity: 'rare',
    description: '体内蕴含寒冰之力，水属性伤害增强。',
    effects: [{ type: 'elementDamage', element: 'water', minValue: 0.08, maxValue: 0.15 }],
  },

  // ========== PREFIX EPIC (8) ==========

  {
    id: 'prefix_epic_taiji',
    name: '太极',
    position: 'prefix',
    rarity: 'epic',
    description: '阴阳调和，道韵天成，灵根与悟性皆远超同辈。',
    effects: [
      { type: 'flatStat', stat: 'spiritualRoot', minValue: 5, maxValue: 12 },
      { type: 'flatStat', stat: 'comprehension', minValue: 2, maxValue: 5 },
    ],
  },
  {
    id: 'prefix_epic_busi',
    name: '不死',
    position: 'prefix',
    rarity: 'epic',
    description: '命硬如铁，生命力极其旺盛，纵使重伤亦可恢复。',
    effects: [
      { type: 'flatStat', stat: 'hp', minValue: 20, maxValue: 40 },
      { type: 'flatStat', stat: 'def', minValue: 3, maxValue: 8 },
    ],
  },
  {
    id: 'prefix_epic_tiandao',
    name: '天道',
    position: 'prefix',
    rarity: 'epic',
    description: '天选之人，气运加身，命途坦荡。',
    effects: [
      { type: 'flatStat', stat: 'fortune', minValue: 5, maxValue: 12 },
      { type: 'flatStat', stat: 'comprehension', minValue: 3, maxValue: 6 },
    ],
  },
  {
    id: 'prefix_epic_zhanhun',
    name: '战魂',
    position: 'prefix',
    rarity: 'epic',
    description: '前世为战场英灵转世，战斗天赋极强。',
    effects: [
      { type: 'flatStat', stat: 'atk', minValue: 4, maxValue: 9 },
      { type: 'flatStat', stat: 'spd', minValue: 2, maxValue: 5 },
      { type: 'flatStat', stat: 'crit', minValue: 0.02, maxValue: 0.04 },
    ],
  },
  {
    id: 'prefix_epic_xuanming',
    name: '玄冥',
    position: 'prefix',
    rarity: 'epic',
    description: '体内蕴含玄冥之力，灵根深厚，防御坚韧。',
    effects: [
      { type: 'flatStat', stat: 'spiritualRoot', minValue: 4, maxValue: 8 },
      { type: 'flatStat', stat: 'def', minValue: 3, maxValue: 6 },
      { type: 'flatStat', stat: 'hp', minValue: 8, maxValue: 18 },
    ],
  },
  {
    id: 'prefix_epic_ruijinzhi',
    name: '锐金之',
    position: 'prefix',
    rarity: 'epic',
    description: '蕴含锐金之力，金属性伤害大幅增强。',
    effects: [{ type: 'elementDamage', element: 'metal', minValue: 0.1, maxValue: 0.18 }],
  },
  {
    id: 'prefix_epic_qingmuzhi',
    name: '青木之',
    position: 'prefix',
    rarity: 'epic',
    description: '蕴含青木之力，木属性伤害大幅增强。',
    effects: [{ type: 'elementDamage', element: 'wood', minValue: 0.1, maxValue: 0.18 }],
  },
  {
    id: 'prefix_epic_houuzhi',
    name: '厚土之',
    position: 'prefix',
    rarity: 'epic',
    description: '蕴含厚土之力，土属性伤害大幅增强。',
    effects: [{ type: 'elementDamage', element: 'earth', minValue: 0.1, maxValue: 0.18 }],
  },

  // ========== PREFIX LEGENDARY (5) ==========

  {
    id: 'prefix_legend_bati',
    name: '霸体',
    position: 'prefix',
    rarity: 'legendary',
    description: '体魄霸绝天下，攻防兼备，生命力惊人。',
    effects: [
      { type: 'flatStat', stat: 'hp', minValue: 25, maxValue: 50 },
      { type: 'flatStat', stat: 'atk', minValue: 5, maxValue: 10 },
      { type: 'flatStat', stat: 'def', minValue: 4, maxValue: 8 },
    ],
  },
  {
    id: 'prefix_legend_tianming',
    name: '天命',
    position: 'prefix',
    rarity: 'legendary',
    description: '天命所归，灵根悟性气运皆臻至化境。',
    effects: [
      { type: 'flatStat', stat: 'spiritualRoot', minValue: 8, maxValue: 15 },
      { type: 'flatStat', stat: 'comprehension', minValue: 5, maxValue: 10 },
      { type: 'flatStat', stat: 'fortune', minValue: 5, maxValue: 10 },
    ],
  },
  {
    id: 'prefix_legend_jianxin',
    name: '剑心',
    position: 'prefix',
    rarity: 'legendary',
    description: '天生剑心，攻击凌厉无比，暴击极其致命。',
    effects: [
      { type: 'flatStat', stat: 'atk', minValue: 8, maxValue: 15 },
      { type: 'flatStat', stat: 'crit', minValue: 0.04, maxValue: 0.08 },
      { type: 'flatStat', stat: 'critDmg', minValue: 0.3, maxValue: 0.5 },
    ],
  },
  {
    id: 'prefix_legend_daoti',
    name: '道体',
    position: 'prefix',
    rarity: 'legendary',
    description: '先天道体，修炼速度与突破成功率远超常人。',
    effects: [
      { type: 'modifier', target: 'cultivationSpeed', minValue: 0.15, maxValue: 0.25 },
      { type: 'modifier', target: 'breakthroughSuccess', minValue: 0.1, maxValue: 0.2 },
    ],
  },
  {
    id: 'prefix_legend_shenyou',
    name: '神佑',
    position: 'prefix',
    rarity: 'legendary',
    description: '神灵护佑，战利品质与经验获取皆有加成。',
    effects: [
      { type: 'modifier', target: 'lootQuality', minValue: 0.15, maxValue: 0.3 },
      { type: 'modifier', target: 'xpGain', minValue: 0.15, maxValue: 0.25 },
    ],
  },

  // ========== SUFFIX COMMON (15) ==========

  {
    id: 'suffix_common_jianbi',
    name: '之坚壁',
    position: 'suffix',
    rarity: 'common',
    description: '防御坚固，守如磐石。',
    effects: [{ type: 'flatStat', stat: 'def', minValue: 2, maxValue: 6 }],
  },
  {
    id: 'suffix_common_xunjie',
    name: '之迅捷',
    position: 'suffix',
    rarity: 'common',
    description: '行动迅捷，快人一步。',
    effects: [{ type: 'flatStat', stat: 'spd', minValue: 2, maxValue: 5 }],
  },
  {
    id: 'suffix_common_ruili',
    name: '之锐利',
    position: 'suffix',
    rarity: 'common',
    description: '攻击锐利，锋芒毕露。',
    effects: [{ type: 'flatStat', stat: 'atk', minValue: 2, maxValue: 5 }],
  },
  {
    id: 'suffix_common_qiangren',
    name: '之强韧',
    position: 'suffix',
    rarity: 'common',
    description: '体魄强韧，生命力充沛。',
    effects: [{ type: 'flatStat', stat: 'hp', minValue: 5, maxValue: 12 }],
  },
  {
    id: 'suffix_common_jingchun',
    name: '之精纯',
    position: 'suffix',
    rarity: 'common',
    description: '灵力精纯，出手精准。',
    effects: [{ type: 'flatStat', stat: 'crit', minValue: 0.02, maxValue: 0.04 }],
  },
  {
    id: 'suffix_common_baolie',
    name: '之暴烈',
    position: 'suffix',
    rarity: 'common',
    description: '暴击时威力更加猛烈。',
    effects: [{ type: 'flatStat', stat: 'critDmg', minValue: 0.1, maxValue: 0.2 }],
  },
  {
    id: 'suffix_common_lingyun',
    name: '之灵蕴',
    position: 'suffix',
    rarity: 'common',
    description: '灵力充盈，持久战中不易枯竭。',
    effects: [{ type: 'flatStat', stat: 'maxSpiritPower', minValue: 8, maxValue: 20 }],
  },
  {
    id: 'suffix_common_dongcha',
    name: '之洞察',
    position: 'suffix',
    rarity: 'common',
    description: '洞察力增强，领悟速度略增。',
    effects: [{ type: 'flatStat', stat: 'comprehension', minValue: 1, maxValue: 3 }],
  },
  {
    id: 'suffix_common_minrui',
    name: '之敏锐',
    position: 'suffix',
    rarity: 'common',
    description: '感知敏锐，偶尔遇到意外机遇。',
    effects: [{ type: 'flatStat', stat: 'fortune', minValue: 1, maxValue: 3 }],
  },
  {
    id: 'suffix_common_chenwen',
    name: '之沉稳',
    position: 'suffix',
    rarity: 'common',
    description: '沉稳如山，攻守兼备。',
    effects: [
      { type: 'flatStat', stat: 'def', minValue: 1, maxValue: 3 },
      { type: 'flatStat', stat: 'hp', minValue: 3, maxValue: 8 },
    ],
  },
  {
    id: 'suffix_common_fengmang',
    name: '之锋芒',
    position: 'suffix',
    rarity: 'common',
    description: '锋芒初露，攻速兼备。',
    effects: [
      { type: 'flatStat', stat: 'atk', minValue: 1, maxValue: 3 },
      { type: 'flatStat', stat: 'spd', minValue: 1, maxValue: 2 },
    ],
  },
  {
    id: 'suffix_common_lingtong',
    name: '之灵通',
    position: 'suffix',
    rarity: 'common',
    description: '灵根通达，与灵气更加亲和。',
    effects: [{ type: 'flatStat', stat: 'spiritualRoot', minValue: 1, maxValue: 3 }],
  },
  {
    id: 'suffix_common_jianren',
    name: '之坚韧',
    position: 'suffix',
    rarity: 'common',
    description: '坚韧不拔，生命与防御皆有增益。',
    effects: [
      { type: 'flatStat', stat: 'hp', minValue: 3, maxValue: 8 },
      { type: 'flatStat', stat: 'def', minValue: 1, maxValue: 2 },
    ],
  },
  {
    id: 'suffix_common_qiaoshou',
    name: '之巧手',
    position: 'suffix',
    rarity: 'common',
    description: '心灵手巧，功法参悟速度略增。',
    effects: [{ type: 'modifier', target: 'techniqueComprehension', minValue: 0.05, maxValue: 0.1 }],
  },
  {
    id: 'suffix_common_shanzhan',
    name: '之善战',
    position: 'suffix',
    rarity: 'common',
    description: '善于战斗，攻守兼顾。',
    effects: [
      { type: 'flatStat', stat: 'atk', minValue: 2, maxValue: 4 },
      { type: 'flatStat', stat: 'def', minValue: 1, maxValue: 2 },
    ],
  },

  // ========== SUFFIX RARE (12) ==========

  {
    id: 'suffix_rare_pojun',
    name: '之破军',
    position: 'suffix',
    rarity: 'rare',
    description: '攻击凶猛，战利品质略有提升。',
    effects: [
      { type: 'flatStat', stat: 'atk', minValue: 4, maxValue: 8 },
      { type: 'modifier', target: 'lootQuality', minValue: 0.05, maxValue: 0.1 },
    ],
  },
  {
    id: 'suffix_rare_huichun',
    name: '之回春',
    position: 'suffix',
    rarity: 'rare',
    description: '经验获取效率增强，如沐春风。',
    effects: [{ type: 'modifier', target: 'xpGain', minValue: 0.08, maxValue: 0.15 }],
  },
  {
    id: 'suffix_rare_tiebi',
    name: '之铁壁',
    position: 'suffix',
    rarity: 'rare',
    description: '防御如铁壁般坚固，生命力充沛。',
    effects: [
      { type: 'flatStat', stat: 'def', minValue: 4, maxValue: 8 },
      { type: 'flatStat', stat: 'hp', minValue: 5, maxValue: 10 },
    ],
  },
  {
    id: 'suffix_rare_fuyuan',
    name: '之福缘',
    position: 'suffix',
    rarity: 'rare',
    description: '福缘深厚，战利品质与气运皆有加成。',
    effects: [
      { type: 'flatStat', stat: 'fortune', minValue: 3, maxValue: 6 },
      { type: 'modifier', target: 'lootQuality', minValue: 0.05, maxValue: 0.12 },
    ],
  },
  {
    id: 'suffix_rare_leixing',
    name: '之雷行',
    position: 'suffix',
    rarity: 'rare',
    description: '行动如雷，速度与暴击兼备。',
    effects: [
      { type: 'flatStat', stat: 'spd', minValue: 3, maxValue: 6 },
      { type: 'flatStat', stat: 'crit', minValue: 0.02, maxValue: 0.04 },
    ],
  },
  {
    id: 'suffix_rare_lingquan',
    name: '之灵泉',
    position: 'suffix',
    rarity: 'rare',
    description: '灵力如泉水般涌出，灵力与灵根皆有提升。',
    effects: [
      { type: 'flatStat', stat: 'maxSpiritPower', minValue: 15, maxValue: 30 },
      { type: 'flatStat', stat: 'spiritualRoot', minValue: 2, maxValue: 4 },
    ],
  },
  {
    id: 'suffix_rare_xinyan',
    name: '之心眼',
    position: 'suffix',
    rarity: 'rare',
    description: '心眼通明，暴击率与暴击伤害皆有提升。',
    effects: [
      { type: 'flatStat', stat: 'crit', minValue: 0.03, maxValue: 0.06 },
      { type: 'flatStat', stat: 'critDmg', minValue: 0.15, maxValue: 0.25 },
    ],
  },
  {
    id: 'suffix_rare_wudao',
    name: '之悟道',
    position: 'suffix',
    rarity: 'rare',
    description: '悟道之人，参悟功法速度大增。',
    effects: [
      { type: 'flatStat', stat: 'comprehension', minValue: 3, maxValue: 6 },
      { type: 'modifier', target: 'techniqueComprehension', minValue: 0.08, maxValue: 0.15 },
    ],
  },
  {
    id: 'suffix_rare_longxiang',
    name: '之龙象',
    position: 'suffix',
    rarity: 'rare',
    description: '龙象之力，生命力与攻击力兼具。',
    effects: [
      { type: 'flatStat', stat: 'hp', minValue: 15, maxValue: 25 },
      { type: 'flatStat', stat: 'atk', minValue: 3, maxValue: 6 },
    ],
  },
  {
    id: 'suffix_rare_fengshen',
    name: '之风神',
    position: 'suffix',
    rarity: 'rare',
    description: '风神之速，速度与经验获取皆有提升。',
    effects: [
      { type: 'flatStat', stat: 'spd', minValue: 4, maxValue: 7 },
      { type: 'modifier', target: 'xpGain', minValue: 0.05, maxValue: 0.1 },
    ],
  },
  {
    id: 'suffix_rare_lingyan',
    name: '之灵眼',
    position: 'suffix',
    rarity: 'rare',
    description: '灵眼通明，灵根与气运皆有提升。',
    effects: [
      { type: 'flatStat', stat: 'spiritualRoot', minValue: 3, maxValue: 6 },
      { type: 'flatStat', stat: 'fortune', minValue: 2, maxValue: 4 },
    ],
  },
  {
    id: 'suffix_rare_tiejia',
    name: '之铁甲',
    position: 'suffix',
    rarity: 'rare',
    description: '铁甲护身，防御与突破成功率皆有提升。',
    effects: [
      { type: 'flatStat', stat: 'def', minValue: 5, maxValue: 9 },
      { type: 'modifier', target: 'breakthroughSuccess', minValue: 0.03, maxValue: 0.08 },
    ],
  },

  // ========== SUFFIX EPIC (8) ==========

  {
    id: 'suffix_epic_busi',
    name: '之不死',
    position: 'suffix',
    rarity: 'epic',
    description: '生命垂危时爆发强大生命力，回复大量生命。',
    effects: [
      {
        type: 'conditional',
        trigger: 'lowHp',
        effect: { stat: 'hp', minValue: 20, maxValue: 40 },
        threshold: 0.3,
      },
    ],
  },
  {
    id: 'suffix_epic_baozou',
    name: '之暴走',
    position: 'suffix',
    rarity: 'epic',
    description: '生命值低时攻击力大幅提升，绝境中更加凶猛。',
    effects: [
      {
        type: 'conditional',
        trigger: 'lowHp',
        effect: { stat: 'atk', minValue: 0.15, maxValue: 0.25 },
        threshold: 0.4,
      },
    ],
  },
  {
    id: 'suffix_epic_lianji',
    name: '之连击',
    position: 'suffix',
    rarity: 'epic',
    description: '有几率发动连续攻击，造成额外伤害。',
    effects: [
      {
        type: 'chance',
        description: '双倍打击',
        minValue: 0.08,
        maxValue: 0.15,
        effect: { stat: 'atk', value: 0.5 },
      },
    ],
  },
  {
    id: 'suffix_epic_juejing',
    name: '之绝境',
    position: 'suffix',
    rarity: 'epic',
    description: '生命值极低时暴击率大幅提升，背水一战。',
    effects: [
      {
        type: 'conditional',
        trigger: 'lowHp',
        effect: { stat: 'crit', minValue: 0.1, maxValue: 0.2 },
        threshold: 0.25,
      },
    ],
  },
  {
    id: 'suffix_epic_lveduo',
    name: '之掠夺',
    position: 'suffix',
    rarity: 'epic',
    description: '战利品质与经验获取皆有显著加成。',
    effects: [
      { type: 'modifier', target: 'lootQuality', minValue: 0.15, maxValue: 0.25 },
      { type: 'modifier', target: 'xpGain', minValue: 0.1, maxValue: 0.2 },
    ],
  },
  {
    id: 'suffix_epic_huti',
    name: '之护体',
    position: 'suffix',
    rarity: 'epic',
    description: '有几率触发护体真气，减少受到的伤害。',
    effects: [
      {
        type: 'chance',
        description: '伤害减免',
        minValue: 0.05,
        maxValue: 0.1,
        effect: { stat: 'def', value: 0.3 },
      },
    ],
  },
  {
    id: 'suffix_epic_dunwu',
    name: '之顿悟',
    position: 'suffix',
    rarity: 'epic',
    description: '参悟功法速度大幅提升，悟性增强。',
    effects: [
      { type: 'modifier', target: 'techniqueComprehension', minValue: 0.15, maxValue: 0.25 },
      { type: 'flatStat', stat: 'comprehension', minValue: 5, maxValue: 10 },
    ],
  },
  {
    id: 'suffix_epic_tiexue',
    name: '之铁血',
    position: 'suffix',
    rarity: 'epic',
    description: '生命力旺盛，战斗开始时防御力提升。',
    effects: [
      { type: 'flatStat', stat: 'hp', minValue: 20, maxValue: 35 },
      {
        type: 'conditional',
        trigger: 'onBattleStart',
        effect: { stat: 'def', minValue: 0.05, maxValue: 0.1 },
      },
    ],
  },

  // ========== SUFFIX LEGENDARY (5) ==========

  {
    id: 'suffix_legend_tianming',
    name: '之天命',
    position: 'suffix',
    rarity: 'legendary',
    description: '天命所归，突破成功率与修炼速度皆有大幅加成。',
    effects: [
      { type: 'modifier', target: 'breakthroughSuccess', minValue: 0.15, maxValue: 0.25 },
      { type: 'modifier', target: 'cultivationSpeed', minValue: 0.1, maxValue: 0.2 },
    ],
  },
  {
    id: 'suffix_legend_wushuang',
    name: '之无双',
    position: 'suffix',
    rarity: 'legendary',
    description: '天下无双，攻击速度暴击皆为顶级。',
    effects: [
      { type: 'flatStat', stat: 'atk', minValue: 10, maxValue: 18 },
      { type: 'flatStat', stat: 'spd', minValue: 5, maxValue: 10 },
      { type: 'flatStat', stat: 'crit', minValue: 0.05, maxValue: 0.1 },
    ],
  },
  {
    id: 'suffix_legend_niepan',
    name: '之涅槃',
    position: 'suffix',
    rarity: 'legendary',
    description: '涅槃重生之力，垂危时回复大量生命，经验获取亦有加成。',
    effects: [
      {
        type: 'conditional',
        trigger: 'lowHp',
        effect: { stat: 'hp', minValue: 50, maxValue: 100 },
        threshold: 0.1,
      },
      { type: 'modifier', target: 'xpGain', minValue: 0.15, maxValue: 0.25 },
    ],
  },
  {
    id: 'suffix_legend_tongtian',
    name: '之通天',
    position: 'suffix',
    rarity: 'legendary',
    description: '通天彻地之能，修炼速度与参悟效率皆臻至化境。',
    effects: [
      { type: 'modifier', target: 'cultivationSpeed', minValue: 0.2, maxValue: 0.35 },
      { type: 'modifier', target: 'techniqueComprehension', minValue: 0.15, maxValue: 0.25 },
      { type: 'flatStat', stat: 'spiritualRoot', minValue: 8, maxValue: 15 },
    ],
  },
  {
    id: 'suffix_legend_hundun',
    name: '之混沌',
    position: 'suffix',
    rarity: 'legendary',
    description: '混沌之力，所有属性皆有显著增益。',
    effects: [
      { type: 'flatStat', stat: 'hp', minValue: 10, maxValue: 20 },
      { type: 'flatStat', stat: 'atk', minValue: 5, maxValue: 10 },
      { type: 'flatStat', stat: 'def', minValue: 5, maxValue: 10 },
      { type: 'flatStat', stat: 'spd', minValue: 3, maxValue: 6 },
      { type: 'flatStat', stat: 'crit', minValue: 0.03, maxValue: 0.06 },
      { type: 'flatStat', stat: 'critDmg', minValue: 0.15, maxValue: 0.3 },
    ],
  },
]

// --- Lookup Helpers ---

const affixById = new Map<string, TalentAffix>(TALENT_AFFIXES.map((a) => [a.id, a]))

/** Get all affixes matching a position (prefix or suffix). */
export function getAffixesByPosition(position: TalentAffixPosition): TalentAffix[] {
  return TALENT_AFFIXES.filter((a) => a.position === position)
}

/** Get affixes filtered by rarity, optionally also filtered by position. */
export function getAffixesByRarity(rarity: TalentAffixRarity, position?: TalentAffixPosition): TalentAffix[] {
  return TALENT_AFFIXES.filter((a) => a.rarity === rarity && (position === undefined || a.position === position))
}

/** Look up a single affix by its unique id. */
export function getAffixById(id: string): TalentAffix | undefined {
  return affixById.get(id)
}
