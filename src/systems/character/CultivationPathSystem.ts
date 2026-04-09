import type { BaseStats, Character, CultivationPath } from '../../types/character'
import { getPathStatBonus } from '../../data/cultivationPaths'
import { REALMS } from '../../data/realms'

const PATH_CHOICE_REALM = 0

function roundStat(value: number, digits: number): number {
  const factor = Math.pow(10, digits)
  return Math.round(value * factor) / factor
}

export function needsCultivationPathChoice(
  character: Pick<Character, 'cultivationPath' | 'realm' | 'realmStage'>
): boolean {
  const realm = REALMS[character.realm]
  if (!realm) return false
  return (
    character.cultivationPath === 'none' &&
    character.realm === PATH_CHOICE_REALM &&
    character.realmStage >= realm.stages.length - 1
  )
}

export function applyPathStatBonuses(stats: BaseStats, path: CultivationPath): BaseStats {
  return {
    hp: Math.floor(stats.hp * getPathStatBonus(path, 'hp')),
    atk: Math.floor(stats.atk * getPathStatBonus(path, 'atk')),
    def: Math.floor(stats.def * getPathStatBonus(path, 'def')),
    spd: Math.floor(stats.spd * getPathStatBonus(path, 'spd')),
    crit: roundStat(stats.crit * getPathStatBonus(path, 'crit'), 4),
    critDmg: roundStat(stats.critDmg * getPathStatBonus(path, 'critDmg'), 2),
  }
}
