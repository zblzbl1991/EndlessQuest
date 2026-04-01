import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSectStore } from '../../stores/sectStore'
import { useAdventureStore } from '../../stores/adventureStore'
import { buildSectOverviewItems } from '../../systems/sect/SectOverviewSystem'
import { DUNGEONS } from '../../data/events'
import styles from './ActionAgenda.module.css'

const CATEGORY_LABELS = {
  management: '经营变化',
  disciple: '弟子变化',
  adventure: '冒险变化',
} as const

export default function ActionAgenda() {
  const navigate = useNavigate()
  const sect = useSectStore((s) => s.sect)
  const reports = useAdventureStore((s) => s.reports)

  const items = useMemo(() => buildSectOverviewItems(sect, reports, DUNGEONS), [reports, sect])

  if (items.length === 0) return null

  return (
    <div className={styles.container}>
      <div className={styles.cards}>
        {items.map((item) => (
          <button key={`${item.category}-${item.label}`} className={styles.card} onClick={() => navigate(item.link)}>
            <div className={styles.cardCategory}>{CATEGORY_LABELS[item.category]}</div>
            <div className={styles.cardLabel}>{item.label}</div>
            <div className={styles.cardDetail}>{item.detail}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
