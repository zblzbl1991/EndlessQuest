import type { FateTag } from '../types/character'

export interface FateTagDef {
  id: FateTag
  name: string
  description: string
  tone: 'danger' | 'accent' | 'positive'
}

export const FATE_TAGS: Record<FateTag, FateTagDef> = {
  tribulationScar: {
    id: 'tribulationScar',
    name: '劫痕',
    description: '经历天劫重创后留下的痕印，提醒弟子不可轻敌。',
    tone: 'danger',
  },
  heartDevilSeed: {
    id: 'heartDevilSeed',
    name: '心魔种',
    description: '突破失利后心神留下阴影，未来突破需更加谨慎。',
    tone: 'danger',
  },
  suddenInsight: {
    id: 'suddenInsight',
    name: '顿悟',
    description: '在险中求生后获得的灵光，修行更容易触类旁通。',
    tone: 'positive',
  },
  stableDaoHeart: {
    id: 'stableDaoHeart',
    name: '道心稳固',
    description: '历经劫火后道心更稳，面对大境界突破更加从容。',
    tone: 'accent',
  },
}

export function getFateTagDef(tag: FateTag): FateTagDef {
  return FATE_TAGS[tag]
}
