import type { Sect, Building } from '../../types/sect'
import type { Character } from '../../types/character'
import { BUILDING_DEFS, type BuildingDef } from '../../data/buildings'
import { IMMORTAL_REALM_INDEX } from '../../data/realms'
import { getGenesisDaoYunMult, getGenesisStartingStoneMult } from '../../data/genesisTree'
import { generateCharacter } from '../../systems/character/CharacterEngine'
import {
  getLegacyBonus,
  getLegacyTemplateCapacity,
  calcDaoYunGain,
  isAutoAscendUnlocked,
  LEGACY_REWARD_TIERS,
  getUnlockedLegacyPerks,
} from '../../data/legacy'
import { createLegacyExpeditionTemplates, ensureUnlockedExpeditionTemplates } from '../../data/expeditionTemplates'

// ---------------------------------------------------------------------------
// Ascension Report
// ---------------------------------------------------------------------------

export interface AscensionReport {
  previousAscensionCount: number
  newAscensionCount: number
  statBonus: number
  daoYunGain: number
  daoYunTotal: number
  guardianName: string | null
  unlockedTechniques: string[]
  unlockedDungeons: string[]
  unlockedPerks: string[]
}

// ---------------------------------------------------------------------------
// canAscend — check whether a sect meets all ascension conditions
// ---------------------------------------------------------------------------

export function canAscend(sect: Sect): { canAscend: boolean; reasons: string[] } {
  const reasons: string[] = []

  // Condition 1: At least 1 character who has reached 渡劫期 (realm index 8).
  // §5.1 puts the first ascension at 渡劫 — the old 化神(4) gate was a V1 relic
  // that let players ascend with a dao-yun gain of 0 under the V2 curve.
  const hasHighRealmChar = sect.characters.some((c) => c.realm >= 8)
  if (!hasHighRealmChar) {
    reasons.push('需要至少 1 名弟子达到渡劫期（境界 >= 8）')
  }

  // Condition 2: All buildings level >= 5
  // 工单 07：仙界建筑不计入——飞升条件是凡界建筑的，仙界进度（未解锁/低级）
  // 不能反过来卡住飞升本身。
  const allBuildingsLevel5 = sect.buildings
    .filter((b) => b.type !== 'immortalVein' && b.type !== 'immortalField' && b.type !== 'immortalPalace')
    .every((b) => b.level >= 5)
  if (!allBuildingsLevel5) {
    const lowBuildings = sect.buildings
      .filter((b) => b.type !== 'immortalVein' && b.type !== 'immortalField' && b.type !== 'immortalPalace')
      .filter((b) => b.level < 5)
      .map((b) => {
        const def = BUILDING_DEFS.find((d) => d.type === b.type)
        return `${def?.name ?? b.type} Lv${b.level}`
      })
      .join('、')
    reasons.push(`所有建筑需达到 5 级（未达标: ${lowBuildings}）`)
  }

  return {
    canAscend: reasons.length === 0,
    reasons,
  }
}

// ---------------------------------------------------------------------------
// performAscension — reset sect progress, apply legacy bonuses
// ---------------------------------------------------------------------------

/**
 * 护法（V2.1 工单 07 双层咬合）：
 * - 护法境界 ≥ 真仙（9）：仙界境界与修为**完整保留**——他已入仙界，飞升重置的是凡界；
 * - 护法境界 < 真仙：境界/修为归零重新出发（身份/品质/装备/功法/专长全保留），
 *   他是跨越轮回的"护法"。
 */
function pickGuardian(characters: Character[]): Character | null {
  if (characters.length === 0) return null
  return characters.reduce((best, c) => (c.realm > best.realm ? c : best), characters[0])
}

function asGuardian(char: Character): Character {
  // 仙界护法保留境界与修为；凡界护法落回炼气期
  if (char.realm >= IMMORTAL_REALM_INDEX) {
    return {
      ...char,
      status: 'idle',
      injuryTimer: 0,
      petIds: [],
    }
  }
  return {
    ...char,
    realm: 0,
    realmStage: 0,
    cultivation: 0,
    totalCultivation: 0,
    cultivationEvent: undefined,
    status: 'idle',
    injuryTimer: 0,
    petIds: [],
  }
}

export function performAscension(sect: Sect): { newSect: Sect; report: AscensionReport } {
  const newAscensionCount = sect.legacy.ascensionCount + 1
  const legacyBonus = getLegacyBonus(newAscensionCount)

  // 道韵结算（§7.2）
  const highestRealm = sect.characters.reduce((max, c) => Math.max(max, c.realm), 0)
  // 本源树"道韵凝丹/本源之海"（工单 09）：道韵获取倍率 + 开局道韵
  const daoYunGain = Math.floor(
    calcDaoYunGain(sect.stats.peakCultivationThisRun ?? 0, highestRealm, sect.legacy.ascensionCount) *
      getGenesisDaoYunMult(sect.genesisTree)
  )
  const daoYunTotal = (sect.legacy.daoYun ?? 0) + daoYunGain

  // 护法保留；无弟子时才生成新凡品
  const guardian = pickGuardian(sect.characters)
  const characters: Character[] = guardian ? [asGuardian(guardian)] : [generateCharacter('common')]

  // Starting spirit stones: x2 (1000) on first ascension, otherwise 500;
  // 本源树"造化灵蕴"（工单 09）再乘 ×10/级
  const startingSpiritStone = (newAscensionCount === 1 ? 1000 : 500) * getGenesisStartingStoneMult(sect.genesisTree)

  // Reset buildings to initial state. 仙界建筑（工单 07）飞升保留——
  // 双层咬合：飞升重置凡界，仙界进度（建筑 + 弟子境界）延续。
  const isImmortalBuilding = (def: BuildingDef) =>
    def.type === 'immortalVein' || def.type === 'immortalField' || def.type === 'immortalPalace'
  const prevBuilding = (type: string) => sect.buildings.find((b) => b.type === type)
  const buildings: Building[] = BUILDING_DEFS.map((def) => {
    if (isImmortalBuilding(def)) {
      const saved = prevBuilding(def.type)
      return {
        type: def.type,
        level: saved?.level ?? 0,
        count: saved?.count ?? 0,
        unlocked: saved?.unlocked ?? false,
        productionQueue: { recipeId: null, progress: 0 },
      }
    }
    return {
      type: def.type,
      level: def.type === 'mainHall' || def.type === 'spiritMine' || def.type === 'spiritField' ? 1 : 0,
      count: def.type === 'mainHall' || def.type === 'spiritMine' || def.type === 'spiritField' ? 1 : 0,
      unlocked: def.type === 'mainHall' || def.type === 'spiritMine' || def.type === 'spiritField',
      productionQueue: { recipeId: null, progress: 0 },
    }
  })
  const automationSettings: Sect['automationSettings'] = {
    reserveSpiritStone: 300,
    reserveSpiritEnergy: 120,
    preferredDungeonId: 'lingCaoValley',
    casualtyTolerance: 'balanced',
    autoBreakthrough: false,
    autoMajorBreakthrough: false,
    productionFocus: 'balanced',
    overflowTriggerRatio: 0.9,
    herbOverflowRule: 'sell',
    oreOverflowRule: 'sell',
    spiritStoneOverflowRule: 'buyHerb',
    activeTemplateId: 'steadyHarvest',
    expeditionTemplates: ensureUnlockedExpeditionTemplates(
      createLegacyExpeditionTemplates(newAscensionCount),
      sect.archiveMilestones,
      getLegacyTemplateCapacity(newAscensionCount)
    ),
    routeShift: {
      currentArchetype: sect.currentArchetype,
      lastShiftAtDay: null,
      shiftCooldownDays: 3,
      pendingShift: null,
      blendDaysRemaining: 0,
    },
    productionCampaign: {
      activeCampaign: null,
      startedAtDay: null,
      durationHours: 8,
      cooldownHours: 4,
      cooldownRemainingHours: 0,
    },
    templateConfidence: [],
    autoAscend: false,
    autoAscendMinDaoYun: 0,
  }

  const newSect: Sect = {
    name: sect.name,
    level: 1,
    resources: {
      spiritStone: startingSpiritStone,
      spiritEnergy: 0,
      herb: 0,
      ore: 0,
    },
    buildings,
    characters,
    vault: [],
    maxVaultSlots: 50,
    pets: [],
    // Preserve cumulative stats
    totalAdventureRuns: sect.totalAdventureRuns,
    totalBreakthroughs: sect.totalBreakthroughs,
    lastTransmissionTime: 0,
    techniqueCodex: Array.from(new Set(['qingxin', 'lieyan', 'houtu', ...legacyBonus.unlockedTechniques])),
    offlineAccumulator: {
      resourcesGained: { spiritStone: 0, spiritEnergy: 0, herb: 0, ore: 0 },
      breakthroughs: [],
      itemsCrafted: [],
      taxIncome: 0,
      lowSpiritSeconds: 0,
      kills: 0,
      equipmentGained: 0,
      equipmentSold: 0,
      dungeonRuns: 0,
      dungeonFloorsCleared: 0,
    },
    // Reset sect path
    sectPath: 'none',
    activeRoute: null,
    unlockedPathNodeIds: [],
    pathUnlockedAt: null,
    // Updated legacy (daoYun accumulates across ascensions)
    legacy: {
      ascensionCount: newAscensionCount,
      statBonus: legacyBonus.statBonus,
      daoYun: daoYunTotal,
      unlockedTechniques: legacyBonus.unlockedTechniques,
      unlockedDungeons: legacyBonus.unlockedDungeons,
    },
    // 飞升树跨飞升保留
    legacyTree: sect.legacyTree ?? {},
    // 洞天派驻跨飞升保留（工单 04；境界重置后按新 bestRealm 重新生效）
    caveHeavenAssignments: sect.caveHeavenAssignments ?? {},
    // 证道字段跨飞升保留（工单 09）
    genesis: sect.genesis ?? 0,
    daoProvingCount: sect.daoProvingCount ?? 0,
    genesisTree: sect.genesisTree ?? {},
    transcended: sect.transcended ?? false,
    // Preserve stats across ascensions, but the dao-yun peak is per-run
    stats: { ...sect.stats, peakCultivationThisRun: 0 },
    archiveMilestones: sect.archiveMilestones,
    automationSettings,
    // Preserve archetype across ascensions
    currentArchetype: sect.currentArchetype,
    // Preserve strategy settings across ascensions
    strategySettings: sect.strategySettings,
    autoRunDayCounter: 0,
    lastRandomEventTime: 0,
    monsterCodex: sect.monsterCodex,
    equipmentCodex: sect.equipmentCodex,
    routeOpportunities: [],
  }

  const report: AscensionReport = {
    previousAscensionCount: sect.legacy.ascensionCount,
    newAscensionCount,
    statBonus: legacyBonus.statBonus,
    daoYunGain,
    daoYunTotal,
    guardianName: guardian?.name ?? null,
    unlockedTechniques: legacyBonus.unlockedTechniques,
    unlockedDungeons: legacyBonus.unlockedDungeons,
    unlockedPerks: getUnlockedLegacyPerks(newAscensionCount).map((perk) => perk.name),
  }

  return { newSect, report }
}

// ---------------------------------------------------------------------------
// 自动飞升（§八）：天机推演节点 + 自动化开关 + 道韵预期门槛
// ---------------------------------------------------------------------------

export function shouldAutoAscend(sect: Sect): boolean {
  const settings = sect.automationSettings
  if (!settings.autoAscend) return false
  if (!isAutoAscendUnlocked(sect.legacyTree)) return false
  if (!canAscend(sect).canAscend) return false
  const highestRealm = sect.characters.reduce((max, c) => Math.max(max, c.realm), 0)
  const expectedGain = calcDaoYunGain(sect.stats.peakCultivationThisRun ?? 0, highestRealm, sect.legacy.ascensionCount)
  return expectedGain >= (settings.autoAscendMinDaoYun ?? 0)
}

// Re-export getLegacyBonus for convenience
export { getLegacyBonus, LEGACY_REWARD_TIERS }
