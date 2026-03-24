import { usePlayerStore } from '../../stores/playerStore'
import { getRealmName, getCultivationNeeded } from '../../data/realms'
import ProgressBar from '../common/ProgressBar'
import styles from './PlayerInfo.module.css'

export default function PlayerInfo() {
  const player = usePlayerStore((s) => s.player)
  const realmName = getRealmName(player.realm, player.realmStage)
  const needed = getCultivationNeeded(player.realm, player.realmStage)

  return (
    <div className={styles.container}>
      <div className={styles.avatar}>🧑‍🦱</div>
      <div className={styles.info}>
        <div className={styles.name}>{player.name}</div>
        <div className={styles.realm}>{realmName}</div>
        <div className={styles.stats}>
          <span className={styles.stat}><span className={styles.statLabel}>HP</span> <span className={styles.statValue}>{player.baseStats.hp}</span></span>
          <span className={styles.stat}><span className={styles.statLabel}>ATK</span> <span className={styles.statValue}>{player.baseStats.atk}</span></span>
          <span className={styles.stat}><span className={styles.statLabel}>DEF</span> <span className={styles.statValue}>{player.baseStats.def}</span></span>
          <span className={styles.stat}><span className={styles.statLabel}>SPD</span> <span className={styles.statValue}>{player.baseStats.spd}</span></span>
        </div>
        <ProgressBar value={player.cultivation} max={needed} variant="ink" />
        <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
          修为 {player.cultivation.toLocaleString()} / {needed.toLocaleString()}
        </div>
      </div>
    </div>
  )
}
