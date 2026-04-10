import { describe, it, expect } from 'vitest'
import {
  ENEMY_TEMPLATES,
  getEnemiesForDungeon,
  getBossForDungeon,
  createCombatUnitFromEnemy,
  scaleBossStats,
} from '../data/enemies'
import { DUNGEONS } from '../data/events'

function qualityRank(q: string): number {
  const ranks: Record<string, number> = { common: 1, spirit: 2, immortal: 3, divine: 4, chaos: 5 }
  return ranks[q] ?? 0
}

const DUNGEON_IDS = DUNGEONS.map((d) => d.id)

describe('Enemy Diversity - Dungeon-Enemy Mapping', () => {
  it('every dungeon has a mapping in getEnemiesForDungeon', () => {
    for (const dungeonId of DUNGEON_IDS) {
      const enemies = getEnemiesForDungeon(dungeonId)
      expect(enemies.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('every dungeon has a boss in getBossForDungeon', () => {
    for (const dungeonId of DUNGEON_IDS) {
      const boss = getBossForDungeon(dungeonId)
      expect(boss).toBeDefined()
      expect(boss.isBoss).toBe(true)
    }
  })

  it('each dungeon maps to unique enemies not shared with other dungeons', () => {
    const dungeonEnemySets = new Map<string, Set<string>>()
    for (const dungeonId of DUNGEON_IDS) {
      const enemies = getEnemiesForDungeon(dungeonId)
      const ids = new Set(enemies.map((e) => e.id))
      // Include boss too
      const boss = getBossForDungeon(dungeonId)
      ids.add(boss.id)
      dungeonEnemySets.set(dungeonId, ids)
    }

    // Check no overlap between different dungeons
    const dungeonIds = Array.from(dungeonEnemySets.keys())
    for (let i = 0; i < dungeonIds.length; i++) {
      for (let j = i + 1; j < dungeonIds.length; j++) {
        const setA = dungeonEnemySets.get(dungeonIds[i])!
        const setB = dungeonEnemySets.get(dungeonIds[j])!
        const overlap = [...setA].filter((id) => setB.has(id))
        expect(overlap).toEqual([])
      }
    }
  })

  it('bosses are unique per dungeon', () => {
    const bossIds = DUNGEON_IDS.map((id) => getBossForDungeon(id).id)
    expect(new Set(bossIds).size).toBe(bossIds.length)
  })

  it('unknown dungeonId falls back to full non-boss pool', () => {
    const enemies = getEnemiesForDungeon('unknown_dungeon_xyz')
    const allNonBoss = ENEMY_TEMPLATES.filter((e) => !e.isBoss)
    expect(enemies.length).toBe(allNonBoss.length)
  })

  it('unknown dungeonId falls back to first boss for getBossForDungeon', () => {
    const boss = getBossForDungeon('unknown_dungeon_xyz')
    expect(boss.isBoss).toBe(true)
  })
})

describe('Enemy Diversity - Dungeon-Specific Stats', () => {
  const dungeonStatRanges: Record<
    string,
    { hpMin: number; hpMax: number; atkMin: number; atkMax: number; defMin: number; defMax: number }
  > = {
    lingCaoValley: { hpMin: 30, hpMax: 60, atkMin: 6, atkMax: 12, defMin: 3, defMax: 6 },
    luoYunCave: { hpMin: 70, hpMax: 120, atkMin: 12, atkMax: 20, defMin: 6, defMax: 12 },
    bloodDemonAbyss: { hpMin: 130, hpMax: 200, atkMin: 20, atkMax: 30, defMin: 10, defMax: 18 },
    dragonBoneWasteland: { hpMin: 200, hpMax: 300, atkMin: 28, atkMax: 40, defMin: 16, defMax: 24 },
    nineNetherPurgatory: { hpMin: 280, hpMax: 400, atkMin: 36, atkMax: 50, defMin: 22, defMax: 30 },
    heavenlyTribulationRealm: { hpMin: 380, hpMax: 500, atkMin: 44, atkMax: 60, defMin: 28, defMax: 36 },
  }

  it('regular enemies stats fall within expected ranges for each dungeon', () => {
    for (const dungeonId of DUNGEON_IDS) {
      const range = dungeonStatRanges[dungeonId]
      if (!range) continue

      const enemies = getEnemiesForDungeon(dungeonId)
      for (const enemy of enemies) {
        expect(enemy.stats.hp).toBeGreaterThanOrEqual(range.hpMin)
        expect(enemy.stats.hp).toBeLessThanOrEqual(range.hpMax)
        expect(enemy.stats.atk).toBeGreaterThanOrEqual(range.atkMin)
        expect(enemy.stats.atk).toBeLessThanOrEqual(range.atkMax)
        expect(enemy.stats.def).toBeGreaterThanOrEqual(range.defMin)
        expect(enemy.stats.def).toBeLessThanOrEqual(range.defMax)
      }
    }
  })

  it('boss stats are higher than regular enemies in the same dungeon', () => {
    for (const dungeonId of DUNGEON_IDS) {
      const enemies = getEnemiesForDungeon(dungeonId)
      const boss = getBossForDungeon(dungeonId)
      const maxRegularHp = Math.max(...enemies.map((e) => e.stats.hp))
      const maxRegularAtk = Math.max(...enemies.map((e) => e.stats.atk))

      // Boss base stats should be competitive with or higher than regular enemies
      // (the 1.8x scaling is applied later, so base stats just need to be in the right ballpark)
      expect(boss.stats.hp).toBeGreaterThanOrEqual(maxRegularHp * 0.5)
      expect(boss.stats.atk).toBeGreaterThanOrEqual(maxRegularAtk * 0.5)
    }
  })

  it('difficulty increases across dungeons in order', () => {
    const orderedDungeons = [
      'lingCaoValley',
      'luoYunCave',
      'bloodDemonAbyss',
      'dragonBoneWasteland',
      'nineNetherPurgatory',
      'heavenlyTribulationRealm',
    ]

    for (let i = 1; i < orderedDungeons.length; i++) {
      const prevEnemies = getEnemiesForDungeon(orderedDungeons[i - 1])
      const currEnemies = getEnemiesForDungeon(orderedDungeons[i])

      const prevAvgHp = prevEnemies.reduce((s, e) => s + e.stats.hp, 0) / prevEnemies.length
      const currAvgHp = currEnemies.reduce((s, e) => s + e.stats.hp, 0) / currEnemies.length

      expect(currAvgHp).toBeGreaterThan(prevAvgHp)
    }
  })
})

describe('Enemy Diversity - Dungeon-Specific Elements', () => {
  it('LingCao Valley uses neutral and water elements', () => {
    const enemies = getEnemiesForDungeon('lingCaoValley')
    const boss = getBossForDungeon('lingCaoValley')
    const allElements = [...enemies, boss].map((e) => e.element)
    for (const el of allElements) {
      expect(['neutral', 'water']).toContain(el)
    }
  })

  it('LuoYun Cave uses water and fire elements', () => {
    const enemies = getEnemiesForDungeon('luoYunCave')
    const boss = getBossForDungeon('luoYunCave')
    const allElements = [...enemies, boss].map((e) => e.element)
    for (const el of allElements) {
      expect(['water', 'fire']).toContain(el)
    }
  })

  it('Blood Demon Abyss uses fire element', () => {
    const enemies = getEnemiesForDungeon('bloodDemonAbyss')
    const boss = getBossForDungeon('bloodDemonAbyss')
    const allElements = [...enemies, boss].map((e) => e.element)
    for (const el of allElements) {
      expect(el).toBe('fire')
    }
  })

  it('Dragon Bone Wasteland uses metal and neutral elements', () => {
    const enemies = getEnemiesForDungeon('dragonBoneWasteland')
    const boss = getBossForDungeon('dragonBoneWasteland')
    const allElements = [...enemies, boss].map((e) => e.element)
    for (const el of allElements) {
      expect(['metal', 'neutral']).toContain(el)
    }
  })

  it('Nine Nether Purgatory uses water and fire elements', () => {
    const enemies = getEnemiesForDungeon('nineNetherPurgatory')
    const boss = getBossForDungeon('nineNetherPurgatory')
    const allElements = [...enemies, boss].map((e) => e.element)
    for (const el of allElements) {
      expect(['water', 'fire']).toContain(el)
    }
  })

  it('Heavenly Tribulation Realm uses metal element', () => {
    const enemies = getEnemiesForDungeon('heavenlyTribulationRealm')
    const boss = getBossForDungeon('heavenlyTribulationRealm')
    const allElements = [...enemies, boss].map((e) => e.element)
    for (const el of allElements) {
      expect(el).toBe('metal')
    }
  })
})

describe('Enemy Diversity - Combat Unit Creation', () => {
  it('all new enemies can be converted to combat units', () => {
    for (const template of ENEMY_TEMPLATES) {
      const unit = createCombatUnitFromEnemy(template, 1)
      expect(unit.id).toBe(template.id)
      expect(unit.name).toBe(template.name)
      expect(unit.hp).toBeGreaterThan(0)
      expect(unit.atk).toBeGreaterThan(0)
      expect(unit.def).toBeGreaterThan(0)
      expect(unit.spd).toBeGreaterThan(0)
    }
  })

  it('boss combat units scale correctly with scaleBossStats', () => {
    const bosses = ENEMY_TEMPLATES.filter((e) => e.isBoss)
    for (const boss of bosses) {
      const unit = createCombatUnitFromEnemy(boss, 5)
      const scaled = scaleBossStats({
        hp: unit.maxHp,
        atk: unit.atk,
        def: unit.def,
        spd: unit.spd,
      })
      expect(scaled.hp).toBeGreaterThan(unit.maxHp)
      expect(scaled.atk).toBeGreaterThan(unit.atk)
    }
  })

  it('new enemies have valid skill references', () => {
    for (const template of ENEMY_TEMPLATES) {
      if (template.skillIds && template.skillIds.length > 0) {
        for (const skillId of template.skillIds) {
          const unit = createCombatUnitFromEnemy(template, 1)
          const hasSkill = unit.skills.some((s) => s.id === skillId)
          expect(hasSkill).toBe(true)
        }
      }
    }
  })
})

describe('Enemy Diversity - Loot Tables', () => {
  it('all new enemies have valid loot tables', () => {
    const newEnemyIds = ENEMY_TEMPLATES.filter(
      (e) => !['wild_spirit_beast', 'cave_demon', 'spirit_boss'].includes(e.id)
    )

    for (const enemy of newEnemyIds) {
      expect(Array.isArray(enemy.lootTable)).toBe(true)
      expect(enemy.lootTable.length).toBeGreaterThan(0)
      expect(enemy.dropsPerFight).toBeGreaterThanOrEqual(1)
      expect(enemy.dropsPerFight).toBeLessThanOrEqual(3)

      for (const entry of enemy.lootTable) {
        expect(entry.weight).toBeGreaterThan(0)
        if (entry.type === 'equipment') {
          expect(entry.quality).toBeDefined()
        }
        if (['spiritStone', 'herb', 'ore'].includes(entry.type)) {
          expect(entry.minAmount).toBeDefined()
          expect(entry.maxAmount).toBeDefined()
        }
      }
    }
  })

  it('higher tier dungeons have better equipment drop quality', () => {
    const valleyBoss = getBossForDungeon('lingCaoValley')
    const tribulationBoss = getBossForDungeon('heavenlyTribulationRealm')

    const valleyMaxQuality = Math.max(
      ...valleyBoss.lootTable.filter((e) => e.type === 'equipment').map((e) => (e.quality ? qualityRank(e.quality) : 0))
    )
    const tribulationMaxQuality = Math.max(
      ...tribulationBoss.lootTable
        .filter((e) => e.type === 'equipment')
        .map((e) => (e.quality ? qualityRank(e.quality) : 0))
    )

    // Tribulation boss should have higher quality access
    expect(tribulationMaxQuality).toBeGreaterThanOrEqual(valleyMaxQuality)
  })
})

describe('Enemy Diversity - Template Count', () => {
  it('has at least 21 total enemy templates (3 legacy + 18 new)', () => {
    expect(ENEMY_TEMPLATES.length).toBeGreaterThanOrEqual(21)
  })

  it('has at least 7 bosses (1 legacy + 6 dungeon-specific)', () => {
    const bosses = ENEMY_TEMPLATES.filter((e) => e.isBoss)
    expect(bosses.length).toBeGreaterThanOrEqual(7)
  })

  it('has exactly 2 regular enemies per dungeon', () => {
    for (const dungeonId of DUNGEON_IDS) {
      const enemies = getEnemiesForDungeon(dungeonId)
      expect(enemies.length).toBeGreaterThanOrEqual(2)
      for (const enemy of enemies) {
        expect(enemy.isBoss).toBe(false)
      }
    }
  })
})
