import type { Character } from '../../types/character'
import type { SectArchetype, RouteOpportunity } from '../../types/sect'
import { getCharacterDisposition } from '../character/CharacterDispositionSystem'

/** Specialty types that strongly suggest each archetype */
const ARCHETYPE_SPECIALTY_SIGNALS: Record<SectArchetype, { types: string[]; minLevel: number }> = {
  swordBurst: { types: ['combat', 'fortune'], minLevel: 2 },
  pillSustain: { types: ['alchemy', 'herbalism'], minLevel: 2 },
  arrayGuard: { types: ['comprehension', 'leadership'], minLevel: 2 },
  beastHarvest: { types: ['mining', 'forging'], minLevel: 1 },
}

/** Cultivation paths that strongly suggest each archetype */
const ARCHETYPE_PATH_SIGNALS: Record<SectArchetype, string[]> = {
  swordBurst: ['sword', 'body'],
  pillSustain: ['alchemy', 'formation'],
  arrayGuard: ['formation', 'void'],
  beastHarvest: ['beast', 'void'],
}

export interface RouteOpportunityCheck {
  triggered: boolean
  suggestedArchetype: SectArchetype | null
  reason: string
  confidence: number
}

/** Check if a character suggests a route opportunity for the sect */
export function checkRouteOpportunity(character: Character, currentArchetype: SectArchetype): RouteOpportunityCheck {
  const disposition = getCharacterDisposition(character)
  let bestArchetype: SectArchetype | null = null
  let bestScore = 0
  const reasons: string[] = []

  // Check specialty signals
  for (const [archetype, signal] of Object.entries(ARCHETYPE_SPECIALTY_SIGNALS) as Array<
    [SectArchetype, { types: string[]; minLevel: number }]
  >) {
    if (archetype === currentArchetype) continue
    const matchingSpecs = character.specialties.filter(
      (s) => signal.types.includes(s.type) && s.level >= signal.minLevel
    )
    if (matchingSpecs.length > 0) {
      const score = matchingSpecs.reduce((sum, s) => sum + s.level * 10, 0)
      if (score > bestScore) {
        bestScore = score
        bestArchetype = archetype
        reasons.push(`专长 ${matchingSpecs.map((s) => `${s.type} Lv${s.level}`).join('、')} 适合该路线`)
      }
    }
  }

  // Check cultivation path signals
  if (character.cultivationPath && character.cultivationPath !== 'none') {
    for (const [archetype, paths] of Object.entries(ARCHETYPE_PATH_SIGNALS) as Array<[SectArchetype, string[]]>) {
      if (archetype === currentArchetype) continue
      if (paths.includes(character.cultivationPath)) {
        const score = 15
        if (score > bestScore) {
          bestScore = score
          bestArchetype = archetype
          reasons.length = 0
          reasons.push(`修行方向 ${character.cultivationPath} 倾向该路线`)
        } else if (bestArchetype === archetype) {
          bestScore += score
        }
      }
    }
  }

  // Check disposition scores - high adventure suggests swordBurst, high management suggests pillSustain
  if (disposition.adventure.band === 'high' && currentArchetype !== 'swordBurst') {
    const score = disposition.adventure.score * 0.3
    if (score > bestScore) {
      bestScore = score
      bestArchetype = 'swordBurst'
      reasons.length = 0
      reasons.push(`出战价值 ${disposition.adventure.label}，适合进攻型路线`)
    }
  }
  if (disposition.management.band === 'high' && currentArchetype !== 'pillSustain') {
    const score = disposition.management.score * 0.3
    if (score > bestScore) {
      bestScore = score
      bestArchetype = 'pillSustain'
      reasons.length = 0
      reasons.push(`留守价值 ${disposition.management.label}，适合稳健型路线`)
    }
  }

  // Only trigger if score is significant
  if (bestScore < 15 || !bestArchetype) {
    return { triggered: false, suggestedArchetype: null, reason: '', confidence: 0 }
  }

  const confidence = Math.min(100, Math.floor(bestScore))
  const reason = reasons.join('；')

  return { triggered: true, suggestedArchetype: bestArchetype, reason, confidence }
}

/** Generate a route opportunity from a character check */
export function generateRouteOpportunity(
  character: Character,
  currentArchetype: SectArchetype,
  expiresAfterDays: number = 5
): RouteOpportunity | null {
  const check = checkRouteOpportunity(character, currentArchetype)
  if (!check.triggered || !check.suggestedArchetype) return null

  return {
    characterId: character.id,
    suggestedArchetype: check.suggestedArchetype,
    reason: check.reason,
    expiresAfterDays,
  }
}

/** Expire stale route opportunities based on game day */
export function expireRouteOpportunities(
  opportunities: RouteOpportunity[],
  _currentGameDay: number,
  dayCounter: number
): RouteOpportunity[] {
  // Filter out opportunities that have expired based on the day counter
  return opportunities.filter((opp) => dayCounter < opp.expiresAfterDays)
}
