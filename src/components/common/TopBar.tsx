import { useInventoryStore } from '../../stores/inventoryStore'
import styles from './TopBar.module.css'

export default function TopBar() {
  const resources = useInventoryStore((s) => s.resources)

  return (
    <header className={styles.topBar}>
      <div className={styles.title}>🗡️ 无尽仙途</div>
      <div className={styles.resources}>
        <span className={styles.resourceItem}>💰 {resources.spiritStone.toLocaleString()}</span>
        <span className={styles.resourceItem}>💎 {resources.fairyJade}</span>
      </div>
    </header>
  )
}
