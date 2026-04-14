import { describe, it, expect } from 'vitest'
import { canShiftArchetype, buildArchetypeSummary, getArchetypeModifiers } from '../systems/sect/SectArchetypeSystem'
import type { RouteShiftState, SectArchetype } from '../types/sect'

const makeRouteShift = (overrides: Partial<RouteShiftState> = {}): RouteShiftState => ({
  currentArchetype: 'pillSustain',
  lastShiftAtDay: null,
  shiftCooldownDays: 3,
  pendingShift: null,
  blendDaysRemaining: 0,
  ...overrides,
})

describe('SectArchetypeSystem', () => {
  describe('canShiftArchetype', () => {
    it('allows shift when no cooldown is active', () => {
      const state = makeRouteShift()
      const result = canShiftArchetype(state, 10, 'swordBurst')
      expect(result.canShift).toBe(true)
      expect(result.reason).toBe('')
    })

    it('blocks shift to same archetype', () => {
      const state = makeRouteShift({ currentArchetype: 'pillSustain' })
      const result = canShiftArchetype(state, 10, 'pillSustain')
      expect(result.canShift).toBe(false)
      expect(result.reason).toContain('当前已是此路线')
    })

    it('blocks shift during cooldown', () => {
      const state = makeRouteShift({ lastShiftAtDay: 8 })
      const result = canShiftArchetype(state, 10, 'swordBurst')
      expect(result.canShift).toBe(false)
      expect(result.reason).toContain('冷却中')
    })

    it('allows shift after cooldown expires', () => {
      const state = makeRouteShift({ lastShiftAtDay: 5 })
      const result = canShiftArchetype(state, 10, 'swordBurst')
      expect(result.canShift).toBe(true)
    })

    it('allows shift to different archetypes', () => {
      const state = makeRouteShift()
      const archetypes: SectArchetype[] = ['swordBurst', 'arrayGuard', 'beastHarvest']
      for (const a of archetypes) {
        const result = canShiftArchetype(state, 10, a)
        expect(result.canShift).toBe(true)
      }
    })
  })

  describe('buildArchetypeSummary', () => {
    it('returns summary for pillSustain', () => {
      const summary = buildArchetypeSummary('pillSustain')
      expect(summary.name).toBe('丹道固本')
      expect(summary.summary).toBeTruthy()
      expect(summary.strengths.length).toBeGreaterThan(0)
      expect(summary.weaknesses.length).toBeGreaterThan(0)
    })

    it('returns summary for swordBurst', () => {
      const summary = buildArchetypeSummary('swordBurst')
      expect(summary.name).toBe('剑走偏锋')
    })

    it('returns summary for arrayGuard', () => {
      const summary = buildArchetypeSummary('arrayGuard')
      expect(summary.name).toBe('阵法守正')
    })

    it('returns summary for beastHarvest', () => {
      const summary = buildArchetypeSummary('beastHarvest')
      expect(summary.name).toBe('御兽拓荒')
    })
  })

  describe('getArchetypeModifiers', () => {
    it('returns modifiers for pillSustain', () => {
      const mods = getArchetypeModifiers('pillSustain')
      expect(mods.cultivationMultiplier).toBe(1.2)
      expect(mods.expeditionMultiplier).toBe(0.9)
      expect(mods.recoveryMultiplier).toBe(1.25)
    })

    it('returns modifiers for swordBurst', () => {
      const mods = getArchetypeModifiers('swordBurst')
      expect(mods.expeditionMultiplier).toBe(1.2)
      expect(mods.recoveryMultiplier).toBe(0.9)
    })

    it('returns modifiers for arrayGuard with balanced values', () => {
      const mods = getArchetypeModifiers('arrayGuard')
      expect(mods.cultivationMultiplier).toBe(1.0)
      expect(mods.expeditionMultiplier).toBe(1.0)
      expect(mods.resourceTemplateMultiplier).toBe(1.1)
    })

    it('all archetypes have valid multiplier values', () => {
      const archetypes: SectArchetype[] = ['swordBurst', 'pillSustain', 'arrayGuard', 'beastHarvest']
      for (const a of archetypes) {
        const mods = getArchetypeModifiers(a)
        expect(mods.cultivationMultiplier).toBeGreaterThan(0)
        expect(mods.expeditionMultiplier).toBeGreaterThan(0)
        expect(mods.recoveryMultiplier).toBeGreaterThan(0)
        expect(mods.resourceTemplateMultiplier).toBeGreaterThan(0)
      }
    })
  })
})
