import { useSectStore } from '../../stores/sectStore'
import type { Equipment } from '../../types/item'
import { EQUIP_SLOTS, EQUIP_SLOT_NAMES } from '../../data/items'
import { PixelIcon } from '../common/PixelIcon'
import {
  getEquipmentRecommendationForCharacter,
  getEquipmentTendency,
  type EquipmentRecommendation,
} from '../../systems/equipment/EquipmentEngine'
import styles from './EquipPanel.module.css'

interface EquipPanelProps {
  characterId: string
  onItemClick: (item: Equipment) => void
  onSlotClick: (slotIndex: number) => void
}

const EMPTY_SLOT_FOCUS: Record<string, { label: string; reason: string }> = {
  head: { label: '防御', reason: '更适合补生存' },
  armor: { label: '防御', reason: '更适合补生存' },
  bracer: { label: '输出', reason: '更适合补伤害' },
  belt: { label: '生存', reason: '更适合补续航' },
  boots: { label: '速度', reason: '更适合补先手' },
  weapon: { label: '输出', reason: '更适合补爆发' },
  accessory1: { label: '均衡', reason: '更适合补短板' },
  accessory2: { label: '均衡', reason: '更适合补短板' },
  talisman: { label: '输出', reason: '更适合补术法' },
}

function getRecommendationClass(status: EquipmentRecommendation['status']): string {
  if (status === 'recommended') return styles.recommendGood
  if (status === 'notRecommended') return styles.recommendBad
  return styles.recommendNeutral
}

export default function EquipPanel({ characterId, onItemClick, onSlotClick }: EquipPanelProps) {
  const character = useSectStore((s) => s.sect.characters.find((c) => c.id === characterId))
  const unequipItem = useSectStore((s) => s.unequipItem)
  const sect = useSectStore((s) => s.sect)

  if (!character) return null

  const findEquipmentById = (id: string): Equipment | undefined => {
    for (const stack of sect.vault) {
      if (stack.item.id === id && stack.item.type === 'equipment') return stack.item as Equipment
    }
    for (const char of sect.characters) {
      for (const stack of char.backpack) {
        if (stack.item.id === id && stack.item.type === 'equipment') return stack.item as Equipment
      }
    }
    return undefined
  }

  return (
    <div className={styles.panel}>
      <div className={styles.title}>
        <PixelIcon name="typeEquipment" size={18} className={styles.inlineIcon} aria-label="装备面板" />
        装备面板
      </div>
      <div className={styles.summary}>
        <span className={styles.summaryLabel}>装备判断</span>
        <span className={styles.summaryValue}>按当前修行路线与专长自动提示推荐方向</span>
      </div>

      <div className={styles.slots}>
        {character.equippedGear.map((gearId, idx) => {
          const item = gearId ? findEquipmentById(gearId) : null
          const slotKey = EQUIP_SLOTS[idx] ?? ''
          const slotIcon =
            slotKey === 'head'
              ? 'equipHead'
              : slotKey === 'armor'
                ? 'equipArmor'
                : slotKey === 'bracer'
                  ? 'equipBracer'
                  : slotKey === 'belt'
                    ? 'equipBelt'
                    : slotKey === 'boots'
                      ? 'equipBoots'
                      : slotKey === 'weapon'
                        ? 'equipWeapon'
                        : slotKey === 'talisman'
                          ? 'equipTalisman'
                          : 'equipAccessory'
          const emptyHint = EMPTY_SLOT_FOCUS[slotKey] ?? { label: '均衡', reason: '通用过渡位' }
          const recommendation = item ? getEquipmentRecommendationForCharacter(character, item) : null
          const tendency = item ? getEquipmentTendency(item) : null

          return (
            <div key={idx} className={styles.slot} onClick={() => (item ? onItemClick(item) : onSlotClick(idx))}>
              <div className={styles.slotBody}>
                <span className={styles.slotName}>
                  <PixelIcon
                    name={slotIcon}
                    size={14}
                    className={styles.inlineIcon}
                    aria-label={EQUIP_SLOT_NAMES[slotKey]}
                  />
                  {EQUIP_SLOT_NAMES[slotKey]}
                </span>
                {item ? (
                  <>
                    <div className={styles.slotItemRow}>
                      <span className={styles.slotItem}>
                        {item.name}
                        {item.enhanceLevel > 0 ? ` +${item.enhanceLevel}` : ''}
                      </span>
                      <button
                        className={styles.unequipBtn}
                        onClick={(e) => {
                          e.stopPropagation()
                          unequipItem(characterId, idx)
                        }}
                      >
                        x
                      </button>
                    </div>
                    <div className={styles.slotMeta}>
                      <span className={`${styles.fitBadge} ${getRecommendationClass(recommendation!.status)}`}>
                        {recommendation!.label}
                      </span>
                      <span className={styles.slotHint}>{recommendation!.direction}</span>
                    </div>
                    <div className={styles.slotReason}>{recommendation!.summary}</div>
                    <div className={styles.slotFocus}>倾向: {tendency?.focus ?? '通用'}</div>
                  </>
                ) : (
                  <>
                    <span className={styles.slotEmpty}>空位</span>
                    <div className={styles.slotMeta}>
                      <span className={styles.emptyBadge}>优先 {emptyHint.label}</span>
                      <span className={styles.slotHint}>{emptyHint.reason}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
