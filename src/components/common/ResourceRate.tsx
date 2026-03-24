import { useMemo } from 'react'
import { useSectStore } from '../../stores/sectStore'
import { getSpiritFieldRate } from '../../systems/economy/ResourceEngine'
import styles from './ResourceRate.module.css'

export default function ResourceRate() {
  const sect = useSectStore((s) => s.sect)

  const { spiritProduction, spiritConsumption } = useMemo(() => {
    const sfLevel = sect.buildings.find((b) => b.type === 'spiritField')?.level ?? 0
    const spiritProduction = getSpiritFieldRate(sfLevel)
    const cultivatingCount = sect.characters.filter((c) => c.status === 'cultivating').length
    const spiritConsumption = cultivatingCount * 2
    return { spiritProduction, spiritConsumption }
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
          <span className={styles.rateLabel}>消耗</span>
          <span className={styles.rateValueNegative}>-{spiritConsumption}/s</span>
        </span>
      )}
    </div>
  )
}
