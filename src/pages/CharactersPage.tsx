import { useState, useMemo } from 'react'
import { useSectStore } from '../stores/sectStore'
import { useAdventureStore } from '../stores/adventureStore'
import { getRealmName, getCultivationNeeded } from '../data/realms'
import { getTechniqueById } from '../data/techniquesTable'
import { getAvailableMissions, DISPATCH_MISSIONS } from '../data/missions'
import { getActiveSkillById } from '../data/activeSkills'
import { getFateTagDef } from '../data/fateTags'
import { calcEffectiveCultivationRate } from '../systems/cultivation/CultivationDisplay'
import { getPathDef } from '../data/cultivationPaths'
import { getPrimaryRole, getRoleLabel } from '../systems/character/SpecialtySystem'
import { getCharacterDisposition } from '../systems/character/CharacterDispositionSystem'
import { TECHNIQUE_TIER_NAMES } from '../types/technique'
import type { CharacterStatus, CharacterQuality } from '../types/character'
import { PixelIcon } from '../components/common/PixelIcon'
import CharacterCard from '../components/common/CharacterCard'
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
import styles from './CharactersPage.module.css'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TITLE_NAMES: Record<string, string> = {
  disciple: '弟子',
  seniorDisciple: '内门弟子',
  master: '长老',
  elder: '掌门',
}

const QUALITY_NAMES_CHAR: Record<CharacterQuality, string> = {
  common: '凡',
  spirit: '灵',
  immortal: '仙',
  divine: '神',
  chaos: '混沌',
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

// Tier class mapping — must reference styles object directly for CSS Modules hash
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
  { key: 'recovering', label: '恢复中', icon: 'recovery', match: (s) => s === 'resting' || s === 'injured' },
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

// ---------------------------------------------------------------------------
// CharactersPage
// ---------------------------------------------------------------------------

export default function CharactersPage() {
  const [view, setView] = useState<ViewMode>('grid')
  const [filter, setFilter] = useState<FilterTab>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const characters = useSectStore((s) => s.sect.characters)

  const filteredCharacters = useMemo(() => {
    const tab = FILTER_TABS.find((t) => t.key === filter)
    if (!tab || tab.key === 'all') return characters
    return characters.filter((c) => tab.match(c.status))
  }, [characters, filter])
  const flowSummary = useMemo(() => {
    const counts = {
      cultivating: characters.filter((character) => character.status === 'idle').length,
      dispatching: characters.filter((character) => character.status === 'patrolling').length,
      adventuring: characters.filter((character) => character.status === 'adventuring').length,
      recovering: characters.filter((character) => character.status === 'resting' || character.status === 'injured')
        .length,
    }

    return `修炼 ${counts.cultivating} · 派遣 ${counts.dispatching} · 秘境 ${counts.adventuring} · 恢复 ${counts.recovering}`
  }, [characters])

  // Detail view
  if (selectedId) {
    return (
      <div className={styles.page}>
        <CharacterDetail characterId={selectedId} onBack={() => setSelectedId(null)} />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero} data-testid="characters-hero">
        <div className={styles.heroMain}>
          <span className={styles.pageEyebrow}>门中名册</span>
          <h1 className={styles.pageTitle}>门中弟子</h1>
          <p className={styles.pageLead}>先看门中弟子的流转，再决定今天要关注谁、培养谁、派谁出门。</p>
        </div>
        <div className={styles.heroFocusCard}>
          <span className={styles.heroFocusLabel}>当前流转</span>
          <span className={styles.heroFocusValue}>{flowSummary}</span>
          <span className={styles.heroFocusMeta}>
            当前筛选下共有 {filteredCharacters.length} 人，{view === 'grid' ? '按网格' : '按列表'}阅览。
          </span>
        </div>
      </section>

      <section className={styles.controlsBand}>
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
      </section>

      <div className={`${styles.characterGrid} ${view === 'grid' ? styles.gridView : styles.listView}`}>
        {filteredCharacters.map((char) => (
          <CharacterCard key={char.id} character={char} onClick={() => setSelectedId(char.id)} />
        ))}
        {filteredCharacters.length === 0 && <div className={styles.empty}>暂无弟子</div>}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// CharacterDetail
// ---------------------------------------------------------------------------

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

  // Cultivation speed
  const effectiveCultivationSpeed = calcEffectiveCultivationRate(sect, character)
  const primaryRole = getPrimaryRole(character)
  const disposition = getCharacterDisposition(character)
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
    `功法: ${character.learnedTechniques.length} 门`,
    `建议 loadout: ${recommendedLoadout.filter(Boolean).length}/${MAX_CHARACTER_SKILL_SLOTS}`,
    character.fateTags.length > 0 ? `命格: ${character.fateTags.length} 条` : '命格: 基础',
  ]

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

  return (
    <div className={styles.detail}>
      {/* Back button */}
      <button className={styles.backBtn} onClick={onBack}>
        &larr; 返回
      </button>

      {/* Header */}
      <div className={styles.detailHeader} data-testid="character-identity">
        <div className={styles.detailNameRow}>
          <span className={styles.detailName}>
            <PixelIcon name="disciple" size={18} className={styles.inlineIcon} aria-label={character.name} />
            {character.name}
          </span>
          <span className={styles.qualityBadge}>{QUALITY_NAMES_CHAR[character.quality]}</span>
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
                <span className={styles.pathLabel}>修行:</span>
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
                <span className={styles.pathDesc}>{pathDef.description}</span>
              </div>
            ) : null
          })()}
        {character.specialties.length > 0 && (
          <div className={styles.identityBlock}>
            <span className={styles.pathLabel}>专长:</span>
            <div className={styles.identityTags}>
              {character.specialties.map((specialty, index) => (
                <span key={`${specialty.type}-${index}`} className={styles.identityTag}>
                  {getRoleLabel(specialty.type)} Lv.{specialty.level}
                </span>
              ))}
            </div>
          </div>
        )}
        {primaryRole && (
          <div className={styles.identityMeta}>{primaryRole && <span>主定位：{getRoleLabel(primaryRole)}</span>}</div>
        )}
        <div className={styles.readoutGrid}>
          {[disposition.management, disposition.adventure, disposition.risk].map((facet) => (
            <div key={facet.key} className={`${styles.readoutCard} ${styles[`readout${facet.band}`]}`}>
              <span className={styles.readoutLabel}>{facet.title}</span>
              <span className={styles.readoutValue}>{facet.label}</span>
              <span className={styles.readoutDesc}>{facet.description}</span>
            </div>
          ))}
        </div>
        {character.fateTags.length > 0 && (
          <div className={styles.fateTagsList}>
            {character.fateTags.map((tag) => {
              const def = getFateTagDef(tag)
              return (
                <div key={tag} className={styles.fateTag}>
                  <span className={styles.fateTagName}>{def.name}</span>
                  <span className={styles.fateTagDesc}>{def.description}</span>
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

      <div className={styles.groupTitle}>能力与成型</div>

      {/* Base Stats */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>
          <PixelIcon name={DETAIL_SECTION_ICONS.base} size={16} className={styles.inlineIcon} aria-label="基础属性" />
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

      {/* Cultivation Stats */}
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

      <div className={styles.groupTitle}>当前去向</div>

      {/* Cultivation / Breakthrough */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>
          <PixelIcon
            name={DETAIL_SECTION_ICONS.cultivation}
            size={16}
            className={styles.inlineIcon}
            aria-label="修炼"
          />
          修炼
        </div>
        <div className={styles.cultivationInfo}>
          <span>修炼速度: {effectiveCultivationSpeed.toFixed(1)}/s</span>
        </div>
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

      {/* Adventure info */}
      {character.status === 'adventuring' && (
        <section className={styles.section}>
          <div className={styles.sectionTitle}>
            <PixelIcon
              name={DETAIL_SECTION_ICONS.adventure}
              size={16}
              className={styles.inlineIcon}
              aria-label="秘境"
            />
            秘境
          </div>
          <div className={styles.adventureInfo}>正在秘境中探索...</div>
        </section>
      )}

      {/* Dispatch info */}
      {character.status === 'patrolling' &&
        (() => {
          const dispatch = dispatches.find((d) => d.characterId === character.id)
          if (!dispatch) return null
          const mission = DISPATCH_MISSIONS.find((m) => m.id === dispatch.missionId)
          const remaining = Math.max(0, dispatch.duration - dispatch.progress)
          const minutes = Math.floor(remaining / 60)
          const seconds = Math.floor(remaining % 60)
          return (
            <section className={styles.section}>
              <div className={styles.sectionTitle}>
                <PixelIcon
                  name={DETAIL_SECTION_ICONS.dispatch}
                  size={16}
                  className={styles.inlineIcon}
                  aria-label="派遣任务"
                />
                派遣任务
              </div>
              <div className={styles.dispatchInfo}>
                <span className={styles.dispatchName}>
                  <PixelIcon
                    name={getMissionIconName(dispatch.missionId)}
                    size={16}
                    className={styles.inlineIcon}
                    aria-label={mission?.name ?? '未知任务'}
                  />
                  {mission?.name ?? '未知任务'}
                </span>
                <span>
                  剩余: {minutes}:{seconds.toString().padStart(2, '0')}
                </span>
              </div>
              <ProgressBar value={dispatch.progress} max={dispatch.duration} variant="ink" />
            </section>
          )
        })()}

      {/* Mission selection modal */}
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
                  <div className={styles.missionDesc}>{mission.description}</div>
                  <div className={styles.missionMeta}>
                    <span>{Math.floor(mission.duration / 60)}分钟</span>
                    <span>
                      {mission.rewards
                        .map((r) => {
                          const typeLabel: Record<string, string> = {
                            spiritStone: '灵石',
                            herb: '灵药',
                            ore: '矿石',
                            consumable: '物品',
                          }
                          return `${typeLabel[r.type] ?? r.type} ×${r.amount}`
                        })
                        .join(', ')}
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

      {/* Technique */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>
          <PixelIcon name={DETAIL_SECTION_ICONS.technique} size={16} className={styles.inlineIcon} aria-label="功法" />
          功法
        </div>
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
                    <span className={`${styles.techniqueTier} ${tierClass}`}>{TECHNIQUE_TIER_NAMES[tech.tier]}</span>
                  </div>
                  <div className={styles.bonuses}>
                    {tech.bonuses.map((b, i) => (
                      <div key={i} className={styles.bonusItem}>
                        <span className={styles.bonusLabel}>{STAT_LABELS[b.type] ?? b.type}</span>
                        <span className={styles.bonusValue}>{formatBonusValue(b.type, b.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className={styles.noTechnique}>未领悟功法</div>
        )}
      </section>

      <div className={styles.groupTitle}>装备与背包</div>

      {/* Equipment */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>
          <PixelIcon name={DETAIL_SECTION_ICONS.equipment} size={16} className={styles.inlineIcon} aria-label="装备" />
          装备
        </div>
        <EquipPanel
          characterId={characterId}
          onItemClick={() => {}}
          onSlotClick={(_slotIdx) => {
            // If backpack has equipment, offer to equip
            const eqItems = character.backpack
              .map((stack, idx) => ({ item: stack.item, idx }))
              .filter(({ item }) => item.type === 'equipment')
            if (eqItems.length > 0) {
              setSelectedBackpackIdx(eqItems[0].idx)
            }
          }}
        />
        {/* Equip from backpack when a slot is clicked */}
        {selectedBackpackIdx !== null && character.backpack[selectedBackpackIdx]?.item.type === 'equipment' && (
          <div className={styles.equipFromBackpack}>
            <div className={styles.equipFromLabel}>选择装备槽位:</div>
            <div className={styles.equipSlotButtons}>
              {Array.from({ length: 9 }, (_, i) => (
                <button
                  key={i}
                  className={styles.equipSlotBtn}
                  onClick={() => handleEquipFromBackpack(selectedBackpackIdx, i)}
                >
                  {['头冠', '道袍', '护腕', '腰带', '鞋子', '武器', '饰品', '饰品', '法宝'][i]}
                </button>
              ))}
            </div>
            <button className={styles.cancelBtn} onClick={() => setSelectedBackpackIdx(null)}>
              取消
            </button>
          </div>
        )}
      </section>

      {/* Backpack */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>
          <PixelIcon name="building" size={16} className={styles.inlineIcon} aria-label="背包" />
          背包 ({character.backpack.length}/{character.maxBackpackSlots})
        </div>
        <div className={styles.backpackGrid}>
          {character.backpack.map((stack, idx) => (
            <div key={stack.item.id + '-' + idx} className={styles.backpackItemWrapper}>
              <ItemCard
                item={stack.item}
                selected={selectedBackpackIdx === idx}
                onClick={() => setSelectedBackpackIdx(selectedBackpackIdx === idx ? null : idx)}
              />
              {stack.quantity > 1 && <span className={styles.quantityBadge}>x{stack.quantity}</span>}
              {selectedBackpackIdx === idx && (
                <div className={styles.itemActions}>
                  {stack.item.type === 'equipment' && <span className={styles.itemHint}>点击装备栏空槽位穿戴</span>}
                  <button
                    className={styles.itemActionBtn}
                    onClick={() => {
                      transferItemToVault(characterId, idx)
                      setSelectedBackpackIdx(null)
                    }}
                  >
                    转仓库
                  </button>
                  <button
                    className={`${styles.itemActionBtn} ${styles.sellAction}`}
                    onClick={() => {
                      sellCharacterItem(characterId, idx)
                      setSelectedBackpackIdx(null)
                    }}
                  >
                    出售 ({stack.item.sellPrice}灵石)
                  </button>
                </div>
              )}
            </div>
          ))}
          {character.backpack.length === 0 && <div className={styles.empty}>背包为空</div>}
        </div>
      </section>

      {/* Skills */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>
          <PixelIcon name="technique" size={16} className={styles.inlineIcon} aria-label="战斗风格" />
          战斗风格
        </div>
        <div className={styles.buildSummary}>
          <div className={styles.buildStyleCard}>
            <div className={styles.buildStyleHeader}>
              <span className={styles.buildStyleLabel}>{buildStyle.label}</span>
              <span className={styles.buildStyleCount}>
                主动技 {activeSkills.length}/{MAX_CHARACTER_SKILL_SLOTS} · 功法 {character.learnedTechniques.length} 门
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
              <div className={styles.noSkillState}>当前尚未固化主动技，战斗风格将主要由功法、命格与突破结果驱动。</div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
