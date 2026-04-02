import { describe, expect, it, vi, afterEach } from 'vitest'
import { getRecoveryDaysForQuality, tickRecoveryDays } from '../systems/character/DiscipleRecoverySystem'

describe('DiscipleRecoverySystem', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('rolls common disciples into the 1-3 day window', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)

    expect(getRecoveryDaysForQuality('common')).toBe(3)
  })

  it('returns an idle-ready result when the recovery countdown reaches zero', () => {
    expect(tickRecoveryDays(1, 1)).toEqual({ remainingDays: 0, recovered: true })
  })
})
