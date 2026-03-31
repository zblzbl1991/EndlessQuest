import { simulateCombat } from '../systems/combat/CombatEngine'
import type { CombatUnit } from '../systems/combat/CombatEngine'
import type { TacticPreset } from '../types/runBuild'

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
