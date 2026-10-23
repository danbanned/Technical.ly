# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Vite dev server at localhost:5173
npm run build            # Production build to dist/
npm run preview          # Preview production build locally
npm run check:language   # After a build: report retired names in the bundle (report-only)
```

No test runner or linter is configured.

## What This App Does

**BlockView — Philadelphia Explorer** (repo: BlockViewPhilly) is a Vite + React app: a BlockView shell (header, collapsible sidebar, light/dark theme) with six pages — Dashboard, Map overview / 2D, 3D Map, Location, Resources & Sources, Settings — plus Area Context (`/area`). The 3D Map page mounts the existing technical.me Philadelphia Pilot map (`src/PhiladelphiaApp.jsx`) unchanged.

**Every data value is sample data** (`src/data/philadelphiaTracts.js`, `src/data/philadelphiaBuildings.js`, both `synthetic: true`), or computed in the browser from it (`src/core/cbs.js`). Live: map tiles, 3D building tiles, the clock, and Open-Meteo weather on the Dashboard.

## Current plan (Oct 23)

- Keep the 3D map and its data exactly as on `main` (f7edea8). The only change to map code is `philaGoogleTiles: false` at `src/store/useMapStore.js:163` (Google 3D Tiles off at load). Ask before changing anything else in the map's files: `PhiladelphiaApp.jsx`, `PhilaCesiumMap.jsx`, `components/Globe/Layers/*`, `map/layers/*`, `map/interactions.js`, `core/*`, `ui/{LayerToggles,TractList,RegionSnapshot,InspectPanel,InsightsCard,StoryFeed,CompareMode,Legend,SolutionConnector,SolutionTour,DataStamp,ErrorBoundary}`, `ui/phila.css`, `styles/index.css`, `store/useMapStore.js`, `data/{config,philadelphiaBuildings,philadelphiaTracts,feedArticles}.js`, `api/*`.
- UI changes around the map go in the shell: wrappers in `src/pages/Map3DPage.jsx` and CSS overrides in `src/styles/shell.css`.
- Which features stay, move or go is a team decision, made with William's updated wireframe (`docs/current-app-inventory.md` is the inventory he works from). Don't make it in code.

## Decisions under review (9/29 client call)

Proposed, not enforced by the code today: the map shows data, not scores, "gaps", opportunity signals, mismatch alerts, story headlines, recommendations or causal claims; one layer = one dataset; missing data says "No data"; sample values are not shown. Don't apply these to the map without a team decision.

## Architecture

- **Routes** (`src/App.jsx`, React Router): `/`, `/map`, `/3d`, `/location`, `/location/:id` (tract GEOID), `/area`, `/resources`, `/settings`. `layout/AppShell` renders Header, Sidebar and the route; `/3d` gets no padding.
- **State:** `store/useMapStore.js` (Zustand) is the map's state, as on `main`. `store/useShellStore.js` holds shell state saved in `localStorage`: theme (`blockview-theme`, dark default), sidebar collapsed, and which map panels are shown. Shell pages read and write map state only through existing store setters (e.g. Area Context filters, Settings' labels toggle → `philaLayerVisibility.labels`).
- **3D map loading:** `vite.config.js` (`loadCesiumOnDemand`) strips the Cesium script and CSS that vite-plugin-cesium adds to `index.html`; `src/map/loadCesium.js` loads them when `/3d` opens, then `Map3DPage` lazy-imports `PhiladelphiaApp`. Every Cesium-importing module is inside the map app's chunk; shell code must not import them.
- **Mounting:** `.bv-map-host` uses `transform` and `container-type: size` so the map's fixed-position header, rails and panels stay inside the content area; its `100vh`/`100vw` rules are re-expressed with container units in `shell.css`. Expanded panels and the compare overlay portal into `<body>` and cover the window.
- **Styles:** `styles/index.css` and `ui/phila.css` are the map's (unchanged). `styles/shell.css` holds everything else, prefixed `bv-`, plus light-mode and contrast overrides for the map's panel chrome keyed to `[data-theme]`. Never restyle the scene, layer colors or legend swatches.
- **Shell data views:** `data/places.js` (tracts with the same `computeAllCBS` call the map uses, buildings, formatters that show "No data yet" for missing values), `data/appSources.js` (providers as they really are), `data/registry.js` (reads `source_of_truth.json`, statuses shown exactly as written).
- **Registry:** `src/data/source_of_truth.json`; `docs/data-audit/06_SOURCE_OF_TRUTH.md` is the human version and the JSON wins. The retired-entries build plugin in `vite.config.js` is off (`DROP_RETIRED_REGISTRY_ENTRIES = false`).
- **Accessibility:** skip link, `aria-current` on the active nav item, native `<details>`, 44 px targets, WCAG AA text and focus contrast in both themes (checked on every page and on `/3d`).

## Data (Phase 5: blocked)

Do not wire data until the wireframe is final. When it is: only from `docs/data-audit/06_SOURCE_OF_TRUTH.md` and `source_of_truth.json`, one dataset per layer (`docs/data-audit/05_MAP_SPEC.md`), with the Census fixes in `02_DATA_BREAKDOWN.md` issues 9–11.

`scripts/` is the offline Python pipeline; nothing it writes is loaded. Large pipeline files go in the gitignored `cache/`, never in `public/` (Vite copies `public/` into `dist/`).

## Environment Variables (`.env`)

```
VITE_CESIUM_ION_TOKEN=     # OSM Buildings (ion 96188) and Enriched Buildings (ion 4980304)
VITE_GOOGLE_MAPS_API_KEY=  # Google Photorealistic 3D Tiles toggle
VITE_CARTO_API_KEY=        # CARTO basemap on /3d; unset = Esri
VITE_ENABLE_NARRATION=     # "true" lets the map call /api/narrate and /api/solutions
# ANTHROPIC_API_KEY is server-only (Vercel), read by api/*
```
