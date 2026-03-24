import { create } from 'zustand'
import type { Player, RealmStage } from '../types/player'
import { tick as cultivationTick, canBreakthrough, breakthrough as performBreakthrough } from '../systems/cultivation/CultivationEngine'

interface PlayerState {
  player: Player
  tick: (spiritEnergy: number, deltaSec: number) => { cultivationGained: number; spiritSpent: number }
  attemptBreakthrough: () => { success: boolean; newRealm: number; newStage: RealmStage; statsChanged: boolean }
  reset: () => void
}

function createInitialPlayer(): Player {
  return {
    id: 'player_1',
    name: '无名修士',
    realm: 0,
    realmStage: 0,
    cultivation: 0,
    baseStats: { hp: 100, atk: 15, def: 8, spd: 10, crit: 0.05, critDmg: 1.5 },
    cultivationStats: {
      spiritPower: 50,
      maxSpiritPower: 50,
      comprehension: 10,
      spiritualRoot: 10,
      fortune: 5,
    },
    equippedTechniques: [null, null, null],
    equippedSkills: [null, null, null, null, null],
    equippedGear: [null, null, null, null, null, null, null, null, null],
    partyPets: [null, null],
    partyDisciple: null,
  }
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  player: createInitialPlayer(),
  tick: (spiritEnergy, deltaSec) => {
    const player = get().player
    const result = cultivationTick(player, spiritEnergy, deltaSec)
    if (result.cultivationGained > 0) {
      set((s) => ({
        player: { ...s.player, cultivation: s.player.cultivation + result.cultivationGained },
      }))
    }
    return { cultivationGained: result.cultivationGained, spiritSpent: result.spiritSpent }
  },
  attemptBreakthrough: () => {
    const player = get().player
    if (!canBreakthrough(player)) {
      return { success: false, newRealm: player.realm, newStage: player.realmStage, statsChanged: false }
    }
    const result = performBreakthrough(player)
    if (result.success) {
      set((s) => ({
        player: {
          ...s.player,
          realm: result.newRealm,
          realmStage: result.newStage,
          cultivation: 0,
          baseStats: result.newStats,
        },
      }))
      return {
        success: true,
        newRealm: result.newRealm,
        newStage: result.newStage,
        statsChanged: result.newStats !== result.oldStats,
      }
    }
    return { success: false, newRealm: player.realm, newStage: player.realmStage, statsChanged: false }
  },
  reset: () => set({ player: createInitialPlayer() }),
}))
