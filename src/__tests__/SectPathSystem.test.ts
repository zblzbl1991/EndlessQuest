import { canUnlockSectPath, getPathNode, getNextNode, getPathEffects, SECT_PATHS } from '../data/sectPaths'
import { canUnlockNode } from '../systems/sect/SectPathSystem'
import type { Resources, SectPath } from '../types/sect'

function makeResources(overrides?: Partial<Resources>): Resources {
  return { spiritStone: 10000000, spiritEnergy: 0, herb: 200000, ore: 200000, ...overrides }
}

function makeSect(overrides?: { resources?: Partial<Resources>; unlockedPathNodeIds?: string[]; sectPath?: SectPath }) {
  return {
    resources: makeResources(overrides?.resources),
    unlockedPathNodeIds: overrides?.unlockedPathNodeIds ?? [],
    sectPath: overrides?.sectPath ?? 'pill',
  }
}

describe('SectPathSystem', () => {
  describe('canUnlockSectPath', () => {
    it('should return false when sect level < 5', () => {
      expect(canUnlockSectPath(4, 10)).toBe(false)
    })

    it('should return false when disciple count < 10', () => {
      expect(canUnlockSectPath(5, 9)).toBe(false)
    })

    it('should return true when both conditions met', () => {
      expect(canUnlockSectPath(5, 10)).toBe(true)
    })

    it('should return true for higher values', () => {
      expect(canUnlockSectPath(10, 30)).toBe(true)
    })
  })

  describe('getPathNode', () => {
    it('should return undefined for "none" path', () => {
      expect(getPathNode('none', 'pill_1')).toBeUndefined()
    })

    it('should return the correct node for a valid path and id', () => {
      const node = getPathNode('pill', 'pill_1')
      expect(node).toBeDefined()
      expect(node!.id).toBe('pill_1')
      expect(node!.name).toBe('灵田改良')
      expect(node!.order).toBe(1)
    })

    it('should return undefined for wrong path', () => {
      expect(getPathNode('sword', 'pill_1')).toBeUndefined()
    })

    it('should return undefined for invalid nodeId', () => {
      expect(getPathNode('pill', 'nonexistent')).toBeUndefined()
    })
  })

  describe('getNextNode', () => {
    it('should return null for "none" path', () => {
      expect(getNextNode('none', [])).toBeNull()
    })

    it('should return the first node when nothing is unlocked', () => {
      const next = getNextNode('pill', [])
      expect(next).not.toBeNull()
      expect(next!.id).toBe('pill_1')
      expect(next!.order).toBe(1)
    })

    it('should return the second node when first is unlocked', () => {
      const next = getNextNode('sword', ['sword_1'])
      expect(next).not.toBeNull()
      expect(next!.id).toBe('sword_2')
    })

    it('should return null when all nodes are unlocked', () => {
      const allIds = SECT_PATHS.beast.nodes.map((n) => n.id)
      expect(getNextNode('beast', allIds)).toBeNull()
    })

    it('should respect order property', () => {
      // Unlock first two nodes
      const next = getNextNode('beast', ['beast_1', 'beast_2'])
      expect(next!.id).toBe('beast_3')
      expect(next!.order).toBe(3)
    })
  })

  describe('getPathEffects', () => {
    it('should return empty array for "none" path', () => {
      expect(getPathEffects('none', [])).toEqual([])
    })

    it('should return effects for unlocked nodes', () => {
      const effects = getPathEffects('pill', ['pill_1'])
      expect(effects).toHaveLength(1)
      expect(effects[0].type).toBe('herbYield')
      expect(effects[0].value).toBe(1.2)
    })

    it('should accumulate effects from multiple nodes', () => {
      const effects = getPathEffects('sword', ['sword_1', 'sword_2'])
      expect(effects).toHaveLength(2)
      expect(effects[0].type).toBe('atk')
      expect(effects[1].type).toBe('crit')
    })

    it('should return empty array when no nodes unlocked', () => {
      expect(getPathEffects('beast', [])).toEqual([])
    })
  })

  describe('canUnlockNode', () => {
    it('should reject when no path chosen', () => {
      const result = canUnlockNode(makeSect({ sectPath: 'none' }), 'pill_1')
      expect(result.ok).toBe(false)
      expect(result.reason).toBe('未选择宗门路线')
    })

    it('should reject when node already unlocked', () => {
      const result = canUnlockNode(makeSect({ unlockedPathNodeIds: ['pill_1'] }), 'pill_1')
      expect(result.ok).toBe(false)
      expect(result.reason).toBe('已解锁')
    })

    it('should reject when not the next node in order', () => {
      const result = canUnlockNode(makeSect(), 'pill_3')
      expect(result.ok).toBe(false)
      expect(result.reason).toBe('需要按顺序解锁')
    })

    it('should reject when spirit stone insufficient', () => {
      const result = canUnlockNode(makeSect({ resources: { spiritStone: 100 } }), 'pill_1')
      expect(result.ok).toBe(false)
      expect(result.reason).toBe('灵石不足')
    })

    it('should reject when herb insufficient', () => {
      const result = canUnlockNode(makeSect({ resources: { spiritStone: 100000, herb: 10 } }), 'pill_1')
      expect(result.ok).toBe(false)
      expect(result.reason).toBe('灵草不足')
    })

    it('should reject when ore insufficient for sword path', () => {
      const result = canUnlockNode(
        makeSect({ sectPath: 'sword', resources: { spiritStone: 100000, ore: 10 } }),
        'sword_1'
      )
      expect(result.ok).toBe(false)
      expect(result.reason).toBe('矿石不足')
    })

    it('should approve when all conditions met', () => {
      const result = canUnlockNode(makeSect(), 'pill_1')
      expect(result.ok).toBe(true)
      expect(result.reason).toBe('')
    })

    it('should approve second node after first is unlocked', () => {
      const result = canUnlockNode(makeSect({ unlockedPathNodeIds: ['pill_1'] }), 'pill_2')
      expect(result.ok).toBe(true)
    })

    it('should reject invalid node id', () => {
      const result = canUnlockNode(makeSect(), 'fake_node')
      expect(result.ok).toBe(false)
      expect(result.reason).toBe('无效节点')
    })

    it('should approve beast node with no material cost', () => {
      const result = canUnlockNode(makeSect({ sectPath: 'beast' }), 'beast_1')
      expect(result.ok).toBe(true)
    })
  })
})
