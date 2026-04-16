import type { CombatAction, CombatResult, CombatUnit } from './CombatEngine'

export type HighlightType = 'opening' | 'element_clash' | 'critical' | 'comeback' | 'killing_blow' | 'boss_attack'

export interface CombatHighlight {
  text: string
  type: HighlightType
  turn: number
}

export interface CombatNarrative {
  highlights: CombatHighlight[]
}

interface UnitHpTracker {
  id: string
  name: string
  team: 'ally' | 'enemy'
  maxHp: number
  hp: number
  hitLowThreshold: boolean
}

/** Chinese element names for narrative text. */
const ELEMENT_LABELS: Record<string, string> = {
  fire: '火',
  water: '水',
  metal: '金',
  wood: '木',
  earth: '土',
  neutral: '无属性',
}

/** Skill-type verb for narrative flavor. */
function actionVerb(action: CombatAction): string {
  if (action.actionType === 'skill' && action.skillName) return `施展「${action.skillName}」`
  return '一击'
}

/** Build HP trackers from combat units for tracking ally HP thresholds. */
function buildHpTrackers(teamUnits: CombatUnit[], team: 'ally' | 'enemy'): Map<string, UnitHpTracker> {
  const map = new Map<string, UnitHpTracker>()
  for (const u of teamUnits) {
    map.set(u.id, {
      id: u.id,
      name: u.name,
      team,
      maxHp: u.maxHp,
      hp: u.maxHp,
      hitLowThreshold: false,
    })
  }
  return map
}

/**
 * Extract narrative highlights from a combat result.
 *
 * This is a pure function with no side effects. It analyzes the chronological
 * action log and picks out 3-8 key moments to produce flavor text that
 * captures the arc of the fight.
 *
 * @param combatResult - The full combat result from simulateCombat()
 * @param bossUnit - The boss unit (for boss fights); pass enemy unit for regular combat
 * @param teamUnits - The ally team units
 */
export function extractNarrative(
  combatResult: CombatResult,
  bossUnit: CombatUnit,
  teamUnits: CombatUnit[]
): CombatNarrative {
  const actions = combatResult.actions
  if (actions.length === 0) return { highlights: [] }

  const highlights: CombatHighlight[] = []
  const allyTrackers = buildHpTrackers(teamUnits, 'ally')
  const enemyIds = new Set([bossUnit.id])

  let foundOpening = false
  let foundCrit = false
  let foundElementClash = false
  let comebackCandidate: CombatHighlight | null = null

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i]
    const bd = action.breakdown
    const isActorAlly = !enemyIds.has(action.actorId)
    const isTargetAlly = !enemyIds.has(action.targetId)

    // Update HP trackers for allies that take damage
    if (isTargetAlly && action.damage > 0) {
      const tracker = allyTrackers.get(action.targetId)
      if (tracker) {
        tracker.hp = Math.max(0, tracker.hp - action.damage)
        if (tracker.hp > 0 && tracker.hp / tracker.maxHp < 0.2) {
          tracker.hitLowThreshold = true
        }
      }
    }

    // --- 1. Opening stance (first action) ---
    if (!foundOpening) {
      foundOpening = true
      highlights.push({
        text: isActorAlly
          ? `${action.actorName}${actionVerb(action)}率先出手，直指${action.targetName}。`
          : `${action.actorName}来势汹汹，${actionVerb(action)}直袭${action.targetName}。`,
        type: 'opening',
        turn: action.turn,
      })
      continue
    }

    // --- 2. Element advantage (1.5x multiplier) ---
    if (bd && bd.elementMultiplier >= 1.5 && !foundElementClash) {
      foundElementClash = true
      const elementLabel = ELEMENT_LABELS[action.element] ?? action.element
      highlights.push({
        text: `${action.actorName}${actionVerb(action)}引动${elementLabel}属克制之力，对${action.targetName}造成 ${action.damage} 伤害。`,
        type: 'element_clash',
        turn: action.turn,
      })
      continue
    }

    // --- 3. Significant critical hit ---
    if (action.isCrit && !foundCrit && action.damage > 0) {
      foundCrit = true
      highlights.push({
        text: `${action.actorName}的${actionVerb(action)}正中要害，暴击 ${action.damage}！`,
        type: 'critical',
        turn: action.turn,
      })
      continue
    }

    // --- 4. Boss special attack (high-damage enemy action on allies) ---
    if (!isActorAlly && action.damage > 0) {
      const actorTracker = allyTrackers.get(action.targetId)
      if (actorTracker && actorTracker.hp > 0 && actorTracker.hp / actorTracker.maxHp < 0.3) {
        // Boss hit someone low -- comeback setup
        if (!comebackCandidate) {
          comebackCandidate = {
            text: `${action.actorName}重创${action.targetName}，形势岌岌可危。`,
            type: 'boss_attack',
            turn: action.turn,
          }
        }
      }
    }
  }

  // --- 5. Comeback moment ---
  if (comebackCandidate && combatResult.victory) {
    highlights.push(comebackCandidate)
    // Check if any ally was below 20% but we still won
    const anyAllyLow = [...allyTrackers.values()].some((t) => t.hitLowThreshold)
    if (anyAllyLow) {
      highlights.push({
        text: '弟子们在险境中咬牙坚持，最终逆转乾坤。',
        type: 'comeback',
        turn: comebackCandidate.turn,
      })
    }
  }

  // --- 6. Killing blow (last meaningful action) ---
  if (actions.length > 1) {
    const lastAction = actions[actions.length - 1]
    const actorLabel = enemyIds.has(lastAction.actorId) ? lastAction.actorName : lastAction.actorName
    highlights.push({
      text: combatResult.victory
        ? `${actorLabel}的最后一击终结了${lastAction.targetName}，战斗结束。`
        : `${actorLabel}竭尽全力，仍未能扭转败局。`,
      type: 'killing_blow',
      turn: lastAction.turn,
    })
  }

  // Cap to 8 highlights
  return { highlights: highlights.slice(0, 8) }
}
