import type {
  Character,
  CharacterTitle,
  CharacterQuality,
  CharacterStatus,
  RealmStage,
  BaseStats,
  CultivationStats,
} from '../types/character'

import type {
  Technique,
  TechniqueTier,
  TechniqueBonus,
} from '../types/technique'

import type {
  Element,
  SkillCategory,
  TechniqueType,
  ActiveSkill,
} from '../types/skill'

import type {
  ItemQuality,
  EquipSlot,
  ItemStats,
  Item,
  Equipment,
  Consumable,
  Material,
  AnyItem,
  TechniqueScroll,
} from '../types/item'

import type {
  BuildingType,
  ResourceType,
  Resources,
  Building,
  Sect,
} from '../types/sect'

import type {
  EventType,
  Enemy,
  DungeonEvent,
  RouteOption,
  DungeonFloor,
  Dungeon,
  DungeonRun,
  MemberState,
  LogEntry,
} from '../types/adventure'

import { ELEMENT_NAMES, COUNTER_MAP } from '../types/skill'
import { TECHNIQUE_TIER_NAMES, TECHNIQUE_TIER_ORDER } from '../types/technique'

describe('Character types', () => {
  it('should create a Character with all required fields', () => {
    const baseStats: BaseStats = { hp: 100, atk: 15, def: 8, spd: 10, crit: 0.05, critDmg: 1.5 }
    const cultivationStats: CultivationStats = {
      spiritPower: 50, maxSpiritPower: 50, comprehension: 10, spiritualRoot: 10, fortune: 5,
    }
    const char: Character = {
      id: '1',
      name: '无名修士',
      title: 'disciple',
      quality: 'common',
      realm: 0,
      realmStage: 0,
      cultivation: 0,
      baseStats,
      cultivationStats,
      currentTechnique: null,
      techniqueComprehension: 0,
      learnedTechniques: [],
      equippedGear: [null, null, null, null, null, null, null, null, null],
      equippedSkills: [null, null, null, null, null],
      backpack: [],
      maxBackpackSlots: 20,
      petIds: [],
      status: 'idle',
      injuryTimer: 0,
      createdAt: Date.now(),
      totalCultivation: 0,
    }
    expect(char.baseStats.hp).toBe(100)
    expect(char.title).toBe('disciple')
    expect(char.quality).toBe('common')
    expect(char.realmStage).toBe(0)
    expect(char.equippedGear).toHaveLength(9)
    expect(char.equippedSkills).toHaveLength(5)
    expect(char.maxBackpackSlots).toBe(20)
  })

  it('should accept all CharacterTitle values', () => {
    const titles: CharacterTitle[] = ['disciple', 'seniorDisciple', 'master', 'elder']
    expect(titles).toHaveLength(4)
  })

  it('should accept all CharacterQuality values', () => {
    const qualities: CharacterQuality[] = ['common', 'spirit', 'immortal', 'divine', 'chaos']
    expect(qualities).toHaveLength(5)
  })

  it('should accept all CharacterStatus values', () => {
    const statuses: CharacterStatus[] = ['idle', 'cultivating', 'adventuring', 'injured', 'resting', 'training']
    expect(statuses).toHaveLength(6)
  })

  it('should accept all RealmStage values', () => {
    const stages: RealmStage[] = [0, 1, 2, 3]
    expect(stages).toHaveLength(4)
  })
})

describe('Technique types', () => {
  it('should create a Technique with all required fields', () => {
    const technique: Technique = {
      id: 't1',
      name: '太乙真经',
      description: '上古心法',
      tier: 'spirit',
      element: 'fire',
      growthModifiers: { hp: 10, atk: 5, def: 3, spd: 2, crit: 0.01, critDmg: 0.1 },
      fixedBonuses: [{ type: 'spiritPower', value: 20 }],
      requirements: { minRealm: 0, minComprehension: 5 },
      comprehensionDifficulty: 3,
    }
    expect(technique.tier).toBe('spirit')
    expect(technique.growthModifiers.hp).toBe(10)
    expect(technique.fixedBonuses[0].type).toBe('spiritPower')
  })

  it('should accept all TechniqueTier values', () => {
    const tiers: TechniqueTier[] = ['mortal', 'spirit', 'immortal', 'divine', 'chaos']
    expect(tiers).toHaveLength(5)
  })

  it('TECHNIQUE_TIER_NAMES should map tiers to Chinese names', () => {
    expect(TECHNIQUE_TIER_NAMES).toBeDefined()
    expect(Object.keys(TECHNIQUE_TIER_NAMES)).toHaveLength(5)
    expect(TECHNIQUE_TIER_NAMES.mortal).toBe('凡级')
    expect(TECHNIQUE_TIER_NAMES.chaos).toBe('混沌级')
  })

  it('TECHNIQUE_TIER_ORDER should define ordering', () => {
    expect(TECHNIQUE_TIER_ORDER).toBeDefined()
    expect(TECHNIQUE_TIER_ORDER).toHaveLength(5)
    expect(TECHNIQUE_TIER_ORDER[0]).toBe('mortal')
    expect(TECHNIQUE_TIER_ORDER[4]).toBe('chaos')
  })
})

describe('Skill types', () => {
  it('should create an ActiveSkill', () => {
    const skill: ActiveSkill = {
      id: 's1',
      name: '烈火术',
      category: 'attack',
      element: 'fire',
      multiplier: 1.5,
      spiritCost: 10,
      cooldown: 3,
      description: '发射火球',
      tier: 1,
    }
    expect(skill.element).toBe('fire')
  })

  it('Element should include neutral', () => {
    const elements: Element[] = ['fire', 'ice', 'lightning', 'healing', 'neutral']
    expect(elements).toHaveLength(5)
  })

  it('ELEMENT_NAMES should include neutral', () => {
    expect(ELEMENT_NAMES.neutral).toBe('无')
  })

  it('COUNTER_MAP should include neutral entries', () => {
    // neutral vs any = 1.0, so it should not counter anything or be countered
    expect(COUNTER_MAP['neutral']).toBeUndefined()
    // And no element should counter neutral
    for (const key of Object.keys(COUNTER_MAP)) {
      expect(COUNTER_MAP[key]).not.toBe('neutral')
    }
  })
})

describe('Item types', () => {
  it('should create Equipment', () => {
    const gear: Equipment = {
      id: '1',
      name: '青木剑',
      quality: 'spirit',
      type: 'equipment',
      slot: 'weapon',
      stats: { hp: 10, atk: 20, def: 0, spd: 2, crit: 0, critDmg: 0 },
      enhanceLevel: 0,
      refinementStats: [],
      setId: null,
      description: '灵木所铸',
      sellPrice: 100,
    }
    expect(gear.quality).toBe('spirit')
  })

  it('should create Consumable', () => {
    const potion: Consumable = {
      id: '2',
      name: '回气丹',
      quality: 'common',
      type: 'consumable',
      effect: { type: 'heal', value: 50 },
      description: '恢复灵力',
      sellPrice: 10,
    }
    expect(potion.type).toBe('consumable')
  })

  it('should create Material', () => {
    const herb: Material = {
      id: '3',
      name: '灵草',
      quality: 'common',
      type: 'material',
      category: 'herb',
      description: '常见灵草',
      sellPrice: 5,
    }
    expect(herb.category).toBe('herb')
  })

  it('should create TechniqueScroll', () => {
    const scroll: TechniqueScroll = {
      id: 'ts1',
      name: '太乙真经残卷',
      quality: 'spirit',
      type: 'techniqueScroll',
      description: '记载着太乙真经的残卷',
      sellPrice: 500,
      techniqueId: 't1',
    }
    expect(scroll.type).toBe('techniqueScroll')
    expect(scroll.techniqueId).toBe('t1')
  })

  it('AnyItem should accept all item types including TechniqueScroll', () => {
    const items: AnyItem[] = [
      {
        id: '1', name: '剑', quality: 'common', type: 'equipment',
        slot: 'weapon', stats: { hp: 0, atk: 10, def: 0, spd: 0, crit: 0, critDmg: 0 },
        enhanceLevel: 0, refinementStats: [], setId: null, description: '', sellPrice: 10,
      },
      {
        id: '2', name: '丹', quality: 'common', type: 'consumable',
        effect: { type: 'heal', value: 10 }, description: '', sellPrice: 5,
      },
      {
        id: '3', name: '草', quality: 'common', type: 'material',
        category: 'herb', description: '', sellPrice: 1,
      },
      {
        id: '4', name: '残卷', quality: 'spirit', type: 'techniqueScroll',
        description: '', sellPrice: 100, techniqueId: 't1',
      },
    ]
    expect(items).toHaveLength(4)
  })
})

describe('Sect types', () => {
  it('should create a Building', () => {
    const building: Building = {
      type: 'mainHall',
      level: 1,
      unlocked: true,
    }
    expect(building.type).toBe('mainHall')
  })

  it('should create a Resources object', () => {
    const res: Resources = {
      spiritStone: 1000,
      spiritEnergy: 500,
      herb: 10,
      ore: 5,
    }
    expect(res.spiritStone).toBe(1000)
  })

  it('should create a Sect without old Disciple/SectState types', () => {
    const sect: Sect = {
      name: '青云宗',
      level: 1,
      resources: {
        spiritStone: 1000,
        spiritEnergy: 500,
        herb: 10,
        ore: 5,
      },
      buildings: [{ type: 'mainHall', level: 1, unlocked: true }],
      characters: [],
      vault: [],
      maxVaultSlots: 50,
      pets: [],
      totalAdventureRuns: 0,
      totalBreakthroughs: 0,
    }
    expect(sect.name).toBe('青云宗')
    expect(sect.level).toBe(1)
    expect(sect.characters).toEqual([])
    expect(sect.vault).toEqual([])
  })

  it('should accept all BuildingType values', () => {
    const types: BuildingType[] = [
      'mainHall', 'spiritField', 'market', 'alchemyFurnace',
      'forge', 'scriptureHall', 'recruitmentPavilion', 'trainingHall',
    ]
    expect(types).toHaveLength(8)
  })

  it('should accept all ResourceType values', () => {
    const types: ResourceType[] = [
      'spiritStone', 'spiritEnergy', 'herb', 'ore',
    ]
    expect(types).toHaveLength(4)
  })
})

describe('Adventure types', () => {
  it('should create a Dungeon with floors', () => {
    const dungeon: Dungeon = {
      id: 'lingCaoValley',
      name: '灵草谷',
      totalLayers: 5,
      eventsPerLayer: 3,
      unlockRealm: 0,
      unlockStage: 3,
      lootTable: [],
    }
    expect(dungeon.totalLayers).toBe(5)
  })

  it('should create a DungeonFloor (renamed from DungeonLayer)', () => {
    const floor: DungeonFloor = {
      floor: 1,
      isBossFloor: false,
      routes: [{
        id: 'route_1_0',
        name: '安全路线',
        description: '低风险',
        riskLevel: 'low',
        events: [{ type: 'combat' }],
        reward: { spiritStone: 100, herb: 5, ore: 3 },
      }],
    }
    expect(floor.floor).toBe(1)
  })

  it('should create a new DungeonRun with team-based structure', () => {
    const run: DungeonRun = {
      id: 'run1',
      dungeonId: 'lingCaoValley',
      teamCharacterIds: ['char1', 'char2'],
      currentFloor: 1,
      floors: [],
      memberStates: {
        char1: { currentHp: 100, maxHp: 100, status: 'alive' },
        char2: { currentHp: 80, maxHp: 100, status: 'alive' },
      },
      totalRewards: {
        spiritStone: 100, spiritEnergy: 0, herb: 5, ore: 0,
      },
      itemRewards: [],
      eventLog: [{ timestamp: Date.now(), message: '进入灵草谷' }],
      status: 'active',
      supplyLevel: 'basic',
      rewardMultiplier: 1.0,
    }
    expect(run.teamCharacterIds).toHaveLength(2)
    expect(run.memberStates['char1'].status).toBe('alive')
    expect(run.status).toBe('active')
    expect(run.supplyLevel).toBe('basic')
    expect(run.rewardMultiplier).toBe(1.0)
  })

  it('MemberState should accept all status values', () => {
    const states: MemberState[] = [
      { currentHp: 100, maxHp: 100, status: 'alive' },
      { currentHp: 0, maxHp: 100, status: 'dead' },
      { currentHp: 30, maxHp: 100, status: 'wounded' },
    ]
    expect(states).toHaveLength(3)
  })

  it('LogEntry should have timestamp and message', () => {
    const entry: LogEntry = { timestamp: Date.now(), message: '战斗胜利' }
    expect(entry.message).toBe('战斗胜利')
  })

  it('DungeonRun status should accept all values', () => {
    const statuses: DungeonRun['status'][] = ['active', 'retreated', 'completed', 'failed']
    expect(statuses).toHaveLength(4)
  })
})
