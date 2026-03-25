import { NavLink } from 'react-router-dom'
import { useSectStore } from '../../stores/sectStore'
import styles from './Sidebar.module.css'

const navItems = [
  { to: '/', label: '宗门', icon: '⛩' },
  { to: '/characters', label: '弟子', icon: '👤' },
  { to: '/buildings', label: '建筑', icon: '🏯' },
  { to: '/adventure', label: '秘境', icon: '⚔' },
  { to: '/vault', label: '仓库', icon: '📦' },
]

export default function Sidebar() {
  const sect = useSectStore((s) => s.sect)

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <div className={styles.sectName}>{sect.name}</div>
        <div className={styles.resourceItem}>
          <span className={styles.resourceLabel}>灵石</span>
          <span className={styles.resourceValue}>{Math.floor(sect.resources.spiritStone).toLocaleString()}</span>
        </div>
      </div>
      <nav className={styles.navList}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navActive : ''}`
            }
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span className={styles.navLabel}>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
