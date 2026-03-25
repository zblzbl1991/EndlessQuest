import { useState } from 'react'
import { useSectStore } from '../../stores/sectStore'
import { ALCHEMY_RECIPES, canCraft } from '../../systems/economy/AlchemySystem'
import styles from './AlchemyPanel.module.css'

const QUALITY_LABELS: Record<string, string> = {
  common: '凡品',
  spirit: '灵品',
  immortal: '仙品',
}

function getQualityClass(quality: string): string {
  if (quality === 'immortal') return styles.recipeQualityImmortal
  if (quality === 'spirit') return styles.recipeQualitySpirit
  return ''
}

export default function AlchemyPanel() {
  const sect = useSectStore((s) => s.sect)
  const craftPotion = useSectStore((s) => s.craftPotion)
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null)

  const furnaceLevel = sect.buildings.find(b => b.type === 'alchemyFurnace')?.level ?? 0
  const availableRecipes = ALCHEMY_RECIPES.filter(r => r.minFurnaceLevel <= furnaceLevel)

  const handleCraft = (recipeId: string) => {
    const result = craftPotion(recipeId)
    if (result.success) {
      setMessage({ success: true, text: '炼制成功，丹药已存入仓库' })
    } else {
      setMessage({ success: false, text: result.reason })
    }
    setTimeout(() => setMessage(null), 2000)
  }

  return (
    <div className={styles.buildingPanel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>丹炉 Lv{furnaceLevel}</span>
        <span className={styles.resourceDisplay}>
          灵草 {sect.resources.herb} · 灵石 {sect.resources.spiritStone}
        </span>
      </div>

      {availableRecipes.map(recipe => {
        const affordable = canCraft(recipe, { herb: sect.resources.herb, spiritStone: sect.resources.spiritStone }, furnaceLevel)
        return (
          <div key={recipe.id} className={styles.recipeCard}>
            <div className={styles.recipeHeader}>
              <span className={styles.recipeName}>{recipe.name}</span>
              <span className={`${styles.recipeQuality} ${getQualityClass(recipe.product.quality)}`}>
                {QUALITY_LABELS[recipe.product.quality] || recipe.product.quality}
              </span>
            </div>
            <div className={styles.recipeDesc}>{recipe.description}</div>
            <div className={styles.recipeCost}>
              <span className={styles.costItem}>
                灵草 {recipe.cost.herb}
              </span>
              {recipe.cost.spiritStone && (
                <span className={styles.costItem}>
                  灵石 {recipe.cost.spiritStone}
                </span>
              )}
            </div>
            <button
              className={`${styles.craftBtn} ${affordable ? styles.craftReady : styles.craftDisabled}`}
              onClick={() => handleCraft(recipe.id)}
              disabled={!affordable}
            >
              炼制
            </button>
          </div>
        )
      })}

      {availableRecipes.length === 0 && (
        <div className={styles.empty}>暂无可用丹方</div>
      )}

      {message && (
        <div className={message.success ? 'globalMessageSuccess' : 'globalMessageFail'}>
          {message.text}
        </div>
      )}
    </div>
  )
}
