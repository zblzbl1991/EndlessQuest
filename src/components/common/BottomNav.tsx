import { NavLink } from 'react-router-dom'
import styles from './BottomNav.module.css'

const tabs = [
  { to: '/', label: '宗门' },
  { to: '/characters', label: '弟子' },
  { to: '/buildings', label: '建筑' },
  { to: '/adventure', label: '秘境' },
  { to: '/vault', label: '仓库' },
  { to: '/log', label: '记录' },
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
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
