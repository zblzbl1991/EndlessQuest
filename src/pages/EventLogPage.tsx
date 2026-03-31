import { useEventLogStore } from '../stores/eventLogStore'
import type { EventType } from '../stores/eventLogStore'
import { useSectStore } from '../stores/sectStore'
import { getArchiveMilestoneDef } from '../data/archiveMilestones'
import styles from './EventLogPage.module.css'

const EVENT_LABELS: Partial<Record<EventType, string>> = {
  breakthrough_success: '突破',
  breakthrough_failure: '失败',
  building_upgrade: '建筑',
  building_build: '建筑',
  recruit: '招募',
  adventure_start: '探险',
  adventure_complete: '探险',
  adventure_fail: '探险',
  patrol_complete: '巡逻',
  dispatch_complete: '派遣',
  pet_capture: '灵宠',
  item_crafted: '制造',
  breakthrough_comprehension: '顿悟',
  milestone: '里程碑',
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
  const archiveMilestones = useSectStore((s) => s.sect.archiveMilestones)

  if (events.length === 0 && archiveMilestones.length === 0) {
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
      {archiveMilestones.length > 0 && (
        <section className={styles.archiveSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.archiveTitle}>宗门档案</div>
            <div className={styles.sectionMeta}>{archiveMilestones.length} 条里程碑</div>
          </div>
          <div className={styles.archiveLead}>这里记录宗门真正留下痕迹的时刻，后续轮回仍会保留。</div>
          <div className={styles.archiveList}>
            {[...archiveMilestones]
              .sort((a, b) => b.unlockedAt - a.unlockedAt)
              .map((milestone) => {
                const def = getArchiveMilestoneDef(milestone.id)
                return (
                  <div key={milestone.id} className={styles.archiveEntry}>
                    <div className={styles.archiveHeader}>
                      <span className={styles.archiveName}>{def.title}</span>
                      <span className={styles.time}>{formatRelativeTime(milestone.unlockedAt)}</span>
                    </div>
                    <div className={styles.archiveDesc}>{def.description}</div>
                  </div>
                )
              })}
          </div>
        </section>
      )}
      <div className={styles.sectionHeader}>
        <div className={styles.archiveTitle}>近况流转</div>
        <div className={styles.sectionMeta}>{events.length} 条事件</div>
      </div>
      <div className={styles.list}>
        {events.map((evt) => (
          <div key={evt.id} className={styles.entry}>
            <span className={styles.time}>{formatRelativeTime(evt.timestamp)}</span>
            <span className={`${styles.tag} ${getEventClass(evt.type)}`}>{EVENT_LABELS[evt.type] ?? evt.type}</span>
            <span className={styles.message}>{evt.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
