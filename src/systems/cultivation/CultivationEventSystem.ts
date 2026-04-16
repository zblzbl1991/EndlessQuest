import type { Character, CultivationEvent, CultivationEventType } from '../../types/character'

// ---...--- Configuration ---...---

// Probability per tick (1 second) of triggering each event type
const EPIPHANY_PROBABILITY = 0.003
const BOTTLENECK_PROBABILITY = 0.002
const SPIRIT_DISSIPATION_PROBABILITY = 0.001

// Duration ranges in ticks (seconds)
const BOTTLENECK_MIN_TICKS = 60
const BOTTLENECK_MAX_TICKS = 300
const SPIRIT_DISSIPATION_MIN_TICKS = 180
const SPIRIT_DISSIPATION_MAX_TICKS = 600

// Effect magnitudes
const EPIPHANY_MIN_MINUTES = 5
const EPIPHANY_MAX_MINUTES = 30
const BOTTLENECK_ACCELERATION_TICKS = 30
const BOTTLENECK_ACCELERATION_MULTIPLIER = 1.5
const SPIRIT_DISSIPATION_RATE_MULT = 0.7

// Comprehension influence: comprehension bonus per 10 comprehension above 10
const COMPREHENSION_EPIPHANY_BONUS = 0.0005

// ---...--- Types ---...---

export interface CultivationEventResult {
  /** The active event after processing (undefined if none) */
  event: CultivationEvent | undefined
  /** Multiplier to apply to cultivation gained this tick */
  cultivationMultiplier: number
  /** Extra cultivation to add instantly (epiphany burst) */
  extraCultivation: number
  /** Whether a new event just started */
  eventStarted: boolean
  /** Whether an event just ended */
  eventEnded: boolean
  /** Description of what happened (for emit) */
  message: string | null
}

// ---...--- Pure Functions ---...---

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Roll for a new cultivation event. Only one event can be active at a time.
 * Higher comprehension slightly increases epiphany chance.
 */
function rollForEvent(character: Character): CultivationEvent | null {
  const compBonus = Math.max(0, (character.cultivationStats.comprehension - 10) * COMPREHENSION_EPIPHANY_BONUS)

  // Roll in priority order: epiphany > bottleneck > dissipation
  if (Math.random() < EPIPHANY_PROBABILITY + compBonus) {
    return { type: 'epiphany', remainingTicks: 0 } // Instant burst, no duration
  }
  if (Math.random() < BOTTLENECK_PROBABILITY) {
    return {
      type: 'bottleneck',
      remainingTicks: randomInt(BOTTLENECK_MIN_TICKS, BOTTLENECK_MAX_TICKS),
    }
  }
  if (Math.random() < SPIRIT_DISSIPATION_PROBABILITY) {
    return {
      type: 'spirit_dissipation',
      remainingTicks: randomInt(SPIRIT_DISSIPATION_MIN_TICKS, SPIRIT_DISSIPATION_MAX_TICKS),
    }
  }
  return null
}

/**
 * Process cultivation event for a character tick.
 *
 * This is a pure function: given character state and cultivation rate,
 * returns the modified event state and cultivation multiplier.
 *
 * Logic:
 * - If an event is active, tick it down and apply its effect
 * - If no event is active, roll for a new one
 * - Events do not stack -- only one active at a time
 */
export function processCultivationEvent(
  character: Character,
  cultivationRate: number,
  deltaSec: number
): CultivationEventResult {
  const activeEvent = character.cultivationEvent

  // If an event is currently active, process it
  if (activeEvent && activeEvent.remainingTicks > 0) {
    const newRemaining = activeEvent.remainingTicks - deltaSec

    switch (activeEvent.type) {
      case 'bottleneck':
        if (newRemaining > 0) {
          return {
            event: { type: 'bottleneck', remainingTicks: Math.round(newRemaining) },
            cultivationMultiplier: 0,
            extraCultivation: 0,
            eventStarted: false,
            eventEnded: false,
            message: null,
          }
        }
        // Bottleneck just ended -- transition to acceleration phase
        return {
          event: { type: 'bottleneck', remainingTicks: -BOTTLENECK_ACCELERATION_TICKS },
          cultivationMultiplier: 0, // This tick still has 0 cultivation
          extraCultivation: 0,
          eventStarted: false,
          eventEnded: true,
          message: `${character.name} 突破瓶颈，修为恢复流转`,
        }

      case 'spirit_dissipation':
        return {
          event:
            newRemaining > 0 ? { type: 'spirit_dissipation', remainingTicks: Math.round(newRemaining) } : undefined,
          cultivationMultiplier: SPIRIT_DISSIPATION_RATE_MULT,
          extraCultivation: 0,
          eventStarted: false,
          eventEnded: newRemaining <= 0,
          message: newRemaining <= 0 ? `${character.name} 散灵期结束，灵力趋于平稳` : null,
        }

      default:
        // Unknown event type, clear it
        return {
          event: undefined,
          cultivationMultiplier: 1,
          extraCultivation: 0,
          eventStarted: false,
          eventEnded: true,
          message: null,
        }
    }
  }

  // Post-bottleneck acceleration phase (remainingTicks < 0)
  if (activeEvent && activeEvent.type === 'bottleneck' && activeEvent.remainingTicks < 0) {
    const newRemaining = activeEvent.remainingTicks + deltaSec
    if (newRemaining >= 0) {
      // Acceleration ended
      return {
        event: undefined,
        cultivationMultiplier: BOTTLENECK_ACCELERATION_MULTIPLIER,
        extraCultivation: 0,
        eventStarted: false,
        eventEnded: true,
        message: null,
      }
    }
    return {
      event: { type: 'bottleneck', remainingTicks: Math.round(newRemaining) },
      cultivationMultiplier: BOTTLENECK_ACCELERATION_MULTIPLIER,
      extraCultivation: 0,
      eventStarted: false,
      eventEnded: false,
      message: null,
    }
  }

  // Clear any stale event state (non-bottleneck with remainingTicks <= 0)
  if (activeEvent) {
    return {
      event: undefined,
      cultivationMultiplier: 1,
      extraCultivation: 0,
      eventStarted: false,
      eventEnded: true,
      message: null,
    }
  }

  // No active event -- roll for a new one
  const newEvent = rollForEvent(character)
  if (!newEvent) {
    return {
      event: undefined,
      cultivationMultiplier: 1,
      extraCultivation: 0,
      eventStarted: false,
      eventEnded: false,
      message: null,
    }
  }

  // Epiphany: instant burst, no duration
  if (newEvent.type === 'epiphany') {
    const minutes = randomInt(EPIPHANY_MIN_MINUTES, EPIPHANY_MAX_MINUTES)
    const burst = cultivationRate * 60 * minutes * deltaSec
    return {
      event: undefined,
      cultivationMultiplier: 1,
      extraCultivation: burst,
      eventStarted: true,
      eventEnded: true,
      message: `${character.name} 灵光乍现，顿悟 ${minutes} 分钟修为！`,
    }
  }

  // Bottleneck or spirit dissipation: starts now
  const messages: Record<CultivationEventType, string> = {
    epiphany: '', // handled above
    bottleneck: `${character.name} 遇到瓶颈，修为停滞不前...`,
    spirit_dissipation: `${character.name} 灵力散逸，修炼效率下降`,
  }

  return {
    event: newEvent,
    cultivationMultiplier: newEvent.type === 'bottleneck' ? 0 : SPIRIT_DISSIPATION_RATE_MULT,
    extraCultivation: 0,
    eventStarted: true,
    eventEnded: false,
    message: messages[newEvent.type] ?? null,
  }
}

/**
 * Get a human-readable label for a cultivation event type.
 */
export function getCultivationEventLabel(type: CultivationEventType): string {
  const labels: Record<CultivationEventType, string> = {
    epiphany: '顿悟',
    bottleneck: '瓶颈',
    spirit_dissipation: '散灵期',
  }
  return labels[type] ?? type
}
