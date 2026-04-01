import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAdventureStore } from '../stores/adventureStore'
import { useSectStore } from '../stores/sectStore'
import { PixelIcon } from '../components/common/PixelIcon'
import { getRunIntentDef } from '../data/runIntents'
import { buildAdventureReportInsight } from '../systems/roguelike/AdventureReportInsightSystem'
import styles from './AdventureReportPage.module.css'

const RESULT_LABELS = {
  completed: '閫氬叧',
  retreated: '鎾ら€€',
  failed: '澶辫触',
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
        <h1 className={styles.pageTitle}>鎺㈢储杩囩▼</h1>
        <div className={styles.empty}>鏈壘鍒板搴旂殑鎺㈢储鎶ュ憡銆?</div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>鎺㈢储杩囩▼</h1>
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
          杩斿洖绉樺
        </Link>
      </div>

      <section className={styles.summaryCard}>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>
            <PixelIcon name="eventAncientCave" size={16} className={styles.inlineIcon} aria-label="缁撴灉" />
            缁撴灉
          </span>
          <strong>{RESULT_LABELS[report.result]}</strong>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>
            <PixelIcon name="eventRandom" size={16} className={styles.inlineIcon} aria-label="绛栫暐" />
            绛栫暐
          </span>
          <strong>{getRunIntentDef(report.config.automationStrategy).label}</strong>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>
            <PixelIcon name="techniqueScroll" size={16} className={styles.inlineIcon} aria-label="鎴樻湳" />
            鎴樻湳
          </span>
          <strong>{report.config.tacticalPreset}</strong>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>
            <PixelIcon name="disciple" size={16} className={styles.inlineIcon} aria-label="鏍稿績寮熷瓙" />
            鏍稿績寮熷瓙
          </span>
          <strong>{insight?.coreName ?? '鏆傛棤'}</strong>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>
            <PixelIcon name="eventRandom" size={16} className={styles.inlineIcon} aria-label="鍏抽敭 build" />
            鍏抽敭 build
          </span>
          <strong>{insight?.keyBuild ?? '鏆傛棤'}</strong>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>
            <PixelIcon name="eventCombat" size={16} className={styles.inlineIcon} aria-label="杞姌鐐?" />
            杞姌鐐?
          </span>
          <strong>{insight?.turningPoint ?? '鏆傛棤'}</strong>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>
            <PixelIcon name="eventRandom" size={16} className={styles.inlineIcon} aria-label="寮傚彉" />
            寮傚彉
          </span>
          <strong>{insight?.mutationHighlights?.join(' · ') ?? '鏆傛棤寮傚彉'}</strong>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>
            <PixelIcon name="eventAncientCave" size={16} className={styles.inlineIcon} aria-label="鎴愯触鍘熷洜" />
            鎴愯触鍘熷洜
          </span>
          <strong>{insight?.cause ?? '鏆傛棤'}</strong>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>
            <PixelIcon
              name={getDungeonIconName(report.dungeonId)}
              size={16}
              className={styles.inlineIcon}
              aria-label="鎺ㄨ繘灞傛暟"
            />
            鎺ㄨ繘灞傛暟
          </span>
          <strong>绗?{report.floorsCleared} 灞?</strong>
        </div>
      </section>

      <section className={styles.timelineSection}>
        <div className={styles.sectionTitle}>鏃堕棿绾?</div>
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
                {step.floor !== null && <span className={styles.stepFloor}>绗?{step.floor} 灞?</span>}
              </div>
              <div className={styles.stepDetail}>{step.detail}</div>
              {step.decisionReason && <div className={styles.stepReason}>鍐崇瓥渚濇嵁锛?{step.decisionReason}</div>}
            </article>
          ))}
        </div>
      </section>

      <section className={styles.summaryCard}>
        <div className={styles.sectionTitle}>缁撶畻</div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>
            <PixelIcon name="spiritStone" size={16} className={styles.inlineIcon} aria-label="鐏电煶" />
            鐏电煶
          </span>
          <strong>{report.rewards.spiritStone}</strong>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>
            <PixelIcon name="herb" size={16} className={styles.inlineIcon} aria-label="鐏佃崏" />
            鐏佃崏
          </span>
          <strong>{report.rewards.herb}</strong>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>
            <PixelIcon name="ore" size={16} className={styles.inlineIcon} aria-label="鐏电熆" />
            鐏电熆
          </span>
          <strong>{report.rewards.ore}</strong>
        </div>
      </section>
    </div>
  )
}
