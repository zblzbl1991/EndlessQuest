import { create } from 'zustand'
import type { Pet } from '../systems/pet/PetSystem'
import { feedPet } from '../systems/pet/PetSystem'

interface PetState {
  pets: Pet[]
  maxPets: number
  partyPets: (string | null)[]
  addPet: (pet: Pet) => boolean
  removePet: (id: string) => void
  feedPet: (id: string) => boolean
  setPartyPet: (partyIndex: number, petId: string | null) => void
  reset: () => void
}

export const usePetStore = create<PetState>((set, get) => ({
  pets: [],
  maxPets: 12,
  partyPets: [null, null],
  addPet: (pet) => {
    if (get().pets.length >= get().maxPets) return false
    set((s) => ({ pets: [...s.pets, pet] }))
    return true
  },
  removePet: (id) => {
    set((s) => ({
      pets: s.pets.filter(p => p.id !== id),
      partyPets: s.partyPets.map(pid => pid === id ? null : pid),
    }))
  },
  feedPet: (id) => {
    const pet = get().pets.find(p => p.id === id)
    if (!pet) return false
    const fed = feedPet(pet)
    if (fed.level === pet.level) return false // already max
    set((s) => ({
      pets: s.pets.map(p => p.id === id ? fed : p),
    }))
    return true
  },
  setPartyPet: (partyIndex, petId) => {
    set((s) => {
      const party = [...s.partyPets]
      party[partyIndex] = petId
      return { partyPets: party }
    })
  },
  reset: () => set({ pets: [], maxPets: 12, partyPets: [null, null] }),
}))
