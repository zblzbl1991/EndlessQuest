import PlayerInfo from '../components/character/PlayerInfo'
import ResourceRate from '../components/common/ResourceRate'
import { useInventoryStore } from '../stores/inventoryStore'
import { usePlayerStore } from '../stores/playerStore'
import { calcCultivationRate } from '../systems/cultivation/CultivationEngine'
import styles from './MainHall.module.css'

export default function MainHall() {
  const resources = useInventoryStore((s) => s.resources)
  const player = usePlayerStore((s) => s.player)
  const cultivationRate = calcCultivationRate(player)

  return (
    <div className="page-content">
      <div className={styles.main}>
        <PlayerInfo />

        <div className={styles.section}>
          <div className={styles.sectionTitle}>资源概览</div>
          <div className={styles.resourceBar}>
            <span className={styles.resourceItem}>🔵 灵气 {Math.floor(resources.spiritEnergy)}</span>
            <span className={styles.resourceItem}>🌿 灵草 {Math.floor(resources.herb)}</span>
            <span className={styles.resourceItem}>💰 灵石 {resources.spiritStone.toLocaleString()}</span>
          </div>
          <div style={{ marginTop: 8 }}>
            <ResourceRate />
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>修炼信息</div>
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            修炼速度：{cultivationRate.toFixed(1)} 修为/s
          </p>
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            灵力消耗：2 灵气/s
          </p>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>宗门动态</div>
          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>暂无动态</p>
        </div>
      </div>
    </div>
  )
}
