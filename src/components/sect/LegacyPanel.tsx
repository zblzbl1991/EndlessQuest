import { useState } from 'react'
import { useSectStore } from '../../stores/sectStore'
import { canAscend } from '../../systems/sect/LegacySystem'
import { BUILDING_DEFS } from '../../data/buildings'
import {
  LEGACY_PERKS,
  LEGACY_REWARD_TIERS,
  getLegacyBonus,
  getLegacyTemplateCapacity,
  getUnlockedLegacyPerks,
} from '../../data/legacy'
import { getLegacyDungeonName, getLegacyTechniqueName } from '../../data/legacyUnlocks'
import { PixelIcon } from '../common/PixelIcon'
import styles from './LegacyPanel.module.css'

export default function LegacyPanel() {
  const sect = useSectStore((s) => s.sect)
  const performAscension = useSectStore((s) => s.performAscension)
  const [showConfirm, setShowConfirm] = useState(false)

  const { legacy } = sect
  const check = canAscend(sect)
  const nextCount = legacy.ascensionCount + 1
  const nextBonus = getLegacyBonus(nextCount)
  const currentPerks = getUnlockedLegacyPerks(legacy.ascensionCount)
  const nextTier = LEGACY_REWARD_TIERS.find((tier) => tier.ascensionCount > legacy.ascensionCount)
  const nextPerk = LEGACY_PERKS.find((perk) => perk.ascensionCount > legacy.ascensionCount)
  const unlockedTechniqueNames = legacy.unlockedTechniques.map((item) => getLegacyTechniqueName(item))
  const unlockedDungeonNames = legacy.unlockedDungeons.map((item) => getLegacyDungeonName(item))

  return (
    <div className={styles.container}>
      <div className={styles.title}>
        <PixelIcon name="eventAncientCave" size={18} className={styles.inlineIcon} aria-label="传承飞升" />
        传承飞升
      </div>

      <div className={styles.statusCard}>
        <div className={styles.ascensionCount}>
          <span className={styles.countLabel}>飞升次数</span>
          <span className={styles.countValue}>{legacy.ascensionCount}</span>
        </div>
        <div className={styles.bonusRow}>
          <span className={styles.bonusLabel}>全局加成</span>
          <span className={styles.bonusValue}>+{legacy.statBonus}%</span>
        </div>
        <div className={styles.bonusRow}>
          <span className={styles.bonusLabel}>模板位</span>
          <span className={styles.bonusValue}>{getLegacyTemplateCapacity(legacy.ascensionCount)} 个</span>
        </div>
        {legacy.unlockedTechniques.length > 0 && (
          <div className={styles.bonusRow}>
            <span className={styles.bonusLabel}>隐藏功法</span>
            <span className={styles.bonusValue}>{legacy.unlockedTechniques.length} 个</span>
          </div>
        )}
        {legacy.unlockedDungeons.length > 0 && (
          <div className={styles.bonusRow}>
            <span className={styles.bonusLabel}>隐藏秘境</span>
            <span className={styles.bonusValue}>{legacy.unlockedDungeons.length} 个</span>
          </div>
        )}

        {unlockedTechniqueNames.length > 0 && (
          <div className={styles.rewardExtra}>Legacy Manuals: {unlockedTechniqueNames.join(', ')}</div>
        )}
        {unlockedDungeonNames.length > 0 && (
          <div className={styles.rewardExtra}>Legacy Realms: {unlockedDungeonNames.join(', ')}</div>
        )}
        {currentPerks.length > 0 && (
          <div className={styles.perkList}>
            {currentPerks.map((perk) => (
              <div key={perk.id} className={styles.perkItem}>
                <span className={styles.perkName}>{perk.name}</span>
                <span className={styles.perkDesc}>{perk.description}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.sectionLabel}>
        <PixelIcon name="realmGoldenCore" size={14} className={styles.inlineIcon} aria-label="飞升条件" />
        飞升条件
      </div>
      <div className={styles.checklist}>
        <CheckItem label="至少 1 名弟子达到化神期" met={sect.characters.some((character) => character.realm >= 4)} />
        <CheckItem
          label="所有建筑达到 5 级"
          met={sect.buildings.every((building) => building.level >= 5)}
          detail={sect.buildings
            .filter((building) => building.level < 5)
            .map((building) => {
              const def = BUILDING_DEFS.find((item) => item.type === building.type)
              return `${def?.name ?? building.type} Lv${building.level}`
            })
            .join('、')}
        />
      </div>

      {nextTier && (
        <>
          <div className={styles.sectionLabel}>
            <PixelIcon name="eventAncientCave" size={14} className={styles.inlineIcon} aria-label="下次飞升奖励" />
            下次飞升奖励
          </div>
          <div className={styles.rewardPreview}>
            <div className={styles.rewardTier}>
              <span className={styles.tierCount}>第 {nextTier.ascensionCount} 次飞升</span>
              <span className={styles.tierStat}>属性加成 +{nextTier.statBonus}%</span>
              <span className={styles.tierDesc}>{nextTier.description}</span>
            </div>
            {nextPerk && (
              <div className={styles.rewardExtra}>
                新遗产权限: {nextPerk.name} · {nextPerk.description}
              </div>
            )}
            {nextBonus.unlockedTechniques.length > legacy.unlockedTechniques.length && (
              <div className={styles.rewardExtra}>
                解锁隐藏功法:{' '}
                {nextBonus.unlockedTechniques.filter((item) => !legacy.unlockedTechniques.includes(item)).join('、')}
              </div>
            )}
            {nextBonus.unlockedDungeons.length > legacy.unlockedDungeons.length && (
              <div className={styles.rewardExtra}>
                解锁隐藏秘境:{' '}
                {nextBonus.unlockedDungeons.filter((item) => !legacy.unlockedDungeons.includes(item)).join('、')}
              </div>
            )}
          </div>
        </>
      )}

      <button className={styles.ascendBtn} disabled={!check.canAscend} onClick={() => setShowConfirm(true)}>
        飞升
      </button>

      {showConfirm && (
        <div className={styles.overlay} onClick={() => setShowConfirm(false)}>
          <div className={styles.dialog} onClick={(event) => event.stopPropagation()}>
            <div className={styles.dialogTitle}>确认飞升</div>
            <div className={styles.dialogBody}>
              <p>飞升会重置弟子、建筑、资源、仓库与当前宗门路线，但会保留传承、累计统计和解锁的飞升遗产。</p>
              <p>下次轮回会继承以下变化:</p>
              <ul>
                <li>属性加成提升到 +{nextBonus.statBonus}%</li>
                <li>远征模板位提升到 {getLegacyTemplateCapacity(nextCount)} 个</li>
                {nextPerk && (
                  <li>
                    {nextPerk.name}: {nextPerk.description}
                  </li>
                )}
                {nextCount === 1 && <li>初始灵石翻倍到 1000</li>}
              </ul>
            </div>
            <div className={styles.dialogActions}>
              <button className={styles.cancelBtn} onClick={() => setShowConfirm(false)}>
                取消
              </button>
              <button
                className={styles.confirmBtn}
                onClick={() => {
                  performAscension()
                  setShowConfirm(false)
                }}
              >
                确认飞升
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CheckItem({ label, met, detail }: { label: string; met: boolean; detail?: string }) {
  return (
    <div className={`${styles.checkItem} ${met ? styles.checkMet : styles.checkUnmet}`}>
      <span className={styles.checkDot}>
        <PixelIcon
          name={met ? 'eventAncientCave' : 'eventBoss'}
          size={12}
          className={styles.checkIcon}
          aria-label={met ? '达成' : '未达成'}
        />
      </span>
      <div className={styles.checkInfo}>
        <span className={styles.checkLabel}>{label}</span>
        {detail && !met && <span className={styles.checkDetail}>{detail}</span>}
      </div>
    </div>
  )
}
