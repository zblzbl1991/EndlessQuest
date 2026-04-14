import type { StateCreator } from 'zustand'
import type { SectStore } from './types'
import type { SectRiskPolicyId } from '../../types/destiny'
import type { SectArchetype, ProductionCampaign } from '../../types'
import { getPolicyProfile } from '../../data/sectRiskPolicies'
import { getCoreDiscipleIds as getCoreIds } from '../../systems/sect/CoreDiscipleSystem'
import { getCharacterDisposition } from '../../systems/character/CharacterDispositionSystem'
import { findEquipmentById } from './initial'
import { getEffectiveStats } from '../../systems/equipment/EquipmentEngine'
import { canShiftArchetype } from '../../systems/sect/SectArchetypeSystem'
import { canStartProductionCampaign } from '../../systems/sect/ProductionCampaignSystem'
import { useGameStore } from '../gameStore'

// ---...--- Helper: sum gear stat value for a character ---...---

function sumGearValue(equippedGear: (string | null)[], sect: import('../../types').Sect): number {
  let total = 0
  for (const gearId of equippedGear) {
    if (!gearId) continue
    const item = findEquipmentById(sect, gearId)
    if (!item) continue
    const eff = getEffectiveStats(item)
    total += eff.hp + eff.atk + eff.def + eff.spd + eff.crit + eff.critDmg
  }
  return total
}

// ---...--- Helper: days between two timestamps ---...---

function daysBetween(a: number, b: number): number {
  return Math.abs(b - a) / (1000 * 60 * 60 * 24)
}

export const createStrategySlice: StateCreator<SectStore, [], [], Partial<SectStore>> = (set, get) => ({
  setPolicy(policyId: SectRiskPolicyId): { success: boolean; reason: string } {
    const { sect } = get()
    const { strategySettings } = sect
    const now = Date.now()

    // Cooldown check
    if (strategySettings.lastSwitchedAt !== null) {
      const elapsed = daysBetween(strategySettings.lastSwitchedAt, now)
      if (elapsed < strategySettings.switchCooldownDays) {
        return { success: false, reason: '方针切换冷却中' }
      }
    }

    // No-op if same policy
    if (strategySettings.activePolicy === policyId) {
      set((s) => ({
        sect: {
          ...s.sect,
          strategySettings: {
            ...s.sect.strategySettings,
            lastSwitchedAt: now,
          },
        },
      }))
      return { success: true, reason: '' }
    }

    set((s) => ({
      sect: {
        ...s.sect,
        strategySettings: {
          ...s.sect.strategySettings,
          activePolicy: policyId,
          lastSwitchedAt: now,
        },
      },
    }))

    return { success: true, reason: '' }
  },

  getActivePolicy() {
    return getPolicyProfile(get().sect.strategySettings.activePolicy)
  },

  getCoreDiscipleIds(): string[] {
    const { sect } = get()
    const { activePolicy } = sect.strategySettings

    return getCoreIds(
      sect.characters,
      activePolicy,
      (char) => {
        const disposition = getCharacterDisposition(char)
        return { adventure: disposition.adventure.score, risk: disposition.risk.score }
      },
      (char) => sumGearValue(char.equippedGear, sect),
      () => 0
    )
  },

  setArchetype(archetype: SectArchetype): { success: boolean; reason: string } {
    const { sect } = get()
    const gameState = useGameStore.getState()
    const currentGameDay = gameState.currentGameDay

    const check = canShiftArchetype(sect.automationSettings.routeShift, currentGameDay, archetype)
    if (!check.canShift) {
      return { success: false, reason: check.reason }
    }

    set((s) => ({
      sect: {
        ...s.sect,
        currentArchetype: archetype,
        automationSettings: {
          ...s.sect.automationSettings,
          routeShift: {
            ...s.sect.automationSettings.routeShift,
            currentArchetype: archetype,
            lastShiftAtDay: currentGameDay,
            blendDaysRemaining: 1, // 1 day blend period
          },
        },
      },
    }))

    return { success: true, reason: '' }
  },

  startProductionCampaign(campaign: ProductionCampaign): { success: boolean; reason: string } {
    const { sect } = get()
    const gameState = useGameStore.getState()
    const currentGameDay = gameState.currentGameDay

    const check = canStartProductionCampaign(sect.automationSettings.productionCampaign, campaign)
    if (!check.canStart) {
      return { success: false, reason: check.reason }
    }

    set((s) => ({
      sect: {
        ...s.sect,
        automationSettings: {
          ...s.sect.automationSettings,
          productionCampaign: {
            activeCampaign: campaign,
            startedAtDay: currentGameDay,
            durationHours: 8,
            cooldownHours: 4,
            cooldownRemainingHours: 0,
          },
        },
      },
    }))

    return { success: true, reason: '' }
  },

  cancelProductionCampaign(): void {
    set((s) => ({
      sect: {
        ...s.sect,
        automationSettings: {
          ...s.sect.automationSettings,
          productionCampaign: {
            ...s.sect.automationSettings.productionCampaign,
            activeCampaign: null,
            startedAtDay: null,
            cooldownRemainingHours: s.sect.automationSettings.productionCampaign.cooldownHours,
          },
        },
      },
    }))
  },
})
