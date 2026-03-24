import { useMemo } from 'react'
import { useSectStore } from '../stores/sectStore'
import { BUILDING_DEFS } from '../data/buildings'
import { calcResourceRates } from '../systems/economy/ResourceEngine'
import { checkBuildingUnlock, canUpgradeBuilding } from '../systems/sect/BuildingSystem'
import styles from './Sect.module.css'

export default function Sect() {
  const buildings = useSectStore((s) => s.buildings)
  const resources = useSectStore((s) => s.resources)
  const tryUpgrade = useSectStore((s) => s.tryUpgradeBuilding)
  const unlockBuilding = useSectStore((s) => s.unlockBuilding)

  const rates = useMemo(() => {
    const sfLevel = buildings.find(b => b.type === 'spiritField')?.level ?? 0
    const mainHallLevel = buildings.find(b => b.type === 'mainHall')?.level ?? 0
    return calcResourceRates({ spiritField: sfLevel, mainHall: mainHallLevel })
  }, [buildings])

  return (
    <div className="page-content">
      <div className={styles.page}>
        <div className={styles.resources}>
          <span>灵石 {resources.spiritStone.toLocaleString()}</span>
          <span>灵草 {Math.floor(resources.herb)}</span>
          <span>灵气 {Math.floor(resources.spiritEnergy)}</span>
        </div>

        <div className={styles.production}>
          <div className={styles.productionLabel}>资源产出</div>
          <div className={styles.productionGrid}>
            <span>灵气 +{rates.spiritEnergy.toFixed(1)}/s</span>
            {rates.herb > 0 && <span>灵草 +{rates.herb.toFixed(2)}/s</span>}
          </div>
        </div>

        <div className={styles.sectionTitle}>建筑</div>

        <div className={styles.grid}>
          {BUILDING_DEFS.map(def => {
            const building = buildings.find(b => b.type === def.type)
            if (!building) return null

            const unlockCheck = checkBuildingUnlock(def.type, buildings)
            const upgradeCheck = canUpgradeBuilding(def.type, buildings, resources.spiritStone)
            const isLocked = !building.unlocked
            const isMaxLevel = building.level >= def.maxLevel

            return (
              <div key={def.type} className={`${styles.card} ${isLocked ? styles.locked : ''}`}>
                <div className={styles.cardHeader}>
                  <span className={styles.name}>{def.name}</span>
                  <span className={styles.level}>Lv{building.level}/{def.maxLevel}</span>
                </div>
                <p className={styles.desc}>{def.description}</p>
                <div className={styles.actions}>
                  {isLocked ? (
                    <div className={styles.lockInfo}>
                      <span className={styles.lockReason}>
                        {unlockCheck.reason || '条件已满足'}
                      </span>
                      {unlockCheck.unlocked && (
                        <button
                          className={styles.unlockBtn}
                          onClick={() => unlockBuilding(def.type)}
                        >
                          解锁
                        </button>
                      )}
                    </div>
                  ) : isMaxLevel ? (
                    <span className={styles.maxLevel}>已满级</span>
                  ) : (
                    <div>
                      {upgradeCheck.canUpgrade ? (
                        <button
                          className={styles.upgradeBtn}
                          onClick={() => tryUpgrade(def.type)}
                        >
                          升级 ({upgradeCheck.cost.spiritStone} 灵石)
                        </button>
                      ) : (
                        <span className={styles.cannotUpgrade}>
                          {upgradeCheck.reason || '已满级'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
