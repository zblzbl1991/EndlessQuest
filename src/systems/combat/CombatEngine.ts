import type { ActiveSkill } from '../../types/skill'
import { getElementMultiplier } from '../../data/skills'

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
  skillCooldowns: number[]  // remaining cooldown for each skill
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
  return units.filter(u => u.team === team && isAlive(u))
}

function getEnemies(units: CombatUnit[], team: 'ally' | 'enemy'): CombatUnit[] {
  return units.filter(u => u.team !== team && isAlive(u))
}

function buildHpResult(originalUnits: CombatUnit[], combatUnits: CombatUnit[]): number[] {
  return originalUnits.map(u => {
    const match = combatUnits.find(cu => cu.id === u.id)
    return match ? match.hp : 0
  })
}

export function simulateCombat(allies: CombatUnit[], enemies: CombatUnit[]): CombatResult {
  const units: CombatUnit[] = [...allies.map(u => ({...u})), ...enemies.map(u => ({...u}))]
  const actions: CombatAction[] = []
  let turn = 0
  let maxTurns = 30 // prevent infinite combat

  while (maxTurns-- > 0) {
    turn++

    // Check win/lose at start of turn
    if (getAllies(units, 'ally').length === 0) {
      return { victory: false, turns: turn - 1, actions, allyHp: buildHpResult(allies, units), enemyHp: buildHpResult(enemies, units) }
    }
    if (getAllies(units, 'enemy').length === 0) {
      return { victory: true, turns: turn - 1, actions, allyHp: buildHpResult(allies, units), enemyHp: buildHpResult(enemies, units) }
    }

    // Sort alive units by SPD descending
    const alive = units.filter(isAlive).sort((a, b) => b.spd - a.spd)
    if (alive.length === 0) break

    for (const actor of alive) {
      if (!isAlive(actor)) continue

      // Regen spirit
      actor.spiritPower = Math.min(actor.maxSpiritPower, actor.spiritPower + 10)

      // Pick target
      const targets = getEnemies(units, actor.team)
      if (targets.length === 0) break

      const target = targets[0] // target first alive enemy

      // Try to use a skill
      let usedSkill: ActiveSkill | null = null
      let skillIdx = -1
      for (let i = 0; i < actor.skills.length; i++) {
        const skill = actor.skills[i]
        if (!skill) continue
        if ((actor.skillCooldowns[i] ?? 0) > 0) continue
        if (actor.spiritPower < skill.spiritCost) continue
        // Don't auto-use support skills for now (Phase 8 will add AI)
        if (skill.category === 'support' || skill.category === 'defense') continue
        usedSkill = skill
        skillIdx = i
        break
      }

      let damage = 0
      let isCrit = false

      if (usedSkill && usedSkill.category === 'attack') {
        // Skill attack
        const elementMult = getElementMultiplier(usedSkill.element, target.element)
        damage = Math.max(1, Math.floor(actor.atk * usedSkill.multiplier * elementMult - target.def / 2))
        actor.spiritPower -= usedSkill.spiritCost
        actor.skillCooldowns[skillIdx] = usedSkill.cooldown
      } else {
        // Normal attack
        damage = Math.max(1, Math.floor(actor.atk - target.def / 2))
      }

      // Apply variance
      damage = Math.max(1, Math.floor(damage * randomVariance()))

      // Crit check
      if (Math.random() < actor.crit) {
        isCrit = true
        damage = Math.floor(damage * actor.critDmg)
      }

      target.hp = Math.max(0, target.hp - damage)

      actions.push({
        turn, actorId: actor.id, actorName: actor.name,
        targetId: target.id, targetName: target.name,
        actionType: usedSkill ? 'skill' : 'attack',
        skillName: usedSkill?.name,
        damage, isCrit, element: usedSkill?.element ?? 'neutral',
      })

      // Check if all enemies or all allies are dead
      if (getAllies(units, actor.team === 'ally' ? 'enemy' : 'ally').length === 0) break
    }

    // Reduce cooldowns at end of turn
    for (const u of units) {
      u.skillCooldowns = u.skillCooldowns.map(cd => Math.max(0, cd - 1))
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
