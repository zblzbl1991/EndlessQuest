export type SimulateCallback = (deltaSec: number) => void

/**
 * Simulation step in ms. 1s keeps per-tick cost and production-queue semantics
 * identical to the legacy 1s setInterval loop; the accumulator removes timer
 * drift and browser throttling pile-up.
 */
const SIM_STEP_MS = 1000

/** Max simulated time a single animation frame may contribute (jank guard). */
const MAX_FRAME_DELTA_MS = 250

/** Frame cadence for the setInterval fallback (no requestAnimationFrame). */
const FALLBACK_FRAME_MS = 250

/** Deltas up to this are re-simulated step-by-step; larger ones go to onCatchUp. */
const CATCHUP_STEP_THRESHOLD_SEC = 120

/** Safety-net heartbeat for environments where rAF stops firing while visible. */
const HEARTBEAT_INTERVAL_MS = 30_000

export const MAX_OFFLINE_SECONDS = 86400 // 24 hours

export interface GameLoopOptions {
  /** Simulate `deltaSec` seconds of game time (foreground steps and short catch-ups). */
  onSimulate: SimulateCallback
  /**
   * Long-gap catch-up (tab restore > 120s, heartbeat, offline load).
   * Defaults to onSimulate -- pass a dedicated fast path if the game has one.
   */
  onCatchUp?: SimulateCallback
  /** When true, elapsed time is discarded instead of simulated (explicit pause). */
  isPaused?: () => boolean
  /** Offline cap in seconds (ascension tree extends it). Defaults to 24h. */
  maxOfflineSeconds?: number
}

/**
 * requestAnimationFrame-driven fixed-step game loop (setInterval fallback for
 * environments without rAF).
 *
 * One simulation function, three entry points:
 * - foreground: rAF frames feed a fixed-step accumulator (drift-free, auto
 *   stalls when the tab hides because rAF stops firing)
 * - visibility restore / heartbeat: bounded step re-simulation or a single
 *   long-delta catch-up call
 * - offline load: the caller invokes the same catch-up path after loading
 */
export class GameLoop {
  private options: GameLoopOptions
  private frameHandle: number | ReturnType<typeof setInterval> | null = null
  private usingFallbackFrame = false
  private heartbeatId: ReturnType<typeof setInterval> | null = null
  private lastSimTime = 0
  private lastFrameTime = 0
  private accumulatorMs = 0
  private _isRunning = false

  constructor(options: GameLoopOptions) {
    this.options = options
  }

  get isRunning(): boolean {
    return this._isRunning
  }

  start(): void {
    if (this._isRunning) return
    this._isRunning = true
    this.lastSimTime = Date.now()
    this.lastFrameTime = this.lastSimTime
    this.accumulatorMs = 0

    // Safety net for visible-but-stalled rAF; hidden time is handled by the
    // visibility-restore catch-up instead.
    this.heartbeatId = setInterval(() => {
      if (!document.hidden) this.catchUpToNow()
    }, HEARTBEAT_INTERVAL_MS)
    document.addEventListener('visibilitychange', this.handleVisibility)
    this.scheduleFrame()
  }

  stop(): void {
    if (!this._isRunning) return
    this.cancelFrame()
    if (this.heartbeatId !== null) {
      clearInterval(this.heartbeatId)
      this.heartbeatId = null
    }
    document.removeEventListener('visibilitychange', this.handleVisibility)
    this._isRunning = false
  }

  /**
   * Simulate everything since the last simulation point, up to the offline cap.
   * Shared by visibility restore and the heartbeat. While paused, elapsed time
   * is discarded (pause produces no gains by construction).
   */
  catchUpToNow(now: number = Date.now()): void {
    if (!this._isRunning) return
    const cap = this.options.maxOfflineSeconds ?? MAX_OFFLINE_SECONDS
    const elapsedSec = Math.min(Math.max((now - this.lastSimTime) / 1000, 0), cap)
    this.simulateElapsed(elapsedSec, now)
  }

  /**
   * Simulate a given elapsed duration from `now` (defaults to current time).
   * Short gaps run through fixed steps; long gaps go to the catch-up callback.
   */
  simulateElapsed(elapsedSec: number, now: number = Date.now()): void {
    if (!this._isRunning) return
    const paused = this.options.isPaused?.() ?? false

    if (paused || elapsedSec <= 0) {
      // Explicit pause: drop the time, keep the clock honest.
      this.lastSimTime = now
      this.lastFrameTime = now
      this.accumulatorMs = 0
      return
    }

    if (elapsedSec > CATCHUP_STEP_THRESHOLD_SEC) {
      const catchUp = this.options.onCatchUp ?? this.options.onSimulate
      catchUp(elapsedSec)
    } else {
      const steps = Math.floor(elapsedSec / (SIM_STEP_MS / 1000))
      for (let i = 0; i < steps; i++) {
        this.options.onSimulate(SIM_STEP_MS / 1000)
      }
    }

    this.lastSimTime = now
    this.lastFrameTime = now
    this.accumulatorMs = 0
  }

  private handleVisibility = (): void => {
    if (document.hidden) {
      // rAF stops on its own; cancel defensively so no stale frame fires.
      this.cancelFrame()
      this.accumulatorMs = 0
    } else {
      this.catchUpToNow()
      this.scheduleFrame()
    }
  }

  private scheduleFrame(): void {
    if (this.frameHandle !== null) return
    if (typeof requestAnimationFrame === 'function') {
      this.usingFallbackFrame = false
      this.frameHandle = requestAnimationFrame(this.frame)
    } else {
      this.usingFallbackFrame = true
      this.frameHandle = setInterval(() => this.frame(Date.now()), FALLBACK_FRAME_MS)
    }
  }

  private cancelFrame(): void {
    if (this.frameHandle === null) return
    if (this.usingFallbackFrame) {
      clearInterval(this.frameHandle as ReturnType<typeof setInterval>)
    } else {
      cancelAnimationFrame(this.frameHandle as number)
    }
    this.frameHandle = null
  }

  private frame = (now: number): void => {
    // rAF handles are single-shot; the fallback interval persists until cancelled.
    if (!this.usingFallbackFrame) this.frameHandle = null
    if (!this._isRunning) return

    const frameDelta = Math.min(now - this.lastFrameTime, MAX_FRAME_DELTA_MS)
    this.lastFrameTime = now

    if (this.options.isPaused?.() ?? false) {
      // Explicit pause: discard accumulated time, advance the clock.
      this.lastSimTime = now
      this.accumulatorMs = 0
    } else {
      this.accumulatorMs += frameDelta
      while (this.accumulatorMs >= SIM_STEP_MS) {
        this.accumulatorMs -= SIM_STEP_MS
        this.lastSimTime += SIM_STEP_MS
        this.options.onSimulate(SIM_STEP_MS / 1000)
      }
    }

    this.scheduleFrame()
  }
}

export function calcOfflineSeconds(lastOnlineTime: number, maxSeconds: number = MAX_OFFLINE_SECONDS): number {
  const elapsed = (Date.now() - lastOnlineTime) / 1000
  return Math.min(Math.max(elapsed, 0), maxSeconds)
}
