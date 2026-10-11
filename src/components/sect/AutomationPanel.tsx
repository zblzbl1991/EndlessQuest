import { useState } from 'react'
import { useSectStore } from '../../stores/sectStore'
import { AUTOMATION_ITEMS, getAutomationState, type AutomationGroup } from '../../data/automationUnlocks'
import styles from './AutomationPanel.module.css'

const GROUP_NAMES: Record<AutomationGroup, string> = {
  cultivation: '修炼',
  production: '生产',
  expedition: '秘境',
  ascension: '飞升',
}

const GROUP_ORDER: AutomationGroup[] = ['cultivation', 'production', 'expedition', 'ascension']

/**
 * 自动化面板（V2.1 工单 05）：每项三态——锁定（展示解锁条件）/ 可开 / 已开。
 * 无独立开关的自动化（常驻逻辑）解锁后直接显示"生效中"。
 */
export default function AutomationPanel() {
  const sect = useSectStore((s) => s.sect)
  const setAutomationSettings = useSectStore((s) => s.setAutomationSettings)
  const [message, setMessage] = useState<string | null>(null)

  const toggle = (key: string) => {
    switch (key) {
      case 'autoMinorBreakthrough':
        setAutomationSettings({ autoBreakthrough: !sect.automationSettings.autoBreakthrough })
        break
      case 'autoMajorBreakthrough':
        setAutomationSettings({ autoMajorBreakthrough: !(sect.automationSettings.autoMajorBreakthrough ?? false) })
        break
      case 'autoAscend':
        setAutomationSettings({ autoAscend: !sect.automationSettings.autoAscend })
        break
      default:
        return
    }
    setMessage(null)
  }

  return (
    <div className={styles.panel}>
      {GROUP_ORDER.map((group) => {
        const items = AUTOMATION_ITEMS.filter((i) => i.group === group)
        if (items.length === 0) return null
        return (
          <div key={group} className={styles.group}>
            <div className={styles.groupTitle}>{GROUP_NAMES[group]}</div>
            {items.map((item) => {
              const state = getAutomationState(sect, item.key)
              const locked = state === 'locked'
              return (
                <div key={item.key} className={`${styles.item} ${locked ? styles.itemLocked : ''}`}>
                  <div className={styles.itemMain}>
                    <span className={styles.itemName}>
                      {item.name}
                      <span
                        className={`${styles.stateTag} ${
                          state === 'on'
                            ? styles.stateOn
                            : state === 'available'
                              ? styles.stateAvailable
                              : styles.stateLocked
                        }`}
                      >
                        {state === 'on' ? '生效中' : state === 'available' ? '未开启' : '未解锁'}
                      </span>
                    </span>
                    <span className={styles.itemDesc}>
                      {locked ? `解锁条件：${item.unlockHint}` : item.description}
                    </span>
                  </div>
                  {!locked && !item.alwaysOn && (
                    <button
                      className={`${styles.toggle} ${state === 'on' ? styles.toggleOn : styles.toggleOff}`}
                      onClick={() => toggle(item.key)}
                      aria-label={`${item.name}开关`}
                    >
                      {state === 'on' ? '关' : '开'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}
      {message && <div className={styles.message}>{message}</div>}
    </div>
  )
}
