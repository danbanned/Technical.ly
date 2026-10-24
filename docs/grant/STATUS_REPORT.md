# technical.me (Philadelphia Pilot): Status Report for the Cesium Ecosystem Grant

**Prepared:** 2026-10-06
**Repo:** https://github.com/danbanned/Technical.ly (`main`, HEAD `857ccd1`)
**Live app:** https://technical-ly.vercel.app

**How this report was checked.** Every statement comes from one of these:
- the repo files on disk
- `git log --date=short`
- the live site, fetched on 2026-10-06
- the GitHub API, fetched on 2026-10-06
- a vendor web page, with its URL and the date checked

Anything that couldn't be confirmed is marked **UNKNOWN — ask: …**.

**Framing rule (client meeting, 2026-09-29).** The map shows data. It does not draw conclusions, claim cause, or combine datasets into a score. Anything in the app that breaks this rule is marked **TO BE REMOVED**. Those items are not counted as deliverables.

**Where the audit documents are.** The request pointed to `docs/data-audit/*.md`, but **that folder isn't in the repo** or in any branch of git history. The README links to it as well (`docs/data-audit/02_DATA_BREAKDOWN.md`), so that link is broken. The audit files dated 2026-09-29 were found in the author's local `Downloads` folder:
- `01_REPO_MAP.md`
- `02_DATA_BREAKDOWN.md`
- `03_DATA_EXPLAINED.md`
- `05_MAP_SPEC.md`
- `06_SOURCE_OF_TRUTH.md`
- `source_of_truth.json`

There is no `04_*`. This report uses those copies. **UNKNOWN — ask Daniel (repo owner) whether these are the final versions and whether they should be committed to `docs/data-audit/`.**

---

## Part 1: Current system status

### 1.1 What is deployed and where

| Item | Finding | Evidence |
|---|---|---|
| Host | **Vercel** | `vercel.json` (SPA rewrite and cache headers); `api/narrate.js` and `api/solutions.js` are written as Vercel serverless functions; the live response has `Server: Vercel`, `X-Vercel-Cache: HIT`, and an `X-Vercel-Id` starting with `iad1` (Vercel's US-East region) |
| Live URL | https://technical-ly.vercel.app returns HTTP 200 | `curl`, 2026-10-06 |
| Deployed version | Probably HEAD `857ccd1` (2026-09-29). The live CSS file is `index-C6oGuFNB.css`, and a clean build of HEAD produces a file with the same hash. `/api/solutions` was added in `857ccd1` and exists on the live site. The JS hash differs, which is expected because keys are baked in at build time. **The exact deployed commit is UNKNOWN — ask Daniel to check Vercel → Project → Deployments.** | Scratch build of `git archive HEAD`; live asset names |
| Keys in the live build | Live bundle shows `VITE_CESIUM_ION_TOKEN:"set"`. A Google Maps key is compiled in. The CARTO keyed URL is present and the Esri fallback is absent, so `VITE_CARTO_API_KEY` was set. `VITE_ENABLE_NARRATION` is `unset (narration off)`. | Strings in `/assets/index-C7rRDHeY.js` (key values not copied) |
| Server-side AI | **Off.** `POST /api/solutions` returns `503 {"error":"ANTHROPIC_API_KEY not configured on this deployment"}`. `GET /api/narrate` returns 405, so the function exists but isn't configured. | `curl`, 2026-10-06 |
| Vercel account, team and plan | **UNKNOWN — ask Daniel** (who owns the Vercel project, and whether it's a personal Hobby account or a Launchpad team) | Not recorded in the repo |
| Other deploy config | `netlify.toml` is left over and unused (README, audit 01) | `netlify.toml` |
| Local working tree | **Doesn't build.** Uncommitted edits remove `CBS_CONFIG` from `src/data/config.js`, but `src/core/cbs.js:1` and `PhiladelphiaLayers.jsx:6` still import it, so `vite build` fails with a Rollup missing-export error. The committed HEAD builds cleanly. This doesn't affect the live site, but don't deploy from this working tree as it is. | `npx vite build` into a scratch folder, 2026-10-06 |

### 1.2 Map layers and panels

Labels used below:
- **REAL**: a real external source.
- **SAMPLE**: hand-typed values, flagged `synthetic: true`.
- **PLACEHOLDER**: the same filler value on every record.
- **DERIVED**: computed in the browser from other values. A DERIVED value built from SAMPLE inputs is still sample data.

All 11 tracts in `src/data/philadelphiaTracts.js` and all 15 places in `src/data/philadelphiaBuildings.js` are flagged `synthetic: true`. The places are 4 universities, 4 hospitals, 1 VC district, 3 incubators, 1 transit hub and 2 "gap" markers. The tracts are drawn as **rectangles**, not real tract shapes. The header shows a "Sample Data" badge (`PhiladelphiaApp.jsx:42`).

#### Map layers (left-panel toggles in `src/ui/LayerToggles.jsx`)

| Toggle / visual | What it shows | Source file → field | Label | Framing status |
|---|---|---|---|---|
| **Innovation**: blue/cyan and pink towers, a gray slab, short gray blocks | 4 universities, 4 hospitals, 30th Street Station, 2 "GAP" markers | `philadelphiaBuildings.js` → `lat`, `lon`, `height`, `shape`, `color`, `category`; `map/layers/innovationLayer.js` (height = max(`height` × 8, 24) m × slider) | SAMPLE (heights typed by hand, not calculated from dollars) | Towers are kept as a concept but must be rebuilt from HERD (spec phase F). **GAP markers and 30th Street Station: TO BE REMOVED.** Hospitals become pins only. |
| **Investment**: orange towers | 1 "Center City VC District" and 3 incubators | `philadelphiaBuildings.js` → `category` `ventureCapital` / `startupIncubator`, `dealCount`; `map/layers/investmentLayer.js` | SAMPLE | **TO BE REMOVED from the map.** It uses the same tower form as research funding. In the spec, VC moves to the city panel as a number. |
| **Mobility**: pulsing colored circles | One circle per sample tract (11) | `philadelphiaTracts.js` → `mobilityScore`, `polygon`; `map/layers/mobilityHeatmapLayer.js` | SAMPLE | **Pulse animation: TO BE REMOVED** (it shows mobility a second time). Replace with a flat tract fill on the 408 real tracts (spec phase D). |
| **Labels** | Place names | `philadelphiaBuildings.js` → `name`; `labelLayer.js` | SAMPLE (names of real places) | Keep (place names only) |
| Basemap (always on) | Street map | CARTO Voyager when `VITE_CARTO_API_KEY` is set (it is on the live site), otherwise Esri World Street Map (`PhilaCesiumMap.jsx:223-235`) | REAL (third-party tiles) | Keep |
| **OSM Buildings** (+ "OSM height" 1–10× slider) | Gray OSM 3D buildings | Cesium ion asset 96188 via `createOsmBuildingsAsync()` (`PhilaCesiumMap.jsx` OSM effect) | REAL (context) | Keep in neutral gray. The height exaggeration slider distorts real heights. Whether to keep it is a team call: **UNKNOWN — ask the team / Technical.ly.** |
| **Google 3D Tiles** | Photorealistic city | Google Map Tiles API, key in `VITE_GOOGLE_MAPS_API_KEY` | REAL (context) | Keep (backdrop only) |
| **Enriched Buildings** | About 574k OSM footprints carrying tract attributes (count from the toggle tooltip) | Cesium ion asset `4980304`, built by `scripts/enrich_buildings.py`. Which tract file was used is **not recorded**. The script itself refers to a different asset, `4979179` (`fetch_phila_tracts.py:207`). | Footprints REAL (OSM). Attributes **UNKNOWN — ask Daniel which tract file was used for the upload.** | **TO BE REMOVED** (spec §2) |
| ↳ **Economic Color** | Buildings colored by `mobilityScore` / `innovationIndex` / type; magenta = "Mismatch Alert" | `PhilaCesiumMap.jsx` style builders (`:36-116`); `Legend.jsx:7-57` | DERIVED | **TO BE REMOVED** |
| ↳ **Height test** | Debug style, color by `height_m` | `PhilaCesiumMap.jsx` | REAL (OSM height) | Debug tool, not a deliverable |
| **Building height** slider (½–8×) | Scales the sample towers | store `philaBuildingHeightScale` | — | Remove when towers are calculated from data (heights must come from data) |
| **Color-blind safe** | Switches palette | `config.js` `PALETTES` | — | Keep (accessibility) |
| **Connect mode** | Auto-starts the "Solution Connector" tour when a tract is picked | `LayerToggles.jsx`, `SolutionTour.js` | DERIVED | **TO BE REMOVED** (recommendations) |
| Selected-tract outline and "CBS x / 10" billboard | Outline of the picked tract plus a score badge | `PhiladelphiaLayers.jsx:226`, `PhilaCesiumMap.jsx:425` | DERIVED | Outline: keep. **Score billboard: TO BE REMOVED** |

#### Panels

| Panel | What it shows | Source → field | Label | Framing status |
|---|---|---|---|---|
| Header badge | "Sample Data" | `PhiladelphiaApp.jsx:42` | — | Keep until data is live |
| `DataStamp` on cards | "Sample data — not for production use" | `config.js` `DATA_SOURCES.syntheticSeed` | — | Keep |
| **Region Snapshot** ("Philadelphia, PA") | R&D total, active deals, universities count | Sums and a count over `philadelphiaBuildings.js` `rdSpend` / `dealCount` / `category` (`RegionSnapshot.jsx:8-10`) | DERIVED from SAMPLE | Replace with HERD and Venture Monitor values plus source and year (spec §4) |
| ↳ Avg mobility with "High / Moderate / Low" rating | Mean `mobilityScore` over 11 tracts | `RegionSnapshot.jsx:11`, `MobilityRating` | DERIVED from SAMPLE | **Rating words: TO BE REMOVED** (interpretation). Spec drops "Avg mobility". |
| ↳ Mismatch count / "Balanced" | Count of `mismatchAlert` | `RegionSnapshot.jsx:30` | DERIVED | **TO BE REMOVED** |
| **Tract list** | Tracts sorted by name, with score | `TractList.jsx:37` → `neighborhood`, `cbs` | DERIVED | List: keep. **Score: TO BE REMOVED** |
| **Inspect (tract)**: income, unemployment, mobility | Stored values | `philadelphiaTracts.js` | SAMPLE | Keep the fields, switched to real ACS / Atlas data with ±MOE |
| ↳ Community Benefit Score gauge | 0–10 composite | `core/cbs.js` | DERIVED | **TO BE REMOVED** |
| ↳ R&D and VC deals "within 1.5 km" | Sum of sample places near the tract | `cbs.js:26` `aggregateNearbyInnovation` | DERIVED | **TO BE REMOVED** (ties two datasets to one tract) |
| ↳ Bars: Economic Mobility, Capital Growth, Dynamism, Innovation | Capital Growth = (1 − unemployment) × 100; Dynamism = average; Innovation = index × 100 | `InspectPanel.jsx:109-114, 183-185` | DERIVED | **TO BE REMOVED** (mislabeled or invented) |
| ↳ Insight badge and headline | e.g. "High innovation nearby — resident outcomes lag" | `insightEngine.js:101-154` | DERIVED | **TO BE REMOVED** |
| ↳ "AI Analysis" narration | Claude-written text | `narrateInsight.js` → `/api/narrate` (off on live) | DERIVED (generated) | **TO BE REMOVED** |
| **Inspect (place)** | `stats`, `vitality` bars | `philadelphiaBuildings.js` | SAMPLE | Stats are replaced by HERD values. **Vitality bars: TO BE REMOVED** |
| **Top opportunity gaps** card | Top 3 by `innovationIndex − outcomeIndex` | `InsightsCard.jsx`, `cbs.js:81` | DERIVED | **TO BE REMOVED** |
| **Story feed** | One headline card per tract | `StoryFeed.jsx`, `feedArticles.js`, `insightEngine.js` | DERIVED | **TO BE REMOVED** |
| **Compare mode** | Two tracts side by side: score, mismatch flag, income, unemployment, mobility, R&D/VC nearby, indices | `CompareMode.jsx:27-43` | Mixed | Raw fields: keep. **Score, mismatch, nearby sums and indices: TO BE REMOVED** |
| **Legend** (Building Color, filter / hover fly-to / billboard) | Economic Color categories, including "Mismatch Alert" with causal text ("residents see little economic benefit") | `Legend.jsx:7-57` | Static text | **Economic Color legend: TO BE REMOVED.** A per-layer what / source / year legend is needed (spec §4) |
| **Solutions** (inside the Legend when a tract is selected) | 4 suggested "local actions" | `SolutionConnector.jsx` (imported by `Legend.jsx:5`), `core/solutionConnector.js` rule templates, or `/api/solutions` (off on live) | DERIVED | **TO BE REMOVED** (recommendations) |
| Time-of-day sky | Sun position from real local time | `PhilaCesiumMap.jsx` clock | — | Visual only. Keep or drop. |

### 1.3 External services the code calls

| Service | Used for | Called from | Env var | Side |
|---|---|---|---|---|
| CARTO basemaps (`basemaps.cartocdn.com`) | Voyager street tiles | `PhilaCesiumMap.jsx:223` | `VITE_CARTO_API_KEY` (optional) | Client (`VITE_*`, visible in the bundle) |
| Esri World Street Map (`server.arcgisonline.com`) | Fallback basemap when there's no CARTO key | `PhilaCesiumMap.jsx:232` | none | Client |
| Cesium ion (`api.cesium.com`, asset 96188 OSM Buildings, asset 4980304 Enriched Buildings) | 3D tiles | `PhilaCesiumMap.jsx:188, 313, 396` | `VITE_CESIUM_ION_TOKEN` | Client (`VITE_*`) |
| Google Map Tiles API (`tile.googleapis.com`) | Photorealistic 3D Tiles | `PhilaCesiumMap.jsx:357` | `VITE_GOOGLE_MAPS_API_KEY` | Client (`VITE_*`, key is in the live bundle). **Whether the key is restricted by HTTP referrer is UNKNOWN — ask whoever owns the Google Cloud project.** |
| Anthropic Messages API (`api.anthropic.com`, `claude-haiku-4-5-20251001`) | Narration and Solutions | `api/narrate.js`, `api/solutions.js` (via `/api/*` from `narrateInsight.js:160`, `solutionConnector.js:142`) | `ANTHROPIC_API_KEY` (server); gated by `VITE_ENABLE_NARRATION` (client flag) | **Server** (Vercel function). Not set on the live site. |
| `window.claude` | Narration fallback inside Claude artifacts | `narrateInsight.js:176` | none | Client (only runs if the flag is on) |
| Google Fonts | Inter and JetBrains Mono | `index.html` | none | Client |
| Census API (`api.census.gov`) and TIGER (`www2.census.gov`) | ACS 2022 5-year, tract shapes | `scripts/fetch_phila_tracts.py:53, 63` (offline) | `--census-key` CLI flag. `.env` also has `CENSUS_PHILLY_API_KEY`, which isn't in `.env.example` and isn't read by any code. | Offline script |
| Opportunity Insights (`opportunityinsights.org`) | `tract_outcomes.zip` (manual download) | `fetch_phila_tracts.py:16, 28` | none | Offline |
| Overpass API mirrors (kumi.systems, overpass-api.de, mail.ru) via `osmnx` | OSM building footprints | `scripts/enrich_buildings.py:85-94` | none | Offline |
| Geofabrik | Fallback Pennsylvania `.pbf` download (manual) | `enrich_buildings.py:119` (printed instruction) | none | Offline |
| Cesium ion REST upload | Upload enriched buildings | `enrich_buildings.py:58, 323` | `--ion-token` CLI flag | Offline |
| Unused | `CLIENT_ID`, `CLIENT_SECRETE` in `.env.example` and `.env` | No code reads them | — | **UNKNOWN — ask Daniel what these were for** |

### 1.4 Visibility and license

| Question | Answer | Evidence |
|---|---|---|
| Is the repo public? | **Yes.** `"private": false`, `"visibility": "public"`, created 2026-05-12, last push 2026-09-29 | GitHub API `repos/danbanned/Technical.ly`, 2026-10-06 |
| LICENSE file? | **No.** There's no `LICENSE*` file in the repo root, and the GitHub API reports `"license": null` | `ls`, GitHub API |
| `package.json` "license"? | **No field.** The package is `"private": true` | `package.json` |
| Repo owner | Personal account `danbanned`, not a Launchpad organization | remote URL |

Because the repo has no license, the code is "all rights reserved" by default, even though the repo is public. Part 5 adds a "License needed" section to the README.

---

## Part 2: Deliverables done so far

No deadlines were set until the 2026-09-29 presentation to Technical.ly's editorial director, so that meeting is treated as the first checkpoint.

**About authors.** Every commit uses the email `Djohn0082@launchpadphilly.org`. One commit is under the name "danbanned" and the rest are under "Daniel", so git shows **one contributor**. The audit docs name other team members (Yara, Danny). Their work doesn't appear in git: **UNKNOWN — ask the team lead.**

**About duplicates.** Commits `9866f77` and `2f38ca0` are duplicates of `bd941ad` and `77ab50a`, with the same messages. They exist only on branch `backup/pre-pbf-removal`.

### 2.1 Dated commit table (newest first, `git log --date=short`)

#### On or after 2026-09-29

| Date | What was completed | File(s) | Evidence |
|---|---|---|---|
| uncommitted | Local edits, **not committed**: explanatory comments added to `cbs.js`, `config.js`, `feedArticles.js` and three hooks; `CBS_CONFIG` removed from `config.js` (this **breaks the build**); new `src/data/buildings.js`, `src/data/cbs.js`, `DATA.MD`, `HOOKS.MD`; three `.patch` files | see `git status` | none (working tree) |
| 2026-09-29 | Data-audit documents 01, 02, 03, 05, 06 and `source_of_truth.json`. These define the source-of-truth rules and the plan for phases B–G. Off-repo until 2026-10-23. | `docs/data-audit/*`, `src/data/source_of_truth.json` | File dates 2026-09-29; added to the repo in `f2cd5d3` |
| 2026-09-29 | AI "Solutions" moved to a server-side function (key no longer in the browser); OSM and Enriched layers restacked; Mantua tract fixed; README with architecture and data-status tables added | `api/solutions.js`, `src/core/solutionConnector.js`, `src/data/philadelphiaTracts.js`, `src/store/useMapStore.js`, `src/ui/StoryFeed.jsx`, `README.md`, `.env.example` | `857ccd1` |
| 2026-09-29 | CARTO watermark fixed (keyed CARTO, or Esri with no key); narration 503s fixed; GPU memory limits added (tile cache caps, error handling) | `src/PhilaCesiumMap.jsx`, `src/core/narrateInsight.js`, `src/main.jsx`, `src/store/useMapStore.js`, `vercel.json`, `.env.example`, `.gitignore` | `bd941ad` (duplicate `9866f77` on `backup/pre-pbf-removal`) |

#### Before 2026-09-29

| Date | What was completed | File(s) | Evidence |
|---|---|---|---|
| 2026-06-30 | 408 real TIGER tract shapes added (metrics are a placeholder constant); tract file updated; story-feed button moved | `public/data/census_tracts/philadelphia_tracts.geojson`, `src/data/philadelphiaTracts.js`, `src/ui/phila.css` | `77ab50a` (duplicate `2f38ca0`) |
| 2026-06-28 | Fix: Stories button disappeared after selecting a tract | `src/ui/StoryFeed.jsx` | `84c92b0` |
| 2026-06-28 | Story feed open/close toggle | `src/ui/StoryFeed.jsx`, `phila.css` | `ef13802` |
| 2026-06-28 | Center story feed overlay; old editorial feed retired; `DataStamp` component | `StoryFeed.jsx`, `feedArticles.js`, `DataStamp.jsx`, removed `articles.js` / `ArticleFeed.jsx` | `2c59577` |
| 2026-06-28 | Fix: startup crash; `ErrorBoundary` added around panels | `PhiladelphiaApp.jsx`, `ErrorBoundary.jsx`, others | `1379eb5` |
| 2026-06-27 | Sky lighting from real local time | `PhilaCesiumMap.jsx` | `93a9bff` |
| 2026-06-27 | Data staleness reporting in narration | `narrateInsight.js`, `insightEngine.js`, `config.js` | `8817143` |
| 2026-06-27 | AI narration pipeline (`/api/narrate`) with a banned-phrase guard | `api/narrate.js`, `narrateInsight.js`, `useNarration.js`, `InspectPanel.jsx` | `f486569` |
| 2026-06-27 | "Sample data" stamp on all remaining cards | `InsightsCard.jsx`, `RegionSnapshot.jsx` | `2589993` |
| 2026-06-27 | Click-to-pin tract, docked card, billboard, tract outline highlight | `PhilaCesiumMap.jsx`, `PhiladelphiaLayers.jsx`, `InspectPanel.jsx`, store | `8b238aa` |
| 2026-06-25 | Legend billboard as a React overlay | `Legend.jsx`, `phila.css` | `d35c4f5` |
| 2026-06-25 | Fix: legend expand (pointer events, wrapping) | `phila.css` | `143ebb9` |
| 2026-06-24 | Fix: legend expand button class | `Legend.jsx`, `phila.css` | `9c970b7` |
| 2026-06-24 | Interactive economic legend: filter, expand, hover fly-to | `Legend.jsx`, `PhilaCesiumMap.jsx`, store | `e7a7a79` |
| 2026-06-24 | Investment arcs and mobility circles hidden in Economic Color mode | `PhiladelphiaLayers.jsx` | `008654a` |
| 2026-06-24 | Real-data scripts (ACS / TIGER / Atlas → 408-tract GeoJSON; OSM building enrichment → Cesium ion); Enriched Buildings tileset and Economic Color; Solution Connector; Vercel config | `scripts/fetch_phila_tracts.py`, `scripts/enrich_buildings.py`, `scripts/phila_tracts_full.geojson`, `PhilaCesiumMap.jsx`, `LayerToggles.jsx`, `solutionConnector.js`, `SolutionConnector.jsx`, `vercel.json`, others | `253f82a` |
| 2026-06-09 | Philadelphia pilot built: Cesium map, 15 places, 11 tracts, CBS engine, insight engine, layers, all panels | 30 files under `src/` | `8221209` |
| 2026-06-06 | Earlier multi-city view trimmed ("minimize the map"); build plan doc | `ONECITY.MD`, `technical-me-build-plan.md`, `Immersive/*` | `605faaa` |
| 2026-05-30 | Multi-landmark integration (earlier multi-city view) | `seedCityData.js`, `CinematicTour.jsx`, `GlobeViewer.jsx`, others | `af03da0` |
| 2026-05-20 | Initial import: Vite + React + Cesium scaffold, multi-city editorial app, Baltimore / state seed data | 68 files | `35076f2` |

### 2.2 Built to date (works now, fits the framing rule)

Only capabilities that work on the live site today and that the 9/29 rule allows to stay are listed here.

| Capability | How to see it |
|---|---|
| 3D Cesium map of Philadelphia, deployed on Vercel | https://technical-ly.vercel.app |
| Street basemap with no watermark (CARTO keyed, Esri fallback) | Always on; `PhilaCesiumMap.jsx:223-235` |
| OSM 3D buildings as neutral context | Toggle **OSM Buildings** (needs ion token, which the live site has) |
| Google Photorealistic 3D Tiles as context, one at a time with OSM | Toggle **Google 3D Tiles** (key set on the live site) |
| GPU memory safeguards (tile cache caps, context-loss message) | `PhilaCesiumMap.jsx`, commit `bd941ad` |
| Click a tract or place to select it, Escape to clear; tract outline highlight | Click on the map; `PhilaCesiumMap.jsx`, `PhiladelphiaLayers.jsx` |
| Keyboard-accessible tract list | Left rail, **TractList** |
| Color-blind safe palette toggle | Toggle **Color-blind safe** |
| "Sample data" labeling on the header and every card | Header badge; `DataStamp.jsx` |
| Panel error boundaries (one failing panel doesn't crash the app) | `ErrorBoundary.jsx` |
| AI key kept server-side (`/api/*` functions; no key in the browser) | `api/narrate.js`, `api/solutions.js`. The feature itself is TO BE REMOVED, but the server-side key pattern is reusable. |
| Repo documentation of architecture and data status | `README.md` (commit `857ccd1`) |

Everything else that works on the live site is either **SAMPLE data** (towers, circles, panel numbers: they work, but aren't real data) or **TO BE REMOVED** (score, gaps, story feed, Economic Color, Solutions, narration). None of it is counted here.

### 2.3 Started but not finished

| Item | State now | What's left |
|---|---|---|
| Real tract data pipeline (`scripts/fetch_phila_tracts.py` → `scripts/phila_tracts_full.geojson`, 408 tracts) | Runs and produces 408 tracts, **but the app doesn't load it**. Checked in the file: 25 tracts with `medianIncome` 0 (Census missing codes clipped to 0), 20 with unemployment filled as `8.0`, 1 mobility filled as `40`, mobility replaced by income percentile where Atlas is missing (`:182`), `innovationIndex` = 0.5 for all. No flags mark which values were filled. | Spec §6: treat sentinel codes as null; remove `clip`/`fillna`; pull MOE fields; one unit (percent); separate ACS and Atlas output files with a `meta` block; load the files through `loadDataset()` + `sourceGate()` |
| Opportunity Atlas mobility | The script can read `tract_outcomes_simple.csv` (manual download). It joins 2010 tract IDs to 2020 shapes **without a crosswalk**. | Write `fetch_atlas.py` with the Census 2020↔2010 tract relationship file; record matched / split / merged counts |
| Real tract shapes | `public/data/census_tracts/philadelphia_tracts.geojson` has 408 real TIGER shapes, but **every metric is a constant** (income 45000, etc.), and no code loads the file | Draw flat choropleths on these shapes (spec phase D) |
| Source-of-truth registry and `sourceGate()` | Written as a draft in `06_SOURCE_OF_TRUTH.md` / `source_of_truth.json`; **not in `src/`** (`grep` finds no `sourceGate` in the repo) | Spec phase B: add `src/data/source_of_truth.json` and `src/core/sourceGate.js`; add the CI checks |
| HERD university R&D | Not pulled; status `not_sourced` | Write `fetch_herd.py`; choose the fiscal year (question 4 for Technical.ly); calculate tower heights as √$ (phase F) |
| VC (Venture Monitor) | Not pulled; proprietary | Technical.ly permission; city panel numbers (phase G) |
| Hospitals as pins | Hospitals are currently sample towers | Source locations (OSM `amenity=hospital`); pins only |
| Removing items that break the framing rule | Not started in committed code. The uncommitted working tree removed `CBS_CONFIG` from `config.js` without updating its importers, which breaks the build. | Spec phase E: remove everything marked TO BE REMOVED, then fix the build |
| Enriched Buildings provenance | Asset `4980304` is live, but its source tract file isn't recorded; the script references a missing `export_tracts_geojson.py` and a different asset ID (`4979179`) | Retire per spec, or rebuild with a recorded input |
| Temporary debug logging | `[TileDebug]` fetch wrapper and console logs, marked TEMP | Remove (`src/main.jsx:1-10`, `PhilaCesiumMap.jsx:10-21`) |
| Per-layer legend (what / source / year) | Not built | Spec §4 |
| Usability check with someone outside the team | Not done | Spec §7 acceptance criterion |

---

## Part 3: Resources used so far

The project had no cash budget. It ran on resources Launchpad Philly provides plus free service tiers.

### 3.1 Launchpad-provided basics (in-kind)

| Resource | What the repo shows | Status |
|---|---|---|
| Associate time | See the effort estimate below | Estimate |
| Staff time and mentorship | Not recorded in the repo. The audit docs mention a team lead ("Yara") and a client contact at Technical.ly ("Danya"). | **UNKNOWN — ask the Launchpad program lead for staff and mentor hours** |
| Laptops | Not recorded. The audit notes GPU limits on laptops (`bd941ad`), which shows laptops were used. | **UNKNOWN — ask Launchpad IT / program lead** |
| Internet and workspace | Not recorded | **UNKNOWN — ask the Launchpad program lead** |
| Accounts on Launchpad email | The commit email is `@launchpadphilly.org` | Confirmed |

**Associate effort.** This is an estimate from commit activity, not tracked hours.

| Author (git) | Email | Commits | Active commit days | Date range |
|---|---|---|---|---|
| Daniel / danbanned (same person, same email) | `Djohn0082@launchpadphilly.org` | 24 (22 unique; 2 duplicates on a backup branch) | **10** (2026-05-20, 05-30, 06-06, 06-09, 06-24, 06-25, 06-27, 06-28, 06-30, 09-29) | 2026-05-20 → 2026-09-29 (GitHub repo created 2026-05-12) |

The 10 commit days undercount the real work. Separately, Claude Code session logs and file timestamps on the author's machine show about **45–50 hours** of activity across about 78 sessions between 2026-05-20 and 2026-09-30. That figure is still an estimate, and some of the time is likely undercounted (work before 2026-06-23 left few timestamps). Work by any other team members isn't in git: **UNKNOWN — ask the team lead.**

### 3.2 Services and accounts the project depends on

| Service | Used for | What in the repo depends on it | Plan / tier |
|---|---|---|---|
| GitHub | Code hosting (public repo) | `origin` = `github.com/danbanned/Technical.ly` | Personal account. **Plan UNKNOWN — ask Daniel** |
| Vercel | Hosting and the `/api/*` serverless functions | `vercel.json`, `api/*.js` | **UNKNOWN — ask Daniel** (whose account; Hobby or Pro). See Part 4 on whether Hobby allows this use. |
| Cesium ion | OSM Buildings (asset 96188), Enriched Buildings (asset 4980304), upload pipeline | `PhilaCesiumMap.jsx`, `LayerToggles.jsx`, `enrich_buildings.py` | **UNKNOWN — ask the owner of the ion token** (Community or Commercial) |
| CesiumJS (open-source library, Apache-2.0) | 3D engine | `package.json` `cesium ^1.142.0`, `resium`, `vite-plugin-cesium` | Free / open source |
| Google Maps Platform (Map Tiles API) | Photorealistic 3D Tiles | `PhilaCesiumMap.jsx`, `VITE_GOOGLE_MAPS_API_KEY` | **UNKNOWN — ask the Google Cloud project owner** (billing account, free-tier usage so far, key restrictions) |
| CARTO | Voyager basemap (keyed on the live site) | `PhilaCesiumMap.jsx:223`, `VITE_CARTO_API_KEY` | **UNKNOWN — ask Daniel** which CARTO key and plan |
| Esri | Fallback basemap (not used on the live site because the CARTO key is set) | `PhilaCesiumMap.jsx:232` | No key in use. **Terms for public use: see Part 4** |
| U.S. Census Bureau API and TIGER | ACS 2022 5-year, tract shapes (offline) | `scripts/fetch_phila_tracts.py` | Free API key (key present as `CENSUS_PHILLY_API_KEY` in `.env`) |
| Opportunity Insights | Opportunity Atlas `tract_outcomes` (manual download) | `fetch_phila_tracts.py --atlas` | Free download. Citation terms: see Part 4. |
| Anthropic API | Narration and Solutions (both TO BE REMOVED; not configured on the live site) | `api/narrate.js`, `api/solutions.js` | **No key set on the live site** (503). Any past usage is **UNKNOWN — ask Daniel** |
| OpenStreetMap / Overpass mirrors | Building footprints for enrichment | `scripts/enrich_buildings.py` via `osmnx` | Free, with a usage policy |
| Geofabrik | Fallback PA `.pbf` extract | `enrich_buildings.py:119` | Free download |
| Google Fonts | UI fonts | `index.html` | Free |
| npm packages | React, d3, zustand, Vite, etc. | `package.json` | Open source |
| Claude Code (Anthropic) | AI coding assistant used during development (session logs exist) | Not a runtime dependency | **UNKNOWN — ask the Launchpad program lead** which plan covers it |
| Netlify | Leftover config only | `netlify.toml` | Not used |

---

## Part 4: Resources needed (current and planned system)

### 4.0 Deadline and grant terms (read first)

From https://cesium.com/cesium-ecosystem-grants/, checked 2026-10-06:

- **Deadline:** "The current application cycle opened August 28, 2026, and will close **October 9, 2026**." That is three days after this report.
- **Award:** "unrestricted grants of $5,000–$50,000. **Individuals will not be eligible for more than $15,000.**" The high estimate below is above $15,000, so it only works if **Launchpad Philly applies as the organization**. **UNKNOWN — ask the Launchpad program lead who the applicant of record is.**
- **Payment:** "50% at grant start and 50% when it is agreed you have hit your deliverables."
- **Open source:** "preferred but not required." "Cesium does not own grant-funded IP." A timeline with deliverables is required.

### 4.1 What the planned system needs

These needs come from `05_MAP_SPEC.md` phases B–G and `source_of_truth.json`:

| Phase | Work | Needs |
|---|---|---|
| B | Registry (`source_of_truth.json`) and `sourceGate()` in `src/` | Associate time |
| C | Fix `fetch_phila_tracts.py` (sentinels → null, no `fillna`, MOE fields, percent units); new `fetch_atlas.py` with the 2010→2020 crosswalk | Associate data time; Census API (free) |
| D | Three flat tract choropleths (408 tracts) as a radio group, with the per-layer legend and new tract panel | Associate time |
| E | Remove everything marked TO BE REMOVED in Part 1 (and fix the current broken build) | Associate time |
| F | HERD towers, height = √$ | HERD pull (free); associate time |
| G | VC in the city panel | Technical.ly permission. Cost **UNKNOWN — ask Technical.ly** whether there's any licensing fee |
| §7 | Test with someone outside the team | Resident usability sessions |
| Runtime | Basemap, OSM context (Cesium ion), Google 3D Tiles (optional), Vercel hosting | See the vendor rows below |

AI narration and solutions are being removed, so **no Anthropic API cost is planned.**

### 4.2 Vendor checks

All prices below were checked on 2026-10-06. A research agent opened these pages through an automated fetch, so **spot-check the quoted numbers on the live pages before submitting.**

**Can Vercel's free Hobby plan be used by an organization? No.**
- https://vercel.com/docs/limits/fair-use-guidelines: "Hobby teams are restricted to non-commercial personal use only. All commercial usage of the platform requires either a Pro or Enterprise plan."
- The same page defines commercial use as "any Deployment that is used for the purpose of financial gain of anyone involved in any part of the production of the project, **including a paid employee or consultant writing the code**."
- https://vercel.com/legal/terms (§4): "You shall only use the Services under a Hobby plan for your personal or non-commercial use."
- Paid associates writing the code would make this commercial use, so the grant budget uses **Vercel Pro**: $20 per developer seat per month, with 1 TB/month Fast Data Transfer and 1M function invocations included (https://vercel.com/pricing).
- Vercel's open-source program (https://vercel.com/open-source-program) accepts fully open-source nonprofits, but it currently says "Applications are currently closed."
- **Which plan the live project is on now is UNKNOWN — ask Daniel.**

**Which Cesium ion plan covers a public app run by a nonprofit? Most likely the paid Commercial plan. No nonprofit plan was found.**
- https://cesium.com/platform/cesium-ion/pricing/: Community ($0) is "Personal and non-commercial use", covering "Non-commercial personal projects… Unfunded educational activities."
- A paid plan is required "If your company currently makes more than $50K in annual gross revenues or has raised funds in excess of $50K, or … if you are working on **funded educational research**, or If you exceed the usage limits of the free community account."
- Prices: Commercial is $149/mo (individual) or $524/mo (team). Premium is $499/mo or $874/mo.
- A grant-funded project run by an organization falls under the paid conditions. The page doesn't mention nonprofits. **UNKNOWN — ask Cesium (the grant program contact) whether grantees get an ion plan or a nonprofit exception, and ask Launchpad finance whether its annual revenue is over $50K.**
- The ion terms (https://cesium.com/legal/terms-of-service/) require the Cesium ion logo to be "prominently viewable to users."

**Other prices used:**

| Vendor | Fact used | URL |
|---|---|---|
| Google Map Tiles API (Photorealistic 3D Tiles) | First **1,000** root tile requests per month free (Enterprise SKU free cap; this replaced the old $200 credit); then **$6.00 per 1,000** up to 100k; "up to three hours" of tiles per root request | https://developers.google.com/maps/billing-and-pricing/pricing, https://developers.google.com/maps/billing-and-pricing/faq, https://developers.google.com/maps/documentation/tile/usage-and-billing |
| Google Maps Platform nonprofit program | Credits "starting at $250 per month" for verified Google for Nonprofits organizations. Whether they apply to 3D Tiles: **UNKNOWN — ask Google Maps Platform support** | https://developers.google.com/maps/billing-and-pricing/public-programs |
| CARTO basemaps | Free key. "Non-commercial: Up to 5M requests a month… non-profits". Commercial use gets 1M/month free. Attribution required. | https://carto.com/basemaps, https://carto.com/legal/basemap-terms/ |
| Esri (fallback basemap) | Basemap tiles "2M free then $0.15 per 1,000 tiles"; attribution required. Whether keyless public use is allowed: **UNKNOWN — ask Esri** | https://location.arcgis.com/pricing/, https://developers.arcgis.com/cesiumjs/terms-of-use/ |
| GitHub | Free plan $0. A free Team plan is available to eligible 501(c)(3) nonprofits. | https://github.com/pricing, https://github.com/solutions/industry/nonprofits |
| Census API | Key "free of charge"; a required notice line | https://www.census.gov/data/developers/guidance/api-user-guide.API_Key.html, https://www.census.gov/data/developers/about/terms-of-service.html |
| NSF HERD | Public-use files are available. "Works of the U.S. federal government" can be used freely (permissions page for NCSES publications) | https://ncses.nsf.gov/surveys/higher-education-research-development, https://ncses.nsf.gov/indicators/permissions |
| Opportunity Atlas | No formal data license found. Reprints require credit to "Opportunity Insights and the US Census Bureau". **License: UNKNOWN — ask Opportunity Insights** | https://opportunityinsights.org/data/, https://opportunityinsights.org/contact/reprints/ |
| Participant incentives | User Interviews recommends **$80/hr** for remote 1:1 sessions and **$50/hr** for remote focus groups (updated January 4, 2025) | https://userinterviews.com/blog/research-incentives-report |
| Anthropic (not budgeted) | Haiku 4.5: $1 / $5 per MTok in/out | https://platform.claude.com/docs/en/about-claude/pricing |

### 4.3 Budget (3–4 month grant)

**Shared assumptions:**
- Low = 3 months (13 weeks); high = 4 months (17 weeks).
- **Associate rate: UNKNOWN — ask the Launchpad program lead for the stipend rate.** This budget uses **$20/h (low) and $25/h (high) as placeholders only.**
- **Site traffic: UNKNOWN — ask Technical.ly** about expected visits and whether the map will be embedded in articles. This budget assumes 2,000 (low) and 20,000 (high) visits per month that turn on Google 3D Tiles, with one root request per visit.

| # | Category | What it's for | Basis (assumption × unit price) | Low | High |
|---|---|---|---|---|---|
| **In-kind (Launchpad Philly, $0 cash)** | | | | | |
| K1 | Associate supervision, staff time, mentorship | Team lead review, client meetings, code review | Launchpad-provided. **Dollar value UNKNOWN — ask the Launchpad program lead** | $0 | $0 |
| K2 | Laptops | Development and testing | Launchpad-provided. **Value UNKNOWN — ask Launchpad IT** | $0 | $0 |
| K3 | Internet and workspace | Work sessions; venue for resident testing | Launchpad-provided. **Value UNKNOWN — ask the program lead** | $0 | $0 |
| K4 | Free tiers | GitHub Free, CARTO non-commercial key, Census API, HERD, Geofabrik/OSM, CesiumJS (open source) | $0 per the vendor pages above | $0 | $0 |
| **Grant-funded (cash)** | | | | | |
| G1 | Associate stipends: app work | Phases B, D, E, F (towers), G (panel), per-layer legend, fixing the broken build | Low: 2 associates × 8 h/wk × 13 wk = 208 h × $20. High: 3 × 10 h/wk × 17 wk = 510 h × $25 | $4,160 | $12,750 |
| G2 | Data work | HERD pull (`fetch_herd.py`); Opportunity Atlas 2010→2020 crosswalk (`fetch_atlas.py`); ACS fixes (sentinels, MOE, units); review of ≥3 tracts and institutions against the source (registry step 4) | Low: 40 h × $20. High: 80 h × $25 | $800 | $2,000 |
| G3 | Usability and accessibility testing: participant gift cards | Spec §7 "someone outside the team" test, done with residents | Low: 8 participants × $50 (1 h at the focus-group rate). High: 15 × $80 (1 h at the 1:1 rate) | $400 | $1,200 |
| G4 | Usability and accessibility testing: facilitation and fixes | Running the sessions, a screen-reader/keyboard check, applying fixes | Low: 10 h × $20. High: 20 h × $25 | $200 | $500 |
| G5 | Tutorial and documentation | Public tutorial on single-dataset Cesium layers plus the source gate; README and data docs | Low: 20 h × $20. High: 40 h × $25 | $400 | $1,000 |
| G6 | Hosting at production scale (Vercel Pro) | Commercial-use hosting and `/api` functions | Low: 1 seat × $20 × 3 mo. High: 2 seats × $20 × 4 mo + $100 overage buffer (overage $0.15/GB past 1 TB) | $60 | $260 |
| G7 | Cesium ion plan | OSM Buildings context (asset 96188); Enriched asset retired | Low: Commercial individual $149 × 3 mo. High: Commercial team $524 × 4 mo | $447 | $2,096 |
| G8 | Google Map Tiles beyond the free cap | Photorealistic 3D Tiles toggle | Low: (2,000 − 1,000) × $6/1,000 × 3 mo = $18. High: (20,000 − 1,000) × $6/1,000 × 4 mo = $456 | $18 | $456 |
| G9 | CARTO basemap | Street basemap | Non-commercial free key (≤ 5M requests/month) | $0 | $0 |
| G10 | Anthropic API | Not needed (AI features are being removed) | — | $0 | $0 |
| | **Subtotal (cash)** | | | **$6,485** | **$20,262** |
| G11 | Contingency (~10%) | Price changes, traffic spikes, extra test sessions | 10% of the subtotal | $649 | $2,026 |
| | **Total grant request** | | | **$7,134** | **$22,288** |
| | **Total in-kind (Launchpad)** | | | **$0 cash** (dollar value UNKNOWN) | **$0 cash** (dollar value UNKNOWN) |

**Payment schedule at these totals.** 50% at start is $3,567 (low) or $11,144 (high). The other 50% is paid when deliverables are accepted. The high total is above the $15,000 individual cap (§4.0).

### 4.4 Summary

- **Total grant request:** $7,134 (low) to $22,288 (high).
- **Total in-kind from Launchpad Philly:** $0 cash. It covers associate supervision and mentorship, laptops, internet, workspace and the free service tiers. **The dollar value is UNKNOWN — ask the Launchpad program lead and finance for rates.**

**The three assumptions that move the total most:**
1. **Associate hours and stipend rate (G1, G2, G4, G5).** These are 80–86% of the subtotal. The rate is a placeholder; Launchpad's actual rate is UNKNOWN.
2. **Cesium ion plan tier (G7).** The range is $0 (if Cesium waives it for grantees or Community applies) to $2,096 (team plan for 4 months).
3. **Traffic that turns on Google 3D Tiles (G8).** Cost rises $6 for every 1,000 visits above 1,000 a month. If Technical.ly embeds the map in articles and draws 100,000 visits a month, the cost is about $594/month (about $2,376 for 4 months). This could also be avoided by keeping OSM Buildings as the default and making Google tiles opt-in.

---

## Part 5: License

A "## License" section was added at the end of `README.md` with the required wording. No license was chosen and no `LICENSE` file was created.

---

## Appendix: Where the code contradicts the audit docs (2026-09-29)

| # | Audit doc says | The code shows |
|---|---|---|
| 1 | 01: `solutionConnector.js` "calls `api.anthropic.com` directly from the browser" | Fixed in `857ccd1`. It now posts to `/api/solutions` (`solutionConnector.js:142`), and the key is server-side. 01 also doesn't list `api/solutions.js`. |
| 2 | 01: `ui/SolutionConnector.jsx` and `ui/SolutionTour.js` are "Not used by `PhiladelphiaApp`" | Both are **live**. `Legend.jsx:5` imports `SolutionConnector`, which imports `SolutionTour`. The "Connect mode" toggle starts the tour. |
| 3 | 01 audited commit `bd941ad` | HEAD is `857ccd1` (same day). It changed Solutions, the Mantua tract, layer stacking and the README. |
| 4 | 01/02: `config.js` `CBS_CONFIG` is "the score weights the app actually uses" | True in the commit. In the **uncommitted** working tree, `CBS_CONFIG` was deleted, and a new comment calls it "a decoy" whose "real one lives in philadelphiaBuildings.js". That's wrong: `cbs.js` and `PhiladelphiaLayers.jsx` import it from `config.js`, so the build now fails. |
| 5 | 06: "I tested [`sourceGate`] against the registry" | `source_of_truth.json` is now in the repo (`src/data/`, `f2cd5d3`), but no `sourceGate` exists anywhere in the repo |
| 6 | `source_of_truth.json`: `hospital_location` is `pipeline_ready` ("Script exists and pulls real data") | Resolved in registry 0.1.1: `hospital_location` is now `not_sourced`, with a blocker saying no script pulls hospital locations yet. |
| 7 | 05 §6 lists four Census missing-value codes | `source_of_truth.json` lists six (it adds −555555555 and −333333333). Under 06's rule, the JSON wins. |
| 8 | `fetch_phila_tracts.py:207` says to "replace asset 4979179" | The app loads asset `4980304` (`PhilaCesiumMap.jsx:396`); the comment above it still says 4979179 |
| 9 | README links to `docs/data-audit/02_DATA_BREAKDOWN.md` | That folder isn't in the repo (the files are only in `~/Downloads`) |
| 10 | README summary: "a direct Anthropic call for the Solutions list" | Out of date. The README's own folder table and the code use `/api/solutions`. |

Items confirmed as still correct:
- 25 / 20 / 1 filled values in `phila_tracts_full.geojson`
- `innovationIndex` = 0.5 for every tract
- 408 constant-metric shapes in `public/data/census_tracts/`
- 11 tracts and 15 places, all `synthetic: true`
- OSM and Google 3D Tiles mutually exclusive (`useMapStore.js:184-192`)
