import 'fake-indexeddb/auto'
import { saveGame, loadGame, hasSaveData, clearSaveData } from '../systems/save/SaveSystem'
import { _resetDB, getDB } from '../systems/save/db'
import { addHistoryEntry } from '../systems/save/HistoryStore'
import { useSectStore } from '../stores/sectStore'
import { useAdventureStore } from '../stores/adventureStore'
import { useEventLogStore } from '../stores/eventLogStore'
import { useGameStore } from '../stores/gameStore'

describe('SaveSystem (per-entity IndexedDB)', () => {
  beforeEach(async () => {
    _resetDB()
    await indexedDB.deleteDatabase('endlessquest_db')
    localStorage.clear()
    useSectStore.getState().reset()
    useAdventureStore.getState().reset()
    useEventLogStore.getState().reset()
    useGameStore.getState().reset()
  })

  it('should save and load data', async () => {
    useSectStore.getState().addResource('spiritStone', 1000)
    useGameStore.getState().startGame()

    await saveGame()
    expect(await hasSaveData()).toBe(true)

    useSectStore.getState().reset()
    useGameStore.getState().reset()

    const result = await loadGame()
    expect(result).toBe(true)
    expect(useSectStore.getState().sect.resources.spiritStone).toBe(1500)
    expect(useGameStore.getState().lastOnlineTime).toBeGreaterThan(0)
  })

  it('loadGame should return false when no save', async () => {
    expect(await loadGame()).toBe(false)
  })

  it('hasSaveData should return false for no save', async () => {
    expect(await hasSaveData()).toBe(false)
  })

  it('clearSaveData should remove data', async () => {
    useGameStore.getState().startGame()
    await saveGame()
    expect(await hasSaveData()).toBe(true)
    await clearSaveData()
    expect(await hasSaveData()).toBe(false)
  })

  it('should handle IndexedDB errors gracefully', async () => {
    useGameStore.getState().startGame()
    await expect(saveGame()).resolves.not.toThrow()
  })

  it('should preserve adventure active runs through save/load', async () => {
    useAdventureStore.setState({
      activeRuns: {
        test_run_1: {
          id: 'test_run_1',
          dungeonId: 'lingCaoValley',
          teamCharacterIds: ['c1'],
          currentFloor: 3,
          floors: [],
          memberStates: {
            c1: { currentHp: 80, maxHp: 100, status: 'alive' },
          },
          totalRewards: {
            spiritStone: 200,
            spiritEnergy: 0,
            herb: 10,
            ore: 0,
          },
          itemRewards: [],
          eventLog: [{ timestamp: Date.now(), message: 'test log' }],
          status: 'active',
          supplyLevel: 'basic',
          rewardMultiplier: 1,
          pendingShopOffers: [],
          tacticalPreset: 'balanced',
          blessings: [],
          relics: [],
          branchTags: [],
          pendingBlessingOptions: [],
        },
      },
    })

    await saveGame()
    useAdventureStore.getState().reset()

    const result = await loadGame()
    expect(result).toBe(true)
    expect(useAdventureStore.getState().activeRuns['test_run_1']).toBeDefined()
    expect(useAdventureStore.getState().activeRuns['test_run_1'].currentFloor).toBe(3)
  })

  it('should preserve automation reports through save/load', async () => {
    useAdventureStore.setState({
      reports: [
        {
          id: 'report_1',
          dungeonId: 'lingCaoValley',
          teamCharacterIds: ['c1'],
          strategy: 'steady',
          tacticalPreset: 'balanced',
          startedAt: 1,
          finishedAt: 2,
          result: 'completed',
          floorsCleared: 5,
          rewards: {
            spiritStone: 120,
            spiritEnergy: 0,
            herb: 12,
            ore: 0,
          },
          itemRewardCount: 0,
        },
      ],
      reportDetails: {
        report_1: {
          id: 'report_1',
          config: {
            dungeonId: 'lingCaoValley',
            teamCharacterIds: ['c1'],
            supplyLevel: 'basic',
            tacticalPreset: 'balanced',
            automationStrategy: 'steady',
          },
          dungeonId: 'lingCaoValley',
          teamCharacterIds: ['c1'],
          startedAt: 1,
          finishedAt: 2,
          result: 'completed',
          floorsCleared: 5,
          rewards: {
            spiritStone: 120,
            spiritEnergy: 0,
            herb: 12,
            ore: 0,
          },
          itemRewards: [],
          finalMemberStates: {
            c1: { currentHp: 80, maxHp: 100, status: 'alive' },
          },
          discipleMutations: {
            c1: [],
          },
          steps: [
            {
              id: 'step_1',
              type: 'run_started',
              timestamp: 1,
              floor: 1,
              summary: '开始探索 灵草谷',
              detail: '测试报告',
            },
          ],
        },
      },
    })

    await saveGame()
    useAdventureStore.getState().reset()

    const result = await loadGame()
    expect(result).toBe(true)
    expect(useAdventureStore.getState().reports[0]?.id).toBe('report_1')
    expect(useAdventureStore.getState().getReport('report_1')?.result).toBe('completed')
  })

  it('should preserve dispatches through save/load with patrolling character status', async () => {
    useGameStore.getState().startGame()
    const characterId = useSectStore.getState().sect.characters[0].id

    useSectStore.getState().setCharacterStatus(characterId, 'patrolling')
    useAdventureStore.setState({
      dispatches: [
        {
          characterId,
          missionId: 'spiritStoneSweep',
          progress: 45,
          duration: 300,
        },
      ],
    })

    await saveGame()

    useSectStore.getState().reset()
    useAdventureStore.getState().reset()
    useGameStore.getState().reset()

    const result = await loadGame()
    expect(result).toBe(true)

    const loadedCharacter = useSectStore.getState().sect.characters.find((c) => c.id === characterId)
    expect(loadedCharacter?.status).toBe('patrolling')
    expect(useAdventureStore.getState().dispatches).toEqual([
      {
        characterId,
        missionId: 'spiritStoneSweep',
        progress: 45,
        duration: 300,
      },
    ])
  })

  it('should preserve automation settings, game day progress, and recovering disciples through save/load', async () => {
    useGameStore.getState().startGame()
    const characterId = useSectStore.getState().sect.characters[0].id

    useSectStore.getState().setAutomationSettings({
      reserveSpiritStone: 640,
      reserveSpiritEnergy: 260,
      recruitQualityFloor: 'spirit',
      preferredDungeonId: 'blackWindCave',
      casualtyTolerance: 'conservative',
      autoBreakthrough: false,
    })
    useSectStore.getState().setCharacterRecovering(characterId, 4)
    useGameStore.setState({
      currentGameDay: 9,
      dayProgressSec: 15,
    })

    await saveGame()

    useSectStore.getState().reset()
    useAdventureStore.getState().reset()
    useGameStore.getState().reset()

    const result = await loadGame()
    expect(result).toBe(true)

    const loadedCharacter = useSectStore.getState().sect.characters.find((c) => c.id === characterId)
    expect(loadedCharacter?.status).toBe('recovering')
    expect(loadedCharacter?.recoveryDaysRemaining).toBe(4)
    expect(useSectStore.getState().sect.automationSettings).toMatchObject({
      reserveSpiritStone: 640,
      reserveSpiritEnergy: 260,
      recruitQualityFloor: 'spirit',
      preferredDungeonId: 'blackWindCave',
      casualtyTolerance: 'conservative',
      autoBreakthrough: false,
    })
    expect(useGameStore.getState().currentGameDay).toBe(9)
    expect(useGameStore.getState().dayProgressSec).toBe(15)
  })

  it('should normalize patrolling status to idle when no dispatch record exists on load', async () => {
    useGameStore.getState().startGame()
    await saveGame()

    const db = await getDB()
    const character = useSectStore.getState().sect.characters[0]
    await db.put('characters', { ...character, status: 'patrolling' })

    useSectStore.getState().reset()
    useAdventureStore.getState().reset()
    useGameStore.getState().reset()

    const result = await loadGame()
    expect(result).toBe(true)

    const loadedCharacter = useSectStore.getState().sect.characters.find((c) => c.id === character.id)
    expect(loadedCharacter?.status).toBe('idle')
    expect(useAdventureStore.getState().dispatches).toEqual([])
  })

  it('should restore adventure event payloads from history on load', async () => {
    await saveGame()
    await addHistoryEntry({
      type: 'adventure_complete',
      timestamp: Date.now(),
      summary: '秘境 灵草谷 通关',
      data: {
        reportId: 'report_1',
        dungeonId: 'lingCaoValley',
        result: 'completed',
        floorsCleared: 5,
      },
    })

    useSectStore.getState().reset()
    useAdventureStore.getState().reset()
    useEventLogStore.getState().reset()
    useGameStore.getState().reset()

    const result = await loadGame()
    expect(result).toBe(true)
    expect(useEventLogStore.getState().events[0]?.data).toEqual({
      reportId: 'report_1',
      dungeonId: 'lingCaoValley',
      result: 'completed',
      floorsCleared: 5,
    })
  })

  it('should normalize adventuring status to idle when no active run includes the character', async () => {
    useGameStore.getState().startGame()
    await saveGame()

    const db = await getDB()
    const character = useSectStore.getState().sect.characters[0]
    await db.put('characters', { ...character, status: 'adventuring' })

    useSectStore.getState().reset()
    useAdventureStore.getState().reset()
    useGameStore.getState().reset()

    const result = await loadGame()
    expect(result).toBe(true)

    const loadedCharacter = useSectStore.getState().sect.characters.find((c) => c.id === character.id)
    expect(loadedCharacter?.status).toBe('idle')
  })

  it('should normalize training status to idle when assigned building is missing or locked', async () => {
    useGameStore.getState().startGame()
    await saveGame()

    const db = await getDB()
    const character = useSectStore.getState().sect.characters[0]
    await db.put('characters', { ...character, status: 'training', assignedBuilding: 'alchemyFurnace' })

    useSectStore.getState().reset()
    useAdventureStore.getState().reset()
    useGameStore.getState().reset()

    const result = await loadGame()
    expect(result).toBe(true)

    const loadedCharacter = useSectStore.getState().sect.characters.find((c) => c.id === character.id)
    expect(loadedCharacter?.status).toBe('idle')
    expect(loadedCharacter?.assignedBuilding).toBeNull()
  })

  it('should save characters to independent store', async () => {
    const sect = useSectStore.getState().sect
    expect(sect.characters.length).toBeGreaterThan(0)

    await saveGame()
    const db = await getDB()
    const chars = await db.getAll('characters')
    expect(chars.length).toBe(sect.characters.length)
  })

  it('should clean up stale localStorage on load', async () => {
    // Simulate stale v4 meta in localStorage
    localStorage.setItem('eq_save_meta', JSON.stringify({ version: 4, lastOnlineTime: Date.now(), saveSlot: 1 }))

    useGameStore.getState().startGame()
    await saveGame()
    // localStorage should be cleaned on load
    await loadGame()
    expect(localStorage.getItem('eq_save_meta')).toBeNull()
  })

  it('should delete vault items when removed from sect', async () => {
    useGameStore.getState().startGame()
    await saveGame()

    // Manually add an item to simulate an existing vault item
    const db = await getDB()
    const testItem = {
      id: 'test_item_1',
      name: 'Test Item',
      quality: 'common' as const,
      type: 'equipment' as const,
      slot: 'weapon' as const,
      description: 'test',
      sellPrice: 10,
      enhanceLevel: 0,
      refinementStats: [],
      setId: null,
      stats: { hp: 0, atk: 0, def: 0, spd: 0, crit: 0, critDmg: 0 },
    }
    await db.put('vault', testItem)

    // Save without the item in sect → should be cleaned up
    await saveGame()
    const vaultItems = await db.getAll('vault')
    expect(vaultItems.length).toBe(0)
  })

  it('should save buildings to independent store', async () => {
    useGameStore.getState().startGame()
    await saveGame()

    const db = await getDB()
    const buildings = await db.getAll('buildings')
    expect(buildings.length).toBeGreaterThan(0)
  })

  it('should migrate cultivating status to idle on load', async () => {
    useGameStore.getState().startGame()
    await saveGame()

    // Inject a character with old 'cultivating' status directly into IDB
    const db = await getDB()
    const sect = useSectStore.getState().sect
    const cultivatingChar = { ...sect.characters[0], status: 'cultivating' }
    await db.put('characters', cultivatingChar)

    useSectStore.getState().reset()
    useGameStore.getState().reset()

    const result = await loadGame()
    expect(result).toBe(true)

    const loadedChar = useSectStore.getState().sect.characters.find((c) => c.id === cultivatingChar.id)
    expect(loadedChar).toBeDefined()
    expect(loadedChar!.status).toBe('idle')
  })

  it('should migrate secluded status to idle on load', async () => {
    useGameStore.getState().startGame()
    await saveGame()

    // Inject a character with old 'secluded' status directly into IDB
    const db = await getDB()
    const sect = useSectStore.getState().sect
    const secludedChar = { ...sect.characters[0], status: 'secluded' }
    await db.put('characters', secludedChar)

    useSectStore.getState().reset()
    useGameStore.getState().reset()

    const result = await loadGame()
    expect(result).toBe(true)

    const loadedChar = useSectStore.getState().sect.characters.find((c) => c.id === secludedChar.id)
    expect(loadedChar).toBeDefined()
    expect(loadedChar!.status).toBe('idle')
  })

  it('should load missing fate grid and archive milestones with safe defaults', async () => {
    useGameStore.getState().startGame()
    await saveGame()

    const db = await getDB()
    const sect = useSectStore.getState().sect
    await db.put('characters', { ...sect.characters[0], fateGrid: undefined })
    await db.put('meta', { ...(await db.get('meta', 1)), archiveMilestones: undefined })

    useSectStore.getState().reset()
    useGameStore.getState().reset()

    const result = await loadGame()
    expect(result).toBe(true)
    expect(useSectStore.getState().sect.characters[0].fateGrid).toBeUndefined()
    expect(useSectStore.getState().sect.archiveMilestones).toEqual([])
  })

  it('should restore special expedition templates when paired legacy forge milestone exists', async () => {
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        archiveMilestones: [{ id: 'legacyForgePair', unlockedAt: 1 }],
      },
    }))
    useGameStore.getState().startGame()
    await saveGame()

    const db = await getDB()
    const meta = await db.get('meta', 1)
    await db.put('meta', {
      ...meta,
      automationSettings: {
        ...meta.automationSettings,
        expeditionTemplates: meta.automationSettings.expeditionTemplates.filter(
          (template: { id: string }) => template.id !== 'guixuResonance'
        ),
      },
    })

    useSectStore.getState().reset()
    useGameStore.getState().reset()

    const result = await loadGame()
    expect(result).toBe(true)
    expect(
      useSectStore
        .getState()
        .sect.automationSettings.expeditionTemplates.some((template) => template.id === 'guixuResonance')
    ).toBe(true)
  })

  it('should normalize missing saved resource fields to safe numeric defaults', async () => {
    useGameStore.getState().startGame()
    await saveGame()

    const db = await getDB()
    const meta = await db.get('meta', 1)
    await db.put('meta', {
      ...meta,
      resources: {
        spiritEnergy: 123,
        herb: 9,
        ore: 2,
      },
    })

    useSectStore.getState().reset()
    useGameStore.getState().reset()

    const result = await loadGame()
    expect(result).toBe(true)
    expect(useSectStore.getState().sect.resources).toEqual({
      spiritStone: 0,
      spiritEnergy: 123,
      herb: 9,
      ore: 2,
    })
  })

  it('should normalize legacy buildings that are missing count fields on load', async () => {
    useGameStore.getState().startGame()
    await saveGame()

    const db = await getDB()
    await db.put('buildings', {
      type: 'spiritField',
      level: 2,
      unlocked: true,
      productionQueue: { recipeId: null, progress: 0 },
    })
    await db.put('buildings', {
      type: 'alchemyFurnace',
      level: 1,
      unlocked: true,
      productionQueue: { recipeId: 'hp_potion', progress: 12 },
    })

    useSectStore.getState().reset()
    useAdventureStore.getState().reset()
    useGameStore.getState().reset()

    const result = await loadGame()
    expect(result).toBe(true)

    const spiritField = useSectStore.getState().sect.buildings.find((building) => building.type === 'spiritField')
    const alchemyFurnace = useSectStore.getState().sect.buildings.find((building) => building.type === 'alchemyFurnace')

    expect(spiritField).toMatchObject({
      level: 2,
      unlocked: true,
      count: 1,
      productionQueue: { recipeId: null, progress: 0 },
    })
    expect(alchemyFurnace).toMatchObject({
      level: 1,
      unlocked: true,
      count: 1,
      productionQueue: { recipeId: 'hp_potion', progress: 12 },
    })
  })
})
