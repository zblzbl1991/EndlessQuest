import { create } from 'zustand'
import type { Dungeon, DungeonRun } from '../types/adventure'
import { DUNGEONS } from '../data/events'
import { generateDungeonRun } from '../systems/roguelike/MapGenerator'
import type { DungeonFloor, RouteNode } from '../systems/roguelike/MapGenerator'
import { resolveEvent } from '../systems/roguelike/EventSystem'
import type { EventResult } from '../systems/roguelike/EventSystem'
import type { CombatUnit } from '../systems/combat/CombatEngine'
import { createPlayerCombatUnit } from '../data/enemies'

interface AdventureState {
  // Dungeon list
  dungeons: Dungeon[]

  // Run state
  currentRun: DungeonRun | null
  floors: DungeonFloor[]
  currentFloor: number
  selectedRoute: number | null
  eventLog: EventResult[]
  totalReward: { spiritStone: number; herb: number; ore: number; fairyJade: number }
  playerHp: number
  playerMaxHp: number
  runComplete: boolean
  runVictory: boolean

  // Completed dungeons
  completedDungeons: string[]

  // Actions
  startRun: (dungeonId: string, mode: 'idle' | 'manual') => void
  selectRoute: (routeIndex: number) => void
  advanceFloor: () => void
  retreat: () => void
  endRun: () => void

  // Idle mode
  idleTick: () => void

  // Reset
  reset: () => void
}

function buildPlayerUnit(): CombatUnit {
  // Use a representative player unit based on base stats.
  // In a full implementation this would pull from playerStore.
  return createPlayerCombatUnit({
    id: 'player_1',
    name: '无名修士',
    baseStats: { hp: 100, atk: 15, def: 8, spd: 10, crit: 0.05, critDmg: 1.5 },
    totalHp: 100,
    totalAtk: 15,
    totalDef: 8,
    totalSpd: 10,
    totalCrit: 0.05,
    totalCritDmg: 1.5,
  })
}

function isDungeonUnlocked(dungeon: Dungeon, playerRealm: number, playerStage: number): boolean {
  return playerRealm > dungeon.unlockRealm
    || (playerRealm === dungeon.unlockRealm && playerStage >= dungeon.unlockStage)
}

export const useAdventureStore = create<AdventureState>((set, get) => ({
  dungeons: DUNGEONS,

  currentRun: null,
  floors: [],
  currentFloor: 0,
  selectedRoute: null,
  eventLog: [],
  totalReward: { spiritStone: 0, herb: 0, ore: 0, fairyJade: 0 },
  playerHp: 0,
  playerMaxHp: 0,
  runComplete: false,
  runVictory: false,

  completedDungeons: [],

  startRun: (dungeonId, mode) => {
    const dungeon = DUNGEONS.find((d) => d.id === dungeonId)
    if (!dungeon) return

    const floors = generateDungeonRun(dungeon)
    const player = buildPlayerUnit()

    set({
      currentRun: {
        dungeonId,
        currentLayer: 1,
        teamHp: [],
        mode,
        buffs: [],
        tempSkills: [],
        currency: 0,
        startedAt: Date.now(),
        paused: false,
      },
      floors,
      currentFloor: 1,
      selectedRoute: null,
      eventLog: [],
      totalReward: { spiritStone: 0, herb: 0, ore: 0, fairyJade: 0 },
      playerHp: player.maxHp,
      playerMaxHp: player.maxHp,
      runComplete: false,
      runVictory: false,
    })
  },

  selectRoute: (routeIndex: number) => {
    const state = get()
    if (state.runComplete) return

    const floor = state.floors[state.currentFloor - 1]
    if (!floor) return

    const route: RouteNode | undefined = floor.routes[routeIndex]
    if (!route) return

    // Build current player unit with current HP
    const player = buildPlayerUnit()
    player.hp = state.playerHp

    const newEventLog: EventResult[] = [...state.eventLog]
    let currentHp = state.playerHp
    const newReward = { ...state.totalReward }

    // Resolve all events on the route
    for (const event of route.events) {
      // Update player HP before each event
      player.hp = Math.max(0, currentHp)
      if (player.hp <= 0) break

      const result = resolveEvent(event, [player], state.currentFloor)
      newEventLog.push(result)

      // Apply rewards
      newReward.spiritStone += result.reward.spiritStone
      newReward.herb += result.reward.herb
      newReward.ore += result.reward.ore
      newReward.fairyJade += result.reward.fairyJade

      // Apply HP change (hpChanges is a Record<string, number>)
      const hpChange = result.hpChanges['player_1'] ?? 0
      currentHp = Math.max(0, Math.min(state.playerMaxHp, currentHp + hpChange))

      // If died in combat, stop processing
      if (player.hp <= 0 && !result.success) break
    }

    // Update run layer
    const newRun = state.currentRun ? { ...state.currentRun, currentLayer: state.currentFloor + 1 } : null

    set({
      eventLog: newEventLog,
      totalReward: newReward,
      playerHp: currentHp,
      selectedRoute: routeIndex,
      currentRun: newRun,
    })

    // Check if player died
    if (currentHp <= 0) {
      set({ runComplete: true, runVictory: false })
    }
  },

  advanceFloor: () => {
    const state = get()
    if (state.runComplete) return
    if (state.playerHp <= 0) {
      set({ runComplete: true, runVictory: false })
      return
    }

    const nextFloor = state.currentFloor + 1
    if (nextFloor > state.floors.length) {
      // All floors cleared - victory!
      set({ runComplete: true, runVictory: true })
      return
    }

    const newRun = state.currentRun ? { ...state.currentRun, currentLayer: nextFloor } : null

    set({
      currentFloor: nextFloor,
      selectedRoute: null,
      currentRun: newRun,
    })
  },

  retreat: () => {
    set({ runComplete: true, runVictory: false })
  },

  endRun: () => {
    const state = get()
    if (state.runVictory && state.currentRun) {
      // Mark dungeon as completed on victory
      set((s) => ({
        currentRun: null,
        floors: [],
        currentFloor: 0,
        selectedRoute: null,
        eventLog: [],
        totalReward: { spiritStone: 0, herb: 0, ore: 0, fairyJade: 0 },
        playerHp: 0,
        playerMaxHp: 0,
        runComplete: false,
        runVictory: false,
        completedDungeons: s.currentRun && s.runVictory
          ? [...s.completedDungeons, s.currentRun.dungeonId]
          : s.completedDungeons,
      }))
    } else {
      set({
        currentRun: null,
        floors: [],
        currentFloor: 0,
        selectedRoute: null,
        eventLog: [],
        totalReward: { spiritStone: 0, herb: 0, ore: 0, fairyJade: 0 },
        playerHp: 0,
        playerMaxHp: 0,
        runComplete: false,
        runVictory: false,
      })
    }
  },

  idleTick: () => {
    const state = get()
    if (!state.currentRun || state.currentRun.mode !== 'idle') return
    if (state.runComplete) return

    // If player HP is too low (< 30%), retreat
    if (state.playerHp < state.playerMaxHp * 0.3) {
      get().retreat()
      return
    }

    // If no route selected for current floor, pick safest
    if (state.selectedRoute === null) {
      const floor = state.floors[state.currentFloor - 1]
      if (!floor) return

      // Boss floor has only one route
      if (floor.isBossFloor) {
        get().selectRoute(0)
      } else {
        // Pick safest (lowest risk) route
        const riskOrder = { low: 0, medium: 1, high: 2 }
        const safestIdx = floor.routes.reduce(
          (best, route, idx) => (riskOrder[route.riskLevel] < riskOrder[floor.routes[best].riskLevel] ? idx : best),
          0,
        )
        get().selectRoute(safestIdx)
      }
      return
    }

    // Route was selected, advance floor
    get().advanceFloor()
  },

  reset: () =>
    set({
      currentRun: null,
      floors: [],
      currentFloor: 0,
      selectedRoute: null,
      eventLog: [],
      totalReward: { spiritStone: 0, herb: 0, ore: 0, fairyJade: 0 },
      playerHp: 0,
      playerMaxHp: 0,
      runComplete: false,
      runVictory: false,
      completedDungeons: [],
    }),
}))

export { isDungeonUnlocked }
