import type { TacticalPreset } from '../../types/adventure'
import { TACTICAL_PRESET_DESCRIPTIONS, getTacticalPresetLabel } from '../../data/uiCopy'
import styles from './TacticPresetPicker.module.css'

const PRESET_OPTIONS: Array<{
  id: TacticalPreset
}> = [{ id: 'balanced' }, { id: 'conservative' }, { id: 'burst' }, { id: 'bossCounter' }]

interface TacticPresetPickerProps {
  value: TacticalPreset
  onChange: (preset: TacticalPreset) => void
  title?: string
}

export default function TacticPresetPicker({ value, onChange, title = '战术预设' }: TacticPresetPickerProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.title}>{title}</div>
      <div className={styles.options}>
        {PRESET_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`${styles.option} ${value === option.id ? styles.optionActive : ''}`}
            onClick={() => onChange(option.id)}
          >
            <span className={styles.optionName}>{getTacticalPresetLabel(option.id)}</span>
            <span className={styles.optionDesc}>{TACTICAL_PRESET_DESCRIPTIONS[option.id]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
