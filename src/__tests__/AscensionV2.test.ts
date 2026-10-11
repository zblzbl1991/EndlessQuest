import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { calcDaoYunGain, getLegacyCultivationMult, getLegacyStoneMult } from '../data/legacy'
import { LEGACY_TREE, getLegacyNodeUpgradeCost } from '../data/legacyTree'
import { canAscend, performAscension, shouldAutoAscend } from '../systems/sect/LegacySystem'
import { calcCultivationRate, calcBreakthroughFailureRate } from '../systems/cultivation/CultivationEngine'
import { createCharacterCombatUnit } from '../data/enemies'
import type { Sect } from '../types'
import type { Character } from '../types/character'

// ─── 道韵公式（§7.2） ────────────────────────────────────────────────

describe('daoYun formula', () => {
  it('first ascension at 渡劫 (1e40) yields ~34 daoYun', () => {
    expect(calcDaoYunGain(1e40, 8, 0)).toBe(34)
  })

  it('grows with peak cultivation, realm and ascension count', () => {
    expect(calcDaoYunGain(1e40, 8, 2)).toBeGreaterThan(calcDaoYunGain(1e40, 8, 1))
    expect(calcDaoYunGain(1e42, 8, 1)).toBeGreaterThan(calcDaoYunGain(1e40, 8, 1))
    expect(calcDaoYunGain(1e40, 8, 0)).toBeGreaterThan(calcDaoYunGain(1e40, 4, 0))
  })

  it('rush-stall: same-peak repeat ascensions grow only by the linear count term (≤×1.25)', () => {
    // V2.1 工单 01：增长必须来自推深而不是飞得更多（4^n 已废除）
    for (let asc = 1; asc < 10; asc++) {
      const prev = calcDaoYunGain(1e40, 8, asc - 1)
      const curr = calcDaoYunGain(1e40, 8, asc)
      expect(curr).toBeGreaterThan(prev)
      expect(curr / prev).toBeLessThanOrEqual(1.25 + 1 / prev + 1e-9)
    }
  })

  it('push-monotone: one tenfold of peak beats rushing a repeat ascension', () => {
    for (let asc = 0; asc < 10; asc++) {
      const rushed = calcDaoYunGain(1e40, 8, asc + 1)
      const pushed = calcDaoYunGain(1e41, 8, asc)
      expect(pushed).toBeGreaterThanOrEqual(rushed)
    }
  })

  it('yields zero without any cultivation', () => {
    expect(calcDaoYunGain(0, 8, 0)).toBe(0)
  })
})

// ─── 飞升树（§7.3） ──────────────────────────────────────────────────

describe('legacy tree', () => {
  it('node upgrade cost doubles per level and stops at max', () => {
    expect(getLegacyNodeUpgradeCost('daoxin', 0)).toBe(10)
    expect(getLegacyNodeUpgradeCost('daoxin', 2)).toBe(40)
    expect(getLegacyNodeUpgradeCost('daoxin', 5)).toBeNull()
    expect(LEGACY_TREE.find((n) => n.id === 'heavenPivot')?.maxLevel).toBe(1)
  })

  it('cultivation node multiplies cultivation rate', () => {
    const char = makeChar()
    const base = calcCultivationRate(char, [])
    const boosted = calcCultivationRate(char, [], getLegacyCultivationMult({ daoxin: 2 }))
    expect(boosted / base).toBe(4)
  })

  it('stone node multiplies stone production factor', () => {
    expect(getLegacyStoneMult({ stoneVein: 3 })).toBe(27)
  })

  it('breakthrough node reduces the failure rate', () => {
    const char = makeChar({ realm: 2, realmStage: 3 })
    const without = calcBreakthroughFailureRate(char, 0)
    const withBonus = calcBreakthroughFailureRate(char, 0.05)
    expect(withBonus).toBeCloseTo(without - 0.05, 10)
    // 大额加成把失败率钳制到 0，不会出现负数
    expect(calcBreakthroughFailureRate(char, 0.5)).toBe(0)
  })
})

// ─── 飞升结算（§7.1） ────────────────────────────────────────────────

const baseSect: Sect = {
  name: '测试宗',
  level: 6,
  resources: { spiritStone: 2e39, spiritEnergy: 500, herb: 900, ore: 500 },
  buildings: [],
  characters: [],
  vault: [],
  maxVaultSlots: 50,
  pets: [],
  totalAdventureRuns: 3,
  totalBreakthroughs: 40,
  lastTransmissionTime: 0,
  techniqueCodex: ['qingxin'],
  offlineAccumulator: {
    resourcesGained: { spiritStone: 0, spiritEnergy: 0, herb: 0, ore: 0 },
    breakthroughs: [],
    itemsCrafted: [],
    taxIncome: 0,
  },
  sectPath: 'sword',
  activeRoute: null,
  unlockedPathNodeIds: [],
  pathUnlockedAt: null,
  legacy: { ascensionCount: 0, statBonus: 0, daoYun: 5, unlockedTechniques: [], unlockedDungeons: [] },
  legacyTree: { daoxin: 2, heavenPivot: 1 },
  archiveMilestones: [],
  automationSettings: {
    reserveSpiritStone: 300,
    reserveSpiritEnergy: 120,
    preferredDungeonId: null,
    casualtyTolerance: 'balanced',
    autoBreakthrough: true,
    productionFocus: 'balanced',
    overflowTriggerRatio: 0.9,
    herbOverflowRule: 'sell',
    oreOverflowRule: 'sell',
    spiritStoneOverflowRule: 'buyHerb',
    activeTemplateId: 'steadyHarvest',
    expeditionTemplates: [],
    routeShift: {
      currentArchetype: 'pillSustain',
      lastShiftAtDay: null,
      shiftCooldownDays: 3,
      pendingShift: null,
      blendDaysRemaining: 0,
    },
    productionCampaign: {
      activeCampaign: null,
      startedAtDay: null,
      durationHours: 8,
      cooldownHours: 4,
      cooldownRemainingHours: 0,
    },
    templateConfidence: [],
    autoAscend: true,
    autoAscendMinDaoYun: 30,
  },
  stats: {
    totalSpiritStoneEarned: 0,
    totalSpiritStoneSpent: 0,
    totalBattles: 0,
    totalVictories: 0,
    totalKills: 0,
    maxFloorCleared: 0,
    totalRecruits: 0,
    totalBreakthroughAttempts: 0,
    totalBreakthroughSuccesses: 0,
    totalBuildingUpgrades: 0,
    totalAdventureRuns: 0,
    totalAdventureCompletions: 0,
    totalAdventureFailures: 0,
    totalPetCaptures: 0,
    totalPlayTime: 1000,
    longestOfflineSeconds: 0,
    peakCultivationThisRun: 1e40,
  },
  currentArchetype: 'pillSustain',
  strategySettings: { activePolicy: 'balanced', switchCooldownDays: 3, lastSwitchedAt: null },
  autoRunDayCounter: 3,
  lastRandomEventTime: 0,
  monsterCodex: {},
  equipmentCodex: {},
  routeOpportunities: [],
}

function makeChar(overrides?: Partial<Character>): Character {
  return {
    id: 'c1',
    name: '护法弟子',
    title: 'disciple',
    quality: 'common',
    realm: 0,
    realmStage: 0,
    cultivation: 0,
    baseStats: { hp: 100, atk: 15, def: 8, spd: 10, crit: 0.05, critDmg: 1.5 },
    cultivationStats: { spiritPower: 50, maxSpiritPower: 50, comprehension: 10, spiritualRoot: 10, fortune: 5 },
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

function makeSect(overrides?: Partial<Sect>): Sect {
  const metBuildings = [
    'mainHall',
    'spiritMine',
    'spiritField',
    'market',
    'alchemyFurnace',
    'forge',
    'scriptureHall',
    'recruitmentPavilion',
  ].map((type) => ({
    type,
    level: 5,
    count: 1,
    unlocked: true,
    productionQueue: { recipeId: null, progress: 0 },
  }))
  return {
    ...baseSect,
    buildings: metBuildings,
    characters: [
      makeChar({ id: 'low', name: '小弟子', realm: 4, totalCultivation: 1e13 }),
      makeChar({ id: 'high', name: '渡劫真君', realm: 8, totalCultivation: 1e40 }),
    ],
    ...overrides,
  }
}

describe('performAscension (V2)', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('grants daoYun from the run peak and keeps the tree', () => {
    const { newSect, report } = performAscension(makeSect())
    expect(report.daoYunGain).toBe(34)
    expect(newSect.legacy.daoYun).toBe(5 + 34)
    expect(newSect.legacyTree).toEqual({ daoxin: 2, heavenPivot: 1 })
    expect(newSect.legacy.ascensionCount).toBe(1)
    expect(newSect.legacy.statBonus).toBe(5)
  })

  it('keeps the highest-realm disciple as guardian (reset, identity kept)', () => {
    const { newSect, report } = performAscension(makeSect())
    expect(newSect.characters).toHaveLength(1)
    const guardian = newSect.characters[0]
    expect(guardian.id).toBe('high')
    expect(report.guardianName).toBe('渡劫真君')
    expect(guardian.realm).toBe(0)
    expect(guardian.cultivation).toBe(0)
    expect(guardian.name).toBe('渡劫真君')
    expect(guardian.quality).toBe('common')
  })

  it('resets progress but preserves codex, milestones and cumulative stats', () => {
    const sect = makeSect()
    sect.archiveMilestones = ['firstDungeonClear']
    const { newSect } = performAscension(sect)
    expect(newSect.level).toBe(1)
    expect(newSect.resources.spiritStone).toBe(1000) // 首飞 x2 起始资金
    expect(newSect.vault).toHaveLength(0)
    expect(newSect.pets).toHaveLength(0)
    expect(newSect.stats.peakCultivationThisRun).toBe(0)
    expect(newSect.stats.totalPlayTime).toBe(1000)
    expect(newSect.monsterCodex).toBe(sect.monsterCodex)
    expect(newSect.techniqueCodex).toContain('qingxin')
  })
})

describe('auto ascension (§八)', () => {
  it('triggers only when node owned, enabled, eligible and threshold met', () => {
    expect(shouldAutoAscend(makeSect())).toBe(true)

    // threshold too high
    expect(
      shouldAutoAscend(makeSect({ automationSettings: { ...baseSect.automationSettings, autoAscendMinDaoYun: 100 } }))
    ).toBe(false)

    // node missing
    expect(shouldAutoAscend(makeSect({ legacyTree: {} }))).toBe(false)

    // disabled
    expect(
      shouldAutoAscend(makeSect({ automationSettings: { ...baseSect.automationSettings, autoAscend: false } }))
    ).toBe(false)

    // not eligible (buildings under-leveled)
    const weak = makeSect({
      buildings: [
        'mainHall',
        'spiritMine',
        'spiritField',
        'market',
        'alchemyFurnace',
        'forge',
        'scriptureHall',
        'recruitmentPavilion',
      ].map((type) => ({ type, level: 1, count: 1, unlocked: true, productionQueue: { recipeId: null, progress: 0 } })),
    })
    expect(canAscend(weak).canAscend).toBe(false)
    expect(shouldAutoAscend(weak)).toBe(false)
  })

  it('飞升门槛对齐 §5.1：需要弟子达到渡劫期（境界 ≥ 8），化神飞升是 0 道韵陷阱', () => {
    // buildings满足但最高境界只有化神（4）→ 不能飞升
    const huashenOnly = makeSect({
      characters: [makeChar({ id: 'a', realm: 4, totalCultivation: 1e13 })],
    })
    const check = canAscend(huashenOnly)
    expect(check.canAscend).toBe(false)
    expect(check.reasons.some((r) => r.includes('渡劫'))).toBe(true)

    // 渡劫期初期（境界 8）即满足境界条件
    const tribulationStage = makeSect({
      characters: [makeChar({ id: 'b', realm: 8, realmStage: 0, totalCultivation: 1e40 })],
    })
    expect(canAscend(tribulationStage).canAscend).toBe(true)
  })
})

// ─── B2 闭环：飞升加成真实进入战斗管线 ──────────────────────────────

describe('legacy combat stat pipeline (B2 closure)', () => {
  it('ascension tree battle node doubles unit stats', () => {
    const char = makeChar()
    const base = createCharacterCombatUnit(char, [], undefined, undefined, 0)
    const withNode = createCharacterCombatUnit(char, [], undefined, undefined, 100)
    expect(withNode.hp).toBe(Math.floor(base.hp * 2))
  })
})
