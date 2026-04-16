# Combat Narrative System Code-Spec

> Contract for extracting narrative highlights from combat results.

---

## 1. Scope / Trigger

`CombatNarrativeSystem` is a pure function that analyzes `CombatResult.actions[]` and produces 3-8 narrative highlight sentences for display in the adventure report page.

This system supplements the existing battle visualization (BossCombatReport, CombatReportPanel, RoundByRoundDetails, extractKeyActions, buildDamageStats) — it does NOT replace any of it.

---

## 2. Signatures

```ts
// src/systems/combat/CombatNarrativeSystem.ts

export type HighlightType = 'opening' | 'element_clash' | 'critical' | 'comeback' | 'killing_blow' | 'boss_attack'

export interface CombatHighlight {
  text: string       // Chinese narrative sentence
  type: HighlightType
  turn: number
}

export interface CombatNarrative {
  highlights: CombatHighlight[]  // 3-8 items, capped at 8
}

export function extractNarrative(
  combatResult: CombatResult,
  bossUnit: CombatUnit,
  teamUnits: CombatUnit[]
): CombatNarrative
```

### Input

- `combatResult` — from `simulateCombat()`, contains `actions[]` with full per-action data
- `bossUnit` — the primary enemy unit (for regular combat, pass the single enemy)
- `teamUnits` — ally team units (for HP tracking)

### Output

3-8 narrative highlights, each with Chinese flavor text matching the xianxia theme.

---

## 3. Highlight Detection Rules

| Highlight | Trigger | One-shot? | Text Pattern |
|-----------|---------|-----------|--------------|
| `opening` | First action in `actions[]` | Yes | Ally: "率先出手" / Enemy: "来势汹汹" |
| `element_clash` | `breakdown.elementMultiplier >= 1.5` | Yes (first only) | "引动{element}属克制之力" |
| `critical` | `action.isCrit && damage > 0` | Yes (first only) | "正中要害，暴击 {damage}！" |
| `boss_attack` | Enemy action drops ally HP below 30% | Last qualifying | "重创{name}，形势岌岌可危" |
| `comeback` | Ally HP < 20% at any point + victory | Conditional | "险境中咬牙坚持，逆转乾坤" |
| `killing_blow` | Last action in `actions[]` | Always | Victory: "终结了战斗" / Defeat: "未能扭转败局" |

### HP Tracking

The system tracks ally HP through the action sequence to detect low-HP thresholds:

```ts
// Internal tracker:
interface UnitHpTracker {
  id: string; name: string; maxHp: number; hp: number
  hitLowThreshold: boolean  // true once HP drops below 20% of max
}
```

HP is decremented as enemy actions are processed. The `hitLowThreshold` flag is set once and persists.

### Element Labels

```ts
const ELEMENT_LABELS: Record<string, string> = {
  fire: '火', water: '水', metal: '金', wood: '木', earth: '土', neutral: '无属性'
}
```

---

## 4. Integration Points

### AdventureReportPage.tsx

A `CombatNarrativeHighlights` component displays highlights as vertical narrative cards:

```tsx
// In BossCombatReport (after key actions, before round-by-round):
{narrative.highlights.length > 0 && (
  <div className={styles.combatNarrative}>
    {narrative.highlights.map((h, i) => (
      <div key={i} className={`${styles.narrativeCard} ${isKeyMoment(h.type) ? styles.keyMoment : ''}`}>
        {h.text}
      </div>
    ))}
  </div>
)}
```

### Visual Treatment

- `comeback` and `killing_blow` types receive accent color (`var(--color-accent)`)
- Other types use default text color
- Style: left-border accent + optional text color change, matching ink-wash aesthetic

---

## 5. Tests Required

| Test File | Coverage |
|-----------|----------|
| `CombatNarrativeSystem.test.ts` | Empty actions, opening extraction, element clash detection, critical hit, killing blow (victory + defeat), comeback (only on victory), no comeback on defeat, 8-highlight cap, skill name rendering |

---

## 6. Key Files

| File | Purpose |
|------|---------|
| `src/systems/combat/CombatNarrativeSystem.ts` | New — narrative extraction system |
| `src/systems/combat/CombatEngine.ts` | Unchanged — provides CombatResult, CombatAction, DamageBreakdown |
| `src/pages/AdventureReportPage.tsx` | Modified — CombatNarrativeHighlights component integration |
| `src/pages/AdventureReportPage.module.css` | Modified — narrative card styles |
