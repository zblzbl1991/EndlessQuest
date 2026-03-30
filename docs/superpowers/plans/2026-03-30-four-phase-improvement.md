# Four-Phase Improvement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the four-phase improvement plan from `docs/superpowers/specs/2026-03-30-four-phase-improvement-design.md` — cultivation state simplification, combat deepening, action agenda panel, offline reports, store refactoring, cultivation paths, sect routes, legacy system, and statistics dashboard.

**Architecture:** Data remains on existing entities (Character/Sect/DungeonRun). sectStore gets split into Zustand slices in P2. New systems are pure functions in `src/systems/`. New data in `src/data/`. UI follows existing CSS Modules pattern.

**Tech Stack:** React 19, Zustand 5, TypeScript 5.9, Vite 8, Vitest 4, CSS Modules

---

## Phase 0: State Simplification + Tooling

### Task 1: Simplify CharacterStatus type and realms data

**Files:**
- Modify: `src/types/character.ts:8`
- Modify: `src/data/realms.ts:3-12,14-66`
- Modify: `src/types/index.ts:1`
- Test: `src/__tests__/types.test.ts`
- Test: `src/__tests__/data.test.ts`

- [ ] **Step 1: Add failing type test for new CharacterStatus**

In `src/__tests__/types.test.ts`, update the CharacterStatus test to expect the simplified union:
```typescript
// Remove 'cultivating', 'secluded' from valid statuses
// Keep: 'idle' | 'adventuring' | 'patrolling' | 'resting' | 'injured' | 'training'
```

- [ ] **Step 2: Update CharacterStatus type**

In `src/types/character.ts:8`, change:
```typescript
export type CharacterStatus = 'idle' | 'adventuring' | 'patrolling' | 'resting' | 'injured' | 'training'
```

- [ ] **Step 3: Add minorBreakthroughCost to RealmDef and REALMS data**

In `src/data/realms.ts`, add `minorBreakthroughCost: number[]` field to `RealmDef` interface, then add values to each realm:
```typescript
// 炼气: [50, 150, 400]
// 筑基: [300, 800, 2000]
// 金丹: [2000, 5000, 12000]
// 元婴: [15000, 40000, 100000]
// 化神: [100000, 250000, 600000]
// 飞升: [500000, 1200000, 3000000]
```
Also add helper: `getMinorBreakthroughCost(realmIndex: number, stage: number): number`

- [ ] **Step 4: Run type tests and data tests**

Run: `npx vitest run src/__tests__/types.test.ts src/__tests__/data.test.ts`

- [ ] **Step 5: Commit**

```
git add src/types/character.ts src/data/realms.ts src/__tests__/types.test.ts src/__tests__/data.test.ts
git commit -m "feat: simplify CharacterStatus and add minorBreakthroughCost to realms"
```

### Task 2: Update sectStore — remove secluded/cultivating logic

**Files:**
- Modify: `src/stores/sectStore.ts` (lines 88-160 interface, lines 701-723 healCharacter, lines 893-1191 tickAll, lines 1435-1473 seclusion actions)
- Modify: `src/systems/cultivation/CultivationEngine.ts` (canBreakthrough)
- Test: `src/__tests__/stores.test.ts`
- Test: `src/__tests__/CultivationEngine.test.ts`

- [ ] **Step 1: Write failing tests for new behavior**

In `src/__tests__/stores.test.ts`:
- Test that `'secluded'` and `'cultivating'` are no longer valid statuses
- Test that `idle` characters get cultivation ticks
- Test that small breakthrough checks spirit stone cost via `getMinorBreakthroughCost`
- Test that `healCharacter` sets status to `'idle'` instead of `'cultivating'`
- Test that `startSeclusion` and `stopSeclusion` no longer exist on the store

In `src/__tests__/CultivationEngine.test.ts`:
- Test `canBreakthrough` returns false when spirit stones insufficient for minor breakthrough

- [ ] **Step 2: Remove seclusion actions from store interface and implementation**

In `src/stores/sectStore.ts`:
- Remove `startSeclusion` and `stopSeclusion` from interface (lines 156-157)
- Remove their implementations (lines 1435-1473)

- [ ] **Step 3: Update healCharacter to set `'idle'`**

In `src/stores/sectStore.ts` line 713, change:
```typescript
status: 'cultivating'  →  status: 'idle' as const
```

- [ ] **Step 4: Rewrite tickAll character processing**

The key logic inversion — replace the 3-branch system (not-cultivating/secluded/cultivating) with a 2-branch system:

1. **idle characters** (was `cultivating`): Calculate `effectiveSpirit = 2 * spiritRatio * deltaSec`, tick cultivation, check breakthrough with minor stone cost
2. **Non-idle characters**: Handle `injured`/`resting` (timer countdown → status becomes `'idle'`), skip `training`/`adventuring`/`patrolling`

Also update:
- Line 894: `cultivatingCount` → count characters with `status === 'idle'`
- Remove all secluded-specific logic (2.5x multiplier, spirit stone consumption per second, forced exit)
- Add minor breakthrough spirit stone check: before attempting sub-stage breakthrough, check `sect.resources.spiritStone >= getMinorBreakthroughCost(realm, stage)`, deduct cost on attempt

- [ ] **Step 5: Update CultivationEngine.canBreakthrough**

Add spirit stone parameter:
```typescript
canBreakthrough(character: Character, spiritStoneCost?: number, availableSpiritStones?: number): boolean
```
Return false if `spiritStoneCost` is provided and `availableSpiritStones < spiritStoneCost`.

- [ ] **Step 6: Run tests**

Run: `npx vitest run`
Fix any failing tests from the status simplification.

- [ ] **Step 7: Commit**

```
git add src/stores/sectStore.ts src/systems/cultivation/CultivationEngine.ts src/__tests__/
git commit -m "feat: remove secluded/cultivating, idle auto-cultivates with spirit stone costs"
```

### Task 3: Update UI components for status changes

**Files:**
- Modify: `src/components/common/StatusBadge.tsx` (lines 4-24)
- Modify: `src/components/common/CharacterCard.tsx` (line 68)
- Modify: `src/components/cultivation/BreakthroughPanel.tsx` (line 33, lines 29-87)
- Modify: `src/pages/CharactersPage.tsx` (lines 157-158, 274-303, 59-64)
- Modify: `src/pages/SectPage.tsx` (lines 15-22)

- [ ] **Step 1: Update StatusBadge**

```typescript
const STATUS_LABELS: Record<CharacterStatus, string> = {
  idle: '修炼中',       // was '休息', now green
  adventuring: '冒险中',
  patrolling: '巡逻中',
  resting: '休息',
  injured: '受伤',
  training: '研习中',
}
const STATUS_STYLES: Record<CharacterStatus, string> = {
  idle: styles.cultivating,  // was styles.resting
  // ...rest same
}
```

- [ ] **Step 2: Update CharacterCard to show progress for idle**

Line 68: Change `character.status === 'cultivating'` to `character.status === 'idle'`

- [ ] **Step 3: Update BreakthroughPanel**

- Line 33: Change `'cultivating'` check to `'idle'`
- Add minor breakthrough cost display using `getMinorBreakthroughCost`

- [ ] **Step 4: Update CharactersPage**

- Remove `startSeclusion` and `stopSeclusion` from store destructuring (lines 157-158)
- Remove seclusion buttons (lines 274-303)
- Update FILTER_TABS (line 59-64): remove `'secluded'` from cultivating match, change key to `'cultivating'` → `'idle'`

- [ ] **Step 5: Update SectPage character stats**

Lines 15-22: Change `'cultivating'` count to `'idle'` count

- [ ] **Step 6: Run tests and build**

Run: `npx vitest run && npm run build`

- [ ] **Step 7: Commit**

```
git add src/components/ src/pages/
git commit -m "feat: update UI for idle=cultivating, remove seclusion buttons"
```

### Task 4: Update SaveSystem for status migration

**Files:**
- Modify: `src/systems/save/db.ts` (DB_VERSION bump)
- Modify: `src/systems/save/SaveSystem.ts` (migration logic)
- Test: `src/__tests__/SaveSystem.test.ts`

- [ ] **Step 1: Write migration test**

Test that loading a save with `status: 'cultivating'` characters migrates them to `'idle'`.
Test that loading a save with `status: 'secluded'` characters migrates them to `'idle'`.

- [ ] **Step 2: Bump DB_VERSION and add migration**

In `db.ts`: Change `DB_VERSION` from 2 to 3.
In `SaveSystem.ts`: After loading characters from IDB, migrate:
```typescript
characters = characters.map(c => {
  if (c.status === 'cultivating' || c.status === 'secluded') {
    return { ...c, status: 'idle' as const }
  }
  return c
})
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/__tests__/SaveSystem.test.ts`

- [ ] **Step 4: Commit**

```
git add src/systems/save/ src/__tests__/SaveSystem.test.ts
git commit -m "feat: save migration v5→v6, cultivating/secluded→idle"
```

### Task 5: Add ESLint + Prettier + pre-commit hooks

**Files:**
- Create: `eslint.config.js`
- Create: `.prettierrc`
- Create: `.prettierignore`
- Modify: `package.json` (new deps + scripts)
- Create: `.husky/pre-commit`

- [ ] **Step 1: Install dependencies**

```bash
npm install -D eslint @eslint/js @typescript-eslint/parser @typescript-eslint/eslint-plugin typescript-eslint eslint-plugin-react eslint-plugin-react-hooks prettier husky lint-staged
```

- [ ] **Step 2: Create eslint.config.js**

- [ ] **Step 3: Create .prettierrc**

```json
{ "singleQuote": true, "semi": false, "tabWidth": 2, "trailingComma": "es5" }
```

- [ ] **Step 4: Create .prettierignore**

```
dist/
node_modules/
*.tsbuildinfo
```

- [ ] **Step 5: Update package.json scripts**

Add: `"lint": "eslint src/", "format": "prettier --write 'src/**/*.{ts,tsx,css}'"`
Add lint-staged config.

- [ ] **Step 6: Setup husky**

```bash
npx husky init
echo "npx lint-staged" > .husky/pre-commit
```

- [ ] **Step 7: Run lint on existing code, fix issues**

Run: `npx eslint src/ --fix && npx prettier --write 'src/**/*.{ts,tsx,css}'`

- [ ] **Step 8: Run full test suite**

Run: `npx vitest run`

- [ ] **Step 9: Commit**

```
git add -A
git commit -m "chore: add ESLint, Prettier, husky pre-commit hooks"
```

---

## Phase 1: Combat Deepening + Action Agenda

### Task 6: Add combat types (EnemyAffix, TacticalPreset, extended CombatUnit)

**Files:**
- Modify: `src/types/adventure.ts` (add types, extend Enemy)
- Test: `src/__tests__/types.test.ts`

- [ ] **Step 1: Add new types to adventure.ts**

```typescript
export type EnemyAffix = 'berserk' | 'shield' | 'spiritDrain' | 'swift' | 'tribulationBane'
export type TacticalPreset = 'conservative' | 'balanced' | 'burst' | 'bossCounter'
```

Extend `Enemy` interface with optional fields: `affixes?: EnemyAffix[]`, `skillIds?: string[]`.

- [ ] **Step 2: Update index.ts barrel exports**

- [ ] **Step 3: Run type tests**

- [ ] **Step 4: Commit**

### Task 7: Create AffixSystem and TargetingSystem

**Files:**
- Create: `src/systems/combat/AffixSystem.ts`
- Create: `src/data/affixes.ts`
- Create: `src/systems/combat/TargetingSystem.ts`
- Create: `src/systems/combat/SkillAI.ts`
- Test: `src/__tests__/AffixSystem.test.ts`
- Test: `src/__tests__/TargetingSystem.test.ts`
- Test: `src/__tests__/SkillAI.test.ts`

- [ ] **Step 1: Create affixes.ts data file**

Define affix effects, trigger conditions, and probabilities.

- [ ] **Step 2: Write AffixSystem tests, then implement**

Pure functions: `applyAffixEffects(unit)`, `shouldTriggerAffix(affix, unit, context)`.

- [ ] **Step 3: Write TargetingSystem tests, then implement**

`selectTarget(actor, allies, enemies)`: aggro-based targeting for attack skills, lowest-HP% for support.
`buildInitialAggo(units)`: all start at 0.

- [ ] **Step 4: Write SkillAI tests, then implement**

`selectAction(actor, allies, enemies, preset)`: returns skill or normal attack based on preset rules.

- [ ] **Step 5: Commit each file**

### Task 8: Integrate new combat systems into CombatEngine

**Files:**
- Modify: `src/systems/combat/CombatEngine.ts`
- Modify: `src/data/enemies.ts`
- Modify: `src/systems/roguelike/EventSystem.ts`
- Test: `src/__tests__/CombatEngine.test.ts`

- [ ] **Step 1: Extend CombatUnit interface with aggro, shield, affixes, preset**

- [ ] **Step 2: Integrate TargetingSystem into combat loop**

Replace `targets[0]` with `selectTarget(actor, allies, enemies)`.

- [ ] **Step 3: Integrate SkillAI for skill selection**

Replace the simple first-available-skill logic with `selectAction()`.

- [ ] **Step 4: Integrate AffixSystem for enemy behavior**

Apply affix effects during combat (berserk atk boost, shield HP, spirit drain heal, swift extra turn).

- [ ] **Step 5: Update enemy templates with affixPool and skillIds**

- [ ] **Step 6: Update EventSystem to initialize new CombatUnit fields**

In `resolveEvent` combat branches, initialize `aggro: 0, shield: 0, affixes: [], preset: 'balanced'`.

- [ ] **Step 7: Run all tests**

- [ ] **Step 8: Commit**

### Task 9: Create ActionAgenda component

**Files:**
- Create: `src/components/sect/ActionAgenda.tsx`
- Create: `src/styles/components/ActionAgenda.module.css`
- Modify: `src/pages/SectPage.tsx`

- [ ] **Step 1: Create ActionAgenda component**

Pure React component that reads from `useSectStore` and `useAdventureStore`, computes top 3 priority items using the spec's priority table.

- [ ] **Step 2: Style with CSS Module**

Follow ink-wash theme. Cards with 赭石色 accent for action buttons.

- [ ] **Step 3: Integrate into SectPage**

Add `<ActionAgenda />` after resource bar, before character stats.

- [ ] **Step 4: Run build**

- [ ] **Step 5: Commit**

---

## Phase 2: Offline Reports + Store Refactoring + Cultivation Paths

### Task 10: Offline report — types and accumulator

**Files:**
- Modify: `src/types/sect.ts` (add OfflineAccumulator)
- Modify: `src/stores/sectStore.ts` (add accumulator to initial state, update tickAll)
- Test: `src/__tests__/stores.test.ts`

- [ ] **Step 1: Define OfflineAccumulator type**

```typescript
export interface OfflineAccumulator {
  resourcesGained: Resources
  breakthroughs: { characterName: string; targetRealm: string; success: boolean }[]
  itemsCrafted: { name: string; quantity: number }[]
  taxIncome: number
}
```

Add `offlineAccumulator: OfflineAccumulator` to `Sect` interface.

- [ ] **Step 2: Update initial state and tickAll**

In `createInitialState()`, add empty accumulator.
In `tickAll`, accumulate: resources gained, breakthroughs, crafted items, tax.

- [ ] **Step 3: Write tests**

- [ ] **Step 4: Commit**

### Task 11: Offline report — modal UI

**Files:**
- Create: `src/components/common/OfflineReportModal.tsx`
- Create: `src/styles/components/OfflineReportModal.module.css`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create OfflineReportModal component**

Shows offline duration, resources gained, key events. "收取" button clears accumulator and closes.

- [ ] **Step 2: Integrate into App.tsx**

After loadGame + offline catch-up, if `offlineSeconds > 60`, show modal.

- [ ] **Step 3: Style with ink-wash theme**

- [ ] **Step 4: Run build and test**

- [ ] **Step 5: Commit**

### Task 12: Split sectStore into slices

**Files:**
- Create: `src/stores/sectStore/index.ts`
- Create: `src/stores/sectStore/types.ts`
- Create: `src/stores/sectStore/initial.ts`
- Create: `src/stores/sectStore/characterSlice.ts`
- Create: `src/stores/sectStore/buildingSlice.ts`
- Create: `src/stores/sectStore/resourceSlice.ts`
- Create: `src/stores/sectStore/itemSlice.ts`
- Create: `src/stores/sectStore/techniqueSlice.ts`
- Create: `src/stores/sectStore/petSlice.ts`
- Create: `src/stores/sectStore/tickSlice.ts`
- Create: `src/stores/sectStore/shopSlice.ts`
- Delete: `src/stores/sectStore.ts` (replaced by directory)

- [ ] **Step 1: Create types.ts with combined State + Actions interface**

Copy the existing interface from `sectStore.ts`. Keep it identical.

- [ ] **Step 2: Create initial.ts with createInitialState()**

- [ ] **Step 3: Create each slice file**

Extract corresponding actions into each slice using `StateCreator`. Each slice gets its own `get()`/`set()`.

- [ ] **Step 4: Create tickSlice.ts (most complex)**

This accesses all other slices via `get()`. Keep the tickAll logic identical.

- [ ] **Step 5: Create index.ts that merges all slices**

```typescript
const useSectStore = create<SectState>()(
  (...a) => ({
    ...initialSlice(...a),
    ...characterSlice(...a),
    ...buildingSlice(...a),
    ...resourceSlice(...a),
    ...itemSlice(...a),
    ...techniqueSlice(...a),
    ...petSlice(...a),
    ...tickSlice(...a),
    ...shopSlice(...a),
  })
)
```

- [ ] **Step 6: Update all imports**

All files importing `from '../../stores/sectStore'` or `from '../stores/sectStore'` — the path stays the same (directory import resolves to index.ts). Verify no breakage.

- [ ] **Step 7: Run full test suite**

Run: `npx vitest run`

- [ ] **Step 8: Commit**

### Task 13: Code splitting — lazy load pages

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Convert static imports to React.lazy()**

```typescript
const SectPage = lazy(() => import('./pages/SectPage'))
const CharactersPage = lazy(() => import('./pages/CharactersPage'))
// ...all 6 pages
```

- [ ] **Step 2: Add Suspense wrapper with loading fallback**

- [ ] **Step 3: Run build and verify bundle splitting**

Run: `npm run build`

- [ ] **Step 4: Commit**

### Task 14: Auto-save dirty flag optimization

**Files:**
- Modify: `src/systems/save/startAutoSave.ts`

- [ ] **Step 1: Replace JSON.stringify snapshot with dirty flag approach**

Add a `dirtyFlags: Set<string>` approach. Each store action sets a flag. Auto-save only serializes dirty portions.

- [ ] **Step 2: Run save tests**

- [ ] **Step 3: Commit**

### Task 15: Cultivation paths — types and data

**Files:**
- Modify: `src/types/character.ts` (add CultivationPath)
- Create: `src/data/cultivationPaths.ts`
- Create: `src/systems/character/CultivationPathSystem.ts`
- Test: `src/__tests__/CultivationPathSystem.test.ts`

- [ ] **Step 1: Add CultivationPath type**

```typescript
export type CultivationPath = 'none' | 'sword' | 'body' | 'alchemy' | 'beast' | 'formation' | 'void'
```

Add `cultivationPath: CultivationPath` to `Character` interface.

- [ ] **Step 2: Create cultivationPaths.ts data**

Define all 6 paths with their bonuses, probability tables, skill affinities.

- [ ] **Step 3: Create CultivationPathSystem.ts**

Pure functions: `getPathBonus(path)`, `rollCultivationPath(quality)`, `getPathSkillAffinity(path)`.

- [ ] **Step 4: Write tests**

- [ ] **Step 5: Commit**

### Task 16: Cultivation paths — integrate into game systems

**Files:**
- Modify: `src/stores/sectStore/characterSlice.ts` (assign path on recruit)
- Modify: `src/systems/combat/CombatEngine.ts` (apply path bonuses)
- Modify: `src/pages/CharactersPage.tsx` (display path)
- Modify: `src/components/common/CharacterCard.tsx` (show path label)
- Modify: `src/systems/save/SaveSystem.ts` (migration for new field)
- Test: `src/__tests__/stores.test.ts`

- [ ] **Step 1: Update CharacterEngine.generateCharacter to roll path**

- [ ] **Step 2: Apply path bonuses in combat**

- [ ] **Step 3: Display path in UI**

- [ ] **Step 4: Save migration — default cultivationPath to 'none'**

- [ ] **Step 5: Run tests**

- [ ] **Step 6: Commit**

---

## Phase 3: Sect Routes + Legacy + Stats

### Task 17: Sect path — types and data

**Files:**
- Modify: `src/types/sect.ts` (add SectPath, path fields to Sect)
- Create: `src/data/sectPaths.ts`
- Create: `src/systems/sect/SectPathSystem.ts`
- Test: `src/__tests__/SectPathSystem.test.ts`

- [ ] **Step 1: Add types**

```typescript
export type SectPath = 'none' | 'pill' | 'sword' | 'beast'
```

Add to Sect: `sectPath`, `unlockedPathNodeIds: string[]`, `pathUnlockedAt: number | null`.

- [ ] **Step 2: Create sectPaths.ts**

3 paths × 5 nodes each with costs and effects.

- [ ] **Step 3: Create SectPathSystem.ts**

`canUnlockPath(sect)`, `unlockNode(sect, nodeId)`, `getPathEffects(sect)`, `resetPath(sect)`.

- [ ] **Step 4: Write tests**

- [ ] **Step 5: Commit**

### Task 18: Sect path — UI and store integration

**Files:**
- Create: `src/components/sect/SectPathPanel.tsx`
- Create: `src/styles/components/SectPathPanel.module.css`
- Modify: `src/pages/SectPage.tsx` (or BuildingsPage.tsx)
- Modify: `src/stores/sectStore/` (add path actions to buildingSlice)

- [ ] **Step 1: Add store actions**

`chooseSectPath(path)`, `unlockPathNode(nodeId)`, `resetSectPath()`.

- [ ] **Step 2: Create SectPathPanel UI**

Path selection + node unlock tree. Ink-wash style.

- [ ] **Step 3: Integrate into page**

- [ ] **Step 4: Save migration for new fields**

- [ ] **Step 5: Run tests**

- [ ] **Step 6: Commit**

### Task 19: Legacy system — types, data, and logic

**Files:**
- Modify: `src/types/sect.ts` (add LegacyBonus)
- Create: `src/data/legacy.ts`
- Create: `src/systems/sect/LegacySystem.ts`
- Test: `src/__tests__/LegacySystem.test.ts`

- [ ] **Step 1: Define LegacyBonus type and add to Sect**

```typescript
export interface LegacyBonus {
  ascensionCount: number
  statBonus: number
  unlockedTechniques: string[]
  unlockedDungeons: string[]
}
```

- [ ] **Step 2: Create legacy.ts with reward tiers**

- [ ] **Step 3: Create LegacySystem.ts**

`canAscend(sect)`, `performAscension(sect) -> { newSect, report }`, `getLegacyBonus(count)`.

- [ ] **Step 4: Write tests**

- [ ] **Step 5: Commit**

### Task 20: Legacy system — UI

**Files:**
- Create: `src/components/sect/LegacyPanel.tsx`
- Create: `src/styles/components/LegacyPanel.module.css`
- Modify: `src/pages/SectPage.tsx`

- [ ] **Step 1: Create LegacyPanel**

Ascension conditions display, reward preview, confirm button, animation.

- [ ] **Step 2: Integrate into SectPage**

- [ ] **Step 3: Save migration**

- [ ] **Step 4: Run tests**

- [ ] **Step 5: Commit**

### Task 21: Statistics panel

**Files:**
- Modify: `src/types/sect.ts` (add SectStats)
- Create: `src/components/sect/StatsPanel.tsx`
- Create: `src/styles/components/StatsPanel.module.css`
- Modify: `src/stores/sectStore/` (add stat counters to actions)
- Modify: `src/stores/adventureStore.ts` (add stat counters)
- Modify: `src/pages/SectPage.tsx`

- [ ] **Step 1: Define SectStats type and add to Sect**

- [ ] **Step 2: Add stat counters to store actions**

In each relevant action, increment the corresponding `sect.stats.*` counter.

- [ ] **Step 3: Create StatsPanel component**

Display stats by category with ink-wash styling.

- [ ] **Step 4: Integrate into SectPage**

- [ ] **Step 5: Save migration for stats field**

- [ ] **Step 6: Run tests**

- [ ] **Step 7: Final commit**

---

## Final Verification

- [ ] Run full test suite: `npx vitest run`
- [ ] Run build: `npm run build`
- [ ] Run lint: `npm run lint`
- [ ] Verify no TypeScript errors: `npx tsc --noEmit`
