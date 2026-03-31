import { Link, useParams } from 'react-router-dom'
import { useAdventureStore } from '../stores/adventureStore'
import styles from './AdventureReportPage.module.css'

const RESULT_LABELS = {
  completed: '通关',
  retreated: '撤退',
  failed: '失败',
} as const

const STRATEGY_LABELS = {
  steady: '稳健',
  combat: '战斗',
  profit: '收益',
} as const

export default function AdventureReportPage() {
  const { reportId } = useParams()
  const report = useAdventureStore((s) => (reportId ? s.getReport(reportId) : undefined))
  const dungeon = useAdventureStore((s) => s.dungeons.find((item) => item.id === report?.dungeonId))

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
      <div className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>探索过程</h1>
          <div className={styles.subtitle}>{dungeon?.name ?? report.dungeonId}</div>
        </div>
        <Link className={styles.backLink} to="/adventure">
          返回秘境
        </Link>
      </div>

      <section className={styles.summaryCard}>
        <div className={styles.summaryRow}>
          <span>结果</span>
          <strong>{RESULT_LABELS[report.result]}</strong>
        </div>
        <div className={styles.summaryRow}>
          <span>策略</span>
          <strong>{STRATEGY_LABELS[report.config.automationStrategy]}</strong>
        </div>
        <div className={styles.summaryRow}>
          <span>战术</span>
          <strong>{report.config.tacticalPreset}</strong>
        </div>
        <div className={styles.summaryRow}>
          <span>推进层数</span>
          <strong>第 {report.floorsCleared} 层</strong>
        </div>
      </section>

      <section className={styles.timelineSection}>
        <div className={styles.sectionTitle}>时间线</div>
        <div className={styles.timeline}>
          {report.steps.map((step) => (
            <article key={step.id} className={styles.stepCard}>
              <div className={styles.stepHeader}>
                <span className={styles.stepSummary}>{step.summary}</span>
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
          <span>灵石</span>
          <strong>{report.rewards.spiritStone}</strong>
        </div>
        <div className={styles.summaryRow}>
          <span>灵草</span>
          <strong>{report.rewards.herb}</strong>
        </div>
        <div className={styles.summaryRow}>
          <span>灵矿</span>
          <strong>{report.rewards.ore}</strong>
        </div>
      </section>
    </div>
  )
}
