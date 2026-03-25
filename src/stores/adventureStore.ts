import { create } from 'zustand'
import type { Dungeon, DungeonRun, DungeonFloor, Resources, AnyItem } from '../types'
import { useSectStore } from './sectStore'
import { DUNGEONS } from '../data/events'
import { generateDungeonRun } from '../systems/roguelike/MapGenerator'
import { resolveEvent } from '../systems/roguelike/EventSystem'
import type { CombatUnit } from '../systems/combat/CombatEngine'
import { createCharacterCombatUnit } from '../data/enemies'
import { getTechniqueById } from '../data/techniquesTable'
import { getMaxSimultaneousRuns } from '../systems/character/CharacterEngine'

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

export interface AdventureStore {
  /** All currently active dungeon runs, keyed by run id (Record for JSON serialization) */
  activeRuns: Record<string, DungeonRun>

  /** The dungeon definitions available */
  dungeons: Dungeon[]

  /** Previously completed dungeon IDs */
  completedDungeons: string[]

  // Actions
  startRun(dungeonId: string, characterIds: string[]): DungeonRun | null
  selectRoute(runId: string, routeIndex: number): boolean
  advanceFloor(runId: string): { success: boolean; message: string }
  retreat(runId: string): void
  idleTick(runId: string, deltaSec: number): void
  tickAllIdle(deltaSec: number): void
  completeRun(runId: string): void
  failRun(runId: string): void
  getRun(id: string): DungeonRun | undefined
  getMaxSimultaneousRuns(): number
  reset(): void

  // Patrol
  patrolActive: boolean
  patrolProgress: number
  patrolCountToday: number
  patrolReward: number
  startPatrol(characterId: string): boolean
  tickPatrol(deltaSec: number): void
  collectPatrolReward(): void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _runCounter = 0

function generateRunId(): string {
  return 'run_' + Date.now() + '_' + (++_runCounter)
}

/** Find a dungeon by its ID */
function findDungeon(dungeonId: string): Dungeon | undefined {
  return DUNGEONS.find((d) => d.id === dungeonId)
}

/** Pick safest route index (lowest risk) from a floor */
function pickSafestRoute(floor: DungeonFloor): number {
  const riskOrder: Record<string, number> = { low: 0, medium: 1, high: 2 }
  return floor.routes.reduce(
    (best, route, idx) =>
      (riskOrder[route.riskLevel] ?? 2) < (riskOrder[floor.routes[best].riskLevel] ?? 2) ? idx : best,
    0,
  )
}

/** Empty Resources object */
function emptyResources(): Resources {
  return {
    spiritStone: 0, spiritEnergy: 0, herb: 0, ore: 0,
  }
}

/** Deposit resources into sectStore via addResource */
function depositResourcesToSect(resources: Resources): void {
  const sectStore = useSectStore.getState()
  for (const [key, value] of Object.entries(resources)) {
    if (value > 0) {
      sectStore.addResource(key as keyof Resources, value)
    }
  }
}

/** Deposit resources at a given fraction (truncated) */
function depositFractionResourcesToSect(resources: Resources, fraction: number): void {
  const sectStore = useSectStore.getState()
  for (const [key, value] of Object.entries(resources)) {
    const amount = Math.floor(value * fraction)
    if (amount > 0) {
      sectStore.addResource(key as keyof Resources, amount)
    }
  }
}

/** Deposit item rewards into sectStore vault */
function depositItemsToVault(items: AnyItem[]): void {
  const sectStore = useSectStore.getState()
  for (const item of items) {
    sectStore.addToVault(item)
  }
}

/** Get the sect's effective level from mainHall building */
function getSectLevel(): number {
  const { sect } = useSectStore.getState()
  const mainHall = sect.buildings.find((b) => b.type === 'mainHall')
  const mainHallLevel = mainHall?.level ?? 1
  // Derive sect level from mainHall level (matches CharacterEngine.calcSectLevel)
  const table = [1, 3, 5, 8, 10]
  let level = 1
  for (let i = 0; i < table.length; i++) {
    if (mainHallLevel >= table[i]) level = i + 1
    else break
  }
  return level
}

/** Build CombatUnits from alive team members in a run */
function buildAliveTeamUnits(run: DungeonRun): CombatUnit[] {
  const { sect } = useSectStore.getState()
  const units: CombatUnit[] = []

  for (const charId of run.teamCharacterIds) {
    const memberState = run.memberStates[charId]
    if (!memberState || memberState.status === 'dead') continue

    const character = sect.characters.find((c) => c.id === charId)
    if (!character) continue

    const technique = character.currentTechnique
      ? getTechniqueById(character.currentTechnique) ?? null
      : null

    const unit = createCharacterCombatUnit(character, technique)
    // Override HP with current member state HP (not max)
    unit.hp = memberState.currentHp
    units.push(unit)
  }

  return units
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const useAdventureStore = create<AdventureStore>((set, get) => ({
  activeRuns: {},
  dungeons: DUNGEONS,
  completedDungeons: [],
  patrolActive: false,
  patrolProgress: 0,
  patrolCountToday: 0,
  patrolReward: 0,

  startRun: (dungeonId, characterIds) => {
    const state = get()
    const dungeon = findDungeon(dungeonId)
    if (!dungeon) return null

    // 1. Check active run count
    const maxRuns = state.getMaxSimultaneousRuns()
    if (Object.keys(state.activeRuns).length >= maxRuns) return null

    // 2. Check team size (1-5)
    if (characterIds.length < 1 || characterIds.length > 5) return null

    const sectStore = useSectStore.getState()
    const { sect } = sectStore

    // 3. Validate each character
    const memberStates: DungeonRun['memberStates'] = {}
    for (const charId of characterIds) {
      const character = sect.characters.find((c) => c.id === charId)
      if (!character) return null

      // Check status: must be cultivating or resting (not adventuring)
      if (character.status !== 'cultivating' && character.status !== 'resting') return null

      // Check not already in another run
      for (const run of Object.values(state.activeRuns)) {
        if (run.teamCharacterIds.includes(charId)) return null
      }

      // Build combat unit for HP calculation
      const technique = character.currentTechnique
        ? getTechniqueById(character.currentTechnique) ?? null
        : null
      const unit = createCharacterCombatUnit(character, technique)

      memberStates[charId] = {
        currentHp: unit.maxHp,
        maxHp: unit.maxHp,
        status: 'alive',
      }
    }

    // 6. Set all character statuses to 'adventuring'
    for (const charId of characterIds) {
      sectStore.setCharacterStatus(charId, 'adventuring')
    }

    // 7. Generate dungeon floors
    const floors = generateDungeonRun(dungeon)

    // 8. Create run
    const runId = generateRunId()
    const run: DungeonRun = {
      id: runId,
      dungeonId,
      teamCharacterIds: [...characterIds],
      currentFloor: 1,
      floors,
      memberStates,
      totalRewards: emptyResources(),
      itemRewards: [],
      eventLog: [{ timestamp: Date.now(), message: `进入${dungeon.name}` }],
      status: 'active',
    }

    set((s) => ({
      activeRuns: { ...s.activeRuns, [runId]: run },
    }))

    return run
  },

  selectRoute: (runId, routeIndex) => {
    const state = get()
    const run = state.activeRuns[runId]
    if (!run || run.status !== 'active') return false

    const floor = run.floors[run.currentFloor - 1]
    if (!floor) return false

    if (routeIndex < 0 || routeIndex >= floor.routes.length) return false

    // Get alive team
    const aliveUnits = buildAliveTeamUnits(run)
    if (aliveUnits.length === 0) {
      get().failRun(runId)
      return false
    }

    const route = floor.routes[routeIndex]
    const newMemberStates = { ...run.memberStates }
    const newRewards = { ...run.totalRewards }
    const newItemRewards = [...run.itemRewards]
    const newLog = [...run.eventLog]

    // Resolve all events on the route
    for (const event of route.events) {
      // Rebuild alive team from updated states
      const currentUnits = buildAliveTeamUnits({ ...run, memberStates: newMemberStates })
      if (currentUnits.length === 0) break

      const result = resolveEvent(event, currentUnits, run.currentFloor)

      // Apply HP changes to member states
      for (const charId of run.teamCharacterIds) {
        const hpChange = result.hpChanges[charId]
        if (hpChange === undefined) continue
        const ms = newMemberStates[charId]
        if (!ms || ms.status === 'dead') continue

        ms.currentHp = Math.max(0, Math.min(ms.maxHp, ms.currentHp + hpChange))
        if (ms.currentHp <= 0) {
          ms.status = 'dead'
        } else if (ms.currentHp < ms.maxHp * 0.3) {
          ms.status = 'wounded'
        }
      }

      // Accumulate rewards
      newRewards.spiritStone += result.reward.spiritStone
      newRewards.herb += result.reward.herb
      newRewards.ore += result.reward.ore

      // Accumulate item rewards
      for (const item of result.itemRewards) {
        newItemRewards.push(item)
      }

      // Log entry
      newLog.push({
        timestamp: Date.now(),
        message: result.message,
      })
    }

    // Check if all members are dead
    const allDead = run.teamCharacterIds.every(
      (cid) => newMemberStates[cid]?.status === 'dead',
    )
    if (allDead) {
      // Update run state before failing
      set((s) => ({
        activeRuns: {
          ...s.activeRuns,
          [runId]: {
            ...s.activeRuns[runId]!,
            memberStates: newMemberStates,
            totalRewards: newRewards,
            itemRewards: newItemRewards,
            eventLog: newLog,
          },
        },
      }))
      get().failRun(runId)
      return false
    }

    // Increment currentFloor
    const nextFloor = run.currentFloor + 1

    // If next floor exceeds total floors, complete the run
    if (nextFloor > run.floors.length) {
      set((s) => ({
        activeRuns: {
          ...s.activeRuns,
          [runId]: {
            ...s.activeRuns[runId]!,
            currentFloor: nextFloor,
            memberStates: newMemberStates,
            totalRewards: newRewards,
            itemRewards: newItemRewards,
            eventLog: newLog,
          },
        },
      }))
      get().completeRun(runId)
      return true
    }

    // Update run with new floor and states
    set((s) => ({
      activeRuns: {
        ...s.activeRuns,
        [runId]: {
          ...s.activeRuns[runId]!,
          currentFloor: nextFloor,
          memberStates: newMemberStates,
          totalRewards: newRewards,
          itemRewards: newItemRewards,
          eventLog: newLog,
        },
      },
    }))

    return true
  },

  advanceFloor: (runId) => {
    const state = get()
    const run = state.activeRuns[runId]
    if (!run || run.status !== 'active') {
      return { success: false, message: '无法前进：未找到进行中的秘境' }
    }

    // Check if there are alive members
    const hasAlive = run.teamCharacterIds.some(
      (cid) => run.memberStates[cid]?.status !== 'dead',
    )
    if (!hasAlive) {
      get().failRun(runId)
      return { success: false, message: '队伍已全军覆没' }
    }

    // Check if already at or past the end
    if (run.currentFloor > run.floors.length) {
      return { success: false, message: '已到达最后一层' }
    }

    // Auto-pick safest route and resolve
    const floor = run.floors[run.currentFloor - 1]
    if (!floor) {
      return { success: false, message: '楼层不存在' }
    }

    const safestIdx = pickSafestRoute(floor)
    const success = state.selectRoute(runId, safestIdx)

    if (success) {
      return { success: true, message: '前进成功' }
    }

    // selectRoute handles failRun internally if needed
    return { success: false, message: '前进失败' }
  },

  retreat: (runId) => {
    const state = get()
    const run = state.activeRuns[runId]
    if (!run || run.status !== 'active') return

    // 1. Deposit 50% of totalRewards
    depositFractionResourcesToSect(run.totalRewards, 0.5)

    // 2. Deposit all itemRewards to vault
    depositItemsToVault(run.itemRewards)

    // 3. Set member character statuses: alive -> cultivating, wounded/dead -> resting
    const sectStore = useSectStore.getState()
    for (const charId of run.teamCharacterIds) {
      const memberState = run.memberStates[charId]
      if (!memberState) continue

      if (memberState.status === 'alive' || memberState.status === 'wounded') {
        sectStore.setCharacterStatus(charId, 'cultivating')
      } else {
        // Dead characters go to resting
        sectStore.setCharacterStatus(charId, 'resting')
      }
    }

    // 4. Remove run
    set((s) => {
      const newRuns = { ...s.activeRuns }
      delete newRuns[runId]
      return { activeRuns: newRuns }
    })
  },

  idleTick: (runId, _deltaSec) => {
    const state = get()
    const run = state.activeRuns[runId]
    if (!run || run.status !== 'active') return

    // Check if any alive member is below 30% HP -> retreat
    for (const charId of run.teamCharacterIds) {
      const ms = run.memberStates[charId]
      if (!ms || ms.status === 'dead') continue
      if (ms.currentHp < ms.maxHp * 0.3) {
        get().retreat(runId)
        return
      }
    }

    // Check if there are alive members
    const hasAlive = run.teamCharacterIds.some(
      (cid) => run.memberStates[cid]?.status !== 'dead',
    )
    if (!hasAlive) {
      get().failRun(runId)
      return
    }

    // Check if we've cleared all floors
    if (run.currentFloor > run.floors.length) {
      get().completeRun(runId)
      return
    }

    // Auto-pick safest route and advance
    const floor = run.floors[run.currentFloor - 1]
    if (!floor) return

    const safestIdx = pickSafestRoute(floor)
    state.selectRoute(runId, safestIdx)
  },

  tickAllIdle: (deltaSec) => {
    get().tickPatrol(deltaSec)
    const state = get()
    for (const runId of Object.keys(state.activeRuns)) {
      state.idleTick(runId, deltaSec)
    }
  },

  completeRun: (runId) => {
    const state = get()
    const run = state.activeRuns[runId]
    if (!run || run.status !== 'active') return

    // 1. Deposit 100% of totalRewards
    depositResourcesToSect(run.totalRewards)

    // 2. Deposit all itemRewards to vault
    depositItemsToVault(run.itemRewards)

    // 3. Set character statuses: alive/wounded -> cultivating, dead -> resting
    const sectStore = useSectStore.getState()
    for (const charId of run.teamCharacterIds) {
      const memberState = run.memberStates[charId]
      if (!memberState) continue

      if (memberState.status === 'alive' || memberState.status === 'wounded') {
        sectStore.setCharacterStatus(charId, 'cultivating')
      } else {
        sectStore.setCharacterStatus(charId, 'resting')
      }
    }

    // 4. Add to completed dungeons
    set((s) => {
      const newRuns = { ...s.activeRuns }
      delete newRuns[runId]
      return {
        activeRuns: newRuns,
        completedDungeons: s.completedDungeons.includes(run.dungeonId)
          ? s.completedDungeons
          : [...s.completedDungeons, run.dungeonId],
      }
    })
  },

  failRun: (runId) => {
    const state = get()
    const run = state.activeRuns[runId]
    if (!run || run.status !== 'active') return

    // 1. Deposit 50% of totalRewards
    depositFractionResourcesToSect(run.totalRewards, 0.5)

    // 2. Deposit all itemRewards to vault
    depositItemsToVault(run.itemRewards)

    // 3. Set ALL characters to resting (barely escaped)
    const sectStore = useSectStore.getState()
    for (const charId of run.teamCharacterIds) {
      sectStore.setCharacterStatus(charId, 'resting')
    }

    // 4. Remove run
    set((s) => {
      const newRuns = { ...s.activeRuns }
      delete newRuns[runId]
      return { activeRuns: newRuns }
    })
  },

  startPatrol: (characterId) => {
    const { sect } = useSectStore.getState()
    const char = sect.characters.find(c => c.id === characterId)
    if (!char) return false
    if (get().patrolActive) return false
    if (get().patrolCountToday >= 5) return false
    if (char.status === 'adventuring') return false

    const sectLevel = getSectLevel()
    const reward = 50 + sectLevel * 10

    set({
      patrolActive: true,
      patrolProgress: 0,
      patrolReward: reward,
    })
    useSectStore.getState().setCharacterStatus(characterId, 'adventuring')
    return true
  },

  tickPatrol: (deltaSec) => {
    if (!get().patrolActive) return
    const newProgress = get().patrolProgress + deltaSec
    if (newProgress >= 60) {
      set({ patrolProgress: 60 })
    } else {
      set({ patrolProgress: newProgress })
    }
  },

  collectPatrolReward: () => {
    const state = get()
    if (!state.patrolActive || state.patrolProgress < 60) return

    depositResourcesToSect({ spiritStone: state.patrolReward, spiritEnergy: 0, herb: 0, ore: 0 })

    // Release the character back
    const sect = useSectStore.getState()
    const adventuringChars = sect.sect.characters.filter(c => c.status === 'adventuring')
    if (adventuringChars.length > 0) {
      useSectStore.getState().setCharacterStatus(adventuringChars[0].id, 'cultivating')
    }

    set({
      patrolActive: false,
      patrolProgress: 0,
      patrolReward: 0,
      patrolCountToday: state.patrolCountToday + 1,
    })
  },

  getRun: (id) => {
    return get().activeRuns[id]
  },

  getMaxSimultaneousRuns: () => {
    const level = getSectLevel()
    return getMaxSimultaneousRuns(level)
  },

  reset: () =>
    set({
      activeRuns: {},
      completedDungeons: [],
      patrolActive: false,
      patrolProgress: 0,
      patrolCountToday: 0,
      patrolReward: 0,
    }),
}))

// ---------------------------------------------------------------------------
// Backward-compatible helper
// ---------------------------------------------------------------------------

function isDungeonUnlocked(dungeon: Dungeon, playerRealm: number, playerStage: number): boolean {
  return playerRealm > dungeon.unlockRealm
    || (playerRealm === dungeon.unlockRealm && playerStage >= dungeon.unlockStage)
}

export { isDungeonUnlocked }
