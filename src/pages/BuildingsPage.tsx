import { useState, useMemo, useCallback } from 'react'
import { useSectStore } from '../stores/sectStore'
import {
  BUILDING_DEFS,
  calcResourceCaps,
  getBuildingEffectText,
  getBuildingExpandCost,
  getBuildingNodeCap,
  getBuildingUnlockText,
} from '../data/buildings'
import { checkBuildingUnlock } from '../systems/sect/BuildingSystem'
import { getActiveSynergies } from '../systems/economy/SynergySystem'
import { SYNERGIES } from '../data/buildings'
import { getAutoRecipesForBuilding, getAutoRecipeById } from '../data/recipes'
import { SPECIALTY_BUILDING_MAP } from '../data/specialties'
import { getRecommendedAssignment, getRoleLabel } from '../systems/character/SpecialtySystem'
import type { AutoRecipe } from '../data/recipes'
import { getRecruitCost, getQualityStats } from '../systems/character/CharacterEngine'
import { calcMaxDisciplesByResources } from '../systems/sect/SectEngine'
import { calcSpiritStoneCap } from '../systems/economy/ResourceEngine'
import type {
  BuildingProductionFocus,
  BuildingType,
  CharacterQuality,
  OverflowSellRule,
  SpiritStoneOverflowRule,
} from '../types'
import { PRODUCTION_CAMPAIGNS, CAMPAIGN_NAMES } from '../data/productionCampaigns'
import { getArchetypeDescriptor } from '../data/sectArchetypes'
import type { ItemStack } from '../types/item'
import type { Character } from '../types/character'
import { ELEMENT_NAMES } from '../types/skill'
import { CHAR_QUALITY_NAMES } from '../data/uiCopy'
import ItemCard from '../components/inventory/ItemCard'
import { PixelIcon } from '../components/common/PixelIcon'
import PageHeader from '../components/common/PageHeader'
import AlchemyPanel from '../components/building/AlchemyPanel'
import ForgePanel from '../components/building/ForgePanel'
import StudyPanel from '../components/building/StudyPanel'
import CodexPanel from '../components/building/CodexPanel'
import MonsterCodexPanel from '../components/building/MonsterCodexPanel'
import EquipmentCodexPanel from '../components/building/EquipmentCodexPanel'
import MarketPanel from '../components/building/MarketPanel'
import styles from './BuildingsPage.module.css'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type TabKey = 'buildings' | 'recruit' | 'vault' | 'alchemy' | 'forge' | 'study' | 'codex' | 'market'
type CodexSubTab = 'technique' | 'monster' | 'equipment'

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

/** Building types that support auto-production queues. */
const PROCESSING_BUILDINGS: BuildingType[] = ['alchemyFurnace', 'forge']

/** Deduplicated synergies — static data, computed once at module level. */
const UNIQUE_SYNERGIES = SYNERGIES.filter((s, i) => SYNERGIES.findIndex((o) => o.id === s.id) === i)

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

const PRODUCTION_FOCUS_OPTIONS: { key: BuildingProductionFocus; label: string; description: string }[] = [
  { key: 'balanced', label: '均衡运转', description: '维持丹炉与锻造的稳态产出。' },
  { key: 'cultivation', label: '修炼优先', description: '优先补足闭关和突破前的基础供给。' },
  { key: 'crafting', label: '锻造优先', description: '把更多余量导向材料精炼和装备产出。' },
]

const OVERFLOW_THRESHOLD_OPTIONS = [
  { value: 0.8, label: '80% 预警' },
  { value: 0.9, label: '90% 预警' },
  { value: 0.95, label: '95% 预警' },
]

const SELL_RULE_OPTIONS: { key: OverflowSellRule; label: string }[] = [
  { key: 'hold', label: '只保留' },
  { key: 'sell', label: '高水位卖出' },
]

const STONE_RULE_OPTIONS: { key: SpiritStoneOverflowRule; label: string }[] = [
  { key: 'hold', label: '只保留' },
  { key: 'buyHerb', label: '转购灵草' },
  { key: 'buyOre', label: '转购矿材' },
]

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

function getPresetRecipeId(
  buildingType: 'alchemyFurnace' | 'forge',
  buildingLevel: number,
  focus: BuildingProductionFocus
): string | null {
  const recipes = getAutoRecipesForBuilding(buildingType, buildingLevel)
  if (recipes.length === 0) return null

  if (buildingType === 'alchemyFurnace') {
    if (focus === 'cultivation') return recipes.find((recipe) => recipe.id === 'spirit_potion')?.id ?? recipes[0].id
    if (focus === 'crafting') return recipes.find((recipe) => recipe.id === 'refined_herb')?.id ?? recipes[0].id
    return recipes.find((recipe) => recipe.id === 'hp_potion')?.id ?? recipes[0].id
  }

  if (focus === 'cultivation') {
    return (
      recipes.find((recipe) => recipe.id === 'refined_ore')?.id ??
      recipes.find((recipe) => recipe.id === 'spirit_ingot')?.id ??
      recipes[0].id
    )
  }

  if (focus === 'crafting') {
    return (
      recipes.find((recipe) => recipe.id === 'forge_spirit_offensive')?.id ??
      recipes.find((recipe) => recipe.id === 'forge_common')?.id ??
      recipes[0].id
    )
  }

  return recipes.find((recipe) => recipe.id === 'refined_ore')?.id ?? recipes[0].id
}

// ---------------------------------------------------------------------------
// BuildingsPage
// ---------------------------------------------------------------------------

export default function BuildingsPage() {
  const [tab, setTab] = useState<TabKey>('buildings')
  const [codexSubTab, setCodexSubTab] = useState<CodexSubTab>('technique')
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
  const unlockedBuildings = useMemo(
    () => sect.buildings.filter((building) => building.unlocked && building.level > 0),
    [sect.buildings]
  )
  const buildFocus = useMemo(
    () =>
      [...unlockedBuildings]
        .sort((left, right) => {
          if (right.level !== left.level) return right.level - left.level
          return left.type === 'mainHall' ? 1 : -1
        })
        .map((building) => BUILDING_DEFS.find((def) => def.type === building.type)?.name ?? building.type)[0] ?? '主殿',
    [unlockedBuildings]
  )
  const autoAssignableCount = useMemo(
    () =>
      sect.buildings.reduce((count, building) => {
        if (!building.unlocked || building.level <= 0) return count
        if (!AUTO_ASSIGNABLE_BUILDINGS.has(building.type)) return count
        return count + getRecommendedIdleCount(building.type, sect.characters)
      }, 0),
    [sect.buildings, sect.characters]
  )
  const activeSynergies = useMemo(() => getActiveSynergies(sect.buildings), [sect.buildings])
  const activeSynergyCount = activeSynergies.length
  const activeTabMeta = availableTabs.find((item) => item.key === activeTab)

  const content =
    activeTab === 'buildings' ? (
      <BuildingsTab activeSynergies={activeSynergies} autoAssignableCount={autoAssignableCount} />
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
      <CodexSubPanel subTab={codexSubTab} onSubTabChange={setCodexSubTab} />
    ) : (
      <MarketPanel />
    )

  return (
    <div className={styles.page}>
      <PageHeader
        title="建筑"
        testId="buildings-hero"
        metrics={[
          { label: '当前重点', value: buildFocus, detail: `${unlockedBuildings.length} 处已启用` },
          { label: '建筑协同', value: activeSynergyCount, detail: '满足条件即生效' },
          { label: '可自动派驻', value: autoAssignableCount, detail: '仅安排闲置弟子' },
          { label: '当前页签', value: activeTabMeta?.label ?? '建筑', detail: `${availableTabs.length} 个分栏` },
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
// CodexSubPanel
// ---------------------------------------------------------------------------

const CODEX_SUB_TABS: { key: CodexSubTab; label: string }[] = [
  { key: 'technique', label: '功法' },
  { key: 'monster', label: '怪物' },
  { key: 'equipment', label: '装备' },
]

function CodexSubPanel({
  subTab,
  onSubTabChange,
}: {
  subTab: CodexSubTab
  onSubTabChange: (tab: CodexSubTab) => void
}) {
  return (
    <div>
      <div className={styles.tabs} style={{ marginBottom: 8 }}>
        {CODEX_SUB_TABS.map((t) => (
          <button
            key={t.key}
            className={`${styles.tab} ${subTab === t.key ? styles.tabActive : ''}`}
            onClick={() => onSubTabChange(t.key)}
          >
            <span className={styles.tabLabel}>{t.label}</span>
          </button>
        ))}
      </div>
      {subTab === 'technique' && <CodexPanel />}
      {subTab === 'monster' && <MonsterCodexPanel />}
      {subTab === 'equipment' && <EquipmentCodexPanel />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// BuildingsTab
// ---------------------------------------------------------------------------

function BuildingsTab({
  activeSynergies,
  autoAssignableCount,
}: {
  activeSynergies: ReturnType<typeof getActiveSynergies>
  autoAssignableCount: number
}) {
  const sect = useSectStore((s) => s.sect)
  const tryUpgradeBuilding = useSectStore((s) => s.tryUpgradeBuilding)
  const tryExpandBuilding = useSectStore((s) => s.tryExpandBuilding)
  const setProductionRecipe = useSectStore((s) => s.setProductionRecipe)
  const setAutomationSettings = useSectStore((s) => s.setAutomationSettings)
  const autoAssignToBuilding = useSectStore((s) => s.autoAssignToBuilding)
  const autoOptimizeBuildingAssignments = useSectStore((s) => s.autoOptimizeBuildingAssignments)
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null)
  const [drawerBuilding, setDrawerBuilding] = useState<string | null>(null)

  const mainHallLevel = sect.buildings.find((building) => building.type === 'mainHall')?.level ?? 1
  const resourceNodeCap = getBuildingNodeCap(mainHallLevel)
  const spiritField = sect.buildings.find((building) => building.type === 'spiritField')
  const spiritMine = sect.buildings.find((building) => building.type === 'spiritMine')
  const caps = calcResourceCaps(
    spiritField?.level ?? 0,
    spiritMine?.level ?? 0,
    spiritField?.count ?? 1,
    spiritMine?.count ?? 1
  )
  const stoneCap = calcSpiritStoneCap(mainHallLevel) * 5

  const resourcePressure = [
    {
      key: 'herb',
      label: '灵草库存',
      current: sect.resources.herb,
      cap: caps.herb,
      detail: sect.automationSettings.herbOverflowRule === 'sell' ? '高水位自动卖出' : '只保留库存',
    },
    {
      key: 'ore',
      label: '矿材库存',
      current: sect.resources.ore,
      cap: caps.ore,
      detail: sect.automationSettings.oreOverflowRule === 'sell' ? '高水位自动卖出' : '只保留库存',
    },
    {
      key: 'spiritStone',
      label: '灵石库存',
      current: sect.resources.spiritStone,
      cap: stoneCap,
      detail:
        sect.automationSettings.spiritStoneOverflowRule === 'buyHerb'
          ? '高水位转购灵草'
          : sect.automationSettings.spiritStoneOverflowRule === 'buyOre'
            ? '高水位转购矿材'
            : '只保留库存',
    },
  ]

  const handleUpgrade = (type: BuildingType) => {
    const result = tryUpgradeBuilding(type)
    if (result.success) {
      setMessage({ success: true, text: '升级成功' })
    } else {
      setMessage({ success: false, text: result.reason })
    }
    setTimeout(() => setMessage(null), 2000)
  }

  const handleExpand = (type: BuildingType) => {
    const result = tryExpandBuilding(type)
    if (result.success) {
      setMessage({ success: true, text: '扩建成功' })
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

  const applyProductionFocus = (focus: BuildingProductionFocus) => {
    setAutomationSettings({ productionFocus: focus })
    ;(['alchemyFurnace', 'forge'] as const).forEach((buildingType) => {
      const buildingLevel = sect.buildings.find((building) => building.type === buildingType)?.level ?? 0
      const recipeId = getPresetRecipeId(buildingType, buildingLevel, focus)
      if (recipeId !== null) {
        setProductionRecipe(buildingType, recipeId)
      }
    })

    setMessage({ success: true, text: '已切换生产倾向' })
    setTimeout(() => setMessage(null), 2000)
  }

  return (
    <div className={styles.buildingsGrid}>
      <section className={styles.controlPanel}>
        <div className={styles.controlHeader}>
          <div>
            <div className={styles.sectionTitle}>产线守护</div>
            <div className={styles.controlMeta}>保存宗门的长期运转偏好，离线时也会按这套规则处理库存高水位。</div>
          </div>
        </div>

        <div className={styles.focusGrid}>
          {PRODUCTION_FOCUS_OPTIONS.map((option) => (
            <button
              key={option.key}
              className={`${styles.focusCard} ${
                sect.automationSettings.productionFocus === option.key ? styles.focusCardActive : ''
              }`}
              onClick={() => applyProductionFocus(option.key)}
            >
              <span className={styles.focusTitle}>{option.label}</span>
              <span className={styles.focusDesc}>{option.description}</span>
            </button>
          ))}
        </div>

        <div className={styles.pressureGrid}>
          {resourcePressure.map((item) => (
            <div key={item.key} className={styles.pressureCard}>
              <span className={styles.pressureLabel}>{item.label}</span>
              <span className={styles.pressureValue}>
                {Math.floor(item.current)} / {Math.floor(item.cap)}
              </span>
              <span className={styles.pressureMeta}>{item.detail}</span>
            </div>
          ))}
        </div>

        <div className={styles.overflowGrid}>
          <label className={styles.overflowField}>
            <span className={styles.overflowLabel}>预警水位</span>
            <select
              className={styles.overflowSelect}
              value={sect.automationSettings.overflowTriggerRatio}
              onChange={(event) => setAutomationSettings({ overflowTriggerRatio: Number(event.target.value) || 0.9 })}
            >
              {OVERFLOW_THRESHOLD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.overflowField}>
            <span className={styles.overflowLabel}>灵草溢出</span>
            <select
              className={styles.overflowSelect}
              value={sect.automationSettings.herbOverflowRule}
              onChange={(event) => setAutomationSettings({ herbOverflowRule: event.target.value as OverflowSellRule })}
            >
              {SELL_RULE_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.overflowField}>
            <span className={styles.overflowLabel}>矿材溢出</span>
            <select
              className={styles.overflowSelect}
              value={sect.automationSettings.oreOverflowRule}
              onChange={(event) => setAutomationSettings({ oreOverflowRule: event.target.value as OverflowSellRule })}
            >
              {SELL_RULE_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.overflowField}>
            <span className={styles.overflowLabel}>灵石高水位</span>
            <select
              className={styles.overflowSelect}
              value={sect.automationSettings.spiritStoneOverflowRule}
              onChange={(event) =>
                setAutomationSettings({ spiritStoneOverflowRule: event.target.value as SpiritStoneOverflowRule })
              }
            >
              {STONE_RULE_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className={styles.campaignSection}>
        <div className={styles.campaignSectionHeader}>
          <div className={styles.sectionTitle}>专项生产</div>
          <div className={styles.campaignSectionMeta}>
            {(() => {
              const cs = sect.automationSettings.productionCampaign
              if (cs.activeCampaign) {
                return <span className={styles.campaignActiveLabel}>{CAMPAIGN_NAMES[cs.activeCampaign]} 进行中</span>
              }
              if (cs.cooldownRemainingHours > 0) {
                return (
                  <span className={styles.campaignCooldownLabel}>冷却中 {Math.ceil(cs.cooldownRemainingHours)}h</span>
                )
              }
              return <span className={styles.campaignReadyLabel}>可启动专项</span>
            })()}
          </div>
        </div>
        <div className={styles.campaignGrid}>
          {PRODUCTION_CAMPAIGNS.map((campaign) => {
            const cs = sect.automationSettings.productionCampaign
            const isActive = cs.activeCampaign === campaign.id
            const currentArchetype = sect.currentArchetype
            const isRecommended = campaign.bestForArchetypes.includes(currentArchetype)
            return (
              <div key={campaign.id} className={styles.campaignItemCard}>
                <div className={styles.campaignItemHeader}>
                  <span className={styles.campaignItemName}>{campaign.name}</span>
                  {isRecommended && <span className={styles.campaignRecommended}>适配当前路线</span>}
                </div>
                <div className={styles.campaignItemSummary}>{campaign.summary}</div>
                <div className={styles.campaignItemDetails}>
                  <div className={styles.campaignItemBoosts}>
                    {campaign.boosts.map((b, i) => (
                      <span key={i} className={styles.campaignItemBoost}>
                        + {b}
                      </span>
                    ))}
                  </div>
                  <div className={styles.campaignItemSuppressions}>
                    {campaign.suppressions.map((s, i) => (
                      <span key={i} className={styles.campaignItemSuppression}>
                        - {s}
                      </span>
                    ))}
                  </div>
                </div>
                {isActive ? (
                  <button
                    className={styles.campaignCancelBtn}
                    onClick={() => useSectStore.getState().cancelProductionCampaign()}
                  >
                    取消专项
                  </button>
                ) : (
                  <button
                    className={styles.campaignStartBtn}
                    onClick={() => {
                      const result = useSectStore.getState().startProductionCampaign(campaign.id)
                      if (!result.success) {
                        setMessage({ success: false, text: result.reason })
                        setTimeout(() => setMessage(null), 2000)
                      }
                    }}
                  >
                    启动
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section className={styles.campaignSection}>
        <div className={styles.sectionTitle}>产线倾斜</div>
        <div className={styles.tiltSummary}>
          {(() => {
            const archetype = sect.currentArchetype
            const desc = getArchetypeDescriptor(archetype)
            const BUILDING_NAMES: Record<string, string> = {
              mainHall: '主殿',
              spiritField: '灵田',
              spiritMine: '灵矿',
              market: '坊市',
              alchemyFurnace: '丹炉',
              forge: '锻器坊',
              scriptureHall: '藏经阁',
              recruitmentPavilion: '聚仙台',
            }
            const focusNames = desc.focusBuildings.map((b) => BUILDING_NAMES[b] ?? b).join('、')

            // Derive resource tilt descriptions from archetype strengths
            const stoneTilt =
              archetype === 'swordBurst'
                ? '远征'
                : archetype === 'pillSustain'
                  ? '闭关'
                  : archetype === 'arrayGuard'
                    ? '市场'
                    : '锻造'
            const herbTilt =
              archetype === 'swordBurst'
                ? '补给'
                : archetype === 'pillSustain'
                  ? '恢复'
                  : archetype === 'arrayGuard'
                    ? '均衡'
                    : '突破'

            return (
              <>
                <div className={styles.tiltLine}>
                  <span className={styles.tiltLabel}>路线倾向</span>
                  <span className={styles.tiltValue}>{desc.name}</span>
                  <span className={styles.tiltMeta}>专注 {focusNames}</span>
                </div>
                <div className={styles.tiltLine}>
                  <span className={styles.tiltLabel}>灵石流向</span>
                  <span className={styles.tiltValue}>更偏向 {stoneTilt}</span>
                </div>
                <div className={styles.tiltLine}>
                  <span className={styles.tiltLabel}>灵草流向</span>
                  <span className={styles.tiltValue}>更偏向 {herbTilt}</span>
                </div>
              </>
            )
          })()}
        </div>
      </section>

      {autoAssignableCount > 0 && (
        <section className={styles.synergySection}>
          <div className={styles.sectionTitle}>派驻优化</div>
          <div className={styles.synergyList}>
            <div className={styles.synergyCard}>
              <div className={styles.synergyName}>自动派驻推荐弟子</div>
              <div className={styles.synergyDesc}>优先填满空位，不覆盖手工派驻。</div>
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
        const expandCost = def.expandable ? getBuildingExpandCost(def.type, building.count ?? 0) : null
        const canExpand =
          !!def.expandable &&
          isUnlocked &&
          building.level > 0 &&
          (building.count ?? 0) < resourceNodeCap &&
          !!expandCost &&
          sect.resources.spiritStone >= expandCost.spiritStone

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
            {def.expandable && isUnlocked && (
              <div className={styles.buildingHint}>
                当前 {building.count} 座 / 主殿上限 {resourceNodeCap} 座
              </div>
            )}
            {BUILDING_SPECIALTY_HINTS[def.type] && (
              <div className={styles.buildingHint}>{BUILDING_SPECIALTY_HINTS[def.type]}</div>
            )}
            {isUnlocked && AUTO_ASSIGNABLE_BUILDINGS.has(def.type) && (
              <div className={styles.buildingHint}>推荐派驻 {recommendedIdleCount} / 3</div>
            )}
            {(() => {
              const effectText = getBuildingEffectText(building)
              return effectText && <div className={styles.buildingEffect}>{effectText}</div>
            })()}
            {def.type === 'mainHall' && isUnlocked && (
              <div className={styles.buildingEffect}>灵田 / 灵矿地块上限：各 {resourceNodeCap} 座</div>
            )}
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
            {def.expandable && isUnlocked && building.level > 0 && expandCost && (
              <button
                className={`${styles.upgradeBtn} ${canExpand ? styles.upgradeReady : styles.upgradeDisabled}`}
                onClick={() => handleExpand(def.type)}
                disabled={!canExpand}
              >
                {(building.count ?? 0) >= resourceNodeCap
                  ? `主殿当前上限 ${resourceNodeCap} 座`
                  : `扩建 (${expandCost.spiritStone}灵石)`}
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
          {UNIQUE_SYNERGIES.map((synergy) => {
            const isActive = activeSynergies.some((a) => a.id === synergy.id)
            const reqProgress = synergy.requirements.map((req) => {
              const building = sect.buildings.find((b) => b.type === req.building)
              const currentLevel = building?.level ?? 0
              const name = BUILDING_DEFS.find((d) => d.type === req.building)?.name ?? req.building
              const met = currentLevel >= req.level
              return { name, currentLevel, requiredLevel: req.level, met }
            })
            const allMet = reqProgress.every((r) => r.met)
            const closeToActivation =
              !allMet &&
              reqProgress.filter((r) => r.met).length === reqProgress.length - 1 &&
              reqProgress.some((r) => !r.met && r.currentLevel === r.requiredLevel - 1)

            let cardClass = styles.synergyCard
            if (isActive) cardClass += ` ${styles.synergyActive}`
            else if (closeToActivation) cardClass += ` ${styles.synergyClose}`
            else cardClass += ` ${styles.synergyInactive}`

            return (
              <div key={synergy.id} className={cardClass}>
                <div className={styles.synergyHeader}>
                  <span className={styles.synergyName}>{synergy.name}</span>
                  <span
                    className={
                      isActive ? styles.statusActive : closeToActivation ? styles.statusClose : styles.statusInactive
                    }
                  >
                    {isActive ? '已激活' : closeToActivation ? '即将激活' : '未激活'}
                  </span>
                </div>
                <div className={styles.synergyDesc}>{synergy.description}</div>
                <div className={styles.synergyProgress}>
                  {reqProgress.map((r, i) => (
                    <span
                      key={i}
                      className={`${styles.progressItem} ${r.met ? styles.progressMet : styles.progressPending}`}
                    >
                      {r.name} Lv{r.currentLevel}/{r.requiredLevel}
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
  const [recruitedCharacter, setRecruitedCharacter] = useState<Character | null>(null)
  const [targetedQuality, setTargetedQuality] = useState<CharacterQuality>('spirit')
  const [targetedMessage, setTargetedMessage] = useState<string | null>(null)

  const maxChars = useMemo(
    () => calcMaxDisciplesByResources(sect.buildings, sect.characters, sect.activeRoute),
    [sect.buildings, sect.characters, sect.activeRoute]
  )

  const recruitmentPavilionLevel = sect.buildings.find((b) => b.type === 'recruitmentPavilion')?.level ?? 0
  const hasTargetedRecruit = recruitmentPavilionLevel >= 3

  // Targeted recruit qualities: spirit, immortal, divine (minimum)
  const targetedOptions: CharacterQuality[] = ['spirit', 'immortal', 'divine']

  const recruitCheck = canRecruit()
  const cost = getRecruitCost('common')

  const handleRecruit = () => {
    if (!recruitCheck.allowed) return
    const character = addCharacter()
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
        <span className={styles.qualityHint}>品质随宗门位阶提升</span>
      </div>

      <button
        className={`${styles.recruitBtn} ${!recruitCheck.allowed ? styles.recruitDisabled : ''}`}
        onClick={handleRecruit}
        disabled={!recruitCheck.allowed}
      >
        {!recruitCheck.allowed ? recruitCheck.reason : `招收弟子 (${cost}灵石)`}
      </button>

      {/* Targeted Recruitment Section */}
      {hasTargetedRecruit && (
        <>
          <div className={styles.targetedSection}>
            <div className={styles.targetedHeader}>定向招募</div>
            <div className={styles.targetedDesc}>锁定最低品质，压缩空招。</div>

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

        {/* Element affinity */}
        <div className={styles.recruitTalents}>
          <div className={styles.recruitTalentTitle}>五行亲和</div>
          <div className={styles.recruitTalentList}>
            <span className={styles.recruitTalent}>
              {ELEMENT_NAMES[character.elementAffinity.primary]}
              {character.elementAffinity.secondary && ` / ${ELEMENT_NAMES[character.elementAffinity.secondary]}`}
            </span>
          </div>
        </div>

        {/* Growth multipliers */}
        <div className={styles.recruitTalents}>
          <div className={styles.recruitTalentTitle}>成长倾向</div>
          <div className={styles.recruitTalentList}>
            {(['hp', 'atk', 'def', 'spd'] as const).map((key) => (
              <span key={key} className={styles.recruitTalent}>
                {key === 'hp' ? '生命' : key === 'atk' ? '攻击' : key === 'def' ? '防御' : '速度'}{' '}
                {(character.growthMultipliers[key] * 100).toFixed(0)}%
              </span>
            ))}
          </div>
        </div>

        {/* Talent affixes */}
        {(character.prefix || character.suffix) && (
          <div className={styles.recruitTalents}>
            <div className={styles.recruitTalentTitle}>天赋词缀</div>
            <div className={styles.recruitTalentList}>
              {character.prefix && <span className={styles.recruitTalent}>{character.prefix.name}</span>}
              {character.suffix && <span className={styles.recruitTalent}>{character.suffix.name}</span>}
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
