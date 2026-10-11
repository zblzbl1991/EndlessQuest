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

// V2.2 工单 02：Partial——未列出的新祝福走 RunBuildSystem 的基础权重（按系倾斜由三选一生成器处理）
const BLESSING_WEIGHTS: Record<AutomationStrategy, Partial<Record<BlessingId, number>>> = {
  // 求道（V2.2 工单 02）：只走事件/奇遇路线刷祝福与功法——权重全面倾斜稀有系
  seekDao: {
    sword_array: 5,
    crit_dao: 5,
    thunder_dao: 5,
    immortal_body: 4,
    beast_king: 4,
    spirit_dao: 5,
    sword_intent: 3,
    deadly_slot: 3,
    thorn_shell: 3,
    hunt_master: 3,
    treasure_gath: 3,
  },
  steady: {
    ironBody: 6,
    galeStride: 3,
    battleFocus: 2,
    stoneHarvest: 1,
    verdantBounty: 1,
    flame_heart: 2,
    iron_wall: 4,
    jade_pulse: 3,
    spirit_spring: 2,
    keen_eye: 1,
    reaper_mark: 2,
    golden_touch: 1,
    wind_step: 2,
    // 稳守倾向体修/灵息新祝福
    mountain_body: 4,
    thorn_shell: 3,
    immortal_body: 2,
    spirit_well: 3,
    treasure_gath: 3,
    spirit_dao: 2,
  },
  combat: {
    battleFocus: 6,
    galeStride: 4,
    ironBody: 3,
    stoneHarvest: 1,
    verdantBounty: 1,
    flame_heart: 5,
    iron_wall: 2,
    jade_pulse: 2,
    spirit_spring: 3,
    keen_eye: 4,
    reaper_mark: 3,
    golden_touch: 1,
    wind_step: 4,
    // 争锋倾向剑修/会心/雷法新祝福
    sword_qi: 4,
    sword_intent: 3,
    sword_array: 2,
    crit_heart: 3,
    deadly_slot: 3,
    crit_dao: 2,
    thunder_soul: 3,
    storm_eye: 2,
    thunder_dao: 2,
  },
  profit: {
    stoneHarvest: 6,
    verdantBounty: 5,
    galeStride: 2,
    battleFocus: 2,
    ironBody: 2,
    flame_heart: 2,
    iron_wall: 1,
    jade_pulse: 1,
    spirit_spring: 1,
    keen_eye: 1,
    reaper_mark: 1,
    golden_touch: 5,
    wind_step: 2,
    // 求财倾向御兽/灵息新祝福
    hunt_master: 4,
    blood_fang: 2,
    beast_king: 2,
    treasure_gath: 4,
    spirit_well: 2,
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
  // steady 策略：高风险路线有 15% 概率被保留（允许偶尔冒险）
  const candidates =
    strategy === 'steady'
      ? floor.routes.every((r) => r.riskLevel === 'high')
        ? floor.routes
        : floor.routes.filter((r) => r.riskLevel !== 'high' || Math.random() < 0.15)
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
    if ((weights[option] ?? 0) > (weights[best] ?? 0)) return option
    return best
  }, options[0])
}

export function shouldRetreat(strategy: AutomationStrategy, context: AutomationContext): boolean {
  switch (strategy) {
    case 'seekDao':
      // 求道以拿祝福为先，血线保守（与 steady 同阈值）
      return context.averageHpRatio < 0.55 || context.lowestHpRatio < 0.3
    case 'steady':
      return context.averageHpRatio < 0.55 || context.lowestHpRatio < 0.3
    case 'combat':
      return context.averageHpRatio < 0.3 || context.lowestHpRatio < 0.12
    case 'profit':
      return context.averageHpRatio < 0.4 || context.lowestHpRatio < 0.18
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
    case 'seekDao':
      return context.averageHpRatio >= 0.6 && context.lowestHpRatio >= 0.55
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
