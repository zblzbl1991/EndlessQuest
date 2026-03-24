import { REALMS } from '../data/realms'
import { ENHANCE_RATES } from '../data/items'
import { BUILDING_DEFS } from '../data/buildings'
import { DUNGEONS } from '../data/events'

describe('Static game data', () => {
  it('should define 6 realms with correct cultivation costs', () => {
    expect(REALMS).toHaveLength(6)
    expect(REALMS[0].name).toBe('炼气期')
    expect(REALMS[0].cultivationCosts).toEqual([100, 300, 600, 1000])
    expect(REALMS[1].cultivationCosts).toEqual([2000, 4000, 7000, 11000])
  })

  it('should define enhance rates for +1 to +15', () => {
    expect(ENHANCE_RATES).toHaveLength(15)
    expect(ENHANCE_RATES[0]).toBe(1.0)
    expect(ENHANCE_RATES[4]).toBe(1.0)
    expect(ENHANCE_RATES[5]).toBe(0.9)
  })

  it('should define all 8 building types', () => {
    expect(BUILDING_DEFS).toHaveLength(8)
    expect(BUILDING_DEFS[0].type).toBe('mainHall')
    expect(BUILDING_DEFS[0].maxLevel).toBe(10)
  })

  it('should define 6 dungeons with ascending difficulty', () => {
    expect(DUNGEONS).toHaveLength(6)
    expect(DUNGEONS[0].totalLayers).toBe(5)
    expect(DUNGEONS[5].totalLayers).toBe(20)
  })
})
