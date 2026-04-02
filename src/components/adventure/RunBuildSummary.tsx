import { BLESSING_DEFS } from '../../data/blessings'
import { RELIC_DEFS } from '../../data/relics'
import type { BlessingId, RelicId, TacticalPreset } from '../../types/adventure'
import { ROUTE_DIRECTION_LABELS, getTacticalPresetLabel } from '../../data/uiCopy'
import styles from './RunBuildSummary.module.css'

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
        <span className={styles.title}>本次构筑</span>
        <span className={styles.preset}>战术：{getTacticalPresetLabel(tacticalPreset)}</span>
      </div>

      <div className={styles.section}>
        <div className={styles.label}>祝福 {blessings.length > 0 ? `· ${blessings.length}` : ''}</div>
        <div className={styles.tags}>
          {blessings.length > 0 ? (
            blessings.map((id) => (
              <span key={id} className={styles.blessingTag} title={BLESSING_DEFS[id].description}>
                {BLESSING_DEFS[id].name}
              </span>
            ))
          ) : (
            <span className={styles.empty}>尚未获得祝福</span>
          )}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.label}>遗物 {relics.length > 0 ? `· ${relics.length}` : ''}</div>
        <div className={styles.tags}>
          {relics.length > 0 ? (
            relics.map((id) => (
              <span key={id} className={styles.relicTag} title={RELIC_DEFS[id].description}>
                {RELIC_DEFS[id].name}
              </span>
            ))
          ) : (
            <span className={styles.empty}>尚未获得遗物</span>
          )}
        </div>
      </div>

      {routeDirections.length > 0 && (
        <div className={styles.section}>
          <div className={styles.label}>路线倾向 · {routeDirections.length}</div>
          <div className={styles.tags}>
            {routeDirections.map((tag, index) => (
              <span key={`${tag}-${index}`} className={styles.routeTag}>
                {ROUTE_DIRECTION_LABELS[tag as keyof typeof ROUTE_DIRECTION_LABELS] ?? tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {branchTags.length > 0 && (
        <div className={styles.section}>
          <div className={styles.label}>行路风格 · {branchTags.length}</div>
          <div className={styles.tags}>
            {branchTags.map((tag) => (
              <span key={tag} className={styles.branchTag}>
                {tag === 'low' ? '稳妥' : tag === 'medium' ? '均衡' : '冒险'}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
