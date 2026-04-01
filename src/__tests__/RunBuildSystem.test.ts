import { describe, expect, it } from 'vitest'
import type { CombatUnit } from '../systems/combat/CombatEngine'
import {
  applyMutationCombatModifiers,
  applyMutationRewardModifiers,
  applyRunCombatModifiers,
  applyRunRecovery,
  applyRunRewardModifiers,
  getBlessingWeight,
  pickBlessingOptions,
  pickRelicReward,
} from '../systems/roguelike/RunBuildSystem'
import { getDiscipleMutationWeight, pickDiscipleMutation } from '../data/discipleMutations'

function makeUnit(overrides?: Partial<CombatUnit>): CombatUnit {
  return {
    id: 'ally_1',
    name: 'Test Ally',
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

describe('RunBuildSystem', () => {
  it('should increase spirit stone rewards when stoneHarvest is active', () => {
    const reward = applyRunRewardModifiers(
      { spiritStone: 100, spiritEnergy: 0, herb: 20, ore: 10 },
      ['stoneHarvest'],
      []
    )

    expect(reward.spiritStone).toBe(130)
    expect(reward.herb).toBe(20)
    expect(reward.ore).toBe(10)
  })

  it('should increase herb rewards when verdantBounty is active', () => {
    const reward = applyRunRewardModifiers(
      { spiritStone: 100, spiritEnergy: 0, herb: 20, ore: 10 },
      ['verdantBounty'],
      []
    )

    expect(reward.herb).toBe(26)
    expect(reward.spiritStone).toBe(100)
  })

  it('should apply combat stat bonuses from blessings and relics', () => {
    const unit = applyRunCombatModifiers(makeUnit(), ['battleFocus', 'galeStride'], ['warBanner'])

    expect(unit.atk).toBeGreaterThan(20)
    expect(unit.spd).toBeGreaterThan(12)
    expect(unit.def).toBeGreaterThan(10)
  })

  it('should apply disciple mutation combat bonuses', () => {
    const unit = applyMutationCombatModifiers(makeUnit(), ['sword_intent', 'jade_skin'])

    expect(unit.atk).toBeGreaterThan(20)
    expect(unit.def).toBeGreaterThan(10)
  })

  it('should heal after each floor when recovery effects are active', () => {
    const healed = applyRunRecovery(40, 100, ['ironBody'], ['jadeGourd'])
    expect(healed).toBeGreaterThan(40)
    expect(healed).toBeLessThanOrEqual(100)
  })

  it('should offer blessing choices that exclude already owned blessings', () => {
    const options = pickBlessingOptions(['stoneHarvest'], 3, () => 0.1)
    expect(options).toHaveLength(3)
    expect(options).not.toContain('stoneHarvest')
  })

  it('should pick a relic reward that excludes already owned relics', () => {
    const relic = pickRelicReward(['warBanner'], () => 0.1)
    expect(relic).not.toBe('warBanner')
  })

  it('should apply disciple mutation reward bonuses', () => {
    const reward = applyMutationRewardModifiers({ spiritStone: 100, spiritEnergy: 0, herb: 20, ore: 10 }, [
      'lucky_omen',
      'elixir_veins',
    ])

    expect(reward.spiritStone).toBeGreaterThan(100)
    expect(reward.herb).toBeGreaterThan(20)
  })

  it('should weight sword-route forge ecology toward combat blessings', () => {
    const context = {
      routeId: 'sword' as const,
      buildingLevels: { forge: 4 },
    }

    expect(getBlessingWeight('battleFocus', context)).toBeGreaterThan(getBlessingWeight('verdantBounty', context))
    expect(pickBlessingOptions([], 1, () => 0, context)).toEqual(['battleFocus'])
  })

  it('should weight alchemy route and ecology toward sustain mutations', () => {
    const profile = {
      cultivationPath: 'none' as const,
      specialties: [{ type: 'comprehension' as const }],
      fateTags: ['stableDaoHeart' as const],
    }
    const context = {
      routeId: 'alchemy' as const,
      buildingLevels: { alchemyFurnace: 4, scriptureHall: 3 },
    }

    expect(getDiscipleMutationWeight('elixir_veins', profile, context)).toBeGreaterThan(
      getDiscipleMutationWeight('sword_intent', profile, context)
    )
    expect(pickDiscipleMutation(profile, [], () => 0, context)).toBe('elixir_veins')
  })
})
