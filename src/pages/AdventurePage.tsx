import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdventureStore, isDungeonUnlocked } from '../stores/adventureStore'
import { useSectStore } from '../stores/sectStore'
import { getRealmName } from '../data/realms'
import type { CharacterQuality } from '../types/character'
import type { AutomationStrategy, TacticalPreset } from '../types/adventure'
import { PixelIcon } from '../components/common/PixelIcon'
import TacticPresetPicker from '../components/adventure/TacticPresetPicker'
import styles from './AdventurePage.module.css'

const STRATEGY_LABELS: Record<AutomationStrategy, string> = {
  steady: '稳健',
  combat: '战斗',
  profit: '收益',
}

const RESULT_LABELS = {
  completed: '通关',
  retreated: '撤退',
  failed: '失败',
} as const

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

export default function AdventurePage() {
  const [buildingTeam, setBuildingTeam] = useState<string | null>(null)

  const dungeons = useAdventureStore((s) => s.dungeons)
  const reports = useAdventureStore((s) => s.reports)
  const completedDungeons = useAdventureStore((s) => s.completedDungeons)
  const dispatches = useAdventureStore((s) => s.dispatches)
  const sect = useSectStore((s) => s.sect)

  const maxRealmChar = useMemo(() => {
    if (sect.characters.length === 0) return null
    return sect.characters.reduce((best, char) =>
      char.realm > best.realm || (char.realm === best.realm && char.realmStage > best.realmStage) ? char : best
    )
  }, [sect.characters])

  const availableCharacters = useMemo(
    () => sect.characters.filter((char) => char.status === 'idle' || char.status === 'resting'),
    [sect.characters]
  )
  const playerRealm = maxRealmChar?.realm ?? 0
  const playerStage = maxRealmChar?.realmStage ?? 0
  const characterNameMap = useMemo(
    () => new Map(sect.characters.map((char) => [char.id, char.name])),
    [sect.characters]
  )

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>秘境</h1>
      </div>

      <section className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <PixelIcon name="disciple" size={20} className={styles.summaryIcon} aria-label="可出战弟子" />
          <span className={styles.summaryLabel}>可出战弟子</span>
          <span className={styles.summaryValue}>{availableCharacters.length}</span>
        </div>
        <div className={styles.summaryCard}>
          <PixelIcon name="eventCombat" size={20} className={styles.summaryIcon} aria-label="最近战报" />
          <span className={styles.summaryLabel}>最近战报</span>
          <span className={styles.summaryValue}>{reports.length}</span>
        </div>
        <div className={styles.summaryCard}>
          <PixelIcon name="dungeonTribulation" size={20} className={styles.summaryIcon} aria-label="已留名秘境" />
          <span className={styles.summaryLabel}>已留名秘境</span>
          <span className={styles.summaryValue}>{completedDungeons.length}</span>
        </div>
      </section>

      {buildingTeam && (
        <TeamBuilder
          dungeonId={buildingTeam}
          availableCharacters={availableCharacters}
          onClose={() => setBuildingTeam(null)}
        />
      )}

      <section className={styles.section}>
        <div className={styles.sectionTitle}>最近探索记录</div>
        {reports.length === 0 ? (
          <div className={styles.empty}>还没有探索战报，挑选一处秘境开始第一次托管吧。</div>
        ) : (
          <div className={styles.reportList}>
            {reports.map((report) => {
              const dungeon = dungeons.find((item) => item.id === report.dungeonId)
              const teamNames = report.teamCharacterIds.map((id) => characterNameMap.get(id) ?? id).join('、')
              const rewardBits = [
                report.rewards.spiritStone > 0 ? `${report.rewards.spiritStone} 灵石` : null,
                report.rewards.herb > 0 ? `${report.rewards.herb} 灵草` : null,
                report.rewards.ore > 0 ? `${report.rewards.ore} 灵矿` : null,
                report.itemRewardCount > 0 ? `${report.itemRewardCount} 件物品` : null,
              ].filter(Boolean)

              return (
                <article key={report.id} className={styles.reportCard}>
                  <div className={styles.reportHeader}>
                    <div className={styles.reportTitleGroup}>
                      <div className={styles.reportName}>
                        <PixelIcon
                          name={getDungeonIconName(report.dungeonId)}
                          size={18}
                          className={styles.inlineIcon}
                          aria-label={dungeon?.name ?? report.dungeonId}
                        />
                        {dungeon?.name ?? report.dungeonId}
                      </div>
                      <div className={styles.reportMeta}>队伍：{teamNames}</div>
                    </div>
                    <div className={styles.reportBadges}>
                      <span className={styles.reportBadge}>{STRATEGY_LABELS[report.strategy]}</span>
                      <span className={`${styles.reportBadge} ${styles[`result${report.result}`] ?? ''}`}>
                        {RESULT_LABELS[report.result]}
                      </span>
                    </div>
                  </div>

                  <div className={styles.reportStats}>
                    <span>战术：{report.tacticalPreset}</span>
                    <span>推进至第 {report.floorsCleared} 层</span>
                  </div>

                  <div className={styles.reportRewardLine}>
                    <span className={styles.rewardLabel}>本次所得</span>
                    <span className={styles.rewardValues}>
                      {rewardBits.length > 0 ? rewardBits.join(' · ') : '暂无收获'}
                    </span>
                  </div>

                  <Link className={styles.detailLink} to={`/adventure/report/${report.id}`}>
                    查看过程
                  </Link>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>任务派遣</div>
        {dispatches.length === 0 ? (
          <div className={styles.empty}>暂无派遣任务，可在弟子详情中安排派遣。</div>
        ) : (
          <div className={styles.dispatchList}>
            {dispatches.map((dispatch) => {
              const character = sect.characters.find((char) => char.id === dispatch.characterId)
              const remaining = Math.max(0, dispatch.duration - dispatch.progress)
              return (
                <div key={dispatch.characterId} className={styles.dispatchCard}>
                  <span className={styles.dispatchName}>
                    <PixelIcon name="dispatch" size={18} className={styles.inlineIcon} aria-label="派遣任务" />
                    {character?.name ?? dispatch.characterId}
                  </span>
                  <span>{Math.ceil(remaining)} 秒后完成</span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>秘境列表</div>
        <div className={styles.dungeonList}>
          {dungeons.map((dungeon) => {
            const unlocked = isDungeonUnlocked(dungeon, playerRealm, playerStage)
            const unlockRealmName = getRealmName(dungeon.unlockRealm, dungeon.unlockStage as 0 | 1 | 2 | 3)
            const cleared = completedDungeons.includes(dungeon.id)
            const launchDisabled = !unlocked || availableCharacters.length === 0

            return (
              <div key={dungeon.id} className={`${styles.dungeonCard} ${!unlocked ? styles.dungeonLocked : ''}`}>
                <div className={styles.dungeonHeader}>
                  <span className={styles.dungeonName}>
                    <PixelIcon
                      name={getDungeonIconName(dungeon.id)}
                      size={18}
                      className={styles.inlineIcon}
                      aria-label={dungeon.name}
                    />
                    {dungeon.name}
                  </span>
                  <span className={styles.lockBadge}>
                    {unlocked ? (cleared ? '已留名' : '可探索') : `${unlockRealmName}解锁`}
                  </span>
                </div>
                <div className={styles.dungeonInfo}>
                  <span>层数：{dungeon.totalLayers}</span>
                  <span>推荐：{unlockRealmName}</span>
                </div>
                <div className={styles.dungeonHint}>
                  {unlocked ? '开始后会按托管策略即时完成整次探索。' : '当前境界尚不足以踏入此地。'}
                </div>
                <button
                  className={`${styles.startBtn} ${launchDisabled ? styles.btnDisabled : ''}`}
                  disabled={launchDisabled}
                  onClick={() => setBuildingTeam(dungeon.id)}
                >
                  开始探索
                </button>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function TeamBuilder({
  dungeonId,
  availableCharacters,
  onClose,
}: {
  dungeonId: string
  availableCharacters: {
    id: string
    name: string
    quality: CharacterQuality
    realm: number
    realmStage: 0 | 1 | 2 | 3
    baseStats: { hp: number; atk: number; def: number; spd: number }
  }[]
  onClose: () => void
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [preset, setPreset] = useState<TacticalPreset>('balanced')
  const [strategy, setStrategy] = useState<AutomationStrategy>('steady')
  const runAutomation = useAdventureStore((s) => s.runAutomation)
  const dungeon = useAdventureStore((s) => s.dungeons.find((item) => item.id === dungeonId))

  const toggleCharacter = (charId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(charId)) return prev.filter((id) => id !== charId)
      if (prev.length >= 5) return prev
      return [...prev, charId]
    })
  }

  const handleConfirm = () => {
    if (selectedIds.length === 0) return
    const report = runAutomation({
      dungeonId,
      teamCharacterIds: selectedIds,
      supplyLevel: 'basic',
      tacticalPreset: preset,
      automationStrategy: strategy,
    })

    if (report) {
      onClose()
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.teamBuilder}>
        <div className={styles.teamBuilderHeader}>
          <span className={styles.teamBuilderTitle}>配置托管队伍</span>
          <span className={styles.dungeonTarget}>{dungeon?.name ?? dungeonId}</span>
        </div>

        <div className={styles.teamCharList}>
          {availableCharacters.map((char) => {
            const selected = selectedIds.includes(char.id)
            return (
              <button
                key={char.id}
                type="button"
                className={`${styles.teamCharItem} ${selected ? styles.teamCharSelected : ''}`}
                onClick={() => toggleCharacter(char.id)}
              >
                <span className={styles.teamCharCheck}>{selected ? '✓' : ''}</span>
                <span className={styles.teamCharInfo}>
                  <span className={styles.teamCharName}>{char.name}</span>
                  <span className={styles.teamCharRealm}>{getRealmName(char.realm, char.realmStage)}</span>
                </span>
              </button>
            )
          })}
        </div>

        <div className={styles.strategyPanel}>
          <div className={styles.strategyTitle}>托管策略</div>
          <div className={styles.strategyOptions}>
            {(Object.keys(STRATEGY_LABELS) as AutomationStrategy[]).map((option) => (
              <button
                key={option}
                type="button"
                className={`${styles.strategyOption} ${strategy === option ? styles.strategyOptionActive : ''}`}
                onClick={() => setStrategy(option)}
              >
                {STRATEGY_LABELS[option]}
              </button>
            ))}
          </div>
        </div>

        <TacticPresetPicker value={preset} onChange={setPreset} />

        <div className={styles.teamBuilderHint}>托管会即时结算整次秘境，并保留完整战报供你复盘。</div>

        <div className={styles.teamActions}>
          <button className={styles.cancelBtn} onClick={onClose}>
            取消
          </button>
          <button
            className={`${styles.confirmBtn} ${selectedIds.length === 0 ? styles.btnDisabled : ''}`}
            disabled={selectedIds.length === 0}
            onClick={handleConfirm}
          >
            确认出发
          </button>
        </div>
      </div>
    </div>
  )
}
