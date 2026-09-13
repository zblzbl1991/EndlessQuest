import { REALM_EXP, getRealmEconomyMult } from '../../data/realms'
import type { Resources } from '../../types/sect'

/**
 * 秘境/远征资源收益的境界缩放（设计稿 §九.4）。
 *
 * 灵石/灵草/矿材按宗门正在冲击的目标境界（bestRealm + 1）缩放，与
 * tickSlice 的经济耦合倍率同源，保证"更深的秘境 = 资源链上游"；灵气
 * 不缩放——它是生产链底层的瓶颈资源（与 tickSlice 对灵气的处理一致），
 * 缩放它会移除前期"灵气不足 → 修为缩水"的教学体验。
 */
export function scaleDungeonResources(resources: Resources, bestRealm: number): Resources {
  const targetRealm = Math.min(Math.max(bestRealm + 1, 0), REALM_EXP.length - 1)
  const mult = getRealmEconomyMult(targetRealm)
  return {
    spiritStone: resources.spiritStone * mult,
    spiritEnergy: resources.spiritEnergy,
    herb: resources.herb * mult,
    ore: resources.ore * mult,
  }
}
