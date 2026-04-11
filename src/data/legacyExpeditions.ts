import type {
  AdventureReportResult,
  AdventureReportStepType,
  AnyItem,
  Material,
  Resources,
  TechniqueScroll,
} from '../types'
import { getTechniqueById } from './techniquesTable'

export interface LegacyReportEntry {
  floor: number | null
  type: AdventureReportStepType
  summary: string
  detail: string
}

export interface LegacyExpeditionOutcome {
  bonusResources: Resources
  bonusItems: AnyItem[]
  branchTags: string[]
  reportEntries: LegacyReportEntry[]
  milestoneMessage?: string
}

interface LegacyExpeditionContext {
  dungeonId: string
  result: AdventureReportResult
  floorsCleared: number
  isFirstClear: boolean
}

function emptyResources(): Resources {
  return {
    spiritStone: 0,
    spiritEnergy: 0,
    herb: 0,
    ore: 0,
  }
}

function createLegacyMaterial(
  idPrefix: string,
  name: string,
  quality: Material['quality'],
  description: string,
  sellPrice: number
): Material {
  return {
    id: `${idPrefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    quality,
    type: 'material',
    description,
    sellPrice,
    category: 'other',
  }
}

function createLegacyTechniqueScroll(techniqueId: string): TechniqueScroll {
  const technique = getTechniqueById(techniqueId)
  const techniqueName = technique?.name ?? techniqueId
  return {
    id: `legacy_scroll_${techniqueId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: `${techniqueName}（遗产残卷）`,
    quality: 'chaos',
    type: 'techniqueScroll',
    techniqueId,
    description: `自归墟深处带回的古卷，记载着 ${techniqueName} 的遗产篇章。`,
    sellPrice: 3200,
  }
}

export function resolveLegacyExpeditionOutcome(context: LegacyExpeditionContext): LegacyExpeditionOutcome {
  const outcome: LegacyExpeditionOutcome = {
    bonusResources: emptyResources(),
    bonusItems: [],
    branchTags: [],
    reportEntries: [],
  }

  if (context.dungeonId !== 'guixuRift') {
    return outcome
  }

  if (context.floorsCleared >= 3) {
    outcome.branchTags.push('归墟潮痕')
    outcome.reportEntries.push({
      floor: 3,
      type: 'auto_choice_made',
      summary: '潮汐回响',
      detail: '归墟潮声开始裹住队伍，残破石壁上浮现出旧时代的刻痕。',
    })
  }

  if (context.floorsCleared >= 8) {
    outcome.branchTags.push('渊壁低语')
    outcome.reportEntries.push({
      floor: 8,
      type: 'auto_choice_made',
      summary: '渊壁低语',
      detail: '越过中层后，渊壁传来断续低语，指向更深处的遗产藏所。',
    })
  }

  if (context.result === 'retreated' && context.floorsCleared >= 4) {
    outcome.bonusResources.spiritStone += 80
    outcome.bonusItems.push(
      createLegacyMaterial(
        'guixu_tide_crystal',
        '归墟潮晶',
        'spirit',
        '带着潮汐余温的晶体，可作后续遗产锻造引子。',
        180
      )
    )
    outcome.reportEntries.push({
      floor: context.floorsCleared,
      type: 'reward_gained',
      summary: '带回遗产碎晶',
      detail: '虽然提前撤离，队伍仍从归墟边缘带回了一枚潮晶。',
    })
    return outcome
  }

  if (context.result !== 'completed') {
    return outcome
  }

  outcome.branchTags.push('深渊开匣')
  outcome.bonusResources.spiritStone += 220
  outcome.bonusResources.ore += 18
  outcome.bonusItems.push(
    createLegacyMaterial('guixu_tide_crystal', '归墟潮晶', 'spirit', '带着潮汐余温的晶体，可作后续遗产锻造引子。', 180),
    createLegacyMaterial('abyss_echo_shard', '渊息残片', 'divine', '自裂隙最深处剥落的残片，仍残留归墟回响。', 420)
  )
  outcome.reportEntries.push({
    floor: context.floorsCleared,
    type: 'reward_gained',
    summary: '归墟藏匣开启',
    detail: '队伍在最深层撬开了遗产藏匣，带回潮晶、渊息残片与额外灵石。',
  })

  if (context.isFirstClear) {
    outcome.bonusItems.push(createLegacyTechniqueScroll('hongmengdaojue'))
    outcome.reportEntries.push({
      floor: context.floorsCleared,
      type: 'reward_gained',
      summary: '遗产首通',
      detail: '首通归墟裂隙后，宗门自深渊回收了一卷《鸿蒙道诀》残篇。',
    })
    outcome.milestoneMessage = '归墟裂隙首通，宗门自深渊取回了《鸿蒙道诀》残篇。'
  }

  return outcome
}
