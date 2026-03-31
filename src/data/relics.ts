import type { RelicId } from '../types/adventure'

export interface RelicDef {
  id: RelicId
  name: string
  description: string
}

export const RELICS: Record<RelicId, RelicDef> = {
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
}
