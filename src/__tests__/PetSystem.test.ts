import {
  generatePet,
  feedPet,
  tryCapturePet,
  PET_QUALITY_MAX_LEVEL,
  PET_QUALITY_STAT_MULT,
  PET_QUALITY_NAMES,
  getPetCombatUnit,
} from '../systems/pet/PetSystem'

describe('PetSystem', () => {
  describe('generatePet', () => {
    it('should generate a pet with correct quality', () => {
      const pet = generatePet('spirit')
      expect(pet.quality).toBe('spirit')
      expect(pet.level).toBe(1)
      expect(pet.stats.hp).toBeGreaterThan(0)
      expect(pet.innateSkill).toBeDefined()
    })

    it('should generate a pet with id and name', () => {
      const pet = generatePet('common')
      expect(pet.id).toMatch(/^pet_\d+_\d+$/)
      expect(pet.name).toBeTruthy()
      expect(pet.element).toBeTruthy()
    })

    it('should generate higher stats for better quality', () => {
      const common = generatePet('common')
      const spirit = generatePet('spirit')
      expect(spirit.stats.hp).toBeGreaterThan(common.stats.hp)
    })

    it('should generate talent between 30 and 79', () => {
      for (let i = 0; i < 20; i++) {
        const pet = generatePet('common')
        expect(pet.talent).toBeGreaterThanOrEqual(30)
        expect(pet.talent).toBeLessThanOrEqual(79)
      }
    })

    it('should have 2 empty equipped skill slots', () => {
      const pet = generatePet('immortal')
      expect(pet.equippedSkills).toEqual([null, null])
    })
  })

  describe('feedPet', () => {
    it('should feed pet and increase level', () => {
      const pet = generatePet('divine')
      const fed = feedPet(pet)
      expect(fed.level).toBe(2)
      expect(fed.stats.hp).toBeGreaterThanOrEqual(pet.stats.hp)
      expect(fed.stats.atk).toBeGreaterThanOrEqual(pet.stats.atk)
      expect(fed.stats.def).toBeGreaterThanOrEqual(pet.stats.def)
      expect(fed.stats.spd).toBeGreaterThanOrEqual(pet.stats.spd)
    })

    it('should not exceed max level', () => {
      const pet = generatePet('common')
      pet.level = PET_QUALITY_MAX_LEVEL.common
      const fed = feedPet(pet)
      expect(fed.level).toBe(PET_QUALITY_MAX_LEVEL.common)
      expect(fed.stats).toEqual(pet.stats)
    })

    it('should respect quality-specific max levels', () => {
      expect(PET_QUALITY_MAX_LEVEL.common).toBe(20)
      expect(PET_QUALITY_MAX_LEVEL.spirit).toBe(40)
      expect(PET_QUALITY_MAX_LEVEL.immortal).toBe(60)
      expect(PET_QUALITY_MAX_LEVEL.divine).toBe(80)
    })

    it('should grow stats by approximately 3% per level', () => {
      // Use a pet with large enough base stats for floor to not collapse
      const pet = generatePet('divine')
      // Feed multiple times to accumulate meaningful stat differences
      let fed = pet
      for (let i = 0; i < 10; i++) {
        fed = feedPet(fed)
      }
      expect(fed.level).toBe(11)
      // After 10 levels of 3% growth, hp should be at least 1.2x (due to floor rounding)
      const hpGrowth = fed.stats.hp / pet.stats.hp
      expect(hpGrowth).toBeGreaterThan(1.2)
    })
  })

  describe('tryCapturePet', () => {
    it('capture should succeed more often for common quality', () => {
      let commonSuccess = 0
      let divineSuccess = 0
      for (let i = 0; i < 100; i++) {
        if (tryCapturePet(10, 'common')) commonSuccess++
        if (tryCapturePet(10, 'divine')) divineSuccess++
      }
      expect(commonSuccess).toBeGreaterThan(divineSuccess)
    })

    it('higher fortune should increase capture rate', () => {
      let lowFortune = 0
      let highFortune = 0
      for (let i = 0; i < 100; i++) {
        if (tryCapturePet(0, 'spirit')) lowFortune++
        if (tryCapturePet(30, 'spirit')) highFortune++
      }
      expect(highFortune).toBeGreaterThanOrEqual(lowFortune)
    })

    it('zero fortune should still allow captures for common quality', () => {
      let successes = 0
      for (let i = 0; i < 100; i++) {
        if (tryCapturePet(0, 'common')) successes++
      }
      expect(successes).toBeGreaterThan(0)
    })
  })

  describe('constants', () => {
    it('should have correct quality stat multipliers', () => {
      expect(PET_QUALITY_STAT_MULT.common).toBe(0.3)
      expect(PET_QUALITY_STAT_MULT.spirit).toBe(0.5)
      expect(PET_QUALITY_STAT_MULT.immortal).toBe(0.7)
      expect(PET_QUALITY_STAT_MULT.divine).toBe(1.0)
    })

    it('should have quality display names', () => {
      expect(PET_QUALITY_NAMES.common).toBe('\u51e1\u54c1')
      expect(PET_QUALITY_NAMES.spirit).toBe('\u7075\u54c1')
      expect(PET_QUALITY_NAMES.immortal).toBe('\u4ed9\u54c1')
      expect(PET_QUALITY_NAMES.divine).toBe('\u795e\u54c1')
    })
  })

  describe('getPetCombatUnit', () => {
    it('should create a combat unit from a pet', () => {
      const pet = generatePet('common')
      const unit = getPetCombatUnit(pet)
      expect(unit.id).toBe(pet.id)
      expect(unit.name).toBe(pet.name)
      expect(unit.team).toBe('ally')
      expect(unit.hp).toBe(pet.stats.hp)
      expect(unit.atk).toBe(pet.stats.atk)
      expect(unit.def).toBe(pet.stats.def)
      expect(unit.spd).toBe(pet.stats.spd)
    })

    it('should include innate skill in combat unit skills', () => {
      const pet = generatePet('common')
      const unit = getPetCombatUnit(pet)
      expect(unit.skills.length).toBe(1)
      expect(unit.skills[0].id).toBe(pet.innateSkill.id)
    })

    it('should include equipped skills in combat unit skills', () => {
      const pet = generatePet('common')
      pet.equippedSkills = [
        { id: 'test1', name: 'Test1', multiplier: 1.5, element: 'fire', description: 'Test skill' },
        null,
      ]
      const unit = getPetCombatUnit(pet)
      expect(unit.skills.length).toBe(2)
    })
  })
})
