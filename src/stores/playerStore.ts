import { create } from 'zustand'
import type { Player, RealmStage, BaseStats } from '../types/player'
import type { Equipment } from '../types/item'
import { tick as cultivationTick, canBreakthrough, breakthrough as performBreakthrough } from '../systems/cultivation/CultivationEngine'
import { getEffectiveStats } from '../systems/equipment/EquipmentEngine'

interface PlayerState {
  player: Player
  tick: (spiritEnergy: number, deltaSec: number) => { cultivationGained: number; spiritSpent: number }
  attemptBreakthrough: () => { success: boolean; newRealm: number; newStage: RealmStage; statsChanged: boolean }
  equipItem: (itemId: string, slotIndex: number) => boolean
  unequipItem: (slotIndex: number) => string | null
  getEquippedItemIds: () => (string | null)[]
  getTotalStats: (getEquipmentById: (id: string) => Equipment | undefined) => BaseStats
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
  equipItem: (itemId, slotIndex) => {
    const gear = [...get().player.equippedGear]
    if (slotIndex < 0 || slotIndex >= gear.length) return false
    gear[slotIndex] = itemId
    set((s) => ({ player: { ...s.player, equippedGear: gear } }))
    return true
  },
  unequipItem: (slotIndex) => {
    const gear = [...get().player.equippedGear]
    if (slotIndex < 0 || slotIndex >= gear.length) return null
    const prev = gear[slotIndex]
    gear[slotIndex] = null
    set((s) => ({ player: { ...s.player, equippedGear: gear } }))
    return prev
  },
  getEquippedItemIds: () => {
    return get().player.equippedGear
  },
  getTotalStats: (getEquipmentById) => {
    const player = get().player
    const base: BaseStats = { ...player.baseStats }

    for (const gearId of player.equippedGear) {
      if (!gearId) continue
      const item = getEquipmentById(gearId)
      if (item && item.type === 'equipment') {
        const eff = getEffectiveStats(item)
        base.hp += eff.hp
        base.atk += eff.atk
        base.def += eff.def
        base.spd += eff.spd
        base.crit = Math.round((base.crit + eff.crit) * 1000) / 1000
        base.critDmg = Math.round((base.critDmg + eff.critDmg) * 100) / 100
      }
    }

    return base
  },
  reset: () => set({ player: createInitialPlayer() }),
}))
