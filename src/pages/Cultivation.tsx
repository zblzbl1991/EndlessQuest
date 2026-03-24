import { useState } from 'react'
import BreakthroughPanel from '../components/cultivation/BreakthroughPanel'
import { usePlayerStore } from '../stores/playerStore'
import { useInventoryStore } from '../stores/inventoryStore'
import { calcCultivationRate, calcSpiritCostPerSecond } from '../systems/cultivation/CultivationEngine'
import { getCultivationNeeded, getRealmName } from '../data/realms'
import { TECHNIQUES, getTechniqueById } from '../data/techniques'
import { ACTIVE_SKILLS, getActiveSkillById } from '../data/activeSkills'
import { TECHNIQUE_TYPE_NAMES, ELEMENT_NAMES, TECHNIQUE_TIER_NAMES } from '../data/skills'
import type { TechniqueType } from '../types/skill'
import ProgressBar from '../components/common/ProgressBar'
import styles from './Cultivation.module.css'

type Tab = 'cultivate' | 'techniques' | 'skills'

const TECHNIQUE_SLOT_TYPES: TechniqueType[] = ['mental', 'body', 'spiritual']

const SKILL_SLOT_LABELS = ['主动技能 1', '主动技能 2', '主动技能 3', '主动技能 4', '终极技能']

function formatStatBonus(bonus: Record<string, number>): string[] {
  const nameMap: Record<string, string> = {
    hp: 'HP', atk: 'ATK', def: 'DEF', spd: 'SPD',
    crit: '暴击', critDmg: '暴伤',
    spiritPower: '灵力', comprehension: '悟性',
    spiritualRoot: '灵根', fortune: '气运',
  }
  return Object.entries(bonus)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${nameMap[k] ?? k}+${v}`)
}

function CultivationTab() {
  const player = usePlayerStore((s) => s.player)
  const resources = useInventoryStore((s) => s.resources)
  const cultivationRate = calcCultivationRate(player)
  const spiritCost = calcSpiritCostPerSecond()
  const needed = getCultivationNeeded(player.realm, player.realmStage)
  const realmName = getRealmName(player.realm, player.realmStage)
  const isCultivating = resources.spiritEnergy >= spiritCost

  return (
    <div className={styles.page}>
      {/* Realm Card */}
      <div className={styles.realmCard}>
        <div className={styles.realmName}>{realmName}</div>
        <div className={styles.progressSection}>
          <div className={styles.progressLabel}>
            <span>修为进度</span>
            <span>{Math.floor(player.cultivation)} / {needed.toLocaleString()}</span>
          </div>
          <ProgressBar value={player.cultivation} max={needed} variant="ink" />
        </div>
        {isCultivating && (
          <div className={styles.statusBadge}>
            <span className={styles.statusDot} />
            修炼中
          </div>
        )}
      </div>

      {/* Stats */}
      <div className={styles.infoCard}>
        <div className={styles.sectionTitle}>角色属性</div>
        <div className={styles.statsGrid}>
          <div className={styles.statBox}>
            <div className={styles.statName}>HP</div>
            <div className={styles.statNum}>{player.baseStats.hp}</div>
          </div>
          <div className={styles.statBox}>
            <div className={styles.statName}>ATK</div>
            <div className={styles.statNum}>{player.baseStats.atk}</div>
          </div>
          <div className={styles.statBox}>
            <div className={styles.statName}>DEF</div>
            <div className={styles.statNum}>{player.baseStats.def}</div>
          </div>
          <div className={styles.statBox}>
            <div className={styles.statName}>SPD</div>
            <div className={styles.statNum}>{player.baseStats.spd}</div>
          </div>
        </div>
      </div>

      {/* Cultivation Info */}
      <div className={styles.infoCard}>
        <div className={styles.sectionTitle}>修炼信息</div>
        <div className={styles.infoRow}>
          <span>修炼速度</span>
          <span className={styles.infoValue}>{cultivationRate.toFixed(1)} 修为/s</span>
        </div>
        <div className={styles.infoRow}>
          <span>灵力消耗</span>
          <span className={styles.infoValue}>{spiritCost} 灵气/s</span>
        </div>
        <div className={styles.infoRow}>
          <span>当前灵力</span>
          <span className={styles.infoValue}>{Math.floor(resources.spiritEnergy)}</span>
        </div>
        <div className={styles.infoRow}>
          <span>灵根</span>
          <span className={styles.infoValue}>{player.cultivationStats.spiritualRoot}</span>
        </div>
        <div className={styles.infoRow}>
          <span>悟性</span>
          <span className={styles.infoValue}>{player.cultivationStats.comprehension}</span>
        </div>
        <div className={styles.infoRow}>
          <span>气运</span>
          <span className={styles.infoValue}>{player.cultivationStats.fortune}</span>
        </div>
      </div>

      {/* Breakthrough */}
      <BreakthroughPanel />
    </div>
  )
}

function TechniquesTab() {
  const player = usePlayerStore((s) => s.player)
  const equipTechnique = usePlayerStore((s) => s.equipTechnique)

  const isEquipped = (techId: string) => player.equippedTechniques.includes(techId)

  return (
    <div className={styles.page}>
      {/* Equipped technique slots */}
      <div className={styles.infoCard}>
        <div className={styles.sectionTitle}>已装备功法</div>
        <div className={styles.slotGrid}>
          {TECHNIQUE_SLOT_TYPES.map((slotType, idx) => {
            const techId = player.equippedTechniques[idx]
            const tech = techId ? getTechniqueById(techId) : null
            return (
              <div key={slotType} className={styles.slotCard}>
                <div className={styles.slotHeader}>
                  <span className={styles.slotLabel}>{TECHNIQUE_TYPE_NAMES[slotType]}</span>
                  {tech && <span className={styles.slotTier}>{TECHNIQUE_TIER_NAMES[tech.tier - 1] ?? ''}</span>}
                </div>
                {tech ? (
                  <>
                    <div className={styles.slotName}>{tech.name}</div>
                    <div className={styles.slotDesc}>{tech.description}</div>
                    <div className={styles.slotBonuses}>
                      {formatStatBonus(tech.statBonus as Record<string, number>).map((b) => (
                        <span key={b} className={styles.bonusTag}>{b}</span>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className={styles.slotEmpty}>空位 — 未装备功法</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Available techniques */}
      <div className={styles.infoCard}>
        <div className={styles.sectionTitle}>可学功法</div>
        <div className={styles.techniqueList}>
          {TECHNIQUES.map((tech) => {
            const equipped = isEquipped(tech.id)
            return (
              <div key={tech.id} className={styles.techniqueCard}>
                <div className={styles.techniqueCardHeader}>
                  <div>
                    <div className={styles.slotName}>{tech.name}</div>
                    <div className={styles.slotDesc}>{tech.description}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span className={styles.techniqueTypeName}>{TECHNIQUE_TYPE_NAMES[tech.type]} · {TECHNIQUE_TIER_NAMES[tech.tier - 1] ?? ''}</span>
                    {equipped
                      ? <span className={styles.equippedBadge}>已装备</span>
                      : <button
                          className={styles.equipBtn}
                          onClick={() => equipTechnique(tech.id, tech.type)}
                        >
                          修炼
                        </button>
                    }
                  </div>
                </div>
                <div className={styles.slotBonuses}>
                  {formatStatBonus(tech.statBonus as Record<string, number>).map((b) => (
                    <span key={b} className={styles.bonusTag}>{b}</span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function SkillsTab() {
  const player = usePlayerStore((s) => s.player)
  const equipSkill = usePlayerStore((s) => s.equipSkill)

  const isEquipped = (skillId: string) => player.equippedSkills.includes(skillId)

  return (
    <div className={styles.page}>
      {/* Equipped skill slots */}
      <div className={styles.infoCard}>
        <div className={styles.sectionTitle}>已装备技能</div>
        <div className={styles.slotGrid}>
          {SKILL_SLOT_LABELS.map((label, idx) => {
            const skillId = player.equippedSkills[idx]
            const skill = skillId ? getActiveSkillById(skillId) : null
            return (
              <div key={label} className={styles.slotCard}>
                <div className={styles.slotHeader}>
                  <span className={styles.slotLabel}>{label}</span>
                  {skill && <span className={styles.slotTier}>T{skill.tier}</span>}
                </div>
                {skill ? (
                  <>
                    <div className={styles.slotName}>{skill.name}</div>
                    <div className={styles.slotDesc}>{skill.description}</div>
                    <div className={styles.slotBonuses}>
                      <span className={styles.bonusTag}>{ELEMENT_NAMES[skill.element] ?? skill.element}</span>
                      {skill.multiplier > 0 && <span className={styles.bonusTag}>倍率 x{skill.multiplier}</span>}
                      <span className={styles.bonusTag}>消耗 {skill.spiritCost}灵力</span>
                      {skill.cooldown > 0 && <span className={styles.bonusTag}>冷却 {skill.cooldown}回合</span>}
                    </div>
                  </>
                ) : (
                  <div className={styles.slotEmpty}>空位 — 未装备技能</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Available skills */}
      <div className={styles.infoCard}>
        <div className={styles.sectionTitle}>可学技能</div>
        <div className={styles.techniqueList}>
          {ACTIVE_SKILLS.map((skill) => {
            const equipped = isEquipped(skill.id)
            return (
              <div key={skill.id} className={styles.techniqueCard}>
                <div className={styles.techniqueCardHeader}>
                  <div>
                    <div className={styles.slotName}>{skill.name}</div>
                    <div className={styles.slotDesc}>{skill.description}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span className={styles.techniqueTypeName}>{ELEMENT_NAMES[skill.element] ?? skill.element} · T{skill.tier}</span>
                    {equipped
                      ? <span className={styles.equippedBadge}>已装备</span>
                      : <button
                          className={styles.equipBtn}
                          onClick={() => equipSkill(skill.id)}
                        >
                          修炼
                        </button>
                    }
                  </div>
                </div>
                <div className={styles.slotBonuses}>
                  {skill.multiplier > 0 && <span className={styles.bonusTag}>倍率 x{skill.multiplier}</span>}
                  <span className={styles.bonusTag}>消耗 {skill.spiritCost}灵力</span>
                  {skill.cooldown > 0 && <span className={styles.bonusTag}>冷却 {skill.cooldown}回合</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function Cultivation() {
  const [activeTab, setActiveTab] = useState<Tab>('cultivate')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'cultivate', label: '修炼' },
    { key: 'techniques', label: '功法' },
    { key: 'skills', label: '技能' },
  ]

  return (
    <div className="page-content">
      <div className={styles.tabBar}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === 'cultivate' && <CultivationTab />}
      {activeTab === 'techniques' && <TechniquesTab />}
      {activeTab === 'skills' && <SkillsTab />}
    </div>
  )
}
