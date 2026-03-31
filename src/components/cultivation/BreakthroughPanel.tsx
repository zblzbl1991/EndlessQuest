import { useSectStore } from '../../stores/sectStore'
import {
  canBreakthrough,
  calcBreakthroughFailureRate,
  isMajorRealmBreakthrough,
} from '../../systems/cultivation/CultivationEngine'
import { getCultivationNeeded, getRealmName, BREAKTHROUGH_COSTS, getMinorBreakthroughCost } from '../../data/realms'
import { shouldTriggerTribulation } from '../../systems/cultivation/TribulationSystem'
import type { RealmStage } from '../../types/character'
import { getFateTagDef } from '../../data/fateTags'
import { formatCultivationValue } from '../../utils/format'
import styles from './BreakthroughPanel.module.css'

interface BreakthroughPanelProps {
  characterId: string
}

export default function BreakthroughPanel({ characterId }: BreakthroughPanelProps) {
  const character = useSectStore((s) => s.sect.characters.find((c) => c.id === characterId))
  const spiritStone = useSectStore((s) => s.sect.resources.spiritStone)

  if (!character) return null

  const needed = getCultivationNeeded(character.realm, character.realmStage)
  const isMajor = isMajorRealmBreakthrough(character.realm, character.realmStage)
  const nextRealm = isMajor ? character.realm + 1 : character.realm
  const nextStage = isMajor ? 0 : ((character.realmStage + 1) as RealmStage)
  const nextName = getRealmName(nextRealm, nextStage)
  const failureRate = calcBreakthroughFailureRate(character)
  const ready = canBreakthrough(character)
  const hasTribulation = isMajor && shouldTriggerTribulation(character.realm, character.realmStage)
  const progress = Math.min(1, character.cultivation / needed)
  const minorCost = !isMajor ? getMinorBreakthroughCost(character.realm, character.realmStage) : null
  const hasMinorStones = minorCost !== null ? spiritStone >= minorCost : true
  const riskLabel = failureRate < 0.12 ? '平稳' : failureRate < 0.3 ? '有险' : '凶险'
  const riskClass = failureRate < 0.12 ? styles.riskLow : failureRate < 0.3 ? styles.riskMid : styles.riskHigh

  // Major realm requirements
  const cost = isMajor ? BREAKTHROUGH_COSTS[nextRealm] : null
  const hasStones = cost ? spiritStone >= cost.spiritStone : true

  // Hint text
  let hint =
    character.status === 'idle'
      ? '修炼中'
      : character.status === 'resting'
        ? '休息中'
        : character.status === 'training'
          ? '研习中'
          : character.status === 'patrolling'
            ? '派遣中'
            : character.status === 'injured'
              ? '伤势未愈'
              : '冒险中'
  let hintClass = ''
  if (ready) {
    if (isMajor && cost) {
      if (!hasStones) {
        hint = `灵石不足（需要 ${cost.spiritStone.toLocaleString()}）`
        hintClass = styles.hintBlocked
      } else if (hasTribulation) {
        hint = '修为已满，突破将触发天劫...'
        hintClass = styles.ready
      } else {
        hint = '修为已满，自动突破中...'
        hintClass = styles.ready
      }
    } else {
      if (!hasMinorStones && minorCost !== null) {
        hint = `灵石不足（需要 ${minorCost.toLocaleString()}）`
        hintClass = styles.hintBlocked
      } else {
        hint = '修为已满，自动突破中...'
        hintClass = styles.ready
      }
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.title}>境界突破</div>
      <div className={styles.requirement}>
        <span>下一境界</span>
        <span>{nextName}</span>
      </div>
      <div className={styles.requirement}>
        <span>修为进度</span>
        <span className={ready ? styles.ready : ''}>
          {formatCultivationValue(character.cultivation)} / {needed.toLocaleString()}
        </span>
      </div>
      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${progress * 100}%` }} />
      </div>
      <div className={styles.requirement}>
        <span>突破失败率</span>
        <span className={styles.failureWrap}>
          <span className={styles.failureRate}>{Math.round(failureRate * 100)}%</span>
          <span className={`${styles.riskTag} ${riskClass}`}>{riskLabel}</span>
        </span>
      </div>
      {hasTribulation && (
        <div className={styles.requirement}>
          <span>天劫</span>
          <span className={styles.failureRate}>将触发天劫</span>
        </div>
      )}
      {character.fateTags.length > 0 && (
        <div className={styles.fateSection}>
          <div className={styles.reqTitle}>命格痕印</div>
          <div className={styles.fateTags}>
            {character.fateTags.map((tag) => {
              const def = getFateTagDef(tag)
              return (
                <span key={tag} className={styles.fateTag} title={def.description}>
                  {def.name}
                </span>
              )
            })}
          </div>
        </div>
      )}
      {isMajor && cost && (
        <div className={styles.majorReq}>
          <div className={styles.reqTitle}>突破需求</div>
          <div className={`${styles.reqItem} ${hasStones ? styles.reqMet : styles.reqUnmet}`}>
            <span>灵石 ×{cost.spiritStone.toLocaleString()}</span>
            <span>{hasStones ? '✓' : '✗'}</span>
          </div>
        </div>
      )}
      {!isMajor && minorCost !== null && (
        <div className={styles.majorReq}>
          <div className={styles.reqTitle}>突破需求</div>
          <div className={`${styles.reqItem} ${hasMinorStones ? styles.reqMet : styles.reqUnmet}`}>
            <span>灵石 ×{minorCost.toLocaleString()}</span>
            <span>{hasMinorStones ? '✓' : '✗'}</span>
          </div>
        </div>
      )}
      {hasTribulation && (
        <div className={styles.tribulationHint}>天劫成功有机会沉淀为命格，失败则可能留下劫痕与心魔。</div>
      )}
      <div className={`${styles.hint} ${hintClass}`}>{hint}</div>
    </div>
  )
}
