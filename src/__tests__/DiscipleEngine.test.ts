import { generateDisciple, recruitDisciple, trainDisciple, QUALITY_LEVEL_CAP } from '../systems/disciple/DiscipleEngine'

describe('DiscipleEngine', () => {
  it('should generate a disciple with correct quality', () => {
    const d = generateDisciple('common')
    expect(d.quality).toBe('common')
    expect(d.level).toBe(1)
    expect(d.status).toBe('active')
    expect(d.hp).toBeGreaterThan(0)
  })

  it('should generate higher stats for better quality', () => {
    const common = generateDisciple('common')
    const spirit = generateDisciple('spirit')
    expect(spirit.hp).toBeGreaterThan(common.hp)
  })

  it('should recruit with weighted random (mostly common)', () => {
    let commonCount = 0
    for (let i = 0; i < 100; i++) {
      const result = recruitDisciple('divine')
      if (result.disciple!.quality === 'common') commonCount++
    }
    expect(commonCount).toBeGreaterThan(40)
  })

  it('should respect max quality cap in recruit', () => {
    for (let i = 0; i < 50; i++) {
      const result = recruitDisciple('common')
      expect(['common']).toContain(result.disciple!.quality)
    }
  })

  it('should train disciple and increase level', () => {
    const d = generateDisciple('common')
    d.talent = 80 // high talent to ensure training gain
    // Train for enough time to gain levels
    const trained = trainDisciple(d, 3600) // 1 hour
    expect(trained.level).toBeGreaterThan(1)
  })

  it('should not exceed level cap', () => {
    const d = generateDisciple('common')
    d.level = QUALITY_LEVEL_CAP.common
    const trained = trainDisciple(d, 1000)
    expect(trained.level).toBe(QUALITY_LEVEL_CAP.common)
  })

  it('should not train wounded disciple', () => {
    const d = generateDisciple('common')
    d.status = 'wounded'
    const trained = trainDisciple(d, 1000)
    expect(trained.level).toBe(1)
  })
})
