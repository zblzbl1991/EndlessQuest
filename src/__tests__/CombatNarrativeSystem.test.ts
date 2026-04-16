import { extractNarrative } from '../systems/combat/CombatNarrativeSystem'
import type { CombatAction, CombatResult, CombatUnit } from '../systems/combat/CombatEngine'

function makeUnit(overrides: Partial<CombatUnit> & { id: string; name: string; team: 'ally' | 'enemy' }): CombatUnit {
  return {
    maxHp: 100,
    hp: 100,
    atk: 15,
    def: 8,
    spd: 10,
    crit: 0,
    critDmg: 1.5,
    element: 'neutral',
    spiritPower: 50,
    maxSpiritPower: 50,
    skills: [],
    skillCooldowns: [],
    affixes: [],
    preset: 'balanced',
    aggro: 0,
    shield: 0,
    ...overrides,
  }
}

function makeAction(
  overrides: Partial<CombatAction> & {
    turn: number
    actorId: string
    actorName: string
    targetId: string
    targetName: string
  }
): CombatAction {
  return {
    actionType: 'attack',
    damage: 10,
    isCrit: false,
    element: 'neutral',
    ...overrides,
  }
}

describe('CombatNarrativeSystem', () => {
  const bossUnit = makeUnit({ id: 'boss1', name: 'Boss', team: 'enemy', maxHp: 200, hp: 200 })
  const teamUnits = [
    makeUnit({ id: 'p1', name: 'Player', team: 'ally', maxHp: 100, hp: 100 }),
    makeUnit({ id: 'p2', name: 'Ally2', team: 'ally', maxHp: 80, hp: 80 }),
  ]

  it('should return empty highlights for empty actions', () => {
    const result: CombatResult = {
      victory: true,
      turns: 0,
      actions: [],
      allyHp: [100, 80],
      enemyHp: [200],
    }
    const narrative = extractNarrative(result, bossUnit, teamUnits)
    expect(narrative.highlights).toHaveLength(0)
  })

  it('should extract opening highlight from first action', () => {
    const result: CombatResult = {
      victory: true,
      turns: 1,
      actions: [
        makeAction({
          turn: 1,
          actorId: 'p1',
          actorName: 'Player',
          targetId: 'boss1',
          targetName: 'Boss',
        }),
      ],
      allyHp: [100, 80],
      enemyHp: [0],
    }
    const narrative = extractNarrative(result, bossUnit, teamUnits)
    expect(narrative.highlights.length).toBeGreaterThanOrEqual(1)
    expect(narrative.highlights[0].type).toBe('opening')
    expect(narrative.highlights[0].text).toContain('Player')
  })

  it('should extract element clash highlight when multiplier >= 1.5', () => {
    const result: CombatResult = {
      victory: true,
      turns: 2,
      actions: [
        makeAction({
          turn: 1,
          actorId: 'p1',
          actorName: 'Player',
          targetId: 'boss1',
          targetName: 'Boss',
        }),
        makeAction({
          turn: 2,
          actorId: 'p1',
          actorName: 'Player',
          targetId: 'boss1',
          targetName: 'Boss',
          damage: 30,
          element: 'fire',
          breakdown: {
            baseAtk: 20,
            skillMultiplier: 1,
            elementMultiplier: 1.5,
            defReduction: 4,
            variance: 1,
            shieldAbsorbed: 0,
          },
        }),
      ],
      allyHp: [100, 80],
      enemyHp: [0],
    }
    const narrative = extractNarrative(result, bossUnit, teamUnits)
    const elementHighlights = narrative.highlights.filter((h) => h.type === 'element_clash')
    expect(elementHighlights.length).toBe(1)
    expect(elementHighlights[0].text).toContain('克制')
  })

  it('should extract critical hit highlight', () => {
    const result: CombatResult = {
      victory: true,
      turns: 2,
      actions: [
        makeAction({
          turn: 1,
          actorId: 'p1',
          actorName: 'Player',
          targetId: 'boss1',
          targetName: 'Boss',
        }),
        makeAction({
          turn: 2,
          actorId: 'p1',
          actorName: 'Player',
          targetId: 'boss1',
          targetName: 'Boss',
          damage: 50,
          isCrit: true,
        }),
      ],
      allyHp: [100, 80],
      enemyHp: [0],
    }
    const narrative = extractNarrative(result, bossUnit, teamUnits)
    const critHighlights = narrative.highlights.filter((h) => h.type === 'critical')
    expect(critHighlights.length).toBe(1)
    expect(critHighlights[0].text).toContain('暴击')
  })

  it('should extract killing blow highlight from last action', () => {
    const result: CombatResult = {
      victory: true,
      turns: 3,
      actions: [
        makeAction({ turn: 1, actorId: 'p1', actorName: 'Player', targetId: 'boss1', targetName: 'Boss' }),
        makeAction({ turn: 2, actorId: 'boss1', actorName: 'Boss', targetId: 'p1', targetName: 'Player', damage: 5 }),
        makeAction({ turn: 3, actorId: 'p1', actorName: 'Player', targetId: 'boss1', targetName: 'Boss', damage: 80 }),
      ],
      allyHp: [95, 80],
      enemyHp: [0],
    }
    const narrative = extractNarrative(result, bossUnit, teamUnits)
    const killHighlights = narrative.highlights.filter((h) => h.type === 'killing_blow')
    expect(killHighlights.length).toBe(1)
    expect(killHighlights[0].text).toContain('终结')
  })

  it('should show defeat text in killing blow when not victorious', () => {
    const result: CombatResult = {
      victory: false,
      turns: 2,
      actions: [
        makeAction({ turn: 1, actorId: 'boss1', actorName: 'Boss', targetId: 'p1', targetName: 'Player', damage: 60 }),
        makeAction({ turn: 2, actorId: 'boss1', actorName: 'Boss', targetId: 'p1', targetName: 'Player', damage: 50 }),
      ],
      allyHp: [0, 80],
      enemyHp: [200],
    }
    const narrative = extractNarrative(result, bossUnit, teamUnits)
    const killHighlights = narrative.highlights.filter((h) => h.type === 'killing_blow')
    expect(killHighlights.length).toBe(1)
    expect(killHighlights[0].text).toContain('败局')
  })

  it('should extract comeback highlight when ally drops below 20% HP and team wins', () => {
    // Player starts at 100 HP, takes 85 damage (drops to 15 = 15%), then wins
    const result: CombatResult = {
      victory: true,
      turns: 3,
      actions: [
        makeAction({ turn: 1, actorId: 'p1', actorName: 'Player', targetId: 'boss1', targetName: 'Boss', damage: 20 }),
        makeAction({ turn: 2, actorId: 'boss1', actorName: 'Boss', targetId: 'p1', targetName: 'Player', damage: 85 }),
        makeAction({ turn: 3, actorId: 'p1', actorName: 'Player', targetId: 'boss1', targetName: 'Boss', damage: 95 }),
      ],
      allyHp: [15, 80],
      enemyHp: [0],
    }
    const narrative = extractNarrative(result, bossUnit, teamUnits)
    const comebackHighlights = narrative.highlights.filter((h) => h.type === 'comeback')
    expect(comebackHighlights.length).toBe(1)
    expect(comebackHighlights[0].text).toContain('逆转')
  })

  it('should not extract comeback highlight when team loses', () => {
    const result: CombatResult = {
      victory: false,
      turns: 3,
      actions: [
        makeAction({ turn: 1, actorId: 'p1', actorName: 'Player', targetId: 'boss1', targetName: 'Boss', damage: 20 }),
        makeAction({ turn: 2, actorId: 'boss1', actorName: 'Boss', targetId: 'p1', targetName: 'Player', damage: 85 }),
        makeAction({ turn: 3, actorId: 'boss1', actorName: 'Boss', targetId: 'p1', targetName: 'Player', damage: 20 }),
      ],
      allyHp: [0, 80],
      enemyHp: [180],
    }
    const narrative = extractNarrative(result, bossUnit, teamUnits)
    const comebackHighlights = narrative.highlights.filter((h) => h.type === 'comeback')
    expect(comebackHighlights).toHaveLength(0)
  })

  it('should limit highlights to 8', () => {
    // Create many actions with various types
    const actions: CombatAction[] = []
    for (let i = 1; i <= 15; i++) {
      actions.push(
        makeAction({
          turn: i,
          actorId: i % 2 === 0 ? 'p1' : 'boss1',
          actorName: i % 2 === 0 ? 'Player' : 'Boss',
          targetId: i % 2 === 0 ? 'boss1' : 'p1',
          targetName: i % 2 === 0 ? 'Boss' : 'Player',
          damage: 10 + i,
        })
      )
    }
    const result: CombatResult = {
      victory: true,
      turns: 15,
      actions,
      allyHp: [10, 80],
      enemyHp: [0],
    }
    const narrative = extractNarrative(result, bossUnit, teamUnits)
    expect(narrative.highlights.length).toBeLessThanOrEqual(8)
  })

  it('should produce skill name in narrative when skill is used', () => {
    const result: CombatResult = {
      victory: true,
      turns: 1,
      actions: [
        makeAction({
          turn: 1,
          actorId: 'p1',
          actorName: 'Player',
          targetId: 'boss1',
          targetName: 'Boss',
          actionType: 'skill',
          skillName: '烈火剑法',
        }),
      ],
      allyHp: [100, 80],
      enemyHp: [0],
    }
    const narrative = extractNarrative(result, bossUnit, teamUnits)
    expect(narrative.highlights[0].text).toContain('烈火剑法')
  })
})
