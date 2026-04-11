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
    title: '褰掕櫄瑁傞殭',
    marker: '杞洖绉樺',
    reportEyebrow: '杞洖閬楃棔鏄惧寲',
    reportCause:
      '杩欑被绉樺浼氭妸闃靛鐭澘鍜岄闄╅€夋嫨鏀惧ぇ锛岃兘閫氳繃灏辫鏄庡畻闂ㄧ粓浜庢湁浜嗚Е纰拌疆鍥炶竟缂樼殑搴曟皵銆?',
  },
}

const LEGACY_TECHNIQUE_FLAVORS: Record<string, LegacyTechniqueFlavor> = {
  hongmengdaojue: {
    title: '楦胯挋閬撹瘈',
    marker: '閬椾骇鍔熸硶',
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
    if (result === 'completed') return `鍘嗙粡鑹伴櫓锛屽紵瀛愪滑鍑棆褰掓潵锛岀澧?${fallbackDungeonName}閫氬叧`
    if (result === 'failed') return `绉樺${fallbackDungeonName}鎺㈢储澶卞埄锛屽紵瀛愭姌鎴熻€屽綊`
    return `绉樺${fallbackDungeonName}褰㈠娍涓嶅埄锛屽紵瀛愪粨鐨囨挙閫€`
  }

  if (result === 'completed') {
    return `寮熷瓙绌胯繃${dungeonName}鐨勮疆鍥炴畫鍏夛紝鎴愬姛鎶婅繖澶勯殣涓栦紶鎵挎嫋鍥炰汉闂?`
  }
  if (result === 'failed') {
    return `${dungeonName}鐨勬棫鏃ユ畫鍝嶅弽鍣槦浼嶏紝姝よ鏈兘绔欑ǔ鑴氳窡`
  }
  return `${dungeonName}涓殑杞洖浣欏▉鏈暎锛屽紵瀛愯鍔夸笉鍒╁厛琛屾挙鍑?`
}

export function buildTechniqueUnlockMessage(
  techniqueId: string,
  fallbackTechniqueName: string,
  source: LegacyTechniqueSource
): string {
  const techniqueName = getLegacyTechniqueName(techniqueId) ?? fallbackTechniqueName
  if (!isLegacyTechniqueId(techniqueId)) {
    return `绉樺涓伓鑾峰姛娉曟畫鍗凤紝${fallbackTechniqueName}褰曞叆钘忕粡闃?`
  }

  if (source === 'ascension') {
    return `杞洖浼犳壙鑻忛啋锛?${techniqueName}鍐嶆鏄惧寲浜庤棌缁忛榿`
  }

  return `閬楃棔鍏遍福寮曞姩浼犳壙锛?${techniqueName}鍦ㄧ澧冩繁澶勯噸瑙佸ぉ鏃?`
}

export function getLegacyEventMarker(data: Record<string, unknown> | undefined): string | null {
  if (!data) return null

  if (typeof data.legacyTechniqueId === 'string') {
    return getLegacyTechniqueMarker(data.legacyTechniqueId)
  }

  if (typeof data.legacyDungeonId === 'string') {
    return getLegacyDungeonMarker(data.legacyDungeonId)
  }

  if (data.isLegacyEncounter) return '杞洖浜嬩欢'
  return null
}
