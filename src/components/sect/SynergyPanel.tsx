import { useSectStore } from '../../stores/sectStore'
import { SYNERGIES } from '../../data/buildings'
import { getActiveSynergies } from '../../systems/economy/SynergySystem'
import type { BuildingType } from '../../types/sect'
import styles from './SynergyPanel.module.css'

const BUILDING_NAME_MAP: Partial<Record<BuildingType, string>> = {
  mainHall: '主殿',
  spiritField: '灵田',
  spiritMine: '灵矿',
  market: '坊市',
  alchemyFurnace: '丹炉',
  forge: '锻器坊',
  scriptureHall: '藏经阁',
  recruitmentPavilion: '聚仙台',
}

export default function SynergyPanel() {
  const sect = useSectStore((s) => s.sect)
  const activeSynergies = getActiveSynergies(sect.buildings)
  const activeIds = new Set(activeSynergies.map((s) => s.id))

  // Deduplicate synergies by unique id for display
  const uniqueSynergies = SYNERGIES.filter((s, i) => SYNERGIES.findIndex((other) => other.id === s.id) === i)

  return (
    <div className={styles.container}>
      <div className={styles.title}>建筑协同</div>
      <div className={styles.synergyList}>
        {uniqueSynergies.map((synergy) => {
          const isActive = activeIds.has(synergy.id)
          const reqProgress = synergy.requirements.map((req) => {
            const building = sect.buildings.find((b) => b.type === req.building)
            const currentLevel = building?.level ?? 0
            const name = BUILDING_NAME_MAP[req.building] ?? req.building
            const met = currentLevel >= req.level
            return { name, currentLevel, requiredLevel: req.level, met }
          })
          const allMet = reqProgress.every((r) => r.met)
          const closeToActivation =
            !allMet &&
            reqProgress.filter((r) => r.met).length === reqProgress.length - 1 &&
            reqProgress.some((r) => !r.met && r.currentLevel === r.requiredLevel - 1)

          let cardClass = styles.synergyCard
          if (isActive) cardClass += ` ${styles.synergyActive}`
          else if (closeToActivation) cardClass += ` ${styles.synergyClose}`
          else cardClass += ` ${styles.synergyInactive}`

          return (
            <div key={synergy.id} className={cardClass}>
              <div className={styles.synergyHeader}>
                <span className={styles.synergyName}>{synergy.name}</span>
                <span className={isActive ? styles.statusActive : styles.statusInactive}>
                  {isActive ? '已激活' : closeToActivation ? '即将激活' : '未激活'}
                </span>
              </div>
              <div className={styles.synergyDesc}>{synergy.description}</div>
              <div className={styles.synergyProgress}>
                {reqProgress.map((r, i) => (
                  <span
                    key={i}
                    className={`${styles.progressItem} ${r.met ? styles.progressMet : styles.progressPending}`}
                  >
                    {r.name} Lv{r.currentLevel}/{r.requiredLevel}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
