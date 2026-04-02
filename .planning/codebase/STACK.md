# Technology Stack

**Analysis Date:** 2026-04-02

## Languages

**Primary:**
- TypeScript 5.9 - All source code in `src/`, strict mode enabled with `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
- CSS (CSS Modules + global CSS) - Component styles in `*.module.css` files co-located with components, theme tokens in `src/styles/theme.css`

**Secondary:**
- HTML - Single `index.html` entry point with Chinese locale (`lang="zh-CN"`)
- JSON - Package manifest, TypeScript config, Prettier config

## Runtime

**Environment:**
- Node.js 22.17.0
- ES2020 target (`tsconfig.json` `"target": "ES2020"`, `"lib": ["ES2020", "DOM", "DOM.Iterable"]`)
- ESM modules (`"type": "module"` in package.json, `"module": "ESNext"` in tsconfig)

**Package Manager:**
- npm 10.9.2
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- React 19.2.4 - UI framework, JSX transform (`react-jsx`), lazy-loaded pages via `React.lazy()`
- React DOM 19.2.4 - Client-side rendering via `ReactDOM.createRoot()`
- React Router DOM 7.13.2 - Client-side routing with `BrowserRouter`, `Routes`, `Route`, `NavLink`, `useParams`, `useNavigate`
- Zustand 5.0.12 - State management with slice pattern (12 slices in `src/stores/sectStore/`)

**Animation:**
- Framer Motion 12.38.0 - Declared as dependency but not currently imported in source

**Testing:**
- Vitest 4.1.1 - Test runner, configured in `vite.config.ts` with `globals: true`, `environment: 'jsdom'`
- Testing Library React 16.3.2 - Component testing (`@testing-library/react`)
- Testing Library Jest DOM 6.9.1 - DOM matchers (`@testing-library/jest-dom`)
- fake-indexeddb 6.2.5 - IndexedDB mock for tests, loaded in `src/__tests__/setup.ts`
- jsdom 29.0.1 - DOM environment for tests

**Build/Dev:**
- Vite 8.0.2 - Build tool and dev server, React plugin (`@vitejs/plugin-react`)
- TypeScript 5.9.3 - Type checking via `tsc -b` in build script
- ESLint 9.39.4 - Linting with flat config (`eslint.config.js`), typescript-eslint, react-hooks plugin
- Prettier 3.8.1 - Code formatting (single quotes, no semicolons, 2-space indent, 120 print width, trailing comma es5)
- Husky 9.1.7 - Git hooks (pre-commit runs `lint-staged`)
- lint-staged 16.4.0 - Staged file linting (ESLint + Prettier for TS/TSX, Prettier for CSS)

## Key Dependencies

**Critical:**
- `idb` 8.0.3 - IndexedDB wrapper, all game persistence goes through this. Client in `src/systems/save/db.ts`
- `zustand` 5.0.12 - Central state management. 3 stores: `useSectStore` (12 slices), `useAdventureStore`, `useGameStore`, plus `useEventLogStore`
- `react-router-dom` 7.13.2 - All navigation. 7 routes defined in `src/App.tsx`

**Infrastructure:**
- `framer-motion` 12.38.0 - Available for animations (currently unused in imports)

**Dev Tooling:**
- `@vitejs/plugin-react` 6.0.1 - React Fast Refresh and JSX transform
- `typescript-eslint` 8.57.2 - TypeScript-aware ESLint rules
- `eslint-plugin-react-hooks` 7.0.1 - React hooks linting

## Configuration

**Environment:**
- No `.env` files detected
- No environment variables required at build time
- Base path configured as `/EndlessQuest/` in `vite.config.ts`
- Browser-only application, no server-side runtime

**Build:**
- `vite.config.ts` - Vite configuration with React plugin and Vitest settings
- `tsconfig.json` - TypeScript strict mode, path alias `@/*` maps to `src/*`
- `eslint.config.js` - ESLint flat config with TypeScript and React hooks rules
- `.prettierrc` - Prettier settings
- `.husky/pre-commit` - Runs `npx lint-staged`

**TypeScript Aliases:**
- `@/*` -> `src/*` (configured in `tsconfig.json` `paths`)

**Vitest Configuration:**
- Globals enabled (`globals: true`)
- jsdom environment
- Setup file: `src/__tests__/setup.ts` (loads `fake-indexeddb/auto` and `@testing-library/jest-dom`)
- Tests excluded from TypeScript compilation (`"exclude": ["src/__tests__"]` in tsconfig)

## Platform Requirements

**Development:**
- Node.js 22+
- npm 10+
- Modern browser with IndexedDB support

**Production:**
- Static file hosting (Vite builds to `dist/`)
- No server-side requirements
- Client-side only: all game logic, state, and persistence run in the browser
- IndexedDB required for save data persistence
- Google Fonts CDN for `Noto Serif SC` and `Noto Sans SC` fonts (loaded in `index.html`)
- PWA-ready meta tags in `index.html` (apple-mobile-web-app-capable, theme-color)

---

*Stack analysis: 2026-04-02*
