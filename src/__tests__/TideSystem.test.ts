// src/__tests__/TideSystem.test.ts

import { getTideState, formatTideCountdown, TIDE_CYCLE_LENGTH, TIDE_PHASE_NAMES } from '../systems/economy/TideSystem'
import type { TidePhase } from '../systems/economy/TideSystem'

describe('TideSystem', () => {
  describe('getTideState', () => {
    it('should return flood phase at cycle start (t=0)', () => {
      const state = getTideState(0)
      expect(state.phase).toBe('flood')
      expect(state.multipliers.spiritEnergy).toBe(1.5)
      expect(state.multipliers.herb).toBe(1.3)
      expect(state.multipliers.ore).toBe(1.0)
      expect(state.multipliers.spiritStone).toBe(1.0)
    })

    it('should return flood phase within first 600 seconds', () => {
      const state = getTideState(300)
      expect(state.phase).toBe('flood')
      expect(state.nextPhaseIn).toBe(300) // 600 - 300 = 300
    })

    it('should return ebb phase at 600 seconds', () => {
      const state = getTideState(600)
      expect(state.phase).toBe('ebb')
      expect(state.multipliers.spiritEnergy).toBe(0.7)
      expect(state.multipliers.ore).toBe(1.2)
    })

    it('should return ebb phase between 600 and 1200 seconds', () => {
      const state = getTideState(900)
      expect(state.phase).toBe('ebb')
      expect(state.nextPhaseIn).toBe(300) // 1200 - 900 = 300
    })

    it('should return still phase at 1200 seconds', () => {
      const state = getTideState(1200)
      expect(state.phase).toBe('still')
      expect(state.multipliers.spiritEnergy).toBe(1.0)
      expect(state.multipliers.herb).toBe(1.0)
      expect(state.multipliers.ore).toBe(1.0)
      expect(state.multipliers.spiritStone).toBe(1.0)
    })

    it('should return still phase between 1200 and 1800 seconds', () => {
      const state = getTideState(1500)
      expect(state.phase).toBe('still')
      expect(state.nextPhaseIn).toBe(300) // 1800 - 1500 = 300
    })

    it('should cycle back to flood after a full cycle', () => {
      const state = getTideState(TIDE_CYCLE_LENGTH)
      expect(state.phase).toBe('flood')
    })

    it('should cycle correctly after multiple cycles', () => {
      // 2 full cycles + 400 seconds = cycle position 400
      const state = getTideState(TIDE_CYCLE_LENGTH * 2 + 400)
      expect(state.phase).toBe('flood')
      expect(state.nextPhaseIn).toBe(200) // 600 - 400 = 200
    })

    it('should cycle to ebb after multiple cycles', () => {
      // 3 full cycles + 800 seconds = cycle position 800
      const state = getTideState(TIDE_CYCLE_LENGTH * 3 + 800)
      expect(state.phase).toBe('ebb')
    })

    it('should calculate nextPhaseIn correctly at flood boundary', () => {
      const state = getTideState(599)
      expect(state.phase).toBe('flood')
      expect(state.nextPhaseIn).toBe(1)
    })

    it('should calculate nextPhaseIn correctly at ebb boundary', () => {
      const state = getTideState(1199)
      expect(state.phase).toBe('ebb')
      expect(state.nextPhaseIn).toBe(1)
    })

    it('should calculate nextPhaseIn correctly at cycle boundary', () => {
      const state = getTideState(1799)
      expect(state.phase).toBe('still')
      expect(state.nextPhaseIn).toBe(1)
    })
  })

  describe('TIDE_PHASE_NAMES', () => {
    it('should have Chinese names for all phases', () => {
      expect(TIDE_PHASE_NAMES.flood).toBe('涨潮')
      expect(TIDE_PHASE_NAMES.ebb).toBe('退潮')
      expect(TIDE_PHASE_NAMES.still).toBe('平潮')
    })

    it('should cover all TidePhase values', () => {
      const phases: TidePhase[] = ['flood', 'ebb', 'still']
      for (const phase of phases) {
        expect(TIDE_PHASE_NAMES[phase]).toBeDefined()
      }
    })
  })

  describe('formatTideCountdown', () => {
    it('should format 0 seconds as 0:00', () => {
      expect(formatTideCountdown(0)).toBe('0:00')
    })

    it('should format 60 seconds as 1:00', () => {
      expect(formatTideCountdown(60)).toBe('1:00')
    })

    it('should format 90 seconds as 1:30', () => {
      expect(formatTideCountdown(90)).toBe('1:30')
    })

    it('should format 599 seconds as 9:59', () => {
      expect(formatTideCountdown(599)).toBe('9:59')
    })

    it('should format 1800 seconds as 30:00', () => {
      expect(formatTideCountdown(1800)).toBe('30:00')
    })

    it('should pad single-digit seconds', () => {
      expect(formatTideCountdown(5)).toBe('0:05')
    })
  })
})
