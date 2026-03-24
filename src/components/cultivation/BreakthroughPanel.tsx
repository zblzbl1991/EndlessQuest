import { useState } from 'react'
import { useSectStore } from '../../stores/sectStore'
import { canBreakthrough } from '../../systems/cultivation/CultivationEngine'
import { getCultivationNeeded, getRealmName } from '../../data/realms'
import type { RealmStage } from '../../types/character'
import styles from './BreakthroughPanel.module.css'

interface BreakthroughPanelProps {
  characterId: string
}

export default function BreakthroughPanel({ characterId }: BreakthroughPanelProps) {
  const character = useSectStore((s) => s.sect.characters.find((c) => c.id === characterId))
  const attemptBreakthrough = useSectStore((s) => s.attemptBreakthrough)
  const [result, setResult] = useState<{ success: boolean; msg: string } | null>(null)
  const [flashing, setFlashing] = useState(false)

  if (!character) return null

  const ready = canBreakthrough(character)
  const needed = getCultivationNeeded(character.realm, character.realmStage)
  const nextRealm = character.realmStage >= 3 ? character.realm + 1 : character.realm
  const nextStage = character.realmStage >= 3 ? 0 : (character.realmStage + 1) as RealmStage
  const nextName = getRealmName(nextRealm, nextStage)

  const handleBreakthrough = () => {
    if (!ready) return
    const res = attemptBreakthrough(characterId)
    if (res.success) {
      setResult({ success: true, msg: `突破成功！晋升${nextName}` })
      setFlashing(true)
      setTimeout(() => setFlashing(false), 600)
      setTimeout(() => setResult(null), 3000)
    } else {
      setResult({ success: false, msg: '突破失败' })
      setTimeout(() => setResult(null), 2000)
    }
  }

  return (
    <div className={`${styles.panel} ${flashing ? styles.flash : ''}`}>
      <div className={styles.title}>境界突破</div>
      <div className={styles.requirement}>
        <span>修为需求</span>
        <span className={character.cultivation >= needed ? styles.ready : styles.notReady}>
          {Math.floor(character.cultivation)} / {needed.toLocaleString()}
        </span>
      </div>
      <div className={styles.requirement}>
        <span>下一境界</span>
        <span>{nextName}</span>
      </div>
      <button
        className={`${styles.button} ${ready ? styles.buttonReady : styles.buttonDisabled}`}
        onClick={handleBreakthrough}
        disabled={!ready}
      >
        {ready ? '突破' : '修为不足'}
      </button>
      {result && (
        <div className={`${styles.result} ${result.success ? styles.resultSuccess : styles.resultFail}`}>
          {result.msg}
        </div>
      )}
    </div>
  )
}
