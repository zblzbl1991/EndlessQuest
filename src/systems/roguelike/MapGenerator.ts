import type { Dungeon, DungeonEvent, RouteOption, DungeonFloor } from '../../types/adventure'

// Re-export for backward compatibility
export type { RouteOption as RouteNode, DungeonFloor }

const ROUTE_NAMES = ['安全小径', '探索之路', '危险通道', '幽暗密林', '古遗迹']
const ROUTE_DESCS: Record<string, string> = {
  low: '低风险，少量收益',
  medium: '适中风险与收益',
  high: '高风险高回报',
}

export function generateFloor(dungeon: Dungeon, floorNumber: number): DungeonFloor {
  const isBossFloor = floorNumber === dungeon.totalLayers
  const eventsPerRoute = dungeon.eventsPerLayer

  if (isBossFloor) {
    return {
      floor: floorNumber,
      isBossFloor: true,
      routes: [
        {
          id: `boss_${floorNumber}`,
          name: 'Boss 战',
          description: '击败守关 Boss',
          riskLevel: 'high',
          events: [{ type: 'boss', id: `boss_${dungeon.id}_${floorNumber}` }],
          reward: {
            spiritStone: 500 * floorNumber,
            herb: 20 * floorNumber,
            ore: 10 * floorNumber,
          },
        },
      ],
    }
  }

  const routes: RouteOption[] = []
  const numRoutes = 2 + Math.floor(Math.random() * 2) // 2-3 routes

  for (let i = 0; i < numRoutes; i++) {
    const riskRoll = Math.random()
    const riskLevel = riskRoll < 0.4
      ? 'low' as const
      : riskRoll < 0.75
        ? 'medium' as const
        : 'high' as const

    const events: DungeonEvent[] = []
    const rewardMult = riskLevel === 'low' ? 0.8 : riskLevel === 'medium' ? 1.2 : 1.8

    // Generate events based on distribution
    for (let e = 0; e < eventsPerRoute; e++) {
      const roll = Math.random()
      let type: DungeonEvent['type']
      if (roll < 0.4) type = 'combat'
      else if (roll < 0.65) type = 'random'
      else if (roll < 0.8) type = 'shop'
      else if (roll < 0.9) type = 'rest'
      else type = 'boss'

      // Don't add boss on non-boss floors
      if (type === 'boss' && !isBossFloor) type = 'combat'

      events.push({ type, id: `${type}_${floorNumber}_${i}_${e}` })
    }

    routes.push({
      id: `route_${floorNumber}_${i}`,
      name: ROUTE_NAMES[i % ROUTE_NAMES.length],
      description: ROUTE_DESCS[riskLevel],
      riskLevel,
      events,
      reward: {
        spiritStone: Math.floor(100 * floorNumber * rewardMult),
        herb: Math.floor(5 * floorNumber * rewardMult),
        ore: Math.floor(3 * floorNumber * rewardMult),
      },
    })
  }

  return { floor: floorNumber, isBossFloor: false, routes }
}

export function generateDungeonRun(dungeon: Dungeon): DungeonFloor[] {
  const floors: DungeonFloor[] = []
  for (let i = 1; i <= dungeon.totalLayers; i++) {
    floors.push(generateFloor(dungeon, i))
  }
  return floors
}
