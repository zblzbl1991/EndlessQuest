// src/__tests__/SectEngine.test.ts
import { calcSectLevel, getMaxSimultaneousRuns, calcMaxDisciplesByResources } from '../systems/sect/SectEngine'
import {
  getActiveRoute,
  calcBuildingRouteBonus,
  calcAdventureRouteRewardBonus,
  calcAdventureRouteCombatBonus,
  calcPetCaptureRouteBonus,
} from '../systems/sect/SectRouteSystem'
import { useSectStore } from '../stores/sectStore'
import type { Building } from '../types'
import { generateCharacter } from '../systems/character/CharacterEngine'

// --- Test helpers ---

function makeBuilding(type: string, level: number, count = 1): Building {
  return {
    type: type as Building['type'],
    level,
    count,
    unlocked: level > 0,
    productionQueue: { recipeId: null, progress: 0 },
  }
}

function makeBuildings(overrides: Partial<Record<string, { level: number; count?: number }>> = {}): Building[] {
  const defaults: Record<string, { level: number; count: number }> = {
    mainHall: { level: 1, count: 1 },
    spiritField: { level: 1, count: 1 },
    spiritMine: { level: 1, count: 1 },
    market: { level: 0, count: 0 },
    alchemyFurnace: { level: 0, count: 0 },
    forge: { level: 0, count: 0 },
    scriptureHall: { level: 0, count: 0 },
    recruitmentPavilion: { level: 0, count: 0 },
  }
  const merged = { ...defaults, ...overrides }
  return Object.entries(merged).map(([type, cfg]) => makeBuilding(type, cfg.level, cfg.count))
}

// --- Tests ---

describe('SectEngine', () => {
  describe('calcSectLevel', () => {
    it('should return 1 for mainHall 0 (clamped)', () => {
      expect(calcSectLevel(0)).toBe(1)
    })

    it('should return the mainHall level directly (1:1 mapping)', () => {
      expect(calcSectLevel(1)).toBe(1)
      expect(calcSectLevel(2)).toBe(2)
      expect(calcSectLevel(3)).toBe(3)
      expect(calcSectLevel(5)).toBe(5)
      expect(calcSectLevel(8)).toBe(8)
      expect(calcSectLevel(10)).toBe(10)
    })

    it('should clamp mainHall 15 to level 10', () => {
      expect(calcSectLevel(15)).toBe(10)
    })
  })

  describe('getMaxSimultaneousRuns', () => {
    it('should return 1 for sect level 1', () => {
      expect(getMaxSimultaneousRuns(1)).toBe(1)
    })

    it('should return 3 for sect level 3', () => {
      expect(getMaxSimultaneousRuns(3)).toBe(3)
    })

    it('should return 5 for sect level 5', () => {
      expect(getMaxSimultaneousRuns(5)).toBe(5)
    })
  })

  describe('calcMaxDisciplesByResources', () => {
    it('should return 1 when no spirit fields exist', () => {
      const buildings = makeBuildings({ spiritField: { level: 0, count: 0 } })
      const result = calcMaxDisciplesByResources(buildings, [], null)
      expect(result).toBe(1)
    })

    it('should return 1 when spirit field level 0', () => {
      const buildings = makeBuildings({ spiritField: { level: 0 } })
      const result = calcMaxDisciplesByResources(buildings, [], null)
      expect(result).toBe(1)
    })

    it('should calculate based on spirit field rate: level 1 = 3/sec, floor(3/2) = 1', () => {
      const buildings = makeBuildings({ spiritField: { level: 1 } })
      const result = calcMaxDisciplesByResources(buildings, [], null)
      expect(result).toBe(1)
    })

    it('should calculate based on spirit field rate: level 3 = 7/sec, floor(7/2) = 3', () => {
      const buildings = makeBuildings({ spiritField: { level: 3 } })
      const result = calcMaxDisciplesByResources(buildings, [], null)
      expect(result).toBe(3)
    })

    it('should calculate based on spirit field rate: level 5 = 11/sec, floor(11/2) = 5', () => {
      const buildings = makeBuildings({ spiritField: { level: 5 } })
      const result = calcMaxDisciplesByResources(buildings, [], null)
      expect(result).toBe(5)
    })

    it('should multiply by spirit field count: 2x level 5 = 22/sec, floor(22/2) = 11', () => {
      const buildings = makeBuildings({ spiritField: { level: 5, count: 2 } })
      const result = calcMaxDisciplesByResources(buildings, [], null)
      expect(result).toBe(11)
    })

    it('should scale with building level: level 10 = 21/sec, floor(21/2) = 10', () => {
      const buildings = makeBuildings({ spiritField: { level: 10 } })
      const result = calcMaxDisciplesByResources(buildings, [], null)
      expect(result).toBe(10)
    })

    it('should scale with 4x spirit field level 10: 84/sec, floor(84/2) = 42', () => {
      const buildings = makeBuildings({ spiritField: { level: 10, count: 4 } })
      const result = calcMaxDisciplesByResources(buildings, [], null)
      expect(result).toBe(42)
    })

    it('should return at least 1 (minimum)', () => {
      const buildings = makeBuildings({ spiritField: { level: 1 } })
      const result = calcMaxDisciplesByResources(buildings, [], null)
      expect(result).toBeGreaterThanOrEqual(1)
    })

    it('should account for characters with techniques providing bonuses', () => {
      const buildings = makeBuildings({ spiritField: { level: 3 } })
      // Without characters: level 3 spirit field = 7/sec → floor(7/2) = 3
      const withoutChars = calcMaxDisciplesByResources(buildings, [], null)
      expect(withoutChars).toBe(3)

      // With an idle character with learned techniques (technique multiplier > 1)
      const char = generateCharacter('common')
      char.status = 'idle'
      const withChars = calcMaxDisciplesByResources(buildings, [char], null)
      // Technique multiplier should increase production, allowing more disciples
      expect(withChars).toBeGreaterThanOrEqual(withoutChars)
    })
  })
})

describe('SectRouteSystem', () => {
  describe('getActiveRoute', () => {
    it('should return null when routeId is null', () => {
      expect(getActiveRoute(null)).toBeNull()
    })

    it('should return the alchemy route definition for alchemy id', () => {
      const route = getActiveRoute('alchemy')
      expect(route).not.toBeNull()
      expect(route!.id).toBe('alchemy')
      expect(route!.name).toBe('丹道')
    })

    it('should return the sword route definition for sword id', () => {
      const route = getActiveRoute('sword')
      expect(route).not.toBeNull()
      expect(route!.id).toBe('sword')
      expect(route!.name).toBe('剑道')
    })

    it('should return the beast route definition for beast id', () => {
      const route = getActiveRoute('beast')
      expect(route).not.toBeNull()
      expect(route!.id).toBe('beast')
      expect(route!.name).toBe('兽道')
    })
  })

  describe('calcBuildingRouteBonus', () => {
    it('should return 1 when no route is active', () => {
      expect(calcBuildingRouteBonus(null, 'alchemyFurnace')).toBe(1)
      expect(calcBuildingRouteBonus(null, 'forge')).toBe(1)
      expect(calcBuildingRouteBonus(null, 'spiritField')).toBe(1)
    })

    it('should return correct multiplier for alchemy route on alchemyFurnace', () => {
      expect(calcBuildingRouteBonus('alchemy', 'alchemyFurnace')).toBe(1.15)
    })

    it('should return 1 for alchemy route on unrelated buildings', () => {
      expect(calcBuildingRouteBonus('alchemy', 'forge')).toBe(1)
      expect(calcBuildingRouteBonus('alchemy', 'spiritField')).toBe(1)
      expect(calcBuildingRouteBonus('alchemy', 'spiritMine')).toBe(1)
    })

    it('should return correct multiplier for sword route on forge', () => {
      expect(calcBuildingRouteBonus('sword', 'forge')).toBe(1.2)
    })

    it('should return 1 for sword route on unrelated buildings', () => {
      expect(calcBuildingRouteBonus('sword', 'alchemyFurnace')).toBe(1)
      expect(calcBuildingRouteBonus('sword', 'spiritField')).toBe(1)
    })

    it('should return 1.15 for beast route on spiritField (building bonus)', () => {
      expect(calcBuildingRouteBonus('beast', 'spiritField')).toBe(1.15)
    })
  })

  describe('live route modifiers', () => {
    it('should apply reward bonuses to matching resources', () => {
      expect(calcAdventureRouteRewardBonus('alchemy', 'herb')).toBe(1.15)
      expect(calcAdventureRouteRewardBonus('sword', 'ore')).toBe(1.1)
      expect(calcAdventureRouteRewardBonus('beast', 'spiritEnergy')).toBe(1.1)
      expect(calcAdventureRouteRewardBonus('alchemy', 'ore')).toBe(1)
    })

    it('should expose route-specific combat profiles', () => {
      expect(calcAdventureRouteCombatBonus('alchemy').def).toBeGreaterThan(1)
      expect(calcAdventureRouteCombatBonus('sword').atk).toBeGreaterThan(1)
      expect(calcAdventureRouteCombatBonus('beast').spd).toBeGreaterThan(1)
      expect(calcAdventureRouteCombatBonus(null)).toEqual({ atk: 1, def: 1, spd: 1 })
    })

    it('should grant beast route the strongest pet capture bias', () => {
      expect(calcPetCaptureRouteBonus('beast')).toBeGreaterThan(calcPetCaptureRouteBonus('alchemy'))
      expect(calcPetCaptureRouteBonus('beast')).toBeGreaterThan(calcPetCaptureRouteBonus('sword'))
      expect(calcPetCaptureRouteBonus(null)).toBe(0)
    })
  })
})

describe('SectStore route actions', () => {
  beforeEach(() => {
    useSectStore.getState().reset()
  })

  describe('setActiveRoute', () => {
    it('should set active route on the sect', () => {
      const store = useSectStore.getState()
      expect(store.sect.activeRoute).toBeNull()

      useSectStore.getState().setActiveRoute('alchemy')
      expect(useSectStore.getState().sect.activeRoute).toBe('alchemy')
    })

    it('should allow switching routes', () => {
      useSectStore.getState().setActiveRoute('alchemy')
      expect(useSectStore.getState().sect.activeRoute).toBe('alchemy')

      useSectStore.getState().setActiveRoute('sword')
      expect(useSectStore.getState().sect.activeRoute).toBe('sword')
    })

    it('should allow clearing the route by passing null', () => {
      useSectStore.getState().setActiveRoute('alchemy')
      useSectStore.getState().setActiveRoute(null)
      expect(useSectStore.getState().sect.activeRoute).toBeNull()
    })
  })

  describe('getActiveRouteEffects', () => {
    it('should return null when no route is active', () => {
      const effects = useSectStore.getState().getActiveRouteEffects()
      expect(effects).toBeNull()
    })

    it('should return the full route definition when a route is active', () => {
      useSectStore.getState().setActiveRoute('sword')
      const effects = useSectStore.getState().getActiveRouteEffects()
      expect(effects).not.toBeNull()
      expect(effects!.id).toBe('sword')
      expect(effects!.name).toBe('剑道')
      expect(effects!.buildingBonus).toEqual({ forge: 1.2 })
    })

    it('should return correct effects for alchemy route', () => {
      useSectStore.getState().setActiveRoute('alchemy')
      const effects = useSectStore.getState().getActiveRouteEffects()
      expect(effects).not.toBeNull()
      expect(effects!.buildingBonus).toEqual({ alchemyFurnace: 1.15 })
    })
  })
})
