import type { Enemy } from '../types/adventure'

export const ENEMY_TEMPLATES: Enemy[] = [
  { id: 'wild_spirit_beast', name: '灵兽', element: 'neutral', stats: { hp: 50, atk: 8, def: 4, spd: 6 }, isBoss: false },
  { id: 'cave_demon', name: '洞妖', element: 'fire', stats: { hp: 120, atk: 18, def: 10, spd: 8 }, isBoss: false },
  { id: 'spirit_boss', name: '灵脉守卫', element: 'lightning', stats: { hp: 500, atk: 40, def: 25, spd: 12 }, isBoss: true },
]

export function scaleEnemy(baseStats: { hp: number; atk: number; def: number; spd: number }, layer: number) {
  const mult = 1 + 0.08 * layer
  return {
    hp: Math.floor(baseStats.hp * mult),
    atk: Math.floor(baseStats.atk * mult),
    def: Math.floor(baseStats.def * mult),
    spd: Math.floor(baseStats.spd * mult),
  }
}
