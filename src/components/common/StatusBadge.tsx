import type { CharacterStatus } from '../../types/character'
import styles from './StatusBadge.module.css'

const STATUS_LABELS: Record<CharacterStatus, string> = {
  idle: '修炼中',
  adventuring: '冒险中',
  patrolling: '派遣中',
  resting: '休息',
  injured: '受伤',
  training: '研习中',
}

const STATUS_STYLES: Record<CharacterStatus, string> = {
  idle: styles.cultivating,
  adventuring: styles.adventuring,
  patrolling: styles.adventuring,
  resting: styles.resting,
  injured: styles.injured,
  training: styles.cultivating,
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
