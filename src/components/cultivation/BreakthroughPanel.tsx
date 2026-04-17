import { motion, useReducedMotion } from 'framer-motion'
import { useSectStore } from '../../stores/sectStore'
import {
  canBreakthrough,
  calcBreakthroughFailureRate,
  isMajorRealmBreakthrough,
} from '../../systems/cultivation/CultivationEngine'
import { getCultivationNeeded, getRealmName, getBreakthroughResourceCost } from '../../data/realms'
import { shouldTriggerTribulation } from '../../systems/cultivation/TribulationSystem'
import { needsCultivationPathChoice } from '../../systems/character/CultivationPathSystem'
import type { RealmStage } from '../../types/character'
import { formatCultivationValue } from '../../utils/format'
import styles from './BreakthroughPanel.module.css'

interface BreakthroughPanelProps {
  characterId: string
}

export default function BreakthroughPanel({ characterId }: BreakthroughPanelProps) {
  const character = useSectStore((s) => s.sect.characters.find((c) => c.id === characterId))
  const resources = useSectStore((s) => s.sect.resources)
  const prefersReducedMotion = useReducedMotion()

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
  const btCost = getBreakthroughResourceCost(character.realm, character.realmStage)
  const herbNeeded = btCost.herb ?? 0
  const hasStones = resources.spiritStone >= btCost.spiritStone
  const hasEnergy = resources.spiritEnergy >= btCost.spiritEnergy
  const hasHerbs = resources.herb >= herbNeeded
  const riskLabel = failureRate < 0.12 ? '平稳' : failureRate < 0.3 ? '有险' : '凶险'
  const riskClass = failureRate < 0.12 ? styles.riskLow : failureRate < 0.3 ? styles.riskMid : styles.riskHigh
  const needsPathChoice = needsCultivationPathChoice(character)

  let hint =
    character.status === 'idle'
      ? '修炼中'
      : character.status === 'resting'
        ? '休息中'
        : character.status === 'training'
          ? '驻守中'
          : character.status === 'patrolling'
            ? '派遣中'
            : character.status === 'injured'
              ? '伤势未愈'
              : '探险中'
  let hintClass = ''

  if (ready) {
    const blockedResources: string[] = []
    if (!hasStones) blockedResources.push(`灵石 ${btCost.spiritStone.toLocaleString()}`)
    if (!hasEnergy) blockedResources.push(`灵气 ${btCost.spiritEnergy.toLocaleString()}`)
    if (!hasHerbs && herbNeeded > 0) blockedResources.push(`灵草 ${herbNeeded}`)

    if (blockedResources.length > 0) {
      hint = `资源不足，需要：${blockedResources.join('、')}`
      hintClass = styles.hintBlocked
    } else if (needsPathChoice) {
      hint = '先定下修行路线，弟子才会跨入新的大境界。'
      hintClass = styles.hintFocus
    } else {
      hint = isMajor ? '成功则进阶，失败则身死道消，仅返还部分灵石。' : '成功则进阶，失败则修为回退或受伤。'
      hintClass = styles.hintFocus
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.title}>境界突破</div>
      <div className={styles.requirement}>
        <span>下一境界</span>
        <motion.span
          key={nextName}
          initial={prefersReducedMotion ? false : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {nextName}
        </motion.span>
      </div>
      <div className={styles.requirement}>
        <span>修为进度</span>
        <span className={ready ? styles.ready : ''}>
          {formatCultivationValue(character.cultivation)} / {needed.toLocaleString()}
        </span>
      </div>
      <div className={styles.progressBar}>
        <div
          className={`${styles.progressFill} ${ready && !prefersReducedMotion ? styles.progressFillReady : ''}`}
          style={{ width: `${progress * 100}%` }}
        />
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
          <span className={styles.failureRate}>将会触发</span>
        </div>
      )}
      {needsPathChoice && (
        <div className={styles.pathChoiceSection}>
          <div className={styles.reqTitle}>修行路线</div>
          <div className={styles.pathAutoHint}>突破时将随机领悟修行方向。</div>
        </div>
      )}
      {(btCost.spiritStone > 0 || btCost.spiritEnergy > 0 || herbNeeded > 0) && (
        <div className={styles.majorReq}>
          <div className={styles.reqTitle}>突破需求</div>
          {btCost.spiritStone > 0 && (
            <div className={`${styles.reqItem} ${hasStones ? styles.reqMet : styles.reqUnmet}`}>
              <span>灵石 x{btCost.spiritStone.toLocaleString()}</span>
              <span>{hasStones ? '已备' : '未足'}</span>
            </div>
          )}
          {btCost.spiritEnergy > 0 && (
            <div className={`${styles.reqItem} ${hasEnergy ? styles.reqMet : styles.reqUnmet}`}>
              <span>灵气 x{btCost.spiritEnergy.toLocaleString()}</span>
              <span>{hasEnergy ? '已备' : '未足'}</span>
            </div>
          )}
          {herbNeeded > 0 && (
            <div className={`${styles.reqItem} ${hasHerbs ? styles.reqMet : styles.reqUnmet}`}>
              <span>灵草 x{herbNeeded}</span>
              <span>{hasHerbs ? '已备' : '未足'}</span>
            </div>
          )}
        </div>
      )}
      {hasTribulation && (
        <div className={styles.tribulationHint}>此番将引动天劫。若能渡过，可再进一步；若败，则当场身死道消。</div>
      )}
      <div className={`${styles.hint} ${hintClass}`}>{hint}</div>
    </div>
  )
}
