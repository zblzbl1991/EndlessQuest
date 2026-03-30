import type { Resources, SectPath } from '../../types/sect'
import { SECT_PATHS, canUnlockSectPath, getPathNode, getNextNode, getPathEffects } from '../../data/sectPaths'

export { canUnlockSectPath, getPathNode, getNextNode, getPathEffects }

export function canUnlockNode(
  sect: { resources: Resources; unlockedPathNodeIds: string[]; sectPath: SectPath },
  nodeId: string
): { ok: boolean; reason: string } {
  if (sect.sectPath === 'none') return { ok: false, reason: '未选择宗门路线' }

  const pathDef = SECT_PATHS[sect.sectPath]
  if (!pathDef) return { ok: false, reason: '无效路线' }

  const node = pathDef.nodes.find((n) => n.id === nodeId)
  if (!node) return { ok: false, reason: '无效节点' }

  if (sect.unlockedPathNodeIds.includes(nodeId)) return { ok: false, reason: '已解锁' }

  const nextNode = getNextNode(sect.sectPath, sect.unlockedPathNodeIds)
  if (nextNode?.id !== nodeId) return { ok: false, reason: '需要按顺序解锁' }

  const cost = node.cost
  if (sect.resources.spiritStone < cost.spiritStone) return { ok: false, reason: '灵石不足' }
  if (cost.herb && sect.resources.herb < cost.herb) return { ok: false, reason: '灵草不足' }
  if (cost.ore && sect.resources.ore < cost.ore) return { ok: false, reason: '矿石不足' }

  return { ok: true, reason: '' }
}
