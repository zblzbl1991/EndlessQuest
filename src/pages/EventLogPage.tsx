import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useEventLogStore } from '../stores/eventLogStore'
import type { EventType } from '../stores/eventLogStore'
import { useSectStore } from '../stores/sectStore'
import { getArchiveMilestoneDef } from '../data/archiveMilestones'
import { getLegacyEventMarker } from '../data/legacyFlavor'
import PageHeader from '../components/common/PageHeader'
import { PixelIcon } from '../components/common/PixelIcon'
import styles from './EventLogPage.module.css'

const EVENT_LABELS: Partial<Record<EventType, string>> = {
  breakthrough_success: '突破',
  breakthrough_failure: '受阻',
  building_upgrade: '建筑',
  building_build: '建筑',
  recruit: '招募',
  adventure_start: '秘境',
  adventure_complete: '秘境',
  adventure_fail: '秘境',
  patrol_complete: '巡山',
  dispatch_complete: '派遣',
  pet_capture: '灵宠',
  item_crafted: '产线',
  technique_unlocked: '功法',
  breakthrough_comprehension: '参悟',
  milestone: '里程碑',
  random_event: '风闻',
}

function getEventClass(type: EventType): string {
  if (type === 'breakthrough_success' || type === 'adventure_complete' || type === 'technique_unlocked') {
    return styles.success
  }
  if (type === 'breakthrough_failure' || type === 'adventure_fail') return styles.danger
  if (type === 'building_upgrade' || type === 'building_build' || type === 'milestone') return styles.accent
  return ''
}

function getEventIconName(type: EventType): string {
  switch (type) {
    case 'breakthrough_success':
      return 'realmGoldenCore'
    case 'breakthrough_failure':
      return 'eventBoss'
    case 'building_upgrade':
    case 'building_build':
      return 'mainHall'
    case 'recruit':
      return 'disciple'
    case 'adventure_start':
    case 'adventure_complete':
    case 'adventure_fail':
      return 'dungeonCave'
    case 'patrol_complete':
    case 'dispatch_complete':
      return 'dispatch'
    case 'pet_capture':
      return 'beastPath'
    case 'item_crafted':
      return 'forgeWorkshop'
    case 'technique_unlocked':
    case 'breakthrough_comprehension':
      return 'techniqueScroll'
    case 'milestone':
      return 'eventAncientCave'
    default:
      return 'eventRandom'
  }
}

function formatRelativeTime(timestamp: number): string {
  const diff = Math.floor((Date.now() - timestamp) / 1000)
  if (diff < 10) return '刚刚'
  if (diff < 60) return `${diff} 秒前`
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  return `${Math.floor(diff / 86400)} 天前`
}

export default function EventLogPage() {
  const [filter, setFilter] = useState<'all' | 'adventure' | 'cultivation' | 'building' | 'milestone'>('all')
  const events = useEventLogStore((s) => s.events)
  const archiveMilestones = useSectStore((s) => s.sect.archiveMilestones)

  const filteredEvents =
    filter === 'adventure'
      ? events.filter((event) => ['adventure_start', 'adventure_complete', 'adventure_fail'].includes(event.type))
      : filter === 'cultivation'
        ? events.filter((event) =>
            [
              'breakthrough_success',
              'breakthrough_failure',
              'breakthrough_comprehension',
              'technique_unlocked',
            ].includes(event.type)
          )
        : filter === 'building'
          ? events.filter((event) => ['building_upgrade', 'building_build', 'item_crafted'].includes(event.type))
          : filter === 'milestone'
            ? events.filter((event) => ['milestone', 'recruit', 'pet_capture', 'random_event'].includes(event.type))
            : events

  if (events.length === 0 && archiveMilestones.length === 0) {
    return (
      <div className={styles.page}>
        <PageHeader title="记录" />
        <div className={styles.empty}>暂无记录</div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="记录"
        metrics={[
          { label: '里程碑', value: archiveMilestones.length, detail: '会跨轮回保留' },
          {
            label: '当前筛选',
            value:
              filter === 'all'
                ? '全部'
                : filter === 'adventure'
                  ? '秘境'
                  : filter === 'cultivation'
                    ? '修行'
                    : filter === 'building'
                      ? '建设'
                      : '里程碑',
            detail: `${filteredEvents.length} 条事件`,
          },
        ]}
      />

      {archiveMilestones.length > 0 && (
        <section className={styles.archiveSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.archiveTitle}>
              <PixelIcon name="eventAncientCave" size={18} className={styles.inlineIcon} aria-label="宗门档案" />
              宗门档案
            </div>
            <div className={styles.sectionMeta}>{archiveMilestones.length} 条里程碑</div>
          </div>
          <div className={styles.archiveList}>
            {[...archiveMilestones]
              .sort((a, b) => b.unlockedAt - a.unlockedAt)
              .map((milestone) => {
                const def = getArchiveMilestoneDef(milestone.id)
                return (
                  <div key={milestone.id} className={styles.archiveEntry}>
                    <div className={styles.archiveHeader}>
                      <span className={styles.archiveName}>
                        <PixelIcon
                          name="eventAncientCave"
                          size={16}
                          className={styles.inlineIcon}
                          aria-label={def.title}
                        />
                        {def.title}
                      </span>
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
        <div className={styles.archiveTitle}>
          <PixelIcon name="eventRandom" size={18} className={styles.inlineIcon} aria-label="近况流转" />
          近况流转
        </div>
        <div className={styles.sectionMeta}>{filteredEvents.length} 条事件</div>
      </div>

      <div className={styles.filterRow}>
        <button
          className={`${styles.filterBtn} ${filter === 'all' ? styles.filterBtnActive : ''}`}
          onClick={() => setFilter('all')}
        >
          全部
        </button>
        <button
          className={`${styles.filterBtn} ${filter === 'adventure' ? styles.filterBtnActive : ''}`}
          onClick={() => setFilter('adventure')}
        >
          秘境
        </button>
        <button
          className={`${styles.filterBtn} ${filter === 'cultivation' ? styles.filterBtnActive : ''}`}
          onClick={() => setFilter('cultivation')}
        >
          修行
        </button>
        <button
          className={`${styles.filterBtn} ${filter === 'building' ? styles.filterBtnActive : ''}`}
          onClick={() => setFilter('building')}
        >
          建设
        </button>
        <button
          className={`${styles.filterBtn} ${filter === 'milestone' ? styles.filterBtnActive : ''}`}
          onClick={() => setFilter('milestone')}
        >
          里程碑
        </button>
      </div>

      <div className={styles.list}>
        {filteredEvents.map((evt) => {
          const reportId = typeof evt.data?.reportId === 'string' ? evt.data.reportId : null
          const legacyMarker = getLegacyEventMarker(evt.data)
          return (
            <div key={evt.id} className={styles.entry}>
              <span className={styles.time}>{formatRelativeTime(evt.timestamp)}</span>
              <span className={`${styles.tag} ${getEventClass(evt.type)}`}>
                <PixelIcon
                  name={getEventIconName(evt.type)}
                  size={14}
                  className={styles.tagIcon}
                  aria-label={EVENT_LABELS[evt.type] ?? evt.type}
                />
                {EVENT_LABELS[evt.type] ?? evt.type}
              </span>
              <span className={styles.message}>{evt.message}</span>
              {legacyMarker ? <span className={styles.legacyMarker}>{legacyMarker}</span> : null}
              {reportId ? (
                <Link className={styles.detailLink} to={`/adventure/report/${reportId}`}>
                  查看明细
                </Link>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
