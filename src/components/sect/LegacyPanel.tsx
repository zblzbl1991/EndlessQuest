import { useState } from 'react'
import { useSectStore } from '../../stores/sectStore'
import { canAscend } from '../../systems/sect/LegacySystem'
import { LEGACY_REWARD_TIERS, getLegacyBonus } from '../../data/legacy'
import { BUILDING_DEFS } from '../../data/buildings'
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

  // Find next tier the player hasn't reached
  const nextTier = LEGACY_REWARD_TIERS.find((t) => t.ascensionCount > legacy.ascensionCount)

  return (
    <div className={styles.container}>
      <div className={styles.title}>
        <PixelIcon name="eventAncientCave" size={18} className={styles.inlineIcon} aria-label="传承飞升" />
        传承飞升
      </div>

      {/* Current status */}
      <div className={styles.statusCard}>
        <div className={styles.ascensionCount}>
          <span className={styles.countLabel}>飞升次数</span>
          <span className={styles.countValue}>{legacy.ascensionCount}</span>
        </div>
        {legacy.statBonus > 0 && (
          <div className={styles.bonusRow}>
            <span className={styles.bonusLabel}>全局加成</span>
            <span className={styles.bonusValue}>+{legacy.statBonus}%</span>
          </div>
        )}
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
      </div>

      {/* Conditions checklist */}
      <div className={styles.sectionLabel}>
        <PixelIcon name="realmGoldenCore" size={14} className={styles.inlineIcon} aria-label="飞升条件" />
        飞升条件
      </div>
      <div className={styles.checklist}>
        <CheckItem label="至少 1 名弟子达到化神期" met={sect.characters.some((c) => c.realm >= 4)} />
        <CheckItem
          label="所有建筑达到 5 级"
          met={sect.buildings.every((b) => b.level >= 5)}
          detail={sect.buildings
            .filter((b) => b.level < 5)
            .map((b) => {
              const def = BUILDING_DEFS.find((d) => d.type === b.type)
              return `${def?.name ?? b.type} Lv${b.level}`
            })
            .join('、')}
        />
      </div>

      {/* Next reward preview */}
      {nextTier && (
        <>
          <div className={styles.sectionLabel}>
            <PixelIcon name="eventAncientCave" size={14} className={styles.inlineIcon} aria-label="下次飞升奖励预览" />
            下次飞升奖励预览
          </div>
          <div className={styles.rewardPreview}>
            <div className={styles.rewardTier}>
              <span className={styles.tierCount}>第 {nextTier.ascensionCount} 次飞升</span>
              <span className={styles.tierStat}>属性加成 +{nextTier.statBonus}%</span>
              <span className={styles.tierDesc}>{nextTier.description}</span>
            </div>
            {nextBonus.unlockedTechniques.length > legacy.unlockedTechniques.length && (
              <div className={styles.rewardExtra}>
                解锁隐藏功法:{' '}
                {nextBonus.unlockedTechniques.filter((t) => !legacy.unlockedTechniques.includes(t)).join(', ')}
              </div>
            )}
            {nextBonus.unlockedDungeons.length > legacy.unlockedDungeons.length && (
              <div className={styles.rewardExtra}>
                解锁隐藏秘境:{' '}
                {nextBonus.unlockedDungeons.filter((d) => !legacy.unlockedDungeons.includes(d)).join(', ')}
              </div>
            )}
          </div>
        </>
      )}

      {/* Ascension button */}
      <button className={styles.ascendBtn} disabled={!check.canAscend} onClick={() => setShowConfirm(true)}>
        飞升
      </button>

      {/* Confirmation dialog */}
      {showConfirm && (
        <div className={styles.overlay} onClick={() => setShowConfirm(false)}>
          <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <div className={styles.dialogTitle}>确认飞升</div>
            <div className={styles.dialogBody}>
              <p>飞升将重置以下内容：</p>
              <ul>
                <li>所有弟子和角色数据</li>
                <li>所有资源和建筑等级</li>
                <li>宗门路线和功法典籍</li>
                <li>仓库和灵宠</li>
              </ul>
              <p>保留内容：飞升次数、累计统计</p>
              <p>
                飞升后获得：属性加成 +{nextBonus.statBonus}%{nextCount === 1 && '、初始灵石 x2 (1000)'}
              </p>
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
