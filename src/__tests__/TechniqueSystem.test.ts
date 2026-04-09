import {
  getTechniqueCodexCapacity,
  pickExplorationTechniqueReward,
  pickTechniqueForFloor,
  tryComprehendOnBreakthrough,
} from '../systems/technique/TechniqueSystem'
import { TECHNIQUES } from '../data/techniquesTable'

describe('tryComprehendOnBreakthrough', () => {
  const codex = ['qingxin', 'lieyan', 'fentian', 'xuanbing', 'leishen']

  it('should return null when random roll fails (sub-level)', () => {
    const result = tryComprehendOnBreakthrough(
      { learnedTechniques: ['qingxin'], realm: 1, cultivationStats: { comprehension: 30 } },
      codex,
      false,
      () => 0.99
    )
    expect(result).toBeNull()
  })

  it('should return technique when random roll succeeds (sub-level)', () => {
    const result = tryComprehendOnBreakthrough(
      {
        learnedTechniques: ['qingxin', 'lieyan'],
        realm: 1,
        cultivationStats: { comprehension: 30 },
        cultivationPath: 'alchemy',
        specialties: [{ type: 'comprehension', level: 3 }],
      },
      codex,
      false,
      () => 0.14
    )
    expect(result).not.toBeNull()
    expect(['fentian', 'xuanbing']).toContain(result!)
  })

  it('should use 40% threshold for major breakthrough', () => {
    const result = tryComprehendOnBreakthrough(
      { learnedTechniques: ['qingxin'], realm: 1, cultivationStats: { comprehension: 30 } },
      codex,
      true,
      () => 0.39
    )
    expect(result).not.toBeNull()
  })

  it('should let fate grid comprehension modifier push the breakthrough comprehension chance higher', () => {
    const result = tryComprehendOnBreakthrough(
      {
        learnedTechniques: ['qingxin'],
        realm: 1,
        cultivationStats: { comprehension: 30 },
        fateGrid: 'wisdom',
      },
      codex,
      false,
      () => 0.16
    )
    expect(result).not.toBeNull()
  })

  it('should return null when all codex techniques already learned', () => {
    const result = tryComprehendOnBreakthrough(
      { learnedTechniques: codex, realm: 4, cultivationStats: { comprehension: 30 } },
      codex,
      true,
      () => 0
    )
    expect(result).toBeNull()
  })

  it('should respect tier ceiling (realm 0 = mortal only)', () => {
    const result = tryComprehendOnBreakthrough(
      {
        learnedTechniques: ['qingxin', 'lieyan'],
        realm: 0,
        cultivationStats: { comprehension: 30 },
        cultivationPath: 'body',
        specialties: [{ type: 'mining', level: 2 }],
      },
      ['qingxin', 'lieyan', 'houtu', 'fentian', 'xuanbing', 'leishen'],
      true,
      () => 0
    )
    expect(result).toBe('houtu')
  })

  it('should return null when comprehension too low for all candidates', () => {
    const result = tryComprehendOnBreakthrough(
      { learnedTechniques: ['qingxin'], realm: 2, cultivationStats: { comprehension: 5 } },
      ['leishen', 'bumiejinshen', 'jiuzhuan'],
      true,
      () => 0
    )
    expect(result).toBeNull()
  })
})

describe('pickTechniqueForFloor', () => {
  it('should return spirit-or-higher dungeon techniques for early floors', () => {
    const id = pickTechniqueForFloor(3, () => 0.5)
    const spiritIds = TECHNIQUES.filter((t) => t.tier === 'spirit' && t.origin === 'dungeon').map((t) => t.id)
    expect(spiritIds).toContain(id)
  })

  it('should return immortal tier for floor 8 with high roll', () => {
    const id = pickTechniqueForFloor(8, () => 0.9)
    const immortalIds = TECHNIQUES.filter((t) => t.tier === 'immortal' && t.origin === 'dungeon').map((t) => t.id)
    expect(immortalIds).toContain(id)
  })

  it('should return divine tier for floor 12 with high roll', () => {
    const id = pickTechniqueForFloor(12, () => 0.9)
    const divineIds = TECHNIQUES.filter((t) => t.tier === 'divine' && t.origin === 'dungeon').map((t) => t.id)
    expect(divineIds).toContain(id)
  })
})

describe('technique codex progression', () => {
  it('should use scripture hall as codex capacity only', () => {
    expect(getTechniqueCodexCapacity(0)).toBe(3)
    expect(getTechniqueCodexCapacity(3)).toBe(9)
  })

  it('should only pick undiscovered dungeon techniques from exploration', () => {
    const result = pickExplorationTechniqueReward(4, ['qingxin', 'lieyan', 'houtu'], 3, () => 0)
    expect(result).not.toBeNull()
    expect(['fentian', 'xuanbing', 'leiyu']).toContain(result!)
  })

  it('should return null when the scripture hall codex is already full', () => {
    const result = pickExplorationTechniqueReward(4, ['qingxin', 'lieyan', 'houtu'], 0, () => 0)
    expect(result).toBeNull()
  })
})
