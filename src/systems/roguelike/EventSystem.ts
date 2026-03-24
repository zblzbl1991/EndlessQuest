import type { DungeonEvent } from '../../types/adventure'
import { ENEMY_TEMPLATES, createCombatUnitFromEnemy } from '../../data/enemies'
import type { CombatUnit, CombatResult } from '../combat/CombatEngine'
import { simulateCombat } from '../combat/CombatEngine'

export interface EventResult {
  type: DungeonEvent['type']
  success: boolean
  reward: { spiritStone: number; herb: number; ore: number; fairyJade: number }
  combatResult?: CombatResult
  message: string
  hpChange: number // positive = healed, negative = damage taken
}

function getNonBossTemplates() {
  return ENEMY_TEMPLATES.filter((e) => !e.isBoss)
}

export function resolveEvent(
  event: DungeonEvent,
  playerUnit: CombatUnit,
  floorNumber: number,
): EventResult {
  switch (event.type) {
    case 'combat': {
      const templates = getNonBossTemplates()
      const enemyTemplate = templates[Math.floor(Math.random() * templates.length)]
      const enemyUnit = createCombatUnitFromEnemy(enemyTemplate, floorNumber)
      const result = simulateCombat([playerUnit], [enemyUnit])
      const victory = result.victory
      const hpChange = -(playerUnit.hp - (result.allyHp[0] ?? 0))
      return {
        type: 'combat',
        success: victory,
        reward: victory
          ? { spiritStone: 50 * floorNumber, herb: 3 * floorNumber, ore: 2 * floorNumber, fairyJade: 0 }
          : { spiritStone: 0, herb: 0, ore: 0, fairyJade: 0 },
        combatResult: result,
        message: victory ? '战斗胜利！' : '战斗失败...',
        hpChange,
      }
    }
    case 'random': {
      const roll = Math.random()
      if (roll < 0.5) {
        return {
          type: 'random',
          success: true,
          reward: { spiritStone: 30 * floorNumber, herb: 2 * floorNumber, ore: 0, fairyJade: 0 },
          message: '发现了一处宝箱！',
          hpChange: 0,
        }
      } else if (roll < 0.8) {
        return {
          type: 'random',
          success: true,
          reward: { spiritStone: 0, herb: 0, ore: 0, fairyJade: 0 },
          message: '路边休息，恢复了少量生命',
          hpChange: Math.floor(playerUnit.maxHp * 0.1),
        }
      } else {
        return {
          type: 'random',
          success: false,
          reward: { spiritStone: 0, herb: 0, ore: 0, fairyJade: 0 },
          message: '踩到了陷阱！',
          hpChange: -Math.floor(playerUnit.maxHp * 0.1),
        }
      }
    }
    case 'shop': {
      return {
        type: 'shop',
        success: true,
        reward: { spiritStone: 0, herb: 0, ore: 0, fairyJade: 0 },
        message: '遇到了游商',
        hpChange: 0,
      }
    }
    case 'rest': {
      const healAmount = Math.floor(playerUnit.maxHp * 0.3)
      return {
        type: 'rest',
        success: true,
        reward: { spiritStone: 0, herb: 0, ore: 0, fairyJade: 0 },
        message: '休息恢复了生命',
        hpChange: healAmount,
      }
    }
    case 'boss': {
      const bossTemplate = ENEMY_TEMPLATES.find((e) => e.isBoss)!
      const bossUnit = createCombatUnitFromEnemy(bossTemplate, floorNumber)
      // Boost boss for boss fight
      bossUnit.hp = Math.floor(bossUnit.hp * 2)
      bossUnit.maxHp = bossUnit.hp
      bossUnit.atk = Math.floor(bossUnit.atk * 1.5)
      const result = simulateCombat([playerUnit], [bossUnit])
      const victory = result.victory
      const hpChange = -(playerUnit.hp - (result.allyHp[0] ?? 0))
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
        combatResult: result,
        message: victory ? '击败了 Boss！' : 'Boss 太强了...',
        hpChange,
      }
    }
    default:
      return {
        type: event.type,
        success: false,
        reward: { spiritStone: 0, herb: 0, ore: 0, fairyJade: 0 },
        message: '未知事件',
        hpChange: 0,
      }
  }
}
