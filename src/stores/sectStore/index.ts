import { create } from 'zustand'
import type { SectStore } from './types'
import { createInitialSlice } from './initial'
import { createCharacterSlice } from './characterSlice'
import { createBuildingSlice } from './buildingSlice'
import { createResourceSlice } from './resourceSlice'
import { createItemSlice } from './itemSlice'
import { createTechniqueSlice } from './techniqueSlice'
import { createPetSlice } from './petSlice'
import { createTickSlice } from './tickSlice'
import { createShopSlice } from './shopSlice'
import { createMiscSlice } from './miscSlice'

export type { SectStore } from './types'

export const useSectStore = create<SectStore>()((...a) => ({
  ...createInitialSlice(...a),
  ...createCharacterSlice(...a),
  ...createBuildingSlice(...a),
  ...createResourceSlice(...a),
  ...createItemSlice(...a),
  ...createTechniqueSlice(...a),
  ...createPetSlice(...a),
  ...createTickSlice(...a),
  ...createShopSlice(...a),
  ...createMiscSlice(...a),
}))
