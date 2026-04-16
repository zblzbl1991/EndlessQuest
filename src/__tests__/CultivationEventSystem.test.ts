import { processCultivationEvent, getCultivationEventLabel } from '../systems/cultivation/CultivationEventSystem'
import type { Character, CultivationEvent } from '../types/character'

function createCharacter(overrides?: Partial<Character>): Character {
  return {
    id: '1',
    name: 'test',
    title: 'disciple',
    quality: 'common',
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
    learnedTechniques: [],
    equippedGear: [null, null, null, null, null, null, null, null, null],
    equippedSkills: [null, null, null, null, null],
    backpack: [],
    maxBackpackSlots: 20,
    petIds: [],
    talents: [],
    status: 'idle',
    injuryTimer: 0,
    createdAt: Date.now(),
    totalCultivation: 0,
    specialties: [],
    assignedBuilding: null,
    cultivationPath: 'none',
    investedSpiritStone: 0,
    techniqueComprehension: {},
    ...overrides,
  }
}

describe('CultivationEventSystem', () => {
  describe('getCultivationEventLabel', () => {
    it('should return Chinese labels for event types', () => {
      expect(getCultivationEventLabel('epiphany')).toBe('顿悟')
      expect(getCultivationEventLabel('bottleneck')).toBe('瓶颈')
      expect(getCultivationEventLabel('spirit_dissipation')).toBe('散灵期')
    })
  })

  describe('processCultivationEvent', () => {
    it('should return no event and multiplier 1 when no event active and no roll', () => {
      // With no event active, we test the default no-event path
      // Since rolling is random, we test the default state
      const char = createCharacter()
      let foundNoEvent = false
      for (let i = 0; i < 1000; i++) {
        const result = processCultivationEvent(char, 5, 1)
        if (!result.event && result.cultivationMultiplier === 1 && result.extraCultivation === 0) {
          foundNoEvent = true
          expect(result.eventStarted).toBe(false)
          expect(result.eventEnded).toBe(false)
          expect(result.message).toBeNull()
          break
        }
      }
      expect(foundNoEvent).toBe(true)
    })

    it('should process active bottleneck event (0 cultivation)', () => {
      const event: CultivationEvent = { type: 'bottleneck', remainingTicks: 100 }
      const char = createCharacter({ cultivationEvent: event })
      const result = processCultivationEvent(char, 5, 1)

      expect(result.event).toBeDefined()
      expect(result.event!.type).toBe('bottleneck')
      expect(result.event!.remainingTicks).toBe(99)
      expect(result.cultivationMultiplier).toBe(0)
      expect(result.extraCultivation).toBe(0)
      expect(result.eventStarted).toBe(false)
      expect(result.eventEnded).toBe(false)
    })

    it('should end bottleneck when remainingTicks reaches 0 and start acceleration', () => {
      const event: CultivationEvent = { type: 'bottleneck', remainingTicks: 1 }
      const char = createCharacter({ cultivationEvent: event })
      const result = processCultivationEvent(char, 5, 1)

      // Bottleneck ends -> enters acceleration phase with negative remainingTicks
      expect(result.eventEnded).toBe(true)
      expect(result.message).toContain('突破瓶颈')
      expect(result.event).toBeDefined()
      expect(result.event!.type).toBe('bottleneck')
      expect(result.event!.remainingTicks).toBe(-30) // Acceleration phase starts
    })

    it('should apply acceleration after bottleneck ends', () => {
      // Acceleration phase: negative remainingTicks
      const event: CultivationEvent = { type: 'bottleneck', remainingTicks: -30 }
      const char = createCharacter({ cultivationEvent: event })
      const result = processCultivationEvent(char, 5, 1)

      expect(result.event).toBeDefined()
      expect(result.event!.type).toBe('bottleneck')
      expect(result.event!.remainingTicks).toBe(-29)
      expect(result.cultivationMultiplier).toBe(1.5) // Acceleration
    })

    it('should end acceleration when negative remainingTicks reaches 0', () => {
      const event: CultivationEvent = { type: 'bottleneck', remainingTicks: -1 }
      const char = createCharacter({ cultivationEvent: event })
      const result = processCultivationEvent(char, 5, 1)

      expect(result.event).toBeUndefined()
      expect(result.eventEnded).toBe(true)
    })

    it('should process active spirit_dissipation event (-30% rate)', () => {
      const event: CultivationEvent = { type: 'spirit_dissipation', remainingTicks: 200 }
      const char = createCharacter({ cultivationEvent: event })
      const result = processCultivationEvent(char, 5, 1)

      expect(result.event).toBeDefined()
      expect(result.event!.type).toBe('spirit_dissipation')
      expect(result.event!.remainingTicks).toBe(199)
      expect(result.cultivationMultiplier).toBe(0.7)
      expect(result.extraCultivation).toBe(0)
    })

    it('should end spirit_dissipation when remainingTicks reaches 0', () => {
      const event: CultivationEvent = { type: 'spirit_dissipation', remainingTicks: 1 }
      const char = createCharacter({ cultivationEvent: event })
      const result = processCultivationEvent(char, 5, 1)

      expect(result.eventEnded).toBe(true)
      expect(result.message).toContain('散灵期结束')
    })

    it('should trigger epiphany with extra cultivation burst', () => {
      // Statistical test: epiphany has 0.3% chance per tick
      // Run many iterations to find at least one
      const char = createCharacter()
      let foundEpiphany = false
      for (let i = 0; i < 50000; i++) {
        const result = processCultivationEvent(char, 5, 1)
        if (result.extraCultivation > 0 && result.eventStarted && result.eventEnded) {
          foundEpiphany = true
          expect(result.message).toContain('顿悟')
          // Extra cultivation should be 5-30 minutes worth
          // At rate 5/s, that's 5*60*5=1500 to 5*60*30=9000
          expect(result.extraCultivation).toBeGreaterThanOrEqual(5 * 60 * 5)
          expect(result.extraCultivation).toBeLessThanOrEqual(5 * 60 * 30)
          expect(result.event).toBeUndefined() // Epiphany is instant, no ongoing event
          break
        }
      }
      expect(foundEpiphany).toBe(true)
    })

    it('should start bottleneck event on roll', () => {
      const char = createCharacter()
      let foundBottleneck = false
      for (let i = 0; i < 50000; i++) {
        const result = processCultivationEvent(char, 5, 1)
        if (result.eventStarted && result.event?.type === 'bottleneck') {
          foundBottleneck = true
          expect(result.cultivationMultiplier).toBe(0)
          expect(result.message).toContain('瓶颈')
          expect(result.event.remainingTicks).toBeGreaterThanOrEqual(60)
          expect(result.event.remainingTicks).toBeLessThanOrEqual(300)
          break
        }
      }
      expect(foundBottleneck).toBe(true)
    })

    it('should start spirit_dissipation event on roll', () => {
      const char = createCharacter()
      let foundDissipation = false
      for (let i = 0; i < 50000; i++) {
        const result = processCultivationEvent(char, 5, 1)
        if (result.eventStarted && result.event?.type === 'spirit_dissipation') {
          foundDissipation = true
          expect(result.cultivationMultiplier).toBe(0.7)
          expect(result.message).toContain('灵力散逸')
          expect(result.event.remainingTicks).toBeGreaterThanOrEqual(180)
          expect(result.event.remainingTicks).toBeLessThanOrEqual(600)
          break
        }
      }
      expect(foundDissipation).toBe(true)
    })

    it('higher comprehension should increase epiphany chance (statistical)', () => {
      const lowComp = createCharacter({
        cultivationStats: {
          ...createCharacter().cultivationStats,
          comprehension: 10,
        },
      })
      const highComp = createCharacter({
        cultivationStats: {
          ...createCharacter().cultivationStats,
          comprehension: 40,
        },
      })

      let lowEpiphanies = 0
      let highEpiphanies = 0
      const runs = 50000

      for (let i = 0; i < runs; i++) {
        const lowResult = processCultivationEvent(lowComp, 5, 1)
        if (lowResult.extraCultivation > 0) lowEpiphanies++

        const highResult = processCultivationEvent(highComp, 5, 1)
        if (highResult.extraCultivation > 0) highEpiphanies++
      }

      // Higher comprehension should trigger more epiphanies
      expect(highEpiphanies).toBeGreaterThan(lowEpiphanies)
    })

    it('should return default when no event is active', () => {
      // Test the path where no event is active and no new event rolls
      const char = createCharacter({ cultivationEvent: undefined })
      const result = processCultivationEvent(char, 5, 1)
      // When no event is active, result has no event and multiplier is 1
      expect(result.cultivationMultiplier).toBe(1)
    })
  })
})
