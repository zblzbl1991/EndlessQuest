import { useState } from 'react'
import { useSectStore } from '../../stores/sectStore'
import { FORGE_RECIPES, canForge } from '../../systems/economy/ForgeSystem'
import { getForgeBuff } from '../../systems/economy/BuildingEffects'
import styles from './ForgePanel.module.css'

const QUALITY_LABELS: Record<string, string> = {
  common: '凡品',
  spirit: '灵品',
  immortal: '仙品',
  divine: '神品',
}

function getQualityClass(quality: string): string {
  if (quality === 'divine') return styles.recipeQualityDivine
  if (quality === 'immortal') return styles.recipeQualityImmortal
  if (quality === 'spirit') return styles.recipeQualitySpirit
  return ''
}

export default function ForgePanel() {
  const sect = useSectStore((s) => s.sect)
  const forgeEquipment = useSectStore((s) => s.forgeEquipment)
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null)

  const forgeLevel = sect.buildings.find(b => b.type === 'forge')?.level ?? 0
  const forgeBuff = getForgeBuff(forgeLevel)
  const availableRecipes = FORGE_RECIPES.filter(r => r.minForgeLevel <= forgeLevel)

  const handleForge = (recipeId: string) => {
    const result = forgeEquipment(recipeId)
    if (result.success) {
      setMessage({ success: true, text: '锻造成功，装备已存入仓库' })
    } else {
      setMessage({ success: false, text: result.reason })
    }
    setTimeout(() => setMessage(null), 2000)
  }

  return (
    <div className={styles.buildingPanel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>炼器坊 Lv{forgeLevel}</span>
        <span className={styles.resourceDisplay}>
          矿石 {sect.resources.ore} · 灵石 {sect.resources.spiritStone}
        </span>
      </div>

      {availableRecipes.map(recipe => {
        const affordable = canForge(recipe, { ore: sect.resources.ore, spiritStone: sect.resources.spiritStone }, forgeLevel)
        const effectiveRate = Math.min(1, recipe.successRate + forgeBuff.successBonus)
        return (
          <div key={recipe.id} className={styles.recipeCard}>
            <div className={styles.recipeHeader}>
              <span className={styles.recipeName}>{recipe.name}</span>
              <span className={`${styles.recipeQuality} ${getQualityClass(recipe.quality)}`}>
                {QUALITY_LABELS[recipe.quality] || recipe.quality}
              </span>
            </div>
            <div className={styles.recipeCost}>
              <span className={styles.costItem}>矿石 {recipe.cost.ore}</span>
              <span className={styles.costItem}>灵石 {recipe.cost.spiritStone}</span>
            </div>
            <div className={styles.successRate}>
              成功率: {Math.round(effectiveRate * 100)}%
              {forgeBuff.successBonus > 0 && (
                <span className={styles.successRateWithBuff}>
                  {' '}(基础 {Math.round(recipe.successRate * 100)}% + 炼器加成 {Math.round(forgeBuff.successBonus * 100)}%)
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

      {availableRecipes.length === 0 && (
        <div className={styles.empty}>暂无可用配方</div>
      )}

      {message && (
        <div className={message.success ? 'globalMessageSuccess' : 'globalMessageFail'}>
          {message.text}
        </div>
      )}
    </div>
  )
}
