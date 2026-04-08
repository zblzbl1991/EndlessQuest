# PRD: Key Moment Animations

## Problem

`framer-motion` is listed as a dependency in `package.json` (v12.38.0) but is never imported in any source file. Breakthrough success/failure, adventure completion, and rare item acquisition have no animation feedback. The design principle "关键时刻，浓墨重彩" (key moments, bold strokes) requires visual impact at milestone events, but the UI currently provides only static state changes.

## Goal

Add framer-motion animations to three key game moments:
1. Breakthrough success and failure
2. Adventure run completion
3. Rare item acquisition (divine/chaos equipment, rare pets)

Animations must be subtle and ink-wash themed: fade, scale, gentle shake. Not flashy or MMO-like.

## Animation Specifications

### 1. Breakthrough Panel (`src/components/cultivation/BreakthroughPanel.tsx`)

**Success animation:**
- Container: scale from 0.95 to 1.0, opacity 0 to 1, duration 0.4s
- "Success" text: fade in with slight Y-axis slide-up (8px), duration 0.3s, delay 0.2s
- Realm indicator: gentle pulse (scale 1.0 -> 1.05 -> 1.0), duration 0.6s, repeat 2 times
- Background: brief ink-wash ripple effect (subtle radial gradient expansion), duration 0.8s

**Failure animation:**
- Container: gentle horizontal shake (translateX -4px to 4px), duration 0.3s, repeat 2
- "Failure" text: fade in with slight Y-axis slide-down (8px), duration 0.3s
- No flash or dramatic effect -- failure should feel like a setback, not a punishment

**CSS module:** `src/components/cultivation/BreakthroughPanel.module.css`
- Add `--breakthrough-duration: 0.4s` custom property
- Use `@media (prefers-reduced-motion: reduce)` to disable animations

### 2. Adventure Report Page (`src/pages/AdventureReportPage.tsx`)

**Report reveal animation:**
- Page content: staggered fade-in, each section appears 0.1s after the previous
- Sections: `resultBanner` -> `teamSummary` -> `floorDetails` -> `rewardList` -> `postRunOutcomes`
- Each section: opacity 0 to 1, translateY 12px to 0, duration 0.3s

**Result banner (completed/retreated/failed):**
- Completed: subtle golden glow pulse on the banner text (use `--color-quality-divine`), duration 0.5s
- Failed: gentle shake, same as breakthrough failure
- Retreated: simple fade-in, no special effect

**CSS module:** `src/pages/AdventureReportPage.module.css`
- Add animation custom properties: `--stagger-delay: 0.1s`

### 3. Rare Item Acquisition

This occurs in the adventure report rewards section and potentially in a future item popup.

**Divine quality equipment:**
- Item card: scale from 0.9 to 1.0, opacity 0 to 1, duration 0.3s
- Border glow: brief pulse using `--color-quality-divine` (#f59e0b), opacity 0.4 to 0.8 to 0, duration 0.8s
- Slight Y-axis float (translateY -3px to 0), duration 0.4s, repeat once

**Chaos quality equipment:**
- Same as divine but with `--color-quality-chaos` (#ef4444)
- Additional very subtle screen shake (translateX -2px to 2px), duration 0.2s, repeat once

**Rare pet capture:**
- Pet name reveal: fade-in scale from 0.8 to 1.0, duration 0.4s
- Element-colored border pulse matching pet element

## Technical Approach

### framer-motion Usage

Use `motion.div` wrappers with `initial`, `animate`, and optionally `exit` props. No `AnimatePresence` needed for single-direction reveals (items appear, don't disappear).

```tsx
import { motion } from 'framer-motion'

// Example: Breakthrough success
<motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.4, ease: 'easeOut' }}
>
  {/* content */}
</motion.div>
```

### Staggered Children

For the adventure report, use `variants` with `staggerChildren`:

```tsx
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
}
```

### Accessibility

All animations must respect `prefers-reduced-motion`:
```tsx
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const animationProps = prefersReducedMotion
  ? {}
  : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.4 } }
```

Or use framer-motion's built-in `useReducedMotion()` hook.

## Files to Change

1. **`src/components/cultivation/BreakthroughPanel.tsx`** -- Wrap success/failure content in `motion.div` with appropriate animation props. Import `motion` from `framer-motion`.

2. **`src/components/cultivation/BreakthroughPanel.module.css`** -- Add animation-related custom properties. Add `@media (prefers-reduced-motion: reduce)` block.

3. **`src/pages/AdventureReportPage.tsx`** -- Add staggered reveal animation to report sections. Add result banner animation. Import `motion` from `framer-motion`.

4. **`src/pages/AdventureReportPage.module.css`** -- Add animation custom properties.

5. **Reward/item display components** -- If there is a shared item card component used for reward display, add rare-item glow animation there. Otherwise, add inline to the adventure report rewards section.

## Files NOT to Change

- No game logic changes -- this is purely UI/animation.
- No store changes.
- No type changes.
- No data file changes.

## Acceptance Criteria

- [ ] Breakthrough success has scale-up and fade-in animation
- [ ] Breakthrough failure has gentle horizontal shake
- [ ] Adventure report sections reveal with staggered fade-in
- [ ] Completed run banner has subtle glow pulse
- [ ] Divine/chaos equipment rewards have glow + scale animation
- [ ] All animations respect `prefers-reduced-motion`
- [ ] framer-motion imported and used (no longer dead dependency)
- [ ] Animations feel ink-wash themed: no bright flashes, no neon, no MMO-style effects
- [ ] Animation durations under 1s (fast and subtle)
- [ ] No layout shift during animation (elements maintain final dimensions)
