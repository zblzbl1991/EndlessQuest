import BreakthroughPanel from '../components/cultivation/BreakthroughPanel'
import { usePlayerStore } from '../stores/playerStore'
import { useInventoryStore } from '../stores/inventoryStore'
import { calcCultivationRate, calcSpiritCostPerSecond } from '../systems/cultivation/CultivationEngine'
import { getCultivationNeeded, getRealmName } from '../data/realms'
import ProgressBar from '../components/common/ProgressBar'
import styles from './Cultivation.module.css'

export default function Cultivation() {
  const player = usePlayerStore((s) => s.player)
  const resources = useInventoryStore((s) => s.resources)
  const cultivationRate = calcCultivationRate(player)
  const spiritCost = calcSpiritCostPerSecond()
  const needed = getCultivationNeeded(player.realm, player.realmStage)
  const realmName = getRealmName(player.realm, player.realmStage)
  const isCultivating = resources.spiritEnergy >= spiritCost

  return (
    <div className="page-content">
      <div className={styles.page}>
        {/* Realm Card */}
        <div className={styles.realmCard}>
          <div className={styles.realmName}>{realmName}</div>
          <div className={styles.progressSection}>
            <div className={styles.progressLabel}>
              <span>修为进度</span>
              <span>{Math.floor(player.cultivation)} / {needed.toLocaleString()}</span>
            </div>
            <ProgressBar value={player.cultivation} max={needed} variant="ink" />
          </div>
          {isCultivating && (
            <div className={styles.statusBadge}>
              <span className={styles.statusDot} />
              修炼中
            </div>
          )}
        </div>

        {/* Stats */}
        <div className={styles.infoCard}>
          <div className={styles.sectionTitle}>角色属性</div>
          <div className={styles.statsGrid}>
            <div className={styles.statBox}>
              <div className={styles.statName}>HP</div>
              <div className={styles.statNum}>{player.baseStats.hp}</div>
            </div>
            <div className={styles.statBox}>
              <div className={styles.statName}>ATK</div>
              <div className={styles.statNum}>{player.baseStats.atk}</div>
            </div>
            <div className={styles.statBox}>
              <div className={styles.statName}>DEF</div>
              <div className={styles.statNum}>{player.baseStats.def}</div>
            </div>
            <div className={styles.statBox}>
              <div className={styles.statName}>SPD</div>
              <div className={styles.statNum}>{player.baseStats.spd}</div>
            </div>
          </div>
        </div>

        {/* Cultivation Info */}
        <div className={styles.infoCard}>
          <div className={styles.sectionTitle}>修炼信息</div>
          <div className={styles.infoRow}>
            <span>修炼速度</span>
            <span className={styles.infoValue}>{cultivationRate.toFixed(1)} 修为/s</span>
          </div>
          <div className={styles.infoRow}>
            <span>灵力消耗</span>
            <span className={styles.infoValue}>{spiritCost} 灵气/s</span>
          </div>
          <div className={styles.infoRow}>
            <span>当前灵力</span>
            <span className={styles.infoValue}>{Math.floor(resources.spiritEnergy)}</span>
          </div>
          <div className={styles.infoRow}>
            <span>灵根</span>
            <span className={styles.infoValue}>{player.cultivationStats.spiritualRoot}</span>
          </div>
          <div className={styles.infoRow}>
            <span>悟性</span>
            <span className={styles.infoValue}>{player.cultivationStats.comprehension}</span>
          </div>
          <div className={styles.infoRow}>
            <span>气运</span>
            <span className={styles.infoValue}>{player.cultivationStats.fortune}</span>
          </div>
        </div>

        {/* Breakthrough */}
        <BreakthroughPanel />
      </div>
    </div>
  )
}
