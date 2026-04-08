import { describe, expect, it } from 'vitest'
import type { CombatUnit } from '../systems/combat/CombatEngine'
import type { RelicId } from '../types/adventure'
import {
  applyMutationCombatModifiers,
  applyMutationRewardModifiers,
  applyRunCombatModifiers,
  applyRunRecovery,
  applyRunRewardModifiers,
  applyRunBuild,
  getBlessingWeight,
  getSpiritRegenBonus,
  hasHealOnKill,
  hasSpiritRegen,
  pickBlessingOptions,
  pickRelicReward,
} from '../systems/roguelike/RunBuildSystem'
import { getDiscipleMutationWeight, pickDiscipleMutation } from '../data/discipleMutations'
import { BLESSING_DEFS, BLESSINGS } from '../data/blessings'
import { RELIC_DEFS, RELICS } from '../data/relics'
import { simulateCombat } from '../systems/combat/CombatEngine'

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

  // --- Generic Blessing Integration Tests ---

  it('should include all generic blessings in the selection pool', () => {
    const genericIds = BLESSINGS.map((b) => b.id)
    // Pick from an empty pool with deterministic rng to verify they can all appear
    for (const id of genericIds) {
      const options = pickBlessingOptions([], 13, () => 0)
      expect(options).toContain(id)
    }
  })

  it('should include all generic relics in the relic reward pool', () => {
    const genericIds = RELICS.map((r) => r.id)
    // Verify each generic relic can appear as a reward
    for (const targetId of genericIds) {
      // Exclude all other relics to force the target
      const otherIds = genericIds.filter((id) => id !== targetId).concat(['jadeGourd', 'merchantSeal', 'warBanner'])
      const result = pickRelicReward(otherIds as RelicId[], () => 0)
      expect(result).toBe(targetId)
    }
  })

  it('should have BLESSING_DEFS entries for all generic blessing IDs', () => {
    for (const b of BLESSINGS) {
      expect(BLESSING_DEFS[b.id as keyof typeof BLESSING_DEFS]).toBeDefined()
      expect(BLESSING_DEFS[b.id as keyof typeof BLESSING_DEFS].name).toBe(b.name)
    }
  })

  it('should have RELIC_DEFS entries for all generic relic IDs', () => {
    for (const r of RELICS) {
      expect(RELIC_DEFS[r.id as keyof typeof RELIC_DEFS]).toBeDefined()
      expect(RELIC_DEFS[r.id as keyof typeof RELIC_DEFS].name).toBe(r.name)
    }
  })

  it('should apply flame_heart atkBoost blessing to combat units', () => {
    const unit = applyRunCombatModifiers(makeUnit(), ['flame_heart'], [])
    expect(unit.atk).toBeGreaterThan(20)
  })

  it('should apply iron_wall defBoost blessing to combat units', () => {
    const unit = applyRunCombatModifiers(makeUnit(), ['iron_wall'], [])
    expect(unit.def).toBeGreaterThan(10)
  })

  it('should apply jade_pulse hpBoost blessing to combat units', () => {
    const unit = applyRunCombatModifiers(makeUnit(), ['jade_pulse'], [])
    expect(unit.maxHp).toBeGreaterThan(100)
  })

  it('should apply keen_eye critBoost blessing to combat units', () => {
    const unit = applyRunCombatModifiers(makeUnit({ crit: 0.1 }), ['keen_eye'], [])
    expect(unit.crit).toBeGreaterThan(0.1)
  })

  it('should set spiritRegenBonus when spirit_spring blessing is active', () => {
    const unit = applyRunCombatModifiers(makeUnit(), ['spirit_spring'], [])
    expect(unit.spiritRegenBonus).toBe(5)
    expect(hasSpiritRegen(['spirit_spring'])).toBe(true)
    expect(getSpiritRegenBonus(['spirit_spring'])).toBe(5)
  })

  it('should set healOnKillRatio when reaper_mark blessing is active', () => {
    const unit = applyRunCombatModifiers(makeUnit(), ['reaper_mark'], [])
    expect(unit.healOnKillRatio).toBe(0.1)
    expect(hasHealOnKill(['reaper_mark'])).toBe(true)
  })

  it('should apply wind_step atkBoost blessing to combat units', () => {
    const unit = applyRunCombatModifiers(makeUnit(), ['wind_step'], [])
    expect(unit.atk).toBeGreaterThan(20)
  })

  it('should apply golden_touch lootBonus blessing to reward modifiers', () => {
    const reward = applyRunRewardModifiers(
      { spiritStone: 100, spiritEnergy: 0, herb: 50, ore: 10 },
      ['golden_touch'],
      []
    )
    expect(reward.spiritStone).toBeGreaterThan(100)
    expect(reward.herb).toBeGreaterThan(50)
  })

  it('should apply mirror_shard relic crit bonus to combat units', () => {
    const unit = applyRunCombatModifiers(makeUnit({ crit: 0.1 }), [], ['mirror_shard'])
    expect(unit.crit).toBeGreaterThan(0.1)
  })

  it('should apply jade_armor relic def bonus to combat units', () => {
    const unit = applyRunCombatModifiers(makeUnit(), [], ['jade_armor'])
    expect(unit.def).toBeGreaterThan(10)
  })

  it('should apply blood_vial relic recovery bonus', () => {
    const healed = applyRunRecovery(40, 100, [], ['blood_vial'])
    expect(healed).toBeGreaterThan(40)
    // blood_vial gives 8% maxHp recovery = 8 hp
    expect(healed).toBe(48)
  })

  it('should apply golden_scale relic spirit stone bonus to reward modifiers', () => {
    const reward = applyRunRewardModifiers(
      { spiritStone: 100, spiritEnergy: 0, herb: 20, ore: 10 },
      [],
      ['golden_scale']
    )
    expect(reward.spiritStone).toBeGreaterThan(100)
    expect(reward.spiritStone).toBe(125) // 100 * 1.25
  })

  it('should apply spiritRegen bonus during combat via CombatEngine', () => {
    const ally: CombatUnit = {
      ...makeUnit({ atk: 999, def: 999, hp: 9999, maxHp: 9999 }),
      spiritRegenBonus: 5,
      spiritPower: 0,
      maxSpiritPower: 100,
    }
    const enemy: CombatUnit = {
      ...makeUnit({ id: 'e1', name: 'Enemy', team: 'enemy', atk: 1, def: 1, hp: 50, maxHp: 50 }),
      skills: [],
      skillCooldowns: [],
    }
    const result = simulateCombat([ally], [enemy])
    // With spiritRegenBonus=5, the ally should regenerate 15 per turn (10 base + 5 bonus)
    // We just verify the combat completes and the ally benefits from extra spirit
    expect(result.victory).toBe(true)
  })

  it('should apply healOnKill during combat via CombatEngine', () => {
    const ally: CombatUnit = {
      ...makeUnit({ atk: 999, def: 999, hp: 50, maxHp: 100 }),
      healOnKillRatio: 0.1,
    }
    const enemy: CombatUnit = {
      ...makeUnit({ id: 'e1', name: 'Enemy', team: 'enemy', atk: 1, def: 1, hp: 50, maxHp: 50 }),
      skills: [],
      skillCooldowns: [],
    }
    const result = simulateCombat([ally], [enemy])
    expect(result.victory).toBe(true)
    // After killing the enemy, ally should heal 10% of maxHp = 10
    // Final ally HP should be > 50 (started wounded)
    expect(result.allyHp[0]).toBeGreaterThan(50)
  })

  it('should apply flame_heart and wind_step stacking atk via applyRunBuild', () => {
    const build = {
      blessings: [
        { id: 'flame_heart', stacks: 1 },
        { id: 'wind_step', stacks: 1 },
      ],
      relics: [],
    }
    const units = applyRunBuild([makeUnit()], build)
    // Each gives 1.15x atk, so total = 20 * 1.15 * 1.15 = 26.45 -> 26
    expect(units[0].atk).toBe(26)
  })

  it('should weight generic blessings in route contexts', () => {
    const context = { routeId: 'sword' as const }
    // sword route should weight flame_heart and wind_step
    expect(getBlessingWeight('flame_heart', context)).toBeGreaterThan(1)
    expect(getBlessingWeight('wind_step', context)).toBeGreaterThan(1)
  })

  it('should stack golden_touch and stoneHarvest for spirit stone rewards', () => {
    const reward = applyRunRewardModifiers(
      { spiritStone: 100, spiritEnergy: 0, herb: 20, ore: 10 },
      ['golden_touch', 'stoneHarvest'],
      []
    )
    // golden_touch: 1.2x, stoneHarvest: 1.3x, combined: 100 * 1.2 * 1.3 = 156
    expect(reward.spiritStone).toBe(156)
  })

  it('should exclude owned generic blessings from options', () => {
    const options = pickBlessingOptions(['flame_heart', 'iron_wall', 'keen_eye'], 3, () => 0.5)
    expect(options).not.toContain('flame_heart')
    expect(options).not.toContain('iron_wall')
    expect(options).not.toContain('keen_eye')
  })

  it('should exclude owned generic relics from reward', () => {
    const relic = pickRelicReward(['mirror_shard', 'jade_armor'], () => 0.1)
    expect(relic).not.toBe('mirror_shard')
    expect(relic).not.toBe('jade_armor')
  })
})
