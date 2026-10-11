import { describe, it, expect, beforeEach } from 'vitest'
import {
  calcGenesisGain,
  canProveDao,
  canTranscend,
  performDaoProving,
  performTranscendence,
  shouldAutoProveDao,
} from '../systems/sect/GenesisSystem'
import {
  GENESIS_TREE,
  getGenesisNodeUpgradeCost,
  getGenesisCultivationMult,
  getGenesisResourceMult,
  getGenesisDaoYunMult,
  getGenesisMortalSpeedMult,
  getGenesisImmortalSpeedMult,
  getGenesisStartingStoneMult,
  getGenesisExtraGuardians,
  getGenesisTreeTotalLevel,
} from '../data/genesisTree'
import { performAscension } from '../systems/sect/LegacySystem'
import { useSectStore } from '../stores/sectStore'
import { useEventLogStore } from '../stores/eventLogStore'
import { getRealmCost } from '../data/realms'
import type { Sect, Building, Character } from '../types'

// ─── V2.1 工单 09：证道 Prestige②（大道本源 / 本源树 / 超脱） ─────────────

function disciple(realm: number, name = '证道者'): Character {
  return {
    id: `pd-${realm}-${name}`,
    name,
    title: 'disciple',
    quality: 'divine',
    realm,
    realmStage: 3 as Character['realmStage'],
    cultivation: getRealmCost(realm),
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
    totalCultivation: getRealmCost(realm),
    specialties: [],
    assignedBuilding: null,
    cultivationPath: 'sword',
    investedSpiritStone: 0,
    techniqueComprehension: {},
  }
}

const building = (type: Building['type'], level: number): Building => ({
  type,
  level,
  count: level > 0 ? 1 : 0,
  unlocked: level > 0,
  productionQueue: { recipeId: null, progress: 0 },
})

function makeSect(realm: number, overrides: Partial<Sect> = {}): Sect {
  return {
    name: '证道宗',
    level: 8,
    resources: { spiritStone: 1e50, spiritEnergy: 100, herb: 100, ore: 100 },
    buildings: [
      ...(
        [
          'mainHall',
          'spiritField',
          'spiritMine',
          'market',
          'alchemyFurnace',
          'forge',
          'scriptureHall',
          'recruitmentPavilion',
        ] as const
      ).map((t) => building(t, 5)),
      building('immortalVein', 10),
      building('immortalField', 6),
      building('immortalPalace', 4),
    ],
    characters: [disciple(realm)],
    vault: [],
    maxVaultSlots: 50,
    pets: [],
    totalAdventureRuns: 0,
    totalBreakthroughs: 0,
    lastTransmissionTime: 0,
    techniqueCodex: [],
    offlineAccumulator: {
      resourcesGained: { spiritStone: 0, spiritEnergy: 0, herb: 0, ore: 0 },
      breakthroughs: [],
      itemsCrafted: [],
      taxIncome: 0,
    },
    sectPath: 'none',
    activeRoute: null,
    unlockedPathNodeIds: [],
    pathUnlockedAt: null,
    legacy: { ascensionCount: 3, statBonus: 15, daoYun: 5000, unlockedTechniques: [], unlockedDungeons: [] },
    legacyTree: { daoxin: 2 },
    archiveMilestones: [],
    automationSettings: {
      reserveSpiritStone: 300,
      reserveSpiritEnergy: 120,
      preferredDungeonId: null,
      casualtyTolerance: 'balanced',
      autoBreakthrough: false,
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
      autoAscend: false,
      autoAscendMinDaoYun: 0,
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
      totalPlayTime: 0,
      longestOfflineSeconds: 0,
      peakCultivationThisRun: getRealmCost(realm),
    },
    currentArchetype: 'pillSustain',
    strategySettings: { activePolicy: 'balanced', switchCooldownDays: 3, lastSwitchedAt: null },
    autoRunDayCounter: 0,
    lastRandomEventTime: 0,
    monsterCodex: {},
    equipmentCodex: new Map(),
    routeOpportunities: [],
    genesis: 0,
    daoProvingCount: 0,
    genesisTree: {},
    transcended: false,
    ...overrides,
  } as unknown as Sect
}

describe('大道本源公式', () => {
  it('首证（道祖圆满 1e100、零次）≈ 6~7，本源树前 2 列可点', () => {
    const first = calcGenesisGain(1e100, 12, 0)
    expect(first).toBeGreaterThanOrEqual(6)
    expect(first).toBeLessThanOrEqual(8)
    // 树最便宜两节点 baseCost 4/5 → 首证可点前 2 列
    const cheapest = [...GENESIS_TREE].sort((a, b) => a.baseCost - b.baseCost).slice(0, 2)
    expect(cheapest.every((n) => n.baseCost <= first)).toBe(true)
  })

  it('rush 停滞（同峰值 ×2/轮）且推深单调优（每 tenfold ×1.58）', () => {
    // 同峰值重复证道：仅次数项 ×2
    const rush1 = calcGenesisGain(1e100, 12, 0)
    const rush2 = calcGenesisGain(1e100, 12, 1)
    expect(rush2 / rush1).toBeCloseTo(2, 0)
    // 推深（更高峰值无法超 1e100，但峰值从 1e95 → 1e100 的段内推深有收益）
    const push = calcGenesisGain(1e95, 12, 1)
    expect(push).toBeGreaterThan(0)
    expect(calcGenesisGain(1e100, 12, 1)).toBeGreaterThan(push)
  })

  it('境界项只对仙界段生效（道祖 > 大罗 > 真仙）', () => {
    expect(calcGenesisGain(1e100, 12, 0)).toBeGreaterThan(calcGenesisGain(1e100, 11, 0))
    expect(calcGenesisGain(1e100, 11, 0)).toBeGreaterThan(calcGenesisGain(1e100, 9, 0))
    // 凡界峰值（渡劫 1e40）极小——证道基本不可行，公式不崩溃
    expect(calcGenesisGain(1e40, 8, 0)).toBe(0) // floor 下限
  })

  it('零峰值返回 0', () => {
    expect(calcGenesisGain(0, 12, 0)).toBe(0)
  })
})

describe('证道条件与结算', () => {
  it('canProveDao：道祖解锁、渡劫不够', () => {
    expect(canProveDao(makeSect(12)).canProve).toBe(true)
    expect(canProveDao(makeSect(8)).canProve).toBe(false)
  })

  it('performDaoProving：重置凡界与仙界、护法境界归零、本源入账', () => {
    const sect = makeSect(12)
    const { newSect, report } = performDaoProving(sect)
    expect(report.genesisGain).toBeGreaterThanOrEqual(6)
    expect(newSect.genesis).toBe(report.genesisGain)
    expect(newSect.daoProvingCount).toBe(1)
    // 全建筑重置（含仙界）
    expect(
      newSect.buildings.every((b) =>
        !['immortalVein', 'immortalField', 'immortalPalace'].includes(b.type) ? b.level <= 1 : b.level === 0
      )
    ).toBe(true)
    expect(newSect.buildings.find((b) => b.type === 'immortalVein')!.level).toBe(0)
    // 护法保留但境界归零
    expect(newSect.characters[0].realm).toBe(0)
    expect(newSect.characters[0].name).toBe('证道者')
    // 保留：道韵/飞升树/图鉴/里程碑/统计、本源树
    expect(newSect.legacy.daoYun).toBe(5000)
    expect(newSect.legacyTree.daoxin).toBe(2)
    expect(newSect.genesisTree).toEqual({})
    expect(newSect.stats.peakCultivationThisRun).toBe(0)
  })

  it('校准律：第 2 轮证道全局产出倍率 ≥ 第 1 轮 ×3（次数项 ×2 × 大道之干增量）', () => {
    // 第 1 轮后买"大道筑基"1 级（×2），第 2 轮结算再拿次数项 ×2 → 全局 4x ≥ 3x
    const sectRound1 = makeSect(12)
    const r1 = performDaoProving(sectRound1)
    // 二轮之间重修回道祖：peak 恢复 1e100，并买下大道筑基 1 级
    // 二轮之间重修回道祖：护法境界与 peak 恢复，并买下大道筑基 1 级
    const afterTree = {
      ...r1.newSect,
      characters: [disciple(12)],
      genesisTree: { daoBody: 1 },
      stats: { ...r1.newSect.stats, peakCultivationThisRun: getRealmCost(12) },
    }
    const r2 = performDaoProving(afterTree)
    const multRound1 = getGenesisCultivationMult({}) // 第 1 轮开局 1x
    const multRound2 = getGenesisCultivationMult(r2.newSect.genesisTree) // 第 2 轮 2x
    const gainRatio = r2.report.genesisGain / r1.report.genesisGain
    expect((gainRatio * multRound2) / multRound1).toBeGreaterThanOrEqual(3)
  })
})

describe('本源树', () => {
  it('成本 ×2^level、效果查询正确', () => {
    expect(getGenesisNodeUpgradeCost('daoBody', 0)).toBe(5)
    expect(getGenesisNodeUpgradeCost('daoBody', 1)).toBe(10)
    expect(getGenesisNodeUpgradeCost('daoBody', 5)).toBeNull()
    expect(getGenesisCultivationMult({ daoBody: 2 })).toBe(4)
    expect(getGenesisResourceMult({ daoFlow: 1 })).toBe(2)
    expect(getGenesisDaoYunMult({ daoEssenceSea: 1 })).toBe(2)
    expect(getGenesisMortalSpeedMult({ samsaraMortal: 2 })).toBe(4)
    expect(getGenesisImmortalSpeedMult({ samsaraImmortal: 1 })).toBe(2)
    expect(getGenesisStartingStoneMult({ creationWealth: 1 })).toBe(10)
    expect(getGenesisExtraGuardians({ creationDisciples: 2 })).toBe(2)
    expect(getGenesisTreeTotalLevel({ daoBody: 2, daoFlow: 3 })).toBe(5)
  })

  it('造化灵蕴：飞升开局灵石 ×10/级（performAscension 消费）', () => {
    const base = makeSect(12)
    const boosted = { ...base, genesisTree: { creationWealth: 1 } }
    const plain = performAscension(base).newSect
    const rich = performAscension(boosted).newSect
    expect(rich.resources.spiritStone).toBe(plain.resources.spiritStone * 10)
  })
})

describe('超脱', () => {
  it('条件矩阵：节点 + 30 级 + 道祖弟子', () => {
    const base = makeSect(12)
    expect(canTranscend(base).canProve).toBe(false)
    const gated = { ...base, genesisTree: { heavenTranscend: 1 } }
    expect(canTranscend(gated).canProve).toBe(false) // 缺 30 级
    const ready = {
      ...gated,
      genesisTree: {
        heavenTranscend: 1,
        daoBody: 5,
        daoFlow: 5,
        daoEssenceSea: 3,
        samsaraMortal: 4,
        samsaraImmortal: 4,
        samsaraBreakthrough: 3,
        creationWealth: 3,
        creationDisciples: 3,
      },
    }
    expect(getGenesisTreeTotalLevel(ready.genesisTree)).toBeGreaterThanOrEqual(30)
    expect(canTranscend(ready).canProve).toBe(true)
  })

  it('performTranscendence 标记无尽模式', () => {
    const done = performTranscendence(makeSect(12))
    expect(done.transcended).toBe(true)
  })
})

describe('自动证道', () => {
  it('shouldAutoProveDao：节点 + 资格 + 门槛', () => {
    const daozu = makeSect(12)
    expect(shouldAutoProveDao(daozu, 0)).toBe(false) // 无节点
    const withNode = { ...daozu, genesisTree: { heavenAutoProve: 1 } }
    expect(shouldAutoProveDao(withNode, 0)).toBe(true)
    expect(shouldAutoProveDao(withNode, 999)).toBe(false) // 门槛
    const mortal = { ...makeSect(8), genesisTree: { heavenAutoProve: 1 } }
    expect(shouldAutoProveDao(mortal, 0)).toBe(false) // 无道祖
  })
})

describe('证道 store action', () => {
  beforeEach(() => {
    useSectStore.getState().reset()
    useEventLogStore.getState().reset()
  })

  it('proveDao 成功入账并重置，事件入日志', () => {
    useSectStore.setState((s) => ({ sect: { ...makeSect(12), automationSettings: s.sect.automationSettings } }))
    const result = useSectStore.getState().proveDao()
    expect(result.success).toBe(true)
    expect(useSectStore.getState().sect.genesis).toBeGreaterThanOrEqual(6)
    expect(useSectStore.getState().sect.daoProvingCount).toBe(1)
    expect(useEventLogStore.getState().events.some((e) => e.message.includes('证道功成'))).toBe(true)
  })

  it('buyGenesisNode：扣本源升节点', () => {
    useSectStore.setState((s) => ({ sect: { ...s.sect, genesis: 20 } }))
    expect(useSectStore.getState().buyGenesisNode('daoBody')).toBe(true)
    const sect = useSectStore.getState().sect
    expect(sect.genesis).toBe(15)
    expect(sect.genesisTree.daoBody).toBe(1)
  })
})
