import { motion, useReducedMotion } from 'framer-motion'
import type { Resources } from '../../types'
import type { OfflineLoopRewardSummary, OfflineNarrativeItem } from '../../systems/sect/OfflineNarrativeSystem'
import s from './OfflineReportModal.module.css'

interface OfflineReportData {
  offlineSeconds: number
  resourcesGained: Resources
  breakthroughs: { characterName: string; targetRealm: string; success: boolean }[]
  itemsCrafted: { name: string; quantity: number }[]
  taxIncome: number
  notableEvents?: OfflineNarrativeItem[]
  nextSuggestion?: string
  loopRewards?: OfflineLoopRewardSummary
}

interface OfflineReportModalProps {
  report: OfflineReportData
  onClose: () => void
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours} 小时 ${minutes} 分钟`
  return `${minutes} 分钟`
}

function fmt(n: number): string {
  if (n >= 10000) return Math.round(n).toLocaleString()
  if (n >= 100) return Math.round(n).toString()
  if (n >= 1) return n.toFixed(1)
  return n.toFixed(2)
}

function BreakthroughEventItem({
  bt,
  index,
}: {
  bt: { characterName: string; targetRealm: string; success: boolean }
  index: number
}) {
  const prefersReducedMotion = useReducedMotion()

  if (bt.success) {
    return (
      <motion.li
        className={`${s.eventItem} ${s.eventItemBreakthroughSuccess}`}
        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: index * 0.1 }}
      >
        <span className={s.eventSuccess}>突破</span>
        <span>
          {bt.characterName} {'->'} {bt.targetRealm}
        </span>
      </motion.li>
    )
  }

  return (
    <motion.li
      className={s.eventItem}
      initial={prefersReducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1, x: [0, -4, 4, -3, 3, 0] }}
      transition={{ duration: 0.3, ease: 'easeOut', delay: index * 0.1, x: { duration: 0.3 } }}
    >
      <span className={s.eventFailure}>受阻</span>
      <span>
        {bt.characterName} {'->'} {bt.targetRealm}（失败）
      </span>
    </motion.li>
  )
}

export type { OfflineReportData }

export default function OfflineReportModal({ report, onClose }: OfflineReportModalProps) {
  const r = report.resourcesGained
  const notableEvents = report.notableEvents ?? []
  const nextSuggestion = report.nextSuggestion ?? '继续按当前配置运转，优先处理宗门页提示的瓶颈。'
  const hasResources = r.spiritStone > 0 || r.spiritEnergy > 0 || r.herb > 0 || r.ore > 0
  const hasBreakthroughs = report.breakthroughs.length > 0
  const hasCrafted = report.itemsCrafted.length > 0
  const hasTax = report.taxIncome > 0
  const hasNotableEvents = notableEvents.length > 0
  const hasLoopRewards = Boolean(report.loopRewards)

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.highlight} data-testid="offline-highlight">
          <div className={s.eyebrow}>离峰归来</div>
          <div className={s.title}>离线修炼报告</div>
          <div className={s.duration}>离开时长：{formatDuration(report.offlineSeconds)}</div>
          <div className={s.highlightHint}>静修之间，宗门诸务仍在运转，所得已整理成卷。</div>
        </div>

        {hasNotableEvents && (
          <div className={s.section}>
            <div className={s.sectionTitle}>宗门发生了什么</div>
            <div className={s.narrativeList}>
              {notableEvents.map((event) => (
                <div
                  key={event.id}
                  className={`${s.narrativeItem} ${
                    event.tone === 'good'
                      ? s.narrativeGood
                      : event.tone === 'warn'
                        ? s.narrativeWarn
                        : s.narrativeAccent
                  }`}
                >
                  <div className={s.narrativeTitle}>{event.title}</div>
                  <div className={s.narrativeDetail}>{event.detail}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasLoopRewards && report.loopRewards && (
          <div className={s.section}>
            <div className={s.sectionTitle}>归墟回响收获</div>
            <div className={s.loopRewardCard} data-testid="offline-loop-rewards">
              <div className={s.loopRewardTitle}>{report.loopRewards.title}</div>
              <div className={s.loopRewardDetail}>{report.loopRewards.detail}</div>
              <div className={s.loopRewardGrid}>
                <div className={s.loopRewardItem}>
                  <span className={s.loopRewardLabel}>归墟潮晶</span>
                  <span className={s.loopRewardValue}>x{report.loopRewards.tideCrystalCount}</span>
                </div>
                <div className={s.loopRewardItem}>
                  <span className={s.loopRewardLabel}>渊息残片</span>
                  <span className={s.loopRewardValue}>x{report.loopRewards.abyssShardCount}</span>
                </div>
              </div>
            </div>
          </div>
        )}

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
                <BreakthroughEventItem key={i} bt={bt} index={i} />
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

        <div className={s.section}>
          <div className={s.sectionTitle}>下一步建议</div>
          <div className={s.suggestionCard}>{nextSuggestion}</div>
        </div>

        {!hasResources && !hasBreakthroughs && !hasCrafted && !hasTax && !hasNotableEvents && !hasLoopRewards && (
          <div className={s.emptyHint}>离线期间暂无特殊收获。</div>
        )}

        <button className={s.collectBtn} onClick={onClose}>
          收取
        </button>
      </div>
    </div>
  )
}
