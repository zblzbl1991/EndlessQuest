// src/__tests__/SectEngine.test.ts
import {
  calcSectLevel,
  canRecruitCharacter,
  getMaxCharacters,
  getMaxSimultaneousRuns,
} from '../systems/sect/SectEngine'
import { getActiveRoute, calcBuildingRouteBonus } from '../systems/sect/SectRouteSystem'
import { SECT_ROUTES } from '../data/sectRoutes'
import type { SectRouteId } from '../data/sectRoutes'
import { useSectStore } from '../stores/sectStore'

describe('SectEngine', () => {
  describe('calcSectLevel', () => {
    it('should return level 1 for mainHall 0-2', () => {
      expect(calcSectLevel(0)).toBe(1)
      expect(calcSectLevel(1)).toBe(1)
      expect(calcSectLevel(2)).toBe(1)
    })

    it('should return level 2 for mainHall 3-4', () => {
      expect(calcSectLevel(3)).toBe(2)
      expect(calcSectLevel(4)).toBe(2)
    })

    it('should return level 3 for mainHall 5-7', () => {
      expect(calcSectLevel(5)).toBe(3)
      expect(calcSectLevel(7)).toBe(3)
    })

    it('should return level 4 for mainHall 8-9', () => {
      expect(calcSectLevel(8)).toBe(4)
      expect(calcSectLevel(9)).toBe(4)
    })

    it('should return level 5 for mainHall 10+', () => {
      expect(calcSectLevel(10)).toBe(5)
      expect(calcSectLevel(15)).toBe(5)
    })
  })

  describe('getMaxCharacters', () => {
    it('should return 5 for sect level 1', () => {
      expect(getMaxCharacters(1)).toBe(5)
    })

    it('should return 10 for sect level 2', () => {
      expect(getMaxCharacters(2)).toBe(10)
    })

    it('should return 15 for sect level 3', () => {
      expect(getMaxCharacters(3)).toBe(15)
    })

    it('should return 20 for sect level 4', () => {
      expect(getMaxCharacters(4)).toBe(20)
    })

    it('should return 30 for sect level 5', () => {
      expect(getMaxCharacters(5)).toBe(30)
    })
  })

  describe('getMaxSimultaneousRuns', () => {
    it('should return 1 for sect level 1', () => {
      expect(getMaxSimultaneousRuns(1)).toBe(1)
    })

    it('should return 2 for sect level 3', () => {
      expect(getMaxSimultaneousRuns(3)).toBe(2)
    })

    it('should return 3 for sect level 5', () => {
      expect(getMaxSimultaneousRuns(5)).toBe(3)
    })
  })

  describe('canRecruitCharacter', () => {
    it('should return true when under the limit', () => {
      expect(canRecruitCharacter(1, 0)).toBe(true)
      expect(canRecruitCharacter(1, 4)).toBe(true)
    })

    it('should return false when at the limit', () => {
      expect(canRecruitCharacter(1, 5)).toBe(false)
    })

    it('should return false when over the limit', () => {
      expect(canRecruitCharacter(1, 10)).toBe(false)
    })

    it('should allow more characters at higher sect levels', () => {
      expect(canRecruitCharacter(2, 5)).toBe(true)
      expect(canRecruitCharacter(2, 10)).toBe(false)
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

    it('should return 1 for beast route on spiritField (no bonus value)', () => {
      expect(calcBuildingRouteBonus('beast', 'spiritField')).toBe(1)
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
