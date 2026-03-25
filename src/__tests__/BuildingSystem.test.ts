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
    trainingHall: { level: 0, unlocked: false },
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

  it('spiritField should not unlock when mainHall is Lv0', () => {
    const buildings = createBuildings({ mainHall: { level: 0, unlocked: true } })
    const result = checkBuildingUnlock('spiritField', buildings)
    expect(result.unlocked).toBe(false)
    expect(result.reason).toContain('大殿')
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
    expect(result.reason).toContain('大殿')
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
    expect(result.reason).toContain('大殿')
  })

  it('scriptureHall should unlock at mainHall Lv3', () => {
    const buildings = createBuildings({ mainHall: { level: 3, unlocked: true } })
    const result = checkBuildingUnlock('scriptureHall', buildings)
    expect(result.unlocked).toBe(true)
  })

  it('trainingHall should require mainHall Lv4', () => {
    const buildings = createBuildings({ mainHall: { level: 3, unlocked: true } })
    const result = checkBuildingUnlock('trainingHall', buildings)
    expect(result.unlocked).toBe(false)
  })

  it('trainingHall should unlock at mainHall Lv4', () => {
    const buildings = createBuildings({ mainHall: { level: 4, unlocked: true } })
    const result = checkBuildingUnlock('trainingHall', buildings)
    expect(result.unlocked).toBe(true)
  })

  it('spiritMine should always be unlocked (初始)', () => {
    const buildings = createBuildings()
    const result = checkBuildingUnlock('spiritMine', buildings)
    expect(result.unlocked).toBe(true)
  })

  it('unknown building type should return not unlocked', () => {
    const buildings = createBuildings()
    const result = checkBuildingUnlock('unknown' as any, buildings)
    expect(result.unlocked).toBe(false)
    expect(result.reason).toBe('未知建筑')
  })
})

describe('canUpgradeBuilding', () => {
  it('should allow upgrade with sufficient spirit stone', () => {
    const buildings = createBuildings({ mainHall: { level: 1, unlocked: true } })
    const result = canUpgradeBuilding('mainHall', buildings, 300)
    expect(result.canUpgrade).toBe(true)
    expect(result.cost.spiritStone).toBe(Math.round(100 * Math.pow(2, 1.3))) // 100 * 2^1.3 ≈ 246
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
    const result = canUpgradeBuilding('spiritField', buildings, 400)
    expect(result.canUpgrade).toBe(true)
    expect(result.cost.spiritStone).toBe(Math.round(80 * Math.pow(3, 1.3))) // 80 * 3^1.3 ≈ 334
  })

  it('canUpgradeBuilding should show correct spiritMine level 0→1 cost', () => {
    const buildings = createBuildings({ spiritMine: { level: 0, unlocked: true } })
    const result = canUpgradeBuilding('spiritMine', buildings, 100)
    expect(result.canUpgrade).toBe(true)
    expect(result.cost.spiritStone).toBe(Math.round(100 * Math.pow(1, 1.3))) // 100 * 1^1.3 = 100
  })

  it('canUpgradeBuilding should show correct spiritMine level 1→2 cost', () => {
    const buildings = createBuildings({ spiritMine: { level: 1, unlocked: true } })
    const result = canUpgradeBuilding('spiritMine', buildings, 300)
    expect(result.canUpgrade).toBe(true)
    expect(result.cost.spiritStone).toBe(Math.round(100 * Math.pow(2, 1.3))) // 100 * 2^1.3 ≈ 246
  })
})
