import { useMemo } from 'react'
import { useSectStore } from '../../stores/sectStore'
import { canBreakthrough } from '../../systems/cultivation/CultivationEngine'
import { getCultivationNeeded } from '../../data/realms'
import { canUpgradeBuilding } from '../../systems/sect/BuildingSystem'
import { BUILDING_DEFS, calcResourceCaps } from '../../data/buildings'
import { needsCultivationPathChoice } from '../../systems/character/CultivationPathSystem'
import { calcResourceRates } from '../../systems/economy/ResourceEngine'
import { PixelIcon } from '../common/PixelIcon'
import styles from './StatsPanel.module.css'

export default function StatsPanel() {
  const sect = useSectStore((s) => s.sect)
  const { stats } = sect

  const sfLevel = sect.buildings.find((b) => b.type === 'spiritField')?.level ?? 0
  const smLevel = sect.buildings.find((b) => b.type === 'spiritMine')?.level ?? 0
  const mhLevel = sect.buildings.find((b) => b.type === 'mainHall')?.level ?? 0
  const rates = calcResourceRates({ spiritField: sfLevel, spiritMine: smLevel, mainHall: mhLevel })
  const spiritStonePerSec = rates.spiritStone

  const winRate = stats.totalBattles > 0 ? ((stats.totalVictories / stats.totalBattles) * 100).toFixed(1) : '0.0'
  const breakthroughFails = stats.totalBreakthroughAttempts - stats.totalBreakthroughSuccesses
  const totalMinutes = Math.floor(stats.totalPlayTime / 60)
  const playHours = Math.floor(totalMinutes / 60)
  const playMinutes = totalMinutes % 60
  const longestOfflineMin = Math.floor(stats.longestOfflineSeconds / 60)

  const focusRows = useMemo(() => {
    const breakthroughCandidates = sect.characters.filter((char) => {
      const needed = getCultivationNeeded(char.realm, char.realmStage)
      return needed !== Infinity && char.cultivation / needed > 0.9 && canBreakthrough(char)
    })

    const pathChoices = breakthroughCandidates.filter(needsCultivationPathChoice)
    const nextUpgrade = BUILDING_DEFS.find((def) => canUpgradeBuilding(def.type, sect.buildings, sect.resources.spiritStone).canUpgrade)
    const caps = calcResourceCaps(
      sect.buildings.find((b) => b.type === 'spiritField')?.level ?? 0,
      sect.buildings.find((b) => b.type === 'spiritMine')?.level ?? 0
    )
    const overflowTarget = [
      { name: '灵气', value: sect.resources.spiritEnergy, cap: caps.spiritEnergy },
      { name: '灵草', value: sect.resources.herb, cap: caps.herb },
      { name: '矿材', value: sect.resources.ore, cap: caps.ore },
    ].find((item) => item.cap > 0 && item.value / item.cap > 0.8)

    return [
      {
        label: '修行',
        value:
          pathChoices.length > 0
            ? `${pathChoices[0].name} 先定路线`
            : breakthroughCandidates.length > 0
              ? `${breakthroughCandidates.length} 名弟子可突破`
              : '暂无临界弟子',
      },
      {
        label: '建设',
        value: nextUpgrade ? `${nextUpgrade.name} 可升级` : '建筑稳定',
      },
      {
        label: '资源',
        value: overflowTarget ? `${overflowTarget.name} 需要消耗` : '流转正常',
      },
    ]
  }, [sect])

  return (
    <div className={styles.container}>
      <div className={styles.title}>
        <PixelIcon name="mainHall" size={18} className={styles.inlineIcon} aria-label="宗门统计" />
        宗门统计
      </div>

      <div className={styles.category}>
        <div className={styles.categoryLabel}>
          <PixelIcon name="eventRandom" size={16} className={styles.inlineIcon} aria-label="当前重点" />
          当前重点
        </div>
        <div className={styles.statRows}>
          {focusRows.map((row) => (
            <StatRow key={row.label} label={row.label} value={row.value} />
          ))}
        </div>
      </div>

      <div className={styles.category}>
        <div className={styles.categoryLabel}>
          <PixelIcon name="spiritStone" size={16} className={styles.inlineIcon} aria-label="资源" />
          资源
        </div>
        <div className={styles.statRows}>
          <StatRow label="总灵石收入" value={stats.totalSpiritStoneEarned.toLocaleString('zh-CN')} />
          <StatRow label="总灵石支出" value={stats.totalSpiritStoneSpent.toLocaleString('zh-CN')} />
          <StatRow label="灵石/秒（当前）" value={spiritStonePerSec.toFixed(2)} />
        </div>
      </div>

      <div className={styles.category}>
        <div className={styles.categoryLabel}>
          <PixelIcon name="eventCombat" size={16} className={styles.inlineIcon} aria-label="战斗" />
          战斗
        </div>
        <div className={styles.statRows}>
          <StatRow label="总战斗次数" value={stats.totalBattles.toLocaleString('zh-CN')} />
          <StatRow label="胜率" value={`${winRate}%`} />
          <StatRow label="总击杀数" value={stats.totalKills.toLocaleString('zh-CN')} />
          <StatRow label="最高通关层数" value={String(stats.maxFloorCleared)} />
        </div>
      </div>

      <div className={styles.category}>
        <div className={styles.categoryLabel}>
          <PixelIcon name="disciple" size={16} className={styles.inlineIcon} aria-label="弟子" />
          弟子
        </div>
        <div className={styles.statRows}>
          <StatRow label="总招募数" value={stats.totalRecruits.toLocaleString('zh-CN')} />
          <StatRow
            label="突破成功/失败"
            value={`${stats.totalBreakthroughSuccesses.toLocaleString('zh-CN')} / ${breakthroughFails.toLocaleString('zh-CN')}`}
          />
        </div>
      </div>

      <div className={styles.category}>
        <div className={styles.categoryLabel}>
          <PixelIcon name="building" size={16} className={styles.inlineIcon} aria-label="建筑" />
          建筑
        </div>
        <div className={styles.statRows}>
          <StatRow label="总升级次数" value={stats.totalBuildingUpgrades.toLocaleString('zh-CN')} />
        </div>
      </div>

      <div className={styles.category}>
        <div className={styles.categoryLabel}>
          <PixelIcon name="dungeonCave" size={16} className={styles.inlineIcon} aria-label="秘境" />
          秘境
        </div>
        <div className={styles.statRows}>
          <StatRow label="总运行次数" value={stats.totalAdventureRuns.toLocaleString('zh-CN')} />
          <StatRow label="完成次数" value={stats.totalAdventureCompletions.toLocaleString('zh-CN')} />
          <StatRow label="失败次数" value={stats.totalAdventureFailures.toLocaleString('zh-CN')} />
        </div>
      </div>

      <div className={styles.category}>
        <div className={styles.categoryLabel}>
          <PixelIcon name="beastPath" size={16} className={styles.inlineIcon} aria-label="灵宠" />
          灵宠
        </div>
        <div className={styles.statRows}>
          <StatRow label="总捕获数" value={stats.totalPetCaptures.toLocaleString('zh-CN')} />
        </div>
      </div>

      <div className={styles.category}>
        <div className={styles.categoryLabel}>
          <PixelIcon name="eventRest" size={16} className={styles.inlineIcon} aria-label="时间" />
          时间
        </div>
        <div className={styles.statRows}>
          <StatRow label="游戏时长" value={`${playHours}时${playMinutes}分`} />
          {longestOfflineMin > 0 && (
            <StatRow label="最长离线时长" value={`${longestOfflineMin.toLocaleString('zh-CN')} 分钟`} />
          )}
        </div>
      </div>
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.statRow}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </div>
  )
}
