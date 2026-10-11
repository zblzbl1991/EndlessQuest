import type { Sect } from '../../types'
import type { Character } from '../../types/character'
import { calcCultivationRate, calcSpiritCostPerSecond } from './CultivationEngine'
import { calcResourceRates } from '../economy/ResourceEngine'
import { getBuildingBonus } from '../character/SpecialtySystem'
import { getSynergyBonus } from '../economy/SynergySystem'

export interface CultivationEconomySnapshot {
  cultivatingCount: number
  spiritProductionPerSecond: number
  totalSpiritDemandPerSecond: number
  spiritRatio: number
}

export function getCultivationEconomySnapshot(sect: Sect): CultivationEconomySnapshot {
  const sfLevel = sect.buildings.find((b) => b.type === 'spiritField')?.level ?? 0
  const sfCount = sect.buildings.find((b) => b.type === 'spiritField')?.count ?? 0
  const smLevel = sect.buildings.find((b) => b.type === 'spiritMine')?.level ?? 0
  const smCount = sect.buildings.find((b) => b.type === 'spiritMine')?.count ?? 0
  const mhLevel = sect.buildings.find((b) => b.type === 'mainHall')?.level ?? 0

  const maxTechRate = sect.characters
    .filter((c) => c.status === 'idle' && c.learnedTechniques.length > 0)
    .reduce((max, c) => {
      const rate = calcCultivationRate(c, c.learnedTechniques)
      const baseRate = calcCultivationRate(c, [])
      if (baseRate === 0) return max
      return Math.max(max, rate / baseRate)
    }, 1)

  const rates = calcResourceRates(
    {
      spiritField: sfLevel,
      spiritFieldCount: sfCount,
      spiritMine: smLevel,
      spiritMineCount: smCount,
      mainHall: mhLevel,
    },
    { techniqueMultiplier: maxTechRate, discipleMultiplier: 1 }
  )

  const assignedSpecialties = (buildingType: string) =>
    sect.characters
      .filter((c) => c.status === 'training' && c.assignedBuilding === buildingType)
      .flatMap((c) => c.specialties)

  rates.spiritEnergy *= getBuildingBonus('spiritField', assignedSpecialties('spiritField'))
  rates.spiritEnergy *= getSynergyBonus('spiritField', sect.buildings)

  const cultivatingCount = sect.characters.filter((c) => c.status === 'idle').length
  if (cultivatingCount === 0) {
    return {
      cultivatingCount,
      spiritProductionPerSecond: rates.spiritEnergy,
      totalSpiritDemandPerSecond: 0,
      spiritRatio: 1,
    }
  }

  const spiritProduced = rates.spiritEnergy
  // V2.1 工单 04：逐弟子按各自境界求和的灵气需求
  const idleCharacters = sect.characters.filter((c) => c.status === 'idle')
  const spiritConsumed = idleCharacters.reduce((sum, c) => sum + calcSpiritCostPerSecond(c.realm), 0)
  return {
    cultivatingCount,
    spiritProductionPerSecond: spiritProduced,
    totalSpiritDemandPerSecond: spiritConsumed,
    spiritRatio: Math.min(1, (sect.resources.spiritEnergy + spiritProduced) / spiritConsumed),
  }
}

export function calcEffectiveCultivationRate(sect: Sect, character: Character): number {
  if (character.status !== 'idle') return 0

  const { spiritRatio } = getCultivationEconomySnapshot(sect)
  const baseRate = calcCultivationRate(character, character.learnedTechniques)
  return baseRate * spiritRatio
}
