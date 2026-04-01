export const primaryNavigation = [
  { to: '/', label: '宗门', icon: 'mainHall' },
  { to: '/characters', label: '弟子', icon: 'disciple' },
  { to: '/buildings', label: '建筑', icon: 'building' },
  { to: '/adventure', label: '秘境', icon: 'dungeonCave' },
  { to: '/vault', label: '仓库', icon: 'typeMaterial' },
  { to: '/log', label: '记录', icon: 'techniqueScroll' },
] as const

export type PrimaryNavigationItem = (typeof primaryNavigation)[number]
