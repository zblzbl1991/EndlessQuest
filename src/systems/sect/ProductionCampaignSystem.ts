import type { ProductionCampaign, ProductionCampaignState } from '../../types/sect'
import { getCampaignDescriptor } from '../../data/productionCampaigns'

export interface CampaignModifiers {
  cultivationEfficiency: number
  forgeEfficiency: number
  recoveryEfficiency: number
  expeditionEfficiency: number
  marketEfficiency: number
}

const DEFAULT_MODIFIERS: CampaignModifiers = {
  cultivationEfficiency: 1,
  forgeEfficiency: 1,
  recoveryEfficiency: 1,
  expeditionEfficiency: 1,
  marketEfficiency: 1,
}

const CAMPAIGN_MODIFIERS: Record<ProductionCampaign, CampaignModifiers> = {
  realmSprint: {
    cultivationEfficiency: 1.3,
    forgeEfficiency: 1,
    recoveryEfficiency: 1,
    expeditionEfficiency: 0,
    marketEfficiency: 1,
  },
  forgeSprint: {
    cultivationEfficiency: 1,
    forgeEfficiency: 1.4,
    recoveryEfficiency: 1,
    expeditionEfficiency: 1,
    marketEfficiency: 1,
  },
  recoverySprint: {
    cultivationEfficiency: 1,
    forgeEfficiency: 1,
    recoveryEfficiency: 1.5,
    expeditionEfficiency: 0,
    marketEfficiency: 1,
  },
  expeditionPrep: {
    cultivationEfficiency: 0.8,
    forgeEfficiency: 1,
    recoveryEfficiency: 1,
    expeditionEfficiency: 1.1,
    marketEfficiency: 1,
  },
  marketHarvest: {
    cultivationEfficiency: 1,
    forgeEfficiency: 0,
    recoveryEfficiency: 1,
    expeditionEfficiency: 1,
    marketEfficiency: 1.25,
  },
}

/** Check whether a production campaign can be started */
export function canStartProductionCampaign(
  state: ProductionCampaignState,
  _campaign: ProductionCampaign
): { canStart: boolean; reason: string } {
  if (state.activeCampaign !== null) {
    return { canStart: false, reason: '已有进行中的专项' }
  }
  if (state.cooldownRemainingHours > 0) {
    return { canStart: false, reason: `专项冷却中，还需 ${Math.ceil(state.cooldownRemainingHours)} 小时` }
  }
  return { canStart: true, reason: '' }
}

/** Tick production campaign: advance duration or cooldown */
export function tickProductionCampaign(
  state: ProductionCampaignState,
  deltaGameHours: number
): ProductionCampaignState {
  if (state.activeCampaign !== null) {
    // Campaign is running - tick slice manages the actual countdown via game day comparison
    return state
  }

  if (state.cooldownRemainingHours > 0) {
    const newCooldown = Math.max(0, state.cooldownRemainingHours - deltaGameHours)
    return { ...state, cooldownRemainingHours: newCooldown }
  }

  return state
}

/**
 * Tick campaign duration by comparing game days elapsed since start.
 * If the campaign has expired, clear it and start cooldown.
 * Returns the updated state (pure function).
 */
export function tickCampaignDuration(state: ProductionCampaignState, currentGameDay: number): ProductionCampaignState {
  if (!state.activeCampaign) {
    // No active campaign -- just tick cooldown
    if (state.cooldownRemainingHours > 0) {
      // Approximate: 1 game day ~ 86400 / 60 = 1440 game hours, but campaign cooldown
      // is tracked in hours and ticked separately. Here we just handle the day-based expiry.
      return state
    }
    return state
  }

  const startedDay = state.startedAtDay ?? 0
  const elapsedDays = currentGameDay - startedDay
  // Convert campaign duration (in real hours) to game-day equivalent.
  // 60 real seconds = 1 game day, so 1 real hour = 60 game days.
  const durationGameDays = Math.max(1, Math.ceil((state.durationHours * 60) / 86400))

  if (elapsedDays >= durationGameDays) {
    // Campaign ended -- start cooldown
    return {
      activeCampaign: null,
      startedAtDay: null,
      durationHours: state.durationHours,
      cooldownHours: state.cooldownHours,
      cooldownRemainingHours: state.cooldownHours,
    }
  }

  return state
}

/** Get modifiers for the currently active campaign, or defaults if none */
export function getCampaignModifiers(campaign: ProductionCampaign | null): CampaignModifiers {
  if (campaign === null) return DEFAULT_MODIFIERS
  return CAMPAIGN_MODIFIERS[campaign]
}

/** Get human-readable campaign info */
export function getCampaignSummary(campaign: ProductionCampaign): {
  name: string
  summary: string
  boosts: string[]
  suppressions: string[]
} {
  const desc = getCampaignDescriptor(campaign)
  return {
    name: desc.name,
    summary: desc.summary,
    boosts: desc.boosts,
    suppressions: desc.suppressions,
  }
}
