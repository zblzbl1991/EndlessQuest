import type { FateTag, FateTagId } from '../types/character'

type FateTagKey = FateTag | FateTagId

export interface FateTagModifiers {
  breakthroughFailureRate: number
  tribulationFailureRate: number
  cultivationRate: number
  breakthroughInsightChance: number
}

export interface FateTagDef {
  id: FateTagId
  canonicalId: FateTag
  name: string
  description: string
  tone: 'danger' | 'accent' | 'positive'
  category: 'negative' | 'positive'
  modifiers: FateTagModifiers
}

const FATE_TAG_ALIASES: Record<FateTagKey, FateTagId> = {
  tribulationScar: 'tribulation-scar',
  'tribulation-scar': 'tribulation-scar',
  heartDevilSeed: 'heart-devil',
  'heart-devil': 'heart-devil',
  suddenInsight: 'sudden-insight',
  'sudden-insight': 'sudden-insight',
  stableDaoHeart: 'stable-dao-heart',
  'stable-dao-heart': 'stable-dao-heart',
}

export const FATE_TAGS: Record<FateTagId, FateTagDef> = {
  'tribulation-scar': {
    id: 'tribulation-scar',
    canonicalId: 'tribulationScar',
    name: '天劫伤痕',
    description: '修炼速度下降，后续突破与天劫都更危险，但这名弟子往往会留下更强烈的幸存者气质。',
    tone: 'danger',
    category: 'negative',
    modifiers: {
      breakthroughFailureRate: 0.05,
      tribulationFailureRate: 0.06,
      cultivationRate: -0.12,
      breakthroughInsightChance: 0,
    },
  },
  'heart-devil': {
    id: 'heart-devil',
    canonicalId: 'heartDevilSeed',
    name: '心魔种子',
    description: '修炼速度略快，但突破与天劫更不稳定，是高风险高波动的成长型命格。',
    tone: 'danger',
    category: 'negative',
    modifiers: {
      breakthroughFailureRate: 0.08,
      tribulationFailureRate: 0.04,
      cultivationRate: 0.08,
      breakthroughInsightChance: 0,
    },
  },
  'sudden-insight': {
    id: 'sudden-insight',
    canonicalId: 'suddenInsight',
    name: '顿悟',
    description: '灵光乍现让修炼更顺，也让这名弟子在突破后更容易领悟新的方向与功法。',
    tone: 'positive',
    category: 'positive',
    modifiers: {
      breakthroughFailureRate: -0.05,
      tribulationFailureRate: -0.03,
      cultivationRate: 0.12,
      breakthroughInsightChance: 0.2,
    },
  },
  'stable-dao-heart': {
    id: 'stable-dao-heart',
    canonicalId: 'stableDaoHeart',
    name: '道心稳固',
    description: '修行心境更加稳固，修炼略快，面对大境界突破与天劫时都更从容，适合长期投资。',
    tone: 'accent',
    category: 'positive',
    modifiers: {
      breakthroughFailureRate: -0.08,
      tribulationFailureRate: -0.08,
      cultivationRate: 0.05,
      breakthroughInsightChance: 0.08,
    },
  },
}

function normalizeFateTagId(tag: FateTagKey): FateTagId {
  return FATE_TAG_ALIASES[tag]
}

export function getFateTagDef(tag: FateTag): FateTagDef {
  return FATE_TAGS[normalizeFateTagId(tag)]
}

export function getFateTagById(tag: FateTagId): FateTagDef | undefined {
  return FATE_TAGS[normalizeFateTagId(tag)]
}

export function calcFateTagFailureRateModifier(tags: Array<FateTag | FateTagId>): number {
  return tags.reduce((total, tag) => total + FATE_TAGS[normalizeFateTagId(tag as FateTagKey)].modifiers.breakthroughFailureRate, 0)
}

export function calcFateTagTribulationModifier(tags: Array<FateTag | FateTagId>): number {
  return tags.reduce((total, tag) => total + FATE_TAGS[normalizeFateTagId(tag as FateTagKey)].modifiers.tribulationFailureRate, 0)
}

export function calcFateTagCultivationRateModifier(tags: Array<FateTag | FateTagId>): number {
  return tags.reduce((total, tag) => total + FATE_TAGS[normalizeFateTagId(tag as FateTagKey)].modifiers.cultivationRate, 0)
}

export function calcFateTagInsightChanceModifier(tags: Array<FateTag | FateTagId>): number {
  return tags.reduce(
    (total, tag) => total + FATE_TAGS[normalizeFateTagId(tag as FateTagKey)].modifiers.breakthroughInsightChance,
    0
  )
}
