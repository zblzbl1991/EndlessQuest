import { describe, it, expect, vi, afterEach } from 'vitest'
import { processBreakthrough } from '../systems/cultivation/BreakthroughCoordinator'
import type { Character } from '../types/character'

/**
 * V2 突破契约（设计稿 §5.2 / §5.4，2026-09 审计修复）：
 * - 小境界：90% 单次判定，失败保留 100% 修为、只耗资源，绝不受伤/身死。
 * - 大境界：天劫是唯一成败判定（失败率 = 0.15 + EXP×0.004 − 灵根/悟性 − 加成），
 *   天劫失败后按 受阻/受伤/身死 分布；身死仅在冲击渡劫期（目标境 ≥ 8）及以后存在。
 * - 天劫成功 → 必然突破，10% 为 great_success（额外一小层属性成长，P2-7）。
 */

function createCharacter(overrides?: Partial<Character>): Character {
  return {
    id: '1',
    name: 'test',
    title: 'disciple',
    quality: 'common',
    realm: 0,
    realmStage: 0,
    cultivation: 100,
    baseStats: { hp: 100, atk: 15, def: 8, spd: 10, crit: 0.05, critDmg: 1.5 },
    cultivationStats: {
      spiritPower: 50,
      maxSpiritPower: 50,
      comprehension: 10,
      spiritualRoot: 10,
      fortune: 5,
    },
    learnedTechniques: [],
    equippedGear: [null, null, null, null, null, null, null, null, null],
    equippedSkills: [null, null, null, null, null],
    backpack: [],
    maxBackpackSlots: 20,
    petIds: [],
    talents: [],
    status: 'idle',
    injuryTimer: 0,
    createdAt: Date.now(),
    totalCultivation: 0,
    specialties: [],
    assignedBuilding: null,
    cultivationPath: 'sword',
    investedSpiritStone: 0,
    techniqueComprehension: {},
    ...overrides,
  }
}

const ACC = { spiritStone: 0, spiritEnergy: 0 }
const RICH = 1e45

afterEach(() => {
  vi.restoreAllMocks()
})

describe('小境界突破（§5.2：90% 固定成功，失败保留修为）', () => {
  it('基础弟子成功率 ≈ 90%（统计）', () => {
    const char = createCharacter({ cultivation: 100 })
    let successes = 0
    const runs = 3000
    for (let i = 0; i < runs; i++) {
      const result = processBreakthrough(char, RICH, 999999, [], ACC, undefined, undefined, RICH)
      if (result.breakthroughSuccess) successes++
    }
    const rate = successes / runs
    expect(rate).toBeGreaterThan(0.84)
    expect(rate).toBeLessThan(0.96)
  })

  it('失败时保留 100% 修为、只耗资源、不受伤', () => {
    const char = createCharacter({ cultivation: 100 })
    // 失败率 = 0.1；roll 0.05 < 0.1 → 失败
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    const result = processBreakthrough(char, RICH, 999999, [], ACC, undefined, undefined, RICH)
    expect(result.breakthroughSuccess).toBe(false)
    expect(result.outcome).toBe('blocked')
    expect(result.cultivationResetFraction).toBe(1)
    expect(result.updatedChar.cultivation).toBe(100) // 修为完好保留
    expect(result.resourceCost.spiritStone).toBeGreaterThan(0) // 只耗资源
    expect(result.injuryTimer).toBe(0)
    expect(result.died).toBe(false)
    expect(result.updatedChar.realmStage).toBe(0)
  })

  it('成功时境界推进、修为清零', () => {
    const char = createCharacter({ cultivation: 100 })
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // roll ≥ 0.1 → 成功；后续领悟 roll 0.99 不触发
    const result = processBreakthrough(char, RICH, 999999, [], ACC, undefined, undefined, RICH)
    expect(result.breakthroughSuccess).toBe(true)
    expect(result.outcome).toBe('success')
    expect(result.updatedChar.realmStage).toBe(1)
    expect(result.updatedChar.cultivation).toBe(0)
  })

  it('小境界绝不出现 injured / fallen', () => {
    const char = createCharacter({ cultivation: 100 })
    for (let i = 0; i < 3000; i++) {
      const result = processBreakthrough(char, RICH, 999999, [], ACC, undefined, undefined, RICH)
      expect(result.outcome).not.toBe('injured')
      expect(result.outcome).not.toBe('fallen')
      expect(result.died).toBe(false)
    }
  })
})

describe('大境界突破（§5.4：天劫唯一成败判定）', () => {
  // realm 0 圆满 → 筑基：修为需求 0.5×1e2 = 50
  const majorChar = () => createCharacter({ realm: 0, realmStage: 3, cultivation: 50 })

  it('天劫成功 → 必然突破（无引擎层二次 roll）', () => {
    const char = majorChar()
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.99) // 天劫 roll：成功
      .mockReturnValueOnce(0.5) // great_success roll：普通成功
      .mockReturnValue(0.99) // 领悟 roll：不触发
    const result = processBreakthrough(char, RICH, 999999, [], ACC, undefined, undefined, RICH)
    expect(result.breakthroughSuccess).toBe(true)
    expect(result.outcome).toBe('success')
    expect(result.updatedChar.realm).toBe(1)
    expect(result.updatedChar.realmStage).toBe(0)
  })

  it('天劫失败 → 必然失败，不再有 60% 侥幸突破', () => {
    const char = majorChar()
    for (const outcomeRoll of [0.0, 0.4, 0.6, 0.85]) {
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0.0) // 天劫 roll：失败
        .mockReturnValueOnce(0.5) // severe roll：普通失败
        .mockReturnValueOnce(outcomeRoll) // 失败形态 roll
      const result = processBreakthrough(char, RICH, 999999, [], ACC, undefined, undefined, RICH)
      expect(result.breakthroughSuccess).toBe(false)
      expect(result.updatedChar.realm).toBe(0)
      expect(['blocked', 'injured']).toContain(result.outcome)
      vi.restoreAllMocks()
    }
  })

  it('天劫失败 → 受阻：修为回退 70%，资源照付', () => {
    const char = majorChar()
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.0).mockReturnValueOnce(0.5).mockReturnValueOnce(0.0) // blocked
    const result = processBreakthrough(char, RICH, 999999, [], ACC, undefined, undefined, RICH)
    expect(result.outcome).toBe('blocked')
    expect(result.cultivationResetFraction).toBe(0.7)
    expect(result.updatedChar.cultivation).toBe(35) // 50 × 0.7
    expect(result.resourceCost.spiritStone).toBeGreaterThan(0)
    expect(result.died).toBe(false)
  })

  it('天劫失败 → 受伤：修为清零 + 疗伤计时', () => {
    const char = majorChar()
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.0) // 天劫失败
      .mockReturnValueOnce(0.5) // severe = false → injuryTimer 60
      .mockReturnValueOnce(0.7) // injured（0.5~0.875）
    const result = processBreakthrough(char, RICH, 999999, [], ACC, undefined, undefined, RICH)
    expect(result.outcome).toBe('injured')
    expect(result.injuryTimer).toBe(60)
    expect(result.updatedChar.cultivation).toBe(0)
    expect(result.died).toBe(false)
  })

  it('身死只出现在冲击渡劫期（目标境 ≥ 8）及以后', () => {
    // 冲击合体期（目标 6）：fallen 权重并入受伤
    const char6 = createCharacter({ realm: 5, realmStage: 3, cultivation: 0.5 * 1e18 })
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.0).mockReturnValueOnce(0.5).mockReturnValue(0.99) // 落在 fallen 段
    const safe = processBreakthrough(char6, RICH, 999999, [], ACC, undefined, undefined, RICH)
    expect(safe.outcome).not.toBe('fallen')
    expect(safe.died).toBe(false)
    vi.restoreAllMocks()

    // 冲击渡劫期（目标 8）：fallen 存在
    const char8 = createCharacter({ realm: 7, realmStage: 3, cultivation: 0.5 * 1e31 })
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.0).mockReturnValueOnce(0.5).mockReturnValue(0.99)
    const deadly = processBreakthrough(char8, RICH, 999999, [], ACC, undefined, undefined, RICH)
    expect(deadly.outcome).toBe('fallen')
    expect(deadly.died).toBe(true)
    expect(deadly.updatedChar.realm).toBe(7)
  })

  it('飞升树突破加成（legacyBonus）降低天劫失败率', () => {
    const char = majorChar()
    // →筑基 基础失败率 0.166 − 0.08 = 0.086；加成 0.5 → 0：roll 0.0 也成功
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.0).mockReturnValueOnce(0.5).mockReturnValue(0.99)
    const result = processBreakthrough(char, RICH, 999999, [], ACC, undefined, undefined, RICH, 0.5)
    expect(result.breakthroughSuccess).toBe(true)
  })

  it('统计：高天资弟子天劫失败率低于低天资弟子', () => {
    const weak = createCharacter({ realm: 4, realmStage: 3, cultivation: 0.5 * 1e13 })
    const strong = createCharacter({
      realm: 4,
      realmStage: 3,
      cultivation: 0.5 * 1e13,
      cultivationStats: { spiritPower: 50, maxSpiritPower: 50, comprehension: 40, spiritualRoot: 40, fortune: 5 },
    })
    let weakFails = 0
    let strongFails = 0
    for (let i = 0; i < 2000; i++) {
      if (!processBreakthrough(weak, RICH, 999999, [], ACC, undefined, undefined, RICH).breakthroughSuccess) weakFails++
      if (!processBreakthrough(strong, RICH, 999999, [], ACC, undefined, undefined, RICH).breakthroughSuccess)
        strongFails++
    }
    expect(strongFails).toBeLessThan(weakFails)
  })
})

describe('great_success：真实效果（P2-7）', () => {
  it('大成功额外获得一小层属性成长', () => {
    const greatChar = createCharacter({ realm: 0, realmStage: 3, cultivation: 50 })
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.99) // 天劫成功
      .mockReturnValueOnce(0.05) // great_success
      .mockReturnValue(0.99)
    const great = processBreakthrough(greatChar, RICH, 999999, [], ACC, undefined, undefined, RICH)
    vi.restoreAllMocks()

    const normalChar = createCharacter({ realm: 0, realmStage: 3, cultivation: 50 })
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.99)
      .mockReturnValueOnce(0.5) // 普通成功
      .mockReturnValue(0.99)
    const normal = processBreakthrough(normalChar, RICH, 999999, [], ACC, undefined, undefined, RICH)

    expect(great.outcome).toBe('great_success')
    expect(normal.outcome).toBe('success')
    // 大境界 ×8 之后再叠一小层（+15% 差值）≈ ×2.05
    expect(great.updatedChar.baseStats.hp).toBeGreaterThan(normal.updatedChar.baseStats.hp)
    expect(great.updatedChar.baseStats.hp).toBeGreaterThan(Math.floor(normal.updatedChar.baseStats.hp * 1.5))
  })

  it('great_success 统计上仍为 ~10%（天劫成功中）', () => {
    const char = createCharacter({ realm: 0, realmStage: 3, cultivation: 50 })
    let greats = 0
    let successes = 0
    for (let i = 0; i < 3000; i++) {
      const result = processBreakthrough(char, RICH, 999999, [], ACC, undefined, undefined, RICH)
      if (result.breakthroughSuccess) {
        successes++
        if (result.outcome === 'great_success') greats++
      }
    }
    expect(successes).toBeGreaterThan(0)
    const rate = greats / successes
    expect(rate).toBeGreaterThan(0.05)
    expect(rate).toBeLessThan(0.15)
  })
})

describe('不变契约（no-change / 资源阻塞）', () => {
  it('修为不足时 no-change', () => {
    const char = createCharacter({ cultivation: 2 }) // stage-0 需求 5
    const result = processBreakthrough(char, RICH, 999999, [], ACC)
    expect(result.attemptsCount).toBe(0)
    expect(result.breakthroughSuccess).toBeNull()
  })

  it('灵石不足时发出 blocked 事件且不消耗', () => {
    const char = createCharacter({ cultivation: 100 })
    const result = processBreakthrough(char, 0, 999999, [], ACC, undefined, undefined, RICH)
    expect(result.events.length).toBeGreaterThan(0)
    expect(result.events[0].type).toBe('breakthrough_blocked')
    expect(result.attemptsCount).toBe(0)
    expect(result.resourceCost.spiritStone).toBe(0)
  })

  it('成功的突破保存里程碑快照', () => {
    const char = createCharacter({ cultivation: 100 })
    let found = false
    for (let i = 0; i < 200; i++) {
      const result = processBreakthrough(char, RICH, 999999, [], ACC, undefined, undefined, RICH)
      if (result.breakthroughSuccess) {
        found = true
        const snapshots = result.updatedChar.milestoneSnapshots!
        const newKey = `${result.updatedChar.realm}-${result.updatedChar.realmStage}`
        expect(snapshots[newKey]).toBeDefined()
        break
      }
    }
    expect(found).toBe(true)
  })
})
