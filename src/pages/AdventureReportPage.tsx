import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAdventureStore } from '../stores/adventureStore'
import { useSectStore } from '../stores/sectStore'
import PageHeader from '../components/common/PageHeader'
import { PixelIcon } from '../components/common/PixelIcon'
import { getRunIntentDef } from '../data/runIntents'
import { REPORT_RESULT_LABELS, getTacticalPresetLabel } from '../data/uiCopy'
import { buildAdventureReportInsight } from '../systems/roguelike/AdventureReportInsightSystem'
import styles from './AdventureReportPage.module.css'

function getStepIconName(type: string): string {
  switch (type) {
    case 'run_started':
    case 'floor_started':
      return 'dungeonCave'
    case 'route_considered':
    case 'route_selected':
    case 'auto_choice_made':
      return 'eventRandom'
    case 'event_resolved':
      return 'eventCombat'
    case 'shop_decision':
      return 'eventShop'
    case 'blessing_decision':
      return 'techniqueScroll'
    case 'pet_decision':
      return 'beastTaming'
    case 'reward_gained':
      return 'spiritStone'
    case 'member_state_changed':
      return 'disciple'
    case 'run_retreated':
      return 'eventRest'
    case 'run_failed':
      return 'eventBoss'
    case 'run_completed':
      return 'eventAncientCave'
    default:
      return 'eventRandom'
  }
}

export default function AdventureReportPage() {
  const { reportId } = useParams()
  const report = useAdventureStore((s) => (reportId ? s.getReport(reportId) : undefined))
  const dungeon = useAdventureStore((s) => s.dungeons.find((item) => item.id === report?.dungeonId))
  const characters = useSectStore((s) => s.sect.characters)

  const characterNameMap = useMemo(() => {
    const map = new Map(characters.map((character) => [character.id, character.name]))
    if (report?.teamSnapshot) {
      for (const [charId, snapshot] of Object.entries(report.teamSnapshot)) {
        if (!map.has(charId)) map.set(charId, snapshot.name)
      }
    }
    return map
  }, [characters, report])
  const insight = report ? buildAdventureReportInsight(report, characterNameMap) : null

  if (!report) {
    return (
      <div className={styles.page}>
        <h1 className={styles.pageTitle}>探索过程</h1>
        <div className={styles.empty}>未找到对应的探索报告。</div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="探索过程"
        action={
          <Link className={styles.backLink} to="/adventure">
            返回秘境
          </Link>
        }
        metrics={[
          {
            label: '秘境',
            value: dungeon?.name ?? report.dungeonId,
            detail: getRunIntentDef(report.config.automationStrategy).label,
          },
          {
            label: '结果',
            value: REPORT_RESULT_LABELS[report.result],
            detail: getTacticalPresetLabel(report.config.tacticalPreset),
          },
          { label: '推进层数', value: `第 ${report.floorsCleared} 层`, detail: insight?.cause ?? '暂无原因摘要' },
        ]}
      />

      <section className={styles.highlightCard} data-testid="report-highlight">
        <div className={styles.highlightTop}>
          <div>
            <div className={styles.resultBadge}>{REPORT_RESULT_LABELS[report.result]}</div>
          </div>
          <div className={styles.highlightMeta}>
            <span>{getRunIntentDef(report.config.automationStrategy).label}</span>
            <span>{getTacticalPresetLabel(report.config.tacticalPreset)}</span>
            <span>第 {report.floorsCleared} 层</span>
          </div>
        </div>

        <div className={styles.highlightCause}>
          <span className={styles.highlightCauseLabel}>成败原因</span>
          <strong>{insight?.cause ?? '暂无'}</strong>
        </div>

        <div className={styles.highlightGrid}>
          <div className={styles.highlightPanel}>
            <div className={styles.highlightPanelTitle}>关键角色</div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>
                <PixelIcon name="disciple" size={16} className={styles.inlineIcon} aria-label="核心弟子" />
                核心弟子
              </span>
              <strong>{insight?.coreName ?? '暂无'}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>
                <PixelIcon name="eventCombat" size={16} className={styles.inlineIcon} aria-label="转折点" />
                转折点
              </span>
              <strong>{insight?.turningPoint ?? '暂无'}</strong>
            </div>
          </div>

          <div className={styles.highlightPanel}>
            <div className={styles.highlightPanelTitle}>构筑余势</div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>
                <PixelIcon name="eventRandom" size={16} className={styles.inlineIcon} aria-label="关键构筑" />
                关键构筑
              </span>
              <strong>{insight?.keyBuild ?? '暂无'}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>
                <PixelIcon name="eventRandom" size={16} className={styles.inlineIcon} aria-label="异变" />
                异变
              </span>
              <strong>{insight?.mutationHighlights?.join(' · ') ?? '暂无异变'}</strong>
            </div>
          </div>

          <div className={styles.highlightPanel}>
            <div className={styles.highlightPanelTitle}>归宗结果</div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>
                <PixelIcon name="eventBoss" size={16} className={styles.inlineIcon} aria-label="未归" />
                未归
              </span>
              <strong>{insight?.returnOutcome.sacrificedNames.join('、') || '无'}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>
                <PixelIcon name="eventRest" size={16} className={styles.inlineIcon} aria-label="重伤归宗" />
                重伤归宗
              </span>
              <strong>{insight?.returnOutcome.recoveringNames.join('、') || '无'}</strong>
            </div>
            {insight?.returnOutcome.returnedNames.length ? (
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>
                  <PixelIcon name="disciple" size={16} className={styles.inlineIcon} aria-label="平安归宗" />
                  平安归宗
                </span>
                <strong>{insight.returnOutcome.returnedNames.join('、')}</strong>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className={styles.timelineSection}>
        <div className={styles.sectionTitle}>时间线</div>
        <div className={styles.timeline}>
          {report.steps.map((step) => (
            <article key={step.id} className={styles.stepCard}>
              <div className={styles.stepHeader}>
                <span className={styles.stepSummary}>
                  <PixelIcon
                    name={getStepIconName(step.type)}
                    size={16}
                    className={styles.inlineIcon}
                    aria-label={step.summary}
                  />
                  {step.summary}
                </span>
                {step.floor !== null && <span className={styles.stepFloor}>第 {step.floor} 层</span>}
              </div>
              <div className={styles.stepDetail}>{step.detail}</div>
              {step.decisionReason && <div className={styles.stepReason}>决策依据：{step.decisionReason}</div>}
            </article>
          ))}
        </div>
      </section>

      <section className={styles.summaryCard}>
        <div className={styles.sectionTitle}>结算</div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>
            <PixelIcon name="spiritStone" size={16} className={styles.inlineIcon} aria-label="灵石" />
            灵石
          </span>
          <strong>{report.rewards.spiritStone}</strong>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>
            <PixelIcon name="herb" size={16} className={styles.inlineIcon} aria-label="灵草" />
            灵草
          </span>
          <strong>{report.rewards.herb}</strong>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>
            <PixelIcon name="ore" size={16} className={styles.inlineIcon} aria-label="矿材" />
            矿材
          </span>
          <strong>{report.rewards.ore}</strong>
        </div>
      </section>
    </div>
  )
}
