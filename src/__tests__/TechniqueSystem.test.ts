// src/__tests__/TechniqueSystem.test.ts
import {
  tryComprehendOnBreakthrough,
  pickTechniqueForFloor,
} from '../systems/technique/TechniqueSystem'

describe('tryComprehendOnBreakthrough', () => {
  const codex = ['qingxin', 'lieyan', 'fentian', 'xuanbing', 'leishen']

  it('should return null when random roll fails (sub-level)', () => {
    const result = tryComprehendOnBreakthrough(
      { learnedTechniques: ['qingxin'], realm: 1, realmStage: 0, currentTechnique: 'qingxin' },
      codex,
      false,
      () => 0.99,
    )
    expect(result).toBeNull()
  })

  it('should return technique when random roll succeeds (sub-level)', () => {
    const result = tryComprehendOnBreakthrough(
      { learnedTechniques: ['qingxin', 'lieyan'], realm: 1, realmStage: 0, currentTechnique: 'qingxin' },
      codex,
      false,
      () => 0.14,
    )
    expect(result).not.toBeNull()
    expect(['fentian', 'xuanbing']).toContain(result!)
  })

  it('should use 40% threshold for major breakthrough', () => {
    const result = tryComprehendOnBreakthrough(
      { learnedTechniques: ['qingxin'], realm: 1, realmStage: 3, currentTechnique: 'qingxin' },
      codex,
      true,
      () => 0.39,
    )
    expect(result).not.toBeNull()
  })

  it('should return null when all codex techniques already learned', () => {
    const result = tryComprehendOnBreakthrough(
      { learnedTechniques: codex, realm: 4, realmStage: 0, currentTechnique: 'qingxin' },
      codex,
      true,
      () => 0,
    )
    expect(result).toBeNull()
  })

  it('should respect tier ceiling (realm 0 = mortal only)', () => {
    const result = tryComprehendOnBreakthrough(
      { learnedTechniques: ['qingxin', 'lieyan'], realm: 0, realmStage: 0, currentTechnique: 'qingxin' },
      ['qingxin', 'lieyan', 'houtu', 'fentian', 'xuanbing', 'leishen'],
      true,
      () => 0,
    )
    expect(result).toBe('houtu')
  })
})

describe('pickTechniqueForFloor', () => {
  it('should return mortal tier for floor 3 with low roll', () => {
    const id = pickTechniqueForFloor(3, () => 0.5)
    expect(['qingxin', 'lieyan', 'houtu']).toContain(id)
  })

  it('should return spirit tier for floor 5 with high roll', () => {
    const id = pickTechniqueForFloor(5, () => 0.9)
    expect(['fentian', 'xuanbing', 'leiyu']).toContain(id)
  })

  it('should return immortal tier for floor 8 with high roll', () => {
    const id = pickTechniqueForFloor(8, () => 0.9)
    expect(['leishen', 'bumiejinshen', 'jiuzhuan']).toContain(id)
  })

  it('should return divine tier for floor 12 with high roll', () => {
    const id = pickTechniqueForFloor(12, () => 0.9)
    expect(['wanjianguizong', 'taishang']).toContain(id)
  })
})
