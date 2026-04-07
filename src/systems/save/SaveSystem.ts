import type { Sect, SectStats, Resources } from '../../types'
import type { SectStrategySettings, SectDarkCurrent } from '../../types/destiny'
import type { DungeonRun, AdventureReport } from '../../types'
import { useSectStore } from '../../stores/sectStore'
import { useAdventureStore } from '../../stores/adventureStore'
import type { DispatchState } from '../../stores/adventureStore'
import { useGameStore } from '../../stores/gameStore'
import { useEventLogStore } from '../../stores/eventLogStore'
import type { GameHistoryEntry } from './HistoryStore'
import { getDB } from './db'
import { migrateToItemStacks } from '../item/ItemStackUtils'
import { syncCharacterSkillLoadout } from '../../data/activeSkills'
import { BUILDING_DEFS } from '../../data/buildings'

const META_KEY = 'eq_save_meta'
const OLD_SAVE_KEY = 'endlessquest_save'

// ---------------------------------------------------------------------------
// SaveMeta v8 — stored in IndexedDB 'meta' store (keyPath: slot)
// ---------------------------------------------------------------------------

interface SaveMeta {
  slot: number
  version: 8
  lastOnlineTime: number
  sectName: string
  sectLevel: number
  resources: Sect['resources']
  techniqueCodex: string[]
  maxVaultSlots: number
  totalAdventureRuns: number
  totalBreakthroughs: number
  lastTransmissionTime: number
  sectPath: Sect['sectPath']
  activeRoute: Sect['activeRoute']
  unlockedPathNodeIds: Sect['unlockedPathNodeIds']
  pathUnlockedAt: Sect['pathUnlockedAt']
  legacy: Sect['legacy']
  stats: SectStats
  archiveMilestones: Sect['archiveMilestones']
  automationSettings?: Sect['automationSettings']
  strategySettings?: SectStrategySettings
  darkCurrent?: SectDarkCurrent
  currentGameDay?: number
  dayProgressSec?: number
}

type SavedAdventureRunRecord = {
  id: string
  kind?: 'run'
  run: DungeonRun
}

type SavedDispatchRecord = {
  id: string
  kind: 'dispatch'
  dispatch: DispatchState
}

type SavedReportRecord = {
  id: string
  kind: 'report'
  report: AdventureReport
}

type SavedCharacter = Sect['characters'][number] & {
  status?: string
  assignedBuilding?: Sect['characters'][number]['assignedBuilding']
  specialties?: Sect['characters'][number]['specialties']
  cultivationPath?: Sect['characters'][number]['cultivationPath']
  fateTags?: Sect['characters'][number]['fateTags']
}

const DEFAULT_LEGACY: Sect['legacy'] = {
  ascensionCount: 0,
  statBonus: 0,
  unlockedTechniques: [],
  unlockedDungeons: [],
}

const DEFAULT_STATS: SectStats = {
  totalSpiritStoneEarned: 0,
  totalSpiritStoneSpent: 0,
  totalBattles: 0,
  totalVictories: 0,
  totalKills: 0,
  maxFloorCleared: 0,
  totalRecruits: 0,
  totalBreakthroughAttempts: 0,
  totalBreakthroughSuccesses: 0,
  totalBuildingUpgrades: 0,
  totalAdventureRuns: 0,
  totalAdventureCompletions: 0,
  totalAdventureFailures: 0,
  totalPetCaptures: 0,
  totalPlayTime: 0,
  longestOfflineSeconds: 0,
}

const DEFAULT_RESOURCES: Resources = {
  spiritStone: 0,
  spiritEnergy: 0,
  herb: 0,
  ore: 0,
}

const DEFAULT_AUTOMATION_SETTINGS: Sect['automationSettings'] = {
  reserveSpiritStone: 300,
  reserveSpiritEnergy: 120,
  preferredDungeonId: 'lingCaoValley',
  casualtyTolerance: 'balanced',
  autoBreakthrough: true,
}

function normalizeFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function normalizeResources(resources: Partial<Resources> | undefined): Resources {
  return {
    spiritStone: normalizeFiniteNumber(resources?.spiritStone, DEFAULT_RESOURCES.spiritStone),
    spiritEnergy: normalizeFiniteNumber(resources?.spiritEnergy, DEFAULT_RESOURCES.spiritEnergy),
    herb: normalizeFiniteNumber(resources?.herb, DEFAULT_RESOURCES.herb),
    ore: normalizeFiniteNumber(resources?.ore, DEFAULT_RESOURCES.ore),
  }
}

function normalizeAutomationSettings(
  settings: Partial<Sect['automationSettings']> | undefined
): Sect['automationSettings'] {
  return {
    ...DEFAULT_AUTOMATION_SETTINGS,
    ...settings,
  }
}

function normalizeBuildings(buildings: Partial<Sect['buildings'][number]>[] | undefined): Sect['buildings'] {
  const buildingMap = new Map((buildings ?? []).map((building) => [building.type, building]))

  return BUILDING_DEFS.map((def) => {
    const saved = buildingMap.get(def.type)
    const unlocked =
      saved?.unlocked ?? (def.type === 'mainHall' || def.type === 'spiritMine' || def.type === 'spiritField')
    const level =
      typeof saved?.level === 'number'
        ? saved.level
        : def.type === 'mainHall' || def.type === 'spiritMine' || def.type === 'spiritField'
          ? 1
          : 0
    const fallbackCount = level > 0 || unlocked ? 1 : 0

    return {
      type: def.type,
      level,
      count: normalizeFiniteNumber(saved?.count, fallbackCount),
      unlocked,
      productionQueue: {
        recipeId: saved?.productionQueue?.recipeId ?? null,
        progress: normalizeFiniteNumber(saved?.productionQueue?.progress, 0),
      },
    }
  })
}

// ---------------------------------------------------------------------------
// saveGame — write sect data to per-entity stores
// ---------------------------------------------------------------------------

export async function saveGame(): Promise<void> {
  try {
    const sect = useSectStore.getState().sect
    const { activeRuns, dispatches, reports, reportDetails } = useAdventureStore.getState()
    const gameState = useGameStore.getState()
    const db = await getDB()
    const storeNames = ['meta', 'characters', 'buildings', 'vault', 'pets', 'adventure'] as const
    const tx = db.transaction(storeNames, 'readwrite')

    // Write meta
    await tx.objectStore('meta').put({
      slot: 1,
      version: 8,
      lastOnlineTime: Date.now(),
      sectName: sect.name,
      sectLevel: sect.level,
      resources: sect.resources,
      techniqueCodex: sect.techniqueCodex,
      maxVaultSlots: sect.maxVaultSlots,
      totalAdventureRuns: sect.totalAdventureRuns,
      totalBreakthroughs: sect.totalBreakthroughs,
      lastTransmissionTime: sect.lastTransmissionTime,
      sectPath: sect.sectPath,
      activeRoute: sect.activeRoute,
      unlockedPathNodeIds: sect.unlockedPathNodeIds,
      pathUnlockedAt: sect.pathUnlockedAt,
      legacy: sect.legacy,
      stats: sect.stats,
      archiveMilestones: sect.archiveMilestones,
      automationSettings: sect.automationSettings,
      strategySettings: sect.strategySettings,
      darkCurrent: sect.darkCurrent,
      currentGameDay: gameState.currentGameDay,
      dayProgressSec: gameState.dayProgressSec,
    })

    // Write characters
    const charStore = tx.objectStore('characters')
    for (const c of sect.characters) await charStore.put(c)
    const charKeys = await charStore.getAllKeys()
    for (const k of charKeys) {
      if (!sect.characters.some((c) => c.id === k)) await charStore.delete(k)
    }

    // Write buildings (keyPath is 'type', put overwrites)
    const bldgStore = tx.objectStore('buildings')
    for (const b of sect.buildings) await bldgStore.put(b)

    // Write vault items (ensure 'id' field at top level for keyPath)
    const vaultStore = tx.objectStore('vault')
    for (const s of sect.vault) await vaultStore.put({ id: s.item.id, ...s })
    const vaultKeys = await vaultStore.getAllKeys()
    const vaultItemIds = new Set(sect.vault.map((s) => s.item.id))
    for (const k of vaultKeys) {
      if (!vaultItemIds.has(k as string)) await vaultStore.delete(k)
    }

    // Write pets
    const petStore = tx.objectStore('pets')
    for (const p of sect.pets) await petStore.put(p)
    const petKeys = await petStore.getAllKeys()
    for (const k of petKeys) {
      if (!sect.pets.some((p) => p.id === k)) await petStore.delete(k)
    }

    // Write adventure runs
    const advStore = tx.objectStore('adventure')
    for (const run of Object.values(activeRuns)) {
      await advStore.put({ id: run.id, kind: 'run', run })
    }
    for (const dispatch of dispatches) {
      await advStore.put({
        id: `dispatch_${dispatch.characterId}`,
        kind: 'dispatch',
        dispatch,
      })
    }
    for (const summary of reports) {
      const report = reportDetails[summary.id]
      if (!report) continue
      await advStore.put({
        id: report.id,
        kind: 'report',
        report,
      })
    }
    const advKeys = await advStore.getAllKeys()
    const expectedAdventureKeys = new Set([
      ...Object.keys(activeRuns),
      ...dispatches.map((dispatch) => `dispatch_${dispatch.characterId}`),
      ...reports.map((report) => report.id),
    ])
    for (const k of advKeys) {
      if (!expectedAdventureKeys.has(k as string)) await advStore.delete(k)
    }

    await tx.done
  } catch (e) {
    console.error('Save failed:', e)
  }
}

// ---------------------------------------------------------------------------
// loadGame — reconstruct Sect from per-entity stores
// ---------------------------------------------------------------------------

export async function loadGame(): Promise<boolean> {
  try {
    const db = await getDB()
    const meta = (await db.get('meta', 1)) as SaveMeta | undefined

    // Clean up stale localStorage regardless
    if (localStorage.getItem(META_KEY)) localStorage.removeItem(META_KEY)
    if (localStorage.getItem(OLD_SAVE_KEY)) localStorage.removeItem(OLD_SAVE_KEY)

    if (!meta) return false

    // Version compatibility check -- placeholder for future migrations.
    // Currently v7 and below load via nullish-coalescing defaults (the
    // normalization pattern below). When a new format introduces breaking
    // changes, add migration logic before this block and bump the version.
    if (meta.version < 8) {
      // Future migration hooks go here. Existing normalization handles v7 saves.
    }

    // Read per-entity stores
    const rawCharacters = (await db.getAll('characters')) as SavedCharacter[]
    const rawBuildings = (await db.getAll('buildings')) as Partial<Sect['buildings'][number]>[]
    const rawVault = await db.getAll('vault')
    const pets = (await db.getAll('pets')) as Sect['pets']

    // Integrity check: if meta exists but all entity stores are empty, corrupted
    if (rawCharacters.length === 0 && rawBuildings.length === 0) {
      return false
    }

    const buildings = normalizeBuildings(rawBuildings)

    // Migrate vault and backpacks to ItemStack format
    const vault = migrateToItemStacks(rawVault)
    // Migrate v5→v6: cultivating/secluded → idle
    const migratedCharacters = rawCharacters.map((c) => {
      const persistedStatus = c.status as string | undefined
      if (persistedStatus === 'cultivating' || persistedStatus === 'secluded') {
        return { ...c, status: 'idle' as const }
      }
      return c
    })

    const advRecords = (await db.getAll('adventure')) as Array<
      SavedAdventureRunRecord | SavedDispatchRecord | SavedReportRecord
    >
    const dispatches: DispatchState[] = advRecords.flatMap((rec) =>
      rec.kind === 'dispatch' && 'dispatch' in rec ? [rec.dispatch] : []
    )
    const dispatchCharacterIds = new Set(dispatches.map((dispatch) => dispatch.characterId))
    const activeRunCharacterIds = new Set(advRecords.flatMap((rec) => ('run' in rec ? rec.run.teamCharacterIds : [])))
    const unlockedBuildingTypes = new Set<string>(
      buildings.filter((building) => building.unlocked).map((building) => building.type)
    )

    const characters = migratedCharacters.map((c) => {
      const recoveryDaysRemaining = normalizeFiniteNumber(c.recoveryDaysRemaining, 0)
      const rawAssignedBuilding = c.assignedBuilding ?? null
      const hasValidTrainingAssignment =
        c.status === 'training' && rawAssignedBuilding !== null && unlockedBuildingTypes.has(rawAssignedBuilding)

      let normalizedStatus = c.status
      if (c.status === 'patrolling' && !dispatchCharacterIds.has(c.id)) {
        normalizedStatus = 'idle'
      } else if (c.status === 'adventuring' && !activeRunCharacterIds.has(c.id)) {
        normalizedStatus = 'idle'
      } else if (c.status === 'training' && !hasValidTrainingAssignment) {
        normalizedStatus = 'idle'
      } else if (c.status === 'recovering' && recoveryDaysRemaining <= 0) {
        normalizedStatus = 'idle'
      }

      return syncCharacterSkillLoadout({
        ...c,
        status: normalizedStatus,
        backpack: migrateToItemStacks(c.backpack),
        specialties: c.specialties ?? [],
        assignedBuilding: normalizedStatus === 'training' && hasValidTrainingAssignment ? rawAssignedBuilding : null,
        cultivationPath: c.cultivationPath ?? 'none',
        fateTags: c.fateTags ?? [],
        recoveryDaysRemaining: normalizedStatus === 'recovering' ? recoveryDaysRemaining : 0,
        // Migration: seed techniqueComprehension for existing characters
        techniqueComprehension:
          c.techniqueComprehension && Object.keys(c.techniqueComprehension).length > 0
            ? c.techniqueComprehension
            : Object.fromEntries((c.learnedTechniques ?? []).map((techId) => [techId, 50])),
      })
    })

    const sect: Sect = {
      name: meta.sectName,
      level: meta.sectLevel,
      resources: normalizeResources(meta.resources),
      buildings: buildings ?? [],
      characters,
      vault,
      maxVaultSlots: meta.maxVaultSlots,
      pets: pets ?? [],
      totalAdventureRuns: meta.totalAdventureRuns,
      totalBreakthroughs: meta.totalBreakthroughs,
      lastTransmissionTime: meta.lastTransmissionTime,
      techniqueCodex: meta.techniqueCodex,
      offlineAccumulator: {
        resourcesGained: { spiritStone: 0, spiritEnergy: 0, herb: 0, ore: 0 },
        breakthroughs: [],
        itemsCrafted: [],
        taxIncome: 0,
      },
      sectPath: meta.sectPath ?? 'none',
      activeRoute: meta.activeRoute ?? null,
      unlockedPathNodeIds: meta.unlockedPathNodeIds ?? [],
      pathUnlockedAt: meta.pathUnlockedAt ?? null,
      legacy: meta.legacy ?? DEFAULT_LEGACY,
      archiveMilestones: meta.archiveMilestones ?? [],
      automationSettings: normalizeAutomationSettings(meta.automationSettings),
      stats: meta.stats ?? DEFAULT_STATS,
      strategySettings: meta.strategySettings ?? {
        activePolicy: 'shenji',
        activeAmplifiers: [],
        switchCooldownDays: 3,
        lastSwitchedAt: null,
      },
      darkCurrent: meta.darkCurrent ?? {
        fortune: 0,
        tribulation: 0,
        abyss: 0,
        guardian: 0,
        plunder: 0,
        afterglow: 0,
        anomaly: 0,
        lastShiftAt: null,
      },
    }

    useSectStore.setState({ sect })

    // Load adventure runs
    const activeRuns: Record<string, DungeonRun> = {}
    for (const rec of advRecords) {
      if (!('run' in rec)) continue
      activeRuns[rec.id] = {
        ...rec.run,
        pendingShopOffers: rec.run.pendingShopOffers ?? [],
        tacticalPreset: rec.run.tacticalPreset ?? 'balanced',
        blessings: rec.run.blessings ?? [],
        relics: rec.run.relics ?? [],
        branchTags: rec.run.branchTags ?? [],
        pendingBlessingOptions: rec.run.pendingBlessingOptions ?? [],
      }
    }
    const reports = advRecords
      .flatMap((rec) => (rec.kind === 'report' && 'report' in rec ? [rec.report] : []))
      .sort((a, b) => b.finishedAt - a.finishedAt)
    const reportDetails = Object.fromEntries(reports.map((report) => [report.id, report]))
    useAdventureStore.setState({
      activeRuns,
      dispatches,
      reports: reports.map((report) => ({
        id: report.id,
        dungeonId: report.dungeonId,
        teamCharacterIds: [...report.teamCharacterIds],
        strategy: report.config.automationStrategy,
        tacticalPreset: report.config.tacticalPreset,
        startedAt: report.startedAt,
        finishedAt: report.finishedAt,
        result: report.result,
        floorsCleared: report.floorsCleared,
        rewards: { ...report.rewards },
        itemRewardCount: report.itemRewards.length,
      })),
      reportDetails,
    })

    // Load event log from history store
    const historyRecords = (await db.getAll('history')) as GameHistoryEntry[]
    if (historyRecords.length > 0) {
      const events = historyRecords
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 200)
        .map((entry, index: number) => ({
          id: `hist_${entry.id ?? index}`,
          timestamp: entry.timestamp,
          type: entry.type,
          message: entry.summary,
          data: entry.data ?? {},
        }))
      useEventLogStore.setState({ events })
    }

    useGameStore.setState({
      lastOnlineTime: meta.lastOnlineTime,
      currentGameDay: normalizeFiniteNumber(meta.currentGameDay, 1),
      dayProgressSec: normalizeFiniteNumber(meta.dayProgressSec, 0),
    })

    return true
  } catch (e) {
    console.error('Load failed:', e)
    return false
  }
}

// ---------------------------------------------------------------------------
// hasSaveData — async (queries IndexedDB)
// ---------------------------------------------------------------------------

export async function hasSaveData(): Promise<boolean> {
  try {
    const db = await getDB()
    const meta = await db.get('meta', 1)
    return meta != null
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// clearSaveData — clear all stores, no localStorage
// ---------------------------------------------------------------------------

export async function clearSaveData(): Promise<void> {
  try {
    const db = await getDB()
    const tx = db.transaction(
      ['meta', 'characters', 'buildings', 'vault', 'pets', 'adventure', 'history', 'resources'],
      'readwrite'
    )
    await tx.objectStore('meta').clear()
    await tx.objectStore('characters').clear()
    await tx.objectStore('buildings').clear()
    await tx.objectStore('vault').clear()
    await tx.objectStore('pets').clear()
    await tx.objectStore('adventure').clear()
    await tx.objectStore('history').clear()
    await tx.objectStore('resources').clear()
    await tx.done
  } catch (e) {
    console.error('Clear failed:', e)
  }
}
