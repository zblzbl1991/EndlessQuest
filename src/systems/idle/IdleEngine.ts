export type TickCallback = (deltaSec: number) => void

const TICK_INTERVAL_MS = 1000
const MAX_OFFLINE_SECONDS = 86400 // 24 hours

export class IdleEngine {
  private intervalId: ReturnType<typeof setInterval> | null = null
  private lastTickTime = 0
  private callback: TickCallback | null = null
  private _isRunning = false

  get isRunning(): boolean {
    return this._isRunning
  }

  constructor(callback: TickCallback) {
    this.callback = callback
  }

  start(): void {
    if (this._isRunning) return
    this.lastTickTime = Date.now()
    this._isRunning = true
    this.intervalId = setInterval(() => this.tick(), TICK_INTERVAL_MS)

    // Handle tab visibility -- pause when hidden, catch up on return
    document.addEventListener('visibilitychange', this.handleVisibility)
  }

  stop(): void {
    if (!this._isRunning) return
    if (this.intervalId !== null) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    document.removeEventListener('visibilitychange', this.handleVisibility)
    this._isRunning = false
  }

  private handleVisibility = (): void => {
    if (document.hidden) {
      // Tab hidden -- just pause the interval
      if (this.intervalId !== null) {
        clearInterval(this.intervalId)
        this.intervalId = null
      }
    } else {
      // Tab visible again -- catch up and restart
      if (this._isRunning && this.callback) {
        const now = Date.now()
        const deltaSec = Math.min((now - this.lastTickTime) / 1000, MAX_OFFLINE_SECONDS)
        if (deltaSec > 1) {
          this.callback(deltaSec)
        }
        this.lastTickTime = now
        this.intervalId = setInterval(() => this.tick(), TICK_INTERVAL_MS)
      }
    }
  }

  private tick(): void {
    if (!this.callback) return
    const now = Date.now()
    const deltaSec = Math.min((now - this.lastTickTime) / 1000, 10) // cap at 10s for active ticks
    this.lastTickTime = now
    if (deltaSec >= 0.5) { // avoid tiny deltas
      this.callback(deltaSec)
    }
  }
}

export function calcOfflineSeconds(lastOnlineTime: number): number {
  const elapsed = (Date.now() - lastOnlineTime) / 1000
  return Math.min(Math.max(elapsed, 0), MAX_OFFLINE_SECONDS)
}
