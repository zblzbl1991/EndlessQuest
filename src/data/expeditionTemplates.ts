import type {
  ArchiveMilestoneEntry,
  CasualtyTolerance,
  ExpeditionFallbackRule,
  ExpeditionRewardFocus,
  ExpeditionTemplate,
  ExpeditionTeamRule,
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
}

export interface ExpeditionTemplateSignal {
  label: string
  detail: string
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
