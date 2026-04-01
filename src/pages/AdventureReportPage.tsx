import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAdventureStore } from '../stores/adventureStore'
import { useSectStore } from '../stores/sectStore'
import { PixelIcon } from '../components/common/PixelIcon'
import { getRunIntentDef } from '../data/runIntents'
import { buildAdventureReportInsight } from '../systems/roguelike/AdventureReportInsightSystem'
import styles from './AdventureReportPage.module.css'

const RESULT_LABELS = {
  completed: '通关',
  retreated: '撤退',
  failed: '失利',
} as const

function getDungeonIconName(dungeonId: string): string {
  switch (dungeonId) {
    case 'lingCaoValley':
      return 'dungeonValley'
    case 'luoYunCave':
      return 'dungeonCave'
    case 'bloodDemonAbyss':
      return 'dungeonAbyss'
    case 'dragonBoneWasteland':
      return 'dungeonWasteland'
    case 'nineNetherPurgatory':
      return 'dungeonPurgatory'
    case 'heavenlyTribulationRealm':
      return 'dungeonTribulation'
    default:
      return 'dungeonCave'
  }
}

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

  const characterNameMap = useMemo(
    () => new Map(characters.map((character) => [character.id, character.name])),
    [characters]
  )
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
      <div className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>探索过程</h1>
          <div className={styles.subtitle}>
            <PixelIcon
              name={getDungeonIconName(report.dungeonId)}
              size={18}
              className={styles.inlineIcon}
              aria-label={dungeon?.name ?? report.dungeonId}
            />
            {dungeon?.name ?? report.dungeonId}
          </div>
        </div>
        <Link className={styles.backLink} to="/adventure">
          返回秘境
        </Link>
      </div>

      <section className={styles.summaryCard}>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>
            <PixelIcon name="eventAncientCave" size={16} className={styles.inlineIcon} aria-label="结果" />
            结果
          </span>
          <strong>{RESULT_LABELS[report.result]}</strong>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>
            <PixelIcon name="eventRandom" size={16} className={styles.inlineIcon} aria-label="策略" />
            策略
          </span>
          <strong>{getRunIntentDef(report.config.automationStrategy).label}</strong>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>
            <PixelIcon name="techniqueScroll" size={16} className={styles.inlineIcon} aria-label="战术" />
            战术
          </span>
          <strong>{report.config.tacticalPreset}</strong>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>
            <PixelIcon name="disciple" size={16} className={styles.inlineIcon} aria-label="核心弟子" />
            核心弟子
          </span>
          <strong>{insight?.coreName ?? '暂无'}</strong>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>
            <PixelIcon name="eventRandom" size={16} className={styles.inlineIcon} aria-label="关键 build" />
            关键 build
          </span>
          <strong>{insight?.keyBuild ?? '暂无'}</strong>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>
            <PixelIcon name="eventCombat" size={16} className={styles.inlineIcon} aria-label="转折点" />
            转折点
          </span>
          <strong>{insight?.turningPoint ?? '暂无'}</strong>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>
            <PixelIcon name="eventRandom" size={16} className={styles.inlineIcon} aria-label="异变" />
            异变
          </span>
          <strong>{insight?.mutationHighlights?.join(' · ') ?? '暂无异变'}</strong>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>
            <PixelIcon name="eventAncientCave" size={16} className={styles.inlineIcon} aria-label="成败原因" />
            成败原因
          </span>
          <strong>{insight?.cause ?? '暂无'}</strong>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>
            <PixelIcon
              name={getDungeonIconName(report.dungeonId)}
              size={16}
              className={styles.inlineIcon}
              aria-label="推进层数"
            />
            推进层数
          </span>
          <strong>第 {report.floorsCleared} 层</strong>
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
