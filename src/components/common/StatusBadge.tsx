import type { CharacterStatus } from '../../types/character'
import styles from './StatusBadge.module.css'

const STATUS_LABELS: Record<CharacterStatus, string> = {
  cultivating: '修炼中',
  adventuring: '冒险中',
  patrolling: '巡逻中',
  resting: '休息',
  injured: '受伤',
  training: '研习中',
  idle: '休息',
  secluded: '闭关中',
}

const STATUS_STYLES: Record<CharacterStatus, string> = {
  cultivating: styles.cultivating,
  adventuring: styles.adventuring,
  patrolling: styles.adventuring,
  resting: styles.resting,
  injured: styles.injured,
  training: styles.cultivating,
  idle: styles.resting,
  secluded: styles.cultivating,
}

interface StatusBadgeProps {
  status: CharacterStatus
  className?: string
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={`${styles.badge} ${STATUS_STYLES[status] ?? ''} ${className ?? ''}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}
