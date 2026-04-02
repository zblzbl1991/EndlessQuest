# External Integrations

**Analysis Date:** 2026-04-02

## APIs & External Services

**Fonts (CDN):**
- Google Fonts - Loads `Noto Serif SC` (400, 700) and `Noto Sans SC` (300, 400, 500, 700) via `<link>` tags in `index.html`
  - Preconnect to `https://fonts.googleapis.com` and `https://fonts.gstatic.com`
  - Used for ink-wash typography: serif for headings, sans-serif for body text
  - Referenced in CSS variables `--font-serif` and `--font-sans` in `src/styles/theme.css`

**No other external APIs or services are called.** This is a fully client-side, offline-capable game.

## Data Storage

**Databases:**
- IndexedDB (via `idb` 8.0.3 package)
  - Database name: `endlessquest_db`, version 3
  - Client: `src/systems/save/db.ts` (uses `openDB` from `idb`)
  - Object stores:
    - `meta` (keyPath: `slot`) - Sect metadata, resources, settings, save version
    - `characters` (keyPath: `id`) - All disciple/character entities
    - `buildings` (keyPath: `type`) - Sect buildings
    - `vault` (keyPath: `id`) - Shared sect inventory items
    - `pets` (keyPath: `id`) - Pet entities
    - `adventure` (keyPath: `id`) - Active runs, dispatches, and adventure reports
    - `history` (keyPath: `id`, autoIncrement) - Event log with `type` and `timestamp` indexes
    - `resources` (keyPath: `key`) - Resource records (legacy, may be unused after v2 migration)
  - Schema migration: v1 (single blob `save` store) to v2+ (per-entity stores) handled in `db.ts` upgrade callback
  - Save format version: v8 in `SaveMeta` interface (`src/systems/save/SaveSystem.ts`)

**File Storage:**
- Local filesystem only (no cloud storage)
- No file upload/download features

**Caching:**
- `src/systems/save/ResourceCache.ts` - In-memory resource cache for optimization (not browser cache API)

## Authentication & Identity

**Auth Provider:**
- None - Single-player browser game with no user accounts
- No login, registration, or session management
- Save data is per-browser (IndexedDB)

## Monitoring & Observability

**Error Tracking:**
- None - No error tracking service integrated
- Errors logged to `console.error` in save/load operations (`src/systems/save/SaveSystem.ts`)
- `ErrorBoundary` component (`src/components/common/ErrorBoundary.tsx`) catches React render errors

**Logs:**
- `console.error` for save/load failures
- In-game event log via `useEventLogStore` (`src/stores/eventLogStore.ts`) - persisted to IndexedDB `history` store
- No structured logging framework

## CI/CD & Deployment

**Hosting:**
- Static hosting target (Vite `dist/` directory)
- Base path: `/EndlessQuest/` configured in `vite.config.ts`

**CI Pipeline:**
- None detected - No GitHub Actions, CircleCI, or other CI configuration files found

**Build Commands:**
- `npm run build` - TypeScript check (`tsc -b`) then Vite production build
- `npm run preview` - Preview production build locally
- `npm run dev` - Vite dev server

## Environment Configuration

**Required env vars:**
- None - Fully client-side application with no server dependencies

**Secrets location:**
- None - No secrets or API keys required

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Browser APIs Used

**IndexedDB:**
- Primary persistence layer via `idb` package
- All game state saved to IndexedDB on state changes (debounced 500ms)
- Immediate save on `visibilitychange` and `beforeunload` events

**Page Visibility API:**
- `document.visibilitychange` - Pause/resume game tick when tab hidden/shown
- Used in `src/systems/idle/IdleEngine.ts` and `src/systems/save/startAutoSave.ts`

**requestAnimationFrame / setInterval:**
- `setInterval` at 1000ms for game tick loop in `IdleEngine`

**localStorage:**
- Legacy saves cleaned up on load (`eq_save_meta`, `endlessquest_save` keys removed)
- Not used for current persistence (all data in IndexedDB)

---

*Integration audit: 2026-04-02*
