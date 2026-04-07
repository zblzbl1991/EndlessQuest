import { describe, expect, it } from 'vitest'
import {
  createDestinyState,
  addExposure,
  getStageFromExposure,
  getRiskLevelFromInstability,
  checkStageTransition,
  calculateShock,
  applyShockToState,
  processRunDestinyUpdates,
  calculateMatchedAmplifiers,
  EXPOSURE_GAINS,
} from '../systems/destiny/DestinySystem'
import type { DestinySeedId, SectRiskPolicyId } from '../types/destiny'

const DEFAULT_POLICY: SectRiskPolicyId = 'shenji'

describe('DestinySystem', () => {
  describe('getStageFromExposure', () => {
    it('returns seed for exposure < 40', () => {
      expect(getStageFromExposure(0)).toBe('seed')
      expect(getStageFromExposure(39)).toBe('seed')
    })

    it('returns stirring for exposure 40-89', () => {
      expect(getStageFromExposure(40)).toBe('stirring')
      expect(getStageFromExposure(89)).toBe('stirring')
    })

    it('returns formed for exposure 90-159', () => {
      expect(getStageFromExposure(90)).toBe('formed')
      expect(getStageFromExposure(159)).toBe('formed')
    })

    it('returns mutated for exposure 160-239', () => {
      expect(getStageFromExposure(160)).toBe('mutated')
      expect(getStageFromExposure(239)).toBe('mutated')
    })

    it('returns heavenmarked for exposure >= 240', () => {
      expect(getStageFromExposure(240)).toBe('heavenmarked')
      expect(getStageFromExposure(500)).toBe('heavenmarked')
    })
  })

  describe('getRiskLevelFromInstability', () => {
    it('returns safe for instability < 25', () => {
      expect(getRiskLevelFromInstability(0)).toBe('safe')
      expect(getRiskLevelFromInstability(24)).toBe('safe')
    })

    it('returns drifting for instability 25-59', () => {
      expect(getRiskLevelFromInstability(25)).toBe('drifting')
      expect(getRiskLevelFromInstability(59)).toBe('drifting')
    })

    it('returns danger for instability 60-109', () => {
      expect(getRiskLevelFromInstability(60)).toBe('danger')
      expect(getRiskLevelFromInstability(109)).toBe('danger')
    })

    it('returns calamity for instability >= 110', () => {
      expect(getRiskLevelFromInstability(110)).toBe('calamity')
      expect(getRiskLevelFromInstability(200)).toBe('calamity')
    })
  })

  describe('createDestinyState', () => {
    it('creates initial state with seed stage', () => {
      const state = createDestinyState('fortuneSeed')
      expect(state.stage).toBe('seed')
      expect(state.exposure).toBe(0)
      expect(state.seedId).toBe('fortuneSeed')
      expect(state.matchedAmplifiers).toEqual([])
    })

    it('sets base risk from seed definition', () => {
      const state = createDestinyState('fortuneSeed')
      expect(state.instability).toBeGreaterThanOrEqual(0)
      expect(state.riskLevel).toBeDefined()
    })
  })

  describe('addExposure', () => {
    it('increases exposure by policy-modified gain', () => {
      const state = createDestinyState('fortuneSeed')
      const result = addExposure(state, 'highVarianceRoute', DEFAULT_POLICY)
      expect(result.exposure).toBeGreaterThan(state.exposure)
    })

    it('reduces exposure for negative gains (steadyIdleDay)', () => {
      const state = { ...createDestinyState('fortuneSeed'), exposure: 50 }
      const result = addExposure(state, 'steadyIdleDay', DEFAULT_POLICY)
      expect(result.exposure).toBeLessThan(state.exposure)
    })

    it('updates stage when exposure crosses threshold', () => {
      const state = createDestinyState('fortuneSeed')
      // Add enough exposure to reach stirring (40)
      let current = state
      for (let i = 0; i < 10; i++) {
        current = addExposure(current, 'highVarianceRoute', DEFAULT_POLICY)
      }
      expect(current.stage).not.toBe('seed')
    })

    it('never lets exposure go below 0', () => {
      const state = createDestinyState('fortuneSeed')
      const result = addExposure(state, 'steadyIdleDay', DEFAULT_POLICY)
      expect(result.exposure).toBeGreaterThanOrEqual(0)
    })
  })

  describe('checkStageTransition', () => {
    it('returns null when stage does not change', () => {
      const state = createDestinyState('fortuneSeed')
      const result = checkStageTransition(state, state, Date.now())
      expect(result).toBeNull()
    })

    it('returns stage_advance when advancing from seed to stirring', () => {
      const prev = createDestinyState('fortuneSeed')
      const next = { ...prev, exposure: 50, stage: 'stirring' as const }
      const result = checkStageTransition(prev, next, Date.now())
      expect(result).not.toBeNull()
      expect(result!.type).toBe('stage_advance')
    })
  })

  describe('calculateShock', () => {
    it('returns no shock for adjacent policies', () => {
      const state = createDestinyState('fortuneSeed')
      const result = calculateShock('lianfeng', 'shouheng', state)
      expect(result.shockImpact).toBe(0)
    })

    it('returns shock for distant policies', () => {
      const state = createDestinyState('fortuneSeed')
      const result = calculateShock('lianfeng', 'niejie', state)
      expect(result.shockImpact).toBeGreaterThan(0)
    })

    it('increases shock for higher destiny stages', () => {
      const seedState = createDestinyState('fortuneSeed')
      const mutatedState = { ...seedState, stage: 'mutated' as const, exposure: 160 }
      const seedShock = calculateShock('lianfeng', 'fenming', seedState)
      const mutatedShock = calculateShock('lianfeng', 'fenming', mutatedState)
      expect(mutatedShock.shockImpact).toBeGreaterThan(seedShock.shockImpact)
    })
  })

  describe('applyShockToState', () => {
    it('does not apply shock below threshold', () => {
      const state = createDestinyState('fortuneSeed')
      const result = applyShockToState(state, 10, Date.now())
      expect(result.event).toBeNull()
      expect(result.state).toBe(state)
    })

    it('applies instability for significant shock', () => {
      const state = createDestinyState('fortuneSeed')
      const result = applyShockToState(state, 60, Date.now())
      expect(result.event).not.toBeNull()
      expect(result.state.instability).toBeGreaterThan(state.instability)
    })
  })

  describe('processRunDestinyUpdates', () => {
    it('returns empty updates for characters without destinyState', () => {
      const characters = [{ id: 'char1', destinyState: null }] as any
      const results = processRunDestinyUpdates(characters, DEFAULT_POLICY, [], 'medium', Date.now())
      expect(results).toHaveLength(1)
      expect(results[0].exposureGain).toBe(0)
    })

    it('increases exposure for characters with destinyState', () => {
      const state = createDestinyState('fortuneSeed')
      const characters = [{ id: 'char1', destinyState: state }] as any
      const results = processRunDestinyUpdates(characters, DEFAULT_POLICY, [], 'medium', Date.now())
      expect(results[0].exposureGain).toBeGreaterThan(0)
    })

    it('gives higher exposure for high variance runs', () => {
      const state = createDestinyState('fortuneSeed')
      const characters = [{ id: 'char1', destinyState: state }] as any
      const lowResults = processRunDestinyUpdates(characters, DEFAULT_POLICY, [], 'low', Date.now())
      const highResults = processRunDestinyUpdates(characters, DEFAULT_POLICY, [], 'high', Date.now())
      expect(highResults[0].exposureGain).toBeGreaterThan(lowResults[0].exposureGain)
    })
  })

  describe('calculateMatchedAmplifiers', () => {
    it('returns empty array when no amplifiers are active', () => {
      const result = calculateMatchedAmplifiers('fortuneSeed', [])
      expect(result).toEqual([])
    })
  })
})
