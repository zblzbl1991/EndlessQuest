import type { ActiveSkill } from '../../types/skill'
import type { EnemyAffix, TacticalPreset } from '../../types/adventure'
import type { TacticPreset } from '../../types/runBuild'
import { getElementMultiplier } from '../../data/skills'
import { selectAttackTarget, increaseAggro } from './TargetingSystem'
import { selectAction } from './SkillAI'
import { applyBerserk, calcTribulationBaneDamage, calcSpiritDrainHeal, hasAffix } from './AffixSystem'

export interface CombatUnit {
  id: string
  name: string
  team: 'ally' | 'enemy'
  hp: number
  maxHp: number
  atk: number
  def: number
  spd: number
  crit: number
  critDmg: number
  element: string
  spiritPower: number
  maxSpiritPower: number
  skills: ActiveSkill[]
  skillCooldowns: number[] // remaining cooldown for each skill
  affixes?: EnemyAffix[]
  preset?: TacticalPreset
  aggro?: number
  shield?: number
}

export interface CombatAction {
  turn: number
  actorId: string
  actorName: string
  targetId: string
  targetName: string
  actionType: 'attack' | 'skill'
  skillName?: string
  damage: number
  isCrit: boolean
  element: string
  isHeal?: boolean
  healAmount?: number
}

export interface CombatResult {
  victory: boolean
  turns: number
  actions: CombatAction[]
  allyHp: number[]
  enemyHp: number[]
}

function randomVariance(): number {
  return 0.9 + Math.random() * 0.2
}

function isAlive(unit: CombatUnit): boolean {
  return unit.hp > 0
}

function getAllies(units: CombatUnit[], team: 'ally' | 'enemy'): CombatUnit[] {
  return units.filter((u) => u.team === team && isAlive(u))
}

function getEnemies(units: CombatUnit[], team: 'ally' | 'enemy'): CombatUnit[] {
  return units.filter((u) => u.team !== team && isAlive(u))
}

function buildHpResult(originalUnits: CombatUnit[], combatUnits: CombatUnit[]): number[] {
  return originalUnits.map((u) => {
    const match = combatUnits.find((cu) => cu.id === u.id)
    return match ? match.hp : 0
  })
}

function normalizePreset(preset?: TacticalPreset | TacticPreset): TacticalPreset | undefined {
  if (!preset) return undefined
  if (preset === 'conserve') return 'conservative'
  if (preset === 'boss') return 'bossCounter'
  return preset
}

export function simulateCombat(
  allies: CombatUnit[],
  enemies: CombatUnit[],
  preset?: TacticalPreset | TacticPreset
): CombatResult {
  const normalizedPreset = normalizePreset(preset)
  // Initialize all units with aggro and shield defaults
  const units: CombatUnit[] = [
    ...allies.map((u) => ({
      ...u,
      preset: normalizedPreset ?? normalizePreset(u.preset) ?? 'balanced',
      aggro: u.aggro ?? 0,
      shield: u.shield ?? 0,
      affixes: u.affixes ?? [],
    })),
    ...enemies.map((u) => ({ ...u, aggro: u.aggro ?? 0, shield: u.shield ?? 0, affixes: u.affixes ?? [] })),
  ]
  const actions: CombatAction[] = []
  let turn = 0
  let maxTurns = 30 // prevent infinite combat

  while (maxTurns-- > 0) {
    turn++

    // Check win/lose at start of turn
    if (getAllies(units, 'ally').length === 0) {
      return {
        victory: false,
        turns: turn - 1,
        actions,
        allyHp: buildHpResult(allies, units),
        enemyHp: buildHpResult(enemies, units),
      }
    }
    if (getAllies(units, 'enemy').length === 0) {
      return {
        victory: true,
        turns: turn - 1,
        actions,
        allyHp: buildHpResult(allies, units),
        enemyHp: buildHpResult(enemies, units),
      }
    }

    // Sort alive units by SPD descending
    const alive = units.filter(isAlive).sort((a, b) => b.spd - a.spd)
    if (alive.length === 0) break

    for (const actor of alive) {
      if (!isAlive(actor)) continue

      // Regen spirit
      actor.spiritPower = Math.min(actor.maxSpiritPower, actor.spiritPower + 10)

      // Pick target using TargetingSystem
      const enemyTeam = getEnemies(units, actor.team)
      if (enemyTeam.length === 0) break

      const targetId =
        actor.team === 'ally' && actor.preset === 'bossCounter'
          ? enemyTeam.reduce((best, unit) => (unit.maxHp > best.maxHp ? unit : best)).id
          : selectAttackTarget(enemyTeam.map((unit) => ({ ...unit, aggro: unit.aggro ?? 0 })))
      const target = enemyTeam.find((u) => u.id === targetId)
      if (!target) break

      // Select skill: allies use SkillAI, enemies use simple logic
      let usedSkill: ActiveSkill | null = null
      let skillIdx = -1

      if (actor.team === 'ally') {
        // Use SkillAI for ally units
        const cooldownMap: Record<string, number> = {}
        actor.skills.forEach((s, i) => {
          cooldownMap[s.id] = actor.skillCooldowns[i] ?? 0
        })

        const selected = selectAction(
          actor.skills,
          cooldownMap,
          {
            hpPercent: actor.hp / actor.maxHp,
            spiritPower: actor.spiritPower,
            maxSpiritPower: actor.maxSpiritPower,
            isBossFight: enemies.some((e) => hasAffix(e.affixes ?? [], 'shield') || e.maxHp > 200),
          },
          actor.preset ?? 'balanced'
        )

        if (selected) {
          skillIdx = actor.skills.findIndex((s) => s.id === selected.id)
          if (skillIdx >= 0 && actor.spiritPower >= selected.spiritCost) {
            usedSkill = selected
          }
        }
      } else {
        // Enemy: simple skill selection (first available attack skill)
        for (let i = 0; i < actor.skills.length; i++) {
          const skill = actor.skills[i]
          if (!skill) continue
          if ((actor.skillCooldowns[i] ?? 0) > 0) continue
          if (actor.spiritPower < skill.spiritCost) continue
          if (skill.category === 'support' || skill.category === 'defense') continue
          usedSkill = skill
          skillIdx = i
          break
        }
      }

      // Calculate effective attack with berserk affix
      let effectiveAtk = actor.atk
      if (hasAffix(actor.affixes, 'berserk')) {
        effectiveAtk = applyBerserk(effectiveAtk, actor.hp, actor.maxHp)
      }

      let damage = 0
      let isCrit = false

      if (usedSkill && usedSkill.category === 'attack') {
        // Skill attack
        const elementMult = getElementMultiplier(usedSkill.element, target.element)
        damage = Math.max(1, Math.floor(effectiveAtk * usedSkill.multiplier * elementMult - target.def / 2))
        actor.spiritPower -= usedSkill.spiritCost
        actor.skillCooldowns[skillIdx] = usedSkill.cooldown
      } else {
        // Normal attack
        damage = Math.max(1, Math.floor(effectiveAtk - target.def / 2))
      }

      // Apply variance
      damage = Math.max(1, Math.floor(damage * randomVariance()))

      // Crit check
      if (Math.random() < actor.crit) {
        isCrit = true
        damage = Math.floor(damage * actor.critDmg)
      }

      // Tribulation Bane: bonus damage ignoring defense
      if (hasAffix(actor.affixes, 'tribulationBane')) {
        const bonusDamage = calcTribulationBaneDamage(effectiveAtk, true)
        damage += bonusDamage
      }

      // Shield absorption: absorb damage from shield first
      if (target.shield && target.shield > 0) {
        if (damage <= target.shield) {
          target.shield -= damage
          damage = 0
        } else {
          damage -= target.shield
          target.shield = 0
        }
      }

      target.hp = Math.max(0, target.hp - damage)

      // Spirit Drain: heal attacker
      if (hasAffix(actor.affixes, 'spiritDrain') && damage > 0) {
        const heal = calcSpiritDrainHeal(damage, true)
        actor.hp = Math.min(actor.maxHp, actor.hp + heal)
      }

      // Increase aggro on target after hit
      target.aggro = increaseAggro(target.aggro ?? 0, isCrit)

      actions.push({
        turn,
        actorId: actor.id,
        actorName: actor.name,
        targetId: target.id,
        targetName: target.name,
        actionType: usedSkill ? 'skill' : 'attack',
        skillName: usedSkill?.name,
        damage,
        isCrit,
        element: usedSkill?.element ?? 'neutral',
      })

      // Check if all enemies or all allies are dead
      if (getAllies(units, actor.team === 'ally' ? 'enemy' : 'ally').length === 0) break
    }

    // Reduce cooldowns at end of turn
    for (const u of units) {
      u.skillCooldowns = u.skillCooldowns.map((cd) => Math.max(0, cd - 1))
    }
  }

  return {
    victory: getAllies(units, 'enemy').length === 0,
    turns: turn,
    actions,
    allyHp: buildHpResult(allies, units),
    enemyHp: buildHpResult(enemies, units),
  }
}
