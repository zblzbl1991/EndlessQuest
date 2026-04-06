import type { BlessingId, RelicId, Resources, AutomationStrategy, DungeonFloor } from '../../types'
import type { ShopOffer } from './EventSystem'

export interface AutomationContext {
  averageHpRatio: number
  lowestHpRatio: number
  currentRewards: Resources
  currentFloor: number
  totalFloors: number
  blessings: BlessingId[]
  relics: RelicId[]
}

export type RouteArchetype = 'stable' | 'combat' | 'profit' | 'mutation'

const RISK_SCORE: Record<'low' | 'medium' | 'high', number> = {
  low: 0,
  medium: 1,
  high: 2,
}

const ROUTE_ARCHETYPE_LABELS: Record<RouteArchetype, string> = {
  stable: 'stable',
  combat: 'combat',
  profit: 'profit',
  mutation: 'mutation',
}

const ROUTE_ARCHETYPE_NAMES: Record<RouteArchetype, string> = {
  stable: 'stable route',
  combat: 'combat route',
  profit: 'profit route',
  mutation: 'mutation route',
}

const BLESSING_WEIGHTS: Record<AutomationStrategy, Record<BlessingId, number>> = {
  steady: {
    ironBody: 6,
    galeStride: 3,
    battleFocus: 2,
    stoneHarvest: 1,
    verdantBounty: 1,
  },
  combat: {
    battleFocus: 6,
    galeStride: 4,
    ironBody: 3,
    stoneHarvest: 1,
    verdantBounty: 1,
  },
  profit: {
    stoneHarvest: 6,
    verdantBounty: 5,
    galeStride: 2,
    battleFocus: 2,
    ironBody: 2,
  },
}

function scoreRouteReward(reward: DungeonFloor['routes'][number]['reward']): number {
  return reward.spiritStone + reward.herb * 6 + reward.ore * 8
}

export function getRouteArchetype(
  route: Pick<DungeonFloor['routes'][number], 'events' | 'reward' | 'riskLevel'>
): RouteArchetype {
  const combatEvents = route.events.filter((event) => event.type === 'combat' || event.type === 'boss').length
  const restEvents = route.events.filter((event) => event.type === 'rest').length
  const specialEvents = route.events.filter((event) => event.type === 'ancient_cave').length
  const rewardScore = scoreRouteReward(route.reward)
  const rewardDense = rewardScore >= 150

  if (specialEvents > 0) return 'mutation'
  if (combatEvents >= 2 && combatEvents >= restEvents + 1) return 'combat'
  if (route.riskLevel === 'high' && rewardDense) return 'profit'
  return route.riskLevel === 'low' ? 'stable' : 'profit'
}

export function getRouteArchetypeLabel(
  route: Pick<DungeonFloor['routes'][number], 'events' | 'reward' | 'riskLevel'>
): string {
  return ROUTE_ARCHETYPE_LABELS[getRouteArchetype(route)]
}

export function getRouteArchetypeName(
  route: Pick<DungeonFloor['routes'][number], 'events' | 'reward' | 'riskLevel'>
): string {
  return ROUTE_ARCHETYPE_NAMES[getRouteArchetype(route)]
}

export function pickAutomationRoute(
  strategy: AutomationStrategy,
  floor: DungeonFloor,
  context: AutomationContext
): number {
  // E6: steady 策略硬过滤高风险路线（除非全部都是高风险）
  const candidates =
    strategy === 'steady'
      ? floor.routes.every((r) => r.riskLevel === 'high')
        ? floor.routes
        : floor.routes.filter((r) => r.riskLevel !== 'high')
      : floor.routes

  return scoreAndPick(strategy, candidates, context)
}

function scoreAndPick(
  strategy: AutomationStrategy,
  routes: DungeonFloor['routes'],
  context: AutomationContext
): number {
  let bestIndex = 0
  let bestScore = Number.NEGATIVE_INFINITY

  for (const [index, route] of routes.entries()) {
    const rewardScore = scoreRouteReward(route.reward)
    const riskPenalty = RISK_SCORE[route.riskLevel] * 45
    const dangerMultiplier = context.averageHpRatio < 0.45 || context.lowestHpRatio < 0.25 ? 1.8 : 1
    const archetype = getRouteArchetype(route)
    const routeHasAncientCave = route.events.some((event) => event.type === 'ancient_cave')

    let score = rewardScore
    if (strategy === 'steady') {
      score -= riskPenalty * dangerMultiplier * 3
      if (archetype === 'stable') score += 40
      if (archetype === 'combat') score += 4
      if (archetype === 'profit') score -= 14
      if (archetype === 'mutation') score -= 22
    }
    if (strategy === 'combat') {
      score += route.events.length * 20 - riskPenalty * 0.6
      if (archetype === 'combat') score += 120
      if (archetype === 'mutation') score += 32
      if (archetype === 'profit') score -= 30
      if (archetype === 'stable') score -= 10
    }
    if (strategy === 'profit') {
      score += rewardScore * 0.35 - riskPenalty * 0.35
      if (archetype === 'profit') score += 50
      if (archetype === 'mutation') score += 120
      if (routeHasAncientCave) score += 90
      if (archetype === 'stable') score -= 8
    }

    if (score > bestScore) {
      bestIndex = index
      bestScore = score
    }
  }

  return bestIndex
}

export function pickAutomationBlessing(strategy: AutomationStrategy, options: BlessingId[]): BlessingId {
  const weights = BLESSING_WEIGHTS[strategy]
  return options.reduce((best, option) => {
    if (weights[option] > weights[best]) return option
    return best
  }, options[0])
}

export function shouldRetreat(strategy: AutomationStrategy, context: AutomationContext): boolean {
  switch (strategy) {
    case 'steady':
      return context.averageHpRatio < 0.4 || context.lowestHpRatio < 0.22
    case 'combat':
      return context.averageHpRatio < 0.18 || context.lowestHpRatio < 0.08
    case 'profit':
      return context.averageHpRatio < 0.28 || context.lowestHpRatio < 0.15
  }
}

export function shouldAttemptPetCapture(strategy: AutomationStrategy, context: AutomationContext): boolean {
  switch (strategy) {
    case 'steady':
      return context.averageHpRatio >= 0.7 && context.lowestHpRatio >= 0.6
    case 'combat':
      return context.averageHpRatio >= 0.45 && context.lowestHpRatio >= 0.4
    case 'profit':
      return context.averageHpRatio >= 0.55 && context.lowestHpRatio >= 0.5
  }
}

export function pickAutomationShopOffer(
  strategy: AutomationStrategy,
  offers: ShopOffer[],
  context: AutomationContext,
  costMultiplier = 1
): number | null {
  let bestIndex: number | null = null
  let bestScore = 0

  offers.forEach((offer, index) => {
    const finalCost = Math.floor(offer.cost * costMultiplier)
    if (context.currentRewards.spiritStone < finalCost) return

    let score = 0
    if (offer.effect === 'heal') {
      score = strategy === 'steady' ? 6 : strategy === 'combat' ? 4 : 3
      if (context.averageHpRatio < 0.55) score += 4
      if (context.lowestHpRatio < 0.35) score += 4
    } else if (offer.effect === 'skip') {
      score = strategy === 'combat' ? 5 : strategy === 'profit' ? 3 : 1
    }

    if (score > bestScore) {
      bestScore = score
      bestIndex = index
    }
  })

  return bestIndex
}
