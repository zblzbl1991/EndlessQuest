import { NavLink } from 'react-router-dom'
import { useSectStore } from '../../stores/sectStore'
import { primaryNavigation } from '../../data/navigation'
import { PixelIcon } from './PixelIcon'
import styles from './Sidebar.module.css'

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
      <nav className={styles.navList} aria-label="侧边导航">
        {primaryNavigation.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navActive : ''}`}
          >
            <PixelIcon name={item.icon} size={18} className={styles.navIcon} aria-label={item.label} />
            <span className={styles.navLabel}>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
