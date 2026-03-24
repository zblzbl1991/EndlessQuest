import { NavLink } from 'react-router-dom'
import styles from './BottomNav.module.css'

const tabs = [
  { to: '/', icon: '🏛️', label: '大殿' },
  { to: '/cultivation', icon: '⚔️', label: '修炼' },
  { to: '/sect', icon: '🏔️', label: '宗门' },
  { to: '/adventure', icon: '🗡️', label: '冒险' },
  { to: '/inventory', icon: '🎒', label: '背包' },
]

export default function BottomNav() {
  return (
    <nav className={styles.nav}>
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        >
          <span className={styles.icon}>{tab.icon}</span>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
