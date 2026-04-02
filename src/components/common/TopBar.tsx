import { useSectStore } from '../../stores/sectStore'
import styles from './TopBar.module.css'

function ResourceItem({ label, value }: { label: string; value: number }) {
  return (
    <span className={styles.resourceItem}>
      <span className={styles.resourceLabel}>{label}</span>
      <span className={styles.resourceValue}>{Math.floor(value).toLocaleString()}</span>
    </span>
  )
}

export default function TopBar() {
  const sect = useSectStore((s) => s.sect)
  const r = sect.resources

  return (
    <header className={styles.topBar} data-testid="shell-topbar">
      <div className={styles.titleGroup} data-testid="shell-title">
        <div className={styles.titleRow}>
          <div className={styles.title}>{sect.name}</div>
          <span className={styles.sectLevel}>宗门第 {sect.level} 阶</span>
        </div>
      </div>
      <div className={styles.resources}>
        <ResourceItem label="灵石" value={r.spiritStone} />
        <ResourceItem label="灵气" value={r.spiritEnergy} />
        <ResourceItem label="灵草" value={r.herb} />
        <ResourceItem label="矿材" value={r.ore} />
      </div>
    </header>
  )
}
