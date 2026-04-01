# Qingmo Light Haze Theme Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current warm-brown shell with the approved `清墨轻岚` theme while preserving the existing page hierarchy, interaction model, and gameplay behavior.

**Architecture:** Refresh the theme in three layers: first global tokens and background texture, then shell components, then day-to-day page surfaces and buttons. Keep the existing React and CSS Modules structure; do not rewrite page logic. Use targeted tests to lock in visible anchors and then run the full suite once the palette refresh is complete.

**Tech Stack:** React 19, TypeScript, CSS Modules, Vitest, Testing Library

---

## File Structure

### Global theme foundation

- Modify: `src/styles/theme.css`
- Modify: `src/styles/globals.css`
- Test: `src/__tests__/NavigationShell.test.tsx`

These files should define the new `清墨轻岚` palette. Every later task should consume the tokens rather than introducing page-local hardcoded colors.

### Shell palette refresh

- Modify: `src/components/common/Sidebar.module.css`
- Modify: `src/components/common/TopBar.module.css`
- Modify: `src/components/common/BottomNav.module.css`
- Possibly modify: `src/components/common/Sidebar.tsx`
- Possibly modify: `src/components/common/TopBar.tsx`
- Possibly modify: `src/components/common/BottomNav.tsx`
- Test: `src/__tests__/NavigationShell.test.tsx`

The shell should lose the deep brown casing and move into light ink-grey framing while keeping the current structure.

### Page surface refresh

- Modify: `src/pages/SectPage.module.css`
- Modify: `src/pages/AdventurePage.module.css`
- Modify: `src/pages/BuildingsPage.module.css`
- Modify: `src/pages/CharactersPage.module.css`
- Modify: `src/components/common/CharacterCard.module.css`
- Test: `src/__tests__/SectPage.test.tsx`
- Test: `src/__tests__/AdventurePage.test.tsx`
- Test: `src/__tests__/BuildingsPage.test.tsx`
- Test: `src/__tests__/CharactersPage.test.tsx`
- Test: `src/__tests__/CharacterCard.test.tsx`

This layer should remove the last obvious warm-brown leftovers in hero cards, summary cards, and routine action surfaces.

---

### Task 1: Replace Global Theme Tokens With `清墨轻岚`

**Files:**
- Modify: `src/styles/theme.css`
- Modify: `src/styles/globals.css`

- [ ] **Step 1: Write the failing test**

Extend an existing shell-facing test or create a minimal assertion path by adding expectations that the top shell still renders after global token changes. Keep it lightweight and behavioral:

```tsx
renderShell()
expect(screen.getByText('太初宗')).toBeInTheDocument()
```

The point is to make sure the shell still mounts while we swap tokens.

- [ ] **Step 2: Run test to verify it fails only if the assertion is new**

Run: `npx vitest run src/__tests__/NavigationShell.test.tsx`

Expected: Either FAIL because of a new assertion anchor, or PASS if no new behavior was added and the test only protects later work.

- [ ] **Step 3: Write minimal implementation**

Update `src/styles/theme.css` and `src/styles/globals.css` to:

- move page background from warm paper to cool mist-paper
- replace accent and accent-hover with ink-blue/grey
- retint border, text-secondary, text-tertiary, success, danger, and rare to match the cooler system
- change body background wash from warm brown clouds to cool ink mist textures

Do not change typography or spacing tokens in this task.

- [ ] **Step 4: Run verification**

Run: `npx vitest run src/__tests__/NavigationShell.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/styles/theme.css src/styles/globals.css src/__tests__/NavigationShell.test.tsx
git commit -m "style: retint global theme to qingmo light haze"
```

### Task 2: Refresh Sidebar, TopBar, and BottomNav Palette

**Files:**
- Modify: `src/components/common/Sidebar.module.css`
- Modify: `src/components/common/TopBar.module.css`
- Modify: `src/components/common/BottomNav.module.css`
- Test: `src/__tests__/NavigationShell.test.tsx`

- [ ] **Step 1: Write the failing test**

Add or tighten shell test anchors so the shell keeps its current structure while the palette changes:

```tsx
expect(screen.getByTestId('shell-sidebar')).toBeInTheDocument()
expect(screen.getByTestId('shell-topbar')).toBeInTheDocument()
```

If test ids are missing, add only the smallest stable ones needed.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/NavigationShell.test.tsx`

Expected: FAIL if new anchors were added.

- [ ] **Step 3: Write minimal implementation**

Retint the shell to match the new spec:

- Sidebar becomes light ink-grey instead of deep brown
- Seal shifts to cool ink stamp treatment
- Active nav highlight becomes pale lake-grey rather than warm amber
- TopBar loses warm cream/yellow bias and becomes cool mist paper
- BottomNav active surfaces follow the same ink-blue accent system

Keep hierarchy and nav structure unchanged.

- [ ] **Step 4: Run verification**

Run: `npx vitest run src/__tests__/NavigationShell.test.tsx src/__tests__/PixelIcons.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/common/Sidebar.module.css src/components/common/TopBar.module.css src/components/common/BottomNav.module.css src/__tests__/NavigationShell.test.tsx
git commit -m "style: refresh shell palette for qingmo light haze"
```

### Task 3: Retint Day-to-Day Page Surfaces

**Files:**
- Modify: `src/pages/SectPage.module.css`
- Modify: `src/pages/AdventurePage.module.css`
- Modify: `src/pages/BuildingsPage.module.css`
- Modify: `src/pages/CharactersPage.module.css`
- Modify: `src/components/common/CharacterCard.module.css`

- [ ] **Step 1: Write the failing test**

Tighten existing page tests only where necessary. Prefer asserting that the current hierarchy anchors still exist after the visual refresh:

```tsx
expect(screen.getByTestId('adventure-hero')).toBeInTheDocument()
expect(screen.getByTestId('buildings-hero')).toBeInTheDocument()
expect(screen.getByTestId('characters-hero')).toBeInTheDocument()
```

If these tests already exist, use them as the regression net and do not add redundant assertions.

- [ ] **Step 2: Run targeted page tests**

Run:

```bash
npx vitest run src/__tests__/SectPage.test.tsx src/__tests__/AdventurePage.test.tsx src/__tests__/BuildingsPage.test.tsx src/__tests__/CharactersPage.test.tsx src/__tests__/CharacterCard.test.tsx
```

Expected: PASS before implementation if no new assertions were added, otherwise fail only on the new anchors.

- [ ] **Step 3: Write minimal implementation**

Update the page/module CSS so:

- hero surfaces use cool ink-mist highlights instead of warm brown wash
- summary cards and section cards use lighter grey-blue edges
- primary buttons keep strong visibility but shift to the new accent
- subtle highlights, borders, and pills no longer look yellowed
- CharacterCard and other small surfaces read as clear ink-paper rather than old parchment

Do not rearrange structure in this task; color and surface treatment only.

- [ ] **Step 4: Run verification**

Run:

```bash
npx vitest run src/__tests__/SectPage.test.tsx src/__tests__/AdventurePage.test.tsx src/__tests__/BuildingsPage.test.tsx src/__tests__/CharactersPage.test.tsx src/__tests__/CharacterCard.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/SectPage.module.css src/pages/AdventurePage.module.css src/pages/BuildingsPage.module.css src/pages/CharactersPage.module.css src/components/common/CharacterCard.module.css
git commit -m "style: retint daily page surfaces"
```

### Task 4: Final Consistency Pass and Full Verification

**Files:**
- Modify any files touched above only if needed

- [ ] **Step 1: Run focused regression first**

Run:

```bash
npx vitest run src/__tests__/NavigationShell.test.tsx src/__tests__/SectPage.test.tsx src/__tests__/AdventurePage.test.tsx src/__tests__/BuildingsPage.test.tsx src/__tests__/CharactersPage.test.tsx src/__tests__/CharacterCard.test.tsx
```

Expected: PASS, or small drift failures pointing to missed anchors.

- [ ] **Step 2: Write minimal implementation**

Fix only the remaining consistency gaps:

- any leftover warm-brown hardcoded backgrounds
- any buttons whose disabled/ready contrast weakened too much
- any shell/page surface that still feels warmer than the new system

- [ ] **Step 3: Run full verification**

Run: `npm test`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/styles src/components/common src/pages src/__tests__
git commit -m "style: finalize qingmo light haze refresh"
```

---

## Suggested Execution Order

1. Task 1 `全局 token`
2. Task 2 `导航壳层`
3. Task 3 `页面表面`
4. Task 4 `最终回归`

Each task should leave the app runnable and committed before the next task begins.
