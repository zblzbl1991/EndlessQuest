import type { TacticalPreset } from '../../types/adventure'
import styles from './TacticPresetPicker.module.css'

const PRESET_OPTIONS: Array<{
  id: TacticalPreset
  name: string
  description: string
}> = [
  { id: 'balanced', name: '平衡', description: '稳扎稳打，适合大多数秘境。' },
  { id: 'conservative', name: '守势', description: '优先保命，适合试探新秘境。' },
  { id: 'burst', name: '爆发', description: '追求更快击杀，适合速推。' },
  { id: 'bossCounter', name: '破首', description: '保留火力应对首领层。' },
]

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
            <span className={styles.optionName}>{option.name}</span>
            <span className={styles.optionDesc}>{option.description}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
