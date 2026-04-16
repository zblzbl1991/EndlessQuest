import type { AdventureReportSummary, Dungeon } from '../../types/adventure'
import type { Sect } from '../../types/sect'
import { canBreakthrough } from '../cultivation/CultivationEngine'
import { getCultivationNeeded } from '../../data/realms'
import { canUpgradeBuilding } from './BuildingSystem'
import { BUILDING_DEFS, calcResourceCaps } from '../../data/buildings'

export type SectOverviewCategory = 'management' | 'disciple' | 'adventure'

export interface SectOverviewItem {
  category: SectOverviewCategory
  label: string
  detail: string
  link: string
}

function pickManagementChange(sect: Sect): SectOverviewItem {
  const upgradable = BUILDING_DEFS.find(
    (def) =>
      canUpgradeBuilding(def.type, sect.buildings, sect.resources.spiritStone, sect.resources.herb, sect.resources.ore)
        .canUpgrade
  )
  if (upgradable) {
    const building = sect.buildings.find((item) => item.type === upgradable.type)
    return {
      category: 'management',
      label: `${upgradable.name}有新变化`,
      detail: `宗门已具备升至 ${((building?.level ?? 0) + 1).toLocaleString()} 级的条件。`,
      link: '/buildings',
    }
  }

  const caps = calcResourceCaps(
    sect.buildings.find((b) => b.type === 'spiritField')?.level ?? 0,
    sect.buildings.find((b) => b.type === 'spiritMine')?.level ?? 0
  )
  const resourceChecks = [
    { name: '灵气', value: sect.resources.spiritEnergy, cap: caps.spiritEnergy },
    { name: '灵草', value: sect.resources.herb, cap: caps.herb },
    { name: '矿材', value: sect.resources.ore, cap: caps.ore },
  ]
  const nearlyFull = resourceChecks.find((entry) => entry.cap > 0 && entry.value / entry.cap > 0.8)
  if (nearlyFull) {
    return {
      category: 'management',
      label: `${nearlyFull.name}正在积聚`,
      detail: `${Math.floor(nearlyFull.value)}/${nearlyFull.cap}，宗门运转值得留意。`,
      link: '/buildings',
    }
  }

  return {
    category: 'management',
    label: '宗门运转平稳',
    detail: '资源与建筑暂时没有突出的波动。',
    link: '/buildings',
  }
}

function pickDiscipleChange(sect: Sect): SectOverviewItem {
  const breakthroughTarget = sect.characters.find((char) => {
    const needed = getCultivationNeeded(char.realm, char.realmStage)
    return needed !== Infinity && char.cultivation / needed > 0.9 && canBreakthrough(char)
  })
  if (breakthroughTarget) {
    return {
      category: 'disciple',
      label: `${breakthroughTarget.name}气机将满`,
      detail: '这名弟子已接近突破边缘，可以继续观望或提前准备。',
      link: '/characters',
    }
  }

  const recovering = sect.characters.find((char) => char.status === 'injured' || char.status === 'resting')
  if (recovering) {
    return {
      category: 'disciple',
      label: `${recovering.name}正在恢复`,
      detail: '弟子状态即将回稳，宗门用人会出现新的腾挪空间。',
      link: '/characters',
    }
  }

  const training = sect.characters.find((char) => char.status === 'training')
  if (training) {
    return {
      category: 'disciple',
      label: `${training.name}正在研习`,
      detail: '留守弟子的分工已开始产生新变化。',
      link: '/characters',
    }
  }

  return {
    category: 'disciple',
    label: '弟子状态平顺',
    detail: '当前队伍没有突出的伤病或突破波动。',
    link: '/characters',
  }
}

function pickAdventureChange(reports: AdventureReportSummary[], dungeons: Dungeon[], sect: Sect): SectOverviewItem {
  const latestReport = reports[0]
  if (latestReport) {
    const dungeon = dungeons.find((item) => item.id === latestReport.dungeonId)
    const resultLabel =
      latestReport.result === 'completed' ? '通关' : latestReport.result === 'retreated' ? '撤退' : '失利'

    return {
      category: 'adventure',
      label: `${dungeon?.name ?? '秘境'}留下新战报`,
      detail: `${resultLabel} · 第 ${latestReport.floorsCleared} 层，这次探索值得回看。`,
      link: `/adventure/report/${latestReport.id}`,
    }
  }

  const idleChars = sect.characters.filter((char) => char.status === 'idle').length
  const unlockedDungeon = dungeons.find((dungeon) =>
    sect.characters.some(
      (char) =>
        char.realm > dungeon.unlockRealm ||
        (char.realm === dungeon.unlockRealm && char.realmStage >= dungeon.unlockStage)
    )
  )

  if (unlockedDungeon && idleChars > 0) {
    return {
      category: 'adventure',
      label: `${unlockedDungeon.name}已露出入口`,
      detail: `宗门目前有 ${Math.min(idleChars, 5)} 名弟子可随时出发。`,
      link: '/adventure',
    }
  }

  return {
    category: 'adventure',
    label: '秘境风声平静',
    detail: '最近没有新的战报，探索节奏暂时平缓。',
    link: '/adventure',
  }
}

export function buildSectOverviewItems(
  sect: Sect,
  reports: AdventureReportSummary[],
  dungeons: Dungeon[]
): SectOverviewItem[] {
  return [pickManagementChange(sect), pickDiscipleChange(sect), pickAdventureChange(reports, dungeons, sect)]
}
