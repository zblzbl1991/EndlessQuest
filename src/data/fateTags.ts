import type { FateTag, FateTagId } from '../types/character'

type FateTagKey = FateTag | FateTagId

export interface FateTagDef {
  id: FateTagId
  canonicalId: FateTag
  name: string
  description: string
  tone: 'danger' | 'accent' | 'positive'
  category: 'negative' | 'positive'
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
    description: '经历天劫重创后留下的痕印，提醒弟子不可轻敌。',
    tone: 'danger',
    category: 'negative',
  },
  'heart-devil': {
    id: 'heart-devil',
    canonicalId: 'heartDevilSeed',
    name: '心魔种子',
    description: '突破失利后心神留下阴影，未来突破需更加谨慎。',
    tone: 'danger',
    category: 'negative',
  },
  'sudden-insight': {
    id: 'sudden-insight',
    canonicalId: 'suddenInsight',
    name: '顿悟',
    description: '在险中求生后获得的灵光，修行更容易触类旁通。',
    tone: 'positive',
    category: 'positive',
  },
  'stable-dao-heart': {
    id: 'stable-dao-heart',
    canonicalId: 'stableDaoHeart',
    name: '道心稳固',
    description: '历经劫火后道心更稳，面对大境界突破更加从容。',
    tone: 'accent',
    category: 'positive',
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
  return tags.reduce((total, tag) => {
    switch (normalizeFateTagId(tag as FateTagKey)) {
      case 'tribulation-scar':
      case 'heart-devil':
        return total + 0.05
      case 'sudden-insight':
      case 'stable-dao-heart':
        return total - 0.05
      default:
        return total
    }
  }, 0)
}
