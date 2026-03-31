export function formatCultivationValue(value: number): string {
  const shouldShowDecimal = value < 10 || !Number.isInteger(value)
  return value.toLocaleString(undefined, {
    minimumFractionDigits: shouldShowDecimal ? 1 : 0,
    maximumFractionDigits: shouldShowDecimal ? 1 : 0,
  })
}
