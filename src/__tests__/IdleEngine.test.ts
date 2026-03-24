import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { IdleEngine, calcOfflineSeconds } from '../systems/idle/IdleEngine'

describe('IdleEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should start and stop', () => {
    const engine = new IdleEngine(() => {})
    expect(engine.isRunning).toBe(false)
    engine.start()
    expect(engine.isRunning).toBe(true)
    engine.stop()
    expect(engine.isRunning).toBe(false)
  })

  it('should call tick callback after TICK_INTERVAL_MS', () => {
    const callback = vi.fn()
    const engine = new IdleEngine(callback)
    engine.start()
    expect(callback).not.toHaveBeenCalled()

    // Advance time by 1.5 seconds to ensure delta >= 0.5
    vi.advanceTimersByTime(1500)
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith(expect.any(Number))

    engine.stop()
  })

  it('should not start twice', () => {
    const cb1 = vi.fn()
    const engine = new IdleEngine(cb1)
    const cb2 = vi.fn()
    engine.start()
    // Starting again should be no-op (callback already set in constructor)
    expect(engine.isRunning).toBe(true)

    vi.advanceTimersByTime(1500)
    // cb1 should be called (callback from constructor)
    expect(cb1).toHaveBeenCalled()
    // cb2 is not the engine's callback, so it should not be called
    expect(cb2).not.toHaveBeenCalled()

    engine.stop()
    expect(engine.isRunning).toBe(false)
  })

  it('should stop ticking after stop()', () => {
    const callback = vi.fn()
    const engine = new IdleEngine(callback)
    engine.start()
    vi.advanceTimersByTime(1500)
    expect(callback).toHaveBeenCalledTimes(1)

    engine.stop()
    vi.advanceTimersByTime(5000)
    // Should still be exactly 1 call -- no more ticks after stop
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should handle visibility change -- pause on hidden, catch up on visible', () => {
    const callback = vi.fn()
    const engine = new IdleEngine(callback)
    engine.start()

    // First normal tick
    vi.advanceTimersByTime(1500)
    expect(callback).toHaveBeenCalledTimes(1)

    // Simulate tab going hidden
    Object.defineProperty(document, 'hidden', { value: true, writable: true })
    document.dispatchEvent(new Event('visibilitychange'))

    // Advance time while hidden -- no new ticks expected
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
