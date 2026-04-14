import type { ProductionCampaign, SectArchetype } from '../types/sect'

export interface ProductionCampaignDescriptor {
  id: ProductionCampaign
  name: string
  summary: string
  boosts: string[]
  suppressions: string[]
  bestForArchetypes: SectArchetype[]
}

export const PRODUCTION_CAMPAIGNS: ProductionCampaignDescriptor[] = [
  {
    id: 'realmSprint',
    name: '冲关专项',
    summary: '集中资源推动弟子境界突破，短时间内大幅提高闭关效率。',
    boosts: ['闭关效率 +30%', '突破成功率 +10%'],
    suppressions: ['远征模板暂停', '灵石消耗翻倍'],
    bestForArchetypes: ['pillSustain', 'swordBurst'],
  },
  {
    id: 'forgeSprint',
    name: '锻造专项',
    summary: '集中矿材和灵石进行高强度锻造，快速产出装备。',
    boosts: ['锻造产出 +40%', '锻造成功率 +15%'],
    suppressions: ['丹炉产出 -50%', '矿材消耗加速'],
    bestForArchetypes: ['swordBurst', 'arrayGuard'],
  },
  {
    id: 'recoverySprint',
    name: '恢复专项',
    summary: '全力恢复伤病弟子，缩短恢复周期。',
    boosts: ['恢复速度 +50%', '伤势恶化概率归零'],
    suppressions: ['新远征暂停', '招募暂停'],
    bestForArchetypes: ['pillSustain', 'arrayGuard'],
  },
  {
    id: 'expeditionPrep',
    name: '远征专项',
    summary: '提前储备远征物资，提高下一次远征的整体表现。',
    boosts: ['远征补给品质提升', '队伍战力 +10%'],
    suppressions: ['闭关效率 -20%', '丹药产出 -30%'],
    bestForArchetypes: ['swordBurst', 'beastHarvest'],
  },
  {
    id: 'marketHarvest',
    name: '坊市专项',
    summary: '集中精力在坊市交易和资源转换上，快速积累灵石。',
    boosts: ['坊市刷新 +1 次/日', '灵石收入 +25%'],
    suppressions: ['灵田产出 -30%', '锻造暂停'],
    bestForArchetypes: ['arrayGuard', 'beastHarvest'],
  },
]

const CAMPAIGN_MAP = new Map(PRODUCTION_CAMPAIGNS.map((c) => [c.id, c]))

export function getCampaignDescriptor(id: ProductionCampaign): ProductionCampaignDescriptor {
  return CAMPAIGN_MAP.get(id) ?? PRODUCTION_CAMPAIGNS[0]
}

export const CAMPAIGN_NAMES: Record<ProductionCampaign, string> = Object.fromEntries(
  PRODUCTION_CAMPAIGNS.map((c) => [c.id, c.name])
) as Record<ProductionCampaign, string>
