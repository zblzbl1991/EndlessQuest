import { useSectStore } from '../../stores/sectStore'
import { calcResourceRates } from '../../systems/economy/ResourceEngine'
import styles from './StatsPanel.module.css'

export default function StatsPanel() {
  const sect = useSectStore((s) => s.sect)
  const { stats } = sect

  // Calculate current spirit stone rate
  const sfLevel = sect.buildings.find((b) => b.type === 'spiritField')?.level ?? 0
  const smLevel = sect.buildings.find((b) => b.type === 'spiritMine')?.level ?? 0
  const mhLevel = sect.buildings.find((b) => b.type === 'mainHall')?.level ?? 0
  const rates = calcResourceRates({ spiritField: sfLevel, spiritMine: smLevel, mainHall: mhLevel })
  const spiritStonePerSec = rates.spiritStone

  // Derived values
  const winRate = stats.totalBattles > 0 ? ((stats.totalVictories / stats.totalBattles) * 100).toFixed(1) : '0.0'
  const breakthroughFails = stats.totalBreakthroughAttempts - stats.totalBreakthroughSuccesses

  // Format play time
  const totalMinutes = Math.floor(stats.totalPlayTime / 60)
  const playHours = Math.floor(totalMinutes / 60)
  const playMinutes = totalMinutes % 60

  // Longest offline in minutes
  const longestOfflineMin = Math.floor(stats.longestOfflineSeconds / 60)

  return (
    <div className={styles.container}>
      <div className={styles.title}>宗门统计</div>

      {/* Resources */}
      <div className={styles.category}>
        <div className={styles.categoryLabel}>资源</div>
        <div className={styles.statRows}>
          <StatRow label="总灵石收入" value={stats.totalSpiritStoneEarned.toLocaleString('zh-CN')} />
          <StatRow label="总灵石支出" value={stats.totalSpiritStoneSpent.toLocaleString('zh-CN')} />
          <StatRow label="灵石/秒（当前）" value={spiritStonePerSec.toFixed(2)} />
        </div>
      </div>

      {/* Combat */}
      <div className={styles.category}>
        <div className={styles.categoryLabel}>战斗</div>
        <div className={styles.statRows}>
          <StatRow label="总战斗次数" value={stats.totalBattles.toLocaleString('zh-CN')} />
          <StatRow label="胜率" value={`${winRate}%`} />
          <StatRow label="总击杀数" value={stats.totalKills.toLocaleString('zh-CN')} />
          <StatRow label="最高通关层数" value={String(stats.maxFloorCleared)} />
        </div>
      </div>

      {/* Disciples */}
      <div className={styles.category}>
        <div className={styles.categoryLabel}>弟子</div>
        <div className={styles.statRows}>
          <StatRow label="总招募数" value={stats.totalRecruits.toLocaleString('zh-CN')} />
          <StatRow
            label="突破成功/失败"
            value={`${stats.totalBreakthroughSuccesses.toLocaleString('zh-CN')} / ${breakthroughFails.toLocaleString('zh-CN')}`}
          />
        </div>
      </div>

      {/* Buildings */}
      <div className={styles.category}>
        <div className={styles.categoryLabel}>建筑</div>
        <div className={styles.statRows}>
          <StatRow label="总升级次数" value={stats.totalBuildingUpgrades.toLocaleString('zh-CN')} />
        </div>
      </div>

      {/* Adventure */}
      <div className={styles.category}>
        <div className={styles.categoryLabel}>秘境</div>
        <div className={styles.statRows}>
          <StatRow label="总运行次数" value={stats.totalAdventureRuns.toLocaleString('zh-CN')} />
          <StatRow label="完成次数" value={stats.totalAdventureCompletions.toLocaleString('zh-CN')} />
          <StatRow label="失败次数" value={stats.totalAdventureFailures.toLocaleString('zh-CN')} />
        </div>
      </div>

      {/* Pets */}
      <div className={styles.category}>
        <div className={styles.categoryLabel}>灵宠</div>
        <div className={styles.statRows}>
          <StatRow label="总捕获数" value={stats.totalPetCaptures.toLocaleString('zh-CN')} />
        </div>
      </div>

      {/* Time */}
      <div className={styles.category}>
        <div className={styles.categoryLabel}>时间</div>
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
