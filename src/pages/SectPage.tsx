import { useMemo } from 'react'
import { useSectStore } from '../stores/sectStore'
import { useAdventureStore } from '../stores/adventureStore'
import ResourceRate from '../components/common/ResourceRate'
import CharacterCard from '../components/common/CharacterCard'
import ActionAgenda from '../components/sect/ActionAgenda'
import { SECT_ROUTES } from '../data/sectRoutes'
import styles from './SectPage.module.css'

export default function SectPage() {
  const sect = useSectStore((s) => s.sect)
  const activeRuns = useAdventureStore((s) => s.activeRuns)
  const dungeons = useAdventureStore((s) => s.dungeons)

  const runCount = Object.keys(activeRuns).length

  const characterStats = useMemo(() => {
    const cultivating = sect.characters.filter((c) => c.status === 'idle').length
    const adventuring = sect.characters.filter((c) => c.status === 'adventuring' || c.status === 'patrolling').length
    const resting = sect.characters.filter(
      (c) => c.status === 'resting' || c.status === 'injured',
    ).length
    const training = sect.characters.filter((c) => c.status === 'training').length
    return { cultivating, adventuring, resting, training }
  }, [sect.characters])

  const spiritFieldLevel = sect.buildings.find((b) => b.type === 'spiritField')?.level ?? 0
  const herbRate = spiritFieldLevel > 0 ? 0.1 * spiritFieldLevel : 0

  return (
    <div className={styles.page}>
      {/* Sect Header */}
      <div className={styles.header}>
        <h1 className={styles.sectName}>{sect.name}</h1>
        <span className={styles.sectLevel}>宗门等级 {sect.level}</span>
      </div>

      {/* Active Route */}
      {sect.activeRoute ? (
        <section className={styles.section}>
          <div className={styles.sectionTitle}>修行路线</div>
          <div className={styles.routeCard}>
            <span className={styles.routeName}>{SECT_ROUTES[sect.activeRoute].name}</span>
            <span className={styles.routeDesc}>{SECT_ROUTES[sect.activeRoute].description}</span>
          </div>
        </section>
      ) : (
        <section className={styles.section}>
          <div className={styles.sectionTitle}>修行路线</div>
          <div className={styles.routeHint}>尚未选择修行路线</div>
        </section>
      )}

      {/* 1. Action Agenda — top priority recommendations */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>优先事项</div>
        <ActionAgenda />
      </section>

      {/* 2. Active Adventures */}
      {runCount > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionTitle}>进行中的秘境 ({runCount})</div>
          {Object.values(activeRuns).map((run) => {
            const dungeon = dungeons.find((d) => d.id === run.dungeonId)
            return (
              <div key={run.id} className={styles.adventureItem}>
                <span className={styles.adventureName}>{dungeon?.name ?? '未知秘境'}</span>
                <span className={styles.adventureFloor}>
                  第 {run.currentFloor} / {run.floors.length} 层
                </span>
              </div>
            )
          })}
        </section>
      )}

      {/* 3. Character Stats */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>弟子概况</div>
        <div className={styles.statsRow}>
          <span className={styles.statItem}>
            <span className={styles.statCount}>{characterStats.cultivating}</span>
            <span className={styles.statLabel}>修炼中</span>
          </span>
          <span className={styles.statItem}>
            <span className={styles.statCount}>{characterStats.adventuring}</span>
            <span className={styles.statLabel}>冒险中</span>
          </span>
          <span className={styles.statItem}>
            <span className={styles.statCount}>{characterStats.training}</span>
            <span className={styles.statLabel}>研习中</span>
          </span>
          <span className={styles.statItem}>
            <span className={styles.statCount}>{characterStats.resting}</span>
            <span className={styles.statLabel}>休息</span>
          </span>
        </div>
      </section>

      {/* 4. Resource Overview */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>资源总览</div>
        <div className={styles.resourceGrid}>
          <div className={styles.resourceCard}>
            <span className={styles.resourceLabel}>灵石</span>
            <span className={styles.resourceValue}>
              {Math.floor(sect.resources.spiritStone).toLocaleString()}
            </span>
          </div>
          <div className={styles.resourceCard}>
            <span className={styles.resourceLabel}>灵气</span>
            <span className={styles.resourceValue}>
              {Math.floor(sect.resources.spiritEnergy).toLocaleString()}
            </span>
          </div>
          <div className={styles.resourceCard}>
            <span className={styles.resourceLabel}>灵草</span>
            <span className={styles.resourceValue}>
              {Math.floor(sect.resources.herb).toLocaleString()}
            </span>
          </div>
          <div className={styles.resourceCard}>
            <span className={styles.resourceLabel}>矿石</span>
            <span className={styles.resourceValue}>
              {Math.floor(sect.resources.ore).toLocaleString()}
            </span>
          </div>
        </div>
        <div className={styles.rateRow}>
          <ResourceRate />
          {herbRate > 0 && (
            <span className={styles.herbRate}>
              灵草 +{herbRate.toFixed(2)}/s
            </span>
          )}
        </div>
      </section>

      {/* 5. Character List (compact) */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>弟子列表</div>
        <div className={styles.characterList}>
          {sect.characters.map((char) => (
            <CharacterCard key={char.id} character={char} />
          ))}
        </div>
      </section>
    </div>
  )
}
