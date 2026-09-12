import { describe, it, expect } from 'vitest'
import {
  dec,
  decAdd,
  decSub,
  decMul,
  decDiv,
  decPow,
  decLog10,
  decGte,
  decLt,
  decEq,
  decFloor,
  decMax,
  decMin,
  decToNumber,
  serializeDecimal,
  deserializeDecimal,
  formatNumber,
} from '../utils/Decimal'

describe('Decimal arithmetic', () => {
  it('handles magnitudes beyond double range', () => {
    const big = dec('1e400')
    expect(decToNumber(big)).toBe(Infinity)
    expect(decLog10(big)).toBeCloseTo(400)
    expect(decLog10(decAdd(big, '1e395'))).toBeCloseTo(400)
    expect(decLog10(decMul(big, big))).toBeCloseTo(800)
  })

  it('add/sub/mul/div across magnitudes', () => {
    expect(decLog10(decAdd(dec('1e30'), dec('1e28')))).toBeCloseTo(30.0043, 3)
    expect(decLog10(decSub(dec('1e30'), dec('1e28')))).toBeCloseTo(29.9956, 3)
    expect(decEq(decMul('2', '3'), 6)).toBe(true)
    expect(decEq(decDiv('1e30', '1e15'), 1e15)).toBe(true)
  })

  it('keeps subnormal magnitudes without collapsing to zero', () => {
    const tiny = dec('1e-20')
    expect(decLt(0, tiny)).toBe(true)
    expect(decLog10(decMul(tiny, '1e25'))).toBeCloseTo(5)
  })

  it('supports fractional exponents and floors', () => {
    expect(decLog10(decPow('10', '2.5'))).toBeCloseTo(2.5)
    expect(decEq(decFloor('3.7'), 3)).toBe(true)
    expect(decEq(decFloor('1e30'), '1e30')).toBe(true)
  })

  it('min/max/comparisons', () => {
    expect(decEq(decMax('1e30', 5), '1e30')).toBe(true)
    expect(decEq(decMin('1e30', 5), 5)).toBe(true)
    expect(decGte(5, 5)).toBe(true)
    expect(decGte(1e30, 5)).toBe(true)
  })
})

describe('Decimal serialization ({m, e})', () => {
  it('round-trips zero, integers, negatives and huge values', () => {
    const cases = [0, 5.5, -120, 1e6, 1.23e45, '1e400', 1e-20]
    for (const value of cases) {
      const d = dec(value)
      const restored = deserializeDecimal(serializeDecimal(d))
      if (d.eq(0)) {
        expect(restored.eq(0)).toBe(true)
        continue
      }
      // mantissa passes through double rounding: compare in log space (abs: log10 of negatives is NaN)
      const logDiff = Math.abs(restored.abs().log10().toNumber() - d.abs().log10().toNumber())
      expect(logDiff).toBeLessThan(1e-10)
    }
  })

  it('round-trips a plain number payload (legacy compatibility)', () => {
    expect(decEq(deserializeDecimal(1500000), 1500000)).toBe(true)
    expect(decEq(deserializeDecimal('2.5e8'), '2.5e8')).toBe(true)
  })

  it('repairs corrupt payloads to the fallback', () => {
    expect(decEq(deserializeDecimal({ m: NaN, e: 10 }, 42), 42)).toBe(true)
    expect(decEq(deserializeDecimal({ m: 1, e: Infinity }, 42), 42)).toBe(true)
    expect(decEq(deserializeDecimal(undefined, 7), 7)).toBe(true)
    expect(decEq(deserializeDecimal(null, 7), 7)).toBe(true)
    expect(decEq(deserializeDecimal({} as never, 9), 9)).toBe(true)
    expect(decEq(deserializeDecimal(NaN, 3), 3)).toBe(true)
    expect(decEq(deserializeDecimal(Infinity, 3), 3)).toBe(true)
  })
})

describe('formatNumber', () => {
  it('renders small values plainly', () => {
    expect(formatNumber(0)).toBe('0')
    expect(formatNumber(42)).toBe('42')
    expect(formatNumber(999.5)).toBe('999.5')
  })

  it('renders chinese unit groups of 4 digits', () => {
    expect(formatNumber(1000)).toBe('1000')
    expect(formatNumber(15000)).toBe('1.5万')
    expect(formatNumber(1.23e8)).toBe('1.23亿')
    expect(formatNumber(1e12)).toBe('1兆')
    expect(formatNumber(2e16)).toBe('2京')
  })

  it('renders scientific mode', () => {
    expect(formatNumber(1.23e45, 'scientific')).toBe('1.23e45')
    expect(formatNumber('1e400', 'scientific')).toBe('1.00e400')
  })

  it('handles negatives and infinity', () => {
    expect(formatNumber(-15000)).toBe('-1.5万')
    expect(formatNumber('1e999')).toBe('∞')
  })
})
