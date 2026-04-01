import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAdventureStore } from '../stores/adventureStore'
import { useSectStore } from '../stores/sectStore'
import { PixelIcon } from '../components/common/PixelIcon'
import { getDiscipleMutationDef } from '../data/discipleMutations'
import { getRunIntentDef } from '../data/runIntents'
import type { AdventureReport, AdventureReportStep } from '../types'
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

function getLastStepOfTypes(report: AdventureReport, types: AdventureReportStep['type'][]) {
  for (let i = report.steps.length - 1; i >= 0; i--) {
    if (types.includes(report.steps[i].type)) return report.steps[i]
  }
  return null
}

function getReportInsight(report: AdventureReport, nameMap: Map<string, string>) {
  const members = report.teamCharacterIds
    .map((id) => {
      const state = report.finalMemberStates[id]
      if (!state) return null
      return {
        id,
        name: nameMap.get(id) ?? id,
        ratio: state.maxHp > 0 ? state.currentHp / state.maxHp : 0,
        state,
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)

  const coreMember =
    members.sort((a, b) => {
      if (b.ratio !== a.ratio) return b.ratio - a.ratio
      return b.state.currentHp - a.state.currentHp
    })[0] ?? null

  const blessingStep = getLastStepOfTypes(report, ['blessing_decision'])
  const relicStep = getLastStepOfTypes(report, ['auto_choice_made'])
  const turningStep = getLastStepOfTypes(report, [
    'member_state_changed',
    'run_retreated',
    'run_failed',
    'run_completed',
  ])
  const mutationHighlights = Object.entries(report.discipleMutations)
    .flatMap(([charId, mutationIds]) => {
      const discipleName = nameMap.get(charId) ?? charId
      return mutationIds.map((mutationId) => `${discipleName} · ${getDiscipleMutationDef(mutationId).name}`)
    })
    .slice(0, 3)

  const keyBuild = [blessingStep?.summary, relicStep?.summary].filter(Boolean).join(' / ')

  let cause = '鏆傛棤鏄庣‘鍘熷洜'
  if (report.result === 'completed') {
    cause =
      turningStep?.type === 'run_completed'
        ? '璺嚎涓庤祫婧愰€夋嫨淇濇寔浜嗙ǔ瀹氭帹杩?'
        : '鑷姩鍖栫瓥鐣ラ『鍒╁畬鎴愪簡娓呭浘'
  } else if (report.result === 'retreated') {
    cause = turningStep?.type === 'run_retreated' ? turningStep.detail : '闃熶紞琛€绾垮帇鍔涜Е鍙戜簡鎾ら€€'
  } else if (turningStep?.type === 'run_failed') {
    cause = turningStep.detail
  } else {
    cause = '闃熶紞鍦ㄦ帹杩涗腑澶卞幓缁х画鎴樻枟鑳藉姏'
  }

  return {
    coreMember,
    keyBuild: keyBuild || '鏆傛棤鍏抽敭绁濈鎴栭仐鐝?',
    mutationHighlights,
    turningPoint:
      turningStep?.summary ?? (report.result === 'completed' ? '绋冲畾鎺ㄨ繘鍒扮粓灞€' : '鏈嚭鐜版槑纭浆鎶樼偣'),
    cause,
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
  const insight = report ? getReportInsight(report, characterNameMap) : null

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
          <strong>{insight?.coreMember?.name ?? '鏆傛棤'}</strong>
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
