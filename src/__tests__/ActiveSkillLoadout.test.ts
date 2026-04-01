import { buildCharacterSkillLoadout, syncCharacterSkillLoadout } from '../data/activeSkills'
import { createCharacterCombatUnit } from '../data/enemies'
import type { Character } from '../types/character'

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'char_test',
    name: 'Test Disciple',
    title: 'disciple',
    quality: 'common',
    realm: 0,
    realmStage: 0,
    cultivation: 0,
    baseStats: { hp: 100, atk: 15, def: 8, spd: 10, crit: 0.05, critDmg: 1.5 },
    cultivationStats: { spiritPower: 40, maxSpiritPower: 40, comprehension: 12, spiritualRoot: 12, fortune: 8 },
    learnedTechniques: ['qingxin'],
    equippedGear: [],
    equippedSkills: [],
    backpack: [],
    maxBackpackSlots: 20,
    petIds: [],
    talents: [],
    status: 'idle',
    injuryTimer: 0,
    createdAt: 0,
    totalCultivation: 0,
    specialties: [],
    assignedBuilding: null,
    cultivationPath: 'none',
    fateTags: [],
    ...overrides,
  }
}

describe('active skill loadout automation', () => {
  it('builds a fixed five-slot loadout for new disciples', () => {
    const character = makeCharacter()
    const loadout = buildCharacterSkillLoadout(character)

    expect(loadout).toHaveLength(5)
    expect(loadout[0]).toBe('sword_qi')
    expect(loadout.filter((skillId) => skillId !== null)).toHaveLength(1)
  })

  it('leans into sword burst skills for sword-path disciples', () => {
    const character = makeCharacter({
      realm: 4,
      cultivationPath: 'sword',
      learnedTechniques: ['qingxin', 'leiyu', 'leishen', 'wanjianguizong'],
      fateTags: ['suddenInsight'],
    })

    const loadout = buildCharacterSkillLoadout(character)

    expect(loadout).toContain('thunder_strike')
    expect(loadout).toContain('dao_sword')
  })

  it('syncs the equipped skill array in character state', () => {
    const character = makeCharacter({
      realm: 2,
      cultivationPath: 'alchemy',
      learnedTechniques: ['qingxin', 'lieyan'],
      equippedSkills: [],
    })

    const updated = syncCharacterSkillLoadout(character)

    expect(updated.equippedSkills).toHaveLength(5)
    expect(updated.equippedSkills.some((skillId) => skillId === 'heal_art')).toBe(true)
    expect(updated.equippedSkills.some((skillId) => skillId === 'fire_palm')).toBe(true)
  })

  it('uses auto-generated loadouts in combat when older saves have empty slots', () => {
    const character = makeCharacter({
      realm: 3,
      cultivationPath: 'body',
      learnedTechniques: ['qingxin', 'houtu', 'bumiejinshen'],
      equippedSkills: [],
    })

    const unit = createCharacterCombatUnit(character, character.learnedTechniques)

    expect(unit.skills.length).toBeGreaterThan(0)
    expect(unit.skills.some((skill) => skill.id === 'ice_shield')).toBe(true)
  })
})
