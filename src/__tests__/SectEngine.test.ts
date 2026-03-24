// src/__tests__/SectEngine.test.ts
import {
  calcSectLevel,
  canRecruitCharacter,
  getMaxCharacters,
  getMaxSimultaneousRuns,
} from '../systems/sect/SectEngine'

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
