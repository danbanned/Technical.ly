# 01 · Repo Map

**Repo:** github.com/danbanned/Technical.ly (`main`, commit `bd941ad`)
**Live app:** technical-ly.vercel.app
**Audited:** Sept 29, 2026

This maps every part of the repo, what it does, and whether the live Philadelphia app uses it. If a file isn't marked **LIVE**, it doesn't affect what people see on the map.

---

## How the live app runs

```
index.html
 └─ src/main.jsx
     └─ src/App.jsx                      renders only <PhiladelphiaApp />
         └─ src/PhiladelphiaApp.jsx       the whole pilot
             ├─ PhilaCesiumMap.jsx        3D viewer, basemap, 3D building tilesets
             ├─ PhiladelphiaLayers.jsx    draws the data layers (towers, circles, labels)
             │    ├─ reads  src/data/philadelphiaBuildings.js   (15 places)
             │    ├─ reads  src/data/philadelphiaTracts.js      (11 tracts)
             │    └─ runs   src/core/cbs.js                      (score math, in the browser)
             ├─ ui/LayerToggles.jsx       left panel checkboxes
             ├─ ui/TractList.jsx          keyboard tract list
             ├─ ui/RegionSnapshot.jsx     "Philadelphia, PA" totals card
             ├─ ui/InspectPanel.jsx       click-a-place / click-a-tract details
             ├─ ui/InsightsCard.jsx       "Top opportunity gaps" list
             ├─ ui/CompareMode.jsx        side-by-side tracts
             ├─ ui/Legend.jsx             color key
             ├─ ui/StoryFeed.jsx          auto-generated "stories" per tract
             └─ hooks/useNarration.js     AI narration (off unless VITE_ENABLE_NARRATION=true)
```

**No economic data is fetched while the app runs.** Every number on the map is typed directly into the two `src/data/` files and bundled into the app.

---

## Folder by folder

### Root

| File | What it is | Status |
|---|---|---|
| `index.html`, `vite.config.js`, `package.json` | Vite + React build. `vite-plugin-cesium` copies Cesium's files to `/cesium/`. | LIVE |
| `vercel.json` | Vercel config: SPA rewrite (skips `/api`, `/cesium`, `/data`) and cache headers | LIVE |
| `netlify.toml` | Leftover Netlify config | Unused |
| `.env.example` | List of environment variables | Reference |
| `insightEngine.js` (root) | Older duplicate of `src/core/insightEngine.js` | Unused |
| `CLAUDE.md`, `ONECITY.MD`, `plan*.md`, `technical-me-build-plan.md`, `building_shape_library.md`, `Satellite_District_Generator.md`, `ssh_ai.md` | Planning and prompt notes | Docs only |

### `api/`

| File | What it is | Status |
|---|---|---|
| `api/narrate.js` | Vercel serverless function that sends tract facts to the Anthropic API (Claude Haiku 4.5) and returns 2–3 sentences. Returns 503 if `ANTHROPIC_API_KEY` isn't set. | Deployed, but the app only calls it when `VITE_ENABLE_NARRATION=true`, so it's **off** |

### `src/data/`: where every number on the map comes from

| File | What it holds | Real or sample | Status |
|---|---|---|---|
| `philadelphiaBuildings.js` | 15 map places: 4 universities, 4 hospitals, 1 VC district, 3 incubators, 1 transit hub, 2 "gap" markers. Each has coordinates, a hand-set `height`, a color, a shape, and numbers for R&D, deals, patents, and startup jobs. It also defines a second, unused copy of the score config and 11 other cities. | Coordinates are roughly real. **All numbers are placeholders** (`synthetic: true`). | LIVE |
| `philadelphiaTracts.js` | **11** tracts with a neighborhood name, a centroid, a **rectangle** polygon, income, unemployment (a fraction, e.g. `0.085`), and `mobilityScore`. | **All sample**, stamped `2024-01-15`. The rectangles aren't real tract shapes. | LIVE |
| `config.js` | `DATA_SOURCES` labels for the "Sample data" stamp, the **score weights the app actually uses** (`CBS_CONFIG`), color palettes, and the starting camera position | Labels only. The app only ever shows `syntheticSeed`. | LIVE |
| `feedArticles.js` | Builds story cards from the insight engine's output | Generated text | LIVE |
| `seedCityData.js` | Profiles for 11 cities | Hand-typed | Unused by the pilot (only the old multi-city view) |

### `src/core/`: logic

| File | What it does | Status |
|---|---|---|
| `cbs.js` | Adds up R&D and deals within 1.5 km of each tract, normalizes them, blends them with income, unemployment, and mobility, and outputs `innovationIndex`, `outcomeIndex`, `cbs` (0–10), and `mismatchAlert`. Also contains `findTopGaps()` and the summary text. | LIVE |
| `insightEngine.js` | Puts each tract into a category (`opportunity_gap`, `aligned_benefit`, `strong_local`, `underserved`) and writes a headline | LIVE |
| `narrateInsight.js` | Prompt building and the guard that blocks banned wording for AI narration | Loaded; the network call is off |
| `solutionConnector.js` | Calls `api.anthropic.com` **directly from the browser** | Present. Should be removed, because a key used in browser code is visible to anyone. |

### `src/map/`: turns data into map shapes

| File | Draws | Status |
|---|---|---|
| `layers/innovationLayer.js` | 3D towers for categories `universityResearch`, `healthcareAnchor`, `transitHub`, `healthcareGap` | LIVE |
| `layers/investmentLayer.js` | 3D towers for `ventureCapital` and `startupIncubator` | LIVE |
| `layers/mobilityHeatmapLayer.js` | **Pulsing circles**, one per tract, colored by `mobilityScore` | LIVE |
| `layers/labelLayer.js` | Name labels over each place | LIVE |
| `interactions.js` | Turns clicks into a selected tract or building | LIVE |
| `viewer.js` | Older viewer setup | Unused |

### `src/ui/`, `src/store/`, `src/hooks/`, `src/utils/`

| File | Status |
|---|---|
| `ui/*` listed in the tree above | LIVE |
| `ui/DataStamp.jsx` | LIVE. Shows the "Sample data" badge. |
| `ui/PhiladelphiaPilot.jsx`, `ui/SolutionConnector.jsx`, `ui/SolutionTour.js` | Not used by `PhiladelphiaApp` |
| `store/useMapStore.js` | LIVE. Zustand store for layer visibility, selection, and the building-layer toggles. `fetchCityStats()` is only used by the old view. |
| `hooks/useNarration.js` | LIVE, but only shows the static insight text unless narration is on |
| `hooks/useHoverImmerse.js`, `hooks/useImmersionController.js` | Old multi-city view only |
| `utils/buildingShapes.js` | LIVE. The tower shape styles (spire, terraced, blade…). |
| `utils/colorScales.js`, `mismatchLogic.js`, `timeData.js`, `particleConfigs.js`, `transitionHelpers.js`, `cesiumHelpers.js` | Mostly the old view |

### `src/components/`: the old multi-city "editorial" app (not live)

`Globe/`, `Immersive/`, `Layout/`, `Editorial/`, `UI/` are all **dormant**. `App.jsx` no longer renders them. The one exception is `Globe/Layers/PhiladelphiaLayers.jsx`, which **is live**. The timeline slider (`Globe/Controls/TimeSlider.jsx`) lives here, so it isn't in the pilot.

### `public/data/`: static files served by the site

| File | What it holds | Status |
|---|---|---|
| `census_tracts/philadelphia_tracts.geojson` | **Real** 2022 TIGER shapes for all 408 tracts. Every metric is the same default (income 45000, unemployment 0.08, mobility 50, CBS 5.0). | **Not loaded by the app** |
| `city-stats/*.json` (5 cities) | Hand-typed city totals | Old view only |
| `baltimore_*.geojson/json`, `states_dynamism.geojson` | Baltimore places and deals, plus PA and MD dynamism scores. No source listed. | Old view only |

### `scripts/`: offline data tools (not connected to the app)

| File | What it does | Output | Status |
|---|---|---|---|
| `fetch_phila_tracts.py` | Downloads **Census ACS 2022 5-year** income (B19013) and unemployment (B23025), **TIGER 2022** tract shapes, and **Opportunity Atlas** mobility (a hand-downloaded file) | `scripts/phila_tracts_full.geojson`: **408 tracts of real data**, with problems (see 02) | **Not connected to the app** |
| `enrich_buildings.py` | Pulls OpenStreetMap building footprints, tags each with its tract's metrics, and uploads them to Cesium ion | Became ion asset `4980304` ("Enriched Buildings") | The asset is live. **Which tract file it used isn't recorded.** It references `export_tracts_geojson.py`, which doesn't exist. |

---

## External services

| Service | Used for | Key needed |
|---|---|---|
| CARTO Voyager (or Esri World Street Map when there's no key) | Street basemap | `VITE_CARTO_API_KEY` (optional) |
| Cesium ion | OSM Buildings, Enriched Buildings (asset 4980304) | `VITE_CESIUM_ION_TOKEN` |
| Google Photorealistic 3D Tiles | Photoreal city view | `VITE_GOOGLE_MAPS_API_KEY` |
| Anthropic API | Narration (off) | `ANTHROPIC_API_KEY` (server) |

---

## The one-sentence summary for the team

> The live map shows **hand-typed sample numbers** for 15 places and 11 rectangular tracts. A script that pulls **real data for all 408 tracts** exists, but its output was never connected. None of the numbers come from HERD or Venture Monitor yet.
