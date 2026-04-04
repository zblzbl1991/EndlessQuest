import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useSectStore } from '../stores/sectStore'
import { useAdventureStore } from '../stores/adventureStore'
import { useGameStore } from '../stores/gameStore'
import { calcMaxDisciplesByResources } from '../systems/sect/SectEngine'
import { calcSpiritStoneCap } from '../systems/economy/ResourceEngine'
import { PixelIcon } from '../components/common/PixelIcon'
import PageHeader from '../components/common/PageHeader'
import ResourceRate from '../components/common/ResourceRate'
import ActionAgenda from '../components/sect/ActionAgenda'
import SynergyPanel from '../components/sect/SynergyPanel'
import SectPathPanel from '../components/sect/SectPathPanel'
import LegacyPanel from '../components/sect/LegacyPanel'
import StatsPanel from '../components/sect/StatsPanel'
import { clearSaveData } from '../systems/save/SaveSystem'
import styles from './SectPage.module.css'

function getSectCharacterStatusSummary(characters: ReturnType<typeof useSectStore.getState>['sect']['characters']) {
  return [
    {
      key: 'cultivating',
      label: '修炼中',
      icon: 'cultivation',
      count: characters.filter((char) => char.status === 'idle').length,
    },
    {
      key: 'dispatching',
      label: '派遣中',
      icon: 'dispatch',
      count: characters.filter((char) => char.status === 'patrolling').length,
    },
    {
      key: 'adventuring',
      label: '秘境中',
      icon: 'adventure',
      count: characters.filter((char) => char.status === 'adventuring').length,
    },
    {
      key: 'training',
      label: '研习中',
      icon: 'technique',
      count: characters.filter((char) => char.status === 'training').length,
    },
    {
      key: 'recovering',
      label: '恢复中',
      icon: 'recovery',
      count: characters.filter((char) => char.status === 'resting' || char.status === 'injured').length,
    },
  ]
}

function getDungeonIconName(dungeonId: string): string {
  switch (dungeonId) {
    case 'lingCaoValley':
      return 'dungeonValley'
    case 'luoYunCave':
      return 'dungeonCave'
    case 'bloodDemonAbyss':
      return 'dungeonAbyss'
    case 'dragonBoneWasteland':
      return 'dungeonWasteland'
    case 'nineNetherPurgatory':
      return 'dungeonPurgatory'
    case 'heavenlyTribulationRealm':
      return 'dungeonTribulation'
    default:
      return 'dungeonCave'
  }
}

export default function SectPage() {
  const sect = useSectStore((s) => s.sect)
  const resetSect = useSectStore((s) => s.reset)
  const reports = useAdventureStore((s) => s.reports)
  const dungeons = useAdventureStore((s) => s.dungeons)
  const resetAdventure = useAdventureStore((s) => s.reset)
  const resetGame = useGameStore((s) => s.reset)

  const characterStats = useMemo(() => getSectCharacterStatusSummary(sect.characters), [sect.characters])
  const spiritFieldLevel = sect.buildings.find((b) => b.type === 'spiritField')?.level ?? 0
  const spiritFieldCount = sect.buildings.find((b) => b.type === 'spiritField')?.count ?? 0
  const herbRate = spiritFieldLevel > 0 ? 0.1 * spiritFieldLevel * spiritFieldCount : 0
  const mainHallLevel = sect.buildings.find((b) => b.type === 'mainHall')?.level ?? 1
  const spiritStoneCap = calcSpiritStoneCap(mainHallLevel)
  const spiritStoneRatio = sect.resources.spiritStone / spiritStoneCap

  const handleResetSect = async () => {
    if (!window.confirm('确认重置当前宗门档案吗？此操作会清空当前进度。')) {
      return
    }

    resetSect()
    resetAdventure()
    resetGame()
    await clearSaveData()
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title={sect.name}
        testId="sect-hero"
        action={
          <button type="button" className={styles.resetButton} onClick={handleResetSect}>
            重置宗门
          </button>
        }
        metrics={[
          { label: '宗门等级', value: sect.level, detail: `${sect.characters.length} 弟子 · ${sect.pets.length} 灵宠` },
          {
            label: '自动运转',
            value: '运行中',
            detail: `资源可养 ${calcMaxDisciplesByResources(sect.buildings, sect.characters, sect.activeRoute)} 人`,
          },
          {
            label: '优先秘境',
            value: sect.automationSettings.preferredDungeonId ?? '未设置',
            detail: `倾向 ${sect.automationSettings.casualtyTolerance}`,
          },
          {
            label: '最近战报',
            value: reports.length,
            detail: reports[0] ? `${reports[0].result} · 第 ${reports[0].floorsCleared} 层` : '暂无记录',
          },
        ]}
      />

      <section className={`${styles.section} ${styles.heroSection}`}>
        <div className={styles.sectionTitle}>要务</div>
        <div className={styles.heroCard}>
          <ActionAgenda />
        </div>
      </section>

      <div className={styles.midgroundGrid} data-testid="sect-midground-grid">
        <section className={styles.section}>
          <div className={styles.sectionTitle}>资源</div>
          <div className={styles.resourceGrid}>
            <div className={styles.resourceCard}>
              <PixelIcon name="spiritStone" size={18} className={styles.inlineIcon} aria-label="灵石" />
              <span className={styles.resourceLabel}>灵石</span>
              <span className={styles.resourceValue}>{Math.floor(sect.resources.spiritStone).toLocaleString()}</span>
              {spiritStoneRatio > 0.5 && (
                <div className={styles.capBar}>
                  <div
                    className={`${styles.capBarFill} ${spiritStoneRatio > 0.8 ? styles.capBarWarning : ''}`}
                    style={{ width: `${Math.min(100, spiritStoneRatio * 100)}%` }}
                  />
                  <span className={styles.capBarLabel}>
                    {Math.floor(sect.resources.spiritStone).toLocaleString()} / {spiritStoneCap.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
            <div className={styles.resourceCard}>
              <PixelIcon name="spiritEnergy" size={18} className={styles.inlineIcon} aria-label="灵气" />
              <span className={styles.resourceLabel}>灵气</span>
              <span className={styles.resourceValue}>{Math.floor(sect.resources.spiritEnergy).toLocaleString()}</span>
            </div>
            <div className={styles.resourceCard}>
              <PixelIcon name="herb" size={18} className={styles.inlineIcon} aria-label="灵草" />
              <span className={styles.resourceLabel}>灵草</span>
              <span className={styles.resourceValue}>{Math.floor(sect.resources.herb).toLocaleString()}</span>
            </div>
            <div className={styles.resourceCard}>
              <PixelIcon name="ore" size={18} className={styles.inlineIcon} aria-label="矿材" />
              <span className={styles.resourceLabel}>矿材</span>
              <span className={styles.resourceValue}>{Math.floor(sect.resources.ore).toLocaleString()}</span>
            </div>
          </div>
          <div className={styles.rateRow}>
            <ResourceRate />
            {herbRate > 0 && <span className={styles.herbRate}>灵草 +{herbRate.toFixed(2)}/s</span>}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionTitle}>弟子</div>
          <div className={styles.statsRow}>
            {characterStats.map((item) => (
              <span key={item.key} className={styles.statItem}>
                <PixelIcon name={item.icon} size={16} className={styles.inlineIcon} aria-label={item.label} />
                <span className={styles.statCount}>{item.count}</span>
                <span className={styles.statLabel}>{item.label}</span>
              </span>
            ))}
          </div>
        </section>

        <SynergyPanel />

        {reports.length > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionTitle}>战报</div>
            {reports.slice(0, 3).map((report) => {
              const dungeon = dungeons.find((item) => item.id === report.dungeonId)
              return (
                <div key={report.id} className={styles.adventureItem}>
                  <div>
                    <span className={styles.adventureName}>
                      <PixelIcon
                        name={getDungeonIconName(report.dungeonId)}
                        size={16}
                        className={styles.inlineIcon}
                        aria-label={dungeon?.name ?? report.dungeonId}
                      />
                      {dungeon?.name ?? report.dungeonId}
                    </span>
                    <span className={styles.adventureFloor}>
                      {report.result === 'completed' ? '通关' : report.result === 'retreated' ? '撤退' : '失败'} · 第
                      {report.floorsCleared} 层
                    </span>
                  </div>
                  <Link className={styles.adventureLink} to={`/adventure/report/${report.id}`}>
                    查看详情
                  </Link>
                </div>
              )
            })}
          </section>
        )}
      </div>

      <div className={styles.backgroundStack}>
        <SectPathPanel />
        <LegacyPanel />
        <StatsPanel />
      </div>
    </div>
  )
}
