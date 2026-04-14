import { describe, it, expect } from 'vitest'
import type { Character } from '../types/character'
import type { SectArchetype } from '../types/sect'
import {
  checkRouteOpportunity,
  generateRouteOpportunity,
  expireRouteOpportunities,
} from '../systems/sect/RouteOpportunitySystem'

function makeCharacter(overrides: Partial<Character> & { id: string; name: string }): Character {
  return {
    realm: 1,
    realmStage: 1,
    cultivation: 100,
    cultivationStats: { comprehension: 10, spiritualRoot: 10, fortune: 10 },
    baseStats: { hp: 100, atk: 10, def: 10, spd: 10, crit: 0.1, critDmg: 1.5 },
    growthMultipliers: { hp: 1, atk: 1, def: 1, spd: 1, crit: 1, critDmg: 1 },
    elementAffinity: { primary: 'metal' },
    specialties: [],
    learnedTechniques: [],
    equippedSkills: [],
    backpack: [],
    equippedGear: [],
    status: 'idle',
    cultivationPath: 'none',
    managementTier: 'support',
    automationRole: 'cultivation',
    techniqueComprehension: {},
    ...overrides,
  }
}

describe('RouteOpportunitySystem', () => {
  it('returns no opportunity for a basic character with current archetype', () => {
    const character = makeCharacter({ id: 'c1', name: 'Test' })
    const result = checkRouteOpportunity(character, 'pillSustain')
    expect(result.triggered).toBe(false)
  })

  it('triggers opportunity when character has combat specialty suggesting swordBurst', () => {
    const character = makeCharacter({
      id: 'c2',
      name: 'SwordGuy',
      specialties: [{ type: 'combat', level: 3 }],
    })
    const result = checkRouteOpportunity(character, 'pillSustain')
    expect(result.triggered).toBe(true)
    expect(result.suggestedArchetype).toBe('swordBurst')
  })

  it('triggers opportunity when character has alchemy specialty suggesting pillSustain', () => {
    const character = makeCharacter({
      id: 'c3',
      name: 'Alchemist',
      specialties: [{ type: 'alchemy', level: 2 }],
    })
    const result = checkRouteOpportunity(character, 'swordBurst')
    expect(result.triggered).toBe(true)
    expect(result.suggestedArchetype).toBe('pillSustain')
  })

  it('does not trigger for same archetype', () => {
    const character = makeCharacter({
      id: 'c4',
      name: 'SameArch',
      specialties: [{ type: 'combat', level: 3 }],
    })
    const result = checkRouteOpportunity(character, 'swordBurst')
    expect(result.triggered).toBe(false)
  })

  it('generates a route opportunity with correct fields', () => {
    const character = makeCharacter({
      id: 'c5',
      name: 'OppChar',
      specialties: [{ type: 'combat', level: 2 }],
    })
    const opportunity = generateRouteOpportunity(character, 'pillSustain', 7)
    expect(opportunity).not.toBeNull()
    expect(opportunity!.characterId).toBe('c5')
    expect(opportunity!.suggestedArchetype).toBe('swordBurst')
    expect(opportunity!.expiresAfterDays).toBe(7)
    expect(opportunity!.reason).toBeTruthy()
  })

  it('returns null when no opportunity triggered', () => {
    const character = makeCharacter({ id: 'c6', name: 'Basic' })
    const opportunity = generateRouteOpportunity(character, 'pillSustain')
    expect(opportunity).toBeNull()
  })

  it('expires opportunities based on day counter', () => {
    const opportunities = [
      { characterId: 'c1', suggestedArchetype: 'swordBurst' as SectArchetype, reason: 'test', expiresAfterDays: 3 },
      { characterId: 'c2', suggestedArchetype: 'arrayGuard' as SectArchetype, reason: 'test', expiresAfterDays: 10 },
    ]
    // Day counter at 5 should expire the first one (expiresAfterDays=3)
    const result = expireRouteOpportunities(opportunities, 5, 5)
    expect(result.length).toBe(1)
    expect(result[0].characterId).toBe('c2')
  })

  it('keeps all opportunities when day counter is low', () => {
    const opportunities = [
      { characterId: 'c1', suggestedArchetype: 'swordBurst' as SectArchetype, reason: 'test', expiresAfterDays: 5 },
    ]
    const result = expireRouteOpportunities(opportunities, 1, 1)
    expect(result.length).toBe(1)
  })
})
