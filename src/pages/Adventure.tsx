import { useState } from 'react'
import { useAdventureStore } from '../stores/adventureStore'
import { isDungeonUnlocked } from '../stores/adventureStore'
import { usePlayerStore } from '../stores/playerStore'
import styles from './Adventure.module.css'

const RISK_LABELS: Record<string, string> = { low: '低风险', medium: '中风险', high: '高风险' }
const EVENT_LABELS: Record<string, string> = {
  combat: '战斗',
  random: '随机',
  shop: '商店',
  rest: '休息',
  boss: 'Boss',
}

export default function Adventure() {
  const currentRun = useAdventureStore((s) => s.currentRun)
  const view = currentRun ? 'run' : 'list'

  return (
    <div className="page-content">
      <div className={styles.page}>
        {view === 'list' ? <DungeonList /> : <DungeonRun />}
      </div>
    </div>
  )
}

function DungeonList() {
  const dungeons = useAdventureStore((s) => s.dungeons)
  const completed = useAdventureStore((s) => s.completedDungeons)
  const player = usePlayerStore((s) => s.player)
  const startRun = useAdventureStore((s) => s.startRun)
  const [selectedMode, setSelectedMode] = useState<'idle' | 'manual'>('manual')

  return (
    <>
      <div className={styles.sectionTitle}>秘境</div>

      <div className={styles.modeToggle}>
        <button
          className={`${styles.modeOption} ${selectedMode === 'manual' ? styles.active : ''}`}
          onClick={() => setSelectedMode('manual')}
        >
          手动
        </button>
        <button
          className={`${styles.modeOption} ${selectedMode === 'idle' ? styles.active : ''}`}
          onClick={() => setSelectedMode('idle')}
        >
          挂机
        </button>
      </div>

      <div className={styles.dungeonGrid}>
        {dungeons.map((dungeon) => {
          const unlocked = isDungeonUnlocked(dungeon, player.realm, player.realmStage)
          const isCompleted = completed.includes(dungeon.id)

          return (
            <div
              key={dungeon.id}
              className={`${styles.dungeonCard} ${!unlocked ? styles.locked : ''} ${isCompleted ? styles.completed : ''}`}
              onClick={() => {
                if (unlocked) startRun(dungeon.id, selectedMode)
              }}
            >
              <div className={styles.dungeonCardHeader}>
                <span className={styles.dungeonName}>{dungeon.name}</span>
                <span className={styles.dungeonLayers}>{dungeon.totalLayers} 层</span>
              </div>
              <p className={styles.dungeonDesc}>
                {!unlocked
                  ? `需要境界 ${dungeon.unlockRealm}-${dungeon.unlockStage} 解锁`
                  : isCompleted
                    ? '已通关'
                    : '点击进入'}
              </p>
            </div>
          )
        })}
      </div>
    </>
  )
}

function DungeonRun() {
  const dungeons = useAdventureStore((s) => s.dungeons)
  const currentRun = useAdventureStore((s) => s.currentRun)
  const floors = useAdventureStore((s) => s.floors)
  const currentFloor = useAdventureStore((s) => s.currentFloor)
  const selectedRoute = useAdventureStore((s) => s.selectedRoute)
  const eventLog = useAdventureStore((s) => s.eventLog)
  const totalReward = useAdventureStore((s) => s.totalReward)
  const playerHp = useAdventureStore((s) => s.playerHp)
  const playerMaxHp = useAdventureStore((s) => s.playerMaxHp)
  const runComplete = useAdventureStore((s) => s.runComplete)
  const runVictory = useAdventureStore((s) => s.runVictory)
  const selectRoute = useAdventureStore((s) => s.selectRoute)
  const advanceFloor = useAdventureStore((s) => s.advanceFloor)
  const retreat = useAdventureStore((s) => s.retreat)
  const endRun = useAdventureStore((s) => s.endRun)

  if (!currentRun) return null

  const dungeon = dungeons.find((d) => d.id === currentRun.dungeonId)
  const floor = floors[currentFloor - 1]
  const hpPercent = playerMaxHp > 0 ? Math.max(0, (playerHp / playerMaxHp) * 100) : 0

  const hpClass = hpPercent < 30 ? styles.low : hpPercent < 60 ? styles.medium : ''

  return (
    <>
      {/* Header */}
      <div className={styles.runHeader}>
        <span className={styles.runTitle}>{dungeon?.name ?? '秘境'}</span>
        <div className={styles.runControls}>
          {!runComplete && currentRun.mode === 'manual' && (
            <button className={`${styles.controlBtn} ${styles.danger}`} onClick={retreat}>
              撤退
            </button>
          )}
          <button className={`${styles.controlBtn} ${styles.outline}`} onClick={endRun}>
            离开
          </button>
        </div>
      </div>

      {/* Run complete */}
      {runComplete ? (
        <RunResult
          victory={runVictory}
          reward={totalReward}
          onEnd={endRun}
        />
      ) : (
        <>
          {/* Floor progress */}
          <div className={styles.floorProgress}>
            <div className={styles.floorInfo}>
              <span className={styles.floorLabel}>第 {currentFloor}/{floors.length} 层</span>
              <div className={styles.floorDots}>
                {floors.map((f) => (
                  <div
                    key={f.floor}
                    className={`${styles.floorDot} ${f.floor < currentFloor ? styles.cleared : ''} ${f.floor === currentFloor ? styles.current : ''} ${f.isBossFloor ? styles.boss : ''}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* HP bar */}
          <div className={styles.hpBar}>
            <div className={styles.hpLabel}>生命 {Math.max(0, playerHp)}/{playerMaxHp}</div>
            <div className={styles.hpTrack}>
              <div className={`${styles.hpFill} ${hpClass}`} style={{ width: `${hpPercent}%` }} />
            </div>
          </div>

          {/* Route selection or advance prompt */}
          {floor && selectedRoute === null && (
            <>
              <div className={styles.sectionTitle}>
                {floor.isBossFloor ? 'Boss 战' : '选择路径'}
              </div>
              <div className={styles.routesSection}>
                {floor.routes.map((route, idx) => (
                  <div
                    key={route.id}
                    className={styles.routeCard}
                    onClick={() => {
                      selectRoute(idx)
                      // Auto-advance after selecting (for immediate feedback)
                      setTimeout(() => {
                        useAdventureStore.getState().advanceFloor()
                      }, 100)
                    }}
                  >
                    <div className={styles.routeCardHeader}>
                      <span className={styles.routeName}>{route.name}</span>
                      <span className={`${styles.riskBadge} ${styles[route.riskLevel]}`}>
                        {RISK_LABELS[route.riskLevel]}
                      </span>
                    </div>
                    <p className={styles.routeDesc}>{route.description}</p>
                    <div className={styles.routeEvents}>
                      {route.events.map((e, ei) => (
                        <span key={ei} className={styles.eventTag}>
                          {EVENT_LABELS[e.type] ?? e.type}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Advance floor prompt (for idle mode, routes auto-selected) */}
          {selectedRoute !== null && !runComplete && currentFloor <= floors.length && (
            <button
              className={`${styles.controlBtn} ${styles.primary}`}
              style={{ width: '100%' }}
              onClick={advanceFloor}
            >
              继续前进
            </button>
          )}
        </>
      )}

      {/* Event log */}
      {eventLog.length > 0 && (
        <div className={styles.logContainer}>
          <div className={styles.logTitle}>事件记录</div>
          <div className={styles.eventLog}>
            {eventLog.slice(-10).map((entry, idx) => (
              <div
                key={idx}
                className={`${styles.logEntry} ${entry.success ? styles.success : styles.failure}`}
              >
                <div className={styles.logMessage}>{entry.message}</div>
                {(entry.reward.spiritStone > 0 || entry.reward.herb > 0 || entry.reward.ore > 0 || entry.reward.fairyJade > 0) && (
                  <div className={styles.logReward}>
                    {entry.reward.spiritStone > 0 && `灵石+${entry.reward.spiritStone} `}
                    {entry.reward.herb > 0 && `灵草+${entry.reward.herb} `}
                    {entry.reward.ore > 0 && `矿石+${entry.reward.ore} `}
                    {entry.reward.fairyJade > 0 && `仙玉+${entry.reward.fairyJade}`}
                  </div>
                )}
                {entry.hpChange !== 0 && (
                  <div className={`${styles.logHpChange} ${entry.hpChange > 0 ? styles.heal : styles.damage}`}>
                    {entry.hpChange > 0 ? `恢复 ${entry.hpChange} 生命` : `损失 ${Math.abs(entry.hpChange)} 生命`}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Running rewards */}
      {!runComplete && (
        <div className={styles.rewardsPanel}>
          <div className={styles.rewardsLabel}>本次收益</div>
          <div className={styles.rewardsGrid}>
            <span>灵石 {totalReward.spiritStone}</span>
            <span>灵草 {totalReward.herb}</span>
            <span>矿石 {totalReward.ore}</span>
            <span>仙玉 {totalReward.fairyJade}</span>
          </div>
        </div>
      )}
    </>
  )
}

function RunResult({
  victory,
  reward,
  onEnd,
}: {
  victory: boolean
  reward: { spiritStone: number; herb: number; ore: number; fairyJade: number }
  onEnd: () => void
}) {
  return (
    <div className={styles.runComplete}>
      <div className={`${styles.runResultTitle} ${victory ? styles.victory : styles.defeat}`}>
        {victory ? '通关成功！' : '探索结束'}
      </div>
      <div className={styles.runRewardSummary}>
        <span>灵石 +{reward.spiritStone}</span>
        <span>灵草 +{reward.herb}</span>
        <span>矿石 +{reward.ore}</span>
        <span>仙玉 +{reward.fairyJade}</span>
      </div>
      <button
        className={`${styles.controlBtn} ${styles.primary}`}
        style={{ width: '100%' }}
        onClick={onEnd}
      >
        返回
      </button>
    </div>
  )
}
