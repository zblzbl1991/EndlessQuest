import type { AdventureReport, AdventureReportSummary, ExpeditionTemplate, OfflineAccumulator, Sect } from '../../types'
import { getExpeditionTemplateSignal } from '../../data/expeditionTemplates'
import { getLegacyReportFlavor } from '../../data/legacyFlavor'
import { REPORT_RESULT_LABELS } from '../../data/uiCopy'
import { diagnoseSectBottlenecks } from './SectBottleneckSystem'
import { buildSectRumors } from './SectRumorSystem'
import { analyzeGuixuLoop, summarizeGuixuLoopYield } from './GuixuLoopAdvisor'
import { getArchetypeName } from '../../data/sectArchetypes'

export interface OfflineNarrativeItem {
  id: string
  title: string
  detail: string
  tone: 'accent' | 'good' | 'warn'
}

export interface OfflineLoopRewardSummary {
  title: string
  detail: string
  tideCrystalCount: number
  abyssShardCount: number
}

export interface OfflineLoopAdjustment {
  label: string
  detail: string
  actionLabel?: string
  changes?: Partial<Pick<ExpeditionTemplate, 'riskTolerance' | 'supplyLevel' | 'rewardFocus' | 'fallbackOnFailure'>>
}

export interface OfflineNarrativeSummary {
  notableEvents: OfflineNarrativeItem[]
  nextSuggestion: string
  loopRewards?: OfflineLoopRewardSummary
  loopAdjustment?: OfflineLoopAdjustment
}

interface BuildOfflineNarrativeInput {
  sect: Sect
  accumulator: OfflineAccumulator
  recentReports: AdventureReportSummary[]
  recentReportDetails?: AdventureReport[]
  recentEvents: Array<{ id: string; type: string; message: string; data?: Record<string, unknown> }>
}

function buildLoopRewardSummary(
  recentReportDetails: AdventureReport[],
  templateSignal: ReturnType<typeof getExpeditionTemplateSignal>
): OfflineLoopRewardSummary | undefined {
  const guixuReports = recentReportDetails.filter((report) => report.dungeonId === 'guixuRift')
  if (guixuReports.length === 0) return undefined

  const tideCrystalCount = guixuReports.reduce(
    (sum, report) => sum + report.itemRewards.filter((item) => item.name === '归墟潮晶').length,
    0
  )
  const abyssShardCount = guixuReports.reduce(
    (sum, report) => sum + report.itemRewards.filter((item) => item.name === '渊息残片').length,
    0
  )

  if (tideCrystalCount === 0 && abyssShardCount === 0) return undefined

  const title =
    templateSignal?.label === '终盘循环'
      ? '归墟终盘收获'
      : templateSignal?.label === '共鸣已成'
        ? '归墟共鸣收获'
        : '归墟回响收获'

  const detail =
    templateSignal?.label === '终盘循环'
      ? `离线期间共结算 ${guixuReports.length} 份归墟战报，三遗齐鸣让回响稳定带回深层遗材。`
      : templateSignal?.label === '共鸣已成'
        ? `离线期间共结算 ${guixuReports.length} 份归墟战报，双遗共鸣已经开始稳定回收归墟材料。`
        : `离线期间共结算 ${guixuReports.length} 份归墟战报，本轮回响带回的遗材已整理入库。`

  return {
    title,
    detail,
    tideCrystalCount,
    abyssShardCount,
  }
}

export function buildOfflineNarrative(input: BuildOfflineNarrativeInput): OfflineNarrativeSummary {
  const notableEvents: OfflineNarrativeItem[] = []
  const activeTemplateSignal = getExpeditionTemplateSignal(
    input.sect.automationSettings.activeTemplateId,
    input.sect.archiveMilestones
  )
  const loopRewards = buildLoopRewardSummary(input.recentReportDetails ?? [], activeTemplateSignal)
  const activeTemplate =
    input.sect.automationSettings.expeditionTemplates.find(
      (template) => template.id === input.sect.automationSettings.activeTemplateId
    ) ?? null
  const latestGuixuReport = (input.recentReportDetails ?? []).find((report) => report.dungeonId === 'guixuRift')
  const guixuLoopAnalysis = analyzeGuixuLoop(
    activeTemplate,
    input.sect.archiveMilestones,
    summarizeGuixuLoopYield(latestGuixuReport)
  )
  const loopAdjustment = guixuLoopAnalysis.suggestions[0]
    ? {
        label: guixuLoopAnalysis.status?.label ?? '归墟调参建议',
        detail: guixuLoopAnalysis.suggestions[0].detail,
        actionLabel: guixuLoopAnalysis.suggestions[0].changes ? guixuLoopAnalysis.suggestions[0].label : undefined,
        changes: guixuLoopAnalysis.suggestions[0].changes,
      }
    : undefined

  for (const breakthrough of input.accumulator.breakthroughs.slice(-3).reverse()) {
    notableEvents.push({
      id: `bt_${breakthrough.characterName}_${breakthrough.targetRealm}`,
      title: breakthrough.success ? `${breakthrough.characterName} 突破成功` : `${breakthrough.characterName} 冲关受阻`,
      detail: breakthrough.success
        ? `已踏入 ${breakthrough.targetRealm}，宗门气机更上一层。`
        : '这次冲关未成，后续更适合先补资源、稳心境后再尝试。',
      tone: breakthrough.success ? 'good' : 'warn',
    })
  }

  for (const report of input.recentReports.slice(0, 2)) {
    const legacyFlavor = getLegacyReportFlavor(report.dungeonId)
    if (report.dungeonId === 'guixuRift' && activeTemplateSignal) {
      notableEvents.push({
        id: `guixu_loop_${report.id}`,
        title: activeTemplateSignal.label,
        detail: `${activeTemplateSignal.detail} 本轮归墟回响推进到第 ${report.floorsCleared} 层，带回 ${Math.floor(
          report.rewards.spiritStone
        )} 灵石。`,
        tone: report.result === 'failed' ? 'warn' : 'good',
      })
    }

    if (legacyFlavor) {
      notableEvents.push({
        id: `report_${report.id}`,
        title: legacyFlavor.reportEyebrow,
        detail: `${REPORT_RESULT_LABELS[report.result]}，${legacyFlavor.title} 本轮推进到第 ${report.floorsCleared} 层。`,
        tone: report.result === 'failed' ? 'warn' : report.result === 'completed' ? 'good' : 'accent',
      })
      continue
    }

    notableEvents.push({
      id: `report_${report.id}`,
      title: '远征留下新战报',
      detail: `${REPORT_RESULT_LABELS[report.result]}，推进到第 ${report.floorsCleared} 层，带回 ${Math.floor(
        report.rewards.spiritStone
      )} 灵石。`,
      tone: report.result === 'failed' ? 'warn' : report.result === 'completed' ? 'good' : 'accent',
    })
  }

  for (const rumor of buildSectRumors(input.recentEvents, 2)) {
    notableEvents.push({
      id: `evt_${rumor.id}`,
      title: rumor.title,
      detail: rumor.detail,
      tone: rumor.tone,
    })
  }

  if (input.accumulator.itemsCrafted.length > 0) {
    const craftedCount = input.accumulator.itemsCrafted.reduce((sum, item) => sum + item.quantity, 0)
    notableEvents.push({
      id: 'crafted_batch',
      title: '产线有新收成',
      detail: `离线期间共完成 ${craftedCount} 件炼制或锻造产物，库中已经备好新货。`,
      tone: 'accent',
    })
  }

  // Route opportunity hints
  if (input.sect.routeOpportunities.length > 0) {
    const opp = input.sect.routeOpportunities[0]
    const charName = input.sect.characters.find((c) => c.id === opp.characterId)?.name ?? '某位弟子'
    notableEvents.push({
      id: `route_opp_${opp.characterId}`,
      title: '路线转型时机',
      detail: `${charName} 的特质暗示了「${getArchetypeName(opp.suggestedArchetype)}」路线：${opp.reason}`,
      tone: 'accent',
    })
  }

  const nextSuggestion =
    loopAdjustment?.detail ??
    (activeTemplateSignal?.label === '终盘循环'
      ? '归墟回响已经进入终盘循环，优先保持模板开启并稳定补给，让潮晶与残片持续回流。'
      : (diagnoseSectBottlenecks(input.sect)[0]?.suggestion ?? '宗门运转平稳，可以继续沿着当前策略挂机推进。'))

  return {
    notableEvents: notableEvents.slice(0, 5),
    nextSuggestion,
    loopRewards,
    loopAdjustment,
  }
}
