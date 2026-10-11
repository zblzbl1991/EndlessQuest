import { getLegacyDungeonName, getLegacyTechniqueName } from './legacyUnlocks'

type AdventureLegacyResult = 'completed' | 'failed' | 'retreated'
type LegacyTechniqueSource = 'adventure' | 'ascension'

interface LegacyDungeonFlavor {
  title: string
  marker: string
  reportEyebrow: string
  reportCause: string
}

interface LegacyTechniqueFlavor {
  title: string
  marker: string
}

const LEGACY_DUNGEON_FLAVORS: Record<string, LegacyDungeonFlavor> = {
  guixuRift: {
    title: '归墟裂隙',
    marker: '轮回秘境',
    reportEyebrow: '轮回遗痕显化',
    reportCause: '这类秘境会把阵容短板和风险选择放大，能通过就说明宗门终于有了触碰轮回边缘的底气。',
  },
}

const LEGACY_TECHNIQUE_FLAVORS: Record<string, LegacyTechniqueFlavor> = {
  hongmengdaojue: {
    title: '鸿蒙道诀',
    marker: '遗产功法',
  },
}

export function isLegacyDungeonId(dungeonId: string): boolean {
  return dungeonId in LEGACY_DUNGEON_FLAVORS
}

export function isLegacyTechniqueId(techniqueId: string): boolean {
  return techniqueId in LEGACY_TECHNIQUE_FLAVORS
}

export function getLegacyDungeonMarker(dungeonId: string): string | null {
  return LEGACY_DUNGEON_FLAVORS[dungeonId]?.marker ?? null
}

export function getLegacyTechniqueMarker(techniqueId: string): string | null {
  return LEGACY_TECHNIQUE_FLAVORS[techniqueId]?.marker ?? null
}

export function getLegacyReportFlavor(dungeonId: string): LegacyDungeonFlavor | null {
  return LEGACY_DUNGEON_FLAVORS[dungeonId] ?? null
}

export function buildAdventureResultMessage(
  dungeonId: string,
  result: AdventureLegacyResult,
  fallbackDungeonName: string
): string {
  const dungeonName = getLegacyDungeonName(dungeonId) ?? fallbackDungeonName
  if (!isLegacyDungeonId(dungeonId)) {
    if (result === 'completed') return `历经艰险，弟子们凯旋归来，秘境${fallbackDungeonName}通关`
    if (result === 'failed') return `秘境${fallbackDungeonName}探索失利，弟子折戟而归`
    return `秘境${fallbackDungeonName}形势不利，弟子仓皇撤退`
  }

  if (result === 'completed') {
    return `弟子穿过${dungeonName}的轮回残光，成功把这处隐世传承拖回人间`
  }
  if (result === 'failed') {
    return `${dungeonName}的旧日残响反噬队伍，此行未能站稳脚跟`
  }
  return `${dungeonName}中的轮回余威未散，弟子见势不利先行撤退`
}

export function buildTechniqueUnlockMessage(
  techniqueId: string,
  fallbackTechniqueName: string,
  source: LegacyTechniqueSource
): string {
  const techniqueName = getLegacyTechniqueName(techniqueId) ?? fallbackTechniqueName
  if (!isLegacyTechniqueId(techniqueId)) {
    return `秘境中偶获功法残卷，${fallbackTechniqueName}录入藏经阁`
  }

  if (source === 'ascension') {
    return `轮回传承苏醒，${techniqueName}再次显化于藏经阁`
  }

  return `遗迹共鸣引动传承，${techniqueName}在秘境深处重见天日`
}

export function getLegacyEventMarker(data: Record<string, unknown> | undefined): string | null {
  if (!data) return null

  if (typeof data.legacyTechniqueId === 'string') {
    return getLegacyTechniqueMarker(data.legacyTechniqueId)
  }

  if (typeof data.legacyDungeonId === 'string') {
    return getLegacyDungeonMarker(data.legacyDungeonId)
  }

  if (data.isLegacyEncounter) return '轮回事件'
  return null
}
