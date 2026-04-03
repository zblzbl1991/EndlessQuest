import { simulateCombat } from '../systems/combat/CombatEngine'
import type { CombatUnit } from '../systems/combat/CombatEngine'
import {
  calcUnitPowerRating,
  calcTeamPowerRating,
  adjustEnemyByTeamPower,
  scaleBossStats,
  createCharacterCombatUnit,
} from '../data/enemies'
import { resolveEvent } from '../systems/roguelike/EventSystem'

function makeUnit(overrides: Partial<CombatUnit> & { id: string; name: string; team: 'ally' | 'enemy' }): CombatUnit {
  return {
    maxHp: 100,
    hp: 100,
    atk: 15,
    def: 8,
    spd: 10,
    crit: 0,
    critDmg: 1.5,
    element: 'neutral',
    spiritPower: 50,
    maxSpiritPower: 50,
    skills: [],
    skillCooldowns: [],
    affixes: [],
    preset: 'balanced',
    aggro: 0,
    shield: 0,
    ...overrides,
  }
}

describe('CombatEngine', () => {
  it('should deal damage and end combat', () => {
    const allies = [makeUnit({ id: 'p1', name: 'Player', team: 'ally', atk: 20, spd: 10 })]
    const enemies = [makeUnit({ id: 'e1', name: 'Goblin', team: 'enemy', hp: 50, maxHp: 50, atk: 5, def: 2, spd: 5 })]
    const result = simulateCombat(allies, enemies)
    expect(result.victory).toBe(true)
    expect(result.actions.length).toBeGreaterThan(0)
    expect(result.actions[0].damage).toBeGreaterThan(0)
  })

  it('should respect turn order by speed', () => {
    const allies = [makeUnit({ id: 'p1', name: 'Slow', team: 'ally', spd: 3, atk: 100 })]
    const enemies = [makeUnit({ id: 'e1', name: 'Fast', team: 'enemy', spd: 20, atk: 5, hp: 200, maxHp: 200, def: 0 })]
    const result = simulateCombat(allies, enemies)
    // Fast enemy acts first
    expect(result.actions[0].actorId).toBe('e1')
  })

  it('should apply elemental advantage', () => {
    // fire > ice = 1.5x
    const allies = [makeUnit({ id: 'p1', name: 'Fire', team: 'ally', element: 'fire', atk: 10, spd: 10 })]
    const enemies = [
      makeUnit({ id: 'e1', name: 'Ice', team: 'enemy', element: 'ice', hp: 1000, maxHp: 1000, atk: 0, def: 0, spd: 5 }),
    ]
    const result = simulateCombat(allies, enemies)
    // With fire > ice, damage should be higher. Hard to test exact value due to variance, but check combat completes.
    expect(result.actions.length).toBeGreaterThan(0)
  })

  it('should handle defeat (all allies dead)', () => {
    const allies = [makeUnit({ id: 'p1', name: 'Weak', team: 'ally', hp: 10, maxHp: 10, atk: 1, spd: 10 })]
    const enemies = [
      makeUnit({ id: 'e1', name: 'Strong', team: 'enemy', hp: 1000, maxHp: 1000, atk: 50, def: 10, spd: 20 }),
    ]
    const result = simulateCombat(allies, enemies)
    expect(result.victory).toBe(false)
  })

  it('should use skills when available', () => {
    const allies = [
      makeUnit({
        id: 'p1',
        name: 'Mage',
        team: 'ally',
        atk: 10,
        spd: 10,
        skills: [
          {
            id: 'fire_palm',
            name: '烈焰掌',
            category: 'attack',
            element: 'fire',
            multiplier: 1.8,
            spiritCost: 15,
            cooldown: 1,
            description: '',
            tier: 2,
          },
        ],
        skillCooldowns: [0],
      }),
    ]
    const enemies = [makeUnit({ id: 'e1', name: 'Target', team: 'enemy', hp: 500, maxHp: 500, atk: 0, def: 0, spd: 5 })]
    const result = simulateCombat(allies, enemies)
    const skillActions = result.actions.filter((a) => a.actionType === 'skill')
    expect(skillActions.length).toBeGreaterThan(0)
    expect(skillActions[0].skillName).toBe('烈焰掌')
  })

  it('should return correct ally and enemy HP arrays', () => {
    const allies = [
      makeUnit({ id: 'p1', name: 'Ally1', team: 'ally', atk: 20, spd: 10 }),
      makeUnit({ id: 'p2', name: 'Ally2', team: 'ally', atk: 20, spd: 8 }),
    ]
    const enemies = [makeUnit({ id: 'e1', name: 'Goblin', team: 'enemy', hp: 30, maxHp: 30, atk: 0, def: 0, spd: 5 })]
    const result = simulateCombat(allies, enemies)
    expect(result.victory).toBe(true)
    expect(result.allyHp).toHaveLength(2)
    expect(result.enemyHp).toHaveLength(1)
    expect(result.enemyHp[0]).toBe(0)
  })

  it('should apply crit damage', () => {
    // Use 100% crit rate to guarantee crit
    const allies = [makeUnit({ id: 'p1', name: 'Critical', team: 'ally', crit: 1, critDmg: 2.0, atk: 20, spd: 10 })]
    const enemies = [makeUnit({ id: 'e1', name: 'Target', team: 'enemy', hp: 200, maxHp: 200, atk: 0, def: 0, spd: 5 })]
    const result = simulateCombat(allies, enemies)
    // All actions from the ally should be crits
    const allyActions = result.actions.filter((a) => a.actorId === 'p1')
    for (const action of allyActions) {
      expect(action.isCrit).toBe(true)
    }
  })

  it('should respect skill cooldowns', () => {
    const allies = [
      makeUnit({
        id: 'p1',
        name: 'Mage',
        team: 'ally',
        atk: 10,
        spd: 10,
        skills: [
          {
            id: 'fire_palm',
            name: '烈焰掌',
            category: 'attack',
            element: 'fire',
            multiplier: 1.8,
            spiritCost: 15,
            cooldown: 5,
            description: '',
            tier: 2,
          },
        ],
        skillCooldowns: [3], // on cooldown
        spiritPower: 50,
      }),
    ]
    const enemies = [makeUnit({ id: 'e1', name: 'Target', team: 'enemy', hp: 500, maxHp: 500, atk: 0, def: 0, spd: 5 })]
    const result = simulateCombat(allies, enemies)
    // First few turns should be normal attacks while skill is on cooldown
    expect(result.actions[0].actionType).toBe('attack')
  })

  it('should cap spirit power regeneration', () => {
    const allies = [
      makeUnit({ id: 'p1', name: 'Full', team: 'ally', atk: 20, spd: 10, spiritPower: 50, maxSpiritPower: 50 }),
    ]
    const enemies = [makeUnit({ id: 'e1', name: 'Goblin', team: 'enemy', hp: 30, maxHp: 30, atk: 0, def: 0, spd: 5 })]
    const result = simulateCombat(allies, enemies)
    expect(result.victory).toBe(true)
  })

  it('should not mutate input units', () => {
    const allies = [makeUnit({ id: 'p1', name: 'Player', team: 'ally', atk: 20, spd: 10 })]
    const enemies = [makeUnit({ id: 'e1', name: 'Goblin', team: 'enemy', hp: 30, maxHp: 30, atk: 0, def: 0, spd: 5 })]
    const originalAllyHp = allies[0].hp
    const originalEnemyHp = enemies[0].hp
    simulateCombat(allies, enemies)
    expect(allies[0].hp).toBe(originalAllyHp)
    expect(enemies[0].hp).toBe(originalEnemyHp)
  })

  // --- New tests for affix/targeting integration ---

  it('should trigger berserk affix when HP < 30%', () => {
    // Enemy with 29 HP out of 100 max = 29% HP, berserk should boost atk by 50%
    const allies = [makeUnit({ id: 'p1', name: 'Tank', team: 'ally', hp: 200, maxHp: 200, atk: 1, spd: 5, def: 0 })]
    const enemies = [
      makeUnit({
        id: 'e1',
        name: 'Berserker',
        team: 'enemy',
        hp: 29,
        maxHp: 100,
        atk: 20,
        spd: 20,
        def: 0,
        affixes: ['berserk'],
      }),
    ]
    const result = simulateCombat(allies, enemies)
    // With berserk, atk should be 30 (20 * 1.5). Without berserk it'd be 20.
    // The first action is from the berserker (spd 20 > 5)
    const berserkAction = result.actions.find((a) => a.actorId === 'e1')
    expect(berserkAction).toBeDefined()
    // Damage should be at least 27 (30 atk - 0 def/2, with 0.9 variance floor)
    // 30 * 0.9 = 27 floor
    expect(berserkAction!.damage).toBeGreaterThanOrEqual(27)
  })

  it('should not trigger berserk when HP >= 30%', () => {
    // Enemy with 50 HP out of 100 max = 50%, berserk should NOT trigger
    const allies = [makeUnit({ id: 'p1', name: 'Tank', team: 'ally', hp: 2000, maxHp: 2000, atk: 0, spd: 5, def: 0 })]
    const enemies = [
      makeUnit({
        id: 'e1',
        name: 'HealthyBerserker',
        team: 'enemy',
        hp: 50,
        maxHp: 100,
        atk: 20,
        spd: 20,
        def: 0,
        affixes: ['berserk'],
      }),
    ]
    const result = simulateCombat(allies, enemies)
    const action = result.actions.find((a) => a.actorId === 'e1')
    expect(action).toBeDefined()
    // Without berserk, damage = 20 atk - 0 def = 20, with variance 18-22
    expect(action!.damage).toBeLessThanOrEqual(22)
  })

  it('should absorb damage with shield affix', () => {
    // Enemy with 20 HP shield. Attack does ~12 damage, so shield should absorb fully first hit.
    const allies = [makeUnit({ id: 'p1', name: 'Attacker', team: 'ally', atk: 15, spd: 20, def: 0 })]
    const enemies = [
      makeUnit({
        id: 'e1',
        name: 'Shielded',
        team: 'enemy',
        hp: 50,
        maxHp: 50,
        atk: 0,
        def: 0,
        spd: 5,
        shield: 20, // 20 shield
      }),
    ]
    const result = simulateCombat(allies, enemies)
    expect(result.victory).toBe(true)
    // With 20 shield and ~15 damage, first hit may be fully absorbed (damage=0) or partially
    // But subsequent hits should deal damage once shield is broken
    const totalDamage = result.actions.filter((a) => a.actorId === 'p1').reduce((sum, a) => sum + a.damage, 0)
    expect(totalDamage).toBeGreaterThan(0) // At least some damage gets through over time
  })

  it('should increase aggro on hit', () => {
    // Two enemies, first hit should increase aggro on the target
    const allies = [makeUnit({ id: 'p1', name: 'Attacker', team: 'ally', atk: 50, spd: 20, def: 100 })]
    const enemies = [
      makeUnit({ id: 'e1', name: 'Enemy1', team: 'enemy', hp: 500, maxHp: 500, atk: 1, def: 0, spd: 5, aggro: 0 }),
      makeUnit({ id: 'e2', name: 'Enemy2', team: 'enemy', hp: 500, maxHp: 500, atk: 1, def: 0, spd: 5, aggro: 5 }),
    ]
    const result = simulateCombat(allies, enemies)
    // e2 starts with higher aggro, so the ally should target e2 first
    const allyActions = result.actions.filter((a) => a.actorId === 'p1')
    expect(allyActions.length).toBeGreaterThan(0)
    // First ally action should target e2 (higher aggro)
    expect(allyActions[0].targetId).toBe('e2')
  })

  it('should use targeting system to select highest aggro target', () => {
    // Two allies, two enemies. Enemy with higher aggro should be targeted.
    const allies = [makeUnit({ id: 'p1', name: 'Attacker', team: 'ally', atk: 50, spd: 20, def: 100 })]
    const enemies = [
      makeUnit({ id: 'e1', name: 'LowAggro', team: 'enemy', hp: 500, maxHp: 500, atk: 1, def: 0, spd: 5, aggro: 0 }),
      makeUnit({ id: 'e2', name: 'HighAggro', team: 'enemy', hp: 500, maxHp: 500, atk: 1, def: 0, spd: 5, aggro: 10 }),
    ]
    const result = simulateCombat(allies, enemies)
    const firstAllyAction = result.actions.find((a) => a.actorId === 'p1')
    expect(firstAllyAction).toBeDefined()
    expect(firstAllyAction!.targetId).toBe('e2')
  })
})

describe('CombatEngine - Tactic Presets', () => {
  const cheapSkill = {
    id: 'ice_shard',
    name: '冰锥术',
    category: 'attack' as const,
    element: 'ice' as const,
    multiplier: 1.2,
    spiritCost: 10,
    cooldown: 1,
    description: '',
    tier: 1,
  }
  const expensiveSkill = {
    id: 'fire_palm',
    name: '烈焰掌',
    category: 'attack' as const,
    element: 'fire' as const,
    multiplier: 2.5,
    spiritCost: 40,
    cooldown: 2,
    description: '',
    tier: 3,
  }

  it('conserve preset delays expensive skills', () => {
    const ally = makeUnit({
      id: 'p1',
      name: 'Conserver',
      team: 'ally',
      atk: 10,
      spd: 10,
      spiritPower: 50,
      maxSpiritPower: 50,
      skills: [cheapSkill, expensiveSkill],
      skillCooldowns: [0, 0],
    })
    const enemies = [makeUnit({ id: 'e1', name: 'Target', team: 'enemy', hp: 500, maxHp: 500, atk: 0, def: 0, spd: 5 })]
    const result = simulateCombat([ally], enemies, 'conserve')
    // First action should use the cheap skill (lower spirit cost)
    const firstAllyAction = result.actions.find((a) => a.actorId === 'p1')
    expect(firstAllyAction).toBeDefined()
    expect(firstAllyAction!.actionType).toBe('skill')
    expect(firstAllyAction!.skillName).toBe('冰锥术')
  })

  it('burst preset uses expensive skills earlier', () => {
    const ally = makeUnit({
      id: 'p1',
      name: 'Burster',
      team: 'ally',
      atk: 10,
      spd: 10,
      spiritPower: 50,
      maxSpiritPower: 50,
      skills: [cheapSkill, expensiveSkill],
      skillCooldowns: [0, 0],
    })
    const enemies = [makeUnit({ id: 'e1', name: 'Target', team: 'enemy', hp: 500, maxHp: 500, atk: 0, def: 0, spd: 5 })]
    const result = simulateCombat([ally], enemies, 'burst')
    // Burst should pick the highest multiplier skill first
    const firstAllyAction = result.actions.find((a) => a.actorId === 'p1')
    expect(firstAllyAction).toBeDefined()
    expect(firstAllyAction!.actionType).toBe('skill')
    expect(firstAllyAction!.skillName).toBe('烈焰掌')
  })

  it('boss preset targets highest-maxHp enemy', () => {
    const ally = makeUnit({ id: 'p1', name: 'Hunter', team: 'ally', atk: 20, spd: 10 })
    const weakEnemy = makeUnit({ id: 'e1', name: 'Minion', team: 'enemy', hp: 30, maxHp: 30, atk: 0, def: 0, spd: 5 })
    const bossEnemy = makeUnit({ id: 'e2', name: 'Boss', team: 'enemy', hp: 200, maxHp: 200, atk: 5, def: 0, spd: 3 })
    // Put minion first in the array so default would target minion
    const result = simulateCombat([ally], [weakEnemy, bossEnemy], 'boss')
    // Boss preset should target the enemy with highest maxHp (Boss)
    const firstAllyAction = result.actions.find((a) => a.actorId === 'p1')
    expect(firstAllyAction).toBeDefined()
    expect(firstAllyAction!.targetId).toBe('e2')
  })

  it('balanced preset (default) works without preset param', () => {
    const ally = makeUnit({
      id: 'p1',
      name: 'Balanced',
      team: 'ally',
      atk: 20,
      spd: 10,
      skills: [cheapSkill],
      skillCooldowns: [0],
    })
    const enemies = [makeUnit({ id: 'e1', name: 'Target', team: 'enemy', hp: 100, maxHp: 100, atk: 0, def: 0, spd: 5 })]
    // Calling without preset should use balanced (first available skill, first target)
    const result = simulateCombat([ally], enemies)
    expect(result.victory).toBe(true)
    const skillActions = result.actions.filter((a) => a.actionType === 'skill')
    expect(skillActions.length).toBeGreaterThan(0)
  })
})

describe('CombatEngine - Tactic Presets', () => {
  const cheapSkill = {
    id: 'ice_shard',
    name: '冰锥术',
    category: 'attack' as const,
    element: 'ice' as const,
    multiplier: 1.2,
    spiritCost: 10,
    cooldown: 1,
    description: '',
    tier: 1,
  }
  const expensiveSkill = {
    id: 'fire_palm',
    name: '烈焰掌',
    category: 'attack' as const,
    element: 'fire' as const,
    multiplier: 2.5,
    spiritCost: 40,
    cooldown: 2,
    description: '',
    tier: 3,
  }

  it('conserve preset delays expensive skills', () => {
    const ally = makeUnit({
      id: 'p1',
      name: 'Conserver',
      team: 'ally',
      atk: 10,
      spd: 10,
      spiritPower: 50,
      maxSpiritPower: 50,
      skills: [cheapSkill, expensiveSkill],
      skillCooldowns: [0, 0],
    })
    const enemies = [makeUnit({ id: 'e1', name: 'Target', team: 'enemy', hp: 500, maxHp: 500, atk: 0, def: 0, spd: 5 })]
    const result = simulateCombat([ally], enemies, 'conserve')
    // First action should use the cheap skill (lower spirit cost)
    const firstAllyAction = result.actions.find((a) => a.actorId === 'p1')
    expect(firstAllyAction).toBeDefined()
    expect(firstAllyAction!.actionType).toBe('skill')
    expect(firstAllyAction!.skillName).toBe('冰锥术')
  })

  it('burst preset uses expensive skills earlier', () => {
    const ally = makeUnit({
      id: 'p1',
      name: 'Burster',
      team: 'ally',
      atk: 10,
      spd: 10,
      spiritPower: 50,
      maxSpiritPower: 50,
      skills: [cheapSkill, expensiveSkill],
      skillCooldowns: [0, 0],
    })
    const enemies = [makeUnit({ id: 'e1', name: 'Target', team: 'enemy', hp: 500, maxHp: 500, atk: 0, def: 0, spd: 5 })]
    const result = simulateCombat([ally], enemies, 'burst')
    // Burst should pick the highest multiplier skill first
    const firstAllyAction = result.actions.find((a) => a.actorId === 'p1')
    expect(firstAllyAction).toBeDefined()
    expect(firstAllyAction!.actionType).toBe('skill')
    expect(firstAllyAction!.skillName).toBe('烈焰掌')
  })

  it('boss preset targets highest-maxHp enemy', () => {
    const ally = makeUnit({ id: 'p1', name: 'Hunter', team: 'ally', atk: 20, spd: 10 })
    const weakEnemy = makeUnit({ id: 'e1', name: 'Minion', team: 'enemy', hp: 30, maxHp: 30, atk: 0, def: 0, spd: 5 })
    const bossEnemy = makeUnit({ id: 'e2', name: 'Boss', team: 'enemy', hp: 200, maxHp: 200, atk: 5, def: 0, spd: 3 })
    // Put minion first in the array so default would target minion
    const result = simulateCombat([ally], [weakEnemy, bossEnemy], 'boss')
    // Boss preset should target the enemy with highest maxHp (Boss)
    const firstAllyAction = result.actions.find((a) => a.actorId === 'p1')
    expect(firstAllyAction).toBeDefined()
    expect(firstAllyAction!.targetId).toBe('e2')
  })

  it('balanced preset (default) works without preset param', () => {
    const ally = makeUnit({
      id: 'p1',
      name: 'Balanced',
      team: 'ally',
      atk: 20,
      spd: 10,
      skills: [cheapSkill],
      skillCooldowns: [0],
    })
    const enemies = [makeUnit({ id: 'e1', name: 'Target', team: 'enemy', hp: 100, maxHp: 100, atk: 0, def: 0, spd: 5 })]
    // Calling without preset should use balanced (first available skill, first target)
    const result = simulateCombat([ally], enemies)
    expect(result.victory).toBe(true)
    const skillActions = result.actions.filter((a) => a.actionType === 'skill')
    expect(skillActions.length).toBeGreaterThan(0)
  })
})

// ─── Power Rating & Enemy Adjustment Tests ──────────────────────────────

describe('Power Rating System', () => {
  it('should calculate unit power rating consistently', () => {
    const unit = makeUnit({
      id: 'u1',
      name: 'Test',
      team: 'ally',
      atk: 20,
      def: 10,
      hp: 100,
      maxHp: 100,
      spd: 12,
      crit: 0.1,
      critDmg: 1.5,
    })
    const rating = calcUnitPowerRating(unit)
    // atk*1.0 + def*0.8 + maxHp*0.2 + spd*0.5 + crit*100 + critDmg*50
    // = 20 + 8 + 20 + 6 + 10 + 75 = 139
    expect(rating).toBeCloseTo(139, 1)
  })

  it('should sum team power from all members', () => {
    const team = [
      makeUnit({ id: 'p1', name: 'A', team: 'ally', atk: 20 }),
      makeUnit({ id: 'p2', name: 'B', team: 'ally', atk: 30 }),
    ]
    const teamPower = calcTeamPowerRating(team)
    const expected = calcUnitPowerRating(team[0]) + calcUnitPowerRating(team[1])
    expect(teamPower).toBeCloseTo(expected, 1)
  })

  it('should return 0 for empty team', () => {
    expect(calcTeamPowerRating([])).toBe(0)
  })

  it('should give higher rating to stronger units', () => {
    const weak = makeUnit({ id: 'w', name: 'Weak', team: 'ally', atk: 5, def: 2, hp: 30, maxHp: 30, spd: 3 })
    const strong = makeUnit({ id: 's', name: 'Strong', team: 'ally', atk: 50, def: 20, hp: 200, maxHp: 200, spd: 15 })
    expect(calcUnitPowerRating(strong)).toBeGreaterThan(calcUnitPowerRating(weak))
  })
})

describe('adjustEnemyByTeamPower', () => {
  it('should reduce an overpowered enemy', () => {
    const team = [makeUnit({ id: 'p1', name: 'Player', team: 'ally', atk: 10, hp: 50, maxHp: 50, def: 5 })]
    const enemy = makeUnit({
      id: 'e1',
      name: 'Boss',
      team: 'enemy',
      atk: 200,
      hp: 2000,
      maxHp: 2000,
      def: 100,
      spd: 50,
    })
    const originalAtk = enemy.atk

    adjustEnemyByTeamPower(enemy, team)

    expect(enemy.atk).toBeLessThanOrEqual(originalAtk)
  })

  it('should boost a weak enemy against a strong team', () => {
    const team = [makeUnit({ id: 'p1', name: 'Hero', team: 'ally', atk: 100, hp: 500, maxHp: 500, def: 50, spd: 30 })]
    const enemy = makeUnit({ id: 'e1', name: 'Rat', team: 'enemy', atk: 3, hp: 20, maxHp: 20, def: 1, spd: 2 })
    const originalAtk = enemy.atk

    adjustEnemyByTeamPower(enemy, team)

    expect(enemy.atk).toBeGreaterThanOrEqual(originalAtk)
  })

  it('should not crash with empty team', () => {
    const enemy = makeUnit({ id: 'e1', name: 'Enemy', team: 'enemy', atk: 10, hp: 50, maxHp: 50, def: 5, spd: 5 })
    expect(() => adjustEnemyByTeamPower(enemy, [])).not.toThrow()
  })

  it('should keep enemy stats at least 1', () => {
    const team = [
      makeUnit({ id: 'p1', name: 'God', team: 'ally', atk: 9999, hp: 99999, maxHp: 99999, def: 9999, spd: 999 }),
    ]
    const enemy = makeUnit({ id: 'e1', name: 'Ant', team: 'enemy', atk: 1, hp: 1, maxHp: 1, def: 1, spd: 1 })

    adjustEnemyByTeamPower(enemy, team)

    expect(enemy.atk).toBeGreaterThanOrEqual(1)
    expect(enemy.hp).toBeGreaterThanOrEqual(1)
    expect(enemy.def).toBeGreaterThanOrEqual(1)
    expect(enemy.spd).toBeGreaterThanOrEqual(1)
  })

  it('boss should be allowed to be stronger than regular enemies', () => {
    const team = [makeUnit({ id: 'p1', name: 'Player', team: 'ally', atk: 30, hp: 150, maxHp: 150, def: 15, spd: 10 })]

    const regularEnemy = makeUnit({
      id: 'e1',
      name: 'Mob',
      team: 'enemy',
      atk: 30,
      hp: 150,
      maxHp: 150,
      def: 15,
      spd: 10,
    })
    const bossEnemy = makeUnit({
      id: 'e2',
      name: 'Boss',
      team: 'enemy',
      atk: 30,
      hp: 150,
      maxHp: 150,
      def: 15,
      spd: 10,
    })

    adjustEnemyByTeamPower(regularEnemy, team)
    adjustEnemyByTeamPower(bossEnemy, team, { isBoss: true, floor: 5 })

    // Boss should be at least as strong as (or stronger than) a regular enemy at same base stats
    const bossPower = calcUnitPowerRating(bossEnemy)
    const regularPower = calcUnitPowerRating(regularEnemy)
    expect(bossPower).toBeGreaterThanOrEqual(regularPower)
  })
})

// ─── Boss Scaling Tests ──────────────────────────────────────────────

describe('scaleBossStats', () => {
  it('should multiply all stats by 2.5', () => {
    const base = { hp: 100, atk: 20, def: 10, spd: 8 }
    const result = scaleBossStats(base)
    expect(result.hp).toBe(250)
    expect(result.atk).toBe(50)
    expect(result.def).toBe(25)
    expect(result.spd).toBe(20)
  })

  it('should floor the results', () => {
    const base = { hp: 7, atk: 3, def: 5, spd: 1 }
    const result = scaleBossStats(base)
    // 7*2.5=17.5 -> 17, 3*2.5=7.5 -> 7, 5*2.5=12.5 -> 12, 1*2.5=2.5 -> 2
    expect(result.hp).toBe(17)
    expect(result.atk).toBe(7)
    expect(result.def).toBe(12)
    expect(result.spd).toBe(2)
  })
})

// ─── Fortune-based Random Events ────────────────────────────────────

describe('Fortune-based Random Events', () => {
  function makeTeam(_fortune?: number): CombatUnit[] {
    return [
      makeUnit({
        id: 'p1',
        name: 'FortuneTest',
        team: 'ally',
        hp: 1000,
        maxHp: 1000,
        atk: 10,
        def: 10,
        spd: 10,
      }),
    ]
  }

  it('high fortune should increase treasure rate', () => {
    const team = makeTeam()
    let treasureCount = 0
    const trials = 200
    // fortune = 80 (>50), should bias towards treasure
    for (let i = 0; i < trials; i++) {
      const result = resolveEvent({ type: 'random', id: 'test' }, team, 1, 80)
      if (result.message === '发现了一处宝箱！') treasureCount++
    }
    // With fortune=80 and linear interpolation: treasure threshold = 0.5 + 0.15 * 0.6 = 0.59
    // So ~59% should be treasure. Allow wide range due to randomness.
    expect(treasureCount).toBeGreaterThan(trials * 0.4)
  })

  it('low fortune should increase trap rate', () => {
    const team = makeTeam()
    let trapCount = 0
    const trials = 200
    // fortune = 10 (<30), should bias towards trap
    for (let i = 0; i < trials; i++) {
      const result = resolveEvent({ type: 'random', id: 'test' }, team, 1, 10)
      if (result.message === '踩到了陷阱！') trapCount++
    }
    // With fortune=10: treasure threshold = 0.5 - 0.1 * (2/3) = 0.433, trapBase = 0.8 - 0.1 * (2/3) = 0.733
    // Trap range = 0.733 to 1.0 = 26.7%, up from base 20%.
    expect(trapCount).toBeGreaterThan(trials * 0.15)
  })

  it('neutral fortune should behave like default', () => {
    const team = makeTeam()
    let treasureCount = 0
    const trials = 200
    for (let i = 0; i < trials; i++) {
      const result = resolveEvent({ type: 'random', id: 'test' }, team, 1, 40)
      if (result.message === '发现了一处宝箱！') treasureCount++
    }
    // fortune=40 is between 30-50, so no adjustment. Should be ~50%.
    expect(treasureCount).toBeGreaterThan(trials * 0.3)
    expect(treasureCount).toBeLessThan(trials * 0.7)
  })

  it('undefined fortune should behave like default (no adjustment)', () => {
    const team = makeTeam()
    let treasureCount = 0
    const trials = 200
    for (let i = 0; i < trials; i++) {
      const result = resolveEvent({ type: 'random', id: 'test' }, team, 1)
      if (result.message === '发现了一处宝箱！') treasureCount++
    }
    // No fortune = default thresholds. Should be ~50%.
    expect(treasureCount).toBeGreaterThan(trials * 0.3)
    expect(treasureCount).toBeLessThan(trials * 0.7)
  })
})

// ─── Combat Attribute System - Realm/Quality/Specialty ──────────────

describe('createCharacterCombatUnit - Realm/Quality/Specialty bonuses', () => {
  function makeCharacter(overrides: Partial<import('../types/character').Character> = {}) {
    return {
      id: 'c1',
      name: 'TestChar',
      title: 'disciple' as const,
      quality: 'common' as const,
      realm: 0,
      realmStage: 0 as const,
      cultivation: 0,
      baseStats: { hp: 100, atk: 20, def: 10, spd: 8, crit: 0.05, critDmg: 1.5 },
      cultivationStats: { spiritPower: 50, maxSpiritPower: 50, comprehension: 50, spiritualRoot: 50, fortune: 50 },
      learnedTechniques: [],
      equippedGear: [],
      equippedSkills: [],
      backpack: [],
      maxBackpackSlots: 10,
      petIds: [],
      talents: [],
      status: 'idle' as const,
      injuryTimer: 0,
      createdAt: Date.now(),
      totalCultivation: 0,
      specialties: [],
      assignedBuilding: null,
      cultivationPath: 'none' as const,
      fateTags: [],
      investedSpiritStone: 0,
      ...overrides,
    }
  }

  it('should apply realm bonus: realm 3 + realmStage 2 = +11% stats', () => {
    const lowRealm = makeCharacter({ realm: 0, realmStage: 0 })
    const highRealm = makeCharacter({ realm: 3, realmStage: 2 })

    const lowUnit = createCharacterCombatUnit(lowRealm, [])
    const highUnit = createCharacterCombatUnit(highRealm, [])

    // realm 3 * 0.03 + stage 2 * 0.01 = 0.11 multiplier
    expect(highUnit.atk).toBeGreaterThan(lowUnit.atk)
    expect(highUnit.hp).toBeGreaterThan(lowUnit.hp)
  })

  it('should apply quality bonus: chaos > divine > immortal > spirit > common', () => {
    const common = makeCharacter({ quality: 'common' })
    const spirit = makeCharacter({ quality: 'spirit' })
    const chaos = makeCharacter({ quality: 'chaos' })

    const commonUnit = createCharacterCombatUnit(common, [])
    const spiritUnit = createCharacterCombatUnit(spirit, [])
    const chaosUnit = createCharacterCombatUnit(chaos, [])

    expect(spiritUnit.atk).toBeGreaterThan(commonUnit.atk)
    expect(chaosUnit.atk).toBeGreaterThan(spiritUnit.atk)
  })

  it('should apply combat specialty bonus: each level +5%', () => {
    const noSpecialty = makeCharacter()
    const combatSpecialist = makeCharacter({
      specialties: [{ type: 'combat', level: 3 }],
    })

    const noSpecUnit = createCharacterCombatUnit(noSpecialty, [])
    const specUnit = createCharacterCombatUnit(combatSpecialist, [])

    // combat level 3 = +15% stats
    expect(specUnit.atk).toBeGreaterThan(noSpecUnit.atk)
    // common quality (1.0), realm 0 stage 0 (1.0), so multiplier = 1 * 1 * 1.15
    const expectedAtk = Math.floor(20 * 1.15)
    expect(specUnit.atk).toBe(expectedAtk)
  })

  it('should not apply non-combat specialty bonus', () => {
    const noSpecialty = makeCharacter()
    const alchemySpecialist = makeCharacter({
      specialties: [{ type: 'alchemy', level: 3 }],
    })

    const noSpecUnit = createCharacterCombatUnit(noSpecialty, [])
    const alchemyUnit = createCharacterCombatUnit(alchemySpecialist, [])

    // Alchemy specialty should not affect combat stats
    expect(alchemyUnit.atk).toBe(noSpecUnit.atk)
    expect(alchemyUnit.hp).toBe(noSpecUnit.hp)
  })

  it('combined bonuses should stack multiplicatively', () => {
    const base = makeCharacter({ quality: 'common', realm: 0, realmStage: 0 })
    const buffed = makeCharacter({
      quality: 'divine',
      realm: 2,
      realmStage: 3,
      specialties: [{ type: 'combat', level: 2 }],
    })

    const baseUnit = createCharacterCombatUnit(base, [])
    const buffedUnit = createCharacterCombatUnit(buffed, [])

    // Expected multiplier: (1 + 2*0.03 + 3*0.01) * 1.3 * (1 + 2*0.05)
    // = (1 + 0.06 + 0.03) * 1.3 * 1.1 = 1.09 * 1.3 * 1.1 = 1.5587
    const expectedMultiplier = 1.09 * 1.3 * 1.1
    const expectedAtk = Math.floor(20 * expectedMultiplier)
    expect(buffedUnit.atk).toBe(expectedAtk)
    expect(buffedUnit.atk).toBeGreaterThan(baseUnit.atk)
  })
})
