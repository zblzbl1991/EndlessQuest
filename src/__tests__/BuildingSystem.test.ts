// src/__tests__/BuildingSystem.test.ts

import { checkBuildingUnlock, canUpgradeBuilding } from '../systems/sect/BuildingSystem'
import type { Building } from '../types/sect'

function createBuildings(overrides?: Partial<Record<string, { level: number; unlocked: boolean }>>): Building[] {
  const defaults: Record<string, { level: number; unlocked: boolean }> = {
    mainHall: { level: 1, unlocked: true },
    spiritField: { level: 0, unlocked: false },
    spiritMine: { level: 0, unlocked: false },
    market: { level: 0, unlocked: false },
    alchemyFurnace: { level: 0, unlocked: false },
    forge: { level: 0, unlocked: false },
    scriptureHall: { level: 0, unlocked: false },
    recruitmentPavilion: { level: 0, unlocked: false },
  }
  return Object.entries({ ...defaults, ...overrides }).map(([type, val]) => ({
    type: type as Building['type'],
    ...val,
    productionQueue: { recipeId: null, progress: 0 },
  }))
}

describe('checkBuildingUnlock', () => {
  it('mainHall should always be unlocked (初始)', () => {
    const buildings = createBuildings()
    const result = checkBuildingUnlock('mainHall', buildings)
    expect(result.unlocked).toBe(true)
    expect(result.reason).toBe('')
  })

  it('already unlocked building should return unlocked', () => {
    const buildings = createBuildings({ mainHall: { level: 1, unlocked: true } })
    const result = checkBuildingUnlock('mainHall', buildings)
    expect(result.unlocked).toBe(true)
  })

  it('spiritField should unlock at mainHall Lv1', () => {
    const buildings = createBuildings({ mainHall: { level: 1, unlocked: true } })
    const result = checkBuildingUnlock('spiritField', buildings)
    expect(result.unlocked).toBe(true)
  })

  it('market should unlock at mainHall Lv1', () => {
    const buildings = createBuildings({ mainHall: { level: 1, unlocked: true } })
    const result = checkBuildingUnlock('market', buildings)
    expect(result.unlocked).toBe(true)
  })

  it('spiritField should always be unlocked (初始)', () => {
    const buildings = createBuildings({ mainHall: { level: 0, unlocked: true } })
    const result = checkBuildingUnlock('spiritField', buildings)
    expect(result.unlocked).toBe(true)
  })

  it('alchemyFurnace should require mainHall Lv2 and spiritField Lv2', () => {
    // Only mainHall Lv2, spiritField missing
    const buildings = createBuildings({ mainHall: { level: 2, unlocked: true } })
    const result = checkBuildingUnlock('alchemyFurnace', buildings)
    expect(result.unlocked).toBe(false)
    expect(result.reason).toContain('灵田')
  })

  it('alchemyFurnace should fail with mainHall Lv1', () => {
    const buildings = createBuildings({
      mainHall: { level: 1, unlocked: true },
      spiritField: { level: 2, unlocked: false },
    })
    const result = checkBuildingUnlock('alchemyFurnace', buildings)
    expect(result.unlocked).toBe(false)
    expect(result.reason).toContain('主殿')
  })

  it('alchemyFurnace should unlock with mainHall Lv2 + spiritField Lv2', () => {
    const buildings = createBuildings({
      mainHall: { level: 2, unlocked: true },
      spiritField: { level: 2, unlocked: false },
    })
    const result = checkBuildingUnlock('alchemyFurnace', buildings)
    expect(result.unlocked).toBe(true)
  })

  it('scriptureHall should require mainHall Lv3', () => {
    const buildings = createBuildings({ mainHall: { level: 2, unlocked: true } })
    const result = checkBuildingUnlock('scriptureHall', buildings)
    expect(result.unlocked).toBe(false)
    expect(result.reason).toContain('主殿')
  })

  it('scriptureHall should unlock at mainHall Lv3', () => {
    const buildings = createBuildings({ mainHall: { level: 3, unlocked: true } })
    const result = checkBuildingUnlock('scriptureHall', buildings)
    expect(result.unlocked).toBe(true)
  })

  it('spiritMine should always be unlocked (初始)', () => {
    const buildings = createBuildings()
    const result = checkBuildingUnlock('spiritMine', buildings)
    expect(result.unlocked).toBe(true)
  })

  it('unknown building type should return not unlocked', () => {
    const buildings = createBuildings()
    const result = checkBuildingUnlock('unknown' as Building['type'], buildings)
    expect(result.unlocked).toBe(false)
    expect(result.reason).toBe('未知建筑')
  })
})

describe('canUpgradeBuilding', () => {
  it('should allow upgrade with sufficient spirit stone', () => {
    const buildings = createBuildings({ mainHall: { level: 1, unlocked: true } })
    const result = canUpgradeBuilding('mainHall', buildings, 700)
    expect(result.canUpgrade).toBe(true)
    expect(result.cost.spiritStone).toBe(Math.round(200 * Math.pow(2, 1.7))) // 200 * 2^1.7 ≈ 650
  })

  it('should reject upgrade without enough spirit stone', () => {
    const buildings = createBuildings({ mainHall: { level: 1, unlocked: true } })
    const result = canUpgradeBuilding('mainHall', buildings, 50)
    expect(result.canUpgrade).toBe(false)
    expect(result.reason).toBe('灵石不足')
  })

  it('should reject upgrade for locked building', () => {
    const buildings = createBuildings()
    const result = canUpgradeBuilding('spiritField', buildings, 1000)
    expect(result.canUpgrade).toBe(false)
    expect(result.reason).toBe('未解锁')
  })

  it('should reject upgrade for max level building', () => {
    const buildings = createBuildings({ mainHall: { level: 10, unlocked: true } })
    const result = canUpgradeBuilding('mainHall', buildings, 10000)
    expect(result.canUpgrade).toBe(false)
    expect(result.reason).toBe('已满级')
  })

  it('should show correct cost for level 2 spirit field upgrade', () => {
    const buildings = createBuildings({ spiritField: { level: 2, unlocked: true } })
    const result = canUpgradeBuilding('spiritField', buildings, 1400)
    expect(result.canUpgrade).toBe(true)
    expect(result.cost.spiritStone).toBe(Math.round(200 * Math.pow(3, 1.7))) // 200 * 3^1.7 ≈ 1294
  })

  it('canUpgradeBuilding should show correct spiritMine level 0→1 cost', () => {
    const buildings = createBuildings({ spiritMine: { level: 0, unlocked: true } })
    const result = canUpgradeBuilding('spiritMine', buildings, 200)
    expect(result.canUpgrade).toBe(true)
    expect(result.cost.spiritStone).toBe(Math.round(200 * Math.pow(1, 1.7))) // 200 * 1^1.7 = 200
  })

  it('canUpgradeBuilding should show correct spiritMine level 1→2 cost', () => {
    const buildings = createBuildings({ spiritMine: { level: 1, unlocked: true } })
    const result = canUpgradeBuilding('spiritMine', buildings, 700)
    expect(result.canUpgrade).toBe(true)
    expect(result.cost.spiritStone).toBe(Math.round(200 * Math.pow(2, 1.7))) // 200 * 2^1.7 ≈ 650
  })
})
