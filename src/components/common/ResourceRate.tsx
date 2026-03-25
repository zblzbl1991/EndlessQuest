import { useMemo } from 'react'
import { useSectStore } from '../../stores/sectStore'
import { calcResourceRates } from '../../systems/economy/ResourceEngine'
import styles from './ResourceRate.module.css'

export default function ResourceRate() {
  const sect = useSectStore((s) => s.sect)

  const { rates, spiritConsumption } = useMemo(() => {
    const sfLevel = sect.buildings.find((b) => b.type === 'spiritField')?.level ?? 0
    const smLevel = sect.buildings.find((b) => b.type === 'spiritMine')?.level ?? 0
    const mhLevel = sect.buildings.find((b) => b.type === 'mainHall')?.level ?? 0
    const rates = calcResourceRates({ spiritField: sfLevel, spiritMine: smLevel, mainHall: mhLevel })
    const cultivatingCount = sect.characters.filter((c) => c.status === 'cultivating').length
    const spiritConsumption = cultivatingCount * 2
    return { rates, spiritConsumption }
  }, [sect.buildings, sect.characters])

  return (
    <div className={styles.container}>
      {rates.spiritEnergy > 0 && (
        <span className={styles.rateItem}>
          <span className={styles.rateLabel}>灵气</span>
          <span className={styles.rateValue}>+{rates.spiritEnergy.toFixed(1)}/s</span>
        </span>
      )}
      {spiritConsumption > 0 && (
        <span className={styles.rateItem}>
          <span className={styles.rateLabel}>修炼</span>
          <span className={styles.rateValueNegative}>-{spiritConsumption}/s</span>
        </span>
      )}
      {rates.spiritStone > 0 && (
        <span className={styles.rateItem}>
          <span className={styles.rateLabel}>灵石</span>
          <span className={styles.rateValue}>+{rates.spiritStone.toFixed(1)}/s</span>
        </span>
      )}
      {rates.herb > 0 && (
        <span className={styles.rateItem}>
          <span className={styles.rateLabel}>灵草</span>
          <span className={styles.rateValue}>+{rates.herb.toFixed(1)}/s</span>
        </span>
      )}
      {rates.ore > 0 ? (
        <span className={styles.rateItem}>
          <span className={styles.rateLabel}>矿材</span>
          <span className={styles.rateValue}>+{rates.ore.toFixed(2)}/s</span>
        </span>
      ) : (
        <span className={styles.rateItem}>
          <span className={styles.rateLabel}>矿材</span>
          <span className={styles.rateHint}>冒险获取</span>
        </span>
      )}
    </div>
  )
}
