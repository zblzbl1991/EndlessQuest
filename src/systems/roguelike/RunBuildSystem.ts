/**
 * RunBuildSystem resolves blessing/relic effects on combat units.
 * A RunBuild represents the accumulated blessings and relics during a dungeon run.
 */
import type { CombatUnit } from '../combat/CombatEngine'
import { getBlessingById } from '../../data/blessings'
import { getRelicById } from '../../data/relics'

export interface BlessingStack {
  id: string
  stacks: number
}

export interface RelicSlot {
  id: string
}

export interface RunBuild {
  blessings: BlessingStack[]
  relics: RelicSlot[]
}

/**
 * Apply a RunBuild to a set of combat units, returning modified copies.
 * This is called before combat to apply blessing/relic effects.
 */
export function applyRunBuild(units: CombatUnit[], build: RunBuild): CombatUnit[] {
  return units.map(unit => {
    let modified = { ...unit }

    // Apply blessing effects
    for (const stack of build.blessings) {
      const blessing = getBlessingById(stack.id)
      if (!blessing) continue
      const count = Math.min(stack.stacks, blessing.maxStacks)

      switch (blessing.effectType) {
        case 'atkBoost':
          modified.atk = Math.floor(modified.atk * (1 + blessing.value * count))
          break
        case 'critBoost':
          modified.crit = Math.min(1, modified.crit + blessing.value * count)
          break
        case 'hpBoost':
          modified.maxHp = Math.floor(modified.maxHp * (1 + blessing.value * count))
          modified.hp = Math.min(modified.hp, modified.maxHp)
          break
        case 'defBoost':
          modified.def = Math.floor(modified.def * (1 + blessing.value * count))
          break
        case 'spiritRegen':
          modified.maxSpiritPower = Math.floor(modified.maxSpiritPower + blessing.value * count)
          break
        // healOnKill and lootBonus are handled at combat/event resolution time
      }
    }

    // Apply relic effects
    for (const slot of build.relics) {
      const relic = getRelicById(slot.id)
      if (!relic) continue

      switch (relic.rule) {
        case 'defBoost':
          modified.def += relic.value
          break
        case 'critAlways':
          modified.crit = Math.min(1, modified.crit + 0.2)
          break
        case 'spiritShield':
          modified.maxHp += relic.value
          modified.hp += relic.value
          break
        case 'secondWind':
          modified.maxHp = Math.floor(modified.maxHp * 1.15)
          modified.hp = modified.maxHp
          break
        case 'thorns':
          modified.atk = Math.floor(modified.atk * 1.1)
          break
      }
    }

    return modified
  })
}

/**
 * Create an empty run build (no blessings or relics).
 */
export function emptyRunBuild(): RunBuild {
  return { blessings: [], relics: [] }
}

/**
 * Add a blessing to the build, stacking if already present.
 */
export function addBlessing(build: RunBuild, blessingId: string): RunBuild {
  const existing = build.blessings.find(b => b.id === blessingId)
  if (existing) {
    return {
      ...build,
      blessings: build.blessings.map(b =>
        b.id === blessingId ? { ...b, stacks: b.stacks + 1 } : b
      ),
    }
  }
  return {
    ...build,
    blessings: [...build.blessings, { id: blessingId, stacks: 1 }],
  }
}

/**
 * Add a relic to the build.
 */
export function addRelic(build: RunBuild, relicId: string): RunBuild {
  if (build.relics.some(r => r.id === relicId)) return build
  return {
    ...build,
    relics: [...build.relics, { id: relicId }],
  }
}
