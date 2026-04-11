import { describe, expect, it } from 'vitest'
import { buildSectRumors } from '../systems/sect/SectRumorSystem'

describe('buildSectRumors', () => {
  it('should surface legacy forge events as a dedicated good rumor', () => {
    const rumors = buildSectRumors([
      {
        id: 'evt_legacy_forge',
        type: 'item_crafted',
        message: '炼器坊铸成了归墟道兵',
        data: {
          isLegacyCraft: true,
          legacyDungeonId: 'guixuRift',
          legacyRecipeId: 'forge_guixu_weapon',
        },
      },
    ])

    expect(rumors.some((rumor) => rumor.title === '遗器初成')).toBe(true)
    expect(rumors.some((rumor) => rumor.detail.includes('炼器坊铸成了归墟道兵'))).toBe(true)
  })

  it('should surface the third relic as a dedicated trinity rumor', () => {
    const rumors = buildSectRumors([
      {
        id: 'evt_legacy_trinity',
        type: 'item_crafted',
        message: '炼器坊铸成了归墟镇界袍',
        data: {
          isLegacyCraft: true,
          legacyDungeonId: 'guixuRift',
          legacyRecipeId: 'forge_guixu_armor',
        },
      },
    ])

    expect(rumors.some((rumor) => rumor.title === '第三遗器落成')).toBe(true)
  })
})
