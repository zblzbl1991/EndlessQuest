import PlayerInfo from '../components/character/PlayerInfo'
import { useInventoryStore } from '../stores/inventoryStore'
import styles from './MainHall.module.css'

export default function MainHall() {
  const resources = useInventoryStore((s) => s.resources)

  return (
    <div className="page-content">
      <div className={styles.main}>
        <PlayerInfo />

        <div className={styles.section}>
          <div className={styles.sectionTitle}>资源概览</div>
          <div className={styles.resourceBar}>
            <span className={styles.resourceItem}>🔵 灵气 {resources.spiritEnergy}</span>
            <span className={styles.resourceItem}>🌿 灵草 {resources.herb}</span>
            <span className={styles.resourceItem}>⛏️ 矿材 {resources.ore}</span>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>宗门动态</div>
          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>暂无动态</p>
        </div>
      </div>
    </div>
  )
}
