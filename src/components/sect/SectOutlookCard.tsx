import { useMemo } from 'react'
import { useSectStore } from '../../stores/sectStore'
import { forecastNextBreakthrough, forecastNextMilestone, formatEta } from '../../systems/cultivation/ProgressForecast'
import { formatNumber } from '../../utils/Decimal'
import styles from './SectOutlookCard.module.css'

/**
 * 现状与前瞻卡（V2.1 工单 06）：30-90 秒回访里回答"下一步等什么、还要多久"。
 * 修炼前瞻（最快突破）+ 建筑前瞻（最近里程碑）+ 灵气供给警示。
 */
export default function SectOutlookCard() {
  const sect = useSectStore((s) => s.sect)

  const breakthrough = useMemo(() => forecastNextBreakthrough(sect), [sect])
  const milestone = useMemo(() => forecastNextMilestone(sect), [sect])

  const lowSpirit = (breakthrough?.spiritRatio ?? 1) < 0.9

  return (
    <div className={styles.card} data-testid="sect-outlook">
      <div className={styles.header}>
        <span className={styles.title}>现状与前瞻</span>
        {lowSpirit && (
          <span className={styles.spiritWarning} data-testid="spirit-warning">
            灵气供给 {Math.round((breakthrough?.spiritRatio ?? 1) * 100)}%，实际会比预估更慢
          </span>
        )}
      </div>
      <div className={styles.rows}>
        {breakthrough ? (
          <div className={styles.row}>
            <span className={styles.label}>修炼</span>
            <span className={styles.value}>
              {breakthrough.characterName} → {breakthrough.toName}
              {breakthrough.isMajor ? '（渡劫）' : ''}
            </span>
            <span className={styles.eta} data-testid="breakthrough-eta">
              {formatEta(breakthrough.etaSeconds)}
            </span>
          </div>
        ) : (
          <div className={styles.row}>
            <span className={styles.label}>修炼</span>
            <span className={styles.value}>暂无弟子在洞府修炼</span>
          </div>
        )}
        {milestone ? (
          <div className={styles.row}>
            <span className={styles.label}>建筑</span>
            <span className={styles.value}>
              距{milestone.buildingName} Lv{milestone.targetLevel} 里程碑 · {milestone.milestoneName}
            </span>
            <span className={styles.eta} data-testid="milestone-eta">
              {formatEta(milestone.etaSeconds)}
              {milestone.stonesNeeded > 0 ? `（${formatNumber(milestone.stonesNeeded)}灵石）` : ''}
            </span>
          </div>
        ) : (
          <div className={styles.row}>
            <span className={styles.label}>建筑</span>
            <span className={styles.value}>当前等级暂无待达成里程碑</span>
          </div>
        )}
      </div>
    </div>
  )
}
