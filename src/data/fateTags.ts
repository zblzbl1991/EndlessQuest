import type { FateTagId } from '../types/character'

export interface FateTagDef {
  id: FateTagId
  name: string
  description: string
  category: 'positive' | 'negative'
  /** Modifier applied to breakthrough failure rate (positive = more likely to fail) */
  failureRateModifier: number
}

export const FATE_TAGS: Record<FateTagId, FateTagDef> = {
  'tribulation-scar': {
    id: 'tribulation-scar',
    name: '天劫伤痕',
    description: '天劫失败留下伤痕，突破更易失败',
    category: 'negative',
    failureRateModifier: 0.05,
  },
  'heart-devil': {
    id: 'heart-devil',
    name: '心魔种子',
    description: '突破失败时萌生心魔，突破更易失败',
    category: 'negative',
    failureRateModifier: 0.05,
  },
  'sudden-insight': {
    id: 'sudden-insight',
    name: '顿悟',
    description: '突破成功时获得顿悟，突破更顺利',
    category: 'positive',
    failureRateModifier: -0.03,
  },
  'stable-dao-heart': {
    id: 'stable-dao-heart',
    name: '道心稳固',
    description: '道心稳固，突破更顺利',
    category: 'positive',
    failureRateModifier: -0.03,
  },
}

export function getFateTagById(id: FateTagId): FateTagDef | undefined {
  return FATE_TAGS[id]
}

/** Sum all fate tag failure rate modifiers for a character's current tags */
export function calcFateTagFailureRateModifier(tags: FateTagId[]): number {
  return tags.reduce((sum, id) => {
    const def = FATE_TAGS[id]
    return def ? sum + def.failureRateModifier : sum
  }, 0)
}
