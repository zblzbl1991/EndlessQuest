import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useSectStore } from '../stores/sectStore'
import { useAdventureStore } from '../stores/adventureStore'
import { useGameStore } from '../stores/gameStore'
import { getRealmName, getCultivationNeeded } from '../data/realms'
import { getTechniqueById } from '../data/techniquesTable'
import { getAvailableMissions, DISPATCH_MISSIONS } from '../data/missions'
import { getActiveSkillById } from '../data/activeSkills'
import { getFateTagDef } from '../data/fateTags'
import { calcEffectiveCultivationRate } from '../systems/cultivation/CultivationDisplay'
import { getPathDef } from '../data/cultivationPaths'
import { getPrimaryRole, getRoleLabel } from '../systems/character/SpecialtySystem'
import { TECHNIQUE_TIER_NAMES } from '../types/technique'
import type { CharacterStatus } from '../types/character'
import { CHAR_QUALITY_SHORT } from '../data/uiCopy'
import { calcMaxDisciplesByResources } from '../systems/sect/SectEngine'
import { PixelIcon } from '../components/common/PixelIcon'
import CharacterCard from '../components/common/CharacterCard'
import PageHeader from '../components/common/PageHeader'
import StatusBadge from '../components/common/StatusBadge'
import ProgressBar from '../components/common/ProgressBar'
import BreakthroughPanel from '../components/cultivation/BreakthroughPanel'
import EquipPanel from '../components/inventory/EquipPanel'
import ItemCard from '../components/inventory/ItemCard'
import { formatCultivationValue } from '../utils/format'
import {
  buildCharacterSkillLoadout,
  getCombatStyleProfile,
  MAX_CHARACTER_SKILL_SLOTS,
  syncCharacterSkillLoadout,
} from '../data/activeSkills'
import { getSeedDef } from '../data/destinySeeds'
import { getAmplifierProfile } from '../data/destinyAmplifiers'
import { DESTINY_STAGE_NAMES, DESTINY_RISK_NAMES } from '../types/destiny'
import styles from './CharactersPage.module.css'

const TITLE_NAMES: Record<string, string> = {
  disciple: '弟子',
  seniorDisciple: '内门弟子',
  master: '长老',
  elder: '掌门',
}

const STAT_LABELS: Record<string, string> = {
  hp: '气血',
  atk: '攻击',
  def: '防御',
  spd: '速度',
  crit: '暴击',
  critDmg: '暴伤',
  cultivationRate: '修炼速度',
}

const TECHNIQUE_TIER_CLASS: Record<string, string> = {
  mortal: styles.tierMortal,
  spirit: styles.tierSpirit,
  immortal: styles.tierImmortal,
  divine: styles.tierDivine,
  chaos: styles.tierChaos,
}

type ViewMode = 'list' | 'grid'
type FilterTab = 'all' | 'cultivating' | 'dispatching' | 'adventuring' | 'training' | 'recovering'

const FILTER_TABS: { key: FilterTab; label: string; icon: string; match: (s: CharacterStatus) => boolean }[] = [
  { key: 'all', label: '全部', icon: 'disciple', match: () => true },
  { key: 'cultivating', label: '修炼中', icon: 'cultivation', match: (s) => s === 'idle' },
  { key: 'dispatching', label: '派遣中', icon: 'dispatch', match: (s) => s === 'patrolling' },
  { key: 'adventuring', label: '秘境中', icon: 'adventure', match: (s) => s === 'adventuring' },
  { key: 'training', label: '研习中', icon: 'technique', match: (s) => s === 'training' },
  { key: 'recovering', label: '恢复中', icon: 'recovery', match: (s) => s === 'recovering' },
]

const DETAIL_SECTION_ICONS = {
  base: 'disciple',
  aptitude: 'cultivation',
  cultivation: 'realmGoldenCore',
  adventure: 'adventure',
  dispatch: 'dispatch',
  technique: 'techniqueScroll',
  equipment: 'typeEquipment',
} as const

function getTechniqueIconName(name: string, element?: string): string {
  if (name.includes('剑')) return 'swordManual'
  if (name.includes('兽')) return 'beastTaming'
  if (element === 'lightning') return 'thunderArt'
  if (name.includes('体') || name.includes('金身')) return 'bodyPath'
  if (name.includes('丹')) return 'alchemyPath'
  return 'techniqueScroll'
}

function getMissionIconName(missionId: string): string {
  switch (missionId) {
    case 'gather_herbs':
      return 'missionHerbs'
    case 'mine_ores':
      return 'missionOres'
    case 'visit_market':
      return 'missionMarket'
    case 'seek_master':
      return 'missionMaster'
    case 'hunt_beasts':
      return 'missionHunt'
    default:
      return 'dispatch'
  }
}

function getSkillIconName(skillId: string): string {
  const skill = getActiveSkillById(skillId)
  if (!skill) return 'technique'
  if (skill.category === 'ultimate') return 'eventBoss'
  if (skill.element === 'lightning') return 'thunderArt'
  if (skill.element === 'fire') return 'spellPath'
  if (skill.element === 'ice') return skill.category === 'attack' ? 'swordManual' : 'spellPath'
  if (skill.element === 'healing') return 'eventRest'
  if (skill.category === 'defense') return 'bodyPath'
  return 'technique'
}

function FoldSection({
  icon,
  title,
  summary,
  children,
  defaultOpen = false,
}: {
  icon: string
  title: string
  summary: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  return (
    <details className={styles.foldSection} open={defaultOpen}>
      <summary className={styles.foldSummary}>
        <span className={styles.foldTitle}>
          <PixelIcon name={icon} size={16} className={styles.inlineIcon} aria-label={title} />
          {title}
        </span>
        <span className={styles.foldMeta}>{summary}</span>
      </summary>
      <div className={styles.foldBody}>{children}</div>
    </details>
  )
}

export default function CharactersPage() {
  const [view, setView] = useState<ViewMode>('grid')
  const [filter, setFilter] = useState<FilterTab>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const characters = useSectStore((s) => s.sect.characters)
  const buildings = useSectStore((s) => s.sect.buildings)
  const activeRoute = useSectStore((s) => s.sect.activeRoute)
  const automationSettings = useSectStore((s) => s.sect.automationSettings)
  const setAutomationSettings = useSectStore((s) => s.setAutomationSettings)
  const dayProgressSec = useGameStore((s) => s.dayProgressSec)

  const filteredCharacters = useMemo(() => {
    const tab = FILTER_TABS.find((t) => t.key === filter)
    if (!tab || tab.key === 'all') return characters
    return characters.filter((c) => tab.match(c.status))
  }, [characters, filter])

  const counts = useMemo(
    () => ({
      idle: characters.filter((character) => character.status === 'idle').length,
      dispatching: characters.filter((character) => character.status === 'patrolling').length,
      adventuring: characters.filter((character) => character.status === 'adventuring').length,
      recovering: characters.filter((character) => character.status === 'recovering').length,
    }),
    [characters]
  )

  const nextDayCountdown = Math.max(0, 60 - dayProgressSec)
  const maxDisciples = useMemo(
    () => calcMaxDisciplesByResources(buildings, characters, activeRoute),
    [buildings, characters, activeRoute]
  )
  const automationSummary = `资源可养 ${maxDisciples} 人，保留 ${automationSettings.reserveSpiritStone} 灵石 / ${automationSettings.reserveSpiritEnergy} 灵气`

  if (selectedId) {
    return (
      <div className={styles.page}>
        <CharacterDetail characterId={selectedId} onBack={() => setSelectedId(null)} />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="弟子"
        testId="characters-hero"
        metrics={[
          {
            label: '弟子池',
            value: `${characters.length}/${maxDisciples}`,
            detail: `${automationSettings.reserveSpiritStone} 灵石 · ${automationSettings.reserveSpiritEnergy} 灵气保底`,
          },
          { label: '可出战', value: counts.idle, detail: `派遣 ${counts.dispatching} · 秘境 ${counts.adventuring}` },
          { label: '恢复中', value: counts.recovering, detail: '按游戏日返场' },
          { label: '下一次结算', value: `${Math.ceil(nextDayCountdown)} 秒`, detail: '每日自动结算一次' },
        ]}
      />

      <div className={styles.overviewLayout}>
        <section className={styles.automationPanel}>
          <div className={styles.automationHeader}>
            <div>
              <h2 className={styles.panelTitle}>宗门自动运转</h2>
              <p className={styles.panelMeta}>{automationSummary}</p>
            </div>
          </div>

          <details className={styles.automationDetails}>
            <summary className={styles.automationSummary}>
              <span>保底与突破</span>
              <span className={styles.automationSummaryMeta}>展开设置</span>
            </summary>

            <div className={styles.settingGrid}>
              <label className={styles.settingField}>
                <span className={styles.settingLabel}>最低保留灵石</span>
                <input
                  className={styles.settingInput}
                  type="number"
                  min={0}
                  value={automationSettings.reserveSpiritStone}
                  onChange={(event) =>
                    setAutomationSettings({ reserveSpiritStone: Math.max(0, Number(event.target.value) || 0) })
                  }
                />
              </label>
              <label className={styles.settingField}>
                <span className={styles.settingLabel}>最低保留灵气</span>
                <input
                  className={styles.settingInput}
                  type="number"
                  min={0}
                  value={automationSettings.reserveSpiritEnergy}
                  onChange={(event) =>
                    setAutomationSettings({ reserveSpiritEnergy: Math.max(0, Number(event.target.value) || 0) })
                  }
                />
              </label>
            </div>

            <div className={styles.settingFooter}>
              <span className={styles.footerLabel}>自动突破</span>
              <div className={styles.togglePair}>
                <button
                  type="button"
                  className={`${styles.toggleBtn} ${automationSettings.autoBreakthrough ? styles.toggleActive : ''}`}
                  onClick={() => setAutomationSettings({ autoBreakthrough: true })}
                >
                  开启
                </button>
                <button
                  type="button"
                  className={`${styles.toggleBtn} ${!automationSettings.autoBreakthrough ? styles.toggleActive : ''}`}
                  onClick={() => setAutomationSettings({ autoBreakthrough: false })}
                >
                  关闭
                </button>
              </div>
            </div>
          </details>
        </section>

        <section className={styles.rosterPanel}>
          <div className={styles.controlsBand}>
            <div className={styles.toolbar}>
              <div className={styles.viewToggle}>
                <button
                  className={`${styles.toggleBtn} ${view === 'list' ? styles.toggleActive : ''}`}
                  onClick={() => setView('list')}
                >
                  列表
                </button>
                <button
                  className={`${styles.toggleBtn} ${view === 'grid' ? styles.toggleActive : ''}`}
                  onClick={() => setView('grid')}
                >
                  网格
                </button>
              </div>
            </div>

            <div className={styles.filterTabs}>
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.key}
                  className={`${styles.filterTab} ${filter === tab.key ? styles.filterActive : ''}`}
                  onClick={() => setFilter(tab.key)}
                >
                  <PixelIcon name={tab.icon} size={18} className={styles.filterIcon} aria-label={tab.label} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className={`${styles.characterGrid} ${view === 'grid' ? styles.gridView : styles.listView}`}>
            {filteredCharacters.map((char) => (
              <CharacterCard key={char.id} character={char} onClick={() => setSelectedId(char.id)} />
            ))}
            {filteredCharacters.length === 0 && <div className={styles.empty}>暂无符合筛选的弟子</div>}
          </div>
        </section>
      </div>
    </div>
  )
}

function CharacterDetail({ characterId, onBack }: { characterId: string; onBack: () => void }) {
  const sect = useSectStore((s) => s.sect)
  const character = useSectStore((s) => s.sect.characters.find((c) => c.id === characterId))
  const equipItem = useSectStore((s) => s.equipItem)
  const transferItemToVault = useSectStore((s) => s.transferItemToVault)
  const sellCharacterItem = useSectStore((s) => s.sellCharacterItem)
  const unassignFromBuilding = useSectStore((s) => s.unassignFromBuilding)
  const dispatches = useAdventureStore((s) => s.dispatches)
  const startDispatch = useAdventureStore((s) => s.startDispatch)
  const getActiveDispatchCount = useAdventureStore((s) => s.getActiveDispatchCount)

  const [selectedBackpackIdx, setSelectedBackpackIdx] = useState<number | null>(null)
  const [showingMissions, setShowingMissions] = useState(false)

  if (!character) return null

  const realmName = getRealmName(character.realm, character.realmStage)
  const needed = getCultivationNeeded(character.realm, character.realmStage)
  const effectiveCultivationSpeed = calcEffectiveCultivationRate(sect, character)
  const primaryRole = getPrimaryRole(character)
  const combatStyle = getCombatStyleProfile(character)
  const recommendedLoadout = buildCharacterSkillLoadout(character)
  const skillFrame = syncCharacterSkillLoadout(character)
  const buildStyle = { label: combatStyle.styleName, description: combatStyle.summary }
  const activeSkillIds = (skillFrame.equippedSkills ?? recommendedLoadout).filter((skillId): skillId is string =>
    Boolean(skillId)
  )
  const activeSkills = activeSkillIds
    .map((skillId) => getActiveSkillById(skillId))
    .filter((skill): skill is NonNullable<typeof skill> => Boolean(skill))
  const buildSourceTags = [
    character.cultivationPath !== 'none'
      ? `修行路线: ${getPathDef(character.cultivationPath)?.name ?? '未定'}`
      : '修行路线: 未定',
    `风格画像: ${combatStyle.styleName}`,
    primaryRole ? `专长: ${getRoleLabel(primaryRole)}` : '专长: 待补强',
    `功法 ${character.learnedTechniques.length} 门`,
    character.fateTags.length > 0 ? `命格 ${character.fateTags.length} 条` : '命格基础',
  ].slice(0, 4)

  function formatBonusValue(type: string, value: number): string {
    if (type === 'crit' || type === 'critDmg' || type === 'cultivationRate') {
      return `+${Math.round(value * 100)}%`
    }
    return `+${value}`
  }

  const handleEquipFromBackpack = (bpIdx: number, slotIdx: number) => {
    equipItem(characterId, bpIdx, slotIdx)
    setSelectedBackpackIdx(null)
  }

  const dispatch = dispatches.find((item) => item.characterId === character.id)
  const activeMission = dispatch ? DISPATCH_MISSIONS.find((mission) => mission.id === dispatch.missionId) : null
  const dispatchRemaining = dispatch ? Math.max(0, dispatch.duration - dispatch.progress) : 0
  const dispatchMinutes = Math.floor(dispatchRemaining / 60)
  const dispatchSeconds = Math.floor(dispatchRemaining % 60)

  return (
    <div className={styles.detail}>
      <button className={styles.backBtn} onClick={onBack}>
        ← 返回
      </button>

      <div className={styles.detailShell}>
        <div className={styles.coreColumn}>
          <div className={styles.detailHeader} data-testid="character-identity">
            <div className={styles.detailNameRow}>
              <span className={styles.detailName}>
                <PixelIcon name="disciple" size={18} className={styles.inlineIcon} aria-label={character.name} />
                {character.name}
              </span>
              <span className={styles.qualityBadge}>{CHAR_QUALITY_SHORT[character.quality]}</span>
            </div>
            <div className={styles.detailSubRow}>
              <span className={styles.detailTitle}>{TITLE_NAMES[character.title]}</span>
              <StatusBadge status={character.status} />
            </div>
            <div className={styles.detailRealm}>{realmName}</div>

            {character.cultivationPath !== 'none' &&
              (() => {
                const pathDef = getPathDef(character.cultivationPath)
                return pathDef ? (
                  <div className={styles.pathRow}>
                    <span className={styles.pathLabel}>修行</span>
                    <span className={styles.pathName}>
                      <PixelIcon
                        name={
                          character.cultivationPath === 'sword'
                            ? 'swordPath'
                            : character.cultivationPath === 'body'
                              ? 'bodyPath'
                              : character.cultivationPath === 'alchemy'
                                ? 'alchemyPath'
                                : character.cultivationPath === 'beast'
                                  ? 'beastPath'
                                  : 'spellPath'
                        }
                        size={16}
                        className={styles.inlineIcon}
                        aria-label={pathDef.name}
                      />
                      {pathDef.name}
                    </span>
                  </div>
                ) : null
              })()}

            {character.specialties.length > 0 && (
              <div className={styles.identityBlock}>
                <span className={styles.pathLabel}>专长</span>
                <div className={styles.identityTags}>
                  {character.specialties.map((specialty, index) => (
                    <span key={`${specialty.type}-${index}`} className={styles.identityTag}>
                      {getRoleLabel(specialty.type)} Lv.{specialty.level}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {primaryRole && <div className={styles.identityMeta}>主定位: {getRoleLabel(primaryRole)}</div>}

            {character.fateTags.length > 0 && (
              <div className={styles.fateTagsList}>
                {character.fateTags.map((tag) => {
                  const def = getFateTagDef(tag)
                  return (
                    <div key={tag} className={styles.fateTag}>
                      <span className={styles.fateTagName}>{def.name}</span>
                    </div>
                  )
                })}
              </div>
            )}

            <div className={styles.detailProgress}>
              <ProgressBar value={character.cultivation} max={needed} variant="ink" />
              <span className={styles.progressText}>
                {formatCultivationValue(character.cultivation)} / {needed.toLocaleString()} (+
                {effectiveCultivationSpeed.toFixed(1)}/s)
              </span>
            </div>
          </div>

          <section className={styles.section}>
            <div className={styles.sectionTitle}>
              <PixelIcon
                name={DETAIL_SECTION_ICONS.cultivation}
                size={16}
                className={styles.inlineIcon}
                aria-label="修炼"
              />
              修炼与突破
            </div>
            <div className={styles.cultivationInfo}>修炼速度 {effectiveCultivationSpeed.toFixed(1)}/s</div>
            <BreakthroughPanel characterId={characterId} />
            <div className={styles.cultivationActions}>
              {character.status === 'idle' && getActiveDispatchCount() < 5 && (
                <button className={styles.actionBtn} onClick={() => setShowingMissions(true)}>
                  派遣
                </button>
              )}
              {character.status === 'training' && character.assignedBuilding && (
                <button className={styles.actionBtn} onClick={() => unassignFromBuilding(character.id)}>
                  撤回指派
                </button>
              )}
            </div>
          </section>

          {character.status === 'adventuring' && (
            <section className={styles.section}>
              <div className={styles.sectionTitle}>
                <PixelIcon
                  name={DETAIL_SECTION_ICONS.adventure}
                  size={16}
                  className={styles.inlineIcon}
                  aria-label="秘境"
                />
                当前状态
              </div>
              <div className={styles.adventureInfo}>正在秘境中探索，结算后会返回宗门。</div>
            </section>
          )}

          {character.status === 'patrolling' && dispatch && (
            <section className={styles.section}>
              <div className={styles.sectionTitle}>
                <PixelIcon
                  name={DETAIL_SECTION_ICONS.dispatch}
                  size={16}
                  className={styles.inlineIcon}
                  aria-label="派遣任务"
                />
                当前派遣
              </div>
              <div className={styles.dispatchInfo}>
                <span className={styles.dispatchName}>
                  <PixelIcon
                    name={getMissionIconName(dispatch.missionId)}
                    size={16}
                    className={styles.inlineIcon}
                    aria-label={activeMission?.name ?? '未知任务'}
                  />
                  {activeMission?.name ?? '未知任务'}
                </span>
                <span>
                  剩余 {dispatchMinutes}:{dispatchSeconds.toString().padStart(2, '0')}
                </span>
              </div>
              <ProgressBar value={dispatch.progress} max={dispatch.duration} variant="ink" />
            </section>
          )}

          <section className={styles.section}>
            <div className={styles.sectionTitle}>
              <PixelIcon
                name={DETAIL_SECTION_ICONS.base}
                size={16}
                className={styles.inlineIcon}
                aria-label="基础属性"
              />
              基础属性
            </div>
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>气血</span>
                <span className={styles.statValue}>{Math.floor(character.baseStats.hp).toLocaleString()}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>攻击</span>
                <span className={styles.statValue}>{Math.floor(character.baseStats.atk).toLocaleString()}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>防御</span>
                <span className={styles.statValue}>{Math.floor(character.baseStats.def).toLocaleString()}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>速度</span>
                <span className={styles.statValue}>{Math.floor(character.baseStats.spd).toLocaleString()}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>暴击</span>
                <span className={styles.statValue}>{Math.round(character.baseStats.crit * 1000) / 10}%</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>暴伤</span>
                <span className={styles.statValue}>{(character.baseStats.critDmg * 100).toFixed(0)}%</span>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionTitle}>
              <PixelIcon
                name={DETAIL_SECTION_ICONS.aptitude}
                size={16}
                className={styles.inlineIcon}
                aria-label="修炼资质"
              />
              修炼资质
            </div>
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>灵根</span>
                <span className={styles.statValue}>{character.cultivationStats.spiritualRoot}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>悟性</span>
                <span className={styles.statValue}>{character.cultivationStats.comprehension}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>机缘</span>
                <span className={styles.statValue}>{character.cultivationStats.fortune}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>灵力</span>
                <span className={styles.statValue}>{Math.floor(character.cultivationStats.spiritPower)}</span>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionTitle}>
              <PixelIcon
                name={DETAIL_SECTION_ICONS.equipment}
                size={16}
                className={styles.inlineIcon}
                aria-label="装备"
              />
              装备
            </div>
            <EquipPanel
              characterId={characterId}
              onItemClick={() => {}}
              onSlotClick={() => {
                const eqItems = character.backpack
                  .map((stack, idx) => ({ item: stack.item, idx }))
                  .filter(({ item }) => item.type === 'equipment')
                if (eqItems.length > 0) {
                  setSelectedBackpackIdx(eqItems[0].idx)
                }
              }}
            />
            {selectedBackpackIdx !== null && character.backpack[selectedBackpackIdx]?.item.type === 'equipment' && (
              <div className={styles.equipFromBackpack}>
                <div className={styles.equipFromLabel}>选择装备槽位</div>
                <div className={styles.equipSlotButtons}>
                  {Array.from({ length: 9 }, (_, i) => (
                    <button
                      key={i}
                      className={styles.equipSlotBtn}
                      onClick={() => handleEquipFromBackpack(selectedBackpackIdx, i)}
                    >
                      {['头冠', '道袍', '护臂', '腰带', '靴子', '武器', '饰品', '饰品', '法宝'][i]}
                    </button>
                  ))}
                </div>
                <button className={styles.cancelBtn} onClick={() => setSelectedBackpackIdx(null)}>
                  取消
                </button>
              </div>
            )}
          </section>
        </div>

        <aside className={styles.supportColumn}>
          <FoldSection
            icon="technique"
            title="战斗画像"
            summary={`${buildStyle.label} · 主动技 ${activeSkills.length}/${MAX_CHARACTER_SKILL_SLOTS}`}
          >
            <div className={styles.buildSummary}>
              <div className={styles.buildStyleCard}>
                <div className={styles.buildStyleHeader}>
                  <span className={styles.buildStyleLabel}>{buildStyle.label}</span>
                  <span className={styles.buildStyleCount}>
                    主动技 {activeSkills.length}/{MAX_CHARACTER_SKILL_SLOTS} · 功法 {character.learnedTechniques.length}{' '}
                    门
                  </span>
                </div>
                <div className={styles.buildStyleDesc}>{buildStyle.description}</div>
              </div>

              <div className={styles.buildSourceCard}>
                <div className={styles.buildSourceTitle}>成型来源</div>
                <div className={styles.buildSourceTags}>
                  {buildSourceTags.map((tag) => (
                    <span key={tag} className={styles.buildSourceTag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className={styles.buildSkillCard}>
                <div className={styles.buildSkillTitle}>当前主动技</div>
                {activeSkills.length > 0 ? (
                  <div className={styles.buildSkillList}>
                    {activeSkills.map((skill) => (
                      <div key={skill.id} className={styles.buildSkillItem}>
                        <span className={styles.buildSkillName}>
                          <PixelIcon
                            name={getSkillIconName(skill.id)}
                            size={14}
                            className={styles.inlineIcon}
                            aria-label={skill.name}
                          />
                          {skill.name}
                        </span>
                        <span className={styles.buildSkillMeta}>
                          {skill.category} · {skill.spiritCost} 灵力 · CD {skill.cooldown}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.noSkillState}>当前没有固定主动技，主要依赖功法、命格与基础面板。</div>
                )}
              </div>
            </div>
          </FoldSection>

          {character.destinyState && (
            <FoldSection
              icon="cultivation"
              title="命运"
              summary={`${DESTINY_STAGE_NAMES[character.destinyState.stage]} · ${DESTINY_RISK_NAMES[character.destinyState.riskLevel]}`}
            >
              <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>命苗</span>
                  <span className={styles.statValue}>{getSeedDef(character.destinyState.seedId).name}</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>阶段</span>
                  <span className={styles.statValue}>{DESTINY_STAGE_NAMES[character.destinyState.stage]}</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>风险</span>
                  <span className={styles.statValue}>{DESTINY_RISK_NAMES[character.destinyState.riskLevel]}</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>曝露</span>
                  <span className={styles.statValue}>{Math.floor(character.destinyState.exposure)}</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>不稳</span>
                  <span className={styles.statValue}>{Math.floor(character.destinyState.instability)}</span>
                </div>
                {character.destinyState.matchedAmplifiers.length > 0 && (
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>契合标签</span>
                    <span className={styles.statValue}>
                      {character.destinyState.matchedAmplifiers.map((aId) => getAmplifierProfile(aId).name).join('、')}
                    </span>
                  </div>
                )}
              </div>
              {character.destinyState.lastMajorEvent && (
                <div className={styles.foldEventNote}>{character.destinyState.lastMajorEvent.summary}</div>
              )}
            </FoldSection>
          )}

          <FoldSection
            icon={DETAIL_SECTION_ICONS.technique}
            title="功法"
            summary={`${character.learnedTechniques.length} 门已掌握`}
          >
            {character.learnedTechniques.length > 0 ? (
              <div className={styles.techniqueList}>
                {character.learnedTechniques.map((techId) => {
                  const tech = getTechniqueById(techId)
                  if (!tech) return null
                  const tierClass = TECHNIQUE_TIER_CLASS[tech.tier] ?? ''
                  return (
                    <div key={techId} className={styles.techniquePanel}>
                      <div className={styles.techniqueName}>
                        <PixelIcon
                          name={getTechniqueIconName(tech.name, tech.element)}
                          size={16}
                          className={styles.inlineIcon}
                          aria-label={tech.name}
                        />
                        {tech.name}
                        <span className={`${styles.techniqueTier} ${tierClass}`}>
                          {TECHNIQUE_TIER_NAMES[tech.tier]}
                        </span>
                      </div>
                      <div className={styles.bonuses}>
                        {tech.bonuses.map((bonus, index) => (
                          <div key={index} className={styles.bonusItem}>
                            <span className={styles.bonusLabel}>{STAT_LABELS[bonus.type] ?? bonus.type}</span>
                            <span className={styles.bonusValue}>{formatBonusValue(bonus.type, bonus.value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className={styles.noTechnique}>尚未领悟功法</div>
            )}
          </FoldSection>

          <FoldSection
            icon="building"
            title="背包"
            summary={`${character.backpack.length}/${character.maxBackpackSlots} 格`}
          >
            <div className={styles.backpackGrid}>
              {character.backpack.map((stack, idx) => (
                <div key={`${stack.item.id}-${idx}`} className={styles.backpackItemWrapper}>
                  <ItemCard
                    item={stack.item}
                    selected={selectedBackpackIdx === idx}
                    onClick={() => setSelectedBackpackIdx(selectedBackpackIdx === idx ? null : idx)}
                  />
                  {stack.quantity > 1 && <span className={styles.quantityBadge}>x{stack.quantity}</span>}
                  {selectedBackpackIdx === idx && (
                    <div className={styles.itemActions}>
                      {stack.item.type === 'equipment' && <span className={styles.itemHint}>点装备空槽即可穿戴</span>}
                      <button
                        className={styles.itemActionBtn}
                        onClick={() => {
                          transferItemToVault(characterId, idx)
                          setSelectedBackpackIdx(null)
                        }}
                      >
                        转入仓库
                      </button>
                      <button
                        className={`${styles.itemActionBtn} ${styles.sellAction}`}
                        onClick={() => {
                          sellCharacterItem(characterId, idx)
                          setSelectedBackpackIdx(null)
                        }}
                      >
                        出售 ({stack.item.sellPrice} 灵石)
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {character.backpack.length === 0 && <div className={styles.empty}>背包为空</div>}
            </div>
          </FoldSection>
        </aside>
      </div>

      {showingMissions && (
        <div className={styles.overlay}>
          <div className={styles.missionPanel}>
            <div className={styles.missionPanelTitle}>选择派遣任务</div>
            <div className={styles.missionList}>
              {getAvailableMissions(character.realm).map((mission) => (
                <div
                  key={mission.id}
                  className={styles.missionCard}
                  onClick={() => {
                    startDispatch(character.id, mission.id)
                    setShowingMissions(false)
                  }}
                >
                  <div className={styles.missionName}>
                    <PixelIcon
                      name={getMissionIconName(mission.id)}
                      size={16}
                      className={styles.inlineIcon}
                      aria-label={mission.name}
                    />
                    {mission.name}
                  </div>
                  <div className={styles.missionMeta}>
                    <span>{Math.floor(mission.duration / 60)} 分钟</span>
                    <span>
                      {mission.rewards
                        .map((reward) => {
                          const typeLabel: Record<string, string> = {
                            spiritStone: '灵石',
                            herb: '灵草',
                            ore: '矿石',
                            consumable: '物品',
                          }
                          return `${typeLabel[reward.type] ?? reward.type} ×${reward.amount}`
                        })
                        .join('，')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <button className={styles.cancelBtn} onClick={() => setShowingMissions(false)}>
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
