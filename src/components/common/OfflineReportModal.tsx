import type { Resources } from '../../types'
import s from './OfflineReportModal.module.css'

interface OfflineReportData {
  offlineSeconds: number
  resourcesGained: Resources
  breakthroughs: { characterName: string; targetRealm: string; success: boolean }[]
  itemsCrafted: { name: string; quantity: number }[]
  taxIncome: number
}

interface OfflineReportModalProps {
  report: OfflineReportData
  onClose: () => void
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}小时${minutes}分钟`
  return `${minutes}分钟`
}

function fmt(n: number): string {
  if (n >= 10000) return Math.round(n).toLocaleString()
  if (n >= 100) return Math.round(n).toString()
  if (n >= 1) return n.toFixed(1)
  return n.toFixed(2)
}

export type { OfflineReportData }
export default function OfflineReportModal({ report, onClose }: OfflineReportModalProps) {
  const r = report.resourcesGained
  const hasResources = r.spiritStone > 0 || r.spiritEnergy > 0 || r.herb > 0 || r.ore > 0
  const hasBreakthroughs = report.breakthroughs.length > 0
  const hasCrafted = report.itemsCrafted.length > 0
  const hasTax = report.taxIncome > 0

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.highlight} data-testid="offline-highlight">
          <div className={s.eyebrow}>离峰归来</div>
          <div className={s.title}>离线修炼报告</div>
          <div className={s.duration}>离开时长：{formatDuration(report.offlineSeconds)}</div>
          <div className={s.highlightHint}>静修之间，宗门诸务仍在运转，所得已整理成卷。</div>
        </div>

        {hasResources && (
          <div className={s.section}>
            <div className={s.sectionTitle}>资源收获</div>
            <div className={s.resourceGrid}>
              {r.spiritStone > 0 && (
                <div className={s.resourceItem}>
                  <span className={s.resourceLabel}>灵石</span>
                  <span className={s.resourceValue}>+{fmt(r.spiritStone)}</span>
                </div>
              )}
              {r.spiritEnergy > 0 && (
                <div className={s.resourceItem}>
                  <span className={s.resourceLabel}>灵气</span>
                  <span className={s.resourceValue}>+{fmt(r.spiritEnergy)}</span>
                </div>
              )}
              {r.herb > 0 && (
                <div className={s.resourceItem}>
                  <span className={s.resourceLabel}>灵草</span>
                  <span className={s.resourceValue}>+{fmt(r.herb)}</span>
                </div>
              )}
              {r.ore > 0 && (
                <div className={s.resourceItem}>
                  <span className={s.resourceLabel}>矿石</span>
                  <span className={s.resourceValue}>+{fmt(r.ore)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {hasBreakthroughs && (
          <div className={s.section}>
            <div className={s.sectionTitle}>境界突破</div>
            <ul className={s.eventList}>
              {report.breakthroughs.map((bt, i) => (
                <li key={i} className={s.eventItem}>
                  <span className={bt.success ? s.eventSuccess : s.eventFailure}>{bt.success ? '✦' : '✧'}</span>
                  <span>
                    {bt.characterName} → {bt.targetRealm}
                    {!bt.success && '（失败）'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {hasCrafted && (
          <div className={s.section}>
            <div className={s.sectionTitle}>炼制物品</div>
            {report.itemsCrafted.map((item, i) => (
              <div key={i} className={s.craftedItem}>
                <span className={s.craftedName}>{item.name}</span>
                <span className={s.craftedQty}>x{item.quantity}</span>
              </div>
            ))}
          </div>
        )}

        {hasTax && (
          <div className={s.section}>
            <div className={s.taxRow}>
              <span className={s.taxLabel}>宗门税收</span>
              <span className={s.taxValue}>+{fmt(report.taxIncome)} 灵石</span>
            </div>
          </div>
        )}

        {!hasResources && !hasBreakthroughs && !hasCrafted && !hasTax && (
          <div className={s.emptyHint}>离线期间无特殊收获</div>
        )}

        <button className={s.collectBtn} onClick={onClose}>
          收取
        </button>
      </div>
    </div>
  )
}
