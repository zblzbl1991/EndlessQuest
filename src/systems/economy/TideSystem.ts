// src/systems/economy/TideSystem.ts
//
// Spirit Tide Cycle — a ~30-minute cycle that modulates resource production rates.
//
// Pure function system: given game time (total play time in seconds),
// returns the current tide phase, multipliers for each resource, and countdown
// to the next phase transition.

// ---...--- Types ---...---

export type TidePhase = 'flood' | 'ebb' | 'still'

export interface TideMultipliers {
  spiritStone: number
  spiritEnergy: number
  herb: number
  ore: number
}

export interface TideState {
  phase: TidePhase
  multipliers: TideMultipliers
  nextPhaseIn: number
}

// ---...--- Configuration ---...---

/** Total cycle length in seconds (~30 minutes). */
export const TIDE_CYCLE_LENGTH = 1800

/** Phase boundaries in seconds within the cycle. */
const FLOOD_END = 600
const EBB_END = 1200
// STILL: 1200-1800

/** Multipliers for each phase. */
const FLOOD_MULTIPLIERS: TideMultipliers = {
  spiritStone: 1.0,
  spiritEnergy: 1.5,
  herb: 1.3,
  ore: 1.0,
}

const EBB_MULTIPLIERS: TideMultipliers = {
  spiritStone: 1.0,
  spiritEnergy: 0.7,
  herb: 1.0,
  ore: 1.2,
}

const STILL_MULTIPLIERS: TideMultipliers = {
  spiritStone: 1.0,
  spiritEnergy: 1.0,
  herb: 1.0,
  ore: 1.0,
}

/** Chinese display names for tide phases. */
export const TIDE_PHASE_NAMES: Record<TidePhase, string> = {
  flood: '涨潮',
  ebb: '退潮',
  still: '平潮',
}

// ---...--- Core Logic ---...---

/**
 * Calculate the current tide state from total game play time.
 *
 * The tide is based on wall-clock-equivalent game time, using
 * sect.stats.totalPlayTime as the canonical source.
 *
 * Pure function — no store access.
 */
export function getTideState(totalPlayTimeSeconds: number): TideState {
  const cyclePosition = totalPlayTimeSeconds % TIDE_CYCLE_LENGTH

  if (cyclePosition < FLOOD_END) {
    return {
      phase: 'flood',
      multipliers: FLOOD_MULTIPLIERS,
      nextPhaseIn: FLOOD_END - cyclePosition,
    }
  }

  if (cyclePosition < EBB_END) {
    return {
      phase: 'ebb',
      multipliers: EBB_MULTIPLIERS,
      nextPhaseIn: EBB_END - cyclePosition,
    }
  }

  return {
    phase: 'still',
    multipliers: STILL_MULTIPLIERS,
    nextPhaseIn: TIDE_CYCLE_LENGTH - cyclePosition,
  }
}

/**
 * Format seconds into a human-readable countdown string.
 * Shows minutes and seconds (e.g. "12:34").
 */
export function formatTideCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
