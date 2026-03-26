import { useSectStore } from '../../stores/sectStore'
import { canBreakthrough, calcBreakthroughFailureRate, isMajorRealmBreakthrough } from '../../systems/cultivation/CultivationEngine'
import { getCultivationNeeded, getRealmName, BREAKTHROUGH_COSTS } from '../../data/realms'
import { getAutoRecipeById } from '../../data/recipes'
import type { RealmStage } from '../../types/character'
import styles from './BreakthroughPanel.module.css'

interface BreakthroughPanelProps {
  characterId: string
}

export default function BreakthroughPanel({ characterId }: BreakthroughPanelProps) {
  const character = useSectStore((s) => s.sect.characters.find((c) => c.id === characterId))
  const spiritStone = useSectStore((s) => s.sect.resources.spiritStone)
  const vault = useSectStore((s) => s.sect.vault)

  if (!character) return null

  const needed = getCultivationNeeded(character.realm, character.realmStage)
  const isMajor = isMajorRealmBreakthrough(character.realm, character.realmStage)
  const nextRealm = isMajor ? character.realm + 1 : character.realm
  const nextStage = isMajor ? 0 : (character.realmStage + 1) as RealmStage
  const nextName = getRealmName(nextRealm, nextStage)
  const failureRate = calcBreakthroughFailureRate(character)
  const ready = canBreakthrough(character)
  const progress = Math.min(1, character.cultivation / needed)

  // Major realm requirements
  const cost = isMajor ? BREAKTHROUGH_COSTS[nextRealm] : null
  const pillRecipe = cost ? getAutoRecipeById(cost.pillId) : null
  const hasPill = cost
    ? vault.some(item => item.type === 'consumable' && (item as any).recipeId === cost.pillId)
    : true
  const hasStones = cost ? spiritStone >= cost.spiritStone : true

  // Hint text
  let hint = '修炼中'
  let hintClass = ''
  if (ready) {
    if (isMajor && cost) {
      if (!hasPill && !hasStones) {
        hint = `缺少 ${pillRecipe?.name ?? cost.pillId}，灵石不足`
        hintClass = styles.hintBlocked
      } else if (!hasPill) {
        hint = `缺少 ${pillRecipe?.name ?? cost.pillId}（炼丹炉生产）`
        hintClass = styles.hintBlocked
      } else if (!hasStones) {
        hint = `灵石不足（需要 ${cost.spiritStone.toLocaleString()}）`
        hintClass = styles.hintBlocked
      } else {
        hint = '修为已满，自动突破中...'
        hintClass = styles.ready
      }
    } else {
      hint = '修为已满，自动突破中...'
      hintClass = styles.ready
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
          {Math.floor(character.cultivation).toLocaleString()} / {needed.toLocaleString()}
        </span>
      </div>
      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${progress * 100}%` }} />
      </div>
      <div className={styles.requirement}>
        <span>突破失败率</span>
        <span className={styles.failureRate}>{Math.round(failureRate * 100)}%</span>
      </div>
      {isMajor && cost && (
        <div className={styles.majorReq}>
          <div className={styles.reqTitle}>突破需求</div>
          <div className={`${styles.reqItem} ${hasPill ? styles.reqMet : styles.reqUnmet}`}>
            <span>{pillRecipe?.name ?? cost.pillId}</span>
            <span>{hasPill ? '✓' : '✗'}</span>
          </div>
          <div className={`${styles.reqItem} ${hasStones ? styles.reqMet : styles.reqUnmet}`}>
            <span>灵石 ×{cost.spiritStone.toLocaleString()}</span>
            <span>{hasStones ? '✓' : '✗'}</span>
          </div>
        </div>
      )}
      <div className={`${styles.hint} ${hintClass}`}>{hint}</div>
    </div>
  )
}
