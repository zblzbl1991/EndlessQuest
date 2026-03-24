import { create } from 'zustand'
import type { Player } from '../types/player'

interface PlayerState {
  player: Player
  updateCultivation: (amount: number) => void
  advanceStage: () => void
  advanceRealm: () => void
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

export const usePlayerStore = create<PlayerState>((set) => ({
  player: createInitialPlayer(),
  updateCultivation: (amount) =>
    set((state) => ({
      player: { ...state.player, cultivation: state.player.cultivation + amount },
    })),
  advanceStage: () =>
    set((state) => {
      const newStage = state.player.realmStage + 1
      return {
        player: { ...state.player, realmStage: newStage as 0 | 1 | 2 | 3, cultivation: 0 },
      }
    }),
  advanceRealm: () =>
    set((state) => ({
      player: { ...state.player, realm: state.player.realm + 1, realmStage: 0, cultivation: 0 },
    })),
  reset: () => set({ player: createInitialPlayer() }),
}))
