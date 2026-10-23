# Current App Inventory: 3D Map (main @ f7edea8)

Date: 2026-10-23

This document lists what the 3D map app shows and does today. It is written for William, who is updating the wireframe. It describes the app on branch `main` at commit `f7edea8`. The entry point is `src/PhiladelphiaApp.jsx`, which `src/App.jsx` renders.

This is a description only. It does not suggest changes.

## How to read the tables

- **Source**: file path and line numbers on `main @ f7edea8`.
- **Data type** (one per row):
  - **real**: comes from a real outside source, such as map tiles or OSM.
  - **sample**: hand-entered values. The data files flag them `synthetic: true`.
  - **placeholder**: fixed filler constants or fixed text in the code.
  - **derived**: computed in the browser from other values. "derived (from sample)" means the inputs are sample values.
  - **n/a (setting)**: a control or user setting with no data behind it (used in section 9).
- **Default at load**: the state when the page opens, taken from the store defaults in `src/store/useMapStore.js`.
- **Network / gate**: the network calls the item makes, and the env var or flag that turns it on. "None" means no network call.
- **Wireframe**: the closest wireframe section: Dashboard, Map overview/2D, 3D Map, Area Context/Location, Resources, or Settings.

### Facts that apply across the tables

- There are **11 tracts** in `src/data/philadelphiaTracts.js` (lines 6-163). Every tract has `synthetic: true`. The file sets `TRACTS_DATA_SOURCE = 'syntheticSeed'` and `TRACTS_LAST_UPDATED = '2024-01-15'` (lines 3-4).
- There are **15 buildings** in `src/data/philadelphiaBuildings.js` (lines 83-235). Every building has `synthetic: true`. Categories: 4 `universityResearch`, 4 `healthcareAnchor`, 1 `ventureCapital`, 3 `startupIncubator`, 1 `transitHub`, 2 `healthcareGap`.
- CBS values are computed once, in the browser, when the page loads (`src/components/Globe/Layers/PhiladelphiaLayers.jsx:149-161`, `src/core/cbs.js:45-79`). With the current seed data this gives 1 tract with a mismatch alert (Mantua, CBS 3.6). The top three "gaps" are University City, Mantua and Kensington.
- At load, **Economic Color** and **Enriched Buildings** are both on in the store (`useMapStore.js:164-165`). While both are on, the Investment and Mobility entity layers are hidden, even though their own checkboxes are on (`PhiladelphiaLayers.jsx:205-217`). This happens whether or not a Cesium ion token is set. With both flags on, the bottom legend also shows its "Building Color" version (`src/ui/Legend.jsx:106`).
- The comment at `src/PhiladelphiaApp.jsx:20-21` says the Mantua tract opens on load. No code in scope does this. `activeInsight` and `philaSelectedTract` both start as `null` (`useMapStore.js:169, 171`).

---

## 1. Header

| Item | What it does | Source | Data that feeds it | Data type | Default at load | Wireframe | Network / gate |
|---|---|---|---|---|---|---|---|
| "technical.me" wordmark and "\|" divider | Static product name at top left. | `src/PhiladelphiaApp.jsx:38-40` | Fixed text. | placeholder | Shown | Dashboard | None |
| "Philadelphia Pilot" title | Static title next to the wordmark. | `src/PhiladelphiaApp.jsx:41` | Fixed text. | placeholder | Shown | Dashboard | None |
| "Sample Data" badge | Static badge in the header. | `src/PhiladelphiaApp.jsx:42` | Fixed text. | placeholder | Shown | Dashboard | None |

## 2. Left rail

The left rail holds two panels: Layers and Tracts (`src/PhiladelphiaApp.jsx:46-51`). Each checkbox and slider inside the Layers panel is listed in section 9.

| Item | What it does | Source | Data that feeds it | Data type | Default at load | Wireframe | Network / gate |
|---|---|---|---|---|---|---|---|
| "Layers" panel | Holds all layer checkboxes and sliders (see section 9). | `src/ui/LayerToggles.jsx:60-269` | Store flags. | placeholder | Shown, collapsed | 3D Map | None |
| Layers "⊞ / ⊡" expand button | Opens the panel full screen over a dark backdrop. Turns off map camera input while open. Esc or a backdrop click closes it. | `src/ui/LayerToggles.jsx:41-58, 64-71, 272-280` | Local React state. | placeholder | Not expanded | Settings | None |
| "Tracts (11)" button with ▼ / ▲ | Opens or closes the tract list. The count is the number of tracts. | `src/ui/TractList.jsx:72-81` | `philaTractsWithCBS` (store). | derived (from sample) | List closed | Area Context/Location | None |
| Tract list rows (neighborhood name + CBS number) | Lists all 11 tracts A to Z by neighborhood name. Click, Enter or Space selects the tract and flies the camera to 1,200 m above its centroid at −30° pitch. Arrow keys move between rows. Esc closes. | `src/ui/TractList.jsx:37-67, 92-116` | Tract `neighborhood` and `centroid` (sample). `cbs` (derived). | derived (from sample) | Hidden (list closed) | Area Context/Location | None |
| Tracts "⊞ / ⊡" expand button | Opens the tract panel full screen. Also opens the list. Turns off camera input while open. | `src/ui/TractList.jsx:15-33, 82-89, 120-128` | Local React state. | placeholder | Not expanded | Area Context/Location | None |

## 3. Right rail

The right rail holds City overview, Inspect, and Insights panels (`src/PhiladelphiaApp.jsx:54-64`).

### 3a. City overview (RegionSnapshot)

| Item | What it does | Source | Data that feeds it | Data type | Default at load | Wireframe | Network / gate |
|---|---|---|---|---|---|---|---|
| "Philadelphia, PA" heading + data stamp | Panel title. The stamp reads "⚠ Sample data — not for production use". | `src/ui/RegionSnapshot.jsx:55-59`; `src/ui/DataStamp.jsx:10-26` | Fixed text; `DATA_SOURCES.syntheticSeed` (`src/data/config.js:8-15`). | placeholder | Shown | Dashboard | None |
| City overview "⊞ / ⊡" expand button | Opens the panel full screen. Turns off camera input while open. | `src/ui/RegionSnapshot.jsx:34-51, 60-67, 100-108` | Local React state. | placeholder | Not expanded | Dashboard | None |
| "R&D spending" stat | Sum of `rdSpend` across all 15 buildings. Shows "$4.4B" with current data. | `src/ui/RegionSnapshot.jsx:8, 71-74` | Building `rdSpend` (sample). | derived (from sample) | Shown | Dashboard | None |
| "Active deals" stat | Sum of `dealCount` across buildings. Shows "188" with current data. | `src/ui/RegionSnapshot.jsx:9, 75-78` | Building `dealCount` (sample). | derived (from sample) | Shown | Dashboard | None |
| "Universities" stat | Count of `universityResearch` buildings. Shows "4". | `src/ui/RegionSnapshot.jsx:10, 79-82` | Building `category` (sample). | derived (from sample) | Shown | Dashboard | None |
| "Avg mobility" stat | Mean tract `mobilityScore`, with a label: High (≥60), Moderate (≥40), Low. Shows "48 — Moderate". | `src/ui/RegionSnapshot.jsx:11-13, 21-25, 83-88` | Tract `mobilityScore` (sample). | derived (from sample) | Shown | Dashboard | None |
| Mismatch signal line | Shows "⚠ N mismatch(es) detected", "✓ Balanced", or "…computing". Shows "⚠ 1 mismatch detected" with current data. | `src/ui/RegionSnapshot.jsx:30-31, 91-96` | `mismatchAlert` from `computeAllCBS`. | derived (from sample) | Shown | Dashboard | None |

### 3b. Inspect panel: tract selected

Opens when a tract is selected from the map, the tract list, the gaps card or a story card.

| Item | What it does | Source | Data that feeds it | Data type | Default at load | Wireframe | Network / gate |
|---|---|---|---|---|---|---|---|
| Inspect "⊞ / ⊡" expand and "✕" close buttons | Expand opens the panel full screen. Close clears the selected tract. | `src/ui/InspectPanel.jsx:314-339, 359-376, 382-390` | Store selection. | placeholder | Hidden (nothing selected) | Area Context/Location | None |
| Tract header: neighborhood name + "Tract N · Census Tract" | Names the selected tract. | `src/ui/InspectPanel.jsx:130-133` | Tract `neighborhood`, `name`. | sample | Hidden | Area Context/Location | None |
| "Community Benefit Score" gauge (N / 10, 0-5-10 ticks) | Shows CBS as a number and a thumb on a bar. Green ≥7, orange ≥4, red below. | `src/ui/InspectPanel.jsx:79-98, 135` | `cbs` from `computeAllCBS` (`src/core/cbs.js:67-72`). | derived (from sample) | Hidden | Area Context/Location | None |
| "Generating analysis…" spinner | Shows while narration is loading. | `src/ui/InspectPanel.jsx:139-144` | Store `narrationLoading`. | placeholder | Hidden (narration off) | Area Context/Location | Only with "Narration and stories" on (see section 10) |
| "AI Analysis" block | Shows the narration text for this tract. | `src/ui/InspectPanel.jsx:145-150` | Store `narration.text` from `/api/narrate` or `window.claude.complete`. | derived (from sample) | Hidden (narration off) | Area Context/Location | `POST /api/narrate`. Needs `philaNarration` on and `VITE_ENABLE_NARRATION=true` |
| Insight block (badge, headline, resident text, italic builder text) | Shows a fixed text template picked by the tract's indexes. Badges: "Opportunity gap", "Innovation reaching residents", "Strong outcomes", "Limited activity". Shown when narration is off, failed, or not ready. | `src/ui/InspectPanel.jsx:26-56, 151-153`; `src/core/insightEngine.js:89-154, 186-207` | `innovationIndex`, `outcomeIndex`, `mismatchAlert`. | derived (from sample) | Hidden | Area Context/Location | None |
| "Nearby Innovation": "R&D spend (1.5 km)", "VC deals (1.5 km)" | Sums building R&D and deal counts within 1.5 km of the tract centroid. | `src/ui/InspectPanel.jsx:155-165`; `src/core/cbs.js:26-43` | Building `rdSpend`, `dealCount`, lat/lon; tract `centroid`. | derived (from sample) | Hidden | Area Context/Location | None |
| "Resident Outcomes": "Median income", "Unemployment", "Mobility score" | Shows the tract's stored values. | `src/ui/InspectPanel.jsx:167-181` | Tract `medianIncome`, `unemploymentRate`, `mobilityScore`. | sample | Hidden | Area Context/Location | None |
| "Vitality" bars: "Economic Mobility", "Capital Growth", "Dynamism", "Innovation" | Four 0-100 bars. Economic Mobility = `mobilityScore`. Capital Growth = (1 − unemployment) × 100. Dynamism = mean of those two. Innovation = `innovationIndex` × 100. | `src/ui/InspectPanel.jsx:58-77, 110-115, 183-189` | Tract values. | derived (from sample) | Hidden | Area Context/Location | None |
| "Compare" button | Adds the tract to the two-slot compare list. When both slots are full, the compare dialog opens. A third add drops the oldest. | `src/ui/InspectPanel.jsx:192-198`; `useMapStore.js:244-250` | Selected tract. | placeholder | Hidden | Area Context/Location | None |
| "Fly here" button | Flies the camera to 1,200 m above the tract centroid at −30° pitch. | `src/ui/InspectPanel.jsx:117-126, 199-205` | Tract `centroid`. | sample | Hidden | Area Context/Location | None |
| Data stamp | Reads "⚠ Sample data — not for production use". | `src/ui/InspectPanel.jsx:208` | `DATA_SOURCES.syntheticSeed`. | placeholder | Hidden | Area Context/Location | None |

### 3c. Inspect panel: building selected

| Item | What it does | Source | Data that feeds it | Data type | Default at load | Wireframe | Network / gate |
|---|---|---|---|---|---|---|---|
| Building header: name + category | Names the clicked building. The category key is split into words, such as "university Research". | `src/ui/InspectPanel.jsx:216-221` | Building `name`, `category`. | sample | Hidden | Area Context/Location | None |
| "Details" rows | One row per key in the building's `stats` object, such as institution, rdSpending, patents. | `src/ui/InspectPanel.jsx:223-233` | Building `stats`. | sample | Hidden | Area Context/Location | None |
| "Vitality" bars (building) | Same four bars as for tracts. The values are typed into the building record. | `src/ui/InspectPanel.jsx:235-243` | Building `vitality`. | sample | Hidden | Area Context/Location | None |
| Data stamp | Reads "⚠ Sample data — not for production use". | `src/ui/InspectPanel.jsx:245` | `DATA_SOURCES.syntheticSeed`. | placeholder | Hidden | Area Context/Location | None |

### 3d. Docked (pinned) insight

Shows after a tract was selected and then the map was clicked away, while `activeInsight` is still set.

| Item | What it does | Source | Data that feeds it | Data type | Default at load | Wireframe | Network / gate |
|---|---|---|---|---|---|---|---|
| Docked card (CBS "/10", neighborhood, badge) | Small card for the pinned tract. Click reopens the full inspect panel. | `src/ui/InspectPanel.jsx:250-283, 341-349` | `activeInsight` tract; insight badge. | derived (from sample) | Hidden | Area Context/Location | None |
| Docked "✕" (Unpin) button | Clears the pinned insight, the selected tract and the narration state. | `src/ui/InspectPanel.jsx:276-282`; `useMapStore.js:202-208` | Store. | placeholder | Hidden | Area Context/Location | None |
| Docked narration line ("Analyzing…", narration text, or fallback resident text) | Shows narration progress or text under the card. | `src/ui/InspectPanel.jsx:285-299` | Store narration state; insight `resident` text. | derived (from sample) | Hidden (narration off) | Area Context/Location | Same as "AI Analysis" |

### 3e. Top opportunity gaps (InsightsCard)

| Item | What it does | Source | Data that feeds it | Data type | Default at load | Wireframe | Network / gate |
|---|---|---|---|---|---|---|---|
| "🔍 Top opportunity gaps" heading + "⊞ / ⊡" expand | Panel title and full-screen button. The whole card hides when a tract is selected. | `src/ui/InsightsCard.jsx:15-35, 65-75, 100-108` | Store selection. | placeholder | Shown | Dashboard | None |
| Gap rows ("1. Name — CBS N") | The 3 tracts with the largest `innovationIndex − outcomeIndex`. Click selects the tract and flies to 1,200 m, −30° pitch. | `src/ui/InsightsCard.jsx:37-56, 76-95`; `src/core/cbs.js:81-89` | CBS indexes. | derived (from sample) | Shown (University City, Mantua, Kensington) | Dashboard | None |
| Data stamp | Reads "⚠ Sample data — not for production use". | `src/ui/InsightsCard.jsx:96` | `DATA_SOURCES.syntheticSeed`. | placeholder | Shown | Dashboard | None |

## 4. Center / story feed

Nothing in this area renders while "Narration and stories" is off, which is the default (`src/ui/StoryFeed.jsx:81-99`).

| Item | What it does | Source | Data that feeds it | Data type | Default at load | Wireframe | Network / gate |
|---|---|---|---|---|---|---|---|
| "☰ Stories" floating button | Reopens the feed and clears any pinned tract. Shown when the feed is closed or a tract is selected. | `src/ui/StoryFeed.jsx:103-106, 125-133` | Local state. | placeholder | Hidden (switch off) | Dashboard | None |
| Map scrim | Dims the map while the feed is open and no tract is selected. | `src/ui/StoryFeed.jsx:138-141` | Local state. | placeholder | Hidden (switch off) | Dashboard | None |
| "Philadelphia Neighborhoods" header + "✕" | Feed title. ✕ closes the feed. | `src/ui/StoryFeed.jsx:145-155` | Fixed text. | placeholder | Hidden (switch off) | Dashboard | None |
| Feed subtitle | "Each story is generated from sample tract data (not real measurements). Select one to explore it on the map." | `src/ui/StoryFeed.jsx:156-159` | Fixed text. | placeholder | Hidden (switch off) | Dashboard | None |
| Story cards (badge, "CBS N", neighborhood, headline, body, data stamp, "Explore →") | One card per tract. Ordered by insight category: Opportunity gap first. Click selects the tract and flies to 1,200 m at −35° pitch. The body is the insight `resident` text, not narration text. | `src/ui/StoryFeed.jsx:36-70, 108-120, 162-170`; `src/data/feedArticles.js:25-46` | Tract + insight engine output. | derived (from sample) | Hidden (switch off) | Dashboard | None |

## 5. Bottom legend

The legend has two versions. When Economic Color and Enriched Buildings are both on, the "Building Color" version shows. This is the default. Otherwise the simple version shows (`src/ui/Legend.jsx:106, 183-220`).

| Item | What it does | Source | Data that feeds it | Data type | Default at load | Wireframe | Network / gate |
|---|---|---|---|---|---|---|---|
| "Building Color" title | Title of the economic legend. | `src/ui/Legend.jsx:124-126` | Fixed text. | placeholder | Shown | 3D Map | None |
| "Reset" button | Clears the legend color filter. Shown only while a filter is active. | `src/ui/Legend.jsx:128-136` | Store `philaFilterColor`. | placeholder | Hidden (no filter) | 3D Map | None |
| Legend "⊞ / ⊡" expand button | Widens the legend. | `src/ui/Legend.jsx:137-144` | Store `philaLegendExpanded`. | placeholder | Not expanded | 3D Map | None |
| Color items: "Mismatch Alert", "High Mobility", "Medium Mobility", "Low Mobility", "University R&D", "Healthcare", "Other" | Click sets a filter. Matching enriched buildings keep their color and the rest dim. Click again to clear. Hovering for 350 ms flies the camera to a fixed spot. | `src/ui/Legend.jsx:7-57, 81-101, 148-176`; `src/PhilaCesiumMap.jsx:95-110` | Fixed colors, fixed fly-to coordinates. | placeholder | Shown, no filter | 3D Map | None |
| Hover billboard (color dot, label, description) | Shows the item's description text above the legend while hovering. | `src/ui/Legend.jsx:112-122` | Fixed `info` strings at `Legend.jsx:12-54`. | placeholder | Hidden | 3D Map | None |
| Sample note | "Economic color and values shown are sample data." Appears in both legend versions. | `src/ui/Legend.jsx:59-61, 177, 217` | Fixed text. | placeholder | Shown | 3D Map | None |
| Simple legend dots: "University R&D", "Healthcare", "VC / Startups", "Gap marker" | Static color key for the extruded towers. | `src/ui/Legend.jsx:187-204` | Fixed colors. | placeholder | Hidden (economic version is shown) | 3D Map | None |
| Simple legend "Mobility … High" gradient with "Low" tick | Color ramp for the mobility circles. Switches to the color-blind palette when that option is on. | `src/ui/Legend.jsx:75-76, 206-215`; `src/data/config.js:55-66` | `PALETTES`. | placeholder | Hidden (economic version is shown) | 3D Map | None |
| "Solutions" bar (with "✦ AI" badge when AI-generated) and "▶ All" button | Shown above the legend when a tract is selected and narration is on. "▶ All" starts a camera tour of all four solutions. | `src/ui/Legend.jsx:103-104, 109, 185`; `src/ui/SolutionConnector.jsx:143-147, 156-175` | `getSolutions()` result. | derived (from sample) | Hidden (switch off) | Resources | `POST /api/solutions` when `VITE_ENABLE_NARRATION=true`; otherwise none |
| Solutions loading "…" | Shows while solutions load. | `src/ui/SolutionConnector.jsx:177-179` | Local state. | placeholder | Hidden | Resources | Same as above |
| Solution tiles (number + title, 4 tiles) | Click flies the camera to the tract, then to the linked asset, and draws a dashed line between them. | `src/ui/SolutionConnector.jsx:33-53, 181-194`; `src/ui/SolutionTour.js:50-125` | Solution `title`, `asset_lat`, `asset_lon`. Coordinates always come from the building list. | derived (from sample) | Hidden | Resources | Same as above |
| Full solution cards ("Solutions" ▾/▸, cards, "Asset", "▶ Show on map", "▶ Tour all solutions", "✦ AI-generated suggestions — verify before acting. Sample data.") | Card-list version of Solutions. In this app `SolutionConnector` is only rendered from `Legend.jsx` with `forceCompact`, so this version does not render. | `src/ui/SolutionConnector.jsx:56-92, 200-250` | Same as tiles. | derived (from sample) | Not rendered | Resources | Same as above |

## 6. Overlays / modals

| Item | What it does | Source | Data that feeds it | Data type | Default at load | Wireframe | Network / gate |
|---|---|---|---|---|---|---|---|
| "Side-by-Side Comparison" dialog | Opens when two tracts are in the compare list. Moves focus to the close button. | `src/ui/CompareMode.jsx:54-95` | Store `philaCompareTracts`. | placeholder | Hidden | Area Context/Location | None |
| "✕ Close" button | Empties the compare list and closes the dialog. Esc also clears it (`src/PhilaCesiumMap.jsx:289-296`). | `src/ui/CompareMode.jsx:75-83` | Store. | placeholder | Hidden | Area Context/Location | None |
| "⚑ All values are synthetic sample data" note | Fixed note under the dialog title. | `src/ui/CompareMode.jsx:85-87` | Fixed text. | placeholder | Hidden | Area Context/Location | None |
| Column header: neighborhood, "Community Benefit Score" N / 10, "⚠ Mismatch alert" | Per-tract header in each of the two columns. | `src/ui/CompareMode.jsx:19-34` | `cbs`, `mismatchAlert`. | derived (from sample) | Hidden | Area Context/Location | None |
| Column rows: "Median income", "Unemployment", "Mobility score" | Stored tract values. | `src/ui/CompareMode.jsx:36-39` | Tract fields. | sample | Hidden | Area Context/Location | None |
| Column rows: "R&D nearby", "VC deals nearby", "Innovation index", "Outcome index" | Computed tract values. | `src/ui/CompareMode.jsx:40-43` | CBS engine output. | derived (from sample) | Hidden | Area Context/Location | None |
| Full-screen backdrop | Dark layer behind any expanded panel. Click collapses the panel. | `LayerToggles.jsx:275`, `TractList.jsx:123`, `RegionSnapshot.jsx:103`, `InspectPanel.jsx:385`, `InsightsCard.jsx:103` | Local state. | placeholder | Hidden | Settings | None |
| Solution tour overlay ("n / total", title, why-it-connects text) | Shows each step of a solution tour. It listens for `solutionTour:step` and `solutionTour:end` window events. | `src/ui/SolutionConnector.jsx:7-30`; `src/ui/SolutionTour.js:99-101, 61` | Solution `title`, `why_it_connects`. | derived (from sample) | Hidden | Resources | None |
| Error fallback text ("Tract list unavailable.", "City overview unavailable.", "Inspect panel unavailable.", "Insights unavailable.", "Stories unavailable.") | Replaces a panel if it throws an error. | `src/PhiladelphiaApp.jsx:48, 55, 58, 61, 67`; `src/ui/ErrorBoundary.jsx:17-25` | Fixed text. | placeholder | Hidden | Settings | None |

## 7. 3D scene layers

| Item | What it does | Source | Data that feeds it | Data type | Default at load | Wireframe | Network / gate |
|---|---|---|---|---|---|---|---|
| Basemap imagery | Street map draped on the globe. With a CARTO key: CARTO Voyager. Without one: Esri World Street Map. Hidden while Google 3D Tiles are loaded. | `src/PhilaCesiumMap.jsx:219-242, 384-385, 397-398` | Map tiles. | real | Shown. With Google tiles loaded it is hidden. | 3D Map | `{a-d}.basemaps.cartocdn.com` if `VITE_CARTO_API_KEY` is set; otherwise `server.arcgisonline.com`. No gate. |
| Basemap dimming | Lowers basemap brightness, contrast and saturation while Economic Color is on. | `src/PhilaCesiumMap.jsx:482-490` | Store `philaEconomicColor`. | placeholder | On (Economic Color is on) | 3D Map | None |
| Globe, sky, sun lighting | Dark globe base color, sky atmosphere, sun on, moon off, fog off, lighting on. The clock is set to the current browser time and does not advance. | `src/PhilaCesiumMap.jsx:244-254` | Browser clock. | derived (from the browser clock) | On | 3D Map | None |
| Opening camera | Looks at City Hall (−75.1636, 39.9526) from 7,500 m, heading 0°, pitch −65°. Zoom is limited to 150-40,000 m. | `src/PhilaCesiumMap.jsx:255-266`; `src/data/config.js:71-79` | `SCENE.CAMERA` constants. | placeholder | On | 3D Map | None |
| Innovation towers | Stacked extruded shapes for 11 buildings: universities, hospitals, the transit hub, and 2 gap markers. Height = max(`height` × 8, 24) m × "Building height" slider. Gap markers are 45% opaque. Click opens the building inspect panel. | `src/map/layers/innovationLayer.js:5-47`; `PhiladelphiaLayers.jsx:13-36, 170-173, 201-203, 223-237`; `src/utils/buildingShapes.js` | Building `lon`, `lat`, `height`, `shape`, `color`, `category`. | sample | On | 3D Map | None |
| Investment towers | Extruded shapes for 4 buildings: the VC district and 3 incubators. | `src/map/layers/investmentLayer.js:5-47`; `PhiladelphiaLayers.jsx:175-178, 205-210` | Same building fields. | sample | Checkbox on. Hidden at load because Economic Color + Enriched are on. | 3D Map | None |
| Mobility circles + center beacon points | One pulsing circle and one point per tract (11). The circle sits at the polygon centroid. Its radius matches the polygon's area, clamped to 120-520 m. Color runs red → yellow → green by `mobilityScore`. Pulse speed rises with the score. Click selects the tract. | `src/map/layers/mobilityHeatmapLayer.js:79-150`; `PhiladelphiaLayers.jsx:77-131, 180-183, 212-217, 270-280` | Tract `polygon`, `mobilityScore`, `id`; `PALETTES`. | derived (from sample) | Checkbox on. Hidden at load because Economic Color + Enriched are on. | 3D Map | None |
| Building name labels with leader lines | White labels for 13 buildings (gap markers excluded). Each label floats 350 m above its tower top. Visible out to 25 km. A thin line drops to the ground. | `src/map/layers/labelLayer.js:1-30`; `PhiladelphiaLayers.jsx:38-75, 185-188, 219-221` | Building `name`, `lon`, `lat`, `height`. | sample | On | 3D Map | None |
| Selected tract outline (yellow ring) | Yellow line around the pinned tract's polygon, drawn 30 m above ground. | `PhiladelphiaLayers.jsx:239-265` | `activeInsight.polygon`. | sample | Hidden (nothing pinned) | 3D Map | None |
| Pinned tract floating label ("Neighborhood / CBS N / 10") | Label 250 m above the pinned tract centroid, colored by CBS. | `src/PhilaCesiumMap.jsx:442-480` | `activeInsight` `neighborhood`, `centroid`, `cbs`. | derived (from sample) | Hidden | 3D Map | None |
| Map click and hover | Click on a tract or building entity selects it. Click on empty map clears the selection. The cursor becomes a pointer over any entity. | `src/PhilaCesiumMap.jsx:268-287`; `src/map/interactions.js:5-17` | Entity `philaType` / `philaRef`. | placeholder | On | 3D Map | None |
| Solution tour dashed line + camera flights | For each solution: fly to the tract (2,200 m), then to the asset (900 m), then draw a cyan dashed line, then hold 2.8 s. Camera input is off during the tour. | `src/ui/SolutionTour.js:19-125` | Tract `centroid`; asset lat/lon from the building list. | sample | Off | 3D Map | None |

## 8. Building tilesets

| Item | What it does | Source | Data that feeds it | Data type | Default at load | Wireframe | Network / gate |
|---|---|---|---|---|---|---|---|
| OSM Buildings tileset | Cesium OSM Buildings, drawn as light translucent white massing (35% opacity). Screen-space error 24. | `src/PhilaCesiumMap.jsx:312-348` | Cesium `createOsmBuildingsAsync()`. The ion asset id is not written in the repo. | real | On if `VITE_CESIUM_ION_TOKEN` is set; not loaded otherwise | 3D Map | Cesium ion. Gate: `VITE_CESIUM_ION_TOKEN` + `philaOSMBuildings` |
| OSM height exaggeration | Sets `scene.verticalExaggeration` to the slider value while OSM Buildings is on. Resets to 1.0 when OSM is turned off. | `src/PhilaCesiumMap.jsx:345-346, 351-358` | Store `philaOSMHeightScale`. | placeholder | 2.0× (with token) | 3D Map | None. Gate: `VITE_CESIUM_ION_TOKEN` + OSM on |
| Google Photorealistic 3D Tiles | Google's photoreal city mesh. When it loads, the basemap is hidden. Cache is limited to 256 MB + 128 MB overflow. Screen-space error 24. | `src/PhilaCesiumMap.jsx:360-400` | Google tiles. | real | On if `VITE_GOOGLE_MAPS_API_KEY` is set; not loaded otherwise on main; Off on this branch (useMapStore.js:163) | 3D Map | `tile.googleapis.com` (comment at line 367). Gate: `VITE_GOOGLE_MAPS_API_KEY` + `philaGoogleTiles` |
| Enriched Buildings tileset (ion asset 4980304) | Loads a Cesium ion 3D Tiles asset and applies one of the styles below. Screen-space error 16. | `src/PhilaCesiumMap.jsx:402-434` | Ion asset 4980304. The code expects the properties `height_m`, `mobilityScore`, `innovationIndex`, `building`, `amenity` (lines 26-31, 144). What the asset really contains is UNKNOWN (cannot be confirmed from the repo). `scripts/enrich_buildings.py` describes a pipeline that could produce such an asset. The repo does not record which run, if any, produced asset 4980304. | UNKNOWN (cannot be confirmed from the repo) | On if `VITE_CESIUM_ION_TOKEN` is set; not loaded otherwise | 3D Map | Cesium ion. Gate: `VITE_CESIUM_ION_TOKEN` + `philaEnrichedBuildings` |
| Economic style (10 color rules) | Magenta = `innovationIndex` > 0.6 and `mobilityScore` < 35. Blues = university/college. Cyan = hospital/clinic/doctors. Green / yellow / red-orange = mobility ≥70 / ≥40 / >0. Teal shades by `height_m`. Slate gray = no data. The comment at line 59 says "16 seed tracts". The tracts file has 11. | `src/PhilaCesiumMap.jsx:37-69` | Tileset feature properties. | UNKNOWN (cannot be confirmed from the repo) | Active (Economic Color on) | 3D Map | None |
| Legend filter style | Keeps one legend category in color and dims everything else to 10% black. | `src/PhilaCesiumMap.jsx:95-110` | Store `philaFilterColor`; tileset properties. | UNKNOWN (cannot be confirmed from the repo) | Inactive | 3D Map | None |
| Height-only test style | Colors buildings only by `height_m`, in 4 bands. | `src/PhilaCesiumMap.jsx:74-86` | Tileset `height_m`. | UNKNOWN (cannot be confirmed from the repo) | Inactive | 3D Map | None |
| Gray style | Flat gray when Economic Color and Height test are both off. | `src/PhilaCesiumMap.jsx:88-92, 112-117` | None. | placeholder | Inactive | 3D Map | None |
| Property inspector (console only) | Logs the tileset's real property names and a sample feature to the browser console. Warns if the expected names are missing. Nothing shows on screen. | `src/PhilaCesiumMap.jsx:121-158, 421` | Tileset features. | UNKNOWN (cannot be confirmed from the repo) | Runs when the tileset loads | Settings | None |

## 9. Toggles & settings

All of these sit in the left-rail "Layers" panel (`src/ui/LayerToggles.jsx`), except the Esc key row.

| Item | What it does | Source | Data that feeds it | Data type | Default at load | Wireframe | Network / gate |
|---|---|---|---|---|---|---|---|
| "Innovation" checkbox | Shows or hides the innovation towers. | `LayerToggles.jsx:5-6, 74-84`; `useMapStore.js:159, 177-178` | Store `philaLayerVisibility.innovation`. | n/a (setting) | On | 3D Map | None |
| "Investment" checkbox | Shows or hides the investment towers. It has no visible effect while Economic Color + Enriched are on. | `LayerToggles.jsx:7, 74-84` | `philaLayerVisibility.investment`. | n/a (setting) | On (entities hidden) | 3D Map | None |
| "Mobility" checkbox | Shows or hides the mobility circles. It has no visible effect while Economic Color + Enriched are on. | `LayerToggles.jsx:8, 74-84` | `philaLayerVisibility.mobility`. | n/a (setting) | On (entities hidden) | 3D Map | None |
| "Labels" checkbox | Shows or hides the building name labels. | `LayerToggles.jsx:9, 74-84` | `philaLayerVisibility.labels`. | n/a (setting) | On | 3D Map | None |
| "OSM Buildings" checkbox (shows "(needs Ion)" when no token) | Loads or removes the OSM tileset. Disabled without a token. The box still shows checked because the store default is `true`. | `LayerToggles.jsx:12, 88-102`; `useMapStore.js:161` | `philaOSMBuildings`. | n/a (setting) | On | 3D Map | Cesium ion. `VITE_CESIUM_ION_TOKEN` |
| "↕ OSM height" slider (1×-10×, step 0.5) | Sets scene vertical exaggeration. Shown only when OSM is on and a token exists. | `LayerToggles.jsx:104-124`; `useMapStore.js:162` | `philaOSMHeightScale`. | n/a (setting) | 2.0× | 3D Map | `VITE_CESIUM_ION_TOKEN` |
| "Google 3D Tiles" checkbox (shows "(needs key)" when no key) | Loads or removes Google 3D Tiles. Disabled without a key. | `LayerToggles.jsx:13, 126-142`; `useMapStore.js:163` | `philaGoogleTiles`. | n/a (setting) | On on main; Off on this branch (useMapStore.js:163) | 3D Map | `tile.googleapis.com`. `VITE_GOOGLE_MAPS_API_KEY` |
| "Enriched Buildings" checkbox (shows "(needs Ion)" when no token) | Loads or removes ion asset 4980304. Its tooltip says "574k, colored by mobility score". | `LayerToggles.jsx:144-160`; `useMapStore.js:164` | `philaEnrichedBuildings`. | n/a (setting) | On | 3D Map | Cesium ion. `VITE_CESIUM_ION_TOKEN` |
| "Economic Color" sub-checkbox ("● live" hint) | Turns on the economic style. Turning it on turns Height test off. It also dims the basemap and hides the Investment and Mobility entities. Disabled when Enriched is off or there is no token. | `LayerToggles.jsx:162-180`; `useMapStore.js:165` | `philaEconomicColor`. | n/a (setting) | On | 3D Map | None |
| "Height test" sub-checkbox ("● check console" hint) | Turns on the height-only style. Turning it on turns Economic Color off. | `LayerToggles.jsx:182-200`; `useMapStore.js:166` | `philaHeightDebug`. | n/a (setting) | Off | Settings | None |
| "Building height" slider (½×-8×, step 0.5) | Multiplies the height of the innovation and investment towers. It does not affect tilesets. | `LayerToggles.jsx:204-222`; `PhiladelphiaLayers.jsx:223-237`; `useMapStore.js:170` | `philaBuildingHeightScale`. | n/a (setting) | 1.0× | 3D Map | None |
| "Color-blind safe" checkbox | Switches the mobility circles and the legend gradient to the blue / light-gray / orange palette. It does not change the tileset styles. | `LayerToggles.jsx:226-234`; `PhiladelphiaLayers.jsx:267-280`; `config.js:61-65` | `philaCBSafeMode`. | n/a (setting) | Off | Settings | None |
| "Connect mode" checkbox ("active" hint) | When on, a solution tour starts automatically each time solutions load for a selected tract. The Solutions bar only renders while narration is on. | `LayerToggles.jsx:238-253`; `SolutionConnector.jsx:135-141`; `useMapStore.js:259` | `philaConnectMode`. | n/a (setting) | Off | Resources | None by itself |
| "Narration and stories" checkbox | Turns on the story feed, the narration request, and the Solutions bar. | `LayerToggles.jsx:257-268`; `useMapStore.js:213` | `philaNarration`. | n/a (setting) | Off | Settings | Allows `/api/narrate` and `/api/solutions`. Both also need `VITE_ENABLE_NARRATION=true` |
| Esc key | Clears the pinned tract, the selected building and the compare list. It also collapses any expanded panel. | `src/PhilaCesiumMap.jsx:289-296`; `StoryFeed.jsx:91-96`; each panel's Esc handler | Store. | n/a (setting) | Always on | Settings | None |

## 10. Background services

| Item | What it does | Source | Data that feeds it | Data type | Default at load | Wireframe | Network / gate |
|---|---|---|---|---|---|---|---|
| CBS computation | On mount: sums R&D and deals within 1.5 km of each tract centroid, then min-max normalizes. Innovation = 0.6 R&D + 0.4 VC. Outcome = 0.4 mobility + 0.35 income + 0.25 (1 − unemployment). CBS = 10 × (0.5 × outcome + 0.5 × min(outcome ÷ max(innovation, 0.05), 1)). Mismatch = innovation > 0.6 and outcome < 0.35. | `PhiladelphiaLayers.jsx:149-161`; `src/core/cbs.js:26-79`; `src/data/config.js:38-53` | Tract + building sample values. | derived (from sample) | Runs once | Dashboard | None |
| Insight text engine | Picks one of four fixed text templates per tract. Thresholds: innovation ≥ 0.45, outcome ≥ 0.55. | `src/core/insightEngine.js:28-29, 77-154, 186-207` | CBS output. | derived (from sample) | Runs on render | Area Context/Location | None |
| Language guard (`assertDocAligned`) | Throws on investment, prediction or "I updated the data" phrasing. It runs on every narration response. In dev it also runs a self-test at load and logs the result to the console. | `src/core/insightEngine.js:32-68`; `src/core/narrateInsight.js:202, 211-287` | Narration text; fixed test strings. | placeholder | Self-test runs in dev only | Settings | None |
| Narration hook (`useNarration`) | When a tract is pinned and narration is on, requests narration. It cancels the earlier request. It writes the text, loading and error state to the store. | `src/hooks/useNarration.js:16-68`; `src/PhiladelphiaApp.jsx:27` | `activeInsight`, `philaNarration`. | derived (from sample) | Idle (switch off) | Settings | Calls the narration client below |
| Narration client (`narrateTract`) | Builds a facts JSON (tract values + data-freshness summary) and a fixed system prompt. Tries `POST /api/narrate` first, then `window.claude.complete`. Throws if neither works, and the UI then shows the static insight text. | `src/core/narrateInsight.js:90-140, 151-205` | Tract values; `DATA_SOURCES`. | derived (from sample) | Idle | Settings | `POST /api/narrate`. Gate: `VITE_ENABLE_NARRATION === 'true'` (line 154) and `philaNarration` |
| Data-freshness context | Computes the age of each `DATA_SOURCES` entry and flags it stale after 18 months. The result goes into the narration prompt only. The "Census ACS" and "Opportunity Atlas" entries are metadata only. No data from those sources is loaded. | `src/core/narrateInsight.js:28-86`; `src/data/config.js:7-36` | Fixed dates in `DATA_SOURCES`. | placeholder | Idle | Settings | None |
| `api/narrate.js` (server function) | Forwards the prompts to Anthropic. Model `claude-haiku-4-5-20251001`, max 256 tokens. Returns 503 if there is no key. | `api/narrate.js:15-65` | Prompts from the browser. | derived (from sample) | Not called (switch off) | Settings | `https://api.anthropic.com/v1/messages`. Gate: server `ANTHROPIC_API_KEY` |
| Solutions client (`getSolutions`) | Returns 4 recommendations per tract and caches them per tract id. With AI enabled it calls `/api/solutions` and matches `asset_name` to the building list for coordinates. Otherwise, or if that call fails, it uses fixed rule-based templates (mismatch / CBS < 4 / other). | `src/core/solutionConnector.js:14-33, 36-132, 137-190` | Tract values; building names and locations. | derived (from sample) | Idle (switch off) | Resources | `POST /api/solutions`. Gate: `VITE_ENABLE_NARRATION === 'true'` (line 137) |
| `api/solutions.js` (server function) | Asks Anthropic for a JSON array of 4 actions. Each `asset_name` must come from a fixed list of 13 names. Model `claude-haiku-4-5-20251001`, max 1024 tokens. Returns 503 if there is no key. | `api/solutions.js:17-101` | Tract numbers from the browser. | derived (from sample) | Not called | Resources | `https://api.anthropic.com/v1/messages`. Gate: server `ANTHROPIC_API_KEY` |
| Story article builder | Turns each tract plus its insight into a card object, sorted by category. | `src/data/feedArticles.js:18-46` | Tracts + insight engine. | derived (from sample) | Runs when the feed renders | Dashboard | None |
| Tile debug logging (console only) | Logs a masked env summary, the basemap choice, and any failed basemap or tileset tile. | `src/PhilaCesiumMap.jsx:11-22, 237-240, 333, 386, 422` | Env vars; Cesium error events. | placeholder | On | Settings | None |
| GPU error messages (console only) | Logs a message if rendering stops or the WebGL context is lost. | `src/PhilaCesiumMap.jsx:210-217` | Cesium events. | placeholder | On | Settings | None |

### Network calls summary

| Call | Triggered by | Gate |
|---|---|---|
| CARTO Voyager tiles (`{a-d}.basemaps.cartocdn.com`) | Basemap | `VITE_CARTO_API_KEY` set |
| Esri World Street Map tiles (`server.arcgisonline.com`) | Basemap | `VITE_CARTO_API_KEY` not set |
| Cesium ion: OSM Buildings | OSM Buildings toggle | `VITE_CESIUM_ION_TOKEN` + `philaOSMBuildings` (default on) |
| Cesium ion: asset 4980304 | Enriched Buildings toggle | `VITE_CESIUM_ION_TOKEN` + `philaEnrichedBuildings` (default on) |
| Google 3D Tiles (`tile.googleapis.com`) | Google 3D Tiles toggle | `VITE_GOOGLE_MAPS_API_KEY` + `philaGoogleTiles` (default on on main; off on this branch) |
| `POST /api/narrate` | Pinning a tract | `philaNarration` (default off) + `VITE_ENABLE_NARRATION=true` |
| `window.claude.complete` | Fallback when `/api/narrate` fails | Same as above, and only where `window.claude` exists |
| `POST /api/solutions` | Selecting a tract while the Solutions bar is shown | `philaNarration` (default off) + `VITE_ENABLE_NARRATION=true` |
| Anthropic Messages API (`api.anthropic.com`) | `api/narrate.js`, `api/solutions.js` (server side) | `ANTHROPIC_API_KEY` on the server |

---

## 11. BlockView shell pages (branch `cleanup-and-ui-shell`, not on `main`)

These pages wrap the map above. The 3D Map page mounts the unchanged map app (`src/PhiladelphiaApp.jsx`) inside the shell. Everything else in this section is new on this branch.

| Item | What it does | Source | Data that feeds it | Data type | Default at load | Wireframe | Network / gate |
|---|---|---|---|---|---|---|---|
| Header: "BlockView / Philadelphia Explorer", tagline, "Light mode" / "Dark mode" button | Shows the app name and switches the shell theme. The choice is saved in this browser (`localStorage` key `blockview-theme`). The 3D map keeps its own colors. | `src/layout/Header.jsx`; `src/ui/ThemeToggle.jsx`; `src/store/useShellStore.js` | Theme setting. | n/a (setting) | Dark | Settings | None |
| Sidebar "Navigation" (Dashboard, Map overview / 2D, 3D Map, Location, Resources & Sources, Settings) | Moves between pages. The current page is highlighted and marked `aria-current`. | `src/layout/Sidebar.jsx` | None. | n/a (setting) | Dashboard | All | None |
| Dashboard: "Philadelphia / Live" clock and date | Shows the device's local time and date. | `src/pages/Dashboard.jsx` | Device clock. | real | Shown | Dashboard | None |
| Dashboard: Weather, Conditions, Wind tiles | Shows current temperature (°F), a conditions word from the WMO code, and wind (mph). Shows "Weather unavailable" if the request fails or takes longer than 8 s. Open-Meteo is not in the source registry. | `src/hooks/useWeather.js`; `src/pages/Dashboard.jsx` | Open-Meteo current weather for 39.9526, -75.1652. | real | Shown | Dashboard | `api.open-meteo.com`. No key, no gate |
| Dashboard: "Open 2D Map" / "Open 3D Map" buttons | Links to `/map` and `/3d`. | `src/pages/Dashboard.jsx` | None. | n/a (setting) | Shown | Dashboard | None |
| Dashboard: Mission card | Shows `[mission text — team to supply]`. | `src/pages/Dashboard.jsx` | None. | placeholder | Shown | Dashboard | None |
| Dashboard: "Resources used in BlockView" cards 01–04 | One line each for OpenStreetMap, Census ACS, Open-Meteo and the tract boundaries, with a link out. | `src/data/appSources.js`; `src/pages/Dashboard.jsx` | Fixed text describing each provider. | placeholder | Shown | Dashboard | None |
| Map overview: "Map context" rows (Place, Area context, Selected tract, Source lineage) | Collapsible rows. They show the selected building, the other places in its tract, its tract's values, and where each part of the view comes from. | `src/pages/MapPage.jsx` | `philadelphiaBuildings.js`, `philadelphiaTracts.js`. | sample | Collapsed | Map overview/2D | None |
| Map overview: "Building Location" / "Census Data" tabs, "Select a building", "Center selection", "Reset view" | Picks one of the 15 buildings, centers the 2D map on it, or resets the view. The Census Data tab shows the selected building's tract values. | `src/pages/MapPage.jsx` | `philadelphiaBuildings.js`, `philadelphiaTracts.js`. | sample | No selection | Map overview/2D | None |
| Map overview: 2D map with markers | Leaflet map with OpenStreetMap tiles, + / − buttons and OSM attribution. One circle marker per building. | `src/map/LeafletView.jsx` | Tiles: OpenStreetMap. Markers: `philadelphiaBuildings.js`. | real (tiles), sample (markers) | Shown | Map overview/2D | `tile.openstreetmap.org` |
| "Philadelphia County" card (Map overview and Location) | Table of the 11 bundled tracts with income, unemployment and mobility. Tagged "Sample data · not ACS". There are no county-level figures. | `src/ui/CountyCard.jsx` | `philadelphiaTracts.js`. | sample | Shown | Area Context/Location | None |
| Location: "Location details" card | Tract name, neighborhood and GEOID, three tags, `[description — team to supply]`, links to the maps, and a collapsible "Location and model details". | `src/pages/LocationPage.jsx` | `philadelphiaTracts.js`, `philadelphiaBuildings.js`. | sample | First tract (University City) | Area Context/Location | None |
| Location: "Area context — Selected tract" rows (Place, Local conditions, Opportunity signals, Data history) | Local conditions shows the tract's sample values. Opportunity signals shows innovation index, outcome index, CBS and mismatch alert, from the same `computeAllCBS` call the 3D map uses. Data history shows the single bundled snapshot date. | `src/pages/LocationPage.jsx`; `src/data/places.js` | `philadelphiaTracts.js`; `src/core/cbs.js`. | sample; derived (from sample) | Shown | Area Context/Location | None |
| Location: "Selected tract estimates" | The tract's income, unemployment and mobility. Margin of error shows "No data yet". | `src/pages/LocationPage.jsx` | `philadelphiaTracts.js`. | sample | Shown | Area Context/Location | None |
| Area Context: search bar | Searches the 11 tracts and 15 buildings by name. Results link to the Location page. The "Until DB refresh · Next scheduled sync" row says there is no database or sync. | `src/pages/AreaPage.jsx` | `philadelphiaTracts.js`, `philadelphiaBuildings.js`. | sample | Empty | Area Context/Location | None |
| Area Context: "Dataset filters" (map layers) | Switches the 3D map's existing toggles: Innovation, Investment, Mobility, Labels, OSM Buildings, Google 3D Tiles, Enriched Buildings, Economic Color. They write the same store values as the Layers panel. | `src/pages/AreaPage.jsx`; `src/store/useMapStore.js` | Store. | n/a (setting) | Same as the map's defaults | Area Context/Location | None |
| Area Context: "Registry datasets" | Every non-retired metric in the registry, with its status. Disabled: none has a map layer yet. | `src/pages/AreaPage.jsx`; `src/data/registry.js` | `src/data/source_of_truth.json`. | placeholder | Disabled | Area Context/Location | None |
| Resources: "Resources We Used" cards and provider rows | Seven providers (OpenStreetMap, Census ACS, Open-Meteo, tract boundaries, Google Maps 3D Tiles, Cesium ion, 3D sample model). Each has a status tag, a description, "View dataset", the key status and a link to provider documentation. Key status comes from whether the env var is set; the value is never shown. | `src/data/appSources.js`; `src/pages/ResourcesPage.jsx` | Fixed text, plus whether `VITE_GOOGLE_MAPS_API_KEY` / `VITE_CESIUM_ION_TOKEN` are set. | placeholder | Shown | Resources | None |
| Resources: "Source registry" cards | One card per registry source: publisher, period, license, its metrics with their registry status, and a link. | `src/ui/ResourceCard.jsx`; `src/data/registry.js` | `src/data/source_of_truth.json`. | placeholder | Shown | Resources | None |
| Settings: "Switch to light mode" | Same theme setting as the header button. | `src/pages/SettingsPage.jsx` | Theme setting. | n/a (setting) | Dark | Settings | None |
| Settings: "Show 3D labels" | Shows or hides the 3D building labels. It is the same store value as the map's "Labels" checkbox (`philaLayerVisibility.labels`). | `src/pages/SettingsPage.jsx` | Store. | n/a (setting) | On | Settings | None |
| Sidebar collapse button | Collapses the sidebar to a 76 px icon rail and expands it again. The content area, including the 3D map, takes the space. Saved in this browser. | `src/layout/Sidebar.jsx`; `src/store/useShellStore.js` | Setting. | n/a (setting) | Expanded | All | None |
| 3D map handles: "Layers", "Details", "Legend" | Show or hide the map's left rail (Layers, Tracts), right rail (City overview, Inspect, Top gaps) and legend. They hide the map's own containers with CSS; the panels stay mounted. Saved in this browser. | `src/pages/Map3DPage.jsx`; `src/styles/shell.css` | Setting. | n/a (setting) | All shown | 3D Map | None |
| Light theme for the 3D map's panels | In light mode the map's panel chrome (backgrounds, borders, text, controls) is restyled. The scene, layer colors and legend swatches are unchanged. In dark mode a few small captions are lighter than on main so they meet WCAG AA. | `src/styles/shell.css` | Theme setting. | n/a (setting) | Dark | 3D Map | None |

## Things the new design shows that the app doesn't have data for yet

The new design (BlockView) shows the items below. For each one, this is what the app on `main @ f7edea8` has today.

**1. Live Census ACS values (tract and Philadelphia County, tagged "ACS 2024 · 5-YEAR").**
The app has no live Census data. It makes no Census API call. Tract income, unemployment and mobility are typed into `src/data/philadelphiaTracts.js` with `synthetic: true`. There is no county-level estimate anywhere in scope. `src/data/config.js:16-23` has a "Census ACS" metadata entry with vintage "ACS 2022 5-year". It is used only in the narration freshness text. No in-scope file uses ACS 2024. An offline script, `scripts/fetch_phila_tracts.py`, uses `ACS_YEAR = 2022` (line 43). The app does not run it or load its output.

**2. Live weather, conditions, wind.**
Nothing. There is no weather source or call. The only time-based visual is sun lighting, set from the browser clock and frozen (`src/PhilaCesiumMap.jsx:246-254`).

**3. A sourced list of neighborhood names and place descriptions.**
There is no sourced list. Each of the 11 tracts has a `neighborhood` string with no source field (`philadelphiaTracts.js`). `philadelphiaBuildings.js:242-249` exports 6 neighborhood label points (`PHILADELPHIA_NEIGHBORHOOD_LABELS`). No in-scope UI file imports them. The descriptions on screen are fixed templates (`src/core/insightEngine.js:103-130`), fixed legend text (`src/ui/Legend.jsx:12-54`) and building `stats` objects. None of them cite a source.

**4. A "Data history" row.**
Nothing. There is no time-series data. Trend insights are turned off: `PHASE2_TREND_INSIGHTS_ENABLED = false`, and `buildTrendInsight()` returns `null` (`src/core/insightEngine.js:162-171`). The store has `currentYear` / `yearRange` (`useMapStore.js:17-18`). No in-scope file reads them.

**5. "DB refresh" / "next scheduled sync" times.**
Nothing. There is no database and no sync job. The only dates are fixed strings: `DATA_SOURCES.*.lastUpdated` (`src/data/config.js:11, 19, 27`) and `TRACTS_LAST_UPDATED = '2024-01-15'` (`philadelphiaTracts.js:4`). `DataStamp` shows a date only for non-synthetic sources (`src/ui/DataStamp.jsx:14-16`). Every `DataStamp` in scope uses `syntheticSeed`, so no date appears on screen.

**6. Census-tract-accurate boundaries.**
Not today. Each of the 11 tract polygons in `philadelphiaTracts.js` is a 4-corner, axis-aligned rectangle. The map does not draw these polygons as shapes. It draws a circle at each polygon's centroid (`mobilityHeatmapLayer.js:79-150`). The polygons are used only for the yellow selection outline. I compared the 11 tract IDs with the bundled TIGER file `public/data/census_tracts/philadelphia_tracts.geojson` (408 tracts):
- 4 IDs are not in that file: `42101008700` (University City), `42101016900` (North Philadelphia), `42101017200` (Mantua), `42101017600` (Rittenhouse Square).
- 7 IDs are in that file, but the seed centroids sit 0.7 km to 8.1 km from the TIGER internal points. For example, `42101017300`, labeled "Cobbs Creek", is 8.0 km away, and `42101017400`, labeled "South Philadelphia", is 8.1 km away.

That file exists on `main`. On branch `cleanup-and-ui-shell` it was deleted in the Phase 2 cleanup (all its values were placeholders; `scripts/fetch_phila_tracts.py` can regenerate a 408-tract file, `scripts/phila_tracts_full.geojson`). No in-scope file fetches that TIGER GeoJSON. All 408 of its features have the same economic values (`medianIncome` 45000, `unemploymentRate` 0.08, `mobilityScore` 50).

**7. Source lineage (live vs bundled vs model-derived).**
Partly, as flags and fixed text only. `DATA_SOURCES` has a `synthetic` flag per source (`config.js:7-32`). Sample-data labels appear in the header badge (`PhiladelphiaApp.jsx:42`), `DataStamp`, the legend note (`Legend.jsx:59-61`), the compare note (`CompareMode.jsx:85-87`) and the story feed subtitle (`StoryFeed.jsx:156-159`). Model output is labeled "AI Analysis" (`InspectPanel.jsx:147`) and "✦ AI" (`SolutionConnector.jsx:164`). No value carries its own live / bundled / model-derived tag. The Enriched Buildings tileset has no lineage on screen.

**8. Key status for providers.**
Partly, for two keys only. The Layers panel disables the OSM, Enriched and Google checkboxes. It shows "(needs Ion)" or "(needs key)" plus a tooltip when `VITE_CESIUM_ION_TOKEN` or `VITE_GOOGLE_MAPS_API_KEY` is missing (`LayerToggles.jsx:12-13, 88-160`). The on-screen UI shows nothing for `VITE_CARTO_API_KEY`, `VITE_ENABLE_NARRATION` or the server's `ANTHROPIC_API_KEY`. The first two appear only in console logs (`PhilaCesiumMap.jsx:17-22, 237`). A missing Anthropic key returns a 503 (`api/narrate.js:21-24`, `api/solutions.js:38-41`). The UI then falls back to static text or rule-based solutions without saying why.
