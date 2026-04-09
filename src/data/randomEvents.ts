import type { RandomEventDef, RandomEventRarity } from '../types/randomEvent'

// ---------------------------------------------------------------------------
// Rarity weights for random selection
// ---------------------------------------------------------------------------

export const EVENT_RARITY_WEIGHTS: Record<RandomEventRarity, number> = {
  common: 60,
  uncommon: 25,
  rare: 12,
  legendary: 3,
}

// ---------------------------------------------------------------------------
// 24 Random Event Definitions
// ---------------------------------------------------------------------------

export const RANDOM_EVENTS: RandomEventDef[] = [
  // --- 天降奇遇 (fortunate encounters) ---
  {
    id: 'spirit_rain',
    name: '灵石雨',
    description: '天空忽现金色流光，灵石如雨点般洒落宗门。',
    rarity: 'common',
    category: 'fortunate_encounter',
    effects: [{ type: 'resource', target: 'spiritStone', value: 50 }],
  },
  {
    id: 'spirit_tide',
    name: '灵气潮汐',
    description: '天地灵气忽然涌动，灵田产量骤增。',
    rarity: 'common',
    category: 'fortunate_encounter',
    effects: [{ type: 'resource', target: 'spiritEnergy', value: 30 }],
  },
  {
    id: 'herb_bloom',
    name: '灵草盛放',
    description: '山中灵草一夜盛放，药香弥漫数里。',
    rarity: 'common',
    category: 'fortunate_encounter',
    effects: [{ type: 'resource', target: 'herb', value: 15 }],
  },
  {
    id: 'ore_vein',
    name: '矿脉露头',
    description: '矿脉地表露出一角，矿材唾手可得。',
    rarity: 'common',
    category: 'fortunate_encounter',
    effects: [{ type: 'resource', target: 'ore', value: 15 }],
  },
  {
    id: 'fortune_encounter',
    name: '仙缘际会',
    description: '一位云游散人路过宗门，留下丰厚的灵石馈赠。',
    rarity: 'uncommon',
    category: 'fortunate_encounter',
    effects: [{ type: 'resource', target: 'spiritStone', value: 200 }],
  },
  {
    id: 'spirit_spring',
    name: '灵泉涌出',
    description: '后山忽现灵泉，灵气充沛，弟子修炼效率大增。',
    rarity: 'uncommon',
    category: 'fortunate_encounter',
    effects: [{ type: 'resource', target: 'spiritEnergy', value: 120 }],
  },
  {
    id: 'treasure_unearth',
    name: '藏宝出土',
    description: '弟子在宗门后山挖掘时发现上古遗藏！大量资源现世。',
    rarity: 'rare',
    category: 'fortunate_encounter',
    effects: [
      { type: 'resource', target: 'spiritStone', value: 500 },
      { type: 'resource', target: 'herb', value: 60 },
      { type: 'resource', target: 'ore', value: 60 },
    ],
  },
  {
    id: 'heavenly_gift',
    name: '天降奇宝',
    description: '天降祥瑞，金光万道，大量灵石与珍稀材料从天而降！',
    rarity: 'legendary',
    category: 'fortunate_encounter',
    effects: [
      { type: 'resource', target: 'spiritStone', value: 2000 },
      { type: 'resource', target: 'spiritEnergy', value: 500 },
      { type: 'resource', target: 'herb', value: 100 },
      { type: 'resource', target: 'ore', value: 100 },
    ],
  },

  // --- 弟子异变 (disciple mutations) ---
  {
    id: 'sudden_insight',
    name: '顿悟',
    description: '有弟子修炼时灵光乍现，修为精进不少。',
    rarity: 'common',
    category: 'disciple_mutation',
    effects: [{ type: 'character_exp', value: 50 }],
  },
  {
    id: 'fortuitous_encounter',
    name: '奇遇',
    description: '一名弟子在外出采药时偶得机缘，修为大进。',
    rarity: 'uncommon',
    category: 'disciple_mutation',
    effects: [{ type: 'character_exp', value: 200 }],
  },
  {
    id: 'technique_revelation',
    name: '功法参悟',
    description: '有弟子冥思苦想终于悟通功法奥义，参悟度大幅提升。',
    rarity: 'rare',
    category: 'disciple_mutation',
    effects: [{ type: 'technique_insight', value: 15 }],
  },
  {
    id: 'great_awakening',
    name: '大彻大悟',
    description: '一名弟子于梦中悟道，修为暴涨！堪称百年奇才。',
    rarity: 'legendary',
    category: 'disciple_mutation',
    effects: [
      { type: 'character_exp', value: 800 },
      { type: 'technique_insight', value: 25 },
    ],
  },

  // --- 天灾人祸 (disasters) ---
  {
    id: 'beast_attack',
    name: '妖兽侵袭',
    description: '一只妖兽闯入宗门周边，消耗了不少灵石才将其驱赶。',
    rarity: 'common',
    category: 'disaster',
    effects: [{ type: 'resource', target: 'spiritStone', value: -30 }],
  },
  {
    id: 'vein_quake',
    name: '灵脉震荡',
    description: '地下灵脉突然震荡，矿脉与灵田遭受损失。',
    rarity: 'uncommon',
    category: 'disaster',
    effects: [
      { type: 'resource', target: 'herb', value: -20 },
      { type: 'resource', target: 'ore', value: -20 },
    ],
  },
  {
    id: 'disciple_rebellion',
    name: '弟子叛逃',
    description: '一名弟子心生不满，卷走了部分灵石后叛逃。',
    rarity: 'rare',
    category: 'disaster',
    effects: [{ type: 'resource', target: 'spiritStone', value: -300 }],
  },
  {
    id: 'demon_incursion',
    name: '魔气入侵',
    description: '一股魔气从地底涌出，弟子受伤休养，损失惨重。',
    rarity: 'legendary',
    category: 'disaster',
    effects: [
      { type: 'resource', target: 'spiritStone', value: -500 },
      { type: 'resource', target: 'spiritEnergy', value: -200 },
      { type: 'character_status', target: 'injured', value: 1 },
    ],
  },

  // --- 宗门兴衰 (sect events) ---
  {
    id: 'traveler_gift',
    name: '路人赠礼',
    description: '一位路过的修士慕名前来，赠送了些许灵石。',
    rarity: 'common',
    category: 'sect_event',
    effects: [{ type: 'resource', target: 'spiritStone', value: 20 }],
  },
  {
    id: 'wanderer_join',
    name: '散修投奔',
    description: '一名散修仰慕宗门，送来丰厚礼物以示诚意。',
    rarity: 'uncommon',
    category: 'sect_event',
    effects: [
      { type: 'resource', target: 'spiritStone', value: 100 },
      { type: 'resource', target: 'herb', value: 25 },
    ],
  },
  {
    id: 'relic_discovery',
    name: '遗物发现',
    description: '弟子在后山发现前人遗留的修炼资源！',
    rarity: 'rare',
    category: 'sect_event',
    effects: [
      { type: 'resource', target: 'spiritStone', value: 300 },
      { type: 'resource', target: 'spiritEnergy', value: 150 },
    ],
  },
  {
    id: 'ancient_legacy',
    name: '上古传承',
    description: '宗门地下挖掘出上古修士洞府，宝物无数！',
    rarity: 'legendary',
    category: 'sect_event',
    effects: [
      { type: 'resource', target: 'spiritStone', value: 1500 },
      { type: 'resource', target: 'herb', value: 80 },
      { type: 'resource', target: 'ore', value: 80 },
    ],
  },

  // --- 自然异象 (natural phenomena) ---
  {
    id: 'celestial_anomaly',
    name: '天象异变',
    description: '星辰错位，灵气波动剧烈，弟子修炼受到轻微影响。',
    rarity: 'common',
    category: 'natural_phenomenon',
    effects: [{ type: 'character_exp', value: 20 }],
  },
  {
    id: 'sun_moon_align',
    name: '日月同辉',
    description: '罕见天象，日月同辉，天地灵气充沛。',
    rarity: 'uncommon',
    category: 'natural_phenomenon',
    effects: [
      { type: 'resource', target: 'spiritEnergy', value: 80 },
      { type: 'character_exp', value: 100 },
    ],
  },
  {
    id: 'meteor_fall',
    name: '星辰坠落',
    description: '一颗星辰坠落宗门附近，带来大量灵矿与灵气！',
    rarity: 'rare',
    category: 'natural_phenomenon',
    effects: [
      { type: 'resource', target: 'ore', value: 80 },
      { type: 'resource', target: 'spiritEnergy', value: 200 },
    ],
  },
  {
    id: 'dragon_vein_awaken',
    name: '龙脉苏醒',
    description: '宗门地底龙脉苏醒，万灵来朝，资源暴涨！',
    rarity: 'legendary',
    category: 'natural_phenomenon',
    effects: [
      { type: 'resource', target: 'spiritStone', value: 1000 },
      { type: 'resource', target: 'spiritEnergy', value: 400 },
      { type: 'resource', target: 'herb', value: 60 },
      { type: 'resource', target: 'ore', value: 60 },
    ],
  },
]

// ---------------------------------------------------------------------------
// Category names for display
// ---------------------------------------------------------------------------

export const EVENT_CATEGORY_NAMES: Record<string, string> = {
  fortunate_encounter: '天降奇遇',
  disciple_mutation: '弟子异变',
  disaster: '天灾人祸',
  sect_event: '宗门兴衰',
  natural_phenomenon: '自然异象',
}

export const EVENT_RARITY_NAMES: Record<RandomEventRarity, string> = {
  common: '凡品',
  uncommon: '灵品',
  rare: '仙品',
  legendary: '神品',
}
