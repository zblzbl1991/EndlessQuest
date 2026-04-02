import { useState, useMemo, useCallback } from 'react'
import { useSectStore } from '../stores/sectStore'
import { BUILDING_DEFS, getBuildingEffectText, getBuildingUnlockText } from '../data/buildings'
import { checkBuildingUnlock } from '../systems/sect/BuildingSystem'
import { calcTaxRate } from '../systems/economy/ResourceEngine'
import { calcSectLevel } from '../systems/character/CharacterEngine'
import { getActiveSynergies } from '../systems/economy/SynergySystem'
import { SYNERGIES } from '../data/buildings'
import { getAutoRecipesForBuilding, getAutoRecipeById } from '../data/recipes'
import { SPECIALTY_BUILDING_MAP } from '../data/specialties'
import { getRecommendedAssignment, getRoleLabel } from '../systems/character/SpecialtySystem'
import type { AutoRecipe } from '../data/recipes'
import {
  getMaxCharacters,
  getRecruitCost,
  getAvailableQualities,
  getQualityStats,
  getQualityUnlockMainHallLevel,
} from '../systems/character/CharacterEngine'
import type { BuildingType, CharacterQuality } from '../types'
import type { ItemStack } from '../types/item'
import type { Character } from '../types/character'
import type { Talent } from '../types/talent'
import { TALENT_RARITY_NAMES } from '../types/talent'
import { CHAR_QUALITY_NAMES } from '../data/uiCopy'
import ItemCard from '../components/inventory/ItemCard'
import { PixelIcon } from '../components/common/PixelIcon'
import PageHeader from '../components/common/PageHeader'
import AlchemyPanel from '../components/building/AlchemyPanel'
import ForgePanel from '../components/building/ForgePanel'
import StudyPanel from '../components/building/StudyPanel'
import CodexPanel from '../components/building/CodexPanel'
import MarketPanel from '../components/building/MarketPanel'
import styles from './BuildingsPage.module.css'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type TabKey = 'buildings' | 'recruit' | 'vault' | 'alchemy' | 'forge' | 'study' | 'codex' | 'market'

const TAB_ICON_NAMES: Record<TabKey, string> = {
  buildings: 'building',
  recruit: 'disciple',
  vault: 'spiritMine',
  alchemy: 'alchemyFurnace',
  forge: 'forgeWorkshop',
  study: 'scriptureHall',
  codex: 'techniqueScroll',
  market: 'marketTrade',
}

const BUILDING_ICON_NAMES: Partial<Record<BuildingType, string>> = {
  mainHall: 'mainHall',
  spiritField: 'spiritField',
  spiritMine: 'spiritMine',
  alchemyFurnace: 'alchemyFurnace',
  scriptureHall: 'scriptureHall',
  forge: 'forgeWorkshop',
  market: 'marketTrade',
  recruitmentPavilion: 'recruitmentPavilion',
}


/** Base combat stats before variance -- used for stat coloring comparison. */
const BASE_COMBAT_STATS = { hp: 100, atk: 15, def: 8, spd: 10, crit: 0.05, critDmg: 1.5 }

/** Stat display labels for the recruit result modal. */
const STAT_LABELS: Record<string, string> = {
  hp: '生命',
  atk: '攻击',
  def: '防御',
  spd: '速度',
  crit: '暴击',
  critDmg: '暴伤',
  spiritualRoot: '灵根',
  comprehension: '悟性',
  fortune: '机缘',
}

function getStatClass(value: number, baseValue: number): string {
  if (baseValue === 0) return ''
  const diff = (value - baseValue) / baseValue
  if (diff > 0.1) return styles.statHigh
  if (diff < -0.1) return styles.statLow
  return ''
}

function formatStat(key: string, value: number): string {
  if (key === 'crit') return `${Math.round(value * 100)}%`
  return String(Math.round(value * 10) / 10)
}

function getTalentClass(rarity: Talent['rarity']): string {
  if (rarity === 'epic') return styles.talentEpic
  if (rarity === 'rare') return styles.talentRare
  return ''
}

/** Building types that support auto-production queues. */
const PROCESSING_BUILDINGS: BuildingType[] = ['alchemyFurnace', 'forge']

/** Reverse map: building type → list of specialty role labels that benefit it. */
const BUILDING_SPECIALTY_HINTS: Record<string, string> = (() => {
  const map: Record<string, string[]> = {}
  for (const [spec, building] of Object.entries(SPECIALTY_BUILDING_MAP)) {
    if (!building) continue
    if (!map[building]) map[building] = []
    map[building].push(getRoleLabel(spec))
  }
  const result: Record<string, string> = {}
  for (const [building, labels] of Object.entries(map)) {
    result[building] = `适合: ${labels.join('、')}专长弟子`
  }
  return result
})()

const AUTO_ASSIGNABLE_BUILDINGS = new Set(
  Object.values(SPECIALTY_BUILDING_MAP).filter((building): building is string => !!building)
)

function getRecommendedIdleCount(buildingType: string, characters: Character[]): number {
  return characters.filter(
    (character) => character.status === 'idle' && getRecommendedAssignment(character) === buildingType
  ).length
}

function formatInputPerSec(recipe: AutoRecipe): string {
  const parts: string[] = []
  if (recipe.inputPerSec.herb) parts.push(`${recipe.inputPerSec.herb}/秒灵草`)
  if (recipe.inputPerSec.ore) parts.push(`${recipe.inputPerSec.ore}/秒矿石`)
  if (recipe.inputPerSec.spiritStone) parts.push(`${recipe.inputPerSec.spiritStone}/秒灵石`)
  return parts.join(' + ') || '无消耗'
}

function formatProductionTime(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return sec > 0 ? `${min}分${sec}秒` : `${min}分钟`
}

// ---------------------------------------------------------------------------
// BuildingsPage
// ---------------------------------------------------------------------------

export default function BuildingsPage() {
  const [tab, setTab] = useState<TabKey>('buildings')
  const sect = useSectStore((s) => s.sect)

  const availableTabs = useMemo(() => {
    const tabs: { key: TabKey; label: string }[] = [
      { key: 'buildings', label: '建筑' },
      { key: 'vault', label: '仓库' },
    ]
    const rp = sect.buildings.find((b) => b.type === 'recruitmentPavilion')
    if (rp && rp.unlocked) tabs.push({ key: 'recruit', label: '招收' })
    const af = sect.buildings.find((b) => b.type === 'alchemyFurnace')
    if (af && af.unlocked) tabs.push({ key: 'alchemy', label: '炼丹' })
    const fg = sect.buildings.find((b) => b.type === 'forge')
    if (fg && fg.unlocked) tabs.push({ key: 'forge', label: '锻造' })
    const sh = sect.buildings.find((b) => b.type === 'scriptureHall')
    if (sh && sh.unlocked) tabs.push({ key: 'study', label: '参悟' })
    if (sh && sh.unlocked) tabs.push({ key: 'codex', label: '图鉴' })
    const mk = sect.buildings.find((b) => b.type === 'market')
    if (mk && mk.unlocked) tabs.push({ key: 'market', label: '坊市' })
    return tabs
  }, [sect.buildings])

  // Derived: clamp tab to an available option
  const activeTab = availableTabs.some((t) => t.key === tab) ? tab : 'buildings'
  const unlockedBuildings = sect.buildings.filter((building) => building.unlocked && building.level > 0)
  const buildFocus =
    [...unlockedBuildings]
      .sort((left, right) => {
        if (right.level !== left.level) return right.level - left.level
        return left.type === 'mainHall' ? 1 : -1
      })
      .map((building) => BUILDING_DEFS.find((def) => def.type === building.type)?.name ?? building.type)[0] ?? '主殿'
  const autoAssignableCount = sect.buildings.reduce((count, building) => {
    if (!building.unlocked || building.level <= 0) return count
    if (!AUTO_ASSIGNABLE_BUILDINGS.has(building.type)) return count
    return count + getRecommendedIdleCount(building.type, sect.characters)
  }, 0)
  const activeSynergyCount = getActiveSynergies(sect.buildings).length
  const activeTabMeta = availableTabs.find((item) => item.key === activeTab)

  const content =
    activeTab === 'buildings' ? (
      <BuildingsTab />
    ) : activeTab === 'recruit' ? (
      <RecruitTab />
    ) : activeTab === 'vault' ? (
      <VaultTab />
    ) : activeTab === 'alchemy' ? (
      <AlchemyPanel />
    ) : activeTab === 'forge' ? (
      <ForgePanel />
    ) : activeTab === 'study' ? (
      <StudyPanel />
    ) : activeTab === 'codex' ? (
      <CodexPanel />
    ) : (
      <MarketPanel />
    )

  return (
    <div className={styles.page}>
      <PageHeader
        title="建筑"
        testId="buildings-hero"
        metrics={[
          { label: '当前重点', value: buildFocus, detail: `已启用 ${unlockedBuildings.length} 处建筑` },
          { label: '建筑协同', value: activeSynergyCount, detail: '同阶建筑会自动叠加产线收益' },
          { label: '可自动派驻', value: autoAssignableCount, detail: '只会安排闲置弟子，不覆盖手工派驻' },
          { label: '当前页签', value: activeTabMeta?.label ?? '建筑', detail: `${availableTabs.length} 个功能分栏` },
        ]}
      />

      <div className={styles.tabs} data-testid="building-tab-rail">
        {availableTabs.map((t) => (
          <button
            key={t.key}
            className={`${styles.tab} ${activeTab === t.key ? styles.tabActive : ''}`}
            onClick={() => setTab(t.key)}
          >
            <PixelIcon name={TAB_ICON_NAMES[t.key]} size={18} className={styles.tabIcon} aria-label={t.label} />
            <span className={styles.tabLabel}>{t.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'buildings' ? (
        content
      ) : (
        <section className={styles.subpanel} data-testid="building-subpanel">
          <div className={styles.subpanelHeader}>
            <div className={styles.subpanelTitle}>{activeTabMeta?.label}</div>
          </div>
          <div className={styles.subpanelBody}>{content}</div>
        </section>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// BuildingsTab
// ---------------------------------------------------------------------------

function BuildingsTab() {
  const sect = useSectStore((s) => s.sect)
  const tryUpgradeBuilding = useSectStore((s) => s.tryUpgradeBuilding)
  const setProductionRecipe = useSectStore((s) => s.setProductionRecipe)
  const autoAssignToBuilding = useSectStore((s) => s.autoAssignToBuilding)
  const autoOptimizeBuildingAssignments = useSectStore((s) => s.autoOptimizeBuildingAssignments)
  const activeSynergies = getActiveSynergies(sect.buildings)
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null)
  const [drawerBuilding, setDrawerBuilding] = useState<string | null>(null)

  const handleUpgrade = (type: BuildingType) => {
    const result = tryUpgradeBuilding(type)
    if (result.success) {
      setMessage({ success: true, text: '升级成功' })
    } else {
      setMessage({ success: false, text: result.reason })
    }
    setTimeout(() => setMessage(null), 2000)
  }

  const handleSelectRecipe = useCallback(
    (buildingType: BuildingType, recipeId: string | null) => {
      setProductionRecipe(buildingType, recipeId)
      setDrawerBuilding(null)
    },
    [setProductionRecipe]
  )

  const handleAutoAssign = (buildingType: string) => {
    const result = autoAssignToBuilding(buildingType)
    setMessage({
      success: result.success,
      text: result.success ? `已自动派驻 ${result.assigned} 名弟子` : result.reason,
    })
    setTimeout(() => setMessage(null), 2000)
  }

  const handleAutoOptimize = () => {
    const result = autoOptimizeBuildingAssignments()
    setMessage({
      success: result.success,
      text: result.success ? `已优化 ${result.assigned} 名弟子派驻` : result.reason,
    })
    setTimeout(() => setMessage(null), 2000)
  }

  const autoAssignableCount = sect.buildings.reduce((count, building) => {
    if (!building.unlocked || building.level <= 0) return count
    if (!AUTO_ASSIGNABLE_BUILDINGS.has(building.type)) return count
    return count + getRecommendedIdleCount(building.type, sect.characters)
  }, 0)
  return (
    <div className={styles.buildingsGrid}>
      {autoAssignableCount > 0 && (
        <section className={styles.synergySection}>
          <div className={styles.sectionTitle}>派驻优化</div>
          <div className={styles.synergyList}>
            <div className={styles.synergyCard}>
              <div className={styles.synergyName}>自动派驻推荐弟子</div>
              <div className={styles.synergyDesc}>优先填充空位，只会安排闲置弟子，不会覆盖你已经手工派驻的人员。</div>
              <button className={`${styles.upgradeBtn} ${styles.upgradeReady}`} onClick={handleAutoOptimize}>
                一键优化派驻 ({autoAssignableCount} 人可派)
              </button>
            </div>
          </div>
        </section>
      )}

      {BUILDING_DEFS.map((def) => {
        const building = sect.buildings.find((b) => b.type === def.type)
        if (!building) return null

        const isUnlocked = building.unlocked
        const isMaxLevel = building.level >= def.maxLevel
        const cost = def.upgradeCost(building.level)
        const canAfford = sect.resources.spiritStone >= cost.spiritStone
        const isProcessing = PROCESSING_BUILDINGS.includes(def.type)

        // Production queue info
        const activeRecipe = building.productionQueue.recipeId
          ? getAutoRecipeById(building.productionQueue.recipeId)
          : null
        const progressPercent = activeRecipe
          ? Math.min((building.productionQueue.progress / activeRecipe.productionTime) * 100, 100)
          : 0
        const recommendedIdleCount = isUnlocked ? getRecommendedIdleCount(def.type, sect.characters) : 0
        const canAutoAssign = isUnlocked && AUTO_ASSIGNABLE_BUILDINGS.has(def.type) && recommendedIdleCount > 0

        return (
          <div key={def.type} className={`${styles.buildingCard} ${!isUnlocked ? styles.buildingLocked : ''}`}>
            <div className={styles.buildingHeader}>
              <span className={styles.buildingName}>
                <PixelIcon
                  name={BUILDING_ICON_NAMES[def.type] ?? 'building'}
                  size={20}
                  className={styles.buildingIcon}
                  aria-label={def.name}
                />
                {def.name}
              </span>
              <span className={styles.buildingLevel}>
                Lv{building.level}
                {isMaxLevel ? ' 满级' : ''}
              </span>
            </div>
            <div className={styles.buildingDesc}>{def.description}</div>
            {BUILDING_SPECIALTY_HINTS[def.type] && (
              <div className={styles.buildingDesc}>{BUILDING_SPECIALTY_HINTS[def.type]}</div>
            )}
            {isUnlocked && AUTO_ASSIGNABLE_BUILDINGS.has(def.type) && (
              <div className={styles.buildingEffect}>推荐派驻: {recommendedIdleCount} / 3</div>
            )}
            {(() => {
              const effectText = getBuildingEffectText(building)
              return effectText && <div className={styles.buildingEffect}>{effectText}</div>
            })()}
            {def.type === 'mainHall' &&
              isUnlocked &&
              (() => {
                const sectLevel = calcSectLevel(building.level)
                const discipleCount = useSectStore.getState().sect.characters.length
                const tax = calcTaxRate(sectLevel, discipleCount)
                return <div className={styles.buildingEffect}>赋税收入: +{tax.toFixed(1)}/秒</div>
              })()}
            {!isUnlocked &&
              (() => {
                const unlockText = getBuildingUnlockText(building)
                return unlockText && <div className={styles.buildingUnlockPreview}>{unlockText}</div>
              })()}
            {def.type === 'mainHall' &&
              isUnlocked &&
              (() => {
                const sectLevel = calcSectLevel(building.level)
                const discipleCount = useSectStore.getState().sect.characters.length
                const tax = calcTaxRate(sectLevel, discipleCount)
                return <div className={styles.buildingEffect}>赋税收入: +{tax.toFixed(1)}/秒</div>
              })()}
            {!isUnlocked &&
              (() => {
                const unlockText = getBuildingUnlockText(building)
                return unlockText && <div className={styles.buildingUnlockPreview}>{unlockText}</div>
              })()}

            {/* Production queue section for processing buildings */}
            {isUnlocked && isProcessing && (
              <div className={styles.productionSection}>
                {!activeRecipe ? (
                  <div className={styles.productionStatus}>
                    <span className={styles.productionIdle}>未设置生产配方</span>
                  </div>
                ) : (
                  <div className={styles.productionStatus}>
                    <div className={styles.productionRecipeName}>
                      {activeRecipe.name}
                      <span className={styles.productionInputRate}>{formatInputPerSec(activeRecipe)}</span>
                    </div>
                    <div className={styles.progressBar}>
                      <div className={styles.progressBarFill} style={{ width: `${progressPercent}%` }} />
                    </div>
                    <div className={styles.productionTime}>{formatProductionTime(activeRecipe.productionTime)}</div>
                  </div>
                )}
                <button className={styles.recipeSelectBtn} onClick={() => setDrawerBuilding(def.type)}>
                  选择配方
                </button>
              </div>
            )}

            {isUnlocked && !isMaxLevel && (
              <button
                className={`${styles.upgradeBtn} ${canAfford ? styles.upgradeReady : styles.upgradeDisabled}`}
                onClick={() => handleUpgrade(def.type)}
                disabled={!canAfford}
              >
                升级 ({cost.spiritStone}灵石)
              </button>
            )}
            {isMaxLevel && <span className={styles.maxLevelTag}>已满级</span>}
            {!isUnlocked &&
              (() => {
                const unlockCheck = checkBuildingUnlock(def.type, sect.buildings)
                if (unlockCheck.unlocked) {
                  const buildCost = def.upgradeCost(building.level)
                  const canBuild = sect.resources.spiritStone >= buildCost.spiritStone
                  return (
                    <button
                      className={`${styles.upgradeBtn} ${canBuild ? styles.upgradeReady : styles.upgradeDisabled}`}
                      onClick={() => handleUpgrade(def.type)}
                      disabled={!canBuild}
                    >
                      建造 ({buildCost.spiritStone}灵石)
                    </button>
                  )
                }
                return (
                  <div className={styles.unlockInfo}>
                    <span className={styles.unlockCondition}>解锁条件: {def.unlockCondition}</span>
                  </div>
                )
              })()}
            {canAutoAssign && (
              <button
                className={`${styles.upgradeBtn} ${styles.upgradeReady}`}
                onClick={() => handleAutoAssign(def.type)}
              >
                自动派驻推荐弟子 ({recommendedIdleCount})
              </button>
            )}
          </div>
        )
      })}
      {message && (
        <div className={`${styles.message} ${message.success ? styles.messageSuccess : styles.messageFail}`}>
          {message.text}
        </div>
      )}

      {/* Recipe selection drawer */}
      {drawerBuilding && (
        <RecipeDrawer
          buildingType={drawerBuilding as 'alchemyFurnace' | 'forge'}
          buildingLevel={sect.buildings.find((b) => b.type === drawerBuilding)?.level ?? 1}
          currentRecipeId={sect.buildings.find((b) => b.type === drawerBuilding)?.productionQueue.recipeId ?? null}
          onSelect={handleSelectRecipe}
          onClose={() => setDrawerBuilding(null)}
        />
      )}

      {/* Building Synergies */}
      <section className={styles.synergySection}>
        <div className={styles.sectionTitle}>建筑协同</div>
        <div className={styles.synergyList}>
          {SYNERGIES.map((synergy) => {
            const isActive = activeSynergies.some((a) => a.id === synergy.id)
            return (
              <div
                key={synergy.id}
                className={`${styles.synergyCard} ${isActive ? styles.synergyActive : styles.synergyInactive}`}
              >
                <div className={styles.synergyName}>{synergy.name}</div>
                <div className={styles.synergyDesc}>{synergy.description}</div>
                <div className={styles.synergyReq}>
                  {synergy.requirements.map((req, i) => (
                    <span key={i}>
                      {BUILDING_DEFS.find((d) => d.type === req.building)?.name ?? req.building} Lv{req.level}
                      {i < synergy.requirements.length - 1 && ' + '}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// RecruitTab
// ---------------------------------------------------------------------------

function RecruitTab() {
  const sect = useSectStore((s) => s.sect)
  const canRecruit = useSectStore((s) => s.canRecruit)
  const addCharacter = useSectStore((s) => s.addCharacter)
  const targetedRecruit = useSectStore((s) => s.targetedRecruit)
  const [selectedQuality, setSelectedQuality] = useState<CharacterQuality>('common')
  const [recruitedCharacter, setRecruitedCharacter] = useState<Character | null>(null)
  const [targetedQuality, setTargetedQuality] = useState<CharacterQuality>('spirit')
  const [targetedMessage, setTargetedMessage] = useState<string | null>(null)

  const maxChars = getMaxCharacters(sect.level)
  const availableQualities = getAvailableQualities(sect.level)

  const recruitmentPavilionLevel = sect.buildings.find((b) => b.type === 'recruitmentPavilion')?.level ?? 0
  const hasTargetedRecruit = recruitmentPavilionLevel >= 3

  // Targeted recruit qualities: spirit, immortal, divine (minimum)
  const targetedOptions: CharacterQuality[] = ['spirit', 'immortal', 'divine']

  // Derived: clamp selected quality to an available option
  const effectiveQuality = availableQualities.includes(selectedQuality)
    ? selectedQuality
    : (availableQualities[0] ?? selectedQuality)
  const recruitCheck = canRecruit(effectiveQuality)
  const cost = getRecruitCost(effectiveQuality)

  const handleRecruit = () => {
    if (!recruitCheck.allowed) return
    const character = addCharacter(effectiveQuality)
    if (character) {
      setRecruitedCharacter(character)
    }
  }

  const handleTargetedRecruit = () => {
    const character = targetedRecruit(targetedQuality)
    if (character) {
      setRecruitedCharacter(character)
      setTargetedMessage(null)
    } else {
      setTargetedMessage('招募失败，资源不足或弟子已满')
      setTimeout(() => setTargetedMessage(null), 2000)
    }
  }

  // Compute targeted cost display
  const targetedStoneCost = targetedQuality ? Math.floor(getRecruitCost(targetedQuality) * 1.5) : 0

  return (
    <div className={styles.recruitPanel}>
      <div className={styles.recruitInfo}>
        <span className={styles.recruitCount}>
          弟子数量: {sect.characters.length} / {maxChars}
        </span>
        <span className={styles.recruitSpiritStones}>灵石: {sect.resources.spiritStone}</span>
      </div>

      <div className={styles.qualitySelect}>
        {(['common', 'spirit', 'immortal', 'divine'] as CharacterQuality[]).map((quality) => {
          const available = availableQualities.includes(quality)
          const unlockMainHall = getQualityUnlockMainHallLevel(quality)
          const qualityCost = getRecruitCost(quality)
          return (
            <button
              key={quality}
              className={`${styles.qualityBtn} ${effectiveQuality === quality ? styles.qualityActive : ''} ${!available ? styles.qualityLocked : ''}`}
              onClick={() => available && setSelectedQuality(quality)}
              disabled={!available}
            >
              {CHAR_QUALITY_NAMES[quality]}
              <span className={styles.qualityCost}>{qualityCost}灵石</span>
              {!available && unlockMainHall != null && (
                <span className={styles.qualityLockHint}>大殿Lv{unlockMainHall}解锁</span>
              )}
            </button>
          )
        })}
      </div>

      <button
        className={`${styles.recruitBtn} ${!recruitCheck.allowed ? styles.recruitDisabled : ''}`}
        onClick={handleRecruit}
        disabled={!recruitCheck.allowed}
      >
        {!recruitCheck.allowed ? recruitCheck.reason : `招收${CHAR_QUALITY_NAMES[effectiveQuality]}弟子 (${cost}灵石)`}
      </button>

      {/* Targeted Recruitment Section */}
      {hasTargetedRecruit && (
        <>
          <div className={styles.targetedSection}>
            <div className={styles.targetedHeader}>定向招募</div>
            <div className={styles.targetedDesc}>聚仙台 Lv3+ 解锁。保证招募不低于指定品质的弟子。</div>

            <div className={styles.targetedQualitySelect}>
              {targetedOptions.map((quality) => {
                const qCost = getRecruitCost(quality) * 2
                const isSelected = targetedQuality === quality
                return (
                  <button
                    key={quality}
                    className={`${styles.targetedQualityBtn} ${isSelected ? styles.targetedQualityActive : ''}`}
                    onClick={() => setTargetedQuality(quality)}
                  >
                    {CHAR_QUALITY_NAMES[quality]}+<span className={styles.targetedCost}>{qCost}灵石 + 10灵草</span>
                  </button>
                )
              })}
            </div>

            <button
              className={`${styles.targetedBtn} ${targetedMessage ? styles.recruitDisabled : ''}`}
              onClick={handleTargetedRecruit}
              disabled={!!targetedMessage}
            >
              定向招募{CHAR_QUALITY_NAMES[targetedQuality]}+弟子 ({targetedStoneCost}灵石 + 10灵草)
            </button>

            {targetedMessage && <div className={styles.targetedFailMsg}>{targetedMessage}</div>}
          </div>
        </>
      )}

      {recruitedCharacter && (
        <RecruitResultModal character={recruitedCharacter} onClose={() => setRecruitedCharacter(null)} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// RecruitResultModal
// ---------------------------------------------------------------------------

function RecruitResultModal({ character, onClose }: { character: Character; onClose: () => void }) {
  const qualityStats = getQualityStats(character.quality)

  const combatEntries: { key: string; value: number; base: number }[] = [
    { key: 'hp', value: character.baseStats.hp, base: BASE_COMBAT_STATS.hp },
    { key: 'atk', value: character.baseStats.atk, base: BASE_COMBAT_STATS.atk },
    { key: 'def', value: character.baseStats.def, base: BASE_COMBAT_STATS.def },
    { key: 'spd', value: character.baseStats.spd, base: BASE_COMBAT_STATS.spd },
    { key: 'crit', value: character.baseStats.crit, base: BASE_COMBAT_STATS.crit },
    { key: 'critDmg', value: character.baseStats.critDmg, base: BASE_COMBAT_STATS.critDmg },
  ]

  const cultEntries: { key: string; value: number; base: number }[] = [
    { key: 'spiritualRoot', value: character.cultivationStats.spiritualRoot, base: qualityStats.spiritualRoot },
    { key: 'comprehension', value: character.cultivationStats.comprehension, base: qualityStats.comprehension },
    { key: 'fortune', value: character.cultivationStats.fortune, base: qualityStats.fortune },
  ]

  return (
    <div className={styles.recruitResultModal} onClick={onClose}>
      <div className={styles.recruitResultContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.recruitCharHeader}>
          <div className={styles.recruitCharName}>{character.name}</div>
          <span className={styles.recruitCharQuality}>{CHAR_QUALITY_NAMES[character.quality]}</span>
        </div>

        <div className={styles.recruitStats}>
          {combatEntries.map(({ key, value, base }) => (
            <div key={key} className={styles.recruitStatItem}>
              <span className={styles.recruitStatLabel}>{STAT_LABELS[key]}</span>
              <span className={`${styles.recruitStatValue} ${getStatClass(value, base)}`}>
                {formatStat(key, value)}
              </span>
            </div>
          ))}
          {cultEntries.map(({ key, value, base }) => (
            <div key={key} className={styles.recruitStatItem}>
              <span className={styles.recruitStatLabel}>{STAT_LABELS[key]}</span>
              <span className={`${styles.recruitStatValue} ${getStatClass(value, base)}`}>
                {formatStat(key, value)}
              </span>
            </div>
          ))}
        </div>

        {character.talents.length > 0 && (
          <div className={styles.recruitTalents}>
            <div className={styles.recruitTalentTitle}>天赋</div>
            <div className={styles.recruitTalentList}>
              {character.talents.map((talent) => (
                <span key={talent.id} className={`${styles.recruitTalent} ${getTalentClass(talent.rarity)}`}>
                  {TALENT_RARITY_NAMES[talent.rarity]} {talent.name}
                </span>
              ))}
            </div>
          </div>
        )}

        <button className={styles.recruitCloseBtn} onClick={onClose}>
          收下弟子
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// RecipeDrawer
// ---------------------------------------------------------------------------

function RecipeDrawer({
  buildingType,
  buildingLevel,
  currentRecipeId,
  onSelect,
  onClose,
}: {
  buildingType: 'alchemyFurnace' | 'forge'
  buildingLevel: number
  currentRecipeId: string | null
  onSelect: (buildingType: BuildingType, recipeId: string | null) => void
  onClose: () => void
}) {
  const recipes = getAutoRecipesForBuilding(buildingType, buildingLevel)

  return (
    <div className={styles.recipeDrawerOverlay} onClick={onClose}>
      <div className={styles.recipeDrawer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.recipeDrawerHeader}>
          <span className={styles.recipeDrawerTitle}>
            {buildingType === 'alchemyFurnace' ? '炼丹配方' : '锻造配方'}
          </span>
          <button className={styles.recipeDrawerClose} onClick={onClose}>
            关闭
          </button>
        </div>

        <div className={styles.recipeList}>
          {recipes.map((recipe) => {
            const isActive = recipe.id === currentRecipeId
            return (
              <button
                key={recipe.id}
                className={`${styles.recipeItem} ${isActive ? styles.recipeItemActive : ''}`}
                onClick={() => onSelect(buildingType, recipe.id)}
              >
                <div className={styles.recipeItemName}>{recipe.name}</div>
                <div className={styles.recipeItemDetails}>
                  <span className={styles.recipeItemRate}>{formatInputPerSec(recipe)}</span>
                  <span className={styles.recipeItemTime}>{formatProductionTime(recipe.productionTime)}</span>
                </div>
              </button>
            )
          })}
          {recipes.length === 0 && <div className={styles.empty}>暂无可用配方</div>}
        </div>

        {currentRecipeId && (
          <button className={styles.recipeStopBtn} onClick={() => onSelect(buildingType, null)}>
            停止生产
          </button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// VaultTab
// ---------------------------------------------------------------------------

function VaultTab() {
  const sect = useSectStore((s) => s.sect)
  const sellItem = useSectStore((s) => s.sellItem)
  const transferItemToCharacter = useSectStore((s) => s.transferItemToCharacter)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [showTransferSelect, setShowTransferSelect] = useState(false)

  const handleSell = (idx: number) => {
    sellItem(idx)
    setSelectedIdx(null)
  }

  const handleTransferStart = () => {
    setShowTransferSelect(true)
  }

  const handleTransferTo = (characterId: string) => {
    if (selectedIdx === null) return
    transferItemToCharacter(characterId, selectedIdx)
    setSelectedIdx(null)
    setShowTransferSelect(false)
  }

  return (
    <div className={styles.vaultPanel}>
      <div className={styles.vaultCapacity}>
        仓库容量: {sect.vault.length} / {sect.maxVaultSlots}
      </div>

      <div className={styles.vaultGrid}>
        {sect.vault.map((stack: ItemStack, idx: number) => (
          <div key={stack.item.id + '-' + idx} className={styles.vaultItemWrapper}>
            <ItemCard
              item={stack.item}
              selected={selectedIdx === idx}
              onClick={() => setSelectedIdx(selectedIdx === idx ? null : idx)}
            />
            {stack.quantity > 1 && <span className={styles.quantityBadge}>x{stack.quantity}</span>}
            {selectedIdx === idx && (
              <div className={styles.vaultItemActions}>
                <button className={styles.vaultActionBtn} onClick={() => handleSell(idx)}>
                  出售 ({stack.item.sellPrice}灵石)
                </button>
                <button className={styles.vaultActionBtn} onClick={handleTransferStart}>
                  转给弟子
                </button>
              </div>
            )}
          </div>
        ))}
        {sect.vault.length === 0 && <div className={styles.empty}>仓库为空</div>}
      </div>

      {/* Character select for transfer */}
      {showTransferSelect && (
        <div className={styles.transferModal}>
          <div className={styles.transferModalContent}>
            <div className={styles.transferTitle}>选择弟子</div>
            {sect.characters.map((char) => (
              <button key={char.id} className={styles.transferCharBtn} onClick={() => handleTransferTo(char.id)}>
                {char.name} ({char.backpack.length}/{char.maxBackpackSlots})
              </button>
            ))}
            <button
              className={styles.cancelBtn}
              onClick={() => {
                setShowTransferSelect(false)
              }}
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
