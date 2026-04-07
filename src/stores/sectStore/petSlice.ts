import type { StateCreator } from 'zustand'
import type { SectStore } from './types'
import type { Pet } from '../../systems/pet/PetSystem'
import { buildPathEffectMap, getFlatEffect } from '../../systems/sect/SectPathEffects'

/** Base max pet count per character (without any path bonuses). */
const BASE_MAX_PETS_PER_CHARACTER = 2

export const createPetSlice: StateCreator<SectStore, [], [], Partial<SectStore>> = (set, _get) => ({
  addPet: (pet: Pet) => {
    set((s) => ({
      sect: { ...s.sect, pets: [...s.sect.pets, pet] },
    }))
  },

  removePet: (petId: string) => {
    set((s) => ({
      sect: {
        ...s.sect,
        pets: s.sect.pets.filter((p) => p.id !== petId),
        // Also unassign from any character
        characters: s.sect.characters.map((c) => ({
          ...c,
          petIds: c.petIds.filter((id) => id !== petId),
        })),
      },
    }))
  },

  assignPet: (characterId: string, petId: string) => {
    const { sect } = _get()
    const char = sect.characters.find((c) => c.id === characterId)
    if (!char) return false

    const petExists = sect.pets.some((p) => p.id === petId)
    if (!petExists) return false

    if (char.petIds.includes(petId)) return true // already assigned

    // Check max pet slots, including sect path bonus
    const pathEffectMap = buildPathEffectMap(sect.sectPath, sect.unlockedPathNodeIds)
    const maxPets = BASE_MAX_PETS_PER_CHARACTER + getFlatEffect(pathEffectMap, 'petSlots')
    if (char.petIds.length >= maxPets) return false

    set((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) => (c.id === characterId ? { ...c, petIds: [...c.petIds, petId] } : c)),
      },
    }))
    return true
  },

  unassignPet: (characterId: string, petId: string) => {
    set((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) =>
          c.id === characterId ? { ...c, petIds: c.petIds.filter((id) => id !== petId) } : c
        ),
      },
    }))
  },
})
