import type { Player } from '../types/player'
import type { Equipment, ItemQuality, EquipSlot } from '../types/item'
import type { ActiveSkill, Technique, SkillCategory, TechniqueType, Element } from '../types/skill'
import type { Building, BuildingType, Disciple, DiscipleQuality, Resources } from '../types/sect'
import type { Dungeon, Enemy, EventType } from '../types/adventure'

describe('Type instantiation', () => {
  it('should create a Player with all required fields', () => {
    const player: Player = {
      id: '1',
      name: '无名修士',
      realm: 0,
      realmStage: 0,
      cultivation: 0,
      baseStats: { hp: 100, atk: 15, def: 8, spd: 10, crit: 0.05, critDmg: 1.5 },
      cultivationStats: { spiritPower: 50, maxSpiritPower: 50, comprehension: 10, spiritualRoot: 10, fortune: 5 },
      equippedTechniques: [null, null, null],
      equippedSkills: [null, null, null, null, null],
      equippedGear: [null, null, null, null, null, null, null, null, null],
    }
    expect(player.baseStats.hp).toBe(100)
  })

  it('should create an Equipment with quality and slot', () => {
    const gear: Equipment = {
      id: '1',
      name: '青木剑',
      quality: 'spirit' as ItemQuality,
      slot: 'weapon' as EquipSlot,
      stats: { hp: 10, atk: 20, def: 0, spd: 2, crit: 0, critDmg: 0 },
      enhanceLevel: 0,
      refinementStats: [],
      setId: null,
    }
    expect(gear.quality).toBe('spirit')
  })

  it('should create a Building with type and level', () => {
    const building: Building = {
      type: 'mainHall' as BuildingType,
      level: 1,
      unlocked: true,
    }
    expect(building.level).toBe(1)
  })

  it('should create a Dungeon with layers', () => {
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
})
