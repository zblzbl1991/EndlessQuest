import type { SectArchetype } from '../../types/sect'

type BottleneckId =
  | 'spiritEnergy'
  | 'spiritStone'
  | 'herb'
  | 'ore'
  | 'disciples'
  | 'recovering'
  | 'expedition'
  | 'stable'

export interface ArchetypeAdvice {
  archetype: SectArchetype
  suggestion: string
  actionSummary: string
}

const BOTTLENECK_ADVICE: Record<BottleneckId, Record<SectArchetype, string>> = {
  spiritEnergy: {
    swordBurst: '剑气路线灵气消耗大，降低远征频率并提升灵田等级',
    pillSustain: '丹道路线本应灵气充裕，检查是否有过多弟子同时闭关',
    arrayGuard: '护阵路线需要灵气维持防御，优先保住灵气底线',
    beastHarvest: '御兽路线灵气投入采集，考虑短期减少采集消耗',
  },
  spiritStone: {
    swordBurst: '剑气路线需要灵石支撑锻造，减少非必要开支',
    pillSustain: '丹道路线可以通过丹药出售补充灵石，加速产线',
    arrayGuard: '护阵路线以稳为主，先保证坊市收入',
    beastHarvest: '御兽路线灵石消耗在灵宠上，考虑暂停灵宠捕获',
  },
  herb: {
    swordBurst: '剑气路线不依赖灵草，但溢出可惜，转为锻造材料',
    pillSustain: '丹道路线灵草是核心资源，提升灵田并开启恢复专项',
    arrayGuard: '护阵路线灵草可以转入防御丹药，不要浪费',
    beastHarvest: '御兽路线灵草可以吸引灵宠，利用市场交换',
  },
  ore: {
    swordBurst: '剑气路线需要矿材支撑锻造，提升矿场等级',
    pillSustain: '丹道路线矿材需求低，考虑出售换取灵草',
    arrayGuard: '护阵路线矿材可以转为防御装备，适度投入',
    beastHarvest: '御兽路线矿材是锻造材料，保持产出',
  },
  disciples: {
    swordBurst: '剑气路线需要精锐核心，淘汰低潜力弟子',
    pillSustain: '丹道路线需要多样专长弟子，提升供养上限',
    arrayGuard: '护阵路线弟子不宜过多，专注培养核心',
    beastHarvest: '御兽路线需要采集型弟子，优先提升供养上限',
  },
  recovering: {
    swordBurst: '缩短战斗，提升爆发模板减少受伤',
    pillSustain: '开启恢复专项，降低远征补给档位加速恢复',
    arrayGuard: '调整模板回到保守并提高防线，减少战损',
    beastHarvest: '降低采集频率，让弟子先恢复再出发',
  },
  expedition: {
    swordBurst: '剑气路线最需要远征推进，调整队伍优先出战',
    pillSustain: '丹道路线不一定急于远征，先补足资源',
    arrayGuard: '护阵路线确保队伍安全，用保守模板',
    beastHarvest: '御兽路线远征收益高，优先恢复主力后出击',
  },
  stable: {
    swordBurst: '当前平稳，适合押一次高风险远征争取突破',
    pillSustain: '当前平稳，适合开启冲关专项推高境界',
    arrayGuard: '当前平稳，适合稳扎稳打积累资源',
    beastHarvest: '当前平稳，适合集中灵宠培养提高采集效率',
  },
}

const BOTTLENECK_ACTION_SUMMARIES: Record<BottleneckId, Record<SectArchetype, string>> = {
  spiritEnergy: {
    swordBurst: '降低远征 + 提升灵田',
    pillSustain: '调整闭关节奏',
    arrayGuard: '保住灵气底线',
    beastHarvest: '减少采集消耗',
  },
  spiritStone: {
    swordBurst: '减少非必要开支',
    pillSustain: '加速产线出售',
    arrayGuard: '保证坊市收入',
    beastHarvest: '暂停灵宠捕获',
  },
  herb: {
    swordBurst: '转锻造材料',
    pillSustain: '提升灵田 + 恢复专项',
    arrayGuard: '转防御丹药',
    beastHarvest: '市场交换',
  },
  ore: {
    swordBurst: '提升矿场等级',
    pillSustain: '出售换灵草',
    arrayGuard: '适度投入锻造',
    beastHarvest: '保持产出',
  },
  disciples: {
    swordBurst: '精简队伍',
    pillSustain: '提升供养上限',
    arrayGuard: '专注核心',
    beastHarvest: '优先供养上限',
  },
  recovering: {
    swordBurst: '提爆发模板',
    pillSustain: '恢复专项 + 降补给',
    arrayGuard: '保守模板 + 提防线',
    beastHarvest: '降采集频率',
  },
  expedition: {
    swordBurst: '优先出战',
    pillSustain: '先补资源',
    arrayGuard: '保守模板',
    beastHarvest: '恢复后出击',
  },
  stable: {
    swordBurst: '高风险远征',
    pillSustain: '冲关专项',
    arrayGuard: '稳扎稳打',
    beastHarvest: '灵宠培养',
  },
}

/** Get archetype-specific advice for a bottleneck */
export function getArchetypeBottleneckAdvice(bottleneckId: string, archetype: SectArchetype): ArchetypeAdvice {
  const adviceMap = BOTTLENECK_ADVICE[bottleneckId as BottleneckId]
  const actionMap = BOTTLENECK_ACTION_SUMMARIES[bottleneckId as BottleneckId]

  if (!adviceMap || !actionMap) {
    return {
      archetype,
      suggestion: '暂无路线专属建议',
      actionSummary: '保持当前策略',
    }
  }

  return {
    archetype,
    suggestion: adviceMap[archetype],
    actionSummary: actionMap[archetype],
  }
}

/** Get all archetype advices for a bottleneck */
export function getAllArchetypeAdvices(bottleneckId: string): ArchetypeAdvice[] {
  const archetypes: SectArchetype[] = ['swordBurst', 'pillSustain', 'arrayGuard', 'beastHarvest']
  return archetypes.map((a) => getArchetypeBottleneckAdvice(bottleneckId, a))
}
