import { describe, expect, it } from 'vitest'
import { getCharacterDisposition } from '../systems/character/CharacterDispositionSystem'
import type { Character } from '../types/character'

function buildCharacter(overrides: Partial<Character>): Character {
  return {
    id: 'char_test',
    name: '测试弟子',
    title: 'disciple',
    quality: 'immortal',
    realm: 1,
    realmStage: 0,
    cultivation: 0,
    baseStats: {
      hp: 120,
      atk: 18,
      def: 10,
      spd: 12,
      crit: 0.08,
      critDmg: 1.6,
    },
    cultivationStats: {
      spiritPower: 0,
      maxSpiritPower: 100,
      comprehension: 20,
      spiritualRoot: 18,
      fortune: 12,
    },
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
    ...overrides,
  }
}

describe('CharacterDispositionSystem', () => {
  it('reads a support-focused disciple as stronger at留守 than出战', () => {
    const disposition = getCharacterDisposition(
      buildCharacter({
        cultivationPath: 'alchemy',
        specialties: [
          { type: 'alchemy', level: 3 },
          { type: 'comprehension', level: 2 },
        ],
        assignedBuilding: 'alchemyFurnace',
        status: 'training',
      })
    )

    expect(disposition.management.label).toBe('厚积')
    expect(disposition.adventure.label).toBe('待养')
    expect(disposition.risk.label).toBe('稳守')
  })

  it('reads an injured combat disciple as still锋锐 but currently偏稳守', () => {
    const disposition = getCharacterDisposition(
      buildCharacter({
        cultivationPath: 'sword',
        specialties: [
          { type: 'combat', level: 3 },
          { type: 'fortune', level: 2 },
        ],
        status: 'injured',
        injuryTimer: 120,
        baseStats: {
          hp: 150,
          atk: 28,
          def: 12,
          spd: 16,
          crit: 0.14,
          critDmg: 1.9,
        },
        cultivationStats: {
          spiritPower: 0,
          maxSpiritPower: 100,
          comprehension: 16,
          spiritualRoot: 16,
          fortune: 18,
        },
      })
    )

    expect(disposition.adventure.label).toBe('锋锐')
    expect(disposition.risk.label).toBe('稳守')
    expect(disposition.management.label).toBe('待磨')
  })
})
