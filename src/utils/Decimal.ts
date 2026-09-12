import Decimal from 'break_eternity.js'

/**
 * Thin project wrapper over break_eternity.js.
 *
 * All new exponential-sensitive math (realm cost curves, ascension currency,
 * building cost scaling) should go through this module so the underlying
 * library can be swapped without touching gameplay code.
 *
 * Serialization contract: `serializeDecimal` emits `{ m, e }` (mantissa as a
 * plain number, exponent as a number); `deserializeDecimal` is the inverse and
 * also repairs NaN/Infinity back to a fallback (mirror of SaveSystem's
 * normalizeFiniteNumber for legacy number fields).
 */

export type DecimalSource = Decimal | number | string

export { Decimal }

export const DEC_ZERO = new Decimal(0)
export const DEC_ONE = new Decimal(1)

export function dec(value: DecimalSource): Decimal {
  return value instanceof Decimal ? value : new Decimal(value)
}

export function decAdd(a: DecimalSource, b: DecimalSource): Decimal {
  return dec(a).add(b)
}

export function decSub(a: DecimalSource, b: DecimalSource): Decimal {
  return dec(a).sub(b)
}

export function decMul(a: DecimalSource, b: DecimalSource): Decimal {
  return dec(a).mul(b)
}

export function decDiv(a: DecimalSource, b: DecimalSource): Decimal {
  return dec(a).div(b)
}

export function decPow(a: DecimalSource, b: DecimalSource): Decimal {
  return dec(a).pow(b)
}

export function decLog10(a: DecimalSource): number {
  return dec(a).log10().toNumber()
}

export function decGte(a: DecimalSource, b: DecimalSource): boolean {
  return dec(a).gte(b)
}

export function decLte(a: DecimalSource, b: DecimalSource): boolean {
  return dec(a).lte(b)
}

export function decGt(a: DecimalSource, b: DecimalSource): boolean {
  return dec(a).gt(b)
}

export function decLt(a: DecimalSource, b: DecimalSource): boolean {
  return dec(a).lt(b)
}

export function decEq(a: DecimalSource, b: DecimalSource): boolean {
  return dec(a).eq(b)
}

export function decFloor(a: DecimalSource): Decimal {
  return dec(a).floor()
}

export function decMax(a: DecimalSource, b: DecimalSource): Decimal {
  return Decimal.max(a, b)
}

export function decMin(a: DecimalSource, b: DecimalSource): Decimal {
  return Decimal.min(a, b)
}

export function decToNumber(a: DecimalSource): number {
  return dec(a).toNumber()
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

export interface SerializedDecimal {
  m: number
  e: number
}

/** Split into mantissa/exponent for IndexedDB storage. */
export function serializeDecimal(value: DecimalSource): SerializedDecimal {
  const d = dec(value)
  const sign = d.sgn()
  if (sign === 0) return { m: 0, e: 0 }
  const abs = d.abs()
  const e = Math.floor(abs.log10().toNumber())
  const m = sign * abs.div(new Decimal(10).pow(e)).toNumber()
  return { m, e }
}

/** Rebuild from {m, e}; repairs corrupt payloads (NaN/Infinity) to `fallback`. */
export function deserializeDecimal(
  value: Partial<SerializedDecimal> | number | string | undefined | null,
  fallback: DecimalSource = 0
): Decimal {
  if (value instanceof Decimal) return value
  if (typeof value === 'number' || typeof value === 'string') {
    return repair(new Decimal(value), fallback)
  }
  if (value && typeof value.m === 'number' && typeof value.e === 'number') {
    if (!Number.isFinite(value.m) || !Number.isFinite(value.e)) return repair(new Decimal(NaN), fallback)
    return repair(Decimal.fromMantissaExponent(value.m, value.e), fallback)
  }
  return repair(new Decimal(NaN), fallback)
}

function repair(candidate: Decimal, fallback: DecimalSource): Decimal {
  if (!Number.isFinite(candidate.mag)) return dec(fallback)
  return candidate
}

// ---------------------------------------------------------------------------
// Display formatting
// ---------------------------------------------------------------------------

const CN_UNITS = ['', '万', '亿', '兆', '京', '垓', '秭', '穰', '沟', '涧', '正', '载', '极']

export type NumberFormatMode = 'scientific' | 'chinese'

/**
 * Format a DecimalSource for UI display.
 * - chinese: 万/亿/兆/... units (default, matches the game's tone)
 * - scientific: 1.23e45
 *
 * Values below 1000 render plainly; large values keep 3 significant digits.
 */
export function formatNumber(value: DecimalSource, mode: NumberFormatMode = 'chinese'): string {
  const d = dec(value)
  if (!Number.isFinite(d.mag)) return '∞'
  if (d.lt(0)) return `-${formatNumber(d.neg(), mode)}`
  const n = d.toNumber()
  if (n < 1000) {
    return Number.isInteger(n) ? String(n) : n.toFixed(1)
  }

  if (mode === 'scientific') {
    const exp = Math.floor(d.log10().toNumber())
    const mantissa = d.div(new Decimal(10).pow(exp)).toNumber()
    return `${mantissa.toFixed(2)}e${exp}`
  }

  // Chinese units: groups of 4 digits (万=1e4, 亿=1e8, ...)
  const exp = Math.floor(d.log10().toNumber())
  const unitIndex = Math.min(Math.floor(exp / 4), CN_UNITS.length - 1)
  const scaled = d.div(new Decimal(10).pow(unitIndex * 4)).toNumber()
  if (!Number.isFinite(scaled)) return '∞'
  const digits = scaled >= 100 ? 1 : scaled >= 10 ? 2 : 3
  const trimmed = parseFloat(scaled.toFixed(digits))
  return `${trimmed}${CN_UNITS[unitIndex]}`
}
