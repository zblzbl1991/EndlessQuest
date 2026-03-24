import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { IdleEngine, calcOfflineSeconds, calcOfflineRevenue } from '../systems/idle/IdleEngine'

describe('IdleEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should start and stop', () => {
    const engine = new IdleEngine()
    expect(engine.isRunning).toBe(false)
    engine.start(() => {})
    expect(engine.isRunning).toBe(true)
    engine.stop()
    expect(engine.isRunning).toBe(false)
  })

  it('should call tick callback after TICK_INTERVAL_MS', () => {
    const engine = new IdleEngine()
    const callback = vi.fn()
    engine.start(callback)
    expect(callback).not.toHaveBeenCalled()

    // Advance time by 1.5 seconds to ensure delta >= 0.5
    vi.advanceTimersByTime(1500)
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith(expect.any(Number))

    engine.stop()
  })

  it('should not start twice', () => {
    const engine = new IdleEngine()
    const cb1 = vi.fn()
    const cb2 = vi.fn()
    engine.start(cb1)
    engine.start(cb2) // should be no-op
    expect(engine.isRunning).toBe(true)

    vi.advanceTimersByTime(1500)
    // cb1 should be called (original callback), not cb2
    expect(cb1).toHaveBeenCalled()
    expect(cb2).not.toHaveBeenCalled()

    engine.stop()
    expect(engine.isRunning).toBe(false)
  })

  it('should stop ticking after stop()', () => {
    const engine = new IdleEngine()
    const callback = vi.fn()
    engine.start(callback)
    vi.advanceTimersByTime(1500)
    expect(callback).toHaveBeenCalledTimes(1)

    engine.stop()
    vi.advanceTimersByTime(5000)
    // Should still be exactly 1 call — no more ticks after stop
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should handle visibility change — pause on hidden, catch up on visible', () => {
    const engine = new IdleEngine()
    const callback = vi.fn()
    engine.start(callback)

    // First normal tick
    vi.advanceTimersByTime(1500)
    expect(callback).toHaveBeenCalledTimes(1)

    // Simulate tab going hidden
    Object.defineProperty(document, 'hidden', { value: true, writable: true })
    document.dispatchEvent(new Event('visibilitychange'))

    // Advance time while hidden — no new ticks expected
    vi.advanceTimersByTime(5000)
    expect(callback).toHaveBeenCalledTimes(1)

    // Simulate tab becoming visible again
    Object.defineProperty(document, 'hidden', { value: false, writable: true })
    document.dispatchEvent(new Event('visibilitychange'))

    // The catch-up callback should have been called with the ~5.5s delta
    expect(callback).toHaveBeenCalledTimes(2)
    // The second call should have a large delta (all the time hidden)
    const catchUpDelta = callback.mock.calls[1][0]
    expect(catchUpDelta).toBeGreaterThanOrEqual(5)

    // Ticks should resume after visibility change
    vi.advanceTimersByTime(1500)
    expect(callback).toHaveBeenCalledTimes(3)

    engine.stop()
  })
})

describe('calcOfflineSeconds', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return 0 for recent time', () => {
    expect(calcOfflineSeconds(Date.now())).toBeLessThan(1)
  })

  it('should return correct seconds for past time', () => {
    const oneHourAgo = Date.now() - 3600000
    const seconds = calcOfflineSeconds(oneHourAgo)
    expect(seconds).toBeGreaterThanOrEqual(3590)
    expect(seconds).toBeLessThanOrEqual(3610)
  })

  it('should cap at 24 hours', () => {
    const twoDaysAgo = Date.now() - 172800000
    expect(calcOfflineSeconds(twoDaysAgo)).toBe(86400)
  })

  it('should return 0 for future time', () => {
    const futureTime = Date.now() + 10000
    expect(calcOfflineSeconds(futureTime)).toBe(0)
  })
})

describe('calcOfflineRevenue', () => {
  it('should calculate revenue within spirit budget', () => {
    const result = calcOfflineRevenue(3600, 5, 2, 1, 0.1)
    // 1 hour: spirit budget = 3600, cost = 7200, so capped at 3600
    expect(result.spiritSpent).toBe(3600)
    expect(result.cultivationGained).toBe(5 * 1800) // 1800 seconds of cultivation
    expect(result.herbGained).toBeCloseTo(0.1 * 3600)
  })

  it('should handle zero production rate', () => {
    const result = calcOfflineRevenue(100, 5, 2, 0, 0)
    expect(result.cultivationGained).toBe(0)
    expect(result.spiritSpent).toBe(0)
  })

  it('should allow full cultivation when spirit budget exceeds cost', () => {
    // spirit production = 10/s, cost = 2/s, budget = 1000, cost = 200 -> fully covered
    const result = calcOfflineRevenue(100, 5, 2, 10, 0)
    expect(result.spiritSpent).toBe(200)
    expect(result.spiritGained).toBe(1000)
    expect(result.cultivationGained).toBe(5 * 100) // full 100 seconds of cultivation
  })

  it('should calculate herb production correctly', () => {
    const result = calcOfflineRevenue(3600, 0, 0, 0, 2.5)
    expect(result.herbGained).toBe(2.5 * 3600)
  })

  it('should return zero for zero offline seconds', () => {
    const result = calcOfflineRevenue(0, 5, 2, 1, 0.1)
    expect(result.cultivationGained).toBe(0)
    expect(result.spiritSpent).toBe(0)
    expect(result.spiritGained).toBe(0)
    expect(result.herbGained).toBe(0)
  })
})
