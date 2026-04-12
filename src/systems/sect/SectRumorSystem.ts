import { EVENT_CATEGORY_NAMES, EVENT_RARITY_NAMES } from '../../data/randomEvents'
import { getLegacyEventMarker } from '../../data/legacyFlavor'

export interface SectRumorInput {
  id: string
  type: string
  message: string
  data?: Record<string, unknown>
}

export interface SectRumorItem {
  id: string
  title: string
  detail: string
  tone: 'accent' | 'good' | 'warn'
}

export function buildSectRumors(events: SectRumorInput[], limit = 4): SectRumorItem[] {
  const rumors: SectRumorItem[] = []
  const randomEventGroups = new Map<string, SectRumorInput[]>()

  for (const event of events) {
    if (event.type === 'random_event') {
      const category = String(event.data?.category ?? 'sect_event')
      const bucket = randomEventGroups.get(category) ?? []
      bucket.push(event)
      randomEventGroups.set(category, bucket)
    }
  }

  for (const [category, groupedEvents] of randomEventGroups) {
    const latest = groupedEvents[0]
    const rarity = String(latest.data?.rarity ?? 'common') as keyof typeof EVENT_RARITY_NAMES
    rumors.push({
      id: `rumor_${category}`,
      title: `${EVENT_CATEGORY_NAMES[category] ?? '山门异动'} 路 ${EVENT_RARITY_NAMES[rarity] ?? '凡品'}`,
      detail:
        groupedEvents.length > 1
          ? `${latest.message} 近来已连续传来 ${groupedEvents.length} 条相关风闻。`
          : latest.message,
      tone: category === 'disaster' ? 'warn' : category === 'fortunate_encounter' ? 'good' : 'accent',
    })
  }

  const latestFailure = events.find((event) => event.type.includes('fail'))
  if (latestFailure) {
    const legacyMarker = getLegacyEventMarker(latestFailure.data)
    rumors.push({
      id: `rumor_fail_${latestFailure.id}`,
      title: '宗务受挫',
      detail: legacyMarker ? `${legacyMarker} 路 ${latestFailure.message}` : latestFailure.message,
      tone: 'warn',
    })
  }

  const latestMilestone = events.find(
    (event) =>
      event.type === 'milestone' || event.type === 'breakthrough_success' || event.type === 'technique_unlocked'
  )
  if (latestMilestone) {
    const legacyMarker = getLegacyEventMarker(latestMilestone.data)
    const isLegacyTrinity = latestMilestone.data?.legacyRecipeId === 'forge_guixu_armor'
    rumors.push({
      id: `rumor_gain_${latestMilestone.id}`,
      title: isLegacyTrinity ? '三遗齐鸣' : '宗门新进展',
      detail: legacyMarker ? `${legacyMarker} 路 ${latestMilestone.message}` : latestMilestone.message,
      tone: 'good',
    })
  }

  const latestRecruit = events.find((event) => event.type === 'recruit' || event.type === 'item_crafted')
  if (latestRecruit) {
    if (latestRecruit.type === 'item_crafted' && latestRecruit.data?.isLegacyCraft) {
      const legacyMarker = getLegacyEventMarker(latestRecruit.data)
      const isLegacyTrinity = latestRecruit.data?.legacyRecipeId === 'forge_guixu_armor'
      rumors.push({
        id: `rumor_legacy_craft_${latestRecruit.id}`,
        title: isLegacyTrinity ? '第三遗器落成' : '遗器初成',
        detail: legacyMarker ? `${legacyMarker} 路 ${latestRecruit.message}` : latestRecruit.message,
        tone: 'good',
      })
    } else {
      rumors.push({
        id: `rumor_daily_${latestRecruit.id}`,
        title: '山门日常',
        detail: latestRecruit.message,
        tone: 'accent',
      })
    }
  }

  const latestAdjustment = events.find((event) => event.type === 'automation_adjusted')
  if (latestAdjustment) {
    rumors.push({
      id: `rumor_adjustment_${latestAdjustment.id}`,
      title: '远征已调参',
      detail: latestAdjustment.message,
      tone: 'accent',
    })
  }

  const deduped = rumors.filter((rumor, index) => rumors.findIndex((item) => item.id === rumor.id) === index)
  return deduped.slice(0, limit)
}
