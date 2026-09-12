import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useSectStore } from '../stores/sectStore'
import { useAdventureStore } from '../stores/adventureStore'
import { useEventLogStore } from '../stores/eventLogStore'
import { useGameStore } from '../stores/gameStore'

// Exclude stochastic systems so the comparison isolates deterministic production.
vi.mock('../systems/idle/RandomEventSystem', () => ({
  evaluateRandomEventsForDelta: () => [],
}))
vi.mock('../systems/cultivation/CultivationEventSystem', () => ({
  processCultivationEvent: () => ({
    event: undefined,
    cultivationMultiplier: 1,
    extraCultivation: 0,
    eventStarted: false,
    eventEnded: false,
    message: null,
  }),
}))

function resetStores() {
  useSectStore.getState().reset()
  useAdventureStore.getState().reset()
  useEventLogStore.getState().reset()
  useGameStore.getState().reset()
  useGameStore.getState().startGame()
}

/**
 * Deterministic fixture: a single idle disciple cultivating on abundant spirit
 * energy (production 4.5/s vs consumption 2/s), no production queue, no day
 * crossing inside the 20s horizon (1 game day = 60s), no random events.
 * Stats are pinned because reset() generates a fresh random character.
 */
function setupFixture() {
  resetStores()
  useSectStore.setState((state) => ({
    sect: {
      ...state.sect,
      characters: state.sect.characters.map((c) => ({
        ...c,
        status: 'idle' as const,
        realmStage: 1, // needs 300 cultivation: 20s at 5/s stays short of a breakthrough
        cultivation: 0,
        cultivationPath: 'sword' as const,
        cultivationStats: { ...c.cultivationStats, spiritualRoot: 10, comprehension: 10, fortune: 10 },
        learnedTechniques: [],
      })),
    },
  }))
}

function snapshot() {
  const sect = useSectStore.getState().sect
  return {
    resources: { ...sect.resources },
    cultivation: sect.characters.map((c) => c.cultivation),
    totalPlayTime: sect.stats.totalPlayTime,
    accumulated: { ...sect.offlineAccumulator.resourcesGained },
  }
}

function expectClose(actual: number, expected: number, label = '') {
  expect(Math.abs(actual - expected), label).toBeLessThan(1e-6)
}

function expectSnapshotsClose(actual: ReturnType<typeof snapshot>, expected: ReturnType<typeof snapshot>) {
  expectClose(actual.resources.spiritStone, expected.resources.spiritStone, 'spiritStone')
  expectClose(actual.resources.spiritEnergy, expected.resources.spiritEnergy, 'spiritEnergy')
  expectClose(actual.resources.herb, expected.resources.herb, 'herb')
  expectClose(actual.resources.ore, expected.resources.ore, 'ore')
  actual.cultivation.forEach((value, i) => expectClose(value, expected.cultivation[i], `cultivation[${i}]`))
  expect(actual.totalPlayTime).toBe(expected.totalPlayTime)
  ;(Object.keys(actual.accumulated) as (keyof typeof actual.accumulated)[]).forEach((key) =>
    expectClose(actual.accumulated[key], expected.accumulated[key], `acc.${key}`)
  )
}

function runChunks(chunks: number[]) {
  for (const delta of chunks) {
    useSectStore.getState().tickAll(delta)
  }
}

describe('simulate delta invariance', () => {
  beforeEach(() => {
    // Pin the RNG: any unmocked random path (character generation, epiphanies)
    // must behave identically across the two legs of each comparison.
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    resetStores()
  })

  it('20 x 1s steps match a single 20s delta', () => {
    setupFixture()
    runChunks(Array(20).fill(1))
    const stepped = snapshot()

    setupFixture()
    runChunks([20])
    const single = snapshot()

    expectSnapshotsClose(single, stepped)
  })

  it('4 x 5s steps match 2 x 10s steps', () => {
    setupFixture()
    runChunks([5, 5, 5, 5])
    const fine = snapshot()

    setupFixture()
    runChunks([10, 10])
    const coarse = snapshot()

    expectSnapshotsClose(coarse, fine)
  })

  it('simulating actually produces resources and cultivation', () => {
    setupFixture()
    runChunks([20])
    const sect = useSectStore.getState().sect
    expect(sect.stats.totalPlayTime).toBe(20)
    expect(sect.characters[0].cultivation).toBeGreaterThan(0)
    expect(sect.resources.spiritStone).toBeGreaterThan(500)
    expect(sect.resources.spiritEnergy).toBeGreaterThan(0)
  })
})
