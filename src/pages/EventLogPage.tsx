import { useEventLogStore } from '../stores/eventLogStore'
import type { EventType } from '../stores/eventLogStore'
import { useSectStore } from '../stores/sectStore'
import { ARCHIVE_MILESTONE_MAP } from '../data/archiveMilestones'
import styles from './EventLogPage.module.css'

const EVENT_LABELS: Partial<Record<EventType, string>> = {
  breakthrough_success: '突破',
  breakthrough_failure: '失败',
  building_upgrade: '建筑',
  building_build: '建筑',
  recruit: '招募',
  adventure_complete: '探险',
  adventure_fail: '探险',
  patrol_complete: '巡逻',
  item_crafted: '制造',
  milestone: '成就',
}

function getEventClass(type: EventType): string {
  if (type === 'breakthrough_success' || type === 'adventure_complete') return styles.success
  if (type === 'breakthrough_failure' || type === 'adventure_fail') return styles.danger
  if (type === 'building_upgrade' || type === 'building_build' || type === 'milestone') return styles.accent
  return ''
}

function formatRelativeTime(timestamp: number): string {
  const diff = Math.floor((Date.now() - timestamp) / 1000)
  if (diff < 10) return '刚刚'
  if (diff < 60) return `${diff}秒前`
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
  return `${Math.floor(diff / 86400)}天前`
}

export default function EventLogPage() {
  const events = useEventLogStore((s) => s.events)
  const milestones = useSectStore((s) => s.sect.milestones)

  if (events.length === 0) {
    return (
      <div className={styles.page}>
        <h1 className={styles.pageTitle}>事件记录</h1>
        <div className={styles.empty}>暂无记录</div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>事件记录</h1>
      {Object.keys(milestones).length > 0 && (
        <div className={styles.milestones}>
          {Object.entries(milestones)
            .map(([id, record]) => ({ ...ARCHIVE_MILESTONE_MAP[id], unlockedAt: record.unlockedAt }))
            .filter((m) => m.name)
            .map((m) => (
              <span key={m.id} className={styles.milestoneChip} title={m.description}>
                {m.name}
              </span>
            ))}
        </div>
      )}
      <div className={styles.list}>
        {events.map((evt) => (
          <div key={evt.id} className={styles.entry}>
            <span className={styles.time}>{formatRelativeTime(evt.timestamp)}</span>
            <span className={`${styles.tag} ${getEventClass(evt.type)}`}>
              {EVENT_LABELS[evt.type] ?? evt.type}
            </span>
            <span className={styles.message}>{evt.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
