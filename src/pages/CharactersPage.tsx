import { useState, useMemo } from 'react'
import { useSectStore } from '../stores/sectStore'
import { useAdventureStore } from '../stores/adventureStore'
import { getRealmName, getCultivationNeeded } from '../data/realms'
import { getTechniqueById } from '../data/techniquesTable'
import { getAvailableMissions, DISPATCH_MISSIONS } from '../data/missions'
import { calcCultivationRate } from '../systems/cultivation/CultivationEngine'
import { TECHNIQUE_TIER_NAMES } from '../types/technique'
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
type FilterTab = 'all' | 'cultivating' | 'adventuring' | 'resting'

const FILTER_TABS: { key: FilterTab; label: string; match: (s: CharacterStatus) => boolean }[] = [
  { key: 'all', label: '全部', match: () => true },
  { key: 'cultivating', label: '修炼中', match: (s) => s === 'idle' },
  { key: 'adventuring', label: '冒险中', match: (s) => s === 'adventuring' || s === 'patrolling' },
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
  const cultivationSpeed = calcCultivationRate(character, character.learnedTechniques)

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
            {Math.floor(character.cultivation).toLocaleString()} / {needed.toLocaleString()} (+{cultivationSpeed.toFixed(1)}/s)
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
        <div className={styles.cultivationActions}>
          {character.status === 'idle' && (
            <>
              {getActiveDispatchCount() < 5 && (
                <button className={styles.actionBtn} onClick={() => setShowingMissions(true)}>
                  派遣
                </button>
              )}
            </>
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
          <div className={styles.sectionTitle}>秘境</div>
          <div className={styles.adventureInfo}>
            正在秘境中探索...
          </div>
        </section>
      )}

      {/* Dispatch info */}
      {character.status === 'patrolling' && (() => {
        const dispatch = dispatches.find(d => d.characterId === character.id)
        if (!dispatch) return null
        const mission = DISPATCH_MISSIONS.find(m => m.id === dispatch.missionId)
        const remaining = Math.max(0, dispatch.duration - dispatch.progress)
        const minutes = Math.floor(remaining / 60)
        const seconds = Math.floor(remaining % 60)
        return (
          <section className={styles.section}>
            <div className={styles.sectionTitle}>派遣任务</div>
            <div className={styles.dispatchInfo}>
              <span>{mission?.name ?? '未知任务'}</span>
              <span>剩余: {minutes}:{seconds.toString().padStart(2, '0')}</span>
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
              {getAvailableMissions(character.realm).map(mission => (
                <div
                  key={mission.id}
                  className={styles.missionCard}
                  onClick={() => {
                    startDispatch(character.id, mission.id)
                    setShowingMissions(false)
                  }}
                >
                  <div className={styles.missionName}>{mission.name}</div>
                  <div className={styles.missionDesc}>{mission.description}</div>
                  <div className={styles.missionMeta}>
                    <span>{Math.floor(mission.duration / 60)}分钟</span>
                    <span>{mission.rewards.map(r => {
                      const typeLabel: Record<string, string> = { spiritStone: '灵石', herb: '灵药', ore: '矿石', consumable: '物品' }
                      return `${typeLabel[r.type] ?? r.type} ×${r.amount}`
                    }).join(', ')}</span>
                  </div>
                </div>
              ))}
            </div>
            <button className={styles.cancelBtn} onClick={() => setShowingMissions(false)}>关闭</button>
          </div>
        </div>
      )}

      {/* Technique */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>功法</div>
        {character.learnedTechniques.length > 0 ? (
          <div className={styles.techniqueList}>
            {character.learnedTechniques.map((techId) => {
              const tech = getTechniqueById(techId)
              if (!tech) return null
              const tierClass = TECHNIQUE_TIER_CLASS[tech.tier] ?? ''
              return (
                <div key={techId} className={styles.techniquePanel}>
                  <div className={styles.techniqueName}>
                    {tech.name}
                    <span className={`${styles.techniqueTier} ${tierClass}`}>
                      {TECHNIQUE_TIER_NAMES[tech.tier]}
                    </span>
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

      {/* Equipment */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>装备</div>
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
                  {stack.item.type === 'equipment' && (
                    <span className={styles.itemHint}>点击装备栏空槽位穿戴</span>
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
                    出售 ({stack.item.sellPrice}灵石)
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
