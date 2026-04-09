import { useMemo } from 'react'
import { useSectStore } from '../stores/sectStore'
import { useGameStore } from '../stores/gameStore'

import { calcSpiritStoneCap } from '../systems/economy/ResourceEngine'
import { getActiveSynergies } from '../systems/economy/SynergySystem'
import { SYNERGIES } from '../data/buildings'
import { SECT_RISK_POLICY_LIST } from '../data/sectRiskPolicies'
import { getFateGridDef } from '../data/fateGrids'
import { FATE_GRID_RARITY_NAMES } from '../types/destiny'
import type { FateGridRarity } from '../types/destiny'
import { PixelIcon } from '../components/common/PixelIcon'
import PageHeader from '../components/common/PageHeader'
import ResourceRate from '../components/common/ResourceRate'
import StrategyPanel from '../components/sect/StrategyPanel'
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

const RARITY_ORDER: Record<FateGridRarity, number> = { legendary: 4, epic: 3, rare: 2, common: 1 }

/** Static data — computed once at module level. */
const UNIQUE_SYNERGY_TOTAL = SYNERGIES.filter((s, i) => SYNERGIES.findIndex((o) => o.id === s.id) === i).length

export default function SectPage() {
  const sect = useSectStore((s) => s.sect)
  const resetSect = useSectStore((s) => s.reset)
  const resetGame = useGameStore((s) => s.reset)

  const characterStats = useMemo(() => getSectCharacterStatusSummary(sect.characters), [sect.characters])

  const { spiritFieldLevel, spiritFieldCount, mainHallLevel } = useMemo(() => {
    const sf = sect.buildings.find((b) => b.type === 'spiritField')
    const mh = sect.buildings.find((b) => b.type === 'mainHall')
    return {
      spiritFieldLevel: sf?.level ?? 0,
      spiritFieldCount: sf?.count ?? 0,
      mainHallLevel: mh?.level ?? 1,
    }
  }, [sect.buildings])

  const herbRate = spiritFieldLevel > 0 ? 0.1 * spiritFieldLevel * spiritFieldCount : 0
  const spiritStoneCap = calcSpiritStoneCap(mainHallLevel)
  const spiritStoneRatio = sect.resources.spiritStone / spiritStoneCap
  const activeSynergyCount = useMemo(() => getActiveSynergies(sect.buildings).length, [sect.buildings])

  const policyName = SECT_RISK_POLICY_LIST.find((p) => p.id === sect.strategySettings.activePolicy)?.name ?? '均衡'

  // Identify disciples with notable fate grids, sorted by rarity
  const notableDisciples = useMemo(() => {
    return sect.characters
      .filter((c) => c.fateGrid)
      .sort((a, b) => {
        const aDef = getFateGridDef(a.fateGrid!)
        const bDef = getFateGridDef(b.fateGrid!)
        return (RARITY_ORDER[bDef.rarity] ?? 0) - (RARITY_ORDER[aDef.rarity] ?? 0)
      })
      .slice(0, 3)
  }, [sect.characters])

  const handleResetSect = async () => {
    if (!window.confirm('确认重置当前宗门档案吗？此操作会清空当前进度。')) {
      return
    }

    resetSect()
    // Also reset adventure store
    const { useAdventureStore } = await import('../stores/adventureStore')
    useAdventureStore.getState().reset()
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
            label: '宗门方针',
            value: policyName,
            detail: `核心上限 ${SECT_RISK_POLICY_LIST.find((p) => p.id === sect.strategySettings.activePolicy)?.maxCoreDisciples ?? 2} 人`,
          },
        ]}
      />

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
      </div>

      <div className={styles.synergySummary}>
        <PixelIcon name="buildingMainHall" size={14} className={styles.inlineIcon} aria-label="协同" />
        <span>
          建筑协同已激活 {activeSynergyCount}/{UNIQUE_SYNERGY_TOTAL}
        </span>
      </div>

      {notableDisciples.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionTitle}>命格弟子</div>
          <div className={styles.fateGridList}>
            {notableDisciples.map((char) => {
              const fateDef = getFateGridDef(char.fateGrid!)
              return (
                <div key={char.id} className={styles.fateGridItem}>
                  <span className={styles.fateGridName}>{char.name}</span>
                  <span className={styles.fateGridRarity}>
                    {fateDef.name} · {FATE_GRID_RARITY_NAMES[fateDef.rarity]}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <StrategyPanel />

      <div className={styles.backgroundStack}>
        <SectPathPanel />
        <details className={styles.collapsibleSection}>
          <summary className={styles.collapsibleSummary}>
            <span>飞升与传承</span>
            <span className={styles.collapsibleMeta}>展开详情</span>
          </summary>
          <LegacyPanel />
        </details>
        <details className={styles.collapsibleSection}>
          <summary className={styles.collapsibleSummary}>
            <span>宗门统计</span>
            <span className={styles.collapsibleMeta}>展开详情</span>
          </summary>
          <StatsPanel />
        </details>
      </div>
    </div>
  )
}
