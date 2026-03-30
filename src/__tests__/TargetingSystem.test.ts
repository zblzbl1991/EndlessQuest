import { selectAttackTarget, selectSupportTarget, increaseAggro } from '../systems/combat/TargetingSystem'
import type { TargetableUnit } from '../systems/combat/TargetingSystem'

function makeUnit(overrides: Partial<TargetableUnit> & { id: string }): TargetableUnit {
  return {
    hp: 100,
    maxHp: 100,
    aggro: 0,
    ...overrides,
  }
}

describe('TargetingSystem', () => {
  describe('selectAttackTarget', () => {
    it('should select the unit with highest aggro', () => {
      const enemies = [
        makeUnit({ id: 'e1', aggro: 1 }),
        makeUnit({ id: 'e2', aggro: 5 }),
        makeUnit({ id: 'e3', aggro: 3 }),
      ]
      expect(selectAttackTarget(enemies)).toBe('e2')
    })

    it('should return first of equal-aggro units', () => {
      const enemies = [makeUnit({ id: 'e1', aggro: 3 }), makeUnit({ id: 'e2', aggro: 3 })]
      const result = selectAttackTarget(enemies)
      expect(result).toBe('e1')
    })

    it('should skip dead units (hp <= 0)', () => {
      const enemies = [makeUnit({ id: 'e1', hp: 0, aggro: 100 }), makeUnit({ id: 'e2', hp: 50, aggro: 1 })]
      expect(selectAttackTarget(enemies)).toBe('e2')
    })

    it('should return null for empty array', () => {
      expect(selectAttackTarget([])).toBeNull()
    })

    it('should return null when all units are dead', () => {
      const enemies = [makeUnit({ id: 'e1', hp: 0, aggro: 10 }), makeUnit({ id: 'e2', hp: 0, aggro: 5 })]
      expect(selectAttackTarget(enemies)).toBeNull()
    })

    it('should handle single alive unit', () => {
      const enemies = [makeUnit({ id: 'e1', aggro: 0 })]
      expect(selectAttackTarget(enemies)).toBe('e1')
    })
  })

  describe('selectSupportTarget', () => {
    it('should select the ally with lowest HP percentage', () => {
      const allies = [
        makeUnit({ id: 'a1', hp: 80, maxHp: 100 }), // 80%
        makeUnit({ id: 'a2', hp: 20, maxHp: 100 }), // 20%
        makeUnit({ id: 'a3', hp: 50, maxHp: 100 }), // 50%
      ]
      expect(selectSupportTarget(allies)).toBe('a2')
    })

    it('should handle different maxHp values correctly', () => {
      const allies = [
        makeUnit({ id: 'a1', hp: 50, maxHp: 100 }), // 50%
        makeUnit({ id: 'a2', hp: 30, maxHp: 200 }), // 15%
      ]
      expect(selectSupportTarget(allies)).toBe('a2')
    })

    it('should return first of equal HP% units', () => {
      const allies = [
        makeUnit({ id: 'a1', hp: 50, maxHp: 100 }), // 50%
        makeUnit({ id: 'a2', hp: 100, maxHp: 200 }), // 50%
      ]
      expect(selectSupportTarget(allies)).toBe('a1')
    })

    it('should skip dead allies', () => {
      const allies = [
        makeUnit({ id: 'a1', hp: 0, maxHp: 100 }), // dead, 0%
        makeUnit({ id: 'a2', hp: 10, maxHp: 100 }), // alive, 10%
      ]
      expect(selectSupportTarget(allies)).toBe('a2')
    })

    it('should return null for empty array', () => {
      expect(selectSupportTarget([])).toBeNull()
    })

    it('should return null when all allies are dead', () => {
      const allies = [makeUnit({ id: 'a1', hp: 0, maxHp: 100 }), makeUnit({ id: 'a2', hp: 0, maxHp: 100 })]
      expect(selectSupportTarget(allies)).toBeNull()
    })
  })

  describe('increaseAggro', () => {
    it('should increase aggro by 1 on normal hit', () => {
      expect(increaseAggro(5, false)).toBe(6)
    })

    it('should increase aggro by 2 on crit', () => {
      expect(increaseAggro(5, true)).toBe(7)
    })

    it('should handle zero aggro', () => {
      expect(increaseAggro(0, false)).toBe(1)
      expect(increaseAggro(0, true)).toBe(2)
    })
  })
})
