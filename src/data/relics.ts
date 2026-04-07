import type { RelicId } from '../types/adventure'

export interface RelicDef {
  id: RelicId
  name: string
  description: string
}

export interface Relic {
  id: string
  name: string
  description: string
  rule: string
}

export const RELIC_DEFS: Record<RelicId, RelicDef> = {
  jadeGourd: {
    id: 'jadeGourd',
    name: '青玉葫芦',
    description: '每层额外恢复 8% 最大生命，休息事件恢复更强。',
  },
  merchantSeal: {
    id: 'merchantSeal',
    name: '游商印',
    description: '游商商品价格降低 20%。',
  },
  warBanner: {
    id: 'warBanner',
    name: '镇煞战旗',
    description: '战斗中攻击与防御额外提高 10%。',
  },
  mirror_shard: {
    id: 'mirror_shard',
    name: '镜片',
    description: '战斗中暴击率提高 4%。',
  },
  jade_armor: {
    id: 'jade_armor',
    name: '玉甲',
    description: '战斗中防御提高 20%。',
  },
  blood_vial: {
    id: 'blood_vial',
    name: '血瓶',
    description: '每场战斗结束后恢复 15% 最大生命。',
  },
  golden_scale: {
    id: 'golden_scale',
    name: '金鳞',
    description: '灵石奖励提高 25%。',
  },
}

export const RELICS: Relic[] = [
  { id: 'mirror_shard', name: '镜片', description: '强化暴击时机。', rule: 'crit-up' },
  { id: 'jade_armor', name: '玉甲', description: '提高防御。', rule: 'def-up' },
  { id: 'blood_vial', name: '血瓶', description: '提高续航。', rule: 'heal-up' },
  { id: 'golden_scale', name: '金鳞', description: '提高奖励。', rule: 'loot-up' },
]
