import { create } from 'zustand'
import type { Player, RealmStage, BaseStats } from '../types/player'
import type { Equipment } from '../types/item'
import type { TechniqueType } from '../types/skill'
import { tick as cultivationTick, canBreakthrough, breakthrough as performBreakthrough } from '../systems/cultivation/CultivationEngine'
import { getEffectiveStats } from '../systems/equipment/EquipmentEngine'
import { calcTechniqueBonuses } from '../systems/skill/SkillSystem'
import { getTechniqueById } from '../data/techniquesTable'

const TECHNIQUE_SLOT_INDEX: Record<TechniqueType, number> = {
  mental: 0, body: 1, spiritual: 2,
}

interface PlayerState {
  player: Player
  tick: (spiritEnergy: number, deltaSec: number) => { cultivationGained: number; spiritSpent: number }
  attemptBreakthrough: () => { success: boolean; newRealm: number; newStage: RealmStage; statsChanged: boolean }
  equipItem: (itemId: string, slotIndex: number) => boolean
  unequipItem: (slotIndex: number) => string | null
  equipTechnique: (techId: string, type: TechniqueType) => void
  equipSkill: (skillId: string) => void
  addCultivation: (amount: number) => void
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
  addCultivation: (amount) => {
    set((s) => ({
      player: { ...s.player, cultivation: s.player.cultivation + amount },
    }))
  },
  getEquippedItemIds: () => {
    return get().player.equippedGear
  },
  equipTechnique: (techId, type) => {
    const techniques = [...get().player.equippedTechniques]
    const slotIdx = TECHNIQUE_SLOT_INDEX[type]
    techniques[slotIdx] = techId
    set((s) => ({ player: { ...s.player, equippedTechniques: techniques } }))
  },
  equipSkill: (skillId) => {
    const skills = [...get().player.equippedSkills]
    // Find first empty slot (index 0-3 are active, 4 is ultimate)
    const emptyIdx = skills.findIndex((s) => s === null)
    if (emptyIdx !== -1) {
      skills[emptyIdx] = skillId
      set((s) => ({ player: { ...s.player, equippedSkills: skills } }))
    }
  },
  getTotalStats: (getEquipmentById) => {
    const player = get().player
    const base: BaseStats = { ...player.baseStats }

    // Apply equipment bonuses
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

    // Apply technique bonuses
    const techBonuses = calcTechniqueBonuses(player.equippedTechniques, getTechniqueById)
    if (techBonuses.hp) base.hp += techBonuses.hp
    if (techBonuses.atk) base.atk += techBonuses.atk
    if (techBonuses.def) base.def += techBonuses.def
    if (techBonuses.spd) base.spd += techBonuses.spd
    if (techBonuses.crit) base.crit = Math.round((base.crit + techBonuses.crit) * 1000) / 1000
    if (techBonuses.critDmg) base.critDmg = Math.round((base.critDmg + techBonuses.critDmg) * 100) / 100

    return base
  },
  reset: () => set({ player: createInitialPlayer() }),
}))
