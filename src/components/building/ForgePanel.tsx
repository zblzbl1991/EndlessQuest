import { useMemo, useState } from 'react'
import { useSectStore } from '../../stores/sectStore'
import { FORGE_RECIPES, canForge } from '../../systems/economy/ForgeSystem'
import { getForgeBuff } from '../../systems/economy/BuildingEffects'
import { getArchiveMilestoneDef } from '../../data/archiveMilestones'
import { PixelIcon } from '../common/PixelIcon'
import { CHAR_QUALITY_NAMES } from '../../data/uiCopy'
import styles from './ForgePanel.module.css'

function getQualityClass(quality: string): string {
  if (quality === 'chaos') return styles.recipeQualityChaos
  if (quality === 'divine') return styles.recipeQualityDivine
  if (quality === 'immortal') return styles.recipeQualityImmortal
  if (quality === 'spirit') return styles.recipeQualitySpirit
  return ''
}

function countVaultItemByName(
  vault: ReturnType<typeof useSectStore.getState>['sect']['vault'],
  itemName: string
): number {
  return vault.reduce((sum, stack) => {
    if (stack.item.name === itemName) return sum + stack.quantity
    return sum
  }, 0)
}

export default function ForgePanel() {
  const sect = useSectStore((s) => s.sect)
  const forgeEquipment = useSectStore((s) => s.forgeEquipment)
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null)

  const forgeLevel = sect.buildings.find((b) => b.type === 'forge')?.level ?? 0
  const forgeBuff = getForgeBuff(forgeLevel)
  const availableRecipes = FORGE_RECIPES.filter((r) => r.minForgeLevel <= forgeLevel)
  const unlockedMilestoneIds = useMemo(
    () => sect.archiveMilestones.map((milestone) => milestone.id),
    [sect.archiveMilestones]
  )

  const materialCounts = useMemo(
    () =>
      sect.vault.reduce<Record<string, number>>((acc, stack) => {
        acc[stack.item.name] = (acc[stack.item.name] ?? 0) + stack.quantity
        return acc
      }, {}),
    [sect.vault]
  )

  const handleForge = (recipeId: string) => {
    const result = forgeEquipment(recipeId)
    if (result.success) {
      setMessage({ success: true, text: '锻造成功，装备已存入仓库。' })
    } else {
      setMessage({ success: false, text: result.reason })
    }
    setTimeout(() => setMessage(null), 2000)
  }

  return (
    <div className={styles.buildingPanel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>
          <PixelIcon name="forgeWorkshop" size={20} className={styles.panelIcon} aria-label="炼器坊" />
          炼器坊 Lv{forgeLevel}
        </span>
        <span className={styles.resourceDisplay}>
          矿石 {sect.resources.ore} · 灵石 {sect.resources.spiritStone}
        </span>
      </div>

      {availableRecipes.map((recipe) => {
        const affordable = canForge(
          recipe,
          { ore: sect.resources.ore, spiritStone: sect.resources.spiritStone },
          forgeLevel,
          materialCounts,
          unlockedMilestoneIds
        )
        const effectiveRate = Math.min(1, recipe.successRate + forgeBuff.successBonus)
        const lockedByMilestone = Boolean(
          recipe.requiredMilestone && !unlockedMilestoneIds.includes(recipe.requiredMilestone)
        )
        return (
          <div key={recipe.id} className={`${styles.recipeCard} ${recipe.legacy ? styles.recipeCardLegacy : ''}`}>
            <div className={styles.recipeHeader}>
              <span className={styles.recipeName}>
                <PixelIcon name="typeEquipment" size={18} className={styles.recipeIcon} aria-label={recipe.name} />
                {recipe.name}
              </span>
              <div className={styles.recipeHeaderTags}>
                {recipe.legacy ? <span className={styles.recipeLegacyBadge}>遗产锻造</span> : null}
                <span className={`${styles.recipeQuality} ${getQualityClass(recipe.quality)}`}>
                  {CHAR_QUALITY_NAMES[recipe.quality as keyof typeof CHAR_QUALITY_NAMES] || recipe.quality}
                </span>
              </div>
            </div>

            {recipe.description ? <div className={styles.recipeDesc}>{recipe.description}</div> : null}
            {lockedByMilestone ? (
              <div className={styles.recipeDesc}>
                需先达成里程碑：{getArchiveMilestoneDef(recipe.requiredMilestone!).title}
              </div>
            ) : null}

            <div className={styles.recipeCost}>
              <span className={styles.costItem}>矿石 {recipe.cost.ore}</span>
              <span className={styles.costItem}>灵石 {recipe.cost.spiritStone}</span>
            </div>

            {recipe.materialCosts?.length ? (
              <div className={styles.recipeMaterialList}>
                {recipe.materialCosts.map((material) => {
                  const owned = countVaultItemByName(sect.vault, material.itemName)
                  return (
                    <span
                      key={`${recipe.id}_${material.itemName}`}
                      className={`${styles.materialCost} ${owned >= material.quantity ? styles.materialReady : styles.materialMissing}`}
                    >
                      {material.itemName} {owned}/{material.quantity}
                    </span>
                  )
                })}
              </div>
            ) : null}

            <div className={styles.successRate}>
              成功率 {Math.round(effectiveRate * 100)}%
              {forgeBuff.successBonus > 0 && (
                <span className={styles.successRateWithBuff}>
                  {' '}
                  (基础 {Math.round(recipe.successRate * 100)}% + 炼器加成 {Math.round(forgeBuff.successBonus * 100)}%)
                </span>
              )}
            </div>
            <button
              className={`${styles.forgeBtn} ${affordable ? styles.forgeReady : styles.forgeDisabled}`}
              onClick={() => handleForge(recipe.id)}
              disabled={!affordable}
            >
              锻造
            </button>
          </div>
        )
      })}

      {availableRecipes.length === 0 && <div className={styles.empty}>暂无可用配方</div>}

      {message && <div className={message.success ? 'globalMessageSuccess' : 'globalMessageFail'}>{message.text}</div>}
    </div>
  )
}
