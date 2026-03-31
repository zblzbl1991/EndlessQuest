import type { BlessingId } from '../types/adventure'

export interface BlessingDef {
  id: BlessingId
  name: string
  description: string
}

export const BLESSINGS: Record<BlessingId, BlessingDef> = {
  stoneHarvest: {
    id: 'stoneHarvest',
    name: '采石灵佑',
    description: '后续秘境中的灵石奖励提高 30%。',
  },
  verdantBounty: {
    id: 'verdantBounty',
    name: '木灵丰赐',
    description: '后续秘境中的灵草奖励提高 30%。',
  },
  ironBody: {
    id: 'ironBody',
    name: '铁骨生机',
    description: '每通过一层后，全队恢复 12% 最大生命。',
  },
  galeStride: {
    id: 'galeStride',
    name: '疾风步',
    description: '战斗中速度提高 15%。',
  },
  battleFocus: {
    id: 'battleFocus',
    name: '战意凝神',
    description: '战斗中攻击提高 15%。',
  },
}
