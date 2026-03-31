import type { StateCreator } from 'zustand'
import type { SectStore } from './types'
import type { Pet } from '../../systems/pet/PetSystem'

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
