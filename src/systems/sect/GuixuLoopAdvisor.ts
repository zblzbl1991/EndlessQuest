import type { AdventureReport, AdventureReportResult, ExpeditionTemplate } from '../../types'
import { getExpeditionLoopPreview, type ExpeditionLoopPreview } from '../../data/expeditionTemplates'
import type { ArchiveMilestoneEntry } from '../../types'

type GuixuTemplateShape = Pick<
  ExpeditionTemplate,
  'id' | 'riskTolerance' | 'supplyLevel' | 'rewardFocus' | 'fallbackOnFailure'
>

export interface GuixuLoopYield {
  tideCrystalCount: number
  abyssShardCount: number
  floorsCleared: number
  result: AdventureReportResult
}

export interface GuixuLoopYieldStatus {
  label: string
  detail: string
  tone: 'balanced' | 'good' | 'warn'
}

export interface GuixuLoopAdjustmentSuggestion {
  id: string
  label: string
  detail: string
  changes?: Partial<Pick<ExpeditionTemplate, 'riskTolerance' | 'supplyLevel' | 'rewardFocus' | 'fallbackOnFailure'>>
}

export interface GuixuLoopAnalysis {
  preview: ExpeditionLoopPreview | null
  status: GuixuLoopYieldStatus | null
  suggestions: GuixuLoopAdjustmentSuggestion[]
}

export function summarizeGuixuLoopYield(report: AdventureReport | undefined): GuixuLoopYield | null {
  if (!report || report.dungeonId !== 'guixuRift') return null

  const tideCrystalCount = report.itemRewards.filter((item) => item.name === '归墟潮晶').length
  const abyssShardCount = report.itemRewards.filter((item) => item.name === '渊息残片').length
  if (tideCrystalCount === 0 && abyssShardCount === 0) return null

  return {
    tideCrystalCount,
    abyssShardCount,
    floorsCleared: report.floorsCleared,
    result: report.result,
  }
}

function evaluateGuixuLoopYieldStatus(
  preview: ExpeditionLoopPreview | null,
  latestYield: GuixuLoopYield | null
): GuixuLoopYieldStatus | null {
  if (!preview || !latestYield) return null

  const tideInRange =
    latestYield.tideCrystalCount >= preview.tideCrystalRange.min &&
    latestYield.tideCrystalCount <= preview.tideCrystalRange.max
  const shardInRange =
    latestYield.abyssShardCount >= preview.abyssShardRange.min &&
    latestYield.abyssShardCount <= preview.abyssShardRange.max

  if (tideInRange && shardInRange) {
    return {
      label: '符合预估',
      detail: '最近一轮归墟回响的材料回收落在当前模板预期区间内，可以继续按这套配置挂机。',
      tone: 'balanced',
    }
  }

  if (
    latestYield.tideCrystalCount > preview.tideCrystalRange.max ||
    latestYield.abyssShardCount > preview.abyssShardRange.max
  ) {
    return {
      label: '高于预估',
      detail: '这轮归墟收益明显偏高，适合观察是否值得继续维持当前高补给或高风险配置。',
      tone: 'good',
    }
  }

  return {
    label: '低于预估',
    detail: '这轮材料回收偏低，若已连续出现，优先降低风险或提高补给稳定层数。',
    tone: 'warn',
  }
}

function buildGuixuLoopAdjustmentSuggestions(
  template: GuixuTemplateShape,
  status: GuixuLoopYieldStatus | null,
  latestYield: GuixuLoopYield | null
): GuixuLoopAdjustmentSuggestion[] {
  if (template.id !== 'guixuResonance' || !status) return []

  const suggestions: GuixuLoopAdjustmentSuggestion[] = []

  if (status.tone === 'warn') {
    if (template.riskTolerance === 'risky') {
      suggestions.push({
        id: 'stabilize-risk',
        label: '改成均衡风险',
        detail: '先把归墟推进层数稳住，再观察潮晶和残片是否回到预估区间。',
        changes: { riskTolerance: 'balanced' },
      })
    }

    if (template.supplyLevel === 'basic') {
      suggestions.push({
        id: 'raise-supply',
        label: '补给升到充足',
        detail: '补给偏低时更容易断层，先把回响稳定性抬上来。',
        changes: { supplyLevel: 'enhanced' },
      })
    } else if (template.supplyLevel === 'enhanced' && latestYield?.result === 'failed') {
      suggestions.push({
        id: 'raise-supply-luxury',
        label: '补给升到豪华',
        detail: '最近已经出现失利，豪华补给更适合把高风险模板拉回稳定线。',
        changes: { supplyLevel: 'luxury' },
      })
    }

    if (template.rewardFocus !== 'materials') {
      suggestions.push({
        id: 'focus-materials',
        label: '切回材料收益',
        detail: '当前回收偏低时，先把收益偏好锁回遗材本身，更容易看清配置问题。',
        changes: { rewardFocus: 'materials' },
      })
    }
  } else if (status.tone === 'good') {
    if (template.rewardFocus !== 'progress') {
      suggestions.push({
        id: 'convert-to-progress',
        label: '改成推进收益',
        detail: '这套配置已经高于预估，可以把部分溢出收益转成更深层推进。',
        changes: { rewardFocus: 'progress' },
      })
    }

    if (template.supplyLevel === 'luxury') {
      suggestions.push({
        id: 'trim-supply',
        label: '回调到充足补给',
        detail: '如果想省一点长期成本，可以先试着降一档补给观察波动。',
        changes: { supplyLevel: 'enhanced' },
      })
    }
  } else {
    if (template.rewardFocus !== 'progress') {
      suggestions.push({
        id: 'try-progress',
        label: '试一轮推进收益',
        detail: '当前回收已经稳定，下一步可以用一轮推进收益测试是否还能把层数再抬高。',
        changes: { rewardFocus: 'progress' },
      })
    }

    suggestions.push({
      id: 'hold-template',
      label: '继续观察当前模板',
      detail: '现在的材料回收基本符合预估，先维持 2 到 3 轮更容易判断长期波动。',
    })
  }

  return suggestions.slice(0, 2)
}

export function analyzeGuixuLoop(
  template: GuixuTemplateShape | null,
  archiveMilestones: ArchiveMilestoneEntry[],
  latestYield: GuixuLoopYield | null
): GuixuLoopAnalysis {
  if (!template || template.id !== 'guixuResonance') {
    return {
      preview: null,
      status: null,
      suggestions: [],
    }
  }

  const preview = getExpeditionLoopPreview(template, archiveMilestones)
  const status = evaluateGuixuLoopYieldStatus(preview, latestYield)
  const suggestions = buildGuixuLoopAdjustmentSuggestions(template, status, latestYield)

  return {
    preview,
    status,
    suggestions,
  }
}
