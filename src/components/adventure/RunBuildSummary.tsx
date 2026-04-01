import { BLESSING_DEFS } from '../../data/blessings'
import { RELIC_DEFS } from '../../data/relics'
import type { BlessingId, RelicId, TacticalPreset } from '../../types/adventure'
import styles from './RunBuildSummary.module.css'

const PRESET_LABELS: Record<TacticalPreset, string> = {
  conservative: '瀹堝娍',
  balanced: '骞宠　',
  burst: '鐖嗗彂',
  bossCounter: '鐮撮',
}

const ROUTE_DIRECTION_LABELS: Record<string, string> = {
  stable: '绋冲畾',
  combat: '鎴樻枟',
  profit: '鏀剁泭',
  mutation: '寮傚彉',
}

interface RunBuildSummaryProps {
  tacticalPreset: TacticalPreset
  blessings: BlessingId[]
  relics: RelicId[]
  branchTags: string[]
  routeDirections?: string[]
}

export default function RunBuildSummary({
  tacticalPreset,
  blessings,
  relics,
  branchTags,
  routeDirections = [],
}: RunBuildSummaryProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>鏈鏋勭瓚</span>
        <span className={styles.preset}>鎴樻湳: {PRESET_LABELS[tacticalPreset]}</span>
      </div>

      <div className={styles.section}>
        <div className={styles.label}>绁濈 {blessings.length > 0 ? `路 ${blessings.length}` : ''}</div>
        <div className={styles.tags}>
          {blessings.length > 0 ? (
            blessings.map((id) => (
              <span key={id} className={styles.blessingTag} title={BLESSING_DEFS[id].description}>
                {BLESSING_DEFS[id].name}
              </span>
            ))
          ) : (
            <span className={styles.empty}>灏氭湭鑾峰緱绁濈</span>
          )}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.label}>閬楃墿 {relics.length > 0 ? `路 ${relics.length}` : ''}</div>
        <div className={styles.tags}>
          {relics.length > 0 ? (
            relics.map((id) => (
              <span key={id} className={styles.relicTag} title={RELIC_DEFS[id].description}>
                {RELIC_DEFS[id].name}
              </span>
            ))
          ) : (
            <span className={styles.empty}>灏氭湭鑾峰緱閬楃墿</span>
          )}
        </div>
      </div>

      {routeDirections.length > 0 && (
        <div className={styles.section}>
          <div className={styles.label}>璺嚎鍊惧悜 路 {routeDirections.length}</div>
          <div className={styles.tags}>
            {routeDirections.map((tag, index) => (
              <span key={`${tag}-${index}`} className={styles.routeTag}>
                {ROUTE_DIRECTION_LABELS[tag] ?? tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {branchTags.length > 0 && (
        <div className={styles.section}>
          <div className={styles.label}>琛岃矾椋庢牸 路 {branchTags.length}</div>
          <div className={styles.tags}>
            {branchTags.map((tag) => (
              <span key={tag} className={styles.branchTag}>
                {tag === 'low' ? '绋冲Ε' : tag === 'medium' ? '鍧囪　' : '鍐掗櫓'}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
