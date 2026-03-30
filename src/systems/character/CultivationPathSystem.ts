import type { BaseStats } from '../../types/character'
import type { CultivationPath } from '../../types/character'
import { getPathStatBonus } from '../../data/cultivationPaths'

export function applyPathStatBonuses(stats: BaseStats, path: CultivationPath): BaseStats {
  return {
    hp: Math.floor(stats.hp * getPathStatBonus(path, 'hp')),
    atk: Math.floor(stats.atk * getPathStatBonus(path, 'atk')),
    def: Math.floor(stats.def * getPathStatBonus(path, 'def')),
    spd: Math.floor(stats.spd * getPathStatBonus(path, 'spd')),
    crit: Math.floor(stats.crit * getPathStatBonus(path, 'crit')),
    critDmg: stats.critDmg * getPathStatBonus(path, 'critDmg'),
  }
}
