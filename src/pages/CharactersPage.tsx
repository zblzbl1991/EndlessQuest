import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useSectStore } from '../stores/sectStore'
import { useGameStore } from '../stores/gameStore'
import { getRealmName, getCultivationNeeded } from '../data/realms'
import { getTechniqueById } from '../data/techniquesTable'
import { getActiveSkillById } from '../data/activeSkills'
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
import { getFateGridDef } from '../data/fateGrids'
import { FATE_GRID_RARITY_NAMES, FATE_GRID_CATEGORY_NAMES } from '../types/destiny'
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
type FilterTab = 'all' | 'cultivating' | 'adventuring' | 'training' | 'recovering'

const FILTER_TABS: { key: FilterTab; label: string; icon: string; match: (s: CharacterStatus) => boolean }[] = [
  { key: 'all', label: '全部', icon: 'disciple', match: () => true },
  { key: 'cultivating', label: '修炼中', icon: 'cultivation', match: (s) => s === 'idle' },
  { key: 'adventuring', label: '秘境中', icon: 'adventure', match: (s) => s === 'adventuring' },
  { key: 'training', label: '研习中', icon: 'technique', match: (s) => s === 'training' },
  { key: 'recovering', label: '恢复中', icon: 'recovery', match: (s) => s === 'recovering' },
]

const DETAIL_SECTION_ICONS = {
  base: 'disciple',
  aptitude: 'cultivation',
  cultivation: 'realmGoldenCore',
  adventure: 'adventure',
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
  const dayProgressSec = useGameStore((s) => s.dayProgressSec)

  const filteredCharacters = useMemo(() => {
    const tab = FILTER_TABS.find((t) => t.key === filter)
    if (!tab || tab.key === 'all') return characters
    return characters.filter((c) => tab.match(c.status))
  }, [characters, filter])

  const counts = useMemo(
    () => ({
      idle: characters.filter((character) => character.status === 'idle').length,
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
            detail: `资源可养 ${maxDisciples} 人`,
          },
          { label: '可出战', value: counts.idle, detail: `秘境 ${counts.adventuring}` },
          { label: '恢复中', value: counts.recovering, detail: '按游戏日返场' },
          { label: '下一次结算', value: `${Math.ceil(nextDayCountdown)} 秒`, detail: '每日自动结算一次' },
        ]}
      />

      <div className={styles.overviewLayout}>
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

  const [selectedBackpackIdx, setSelectedBackpackIdx] = useState<number | null>(null)

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
    character.fateGrid ? `命格 ${getFateGridDef(character.fateGrid).name}` : '命格基础',
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

          {character.fateGrid &&
            (() => {
              const fateDef = getFateGridDef(character.fateGrid!)
              return (
                <FoldSection
                  icon="cultivation"
                  title="命格"
                  summary={`${fateDef.name} · ${FATE_GRID_RARITY_NAMES[fateDef.rarity]}`}
                >
                  <div className={styles.statsGrid}>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>名称</span>
                      <span className={styles.statValue}>{fateDef.name}</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>类别</span>
                      <span className={styles.statValue}>{FATE_GRID_CATEGORY_NAMES[fateDef.category]}</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>稀有度</span>
                      <span className={styles.statValue}>{FATE_GRID_RARITY_NAMES[fateDef.rarity]}</span>
                    </div>
                  </div>
                  <div className={styles.foldEventNote}>{fateDef.description}</div>
                </FoldSection>
              )
            })()}

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
    </div>
  )
}
