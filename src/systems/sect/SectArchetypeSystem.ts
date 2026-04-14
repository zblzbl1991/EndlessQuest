import type { SectArchetype, RouteShiftState } from '../../types/sect'
import { getArchetypeDescriptor } from '../../data/sectArchetypes'

export interface ArchetypeModifiers {
  cultivationMultiplier: number
  expeditionMultiplier: number
  recoveryMultiplier: number
  resourceTemplateMultiplier: number
}

const ARCHETYPE_MODIFIERS: Record<SectArchetype, ArchetypeModifiers> = {
  swordBurst: {
    cultivationMultiplier: 1.0,
    expeditionMultiplier: 1.2,
    recoveryMultiplier: 0.9,
    resourceTemplateMultiplier: 1.0,
  },
  pillSustain: {
    cultivationMultiplier: 1.2,
    expeditionMultiplier: 0.9,
    recoveryMultiplier: 1.25,
    resourceTemplateMultiplier: 1.0,
  },
  arrayGuard: {
    cultivationMultiplier: 1.0,
    expeditionMultiplier: 1.0,
    recoveryMultiplier: 1.0,
    resourceTemplateMultiplier: 1.1,
  },
  beastHarvest: {
    cultivationMultiplier: 0.9,
    expeditionMultiplier: 1.1,
    recoveryMultiplier: 1.0,
    resourceTemplateMultiplier: 0.9,
  },
}

/** Check whether the sect can shift to a new archetype */
export function canShiftArchetype(
  routeShift: RouteShiftState,
  currentGameDay: number,
  target: SectArchetype
): { canShift: boolean; reason: string } {
  if (routeShift.currentArchetype === target) {
    return { canShift: false, reason: '当前已是此路线' }
  }

  if (routeShift.lastShiftAtDay !== null) {
    const elapsedDays = currentGameDay - routeShift.lastShiftAtDay
    if (elapsedDays < routeShift.shiftCooldownDays) {
      const remaining = routeShift.shiftCooldownDays - elapsedDays
      return { canShift: false, reason: `路线切换冷却中，还需 ${Math.ceil(remaining)} 个游戏日` }
    }
  }

  return { canShift: true, reason: '' }
}

/** Build a human-readable summary for the current archetype */
export function buildArchetypeSummary(archetype: SectArchetype): {
  name: string
  summary: string
  strengths: string[]
  weaknesses: string[]
} {
  const desc = getArchetypeDescriptor(archetype)
  return {
    name: desc.name,
    summary: desc.summary,
    strengths: desc.strengths,
    weaknesses: desc.weaknesses,
  }
}

/** Get gameplay modifiers for a given archetype */
export function getArchetypeModifiers(archetype: SectArchetype): ArchetypeModifiers {
  return ARCHETYPE_MODIFIERS[archetype]
}
