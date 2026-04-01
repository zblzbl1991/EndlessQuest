import { calcDiscipleDeathRefund, DISCIPLE_DEATH_REFUND_RATE } from '../systems/character/DiscipleSacrificeSystem'

describe('DiscipleSacrificeSystem', () => {
  it('refunds only a fixed fraction of invested spirit stones on death', () => {
    expect(calcDiscipleDeathRefund({ investedSpiritStone: 250 })).toBe(Math.floor(250 * DISCIPLE_DEATH_REFUND_RATE))
  })

  it('never returns a negative refund', () => {
    expect(calcDiscipleDeathRefund({ investedSpiritStone: -100 })).toBe(0)
  })
})
