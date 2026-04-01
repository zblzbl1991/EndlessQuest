import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdventureStore, isDungeonUnlocked } from '../stores/adventureStore'
import { useSectStore } from '../stores/sectStore'
import { getRealmName } from '../data/realms'
import { getDiscipleMutationDef } from '../data/discipleMutations'
import { getRunIntentDef } from '../data/runIntents'
import type { CharacterQuality } from '../types/character'
import type { AdventureReport, AdventureReportSummary } from '../types'
import type { AutomationStrategy, TacticalPreset } from '../types/adventure'
import { PixelIcon } from '../components/common/PixelIcon'
import RunBuildSummary from '../components/adventure/RunBuildSummary'
import TacticPresetPicker from '../components/adventure/TacticPresetPicker'
import styles from './AdventurePage.module.css'

const RESULT_LABELS = {
  completed: '閫氬叧',
  retreated: '鎾ら€€',
  failed: '澶辫触',
} as const

const RUN_INTENT_IDS: AutomationStrategy[] = ['steady', 'combat', 'profit']

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

function extractRouteDirections(detail: AdventureReport | undefined): string[] {
  if (!detail) return []

  const labels: string[] = []
  for (const step of detail.steps) {
    if (step.type !== 'route_selected' && step.type !== 'route_considered') continue
    const text = `${step.summary} ${step.detail}`
    if (text.includes('stable route') || text.includes('stable')) labels.push('stable')
    else if (text.includes('combat route') || text.includes('combat')) labels.push('combat')
    else if (text.includes('profit route') || text.includes('profit')) labels.push('profit')
    else if (text.includes('mutation route') || text.includes('mutation')) labels.push('mutation')
  }

  return [...new Set(labels)]
}

function getReportInsight(
  report: AdventureReportSummary | undefined,
  detail: AdventureReport | undefined,
  characterNameMap: Map<string, string>
) {
  if (!report) return null

  const source = detail ?? null
  const teamIds = report.teamCharacterIds
  const aliveMembers = teamIds
    .map((id) => {
      const state = source?.finalMemberStates[id]
      if (!state) return null
      return {
        id,
        name: characterNameMap.get(id) ?? id,
        ratio: state.maxHp > 0 ? state.currentHp / state.maxHp : 0,
        state,
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)

  const coreMember =
    aliveMembers.sort((a, b) => {
      if (b.ratio !== a.ratio) return b.ratio - a.ratio
      return b.state.currentHp - a.state.currentHp
    })[0] ?? null

  const lastBlessing = [...(source?.steps ?? [])].reverse().find((step) => step.type === 'blessing_decision')
  const lastRelic = [...(source?.steps ?? [])].reverse().find((step) => step.type === 'auto_choice_made')
  const turningPoint = [...(source?.steps ?? [])]
    .reverse()
    .find((step) => ['member_state_changed', 'run_retreated', 'run_failed', 'run_completed'].includes(step.type))

  const mutationHighlights = source
    ? Object.entries(source.discipleMutations)
        .flatMap(([charId, mutationIds]) => {
          const discipleName = characterNameMap.get(charId) ?? charId
          return mutationIds.map((mutationId) => `${discipleName} · ${getDiscipleMutationDef(mutationId).name}`)
        })
        .slice(0, 2)
    : []

  return {
    coreName: coreMember?.name ?? '鏆傛棤',
    keyBuild: [lastBlessing?.summary, lastRelic?.summary].filter(Boolean).join(' / ') || '鏆傛棤鍏抽敭 build',
    turningPoint: turningPoint?.summary ?? (report.result === 'completed' ? '绋冲畾鎺ㄨ繘鍒扮粓灞€' : '鏆傛棤'),
    mutationHighlights,
  }
}

export default function AdventurePage() {
  const [buildingTeam, setBuildingTeam] = useState<string | null>(null)
  const dungeons = useAdventureStore((s) => s.dungeons)
  const reports = useAdventureStore((s) => s.reports)
  const completedDungeons = useAdventureStore((s) => s.completedDungeons)
  const dispatches = useAdventureStore((s) => s.dispatches)
  const reportDetails = useAdventureStore((s) => s.reportDetails)
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
        <h1 className={styles.pageTitle}>绉樺</h1>
      </div>

      <section className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <PixelIcon name="disciple" size={20} className={styles.summaryIcon} aria-label="鍙嚭鎴樺紵瀛?" />
          <span className={styles.summaryLabel}>鍙嚭鎴樺紵瀛?</span>
          <span className={styles.summaryValue}>{availableCharacters.length}</span>
        </div>
        <div className={styles.summaryCard}>
          <PixelIcon name="eventCombat" size={20} className={styles.summaryIcon} aria-label="鏈€杩戞垬鎶?" />
          <span className={styles.summaryLabel}>鏈€杩戞垬鎶?</span>
          <span className={styles.summaryValue}>{reports.length}</span>
        </div>
        <div className={styles.summaryCard}>
          <PixelIcon name="dungeonTribulation" size={20} className={styles.summaryIcon} aria-label="宸茬暀鍚嶇澧?" />
          <span className={styles.summaryLabel}>宸茬暀鍚嶇澧?</span>
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
        <div className={styles.sectionTitle}>鏈€杩戞帰绱㈣褰?</div>
        {reports.length === 0 ? (
          <div className={styles.empty}>杩樻病鏈夋帰绱㈡垬鎶ワ紝鎸戦€変竴澶勭澧冨紑濮嬬涓€娆℃墭绠″惂銆?</div>
        ) : (
          <div className={styles.reportList}>
            {reports.map((report) => {
              const dungeon = dungeons.find((item) => item.id === report.dungeonId)
              const detail = reportDetails[report.id]
              const insight = getReportInsight(report, detail, characterNameMap)
              const teamNames = report.teamCharacterIds.map((id) => characterNameMap.get(id) ?? id).join('銆?')
              const rewardBits = [
                report.rewards.spiritStone > 0 ? `${report.rewards.spiritStone} 鐏电煶` : null,
                report.rewards.herb > 0 ? `${report.rewards.herb} 鐏佃崏` : null,
                report.rewards.ore > 0 ? `${report.rewards.ore} 鐏电熆` : null,
                report.itemRewardCount > 0 ? `${report.itemRewardCount} 浠剁墿鍝?` : null,
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
                      <div className={styles.reportMeta}>闃熶紞锛?{teamNames}</div>
                    </div>
                    <div className={styles.reportBadges}>
                      <span className={styles.reportBadge}>{getRunIntentDef(report.strategy).label}</span>
                      <span className={`${styles.reportBadge} ${styles[`result${report.result}`] ?? ''}`}>
                        {RESULT_LABELS[report.result]}
                      </span>
                    </div>
                  </div>

                  <div className={styles.reportStats}>
                    <span>鎴樻湳锛?{report.tacticalPreset}</span>
                    <span>鎺ㄨ繘鑷崇 {report.floorsCleared} 灞?</span>
                  </div>

                  <div className={styles.reportRewardLine}>
                    <span className={styles.rewardLabel}>鏈鎵€寰?</span>
                    <span className={styles.rewardValues}>
                      {rewardBits.length > 0 ? rewardBits.join(' 路 ') : '鏆傛棤鏀惰幏'}
                    </span>
                  </div>

                  <div className={styles.reportStats}>
                    <span>鏍稿績寮熷瓙锛?{insight?.coreName ?? '鏆傛棤'}</span>
                    <span>鍏抽敭 build锛?{insight?.keyBuild ?? '鏆傛棤鍏抽敭 build'}</span>
                  </div>

                  <div className={styles.reportRewardLine}>
                    <span className={styles.rewardLabel}>杞姌鐐?</span>
                    <span className={styles.rewardValues}>{insight?.turningPoint ?? '鏆傛棤'}</span>
                  </div>

                  <div className={styles.reportRewardLine}>
                    <span className={styles.rewardLabel}>寮傚彉</span>
                    <span className={styles.rewardValues}>
                      {insight?.mutationHighlights?.length ? insight.mutationHighlights.join(' · ') : '鏆傛棤寮傚彉'}
                    </span>
                  </div>

                  <RunBuildSummary
                    tacticalPreset={report.tacticalPreset}
                    blessings={[]}
                    relics={[]}
                    branchTags={[]}
                    routeDirections={extractRouteDirections(detail)}
                  />

                  <Link className={styles.detailLink} to={`/adventure/report/${report.id}`}>
                    鏌ョ湅杩囩▼
                  </Link>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>浠诲姟娲鹃仯</div>
        {dispatches.length === 0 ? (
          <div className={styles.empty}>鏆傛棤娲鹃仯浠诲姟锛屽彲鍦ㄥ紵瀛愯鎯呬腑瀹夋帓娲鹃仯銆?</div>
        ) : (
          <div className={styles.dispatchList}>
            {dispatches.map((dispatch) => {
              const character = sect.characters.find((char) => char.id === dispatch.characterId)
              const remaining = Math.max(0, dispatch.duration - dispatch.progress)
              return (
                <div key={dispatch.characterId} className={styles.dispatchCard}>
                  <span className={styles.dispatchName}>
                    <PixelIcon name="dispatch" size={18} className={styles.inlineIcon} aria-label="娲鹃仯浠诲姟" />
                    {character?.name ?? dispatch.characterId}
                  </span>
                  <span>{Math.ceil(remaining)} 绉掑悗瀹屾垚</span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>绉樺鍒楄〃</div>
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
                    {unlocked ? (cleared ? '宸茬暀鍚?' : '鍙帰绱?') : `${unlockRealmName}瑙ｉ攣`}
                  </span>
                </div>
                <div className={styles.dungeonInfo}>
                  <span>灞傛暟锛?{dungeon.totalLayers}</span>
                  <span>鎺ㄨ崘锛?{unlockRealmName}</span>
                </div>
                <div className={styles.dungeonHint}>
                  {unlocked
                    ? '寮€濮嬪悗浼氭寜鎵樼绛栫暐鍗虫椂瀹屾牳鏁存鎺㈢储銆?'
                    : '褰撳墠澧冪晫灏氫笉瓒充互韪忓叆姝ゅ湴銆?'}
                </div>
                <button
                  className={`${styles.startBtn} ${launchDisabled ? styles.btnDisabled : ''}`}
                  disabled={launchDisabled}
                  onClick={() => setBuildingTeam(dungeon.id)}
                >
                  寮€濮嬫帰绱?
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

    if (report) onClose()
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.teamBuilder}>
        <div className={styles.teamBuilderHeader}>
          <span className={styles.teamBuilderTitle}>閰嶇疆鎵樼闃熶紞</span>
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
                <span className={styles.teamCharCheck}>{selected ? '鉁?' : ''}</span>
                <span className={styles.teamCharInfo}>
                  <span className={styles.teamCharName}>{char.name}</span>
                  <span className={styles.teamCharRealm}>{getRealmName(char.realm, char.realmStage)}</span>
                </span>
              </button>
            )
          })}
        </div>

        <div className={styles.strategyPanel}>
          <div className={styles.strategyTitle}>鎵樼绛栫暐</div>
          <div className={styles.strategyOptions}>
            {RUN_INTENT_IDS.map((option) => (
              <button
                key={option}
                type="button"
                className={`${styles.strategyOption} ${strategy === option ? styles.strategyOptionActive : ''}`}
                onClick={() => setStrategy(option)}
              >
                {getRunIntentDef(option).label}
              </button>
            ))}
          </div>
        </div>

        <TacticPresetPicker value={preset} onChange={setPreset} />

        <div className={styles.teamBuilderHint}>
          鎵樼浼氬嵆鏃剁粨绠楁暣娆＄澧冿紝骞朵繚鐣欏畬鏁存垬鎶ヤ緵浣犲鐩樸€?
        </div>

        <div className={styles.teamActions}>
          <button className={styles.cancelBtn} onClick={onClose}>
            鍙栨秷
          </button>
          <button
            className={`${styles.confirmBtn} ${selectedIds.length === 0 ? styles.btnDisabled : ''}`}
            disabled={selectedIds.length === 0}
            onClick={handleConfirm}
          >
            纭鍑哄彂
          </button>
        </div>
      </div>
    </div>
  )
}
