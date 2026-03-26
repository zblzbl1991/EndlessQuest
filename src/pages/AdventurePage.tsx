import { useState, useMemo } from 'react'
import { useAdventureStore, isDungeonUnlocked } from '../stores/adventureStore'
import { useSectStore } from '../stores/sectStore'
import { DUNGEONS } from '../data/events'
import { getRealmName } from '../data/realms'
import { QUALITY_NAMES as CHAR_QUALITY_NAMES } from '../components/common/CharacterCard'
import ProgressBar from '../components/common/ProgressBar'
import type { CharacterQuality } from '../types/character'
import type { DungeonRun } from '../types'
import styles from './AdventurePage.module.css'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MEMBER_STATUS_LABELS: Record<string, string> = {
  alive: '存活',
  dead: '阵亡',
  wounded: '重伤',
}

const MEMBER_STATUS_CLASS: Record<string, string> = {
  alive: styles.memberAlive,
  dead: styles.memberDead,
  wounded: styles.memberWounded,
}

// ---------------------------------------------------------------------------
// AdventurePage
// ---------------------------------------------------------------------------

export default function AdventurePage() {
  const [buildingTeam, setBuildingTeam] = useState<string | null>(null) // dungeonId

  const dungeons = useAdventureStore((s) => s.dungeons)
  const activeRuns = useAdventureStore((s) => s.activeRuns)
  const sect = useSectStore((s) => s.sect)

  // Patrol state
  const patrolActive = useAdventureStore((s) => s.patrolActive)
  const patrolProgress = useAdventureStore((s) => s.patrolProgress)
  const patrolCountToday = useAdventureStore((s) => s.patrolCountToday)
  const patrolReward = useAdventureStore((s) => s.patrolReward)
  const startPatrol = useAdventureStore((s) => s.startPatrol)
  const collectPatrolReward = useAdventureStore((s) => s.collectPatrolReward)

  // Use the highest realm character for unlock checks
  const maxRealmChar = useMemo(() => {
    if (sect.characters.length === 0) return null
    return sect.characters.reduce((best, c) =>
      c.realm > best.realm || (c.realm === best.realm && c.realmStage > best.realmStage)
        ? c : best
    )
  }, [sect.characters])

  const playerRealm = maxRealmChar?.realm ?? 0
  const playerStage = maxRealmChar?.realmStage ?? 0

  const activeRunList = Object.values(activeRuns)

  // Characters available for team building (cultivating or resting, not adventuring)
  const availableCharacters = useMemo(() => {
    return sect.characters.filter(
      (c) => c.status === 'cultivating' || c.status === 'resting'
    )
  }, [sect.characters])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>秘境</h1>
      </div>

      {/* Team Builder Modal */}
      {buildingTeam && (
        <TeamBuilder
          dungeonId={buildingTeam}
          availableCharacters={availableCharacters}
          onClose={() => setBuildingTeam(null)}
        />
      )}

      {/* Patrol Section */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>外围巡逻</div>
        {!patrolActive && patrolCountToday < 5 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>今日剩余: {5 - patrolCountToday}/5</span>
            <button
              className={styles.startBtn}
              style={{ width: 'auto' }}
              onClick={() => {
                const first = availableCharacters[0]
                if (first) startPatrol(first.id)
              }}
              disabled={availableCharacters.length === 0}
            >
              {availableCharacters.length > 0 ? '开始巡逻' : '无可用弟子'}
            </button>
          </div>
        )}
        {patrolActive && patrolProgress < 60 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ProgressBar value={patrolProgress} max={60} variant="ink" />
            <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>{Math.ceil(60 - patrolProgress)}秒</span>
          </div>
        )}
        {patrolActive && patrolProgress >= 60 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ color: 'var(--color-accent)' }}>巡逻完成！奖励: +{patrolReward} 灵石</span>
            <button className={styles.startBtn} style={{ width: 'auto' }} onClick={collectPatrolReward}>
              领取奖励
            </button>
          </div>
        )}
        {patrolCountToday >= 5 && !patrolActive && (
          <div style={{ color: 'var(--color-text-tertiary)' }}>今日巡逻次数已用完</div>
        )}
      </section>

      {/* Active Runs */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>进行中的冒险</div>
        {activeRunList.length === 0 ? (
          <div className={styles.empty}>暂无进行中的冒险</div>
        ) : (
          <div className={styles.runList}>
            {activeRunList.map((run) => (
              <ActiveRunCard key={run.id} run={run} />
            ))}
          </div>
        )}
      </section>

      {/* Dungeon List */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>秘境列表</div>
        <div className={styles.dungeonList}>
          {dungeons.map((dungeon) => {
            const unlocked = isDungeonUnlocked(dungeon, playerRealm, playerStage)
            const unlockRealmName = getRealmName(dungeon.unlockRealm, dungeon.unlockStage as 0 | 1 | 2 | 3)
            return (
              <div
                key={dungeon.id}
                className={`${styles.dungeonCard} ${!unlocked ? styles.dungeonLocked : ''}`}
              >
                <div className={styles.dungeonHeader}>
                  <span className={styles.dungeonName}>{dungeon.name}</span>
                  {!unlocked && (
                    <span className={styles.lockBadge}>
                      {unlockRealmName}解锁
                    </span>
                  )}
                </div>
                <div className={styles.dungeonInfo}>
                  <span>层数: {dungeon.totalLayers}</span>
                  <span>推荐: {unlockRealmName}</span>
                </div>
                {unlocked && (
                  <button
                    className={styles.startBtn}
                    onClick={() => setBuildingTeam(dungeon.id)}
                  >
                    开始探索
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TeamBuilder
// ---------------------------------------------------------------------------

function TeamBuilder({
  dungeonId,
  availableCharacters,
  onClose,
}: {
  dungeonId: string
  availableCharacters: { id: string; name: string; quality: CharacterQuality; realm: number; realmStage: 0 | 1 | 2 | 3; baseStats: { hp: number; atk: number; def: number; spd: number } }[]
  onClose: () => void
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const startRun = useAdventureStore((s) => s.startRun)

  const dungeon = DUNGEONS.find((d) => d.id === dungeonId)

  const toggleCharacter = (charId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(charId)) {
        return prev.filter((id) => id !== charId)
      }
      if (prev.length >= 5) return prev
      return [...prev, charId]
    })
  }

  const handleConfirm = () => {
    if (selectedIds.length === 0) return
    const run = startRun(dungeonId, selectedIds)
    if (run) {
      onClose()
    }
  }

  // Aggregate stats of selected team
  const teamStats = useMemo(() => {
    const total = { hp: 0, atk: 0, def: 0, spd: 0 }
    for (const char of availableCharacters) {
      if (selectedIds.includes(char.id)) {
        total.hp += char.baseStats.hp
        total.atk += char.baseStats.atk
        total.def += char.baseStats.def
        total.spd += char.baseStats.spd
      }
    }
    return total
  }, [selectedIds, availableCharacters])

  return (
    <div className={styles.overlay}>
      <div className={styles.teamBuilder}>
        <div className={styles.teamBuilderHeader}>
          <span className={styles.teamBuilderTitle}>
            选择队伍 ({selectedIds.length}/5)
          </span>
          <span className={styles.dungeonTarget}>
            {dungeon?.name ?? '未知秘境'}
          </span>
        </div>

        {/* Character list */}
        <div className={styles.teamCharList}>
          {availableCharacters.map((char) => {
            const selected = selectedIds.includes(char.id)
            return (
              <div
                key={char.id}
                className={`${styles.teamCharItem} ${selected ? styles.teamCharSelected : ''}`}
                onClick={() => toggleCharacter(char.id)}
                role="button"
                tabIndex={0}
              >
                <div className={styles.teamCharCheck}>
                  {selected ? '✓' : ''}
                </div>
                <div className={styles.teamCharInfo}>
                  <span className={styles.teamCharName}>
                    {char.name}
                    <span className={styles.teamCharQuality}>
                      {CHAR_QUALITY_NAMES[char.quality]}
                    </span>
                  </span>
                  <span className={styles.teamCharRealm}>
                    {getRealmName(char.realm, char.realmStage)}
                  </span>
                </div>
              </div>
            )
          })}
          {availableCharacters.length === 0 && (
            <div className={styles.empty}>无可用的弟子</div>
          )}
        </div>

        {/* Team stats summary */}
        {selectedIds.length > 0 && (
          <div className={styles.teamStats}>
            <div className={styles.teamStatItem}>
              <span className={styles.teamStatLabel}>总气血</span>
              <span className={styles.teamStatValue}>{teamStats.hp.toLocaleString()}</span>
            </div>
            <div className={styles.teamStatItem}>
              <span className={styles.teamStatLabel}>总攻击</span>
              <span className={styles.teamStatValue}>{teamStats.atk.toLocaleString()}</span>
            </div>
            <div className={styles.teamStatItem}>
              <span className={styles.teamStatLabel}>总防御</span>
              <span className={styles.teamStatValue}>{teamStats.def.toLocaleString()}</span>
            </div>
            <div className={styles.teamStatItem}>
              <span className={styles.teamStatLabel}>总速度</span>
              <span className={styles.teamStatValue}>{teamStats.spd.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className={styles.teamActions}>
          <button className={styles.cancelBtn} onClick={onClose}>
            取消
          </button>
          <button
            className={`${styles.confirmBtn} ${selectedIds.length === 0 ? styles.btnDisabled : ''}`}
            onClick={handleConfirm}
            disabled={selectedIds.length === 0}
          >
            确认出发
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ActiveRunCard
// ---------------------------------------------------------------------------

function ActiveRunCard({ run }: { run: DungeonRun }) {
  const advanceFloor = useAdventureStore((s) => s.advanceFloor)
  const retreat = useAdventureStore((s) => s.retreat)
  const dungeons = useAdventureStore((s) => s.dungeons)
  const sect = useSectStore((s) => s.sect)

  const dungeon = dungeons.find((d) => d.id === run.dungeonId)
  const totalFloors = run.floors.length
  const isCompleted = run.currentFloor > totalFloors

  // Last 5 log entries
  const recentLogs = run.eventLog.slice(-5)

  // Floor timer countdown
  const floorTimer = run.floorTimer ?? 0
  const FLOOR_TICK_SECONDS = 10
  const remainingSec = Math.max(0, Math.ceil(FLOOR_TICK_SECONDS - floorTimer))

  const hasAlive = run.teamCharacterIds.some(
    (cid) => run.memberStates[cid]?.status !== 'dead'
  )

  const handleAdvance = () => {
    advanceFloor(run.id)
  }

  const handleRetreat = () => {
    retreat(run.id)
  }

  return (
    <div className={styles.runCard}>
      <div className={styles.runHeader}>
        <span className={styles.runDungeonName}>{dungeon?.name ?? '未知秘境'}</span>
        <span className={styles.runFloor}>
          {isCompleted
            ? `已通关 (${totalFloors}层)`
            : `第 ${run.currentFloor} / ${totalFloors} 层`
          }
        </span>
      </div>

      {/* Progress bar */}
      <div className={styles.runProgress}>
        <ProgressBar
          value={Math.min(run.currentFloor, totalFloors)}
          max={totalFloors}
          variant="ink"
        />
        {!isCompleted && (
          <span className={styles.floorCountdown}>
            {remainingSec}秒后自动推进
          </span>
        )}
      </div>

      {/* Team members */}
      <div className={styles.runTeam}>
        {run.teamCharacterIds.map((charId) => {
          const memberState = run.memberStates[charId]
          const character = sect.characters.find((c) => c.id === charId)
          if (!memberState || !character) return null

          return (
            <div key={charId} className={styles.memberItem}>
              <span className={styles.memberName}>{character.name}</span>
              <div className={styles.memberHpBar}>
                <ProgressBar
                  value={memberState.currentHp}
                  max={memberState.maxHp}
                  variant="ink"
                  className={MEMBER_STATUS_CLASS[memberState.status] ?? ''}
                />
                <span className={styles.memberHpText}>
                  {Math.floor(memberState.currentHp)} / {Math.floor(memberState.maxHp)}
                </span>
              </div>
              <span className={`${styles.memberStatus} ${MEMBER_STATUS_CLASS[memberState.status]}`}>
                {MEMBER_STATUS_LABELS[memberState.status] ?? memberState.status}
              </span>
            </div>
          )
        })}
      </div>

      {/* Event log */}
      {recentLogs.length > 0 && (
        <div className={styles.runLog}>
          <div className={styles.logTitle}>事件记录</div>
          <div className={styles.logList}>
            {recentLogs.map((entry, idx) => (
              <div key={idx} className={styles.logEntry}>
                {entry.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!isCompleted && (
        <div className={styles.runActions}>
          {hasAlive && (
            <button className={styles.advanceBtn} onClick={handleAdvance}>
              继续
            </button>
          )}
          <button className={styles.retreatBtn} onClick={handleRetreat}>
            撤退
          </button>
        </div>
      )}
    </div>
  )
}
