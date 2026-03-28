import { useState, useMemo } from 'react'
import { useAdventureStore, isDungeonUnlocked } from '../stores/adventureStore'
import { useSectStore } from '../stores/sectStore'
import { DUNGEONS } from '../data/events'
import { DISPATCH_MISSIONS } from '../data/missions'
import { emitEvent } from '../stores/eventLogStore'
import { getRealmName } from '../data/realms'
import { QUALITY_NAMES as CHAR_QUALITY_NAMES } from '../components/common/CharacterCard'
import ProgressBar from '../components/common/ProgressBar'
import type { CharacterQuality } from '../types/character'
import type { DungeonRun } from '../types'
import type { TacticPreset } from '../types/runBuild'
import TacticPresetPicker from '../components/adventure/TacticPresetPicker'
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

  // Dispatch state
  const dispatches = useAdventureStore((s) => s.dispatches)
  const getActiveDispatchCount = useAdventureStore((s) => s.getActiveDispatchCount)

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
      (c) => c.status === 'idle' || c.status === 'resting'
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

      {/* Dispatch Section */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>任务派遣 ({getActiveDispatchCount()}/5)</div>
        {dispatches.length === 0 ? (
          <div className={styles.empty}>暂无派遣任务，可在弟子详情中派遣弟子</div>
        ) : (
          <div className={styles.runList}>
            {dispatches.map((dispatch) => {
              const mission = DISPATCH_MISSIONS.find(m => m.id === dispatch.missionId)
              const char = sect.characters.find(c => c.id === dispatch.characterId)
              const remaining = Math.max(0, dispatch.duration - dispatch.progress)
              const minutes = Math.floor(remaining / 60)
              const seconds = Math.floor(remaining % 60)
              return (
                <div key={dispatch.characterId} className={styles.runCard}>
                  <div className={styles.runHeader}>
                    <span className={styles.runDungeonName}>{mission?.name ?? '未知任务'}</span>
                    <span className={styles.runFloor}>
                      {char?.name ?? ''} {remaining > 0 ? `· ${minutes}:${seconds.toString().padStart(2, '0')}` : '· 完成'}
                    </span>
                  </div>
                  <div className={styles.runProgress}>
                    <ProgressBar value={dispatch.progress} max={dispatch.duration} variant="ink" />
                  </div>
                </div>
              )
            })}
          </div>
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
  const [tacticPreset, setTacticPreset] = useState<TacticPreset>('balanced')
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
    const run = startRun(dungeonId, selectedIds, undefined, tacticPreset)
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

        {/* Tactic preset */}
        {selectedIds.length > 0 && (
          <TacticPresetPicker value={tacticPreset} onChange={setTacticPreset} />
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
  const buyFromShop = useAdventureStore((s) => s.buyFromShop)
  const closeShop = useAdventureStore((s) => s.closeShop)
  const attemptPetCapture = useAdventureStore((s) => s.attemptPetCapture)
  const dungeons = useAdventureStore((s) => s.dungeons)
  const sect = useSectStore((s) => s.sect)

  const [showPetCapture, setShowPetCapture] = useState(false)

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

      {/* Shop panel */}
      {run.pendingShopOffers && run.pendingShopOffers.length > 0 && (
        <div className={styles.shopPanel}>
          <div className={styles.shopTitle}>游商</div>
          {run.pendingShopOffers.map((offer, i) => (
            <div key={i} className={styles.shopItem}>
              <div className={styles.shopItemInfo}>
                <span className={styles.shopItemName}>{offer.name}</span>
                <span className={styles.shopItemDesc}>{offer.description}</span>
              </div>
              <button
                className={`${styles.shopBuyBtn} ${run.totalRewards.spiritStone < offer.cost ? styles.btnDisabled : ''}`}
                disabled={run.totalRewards.spiritStone < offer.cost}
                onClick={() => buyFromShop(run.id, i)}
              >
                {offer.cost} 灵石
              </button>
            </div>
          ))}
          <button className={styles.cancelBtn} onClick={() => closeShop(run.id)}>
            离开
          </button>
        </div>
      )}

      {/* Pet capture prompt */}
      {showPetCapture && (() => {
        const firstAliveCharId = run.teamCharacterIds.find(
          (cid) => run.memberStates[cid]?.status !== 'dead'
        )
        const char = firstAliveCharId ? sect.characters.find(c => c.id === firstAliveCharId) : null
        const fortune = char?.cultivationStats.fortune ?? 0
        const captureRate = Math.round((0.30 + fortune * 0.02) * 100)
        return (
          <div className={styles.petCapturePanel}>
            <div className={styles.petCaptureTitle}>发现可捕获灵兽！</div>
            <div className={styles.petCaptureRate}>捕获率: {captureRate}%</div>
            <div className={styles.petCaptureActions}>
              <button
                className={styles.actionBtn}
                onClick={() => {
                  const success = attemptPetCapture(run.id)
                  setShowPetCapture(false)
                  if (success) {
                    emitEvent('pet_capture', '成功捕获了一只灵兽')
                  }
                }}
              >
                尝试捕获
              </button>
              <button className={styles.cancelBtn} onClick={() => setShowPetCapture(false)}>
                放弃
              </button>
            </div>
          </div>
        )
      })()}

      {/* Check last log for pet capture trigger */}
      {!showPetCapture && recentLogs.length > 0 && recentLogs[recentLogs.length - 1].message.includes('可捕获灵兽') && (
        <button className={styles.actionBtn} onClick={() => setShowPetCapture(true)} style={{ width: '100%', marginTop: 'var(--space-xs)' }}>
          捕获灵兽
        </button>
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
