import { useMemo } from 'react'
import { usePlayerStore } from '../../stores/playerStore'
import { useInventoryStore } from '../../stores/inventoryStore'
import { getRealmName, getCultivationNeeded } from '../../data/realms'
import type { Equipment } from '../../types/item'
import ProgressBar from '../common/ProgressBar'
import styles from './PlayerInfo.module.css'

export default function PlayerInfo() {
  const player = usePlayerStore((s) => s.player)
  const getTotalStats = usePlayerStore((s) => s.getTotalStats)
  const items = useInventoryStore((s) => s.items)
  const realmName = getRealmName(player.realm, player.realmStage)
  const needed = getCultivationNeeded(player.realm, player.realmStage)

  const totalStats = useMemo(() => {
    const itemMap = new Map<string, Equipment>()
    for (const item of items) {
      if (item.type === 'equipment') {
        itemMap.set(item.id, item as Equipment)
      }
    }
    return getTotalStats((id) => itemMap.get(id))
  }, [getTotalStats, items])

  const hasBonus = (
    totalStats.hp !== player.baseStats.hp ||
    totalStats.atk !== player.baseStats.atk ||
    totalStats.def !== player.baseStats.def ||
    totalStats.spd !== player.baseStats.spd
  )

  return (
    <div className={styles.container}>
      <div className={styles.avatar}>🧑‍🦱</div>
      <div className={styles.info}>
        <div className={styles.name}>{player.name}</div>
        <div className={styles.realm}>{realmName}</div>
        <div className={styles.stats}>
          <span className={styles.stat}>
            <span className={styles.statLabel}>HP</span>{' '}
            <span className={styles.statValue}>{totalStats.hp}</span>
            {hasBonus && player.baseStats.hp !== totalStats.hp && (
              <span className={styles.statBonus}>+{totalStats.hp - player.baseStats.hp}</span>
            )}
          </span>
          <span className={styles.stat}>
            <span className={styles.statLabel}>ATK</span>{' '}
            <span className={styles.statValue}>{totalStats.atk}</span>
            {hasBonus && player.baseStats.atk !== totalStats.atk && (
              <span className={styles.statBonus}>+{totalStats.atk - player.baseStats.atk}</span>
            )}
          </span>
          <span className={styles.stat}>
            <span className={styles.statLabel}>DEF</span>{' '}
            <span className={styles.statValue}>{totalStats.def}</span>
            {hasBonus && player.baseStats.def !== totalStats.def && (
              <span className={styles.statBonus}>+{totalStats.def - player.baseStats.def}</span>
            )}
          </span>
          <span className={styles.stat}>
            <span className={styles.statLabel}>SPD</span>{' '}
            <span className={styles.statValue}>{totalStats.spd}</span>
            {hasBonus && player.baseStats.spd !== totalStats.spd && (
              <span className={styles.statBonus}>+{totalStats.spd - player.baseStats.spd}</span>
            )}
          </span>
        </div>
        <ProgressBar value={player.cultivation} max={needed} variant="ink" />
        <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
          修为 {player.cultivation.toLocaleString()} / {needed.toLocaleString()}
        </div>
      </div>
    </div>
  )
}
