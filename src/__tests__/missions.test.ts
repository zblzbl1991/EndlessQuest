import { describe, it, expect } from 'vitest'
import { DISPATCH_MISSIONS, getAvailableMissions } from '../data/missions'

describe('DISPATCH_MISSIONS', () => {
  it('has at least 5 missions defined', () => {
    expect(DISPATCH_MISSIONS.length).toBeGreaterThanOrEqual(5)
  })

  it('every mission has required fields', () => {
    for (const mission of DISPATCH_MISSIONS) {
      expect(mission.id).toBeTruthy()
      expect(mission.name).toBeTruthy()
      expect(mission.description).toBeTruthy()
      expect(mission.duration).toBeGreaterThan(0)
      expect(mission.rewards.length).toBeGreaterThan(0)
      expect(mission.minRealm).toBeGreaterThanOrEqual(0)
    }
  })

  it('getAvailableMissions filters by realm', () => {
    const available = getAvailableMissions(0)
    for (const m of available) {
      expect(m.minRealm).toBeLessThanOrEqual(0)
    }

    const available2 = getAvailableMissions(3)
    expect(available2.length).toBeGreaterThanOrEqual(available.length)
  })
})
