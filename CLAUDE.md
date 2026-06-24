# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server at localhost:5173
npm run build     # Production build to dist/
npm run preview   # Preview production build locally
```

No test runner or linter is configured.

## What This App Does

**technical.me** is an interactive 3D web map (Vite + React + CesiumJS) that visualizes the gap between innovation activity (universities, hospitals, VC deal hubs) and resident economic outcomes in urban areas. The current build is a Philadelphia Pilot MVP.

The core metric is the **Community Benefit Score (CBS)**: a 0–10 score computed per census tract that compares innovation density within a 1.5 km radius against resident income, unemployment, and upward mobility. High innovation + low resident outcomes = a mismatch alert.

## Architecture

### State Management

All global state lives in `src/store/useMapStore.js` (Zustand). Key state groups:

- `philaSelectedTract` / `philaSelectedBuilding` — current map selection
- `philaTractsWithCBS` — CBS-scored tract data (computed at load time in `cbs.js`)
- `philaLayerVisibility` — per-layer toggle flags
- `philaCompareTracts` — two tracts selected for side-by-side comparison
- `immersionMode` — ambient/reactive/immersive (multi-city future use; MVP stays in ambient)

### CBS Engine (`src/core/`)

- `cbs.js` — `aggregateNearbyInnovation()`, `computeAllCBS()`, `findTopGaps()`. Weights are in `src/data/config.js`:
  - Innovation Index: `rdSpend × 0.6 + vcDensity × 0.4`
  - Outcome Index: `mobility × 0.4 + income × 0.35 + (1 − unemployment) × 0.25`
  - Search radius: 1.5 km
- `insightEngine.js` — generates plain-language insight text per tract. Has a runtime doc-alignment guard (`assertDocAligned()`) that blocks investment-advice language patterns in dev. Categories: `OPPORTUNITY_GAP`, `ALIGNED_BENEFIT`, `STRONG_LOCAL`, `UNDERSERVED`.

### Map Layers (`src/map/layers/`, `src/components/Globe/Layers/`)

Layers follow a **spec-to-entity** pattern: each layer module builds a plain spec object (type, positions, colors, metadata) and a unified `specToEntity()` converts it to a Cesium entity. The four layers:

- `innovationLayer.js` — extruded towers for universities/hospitals, pulsing circles for VC hubs
- `investmentLayer.js` / `DealFlowArcs.jsx` — VC deal flow arcs
- `mobilityHeatmapLayer.js` / `MobilityHeatmap.jsx` — circles on tract centroids, size/color by outcome index
- `labelLayer.js` — landmark name labels

### Data

All data is pre-computed seed data — no backend required for MVP.

- `src/data/philadelphiaTracts.js` — 25+ census tracts with polygon boundaries and outcome stats
- `src/data/philadelphiaBuildings.js` — 100+ landmarks
- `src/data/seedCityData.js` — pre-computed innovation + outcome scores per tract
- `src/data/config.js` — CBS weights, mismatch thresholds, color palettes, scene camera defaults

### UI Structure

- `PhiladelphiaApp.jsx` — top-level layout; renders the map + all UI panels
- `PhilaCesiumMap.jsx` — Cesium viewer setup (CartoDB Voyager basemap, 800m alt, −30° pitch)
- `src/ui/` — Philadelphia Pilot panels: `InspectPanel.jsx` (CBS gauge + insight), `TractList.jsx` (searchable selector), `RegionSnapshot.jsx` (city stats), `CompareMode.jsx` (modal overlay), `Legend.jsx`
- `src/ui/phila.css` — all Philadelphia-specific styles (~1000 lines)

### Cesium Setup

- Base layer: CartoDB Voyager (no Ion token required)
- Optional toggles: Google Photorealistic 3D Tiles (`VITE_GOOGLE_MAPS_API_KEY`), OSM Buildings, Cesium Ion assets (`VITE_CESIUM_ION_TOKEN`)
- Default camera: University City, Philadelphia — `-75.195°W, 39.952°N`, 8 km altitude, −45° pitch

## Environment Variables (`.env`)

```
VITE_CESIUM_ION_TOKEN=     # Optional; CartoDB works without it
VITE_GOOGLE_MAPS_API_KEY=  # Optional; enables Google Photorealistic 3D Tiles toggle
```
