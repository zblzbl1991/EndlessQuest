import { useState, useMemo } from 'react'
import { useSectStore } from '../stores/sectStore'
import { useTradeStore } from '../stores/tradeStore'
import { useInventoryStore } from '../stores/inventoryStore'
import { BUILDING_DEFS } from '../data/buildings'
import { QUALITY_NAMES } from '../data/items'
import { calcResourceRates } from '../systems/economy/ResourceEngine'
import { checkBuildingUnlock, canUpgradeBuilding } from '../systems/sect/BuildingSystem'
import { QUALITY_LEVEL_CAP } from '../systems/disciple/DiscipleEngine'
import type { DiscipleQuality } from '../types/sect'
import styles from './Sect.module.css'

type SectTab = 'buildings' | 'disciples' | 'shop'

export default function Sect() {
  const [tab, setTab] = useState<SectTab>('buildings')

  return (
    <div className="page-content">
      <div className={styles.page}>
        <div className={styles.tabBar}>
          <button
            className={`${styles.tab} ${tab === 'buildings' ? styles.activeTab : ''}`}
            onClick={() => setTab('buildings')}
          >
            建筑
          </button>
          <button
            className={`${styles.tab} ${tab === 'disciples' ? styles.activeTab : ''}`}
            onClick={() => setTab('disciples')}
          >
            弟子
          </button>
          <button
            className={`${styles.tab} ${tab === 'shop' ? styles.activeTab : ''}`}
            onClick={() => setTab('shop')}
          >
            坊市
          </button>
        </div>

        {tab === 'buildings' ? <BuildingsTab /> : tab === 'disciples' ? <DisciplesTab /> : <ShopTab />}
      </div>
    </div>
  )
}

function BuildingsTab() {
  const buildings = useSectStore((s) => s.buildings)
  const resources = useSectStore((s) => s.resources)
  const tryUpgrade = useSectStore((s) => s.tryUpgradeBuilding)
  const unlockBuilding = useSectStore((s) => s.unlockBuilding)

  const rates = useMemo(() => {
    const sfLevel = buildings.find(b => b.type === 'spiritField')?.level ?? 0
    const mainHallLevel = buildings.find(b => b.type === 'mainHall')?.level ?? 0
    return calcResourceRates({ spiritField: sfLevel, mainHall: mainHallLevel })
  }, [buildings])

  return (
    <>
      <div className={styles.resources}>
        <span>灵石 {resources.spiritStone.toLocaleString()}</span>
        <span>灵草 {Math.floor(resources.herb)}</span>
        <span>灵气 {Math.floor(resources.spiritEnergy)}</span>
      </div>

      <div className={styles.production}>
        <div className={styles.productionLabel}>资源产出</div>
        <div className={styles.productionGrid}>
          <span>灵气 +{rates.spiritEnergy.toFixed(1)}/s</span>
          {rates.herb > 0 && <span>灵草 +{rates.herb.toFixed(2)}/s</span>}
        </div>
      </div>

      <div className={styles.sectionTitle}>建筑</div>

      <div className={styles.grid}>
        {BUILDING_DEFS.map(def => {
          const building = buildings.find(b => b.type === def.type)
          if (!building) return null

          const unlockCheck = checkBuildingUnlock(def.type, buildings)
          const upgradeCheck = canUpgradeBuilding(def.type, buildings, resources.spiritStone)
          const isLocked = !building.unlocked
          const isMaxLevel = building.level >= def.maxLevel

          return (
            <div key={def.type} className={`${styles.card} ${isLocked ? styles.locked : ''}`}>
              <div className={styles.cardHeader}>
                <span className={styles.name}>{def.name}</span>
                <span className={styles.level}>Lv{building.level}/{def.maxLevel}</span>
              </div>
              <p className={styles.desc}>{def.description}</p>
              <div className={styles.actions}>
                {isLocked ? (
                  <div className={styles.lockInfo}>
                    <span className={styles.lockReason}>
                      {unlockCheck.reason || '条件已满足'}
                    </span>
                    {unlockCheck.unlocked && (
                      <button
                        className={styles.unlockBtn}
                        onClick={() => unlockBuilding(def.type)}
                      >
                        解锁
                      </button>
                    )}
                  </div>
                ) : isMaxLevel ? (
                  <span className={styles.maxLevel}>已满级</span>
                ) : (
                  <div>
                    {upgradeCheck.canUpgrade ? (
                      <button
                        className={styles.upgradeBtn}
                        onClick={() => tryUpgrade(def.type)}
                      >
                        升级 ({upgradeCheck.cost.spiritStone} 灵石)
                      </button>
                    ) : (
                      <span className={styles.cannotUpgrade}>
                        {upgradeCheck.reason || '已满级'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

function DisciplesTab() {
  const disciples = useSectStore((s) => s.disciples)
  const recruit = useSectStore((s) => s.recruitDisciple)
  const heal = useSectStore((s) => s.healDisciple)

  const statusLabel: Record<string, string> = {
    active: '修炼中',
    wounded: '受伤',
    dispatched: '执行任务',
  }

  return (
    <>
      <div className={styles.discipleHeader}>
        <div className={styles.discipleCount}>
          弟子 {disciples.length}/12
        </div>
        <button
          className={styles.recruitBtn}
          onClick={() => recruit()}
          disabled={disciples.length >= 12}
        >
          {disciples.length >= 12 ? '已满员' : '招募弟子'}
        </button>
      </div>

      {disciples.length === 0 && (
        <div className={styles.emptyHint}>
          尚无弟子，前往聚仙台招募
        </div>
      )}

      <div className={styles.discipleList}>
        {disciples.map(d => {
          const cap = QUALITY_LEVEL_CAP[d.quality]
          const qualityName = QUALITY_NAMES[d.quality as DiscipleQuality]
          return (
            <div key={d.id} className={`${styles.discipleCard} ${d.status === 'wounded' ? styles.woundedCard : ''}`}>
              <div className={styles.discipleCardHeader}>
                <span className={styles.discipleName}>{d.name}</span>
                <span className={styles.qualityBadge} data-quality={d.quality}>
                  {qualityName}
                </span>
              </div>
              <div className={styles.discipleStats}>
                <span>Lv{d.level}/{cap}</span>
                <span>天赋 {d.talent}</span>
                <span>忠诚 {d.loyalty}</span>
              </div>
              <div className={styles.discipleCombat}>
                <span>HP {d.hp}</span>
                <span>攻 {d.atk}</span>
                <span>防 {d.def}</span>
                <span>速 {d.spd}</span>
              </div>
              <div className={styles.discipleFooter}>
                <span className={styles.statusBadge} data-status={d.status}>
                  {statusLabel[d.status] ?? d.status}
                </span>
                {d.status === 'wounded' && (
                  <button className={styles.healBtn} onClick={() => heal(d.id)}>
                    治疗
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

function ShopTab() {
  const shop = useTradeStore((s) => s.shop)
  const buyItem = useTradeStore((s) => s.buyItem)
  const refreshDaily = useTradeStore((s) => s.refreshDaily)
  const spiritStone = useInventoryStore((s) => s.resources.spiritStone)
  const fairyJade = useInventoryStore((s) => s.resources.fairyJade)
  const buildings = useSectStore((s) => s.buildings)

  const marketLevel = buildings.find(b => b.type === 'market')?.level ?? 0
  const marketUnlocked = buildings.find(b => b.type === 'market')?.unlocked ?? false

  const handleBuy = (shopItem: typeof shop.fixedItems[0]) => {
    buyItem(shopItem)
  }

  if (!marketUnlocked) {
    return (
      <div className={styles.emptyHint}>
        升级宗门大殿以解锁坊市
      </div>
    )
  }

  return (
    <>
      <div className={styles.shopHeader}>
        <div className={styles.shopCurrency}>
          <span>灵石 {spiritStone.toLocaleString()}</span>
          {fairyJade > 0 && <span>仙玉 {fairyJade}</span>}
          <span className={styles.marketLevel}>坊市 Lv{marketLevel}</span>
        </div>
      </div>

      <div className={styles.sectionTitle}>日常消耗</div>
      <div className={styles.shopGrid}>
        {shop.fixedItems.map(item => (
          <div key={item.id} className={styles.shopItem}>
            <div className={styles.shopItemHeader}>
              <span className={styles.shopItemName}>{item.item.name}</span>
              <span className={styles.qualityBadge} data-quality={item.item.quality}>
                {QUALITY_NAMES[item.item.quality]}
              </span>
            </div>
            <p className={styles.shopItemDesc}>{item.item.description}</p>
            <div className={styles.shopItemFooter}>
              <span className={styles.shopPrice}>
                {item.price} {item.currency === 'spiritStone' ? '灵石' : '仙玉'}
              </span>
              <button
                className={styles.buyBtn}
                onClick={() => handleBuy(item)}
                disabled={spiritStone < item.price && item.currency === 'spiritStone'}
              >
                购买
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.dailyHeader}>
        <div className={styles.sectionTitle}>每日灵器</div>
        <button className={styles.refreshBtn} onClick={refreshDaily}>
          刷新
        </button>
      </div>
      <div className={styles.shopGrid}>
        {shop.dailyItems.map(item => (
          <div
            key={item.id}
            className={`${styles.shopItem} ${item.stock === 0 ? styles.soldOut : ''}`}
          >
            <div className={styles.shopItemHeader}>
              <span className={styles.shopItemName}>{item.item.name}</span>
              <span className={styles.qualityBadge} data-quality={item.item.quality}>
                {QUALITY_NAMES[item.item.quality]}
              </span>
            </div>
            <p className={styles.shopItemDesc}>{item.item.description}</p>
            {item.stock === 0 ? (
              <div className={styles.shopItemFooter}>
                <span className={styles.soldOutText}>已售出</span>
              </div>
            ) : (
              <div className={styles.shopItemFooter}>
                <span className={styles.shopPrice}>
                  {item.price} 灵石
                </span>
                <button
                  className={styles.buyBtn}
                  onClick={() => handleBuy(item)}
                  disabled={spiritStone < item.price}
                >
                  购买
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}
