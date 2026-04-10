import { useSectStore } from '../../stores/sectStore'
import { ENEMY_TEMPLATES, type EnemyTemplate } from '../../data/enemies'
import { DUNGEON_ENEMY_MAP } from '../../data/enemies'
import type { MonsterCodexState } from '../../types/sect'
import { PixelIcon } from '../common/PixelIcon'
import styles from './CodexPanel.module.css'

const ELEMENT_LABELS: Record<string, string> = {
  neutral: '无',
  metal: '金',
  wood: '木',
  water: '水',
  fire: '火',
  earth: '土',
}

function getStatusLabel(state: MonsterCodexState | undefined): string {
  if (state === 'killed') return '已击杀'
  if (state === 'encountered') return '已遭遇'
  return '???'
}

function getEnemyIconName(enemy: EnemyTemplate): string {
  if (enemy.isBoss) return 'bossCleared'
  if (enemy.element === 'fire') return 'fireElement'
  if (enemy.element === 'water') return 'waterElement'
  if (enemy.element === 'metal') return 'metalElement'
  return 'combatVictory'
}

export default function MonsterCodexPanel() {
  const monsterCodex = useSectStore((s) => s.sect.monsterCodex)

  const totalEnemies = ENEMY_TEMPLATES.length
  const discoveredCount = Object.keys(monsterCodex).length
  const killedCount = Object.values(monsterCodex).filter((s) => s === 'killed').length

  // Group enemies by dungeon
  const dungeonGroups: Array<{ name: string; enemies: EnemyTemplate[] }> = []
  const assignedIds = new Set<string>()

  for (const [dungeonId, mapping] of Object.entries(DUNGEON_ENEMY_MAP)) {
    const enemyIds = [...mapping.regular, mapping.boss]
    const enemies = enemyIds
      .map((id) => ENEMY_TEMPLATES.find((e) => e.id === id))
      .filter((e): e is EnemyTemplate => e !== undefined)
    for (const id of enemyIds) assignedIds.add(id)

    // Find dungeon name from its first enemy's naming convention
    const dungeonName = (() => {
      const nameMap: Record<string, string> = {
        lingCaoValley: '灵草谷',
        biQuanStream: '碧泉溪',
        luoYunCave: '落云洞',
        anYaForest: '暗鸦林',
        bloodDemonAbyss: '血魔渊',
        hanBingCave: '寒冰石窟',
        dragonBoneWasteland: '龙骨荒原',
        shiHunSwamp: '噬魂沼泽',
        nineNetherPurgatory: '九幽炼狱',
        wanYaoPalace: '万妖殿',
        heavenlyTribulationRealm: '天劫秘境',
      }
      return nameMap[dungeonId] ?? dungeonId
    })()

    dungeonGroups.push({ name: dungeonName, enemies })
  }

  // Add legacy enemies not assigned to any dungeon
  const legacyEnemies = ENEMY_TEMPLATES.filter((e) => !assignedIds.has(e.id))
  if (legacyEnemies.length > 0) {
    dungeonGroups.unshift({ name: '其他', enemies: legacyEnemies })
  }

  return (
    <div className={styles.codex}>
      <div className={styles.header}>
        <PixelIcon name="combatVictory" size={20} className={styles.headerIcon} aria-label="Monster Codex" />
        怪物图鉴
      </div>
      <div className={styles.stats}>
        已发现 {discoveredCount} / {totalEnemies} 种怪物，已击杀 {killedCount} 种
      </div>
      <div className={styles.familyRow}>
        <div className={styles.familyChip}>
          <span>已击杀</span>
          <strong>{killedCount}</strong>
        </div>
        <div className={styles.familyChip}>
          <span>仅遭遇</span>
          <strong>{discoveredCount - killedCount}</strong>
        </div>
        <div className={styles.familyChip}>
          <span>未发现</span>
          <strong>{totalEnemies - discoveredCount}</strong>
        </div>
      </div>
      {dungeonGroups.map((group) => (
        <div key={group.name}>
          <div className={styles.cardDesc} style={{ margin: '8px 0 4px', fontWeight: 600, fontSize: 13 }}>
            {group.name}
          </div>
          <div className={styles.grid}>
            {group.enemies.map((enemy) => {
              const state = monsterCodex[enemy.id]
              const discovered = !!state
              const killed = state === 'killed'
              return (
                <div
                  key={enemy.id}
                  className={`${styles.card} ${!discovered ? styles.locked : ''} ${killed ? styles.unlocked : ''}`}
                >
                  <div className={styles.cardName}>
                    <PixelIcon
                      name={getEnemyIconName(enemy)}
                      size={18}
                      className={styles.cardIcon}
                      aria-label={discovered ? enemy.name : 'Unknown monster'}
                    />
                    {discovered ? enemy.name : '???'}
                  </div>
                  <div className={styles.cardTier}>
                    {enemy.isBoss ? 'Boss' : '普通'} · {getStatusLabel(state)}
                  </div>
                  {discovered && (
                    <>
                      <div className={styles.tagRow}>
                        <span className={styles.cardTag}>{ELEMENT_LABELS[enemy.element] ?? enemy.element}</span>
                        {enemy.isBoss && <span className={styles.cardTag}>Boss</span>}
                      </div>
                      {killed && (
                        <div className={styles.cardStats}>
                          <span>HP {enemy.stats.hp}</span>
                          <span>ATK {enemy.stats.atk}</span>
                          <span>DEF {enemy.stats.def}</span>
                          <span>SPD {enemy.stats.spd}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
