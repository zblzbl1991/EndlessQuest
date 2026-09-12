import { formatNumber } from './Decimal'

export function formatCultivationValue(value: number): string {
  if (value > 0 && value < 1) return value.toFixed(2)
  const shouldShowDecimal = value < 10 || !Number.isInteger(value)
  return value.toLocaleString(undefined, {
    minimumFractionDigits: shouldShowDecimal ? 1 : 0,
    maximumFractionDigits: shouldShowDecimal ? 1 : 0,
  })
}

/**
 * Format a progress-line value that may exceed double range as the V2 realm
 * curve lands (e.g. 1e40 cultivation). Small values keep the classic localized
 * style; large values fall through to the shared Decimal formatter.
 */
export function formatProgressValue(value: number): string {
  if (Number.isFinite(value) && value < 1e15) {
    return formatCultivationValue(value)
  }
  return formatNumber(value, 'chinese')
}
