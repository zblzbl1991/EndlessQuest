import type { RandomEventDef, RandomEventRarity, RandomEventResult } from '../../types/randomEvent'
import type { Sect } from '../../types'
import { RANDOM_EVENTS, EVENT_RARITY_WEIGHTS, EVENT_RARITY_NAMES } from '../../data/randomEvents'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Base chance per tick to trigger a random event (~50 min average = 1/3000 per tick) */
const BASE_TRIGGER_CHANCE = 1 / 3000

/** Minimum seconds between events to avoid clustering */
const MIN_EVENT_INTERVAL_SEC = 30

/**
 * Fortune stat multiplier: each point of average fortune above 10 adds 5% bonus
 * to the trigger chance. Fortune below 10 reduces it.
 */
const FORTUNE_SCALE_FACTOR = 0.05
const FORTUNE_BASELINE = 10

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Calculate the average fortune of idle characters in the sect */
function calcAvgFortune(sect: Sect): number {
  const idleChars = sect.characters.filter((c) => c.status === 'idle')
  if (idleChars.length === 0) return FORTUNE_BASELINE
  const totalFortune = idleChars.reduce((sum, c) => sum + c.cultivationStats.fortune, 0)
  return totalFortune / idleChars.length
}

/** Weighted random selection of an event rarity tier */
function rollRarity(): RandomEventRarity {
  const totalWeight = Object.values(EVENT_RARITY_WEIGHTS).reduce((a, b) => a + b, 0)
  let roll = Math.random() * totalWeight
  const tiers: RandomEventRarity[] = ['common', 'uncommon', 'rare', 'legendary']
  for (const tier of tiers) {
    roll -= EVENT_RARITY_WEIGHTS[tier]
    if (roll <= 0) return tier
  }
  return 'common'
}

/** Pick a random event of the given rarity */
function rollEvent(rarity: RandomEventRarity): RandomEventDef {
  const candidates = RANDOM_EVENTS.filter((e) => e.rarity === rarity)
  if (candidates.length === 0) {
    // Fallback to common if the rolled rarity has no events
    return RANDOM_EVENTS.filter((e) => e.rarity === 'common')[0]
  }
  return candidates[Math.floor(Math.random() * candidates.length)]
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Evaluate whether a random event should trigger this tick.
 *
 * Pure function: takes sect state + timing info, returns result.
 * Does NOT mutate any state or import stores.
 *
 * @param sect - Current sect state
 * @param deltaSec - Seconds elapsed this tick
 * @param lastEventSec - Seconds since last event (playTime when last event fired)
 * @returns RandomEventResult with trigger info and event details
 */
export function evaluateRandomEvents(sect: Sect, deltaSec: number, lastEventSec: number): RandomEventResult {
  const currentPlayTime = sect.stats.totalPlayTime + deltaSec
  const timeSinceLastEvent = currentPlayTime - lastEventSec

  // Enforce minimum interval between events
  if (timeSinceLastEvent < MIN_EVENT_INTERVAL_SEC) {
    return { triggered: false, event: null, message: '', effects: [] }
  }

  // Calculate trigger chance modified by fortune
  const avgFortune = calcAvgFortune(sect)
  const fortuneBonus = 1 + (avgFortune - FORTUNE_BASELINE) * FORTUNE_SCALE_FACTOR
  const triggerChance = BASE_TRIGGER_CHANCE * Math.max(0.5, fortuneBonus)

  // Roll for event trigger
  if (Math.random() > triggerChance) {
    return { triggered: false, event: null, message: '', effects: [] }
  }

  // Roll rarity and pick event
  const rarity = rollRarity()
  const event = rollEvent(rarity)

  // Build narrative message
  const rarityTag = EVENT_RARITY_NAMES[rarity]
  const message = `[${rarityTag}] ${event.name} — ${event.description}`

  return {
    triggered: true,
    event,
    message,
    effects: event.effects,
  }
}

/**
 * Get a random event definition by id. Returns undefined if not found.
 */
export function getRandomEventById(id: string): RandomEventDef | undefined {
  return RANDOM_EVENTS.find((e) => e.id === id)
}
