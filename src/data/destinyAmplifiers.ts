import type { DestinyAmplifierProfile, DestinyAmplifierId } from '../types/destiny'

export const DESTINY_AMPLIFIERS: Record<DestinyAmplifierId, DestinyAmplifierProfile> = {
  yinji: {
    id: 'yinji',
    name: '引机',
    description: '放大机缘、巧合、正向奇遇。',
    seedWeightBias: { fortuneSeed: 6, afterglowSeed: 3, guardianSeed: 1 },
    instabilityGain: -2,
    coreAmplifyWeight: 1.1,
    mutationWeightBias: 1.05,
    darkCurrentBias: { fortune: 4, afterglow: 2, tribulation: 0, abyss: 0, guardian: 0, plunder: 0, anomaly: 0 },
  },
  jinjie: {
    id: 'jinjie',
    name: '近劫',
    description: '放大危险事件、反噬、以险换利。',
    seedWeightBias: { tribulationSeed: 6, anomalySeed: 2, plunderSeed: 2 },
    instabilityGain: 6,
    coreAmplifyWeight: 1.25,
    mutationWeightBias: 1.2,
    darkCurrentBias: { tribulation: 5, anomaly: 3, fortune: 0, abyss: 0, guardian: 0, plunder: 0, afterglow: 0 },
  },
  cangmo: {
    id: 'cangmo',
    name: '藏魔',
    description: '放大异化、偏执、极端成长。',
    seedWeightBias: { abyssSeed: 7, anomalySeed: 4, tribulationSeed: 1 },
    instabilityGain: 10,
    coreAmplifyWeight: 1.35,
    mutationWeightBias: 1.35,
    darkCurrentBias: { abyss: 6, anomaly: 4, fortune: 0, tribulation: 0, guardian: 0, plunder: 0, afterglow: 0 },
  },
  xumai: {
    id: 'xumai',
    name: '续脉',
    description: '放大承压、生还、带伤成长。',
    seedWeightBias: { guardianSeed: 6, afterglowSeed: 4, fortuneSeed: 1 },
    instabilityGain: -4,
    coreAmplifyWeight: 1.0,
    mutationWeightBias: 0.95,
    darkCurrentBias: { guardian: 5, afterglow: 3, fortune: 0, tribulation: 0, abyss: 0, plunder: 0, anomaly: 0 },
  },
  zheyun: {
    id: 'zheyun',
    name: '折运',
    description: '放大反转、代价换收益、险中得利。',
    seedWeightBias: { plunderSeed: 6, fortuneSeed: 2, tribulationSeed: 2 },
    instabilityGain: 4,
    coreAmplifyWeight: 1.2,
    mutationWeightBias: 1.15,
    darkCurrentBias: { plunder: 5, fortune: 2, tribulation: 2, abyss: 0, guardian: 0, afterglow: 0, anomaly: 0 },
  },
}

export const DESTINY_AMPLIFIER_LIST = Object.values(DESTINY_AMPLIFIERS)

export function getAmplifierProfile(id: DestinyAmplifierId): DestinyAmplifierProfile {
  return DESTINY_AMPLIFIERS[id]
}
