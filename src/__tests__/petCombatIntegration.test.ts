import { describe, expect, it } from 'vitest'
import type { CombatUnit } from '../systems/combat/CombatEngine'
import type { EventResult } from '../systems/roguelike/EventSystem'
import { resolveAutomatedRun } from '../systems/roguelike/AutoRunEngine'
import type { Dungeon, DungeonRun, DungeonEvent } from '../types/adventure'
import { generatePet, getPetCombatUnit, collectPetCombatUnits } from '../systems/pet/PetSystem'

function makeUnit(overrides: Partial<CombatUnit> = {}): CombatUnit {
  return {
    id: 'char_1',
    name: 'TestChar',
    team: 'ally',
    hp: 100,
    maxHp: 100,
    atk: 20,
    def: 10,
    spd: 12,
    crit: 0.05,
    critDmg: 1.5,
    element: 'neutral',
    spiritPower: 30,
    maxSpiritPower: 30,
    skills: [],
    skillCooldowns: [],
    affixes: [],
    preset: 'balanced',
    aggro: 0,
    shield: 0,
    ...overrides,
  }
}

function makePetUnit(overrides: Partial<CombatUnit> = {}): CombatUnit {
  const pet = generatePet('spirit')
  const unit = getPetCombatUnit(pet)
  return { ...unit, ...overrides }
}

function makeRun(teamIds: string[] = ['char_1']): DungeonRun {
  const memberStates: DungeonRun['memberStates'] = {}
  for (const id of teamIds) {
    memberStates[id] = { currentHp: 100, maxHp: 100, status: 'alive' }
  }

  return {
    id: 'run_pet_1',
    dungeonId: 'testDungeon',
    teamCharacterIds: teamIds,
    currentFloor: 1,
    floors: [
      {
        floor: 1,
        isBossFloor: false,
        routes: [
          {
            id: 'route_1',
            name: 'TestRoute',
            description: 'Test',
            riskLevel: 'low',
            events: [{ type: 'combat' }],
            reward: { spiritStone: 20, herb: 0, ore: 0 },
          },
        ],
      },
    ],
    memberStates,
    totalRewards: { spiritStone: 0, spiritEnergy: 0, herb: 0, ore: 0 },
    itemRewards: [],
    eventLog: [],
    status: 'active',
    supplyLevel: 'basic',
    rewardMultiplier: 1,
    pendingShopOffers: [],
    tacticalPreset: 'balanced',
    blessings: [],
    relics: [],
    branchTags: [],
    pendingBlessingOptions: [],
  }
}

const dungeon: Dungeon = {
  id: 'testDungeon',
  name: 'Test Dungeon',
  totalLayers: 1,
  eventsPerLayer: 1,
  unlockRealm: 0,
  unlockStage: 0,
}

function successfulEventWithHpChange(type: DungeonEvent['type'], hpChanges: Record<string, number>): EventResult {
  return {
    type,
    success: true,
    reward: { spiritStone: 30, herb: 0, ore: 0 },
    itemRewards: [],
    message: `${type} resolved`,
    hpChanges,
    mutationTrigger: type === 'combat' || type === 'boss' ? 'battle' : undefined,
  }
}

describe('Pet Combat Integration', () => {
  describe('collectPetCombatUnits', () => {
    it('returns empty array when characters have no pets', () => {
      const pet = generatePet('common')
      const units = collectPetCombatUnits([{ id: 'c1', petIds: [] }], [pet])
      expect(units).toEqual([])
    })

    it('returns one pet unit per character (first pet only)', () => {
      const pet1 = generatePet('common')
      const pet2 = generatePet('spirit')
      const units = collectPetCombatUnits([{ id: 'c1', petIds: [pet1.id, pet2.id] }], [pet1, pet2])
      expect(units).toHaveLength(1)
      expect(units[0]!.id).toBe(pet1.id)
    })

    it('applies stat multiplier to pet combat units', () => {
      const pet = generatePet('divine')
      const normalUnit = getPetCombatUnit(pet, 1)
      const boostedUnit = collectPetCombatUnits([{ id: 'c1', petIds: [pet.id] }], [pet], 1.15)
      expect(boostedUnit).toHaveLength(1)
      // Boosted stats should be >= normal (multiplied by 1.15 with floor)
      expect(boostedUnit[0]!.atk).toBeGreaterThanOrEqual(normalUnit.atk)
      expect(boostedUnit[0]!.hp).toBeGreaterThanOrEqual(normalUnit.hp)
    })

    it('skips characters whose pet is not found in pets array', () => {
      const units = collectPetCombatUnits([{ id: 'c1', petIds: ['missing_pet'] }], [])
      expect(units).toEqual([])
    })

    it('handles multiple characters each with one pet', () => {
      const pet1 = generatePet('common')
      const pet2 = generatePet('spirit')
      const units = collectPetCombatUnits(
        [
          { id: 'c1', petIds: [pet1.id] },
          { id: 'c2', petIds: [pet2.id] },
        ],
        [pet1, pet2]
      )
      expect(units).toHaveLength(2)
      expect(units.map((u) => u.id).sort()).toEqual([pet1.id, pet2.id].sort())
    })
  })

  describe('getPetCombatUnit with statMultiplier', () => {
    it('defaults to multiplier of 1', () => {
      const pet = generatePet('divine')
      const unit = getPetCombatUnit(pet)
      expect(unit.hp).toBe(pet.stats.hp)
      expect(unit.atk).toBe(pet.stats.atk)
    })

    it('multiplies all combat stats by the given multiplier', () => {
      const pet = generatePet('divine')
      const unit = getPetCombatUnit(pet, 1.15)
      expect(unit.hp).toBe(Math.floor(pet.stats.hp * 1.15))
      expect(unit.atk).toBe(Math.floor(pet.stats.atk * 1.15))
      expect(unit.def).toBe(Math.floor(pet.stats.def * 1.15))
      expect(unit.spd).toBe(Math.floor(pet.stats.spd * 1.15))
      // crit and critDmg are not affected by the multiplier
      expect(unit.crit).toBe(0.05)
      expect(unit.critDmg).toBe(1.3)
    })

    it('includes aggro and shield fields', () => {
      const pet = generatePet('common')
      const unit = getPetCombatUnit(pet)
      expect(unit.aggro).toBe(0)
      expect(unit.shield).toBe(0)
    })
  })

  describe('Pet units in AutoRunEngine', () => {
    it('pet units are included in combat team alongside character units', () => {
      const petUnit = makePetUnit({ id: 'pet_1', name: 'TestPet' })
      const charUnit = makeUnit({ id: 'char_1' })
      const baseTeamUnits = [charUnit, petUnit]

      let receivedTeam: CombatUnit[] = []

      const report = resolveAutomatedRun({
        run: makeRun(['char_1']),
        dungeon,
        automationStrategy: 'steady',
        baseTeamUnits,
        now: (() => {
          let tick = 100
          return () => ++tick
        })(),
        resolveEventFn: (event, team) => {
          receivedTeam = team
          // Pet and character both take some damage
          const hpChanges: Record<string, number> = {}
          for (const u of team) {
            hpChanges[u.id] = -5
          }
          return successfulEventWithHpChange(event.type, hpChanges)
        },
        pickBlessingOptionsFn: () => [],
        pickRelicRewardFn: () => null,
        petCaptureFn: () => ({ attempted: false, success: false }),
      })

      // Pet unit should have been passed to the event resolver alongside the character
      expect(receivedTeam.length).toBeGreaterThanOrEqual(2)
      expect(receivedTeam.some((u) => u.id === 'char_1')).toBe(true)
      expect(receivedTeam.some((u) => u.id === 'pet_1')).toBe(true)

      // Report should still complete normally
      expect(report.result).toBe('completed')
    })

    it('pet hp changes do not affect memberStates or postRunMemberOutcomes', () => {
      const petUnit = makePetUnit({ id: 'pet_1', name: 'TestPet' })
      const charUnit = makeUnit({ id: 'char_1' })

      const report = resolveAutomatedRun({
        run: makeRun(['char_1']),
        dungeon,
        automationStrategy: 'steady',
        baseTeamUnits: [charUnit, petUnit],
        now: (() => {
          let tick = 100
          return () => ++tick
        })(),
        resolveEventFn: (event) => {
          // Both take damage
          return successfulEventWithHpChange(event.type, { char_1: -10, pet_1: -50 })
        },
        pickBlessingOptionsFn: () => [],
        pickRelicRewardFn: () => null,
        petCaptureFn: () => ({ attempted: false, success: false }),
      })

      // Character HP change should be tracked in memberStates
      expect(report.finalMemberStates['char_1']).toBeDefined()
      expect(report.finalMemberStates['char_1']!.currentHp).toBeLessThan(100)

      // Pet HP changes should NOT create a memberState entry
      expect(report.finalMemberStates['pet_1']).toBeUndefined()

      // No pet entry in teamSnapshot either
      expect(report.teamSnapshot['pet_1']).toBeUndefined()
    })

    it('run does not fail if pet dies but characters survive', () => {
      const petUnit = makePetUnit({ id: 'pet_1', name: 'TestPet', hp: 10, maxHp: 10 })
      const charUnit = makeUnit({ id: 'char_1' })

      const report = resolveAutomatedRun({
        run: makeRun(['char_1']),
        dungeon,
        automationStrategy: 'steady',
        baseTeamUnits: [charUnit, petUnit],
        now: (() => {
          let tick = 100
          return () => ++tick
        })(),
        resolveEventFn: (event) => {
          // Pet dies, character takes minor damage
          return successfulEventWithHpChange(event.type, { char_1: -5, pet_1: -100 })
        },
        pickBlessingOptionsFn: () => [],
        pickRelicRewardFn: () => null,
        petCaptureFn: () => ({ attempted: false, success: false }),
      })

      expect(report.result).toBe('completed')
      expect(report.finalMemberStates['char_1']!.status).toBe('alive')
    })
  })
})
