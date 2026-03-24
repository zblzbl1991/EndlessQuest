import { useMemo } from 'react'
import { useSectStore } from '../../stores/sectStore'
import { calcResourceRates } from '../../systems/economy/ResourceEngine'
import styles from './ResourceRate.module.css'

export default function ResourceRate() {
  const buildings = useSectStore((s) => s.buildings)

  const rates = useMemo(() => {
    const sfLevel = buildings.find((b) => b.type === 'spiritField')?.level ?? 0
    const mainHallLevel = buildings.find((b) => b.type === 'mainHall')?.level ?? 0
    return calcResourceRates({ spiritField: sfLevel, mainHall: mainHallLevel })
  }, [buildings])

  return (
    <div className={styles.container}>
      {rates.spiritEnergy > 0 && (
        <span className={styles.rateItem}>
          <span className={styles.rateIcon}>🔵</span>
          灵气 <span className={styles.rateValue}>+{rates.spiritEnergy.toFixed(1)}/s</span>
        </span>
      )}
      {rates.herb > 0 && (
        <span className={styles.rateItem}>
          <span className={styles.rateIcon}>🌿</span>
          灵草 <span className={styles.rateValue}>+{rates.herb.toFixed(2)}/s</span>
        </span>
      )}
    </div>
  )
}
