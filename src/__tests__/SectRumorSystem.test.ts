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
    expect(rumors.some((rumor) => rumor.detail.includes('归墟道兵'))).toBe(true)
  })

  it('should surface the third relic as a dedicated trinity rumor', () => {
    const rumors = buildSectRumors([
      {
        id: 'evt_legacy_trinity',
        type: 'item_crafted',
        message: '炼器坊铸成了归墟镇界甲',
        data: {
          isLegacyCraft: true,
          legacyDungeonId: 'guixuRift',
          legacyRecipeId: 'forge_guixu_armor',
        },
      },
    ])

    expect(rumors.some((rumor) => rumor.title === '第三遗器落成')).toBe(true)
  })

  it('should surface template adjustment events as expedition tuning rumors', () => {
    const rumors = buildSectRumors([
      {
        id: 'evt_adjustment',
        type: 'automation_adjusted',
        message: '已按离线建议调整归墟回响：风险改为均衡。',
        data: {
          templateId: 'guixuResonance',
          source: 'offline_report',
        },
      },
    ])

    expect(rumors.some((rumor) => rumor.title === '远征已调参')).toBe(true)
    expect(rumors.some((rumor) => rumor.detail.includes('归墟回响'))).toBe(true)
  })

  // --- Phase 4 tests ---

  it('should surface campaign start events as dedicated rumors', () => {
    const rumors = buildSectRumors([
      {
        id: 'evt_campaign',
        type: 'campaign_started',
        message: '专项「远征专项」已启动：提前储备远征物资，提高下一次远征的整体表现。',
        data: {},
      },
    ])

    expect(rumors.some((rumor) => rumor.title === '专项启动')).toBe(true)
    expect(rumors.some((rumor) => rumor.detail.includes('远征专项'))).toBe(true)
  })

  it('should surface archetype shift events as dedicated rumors', () => {
    const rumors = buildSectRumors([
      {
        id: 'evt_archetype',
        type: 'archetype_shifted',
        message: '宗门路线转为「剑走偏锋」，进入磨合期。',
        data: {},
      },
    ])

    expect(rumors.some((rumor) => rumor.title === '路线转型')).toBe(true)
    expect(rumors.some((rumor) => rumor.detail.includes('剑走偏锋'))).toBe(true)
  })

  it('should surface high-risk success as a dedicated rumor', () => {
    const rumors = buildSectRumors([
      {
        id: 'evt_high_risk',
        type: 'adventure_complete',
        message: '远征成功，押注奇遇满载而归！',
        data: { riskTier: 'gamble' },
      },
    ])

    expect(rumors.some((rumor) => rumor.title === '押注成功')).toBe(true)
  })

  it('should surface route opportunity events as dedicated rumors', () => {
    const rumors = buildSectRumors([
      {
        id: 'evt_route_opp',
        type: 'route_opportunity',
        message: '新弟子的特质暗示了「剑走偏锋」路线。',
        data: {},
      },
    ])

    expect(rumors.some((rumor) => rumor.title === '路线契机')).toBe(true)
    expect(rumors.some((rumor) => rumor.detail.includes('剑走偏锋'))).toBe(true)
  })
})
