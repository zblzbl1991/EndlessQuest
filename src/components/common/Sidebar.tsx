import { NavLink } from 'react-router-dom'
import { useSectStore } from '../../stores/sectStore'
import { primaryNavigation } from '../../data/navigation'
import { PixelIcon } from './PixelIcon'
import styles from './Sidebar.module.css'

export default function Sidebar() {
  const sect = useSectStore((s) => s.sect)

  return (
    <aside className={styles.sidebar} data-testid="shell-sidebar">
      <div className={styles.sidebarHeader}>
        <div className={styles.sealRow}>
          <div className={styles.seal} data-testid="shell-seal" aria-hidden="true">
            山门
          </div>
          <div className={styles.sectMeta}>
            <div className={styles.sectEyebrow}>宗门卷轴</div>
            <div className={styles.sectName}>{sect.name}</div>
          </div>
        </div>
        <div className={styles.resourceCard}>
          <div className={styles.resourceItem}>
            <span className={styles.resourceLabel}>灵石</span>
            <span className={styles.resourceValue}>{Math.floor(sect.resources.spiritStone).toLocaleString()}</span>
          </div>
          <div className={styles.resourceHint}>门中香火稳，诸务可理</div>
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
