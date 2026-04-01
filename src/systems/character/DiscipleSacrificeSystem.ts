export const DISCIPLE_DEATH_REFUND_RATE = 0.3

export function calcDiscipleDeathRefund(input: { investedSpiritStone: number }): number {
  return Math.floor(Math.max(0, input.investedSpiritStone) * DISCIPLE_DEATH_REFUND_RATE)
}
