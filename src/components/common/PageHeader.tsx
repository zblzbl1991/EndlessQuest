import type { ReactNode } from 'react'
import styles from './PageHeader.module.css'

export interface PageHeaderMetric {
  label: string
  value: ReactNode
  detail?: ReactNode
}

interface PageHeaderProps {
  title: string
  action?: ReactNode
  metrics?: PageHeaderMetric[]
  testId?: string
}

export default function PageHeader({ title, action, metrics = [], testId }: PageHeaderProps) {
  return (
    <section className={styles.wrapper} data-testid={testId}>
      <div className={styles.titleBar}>
        <h1 className={styles.title}>{title}</h1>
        {action ? <div className={styles.action}>{action}</div> : null}
      </div>

      {metrics.length > 0 && (
        <div className={styles.metrics}>
          {metrics.map((metric) => (
            <div key={metric.label} className={styles.metricCard}>
              <span className={styles.metricLabel}>{metric.label}</span>
              <strong className={styles.metricValue}>{metric.value}</strong>
              {metric.detail ? <span className={styles.metricDetail}>{metric.detail}</span> : null}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
