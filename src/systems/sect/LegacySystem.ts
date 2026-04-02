import type { Sect, Building } from '../../types/sect'
import { BUILDING_DEFS } from '../../data/buildings'
import { generateCharacter } from '../../systems/character/CharacterEngine'
import { getLegacyBonus, LEGACY_REWARD_TIERS } from '../../data/legacy'

// ---------------------------------------------------------------------------
// Ascension Report
// ---------------------------------------------------------------------------

export interface AscensionReport {
  previousAscensionCount: number
  newAscensionCount: number
  statBonus: number
  unlockedTechniques: string[]
  unlockedDungeons: string[]
}

// ---------------------------------------------------------------------------
// canAscend — check whether a sect meets all ascension conditions
// ---------------------------------------------------------------------------

export function canAscend(sect: Sect): { canAscend: boolean; reasons: string[] } {
  const reasons: string[] = []

  // Condition 1: At least 1 character with realm >= 4 (化神期, index 4)
  const hasHighRealmChar = sect.characters.some((c) => c.realm >= 4)
  if (!hasHighRealmChar) {
    reasons.push('需要至少 1 名弟子达到化神期（境界 >= 4）')
  }

  // Condition 2: All buildings level >= 5
  const allBuildingsLevel5 = sect.buildings.every((b) => b.level >= 5)
  if (!allBuildingsLevel5) {
    const lowBuildings = sect.buildings
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

export function performAscension(sect: Sect): { newSect: Sect; report: AscensionReport } {
  const newAscensionCount = sect.legacy.ascensionCount + 1
  const legacyBonus = getLegacyBonus(newAscensionCount)

  // Starting spirit stones: x2 (1000) on first ascension, otherwise 500
  const startingSpiritStone = newAscensionCount === 1 ? 1000 : 500

  // Reset buildings to initial state
  const buildings: Building[] = BUILDING_DEFS.map((def) => ({
    type: def.type,
    level: def.type === 'mainHall' || def.type === 'spiritMine' || def.type === 'spiritField' ? 1 : 0,
    count: def.type === 'mainHall' || def.type === 'spiritMine' || def.type === 'spiritField' ? 1 : 0,
    unlocked: def.type === 'mainHall' || def.type === 'spiritMine' || def.type === 'spiritField',
    productionQueue: { recipeId: null, progress: 0 },
  }))
  const automationSettings: Sect['automationSettings'] = {
    enabled: true,
    targetPoolSize: 8,
    reserveSpiritStone: 300,
    reserveSpiritEnergy: 120,
    preferredDungeonId: 'lingCaoValley',
    casualtyTolerance: 'balanced',
    autoBreakthrough: true,
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
    characters: [generateCharacter('common')],
    vault: [],
    maxVaultSlots: 50,
    pets: [],
    // Preserve cumulative stats
    totalAdventureRuns: sect.totalAdventureRuns,
    totalBreakthroughs: sect.totalBreakthroughs,
    lastTransmissionTime: 0,
    techniqueCodex: ['qingxin', 'lieyan', 'houtu'],
    offlineAccumulator: {
      resourcesGained: { spiritStone: 0, spiritEnergy: 0, herb: 0, ore: 0 },
      breakthroughs: [],
      itemsCrafted: [],
      taxIncome: 0,
    },
    // Reset sect path
    sectPath: 'none',
    activeRoute: null,
    unlockedPathNodeIds: [],
    pathUnlockedAt: null,
    // Updated legacy
    legacy: {
      ascensionCount: newAscensionCount,
      statBonus: legacyBonus.statBonus,
      unlockedTechniques: legacyBonus.unlockedTechniques,
      unlockedDungeons: legacyBonus.unlockedDungeons,
    },
    // Preserve stats across ascensions
    stats: sect.stats,
    archiveMilestones: sect.archiveMilestones,
    automationSettings,
  }

  const report: AscensionReport = {
    previousAscensionCount: sect.legacy.ascensionCount,
    newAscensionCount,
    statBonus: legacyBonus.statBonus,
    unlockedTechniques: legacyBonus.unlockedTechniques,
    unlockedDungeons: legacyBonus.unlockedDungeons,
  }

  return { newSect, report }
}

// Re-export getLegacyBonus for convenience
export { getLegacyBonus, LEGACY_REWARD_TIERS }
