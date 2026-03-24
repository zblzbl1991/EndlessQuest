import styles from './ProgressBar.module.css'

interface ProgressBarProps {
  value: number
  max: number
  variant?: 'default' | 'ink'
  className?: string
}

export default function ProgressBar({ value, max, variant = 'default', className }: ProgressBarProps) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className={`${styles.bar} ${className ?? ''}`}>
      <div
        className={`${styles.fill} ${variant === 'ink' ? styles.fillInk : ''}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
