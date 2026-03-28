import type { TacticPreset } from '../../types/runBuild'
import { TACTIC_PRESET_LABELS, TACTIC_PRESET_DESCRIPTIONS } from '../../types/runBuild'
import styles from './TacticPresetPicker.module.css'

const PRESETS: TacticPreset[] = ['balanced', 'conserve', 'burst', 'boss']

interface TacticPresetPickerProps {
  value: TacticPreset
  onChange: (preset: TacticPreset) => void
}

export default function TacticPresetPicker({ value, onChange }: TacticPresetPickerProps) {
  return (
    <div className={styles.tacticPresetPicker}>
      {PRESETS.map((preset) => (
        <button
          key={preset}
          className={`${styles.presetBtn} ${value === preset ? styles.presetBtnActive : ''}`}
          onClick={() => onChange(preset)}
          title={TACTIC_PRESET_DESCRIPTIONS[preset]}
          type="button"
        >
          {TACTIC_PRESET_LABELS[preset]}
        </button>
      ))}
    </div>
  )
}
