import { describe, it, expect, beforeEach } from 'vitest'
import {
  REALMS,
  REALM_EXP,
  IMMORTAL_REALM_INDEX,
  getRealmCost,
  getRealmSpeedMult,
  getRealmEconomyMult,
  getRealmStatMultiplier,
  getBreakthroughResourceCost,
} from '../data/realms'
import {
  GENERATOR_SPECS,
  getImmortalFieldEnergyRate,
  getImmortalFieldHerbRate,
  getImmortalPalaceCultivationMult,
  getImmortalVeinStoneRate,
  getMilestonesReached,
  getSectMilestoneRateMult,
} from '../data/buildings'
import { checkBuildingUnlock } from '../systems/sect/BuildingSystem'
import { canAscend, performAscension } from '../systems/sect/LegacySystem'
import { useSectStore } from '../stores/sectStore'
import { useEventLogStore } from '../stores/eventLogStore'
import { loadGame, saveGame } from '../systems/save/SaveSystem'
import { _resetDB, getDB } from '../systems/save/db'
import { useAdventureStore } from '../stores/adventureStore'
import { useGameStore } from '../stores/gameStore'
import type { Sect, Building, Character } from '../types'

// ─── V2.1 工单 07：仙界层核心（曲线衔接 / 仙界建筑 / 双层咬合） ────────────

const IMMO_TYPES = ['immortalVein', 'immortalField', 'immortalPalace'] as const

function disciple(realm: number, stage = 3, totalCultivation = getRealmCost(realm)): Character {
  return {
    id: `immo-${realm}`,
    name: `仙人${realm}`,
    title: 'disciple',
    quality: 'spirit',
    realm,
    realmStage: stage as Character['realmStage'],
    cultivation: totalCultivation,
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
    totalCultivation,
    specialties: [],
    assignedBuilding: null,
    cultivationPath: 'sword',
    investedSpiritStone: 0,
    techniqueComprehension: {},
  }
}

describe('仙界曲线衔接（1e40 → 1e100）', () => {
  it('13 境表：仙界 4 境、属性倍率 ×10、速率覆盖成本', () => {
    expect(REALM_EXP).toEqual([2, 4, 6, 9, 13, 18, 24, 31, 40, 50, 65, 80, 100])
    expect(IMMORTAL_REALM_INDEX).toBe(9)
    expect(REALMS).toHaveLength(13)
    expect(REALMS[9].name).toBe('真仙期')
    expect(REALMS[12].name).toBe('道祖期')
    expect(getRealmStatMultiplier(8)).toBe(8)
    expect(getRealmStatMultiplier(9)).toBe(10)
    // 速率覆盖成本：fresh 弟子跨境耗时 = 600×2^i（PACING 锚点）
    for (let i = 9; i < REALM_EXP.length; i++) {
      const cost = getRealmCost(i)
      const rate = 5 * getRealmSpeedMult(i)
      expect(cost / rate).toBeCloseTo(600 * 2 ** i, -3)
    }
  })

  it('经济耦合连续且覆盖仙界突破成本（斜率 1.0）', () => {
    // 连续性：渡劫(8) → 真仙(9) → 道祖(12) 无跳变缺口
    expect(getRealmEconomyMult(9)).toBe(1e48)
    expect(getRealmEconomyMult(10)).toBe(1e63)
    expect(getRealmEconomyMult(13)).toBe(getRealmEconomyMult(12)) // clamp
    // 攒石耗时 = 2/mineRate（境界无关常数）
    for (let i = 8; i < 12; i++) {
      const cost = getBreakthroughResourceCost(i, 3).spiritStone
      const income = 5 * getRealmEconomyMult(i + 1)
      expect(cost / income).toBeLessThan(1) // 远小于本境修炼秒数
    }
  })

  it('仙界突破成本（大境界 + 小境界）全部有限', () => {
    for (let i = 9; i <= 11; i++) {
      // 道祖（12）为最后一境，stage 3 无下一次大境界突破
      expect(Number.isFinite(getBreakthroughResourceCost(i, 3).spiritStone)).toBe(true)
      for (const stage of [0, 1, 2]) {
        expect(Number.isFinite(getBreakthroughResourceCost(i, stage).spiritStone)).toBe(true)
      }
    }
  })
})

describe('仙界建筑线', () => {
  it('Generator 成本 1e42 量级起步且无上限', () => {
    expect(GENERATOR_SPECS.immortalVein.baseCost).toBe(1e42)
    expect(GENERATOR_SPECS.immortalField.baseCost).toBe(3e42)
    expect(GENERATOR_SPECS.immortalPalace.baseCost).toBe(1e43)
  })

  it('产出 1 级锚定后指数增长', () => {
    expect(getImmortalVeinStoneRate(1)).toBe(50)
    expect(getImmortalVeinStoneRate(2)).toBeCloseTo(60, 10)
    expect(getImmortalFieldEnergyRate(1)).toBe(40)
    expect(getImmortalFieldHerbRate(1)).toBe(2)
    expect(getImmortalPalaceCultivationMult(1)).toBeCloseTo(1.05, 10)
    expect(getImmortalPalaceCultivationMult(180)).toBe(10) // 软上限
    expect(getImmortalPalaceCultivationMult(500)).toBe(10)
  })

  it('真仙期前锁定、飞升后可解锁', () => {
    const buildings: Building[] = IMMO_TYPES.map((type) => ({
      type,
      level: 0,
      count: 0,
      unlocked: false,
      productionQueue: { recipeId: null, progress: 0 },
    }))
    expect(checkBuildingUnlock('immortalVein', buildings, undefined, 8).unlocked).toBe(false)
    expect(checkBuildingUnlock('immortalVein', buildings, undefined, 9).unlocked).toBe(true)
  })

  it('里程碑真实生效（万脉朝宗 rateMult）', () => {
    const buildings: Building[] = [
      { type: 'immortalVein', level: 100, count: 1, unlocked: true, productionQueue: { recipeId: null, progress: 0 } },
    ]
    expect(getSectMilestoneRateMult(buildings, 'spiritStone')).toBe(6) // Lv10 ×2 · Lv50 ×3
    expect(getMilestonesReached('immortalVein', 100)).toHaveLength(3)
  })
})

describe('双层咬合（飞升重置凡界、保留仙界）', () => {
  const building = (type: Building['type'], level: number): Building => ({
    type,
    level,
    count: level > 0 ? 1 : 0,
    unlocked: level > 0,
    productionQueue: { recipeId: null, progress: 0 },
  })

  function makeSect(realm: number): Sect {
    return {
      name: '咬合宗',
      level: 5,
      resources: { spiritStone: 1e10, spiritEnergy: 100, herb: 50, ore: 50 },
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
        ).map((type) => building(type, 5)),
        building('immortalVein', realm >= 9 ? 7 : 0),
        building('immortalField', realm >= 9 ? 4 : 0),
        building('immortalPalace', realm >= 9 ? 3 : 0),
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
      legacy: { ascensionCount: 0, statBonus: 0, daoYun: 0, unlockedTechniques: [], unlockedDungeons: [] },
      legacyTree: {},
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
    } as unknown as Sect
  }

  it('canAscend：仙界建筑不挡飞升（未解锁 level 0 不计入）', () => {
    const mortalSect = makeSect(8)
    mortalSect.buildings = mortalSect.buildings.filter((b) => !IMMO_TYPES.includes(b.type as never))
    expect(canAscend(mortalSect).canAscend).toBe(true)
    // 带着未解锁仙界建筑（level 0）也不挡
    expect(canAscend(makeSect(8)).canAscend).toBe(true)
  })

  it('凡界护法：境界归零、仙界建筑重置（首飞前无仙界进度）', () => {
    const { newSect } = performAscension(makeSect(8))
    expect(newSect.characters[0].realm).toBe(0)
    const vein = newSect.buildings.find((b) => b.type === 'immortalVein')!
    expect(vein.level).toBe(0)
    expect(vein.unlocked).toBe(false)
  })

  it('仙界护法：境界修为完整保留、仙界建筑等级保留（二次飞升）', () => {
    const immortalSect = makeSect(10) // 大罗期护法
    immortalSect.characters[0].id = 'immortal-guardian'
    const { newSect, report } = performAscension(immortalSect)
    expect(newSect.characters[0].realm).toBe(10)
    expect(newSect.characters[0].totalCultivation).toBe(getRealmCost(10))
    expect(newSect.buildings.find((b) => b.type === 'immortalVein')!.level).toBe(7)
    expect(newSect.buildings.find((b) => b.type === 'immortalField')!.level).toBe(4)
    // 凡界建筑照常重置
    expect(newSect.buildings.find((b) => b.type === 'market')!.level).toBe(0)
    // 道韵 peak 取仙界峰值（peakCultivationThisRun = 1e65 > 凡界 1e40）
    expect(report.daoYunGain).toBeGreaterThan(0)
    expect(newSect.stats.peakCultivationThisRun).toBe(0) // 结算后清零
  })
})

describe('旧档加载自动补仙界建筑（v14）', () => {
  beforeEach(async () => {
    _resetDB()
    await indexedDB.deleteDatabase('endlessquest_db')
    localStorage.clear()
    useSectStore.getState().reset()
    useAdventureStore.getState().reset()
    useEventLogStore.getState().reset()
    useGameStore.getState().reset()
  })

  it('v12 时代存档（8 建筑）加载后自动补 3 座仙界建筑缺省行', async () => {
    useGameStore.getState().startGame()
    await saveGame()
    // 模拟旧档：删除仙界建筑行 + 版本回写 12
    const db = await getDB()
    for (const type of IMMO_TYPES) await db.delete('buildings', type)
    const meta = (await db.get('meta', 1)) as Record<string, unknown>
    await db.put('meta', { ...meta, version: 12 })

    useSectStore.getState().reset()
    expect(await loadGame()).toBe(true)
    const sect = useSectStore.getState().sect
    for (const type of IMMO_TYPES) {
      const b = sect.buildings.find((x) => x.type === type)
      expect(b).toBeDefined()
      expect(b!.level).toBe(0)
      expect(b!.unlocked).toBe(false)
    }
  })
})
