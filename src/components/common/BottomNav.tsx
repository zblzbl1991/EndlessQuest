import { NavLink } from 'react-router-dom'
import { primaryNavigation } from '../../data/navigation'
import { PixelIcon } from './PixelIcon'
import styles from './BottomNav.module.css'

export default function BottomNav() {
  return (
    <nav className={styles.nav} aria-label="底部导航">
      {primaryNavigation.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        >
          {({ isActive }) => (
            <>
              <span className={styles.iconFrame} data-testid={isActive ? 'mobile-nav-active' : undefined}>
                <PixelIcon name={tab.icon} size={18} className={styles.navIcon} aria-label={tab.label} />
              </span>
              <span className={styles.navLabel}>{tab.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
