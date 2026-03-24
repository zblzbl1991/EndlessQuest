import { useMemo } from 'react'
import PlayerInfo from '../components/character/PlayerInfo'
import ResourceRate from '../components/common/ResourceRate'
import { useInventoryStore } from '../stores/inventoryStore'
import { usePlayerStore } from '../stores/playerStore'
import { useSectStore } from '../stores/sectStore'
import { BUILDING_DEFS } from '../data/buildings'
import { calcCultivationRate } from '../systems/cultivation/CultivationEngine'
import { calcResourceRates } from '../systems/economy/ResourceEngine'
import styles from './MainHall.module.css'

export default function MainHall() {
  const resources = useInventoryStore((s) => s.resources)
  const player = usePlayerStore((s) => s.player)
  const cultivationRate = calcCultivationRate(player)
  const buildings = useSectStore((s) => s.buildings)

  const rates = useMemo(() => {
    const sfLevel = buildings.find(b => b.type === 'spiritField')?.level ?? 0
    const mainHallLevel = buildings.find(b => b.type === 'mainHall')?.level ?? 0
    return calcResourceRates({ spiritField: sfLevel, mainHall: mainHallLevel })
  }, [buildings])

  const unlockedBuildings = useMemo(
    () => buildings.filter(b => b.unlocked),
    [buildings]
  )

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
          <div className={styles.sectionTitle}>宗门</div>
          <div className={styles.resourceBar}>
            {unlockedBuildings.map(b => {
              const def = BUILDING_DEFS.find(d => d.type === b.type)
              return (
                <span key={b.type} className={styles.resourceItem}>
                  {def?.name} Lv{b.level}
                </span>
              )
            })}
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
            资源产出：灵气 +{rates.spiritEnergy.toFixed(1)}/s
            {rates.herb > 0 && `，灵草 +${rates.herb.toFixed(2)}/s`}
          </p>
        </div>
      </div>
    </div>
  )
}
