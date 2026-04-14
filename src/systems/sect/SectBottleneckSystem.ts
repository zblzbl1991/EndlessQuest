import type { Sect, SectArchetype } from '../../types'
import { getArchetypeBottleneckAdvice } from './ArchetypeBottleneckAdvisor'
import { calcResourceCaps } from '../../data/buildings'
import { calcMaxDisciplesByResources } from './SectEngine'

export interface SectBottleneckAdvice {
  defaultSuggestion: string
  byArchetype?: Partial<Record<SectArchetype, string>>
}

export interface SectBottleneck {
  id: 'spiritEnergy' | 'spiritStone' | 'herb' | 'ore' | 'disciples' | 'recovering' | 'expedition' | 'stable'
  label: string
  detail: string
  severity: 'low' | 'medium' | 'high'
  suggestion: string
  link: '/buildings' | '/characters' | '/adventure' | '/'
  archetypeAdvice?: SectBottleneckAdvice
}

export function diagnoseSectBottlenecks(sect: Sect): SectBottleneck[] {
  const spiritField = sect.buildings.find((building) => building.type === 'spiritField')
  const spiritMine = sect.buildings.find((building) => building.type === 'spiritMine')
  const caps = calcResourceCaps(
    spiritField?.level ?? 0,
    spiritMine?.level ?? 0,
    spiritField?.count ?? 0,
    spiritMine?.count ?? 0
  )
  const recoveringCount = sect.characters.filter((character) => character.status === 'recovering').length
  const idleCount = sect.characters.filter((character) => character.status === 'idle').length
  const maxDisciples = calcMaxDisciplesByResources(sect.buildings, sect.characters, sect.activeRoute)
  const activeTemplate = sect.automationSettings.expeditionTemplates.find(
    (template) => template.id === sect.automationSettings.activeTemplateId
  )

  const bottlenecks: SectBottleneck[] = []

  if (sect.resources.spiritEnergy < sect.automationSettings.reserveSpiritEnergy) {
    bottlenecks.push({
      id: 'spiritEnergy',
      label: '灵气偏紧',
      detail: `当前灵气 ${Math.floor(sect.resources.spiritEnergy)}，已低于保留线 ${sect.automationSettings.reserveSpiritEnergy}。`,
      severity: 'high',
      suggestion: '优先提升修炼线或降低外勤消耗。',
      link: '/buildings',
    })
  }

  if (sect.resources.spiritStone < sect.automationSettings.reserveSpiritStone) {
    bottlenecks.push({
      id: 'spiritStone',
      label: '灵石储备不足',
      detail: `当前灵石 ${Math.floor(sect.resources.spiritStone)}，自动补员与远征会更保守。`,
      severity: 'high',
      suggestion: '先稳住坊市 / 灵矿，再考虑扩张。',
      link: '/buildings',
    })
  }

  if (caps.herb > 0 && sect.resources.herb / caps.herb > 0.85) {
    bottlenecks.push({
      id: 'herb',
      label: '灵草即将溢出',
      detail: `灵草 ${Math.floor(sect.resources.herb)} / ${caps.herb}，建议尽快转入炼丹或远征消耗。`,
      severity: 'medium',
      suggestion: '开启自动炼化或切换材料型模板。',
      link: '/buildings',
    })
  }

  if (sect.characters.length >= maxDisciples) {
    bottlenecks.push({
      id: 'disciples',
      label: '弟子供养触顶',
      detail: `当前弟子 ${sect.characters.length} / ${maxDisciples}，新增招募将停滞。`,
      severity: 'medium',
      suggestion: '提高供养上限，或调整低价值弟子的职责。',
      link: '/characters',
    })
  }

  if (recoveringCount >= Math.max(2, Math.ceil(sect.characters.length * 0.3))) {
    bottlenecks.push({
      id: 'recovering',
      label: '恢复压力偏高',
      detail: `${recoveringCount} 名弟子正在恢复，宗门战力与产线都会受影响。`,
      severity: 'high',
      suggestion: '降低远征风险，优先回稳主力状态。',
      link: '/characters',
    })
  }

  if (activeTemplate && idleCount === 0) {
    bottlenecks.push({
      id: 'expedition',
      label: '远征无人可用',
      detail: `当前模板「${activeTemplate.name}」已启用，但宗门暂无空闲弟子。`,
      severity: 'medium',
      suggestion: '重新分工弟子，或换成保留核心的模板。',
      link: '/adventure',
    })
  }

  if (bottlenecks.length === 0) {
    bottlenecks.push({
      id: 'stable',
      label: '宗门运转平稳',
      detail: '当前没有明显硬瓶颈，可以继续沿着既定方向挂机推进。',
      severity: 'low',
      suggestion: '优先追求下一次阶段跃迁或更高阶秘境。',
      link: '/',
    })
  }

  // Enrich with archetype-specific advice
  const currentArchetype = sect.currentArchetype
  const alternativeArchetypes: SectArchetype[] = (
    ['swordBurst', 'pillSustain', 'arrayGuard', 'beastHarvest'] as SectArchetype[]
  ).filter((a) => a !== currentArchetype)
  const alternative = alternativeArchetypes[0] ?? 'pillSustain'

  for (const bottleneck of bottlenecks) {
    const currentAdvice = getArchetypeBottleneckAdvice(bottleneck.id, currentArchetype)
    const altAdvice = getArchetypeBottleneckAdvice(bottleneck.id, alternative)
    bottleneck.archetypeAdvice = {
      defaultSuggestion: bottleneck.suggestion,
      byArchetype: {
        [currentArchetype]: currentAdvice.suggestion,
        [alternative]: altAdvice.suggestion,
      },
    }
  }

  return bottlenecks.slice(0, 2)
}
