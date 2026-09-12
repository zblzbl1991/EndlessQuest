import type { RandomEventDef, RandomEventRarity, RandomEventResult } from '../../types/randomEvent'
import type { Sect } from '../../types'
import { RANDOM_EVENTS, EVENT_RARITY_WEIGHTS, EVENT_RARITY_NAMES } from '../../data/randomEvents'
import { getLegacyPositiveEventBias } from '../../data/legacy'
import { samplePoisson } from '../../utils/poisson'

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
function rollEvent(rarity: RandomEventRarity, positiveBias = 0): RandomEventDef {
  const candidates = RANDOM_EVENTS.filter((e) => e.rarity === rarity)
  if (candidates.length === 0) {
    // Fallback to common if the rolled rarity has no events
    return RANDOM_EVENTS.filter((e) => e.rarity === 'common')[0]
  }

  const positiveCandidates = candidates.filter((event) => event.category !== 'disaster')
  if (positiveBias > 0 && positiveCandidates.length > 0 && Math.random() < positiveBias) {
    return positiveCandidates[Math.floor(Math.random() * positiveCandidates.length)]
  }

  return candidates[Math.floor(Math.random() * candidates.length)]
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Evaluate whether a random event should trigger this tick.
 *
 * Kept for single-tick callers: delegates to evaluateRandomEventsForDelta and
 * returns the first event (if any).
 */
export function evaluateRandomEvents(sect: Sect, deltaSec: number, lastEventSec: number): RandomEventResult {
  return evaluateRandomEventsForDelta(sect, deltaSec, lastEventSec)[0] ?? noEvent()
}

/**
 * Evaluate random events over an elapsed duration.
 *
 * The expected event count scales with the duration (lambda = per-second chance
 * x deltaSec, fortune-adjusted) and is sampled from a Poisson distribution, so
 * an 8-hour offline catch-up rolls statistically the same events as 8 hours of
 * per-second ticks would. Events are capacity-limited by the minimum interval
 * so long deltas cannot trigger an absurd burst.
 */
export function evaluateRandomEventsForDelta(sect: Sect, deltaSec: number, lastEventSec: number): RandomEventResult[] {
  if (deltaSec <= 0) return []

  const currentPlayTime = sect.stats.totalPlayTime + deltaSec
  const timeSinceLastEvent = currentPlayTime - lastEventSec

  // Enforce minimum interval between events
  if (timeSinceLastEvent < MIN_EVENT_INTERVAL_SEC) {
    return []
  }

  // Capacity: first event can fire immediately, then one per minimum interval
  const maxEvents = 1 + Math.floor((deltaSec - MIN_EVENT_INTERVAL_SEC) / MIN_EVENT_INTERVAL_SEC)
  if (maxEvents < 1) return []

  // Calculate trigger chance modified by fortune
  const avgFortune = calcAvgFortune(sect)
  const fortuneBonus = 1 + (avgFortune - FORTUNE_BASELINE) * FORTUNE_SCALE_FACTOR
  const perSecondChance = BASE_TRIGGER_CHANCE * Math.max(0.5, fortuneBonus)

  const sampled = Math.min(maxEvents, samplePoisson(perSecondChance * deltaSec))
  if (sampled <= 0) return []

  const positiveBias = getLegacyPositiveEventBias(sect.legacy.ascensionCount)
  const results: RandomEventResult[] = []
  for (let i = 0; i < sampled; i++) {
    const rarity = rollRarity()
    const event = rollEvent(rarity, positiveBias)
    const rarityTag = EVENT_RARITY_NAMES[rarity]
    results.push({
      triggered: true,
      event,
      message: `[${rarityTag}] ${event.name} — ${event.description}`,
      effects: event.effects,
    })
  }
  return results
}

function noEvent(): RandomEventResult {
  return { triggered: false, event: null, message: '', effects: [] }
}

/**
 * Get a random event definition by id. Returns undefined if not found.
 */
export function getRandomEventById(id: string): RandomEventDef | undefined {
  return RANDOM_EVENTS.find((e) => e.id === id)
}
