import { useState, useMemo } from 'react'
import { useSectStore } from '../stores/sectStore'
import { getRealmName, getCultivationNeeded } from '../data/realms'
import { getTechniqueById } from '../data/techniquesTable'
import { TECHNIQUE_TIER_NAMES } from '../types/technique'
import { QUALITY_NAMES } from '../data/items'
import type { CharacterStatus, CharacterQuality } from '../types/character'
import CharacterCard from '../components/common/CharacterCard'
import StatusBadge from '../components/common/StatusBadge'
import ProgressBar from '../components/common/ProgressBar'
import BreakthroughPanel from '../components/cultivation/BreakthroughPanel'
import EquipPanel from '../components/inventory/EquipPanel'
import ItemCard from '../components/inventory/ItemCard'
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
}

type ViewMode = 'list' | 'grid'
type FilterTab = 'all' | 'cultivating' | 'adventuring' | 'resting'

const FILTER_TABS: { key: FilterTab; label: string; match: (s: CharacterStatus) => boolean }[] = [
  { key: 'all', label: '全部', match: () => true },
  { key: 'cultivating', label: '修炼中', match: (s) => s === 'cultivating' || s === 'training' },
  { key: 'adventuring', label: '冒险中', match: (s) => s === 'adventuring' },
  { key: 'resting', label: '休息', match: (s) => s === 'resting' || s === 'idle' || s === 'injured' },
]

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

  // Detail view
  if (selectedId) {
    return (
      <div className={styles.page}>
        <CharacterDetail
          characterId={selectedId}
          onBack={() => setSelectedId(null)}
        />
      </div>
    )
  }

  return (
    <div className={styles.page}>
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
            {tab.label}
          </button>
        ))}
      </div>

      <div className={`${styles.characterGrid} ${view === 'grid' ? styles.gridView : styles.listView}`}>
        {filteredCharacters.map((char) => (
          <CharacterCard
            key={char.id}
            character={char}
            onClick={() => setSelectedId(char.id)}
          />
        ))}
        {filteredCharacters.length === 0 && (
          <div className={styles.empty}>暂无弟子</div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// CharacterDetail
// ---------------------------------------------------------------------------

function CharacterDetail({
  characterId,
  onBack,
}: {
  characterId: string
  onBack: () => void
}) {
  const character = useSectStore((s) => s.sect.characters.find((c) => c.id === characterId))
  const learnTechnique = useSectStore((s) => s.learnTechnique)
  const switchTechnique = useSectStore((s) => s.switchTechnique)
  const equipItem = useSectStore((s) => s.equipItem)
  const transferItemToVault = useSectStore((s) => s.transferItemToVault)
  const sellCharacterItem = useSectStore((s) => s.sellCharacterItem)

  const [showTechniqueSwitch, setShowTechniqueSwitch] = useState(false)
  const [showLearnTechnique, setShowLearnTechnique] = useState(false)
  const [selectedBackpackIdx, setSelectedBackpackIdx] = useState<number | null>(null)

  if (!character) return null

  const realmName = getRealmName(character.realm, character.realmStage)
  const needed = getCultivationNeeded(character.realm, character.realmStage)
  const technique = character.currentTechnique
    ? getTechniqueById(character.currentTechnique)
    : null

  // Technique scrolls in backpack
  const scrollItems = character.backpack
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => item.type === 'techniqueScroll')

  // Learned techniques for switching
  const learnedTechniques = character.learnedTechniques
    .map((id) => getTechniqueById(id))
    .filter(Boolean)

  // Cultivation speed (based on spiritual root)
  const cultivationSpeed = character.cultivationStats.spiritualRoot * 0.5

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
      <div className={styles.detailHeader}>
        <div className={styles.detailNameRow}>
          <span className={styles.detailName}>{character.name}</span>
          <span className={styles.qualityBadge}>{QUALITY_NAMES_CHAR[character.quality]}</span>
        </div>
        <div className={styles.detailSubRow}>
          <span className={styles.detailTitle}>{TITLE_NAMES[character.title]}</span>
          <StatusBadge status={character.status} />
        </div>
        <div className={styles.detailRealm}>{realmName}</div>
        <div className={styles.detailProgress}>
          <ProgressBar value={character.cultivation} max={needed} variant="ink" />
          <span className={styles.progressText}>
            {Math.floor(character.cultivation).toLocaleString()} / {needed.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Base Stats */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>基础属性</div>
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
        <div className={styles.sectionTitle}>修炼资质</div>
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

      {/* Cultivation / Breakthrough */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>修炼</div>
        <div className={styles.cultivationInfo}>
          <span>修炼速度: {cultivationSpeed.toFixed(1)}/s</span>
        </div>
        <BreakthroughPanel characterId={characterId} />
      </section>

      {/* Adventure info */}
      {character.status === 'adventuring' && (
        <section className={styles.section}>
          <div className={styles.sectionTitle}>秘境</div>
          <div className={styles.adventureInfo}>
            正在秘境中探索...
          </div>
        </section>
      )}

      {/* Technique */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>功法</div>
        {technique ? (
          <div className={styles.techniquePanel}>
            <div className={styles.techniqueName}>
              {technique.name}
              <span className={styles.techniqueTier}>{TECHNIQUE_TIER_NAMES[technique.tier]}</span>
            </div>
            <div className={styles.comprehensionRow}>
              <span className={styles.comprehensionLabel}>领悟度</span>
              <ProgressBar value={character.techniqueComprehension} max={100} variant="ink" />
              <span className={styles.comprehensionValue}>{Math.floor(character.techniqueComprehension)}%</span>
            </div>
            {technique.fixedBonuses.length > 0 && (
              <div className={styles.bonuses}>
                {technique.fixedBonuses.map((bonus, i) => {
                  const threshold = [30, 70][i] ?? 100
                  const active = character.techniqueComprehension >= threshold
                  return (
                    <div key={i} className={`${styles.bonusItem} ${active ? styles.bonusActive : styles.bonusLocked}`}>
                      <span>{STAT_LABELS[bonus.type] ?? bonus.type} +{bonus.type === 'crit' ? `${Math.round(bonus.value * 100)}%` : bonus.type === 'critDmg' ? `${Math.round(bonus.value * 100)}%` : bonus.type === 'cultivationRate' ? `${Math.round(bonus.value * 100)}%` : bonus.value}</span>
                      <span className={styles.bonusThreshold}>{threshold}%</span>
                    </div>
                  )
                })}
              </div>
            )}
            {learnedTechniques.length > 1 && (
              <button className={styles.actionBtn} onClick={() => setShowTechniqueSwitch(!showTechniqueSwitch)}>
                更换功法
              </button>
            )}
            {showTechniqueSwitch && (
              <div className={styles.dropdown}>
                {learnedTechniques.map((t) =>
                  t && t.id !== character.currentTechnique ? (
                    <button
                      key={t.id}
                      className={styles.dropdownItem}
                      onClick={() => {
                        switchTechnique(characterId, t.id)
                        setShowTechniqueSwitch(false)
                      }}
                    >
                      {t.name} ({TECHNIQUE_TIER_NAMES[t.tier]})
                    </button>
                  ) : null
                )}
              </div>
            )}
          </div>
        ) : (
          <div className={styles.noTechnique}>
            <span>未修炼功法</span>
            {scrollItems.length > 0 ? (
              <button className={styles.actionBtn} onClick={() => setShowLearnTechnique(!showLearnTechnique)}>
                学习功法
              </button>
            ) : (
              <span className={styles.noScrollHint}>背包中无可用功法卷轴</span>
            )}
            {showLearnTechnique && (
              <div className={styles.dropdown}>
                {scrollItems.map(({ item, idx }) => (
                  <button
                    key={idx}
                    className={styles.dropdownItem}
                    onClick={() => {
                      learnTechnique(characterId, idx)
                      setShowLearnTechnique(false)
                    }}
                  >
                    {item.name} ({QUALITY_NAMES[item.quality]})
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Equipment */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>装备</div>
        <EquipPanel
          characterId={characterId}
          onItemClick={() => {}}
          onSlotClick={(_slotIdx) => {
            // If backpack has equipment, offer to equip
            const eqItems = character.backpack
              .map((item, idx) => ({ item, idx }))
              .filter(({ item }) => item.type === 'equipment')
            if (eqItems.length > 0) {
              setSelectedBackpackIdx(eqItems[0].idx)
            }
          }}
        />
        {/* Equip from backpack when a slot is clicked */}
        {selectedBackpackIdx !== null && character.backpack[selectedBackpackIdx]?.type === 'equipment' && (
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
          背包 ({character.backpack.length}/{character.maxBackpackSlots})
        </div>
        <div className={styles.backpackGrid}>
          {character.backpack.map((item, idx) => (
            <div key={idx} className={styles.backpackItemWrapper}>
              <ItemCard
                item={item}
                selected={selectedBackpackIdx === idx}
                onClick={() => setSelectedBackpackIdx(selectedBackpackIdx === idx ? null : idx)}
              />
              {selectedBackpackIdx === idx && (
                <div className={styles.itemActions}>
                  {item.type === 'equipment' && (
                    <span className={styles.itemHint}>点击装备栏空槽位穿戴</span>
                  )}
                  {item.type === 'techniqueScroll' && !character.currentTechnique && (
                    <button
                      className={styles.itemActionBtn}
                      onClick={() => {
                        learnTechnique(characterId, idx)
                        setSelectedBackpackIdx(null)
                      }}
                    >
                      学习
                    </button>
                  )}
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
                    出售 ({item.sellPrice}灵石)
                  </button>
                </div>
              )}
            </div>
          ))}
          {character.backpack.length === 0 && (
            <div className={styles.empty}>背包为空</div>
          )}
        </div>
      </section>

      {/* Skills */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>技能</div>
        <div className={styles.skillsGrid}>
          {character.equippedSkills.map((skillId, idx) => (
            <div key={idx} className={styles.skillSlot}>
              {skillId ? (
                <span className={styles.skillName}>{skillId}</span>
              ) : (
                <span className={styles.skillEmpty}>
                  {idx < 4 ? `技能${idx + 1}` : '绝技'}
                </span>
              )}
            </div>
          ))}
          {/* Show empty slots if equippedSkills is short */}
          {Array.from(
            { length: Math.max(0, 5 - character.equippedSkills.length) },
            (_, i) => {
              const actualIdx = character.equippedSkills.length + i
              return (
                <div key={`empty-${actualIdx}`} className={styles.skillSlot}>
                  <span className={styles.skillEmpty}>
                    {actualIdx < 4 ? `技能${actualIdx + 1}` : '绝技'}
                  </span>
                </div>
              )
            }
          )}
        </div>
      </section>
    </div>
  )
}
