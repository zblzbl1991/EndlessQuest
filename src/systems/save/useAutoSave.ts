// src/systems/save/useAutoSave.ts

import { useEffect, useRef } from 'react'
import { saveGame, loadGame } from './SaveSystem'
import { usePlayerStore } from '../../stores/playerStore'
import { useInventoryStore } from '../../stores/inventoryStore'
import { useSectStore } from '../../stores/sectStore'
import { usePetStore } from '../../stores/petStore'
import { useAdventureStore } from '../../stores/adventureStore'
import { useGameStore } from '../../stores/gameStore'

const SAVE_INTERVAL = 30000 // auto-save every 30 seconds

export function useAutoSave() {
  const loaded = useRef(false)

  // Load on mount
  useEffect(() => {
    if (loaded.current) return
    const data = loadGame()
    if (!data) return
    loaded.current = true

    // Restore state
    if (data.player) usePlayerStore.setState({ player: data.player })
    if (data.inventory) {
      useInventoryStore.setState({
        items: data.inventory.items ?? [],
        maxSlots: data.inventory.maxSlots ?? 50,
        resources: data.inventory.resources,
      })
    }
    if (data.sect) {
      useSectStore.setState({
        buildings: data.sect.buildings,
        disciples: data.sect.disciples,
        resources: data.sect.resources,
        discipleMaxOwned: data.sect.discipleMaxOwned,
      })
    }
    if (data.pets) {
      usePetStore.setState({
        pets: data.pets.pets,
        maxPets: data.pets.maxPets ?? 12,
        partyPets: data.pets.partyPets,
      })
    }
    if (data.game) {
      useGameStore.setState({
        lastOnlineTime: data.game.lastOnlineTime,
      })
    }
  }, [])

  // Auto-save periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const data = {
        version: 1,
        timestamp: Date.now(),
        player: usePlayerStore.getState().player,
        inventory: {
          items: useInventoryStore.getState().items,
          maxSlots: useInventoryStore.getState().maxSlots,
          resources: useInventoryStore.getState().resources,
        },
        sect: {
          buildings: useSectStore.getState().buildings,
          disciples: useSectStore.getState().disciples,
          resources: useSectStore.getState().resources,
          discipleMaxOwned: useSectStore.getState().discipleMaxOwned,
        },
        pets: {
          pets: usePetStore.getState().pets,
          maxPets: usePetStore.getState().maxPets,
          partyPets: usePetStore.getState().partyPets,
        },
        adventure: useAdventureStore.getState(),
        game: {
          lastOnlineTime: useGameStore.getState().lastOnlineTime,
        },
      }
      saveGame(data)
    }, SAVE_INTERVAL)

    return () => clearInterval(interval)
  }, [])
}
