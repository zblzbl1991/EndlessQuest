import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GameLoop, calcOfflineSeconds } from '../systems/idle/GameLoop'

describe('GameLoop', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  // Manual rAF pump: queue callbacks and flush them with explicit timestamps.
  let rafQueue: FrameRequestCallback[]
  function stubRaf() {
    rafQueue = []
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafQueue.push(cb)
      return rafQueue.length
    })
    vi.stubGlobal('cancelAnimationFrame', () => {})
  }

  function pump(elapsedMs: number, frameMs = 16) {
    const start = Date.now()
    let t = start
    const target = start + elapsedMs
    while (t < target) {
      t = Math.min(t + frameMs, target)
      const cbs = rafQueue.splice(0)
      for (const cb of cbs) cb(t)
    }
  }

  function setHidden(hidden: boolean) {
    Object.defineProperty(document, 'hidden', { value: hidden, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  }

  it('should start and stop', () => {
    stubRaf()
    const loop = new GameLoop({ onSimulate: () => {} })
    expect(loop.isRunning).toBe(false)
    loop.start()
    expect(loop.isRunning).toBe(true)
    loop.stop()
    expect(loop.isRunning).toBe(false)
  })

  it('should not start twice', () => {
    stubRaf()
    const onSimulate = vi.fn()
    const loop = new GameLoop({ onSimulate })
    loop.start()
    loop.start()
    pump(2500)
    // Two starts must not double the simulation rate
    expect(onSimulate).toHaveBeenCalledTimes(2)
    loop.stop()
  })

  it('runs fixed 1s simulation steps from rAF frames', () => {
    stubRaf()
    const onSimulate = vi.fn()
    const loop = new GameLoop({ onSimulate })
    loop.start()

    pump(2500)
    expect(onSimulate).toHaveBeenCalledTimes(2)
    expect(onSimulate).toHaveBeenNthCalledWith(1, 1)
    expect(onSimulate).toHaveBeenNthCalledWith(2, 1)

    loop.stop()
    pump(5000)
    expect(onSimulate).toHaveBeenCalledTimes(2)
  })

  it('discards time while paused and resumes cleanly', () => {
    stubRaf()
    const onSimulate = vi.fn()
    const loop = new GameLoop({ onSimulate, isPaused: () => true })
    loop.start()

    pump(5000)
    expect(onSimulate).not.toHaveBeenCalled()

    loop.stop()
  })

  it('catches up short gaps through fixed steps on visibility restore', () => {
    stubRaf()
    const onSimulate = vi.fn()
    const loop = new GameLoop({ onSimulate })
    loop.start()

    setHidden(true)
    vi.advanceTimersByTime(10_000)
    setHidden(false)

    expect(onSimulate).toHaveBeenCalledTimes(10)
    for (let i = 1; i <= 10; i++) {
      expect(onSimulate).toHaveBeenNthCalledWith(i, 1)
    }

    // rAF resumes after restore
    pump(1100)
    expect(onSimulate).toHaveBeenCalledTimes(11)

    loop.stop()
  })

  it('routes long gaps to the catch-up callback', () => {
    stubRaf()
    const onSimulate = vi.fn()
    const onCatchUp = vi.fn()
    const loop = new GameLoop({ onSimulate, onCatchUp })
    loop.start()

    setHidden(true)
    vi.advanceTimersByTime(200_000)
    setHidden(false)

    expect(onSimulate).not.toHaveBeenCalled()
    expect(onCatchUp).toHaveBeenCalledTimes(1)
    expect(onCatchUp.mock.calls[0][0]).toBeGreaterThanOrEqual(199)
    expect(onCatchUp.mock.calls[0][0]).toBeLessThanOrEqual(201)

    loop.stop()
  })

  it('caps catch-up at 24 hours', () => {
    stubRaf()
    const onCatchUp = vi.fn()
    const loop = new GameLoop({ onSimulate: () => {}, onCatchUp })
    loop.start()

    setHidden(true)
    vi.advanceTimersByTime(3 * 86400_000)
    setHidden(false)

    expect(onCatchUp).toHaveBeenCalledTimes(1)
    expect(onCatchUp.mock.calls[0][0]).toBe(86400)

    loop.stop()
  })

  it('discards long gaps while paused', () => {
    stubRaf()
    const onSimulate = vi.fn()
    const onCatchUp = vi.fn()
    const loop = new GameLoop({ onSimulate, onCatchUp, isPaused: () => true })
    loop.start()

    setHidden(true)
    vi.advanceTimersByTime(500_000)
    setHidden(false)

    expect(onSimulate).not.toHaveBeenCalled()
    expect(onCatchUp).not.toHaveBeenCalled()

    loop.stop()
  })

  it('falls back to setInterval frames when requestAnimationFrame is unavailable', () => {
    // Simulate environments without rAF (old webviews); the fallback must drive the loop
    vi.stubGlobal('requestAnimationFrame', undefined)
    vi.stubGlobal('cancelAnimationFrame', undefined)
    const onSimulate = vi.fn()
    const loop = new GameLoop({ onSimulate })
    loop.start()

    vi.advanceTimersByTime(2500)
    // 10 fallback frames x 250ms (frame cap) = 2500ms accumulated -> 2 steps
    expect(onSimulate).toHaveBeenCalledTimes(2)

    loop.stop()
    vi.advanceTimersByTime(5000)
    expect(onSimulate).toHaveBeenCalledTimes(2)
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
