// src/systems/roguelike/EventSystem.ts
import type { DungeonEvent } from '../../types/adventure'
import type { AnyItem } from '../../types/item'
import { ENEMY_TEMPLATES, createCombatUnitFromEnemy } from '../../data/enemies'
import type { CombatUnit, CombatResult } from '../combat/CombatEngine'
import { simulateCombat } from '../combat/CombatEngine'

export interface EventResult {
  type: DungeonEvent['type']
  success: boolean
  reward: { spiritStone: number; herb: number; ore: number; fairyJade: number }
  itemRewards: AnyItem[]
  combatResult?: CombatResult
  message: string
  hpChanges: Record<string, number> // unit id -> hp change (positive = healed, negative = damage)
}

function getNonBossTemplates() {
  return ENEMY_TEMPLATES.filter((e) => !e.isBoss)
}

/**
 * Get alive units from the team for combat.
 * Dead allies are skipped in subsequent floors.
 */
function getAliveTeam(team: CombatUnit[]): CombatUnit[] {
  return team.filter(u => u.hp > 0)
}

/**
 * Sum total max HP across all alive team members.
 */
function totalTeamMaxHp(team: CombatUnit[]): number {
  return getAliveTeam(team).reduce((sum, u) => sum + u.maxHp, 0)
}

/**
 * Resolve an event with a team of combat units (multi-unit support).
 *
 * Dead allies are filtered out before combat and non-combat events.
 * Returns rewards (resources + items) without mutating any store.
 */
export function resolveEvent(
  event: DungeonEvent,
  team: CombatUnit[],
  floorNumber: number,
): EventResult {
  const emptyReward = { spiritStone: 0, herb: 0, ore: 0, fairyJade: 0 }

  switch (event.type) {
    case 'combat': {
      const aliveTeam = getAliveTeam(team)
      if (aliveTeam.length === 0) {
        return {
          type: 'combat',
          success: false,
          reward: emptyReward,
          itemRewards: [],
          message: '队伍已全军覆没...',
          hpChanges: {},
        }
      }
      const templates = getNonBossTemplates()
      const enemyTemplate = templates[Math.floor(Math.random() * templates.length)]
      const enemyUnit = createCombatUnitFromEnemy(enemyTemplate, floorNumber)
      const result = simulateCombat(aliveTeam, [enemyUnit])
      const victory = result.victory

      // Calculate HP changes for each alive team member
      const hpChanges: Record<string, number> = {}
      for (let i = 0; i < aliveTeam.length; i++) {
        const original = aliveTeam[i].hp
        const remaining = result.allyHp[i] ?? 0
        hpChanges[aliveTeam[i].id] = -(original - remaining)
      }

      return {
        type: 'combat',
        success: victory,
        reward: victory
          ? { spiritStone: 50 * floorNumber, herb: 3 * floorNumber, ore: 2 * floorNumber, fairyJade: 0 }
          : emptyReward,
        itemRewards: [],
        combatResult: result,
        message: victory ? '战斗胜利！' : '战斗失败...',
        hpChanges,
      }
    }
    case 'random': {
      const aliveTeam = getAliveTeam(team)
      const maxHp = totalTeamMaxHp(team)
      const roll = Math.random()
      if (roll < 0.5) {
        return {
          type: 'random',
          success: true,
          reward: { spiritStone: 30 * floorNumber, herb: 2 * floorNumber, ore: 0, fairyJade: 0 },
          itemRewards: [],
          message: '发现了一处宝箱！',
          hpChanges: {},
        }
      } else if (roll < 0.8) {
        // Heal all alive team members
        const healAmount = Math.floor(maxHp * 0.1)
        const perUnitHeal = aliveTeam.length > 0 ? Math.floor(healAmount / aliveTeam.length) : 0
        const hpChanges: Record<string, number> = {}
        for (const unit of aliveTeam) {
          hpChanges[unit.id] = perUnitHeal
        }
        return {
          type: 'random',
          success: true,
          reward: emptyReward,
          itemRewards: [],
          message: '路边休息，恢复了少量生命',
          hpChanges,
        }
      } else {
        // Damage all alive team members
        const damageAmount = Math.floor(maxHp * 0.1)
        const perUnitDamage = aliveTeam.length > 0 ? Math.floor(damageAmount / aliveTeam.length) : 0
        const hpChanges: Record<string, number> = {}
        for (const unit of aliveTeam) {
          hpChanges[unit.id] = -perUnitDamage
        }
        return {
          type: 'random',
          success: false,
          reward: emptyReward,
          itemRewards: [],
          message: '踩到了陷阱！',
          hpChanges,
        }
      }
    }
    case 'shop': {
      return {
        type: 'shop',
        success: true,
        reward: emptyReward,
        itemRewards: [],
        message: '遇到了游商',
        hpChanges: {},
      }
    }
    case 'rest': {
      const aliveTeam = getAliveTeam(team)
      const maxHp = totalTeamMaxHp(team)
      const healTotal = Math.floor(maxHp * 0.3)
      const perUnitHeal = aliveTeam.length > 0 ? Math.floor(healTotal / aliveTeam.length) : 0
      const hpChanges: Record<string, number> = {}
      for (const unit of aliveTeam) {
        hpChanges[unit.id] = perUnitHeal
      }
      return {
        type: 'rest',
        success: true,
        reward: emptyReward,
        itemRewards: [],
        message: '休息恢复了生命',
        hpChanges,
      }
    }
    case 'boss': {
      const aliveTeam = getAliveTeam(team)
      if (aliveTeam.length === 0) {
        return {
          type: 'boss',
          success: false,
          reward: emptyReward,
          itemRewards: [],
          message: '队伍已全军覆没...',
          hpChanges: {},
        }
      }
      const bossTemplate = ENEMY_TEMPLATES.find((e) => e.isBoss)!
      const bossUnit = createCombatUnitFromEnemy(bossTemplate, floorNumber)
      // Boost boss for boss fight
      bossUnit.hp = Math.floor(bossUnit.hp * 2)
      bossUnit.maxHp = bossUnit.hp
      bossUnit.atk = Math.floor(bossUnit.atk * 1.5)
      const result = simulateCombat(aliveTeam, [bossUnit])
      const victory = result.victory

      // Calculate HP changes for each alive team member
      const hpChanges: Record<string, number> = {}
      for (let i = 0; i < aliveTeam.length; i++) {
        const original = aliveTeam[i].hp
        const remaining = result.allyHp[i] ?? 0
        hpChanges[aliveTeam[i].id] = -(original - remaining)
      }

      return {
        type: 'boss',
        success: victory,
        reward: victory
          ? {
              spiritStone: 200 * floorNumber,
              herb: 10 * floorNumber,
              ore: 5 * floorNumber,
              fairyJade: floorNumber >= 3 ? 1 : 0,
            }
          : { spiritStone: 50 * floorNumber, herb: 2 * floorNumber, ore: 0, fairyJade: 0 },
        itemRewards: [],
        combatResult: result,
        message: victory ? '击败了 Boss！' : 'Boss 太强了...',
        hpChanges,
      }
    }
    default:
      return {
        type: event.type,
        success: false,
        reward: emptyReward,
        itemRewards: [],
        message: '未知事件',
        hpChanges: {},
      }
  }
}
