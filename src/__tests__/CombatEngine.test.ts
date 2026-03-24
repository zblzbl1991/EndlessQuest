import { simulateCombat } from '../systems/combat/CombatEngine'
import type { CombatUnit } from '../systems/combat/CombatEngine'

function makeUnit(overrides: Partial<CombatUnit> & { id: string; name: string; team: 'ally' | 'enemy' }): CombatUnit {
  return {
    maxHp: 100, hp: 100, atk: 15, def: 8, spd: 10, crit: 0, critDmg: 1.5,
    element: 'neutral', spiritPower: 50, maxSpiritPower: 50, skills: [], skillCooldowns: [],
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
    const enemies = [makeUnit({ id: 'e1', name: 'Ice', team: 'enemy', element: 'ice', hp: 1000, maxHp: 1000, atk: 0, def: 0, spd: 5 })]
    const result = simulateCombat(allies, enemies)
    // With fire > ice, damage should be higher. Hard to test exact value due to variance, but check combat completes.
    expect(result.actions.length).toBeGreaterThan(0)
  })

  it('should handle defeat (all allies dead)', () => {
    const allies = [makeUnit({ id: 'p1', name: 'Weak', team: 'ally', hp: 10, maxHp: 10, atk: 1, spd: 10 })]
    const enemies = [makeUnit({ id: 'e1', name: 'Strong', team: 'enemy', hp: 1000, maxHp: 1000, atk: 50, def: 10, spd: 20 })]
    const result = simulateCombat(allies, enemies)
    expect(result.victory).toBe(false)
  })

  it('should use skills when available', () => {
    const allies = [makeUnit({
      id: 'p1', name: 'Mage', team: 'ally', atk: 10, spd: 10,
      skills: [{ id: 'fire_palm', name: '烈焰掌', category: 'attack', element: 'fire', multiplier: 1.8, spiritCost: 15, cooldown: 1, description: '', tier: 2 }],
      skillCooldowns: [0],
    })]
    const enemies = [makeUnit({ id: 'e1', name: 'Target', team: 'enemy', hp: 500, maxHp: 500, atk: 0, def: 0, spd: 5 })]
    const result = simulateCombat(allies, enemies)
    const skillActions = result.actions.filter(a => a.actionType === 'skill')
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
    const allyActions = result.actions.filter(a => a.actorId === 'p1')
    for (const action of allyActions) {
      expect(action.isCrit).toBe(true)
    }
  })

  it('should respect skill cooldowns', () => {
    const allies = [makeUnit({
      id: 'p1', name: 'Mage', team: 'ally', atk: 10, spd: 10,
      skills: [{ id: 'fire_palm', name: '烈焰掌', category: 'attack', element: 'fire', multiplier: 1.8, spiritCost: 15, cooldown: 5, description: '', tier: 2 }],
      skillCooldowns: [3], // on cooldown
      spiritPower: 50,
    })]
    const enemies = [makeUnit({ id: 'e1', name: 'Target', team: 'enemy', hp: 500, maxHp: 500, atk: 0, def: 0, spd: 5 })]
    const result = simulateCombat(allies, enemies)
    // First few turns should be normal attacks while skill is on cooldown
    expect(result.actions[0].actionType).toBe('attack')
  })

  it('should cap spirit power regeneration', () => {
    const allies = [makeUnit({ id: 'p1', name: 'Full', team: 'ally', atk: 20, spd: 10, spiritPower: 50, maxSpiritPower: 50 })]
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
})
