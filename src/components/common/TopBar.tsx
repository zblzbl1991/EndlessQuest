import { useSectStore } from '../../stores/sectStore'
import styles from './TopBar.module.css'

export default function TopBar() {
  const sect = useSectStore((s) => s.sect)

  return (
    <header className={styles.topBar}>
      <div className={styles.title}>{sect.name}</div>
      <div className={styles.resources}>
        <span className={styles.resourceItem}>
          <span className={styles.resourceLabel}>灵石</span>
          <span className={styles.resourceValue}>{Math.floor(sect.resources.spiritStone).toLocaleString()}</span>
        </span>
      </div>
    </header>
  )
}
