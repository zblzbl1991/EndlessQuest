import { useMemo } from 'react'
import { useSectStore } from '../../stores/sectStore'
import { getSpiritFieldRate } from '../../data/buildings'
import styles from './ResourceRate.module.css'

export default function ResourceRate() {
  const sect = useSectStore((s) => s.sect)

  const { spiritProduction, spiritConsumption, herbRate } = useMemo(() => {
    const sfLevel = sect.buildings.find((b) => b.type === 'spiritField')?.level ?? 0
    const spiritProduction = getSpiritFieldRate(sfLevel)
    const cultivatingCount = sect.characters.filter((c) => c.status === 'cultivating').length
    const spiritConsumption = cultivatingCount * 2
    const herbRate = sfLevel > 0 ? 0.1 * sfLevel : 0
    return { spiritProduction, spiritConsumption, herbRate }
  }, [sect.buildings, sect.characters])

  return (
    <div className={styles.container}>
      {spiritProduction > 0 && (
        <span className={styles.rateItem}>
          <span className={styles.rateLabel}>灵气</span>
          <span className={styles.rateValue}>+{spiritProduction.toFixed(1)}/s</span>
        </span>
      )}
      {spiritConsumption > 0 && (
        <span className={styles.rateItem}>
          <span className={styles.rateLabel}>修炼</span>
          <span className={styles.rateValueNegative}>-{spiritConsumption}/s</span>
        </span>
      )}
      {herbRate > 0 && (
        <span className={styles.rateItem}>
          <span className={styles.rateLabel}>灵草</span>
          <span className={styles.rateValue}>+{herbRate.toFixed(1)}/s</span>
        </span>
      )}
      <span className={styles.rateItem}>
        <span className={styles.rateLabel}>矿材</span>
        <span className={styles.rateHint}>冒险获取</span>
      </span>
    </div>
  )
}
