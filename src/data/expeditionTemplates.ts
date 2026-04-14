import type {
  ArchiveMilestoneEntry,
  CasualtyTolerance,
  ExpeditionFallbackRule,
  ExpeditionRewardFocus,
  ExpeditionTemplate,
  ExpeditionTeamRule,
  RiskTier,
  RiskHookDescriptor,
} from '../types'
import { getLegacyTemplateCapacity } from './legacy'

const CORE_TEMPLATE_IDS = ['steadyHarvest', 'materialSprint', 'techniqueSeek', 'petPatrol', 'breakthroughPush'] as const
const SPECIAL_TEMPLATE_IDS = ['guixuResonance'] as const

export const EXPEDITION_TEMPLATE_IDS = [...CORE_TEMPLATE_IDS, ...SPECIAL_TEMPLATE_IDS] as const
export type ExpeditionTemplateId = (typeof EXPEDITION_TEMPLATE_IDS)[number]

interface ExpeditionTemplatePreset {
  id: ExpeditionTemplateId
  name: string
  teamRule: ExpeditionTeamRule
  riskTolerance: CasualtyTolerance
  rewardFocus: ExpeditionRewardFocus
  fallbackOnFailure: ExpeditionFallbackRule
  defaultDungeonId: string | null
  defaultSupplyLevel: ExpeditionTemplate['supplyLevel']
  defaultEnabled: boolean
  notes: string
  riskTier: RiskTier
  riskHookDescriptor: RiskHookDescriptor
}

export interface ExpeditionTemplateSignal {
  label: string
  detail: string
}

export interface ExpeditionLoopPreview {
  title: string
  yieldSummary: string
  detail: string
  recommendation: string
  tideCrystalRange: { min: number; max: number }
  abyssShardRange: { min: number; max: number }
}

const CORE_TEMPLATE_PRESETS: ExpeditionTemplatePreset[] = [
  {
    id: 'steadyHarvest',
    name: '稳健采集',
    teamRule: 'balanced',
    riskTolerance: 'conservative',
    rewardFocus: 'resources',
    fallbackOnFailure: 'downgrade_dungeon',
    defaultDungeonId: 'lingCaoValley',
    defaultSupplyLevel: 'basic',
    defaultEnabled: true,
    notes: '低损耗、稳定回收，适合作为日常挂机底盘。',
    riskTier: 'safe',
    riskHookDescriptor: {
      title: '安稳修行',
      exclusiveRewards: ['稳定灵石回收', '基础资源积累'],
      likelyPenalty: ['收益缓慢'],
      bestForArchetypes: ['pillSustain', 'arrayGuard'],
    },
  },
  {
    id: 'materialSprint',
    name: '材料冲刺',
    teamRule: 'topPower',
    riskTolerance: 'balanced',
    rewardFocus: 'materials',
    fallbackOnFailure: 'swap_team',
    defaultDungeonId: null,
    defaultSupplyLevel: 'basic',
    defaultEnabled: true,
    notes: '优先带回突破、锻造和中后期成长所需材料。',
    riskTier: 'press',
    riskHookDescriptor: {
      title: '压榨推进',
      exclusiveRewards: ['稀有锻造材料', '中期突破素材'],
      likelyPenalty: ['弟子疲劳增加', '恢复时间延长'],
      bestForArchetypes: ['swordBurst', 'arrayGuard'],
    },
  },
  {
    id: 'techniqueSeek',
    name: '功法寻宝',
    teamRule: 'balanced',
    riskTolerance: 'balanced',
    rewardFocus: 'techniques',
    fallbackOnFailure: 'downgrade_dungeon',
    defaultDungeonId: null,
    defaultSupplyLevel: 'basic',
    defaultEnabled: true,
    notes: '兼顾收益与机缘，适合中期稳定推进。',
    riskTier: 'safe',
    riskHookDescriptor: {
      title: '安稳修行',
      exclusiveRewards: ['功法残卷发现', '参悟度提升'],
      likelyPenalty: ['收益波动'],
      bestForArchetypes: ['pillSustain', 'beastHarvest'],
    },
  },
  {
    id: 'petPatrol',
    name: '捕宠巡猎',
    teamRule: 'reserveCore',
    riskTolerance: 'balanced',
    rewardFocus: 'pets',
    fallbackOnFailure: 'pause_template',
    defaultDungeonId: null,
    defaultSupplyLevel: 'basic',
    defaultEnabled: false,
    notes: '保留主力，让副队巡山摸宠，不打断宗门主循环。',
    riskTier: 'safe',
    riskHookDescriptor: {
      title: '安稳修行',
      exclusiveRewards: ['灵宠捕获', '灵兽素材'],
      likelyPenalty: ['收益偏低'],
      bestForArchetypes: ['beastHarvest'],
    },
  },
  {
    id: 'breakthroughPush',
    name: '搏命冲层',
    teamRule: 'topPower',
    riskTolerance: 'risky',
    rewardFocus: 'progress',
    fallbackOnFailure: 'downgrade_dungeon',
    defaultDungeonId: null,
    defaultSupplyLevel: 'enhanced',
    defaultEnabled: false,
    notes: '用于关键阶段冲首通、冲高层或搏终盘收益。',
    riskTier: 'gamble',
    riskHookDescriptor: {
      title: '押注奇遇',
      exclusiveRewards: ['首通突破奖励', '高层独占素材', '关键推进节点'],
      likelyPenalty: ['弟子重伤', '大量资源损失', '节奏大幅回退'],
      bestForArchetypes: ['swordBurst', 'beastHarvest'],
    },
  },
]

const SPECIAL_TEMPLATE_PRESETS: ExpeditionTemplatePreset[] = [
  {
    id: 'guixuResonance',
    name: '归墟回响',
    teamRule: 'topPower',
    riskTolerance: 'balanced',
    rewardFocus: 'materials',
    fallbackOnFailure: 'downgrade_dungeon',
    defaultDungeonId: 'guixuRift',
    defaultSupplyLevel: 'enhanced',
    defaultEnabled: false,
    notes: '双遗共鸣后解锁。专门用于稳定刷归墟遗材，把共鸣收益转成长期挂机优势。',
    riskTier: 'destiny',
    riskHookDescriptor: {
      title: '命数之搏',
      exclusiveRewards: ['归墟独占遗材', '潮晶与残片大量回收', '终盘成长加速'],
      likelyPenalty: ['主力队伍严重疲劳', '宗门节奏大幅回退', '可能丢失关键突破窗口'],
      bestForArchetypes: ['arrayGuard', 'swordBurst'],
    },
  },
]

function buildTemplateFromPreset(preset: ExpeditionTemplatePreset): ExpeditionTemplate {
  return {
    id: preset.id,
    name: preset.name,
    enabled: preset.defaultEnabled,
    dungeonId: preset.defaultDungeonId,
    teamRule: preset.teamRule,
    supplyLevel: preset.defaultSupplyLevel,
    riskTolerance: preset.riskTolerance,
    rewardFocus: preset.rewardFocus,
    fallbackOnFailure: preset.fallbackOnFailure,
    notes: preset.notes,
    riskTier: preset.riskTier,
    riskHookDescriptor: preset.riskHookDescriptor,
  }
}

function hasArchiveMilestone(archiveMilestones: ArchiveMilestoneEntry[], id: string): boolean {
  return archiveMilestones.some((milestone) => milestone.id === id)
}

function getUnlockedSpecialPresets(archiveMilestones: ArchiveMilestoneEntry[]): ExpeditionTemplatePreset[] {
  return hasArchiveMilestone(archiveMilestones, 'legacyForgePair') ? SPECIAL_TEMPLATE_PRESETS : []
}

export function createDefaultExpeditionTemplates(
  templateCapacity = CORE_TEMPLATE_PRESETS.length
): ExpeditionTemplate[] {
  return CORE_TEMPLATE_PRESETS.slice(0, templateCapacity).map(buildTemplateFromPreset)
}

export function createLegacyExpeditionTemplates(ascensionCount: number): ExpeditionTemplate[] {
  return createDefaultExpeditionTemplates(getLegacyTemplateCapacity(ascensionCount))
}

export function ensureUnlockedExpeditionTemplates(
  templates: ExpeditionTemplate[],
  archiveMilestones: ArchiveMilestoneEntry[],
  templateCapacity: number
): ExpeditionTemplate[] {
  const coreTemplates = CORE_TEMPLATE_PRESETS.slice(0, templateCapacity).map((preset) => {
    const existing = templates.find((template) => template.id === preset.id)
    return existing ? { ...buildTemplateFromPreset(preset), ...existing } : buildTemplateFromPreset(preset)
  })

  const specialTemplates = getUnlockedSpecialPresets(archiveMilestones).map((preset) => {
    const existing = templates.find((template) => template.id === preset.id)
    return existing ? { ...buildTemplateFromPreset(preset), ...existing } : buildTemplateFromPreset(preset)
  })

  return [...coreTemplates, ...specialTemplates]
}

export function getVisibleExpeditionTemplates(
  templates: ExpeditionTemplate[],
  ascensionCount: number,
  archiveMilestones: ArchiveMilestoneEntry[]
): ExpeditionTemplate[] {
  return ensureUnlockedExpeditionTemplates(templates, archiveMilestones, getLegacyTemplateCapacity(ascensionCount))
}

export function getSpecialExpeditionTemplateCount(archiveMilestones: ArchiveMilestoneEntry[]): number {
  return getUnlockedSpecialPresets(archiveMilestones).length
}

export function getExpeditionTemplateSignal(
  templateId: string,
  archiveMilestones: ArchiveMilestoneEntry[]
): ExpeditionTemplateSignal | null {
  if (templateId !== 'guixuResonance') return null
  if (hasArchiveMilestone(archiveMilestones, 'legacyForgeTrinity')) {
    return {
      label: '终盘循环',
      detail: '三遗齐鸣已成，归墟回响会稳定带回潮晶与残片，适合作为后期常驻挂机线。',
    }
  }
  if (hasArchiveMilestone(archiveMilestones, 'legacyForgePair')) {
    return {
      label: '共鸣已成',
      detail: '双遗共鸣已成，归墟回响已经进入稳定刷材阶段。',
    }
  }
  return null
}

export function getExpeditionLoopPreview(
  template: Pick<ExpeditionTemplate, 'id' | 'riskTolerance' | 'supplyLevel' | 'rewardFocus'>,
  archiveMilestones: ArchiveMilestoneEntry[]
): ExpeditionLoopPreview | null {
  if (template.id !== 'guixuResonance') return null

  const hasPair = hasArchiveMilestone(archiveMilestones, 'legacyForgePair')
  const hasTrinity = hasArchiveMilestone(archiveMilestones, 'legacyForgeTrinity')
  if (!hasPair) return null

  let tideMin = hasTrinity ? 2 : 1
  let tideMax = hasTrinity ? 3 : 2
  let shardMin = hasTrinity ? 1 : 0
  let shardMax = hasTrinity ? 2 : 1

  if (template.riskTolerance === 'balanced') {
    shardMax += 1
  } else if (template.riskTolerance === 'risky') {
    tideMin += 1
    tideMax += 1
    shardMin += 1
    shardMax += 1
  }

  if (template.supplyLevel === 'enhanced') {
    tideMax += 1
  } else if (template.supplyLevel === 'luxury') {
    tideMin += 1
    tideMax += 1
    shardMax += 1
  }

  if (template.rewardFocus === 'materials') {
    tideMin += 1
    tideMax += 1
    shardMin += 1
  } else if (template.rewardFocus === 'progress') {
    shardMin += 1
    shardMax += 1
  } else if (template.rewardFocus === 'techniques') {
    shardMax += 1
  }

  const title =
    template.riskTolerance === 'risky'
      ? '深潜搏材'
      : template.riskTolerance === 'conservative'
        ? '稳流采撷'
        : '均衡回响'

  const yieldSummary = `单轮参考：潮晶 ${tideMin}-${tideMax}，残片 ${shardMin}-${shardMax}`
  const detail =
    template.supplyLevel === 'luxury'
      ? '高阶补给能把归墟回响推到更深层，遗材回收会更满，但也更依赖主力队伍稳定性。'
      : template.rewardFocus === 'progress'
        ? '当前配置更偏向深层推进，残片增长会更明显，适合为第三段遗器或后续终盘内容囤料。'
        : '当前配置更偏向稳定刷材，适合把归墟回响挂成宗门后期的常驻材料线。'
  const recommendation =
    template.riskTolerance === 'risky'
      ? '适合主力队伍完整、补给充足时短期开高收益。若近期连续失利，优先回调到均衡。'
      : template.supplyLevel === 'basic'
        ? '更适合作为低波动保底模板，先稳住潮晶回流，再视库存抬高补给。'
        : '适合作为当前终盘主挂机线，稳定回收潮晶并兼顾残片积累。'

  return {
    title,
    yieldSummary,
    detail,
    recommendation,
    tideCrystalRange: { min: tideMin, max: tideMax },
    abyssShardRange: { min: shardMin, max: shardMax },
  }
}

export function getRewardFocusLabel(focus: ExpeditionRewardFocus): string {
  switch (focus) {
    case 'resources':
      return '资源'
    case 'materials':
      return '材料'
    case 'techniques':
      return '功法'
    case 'pets':
      return '灵宠'
    case 'progress':
      return '推进'
  }
}

export function getTeamRuleLabel(teamRule: ExpeditionTeamRule): string {
  switch (teamRule) {
    case 'topPower':
      return '最强阵'
    case 'balanced':
      return '均衡阵'
    case 'reserveCore':
      return '留核心'
  }
}

export function getFallbackRuleLabel(rule: ExpeditionFallbackRule): string {
  switch (rule) {
    case 'downgrade_dungeon':
      return '自动降档'
    case 'swap_team':
      return '换队再试'
    case 'pause_template':
      return '暂停模板'
  }
}

export function getRiskTierLabel(riskTier: RiskTier | undefined): string {
  switch (riskTier) {
    case 'safe':
      return '安稳修行'
    case 'press':
      return '压榨推进'
    case 'gamble':
      return '押注奇遇'
    case 'destiny':
      return '命数之搏'
    default:
      return '未知'
  }
}

export function isHighRiskTemplate(templateId: string): boolean {
  return templateId === 'breakthroughPush' || templateId === 'guixuResonance'
}

const ALL_PRESETS = [...CORE_TEMPLATE_PRESETS, ...SPECIAL_TEMPLATE_PRESETS]
const PRESET_MAP: Map<string, ExpeditionTemplatePreset> = new Map(ALL_PRESETS.map((p) => [p.id, p]))

export function getTemplateRiskHook(templateId: string): RiskHookDescriptor | null {
  return PRESET_MAP.get(templateId)?.riskHookDescriptor ?? null
}
