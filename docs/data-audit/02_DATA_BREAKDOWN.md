# 02 · Data Breakdown: What's on the Map Right Now

This goes through everything you can see on the live map, where it comes from in the repo, and whether it's real. It also answers the 9/29 follow-up: **"Confirm what the circles represent."**

---

## What each visual actually is

| What you see | Layer toggle | What it represents | Where it comes from | How size, height, and color are set | Real? |
|---|---|---|---|---|---|
| **Blue/cyan 3D towers** | Innovation | 4 universities: Penn, Drexel, Temple, Jefferson | `philadelphiaBuildings.js` → `innovationLayer.js` | Height = the hand-typed `height` field × 8 m. **It isn't calculated from R&D dollars.** Color is hand-picked per place. | Placeholder |
| **Pink 3D towers** | Innovation | 4 hospitals: Penn Medicine, CHOP, Temple Hospital, Jefferson Health | same | same | Placeholder |
| **Gray slab** | Innovation | 30th Street Station (a **transit hub**) | same | same | Placeholder |
| **Short gray blocks** | Innovation | 2 "GAP" markers: "No major research anchor" in North Philadelphia and West Kensington | same | same | **Editorial placeholder, not data** |
| **Orange 3D towers** | Investment | 1 "Center City VC District" and 3 incubators: UC Science Center, Pennovation, Drexel Baiada | `philadelphiaBuildings.js` → `investmentLayer.js` | **Same tower style and same hand-typed height** as the research towers | Placeholder |
| **Pulsing circles** (red, amber, green) | Mobility | **One circle per census tract** (11 tracts) | `philadelphiaTracts.js` → `mobilityHeatmapLayer.js` | **Color** = `mobilityScore` (red low → amber mid → green high). **Size** = the tract's area. **Pulse speed** = `mobilityScore` again. | Sample |
| **Name labels** | Labels | Place names | `philadelphiaBuildings.js` → `labelLayer.js` | | n/a |
| **Gray 3D city buildings** | OSM Buildings | Real building footprints and heights from OpenStreetMap | Cesium ion asset 96188 | OSM heights | Real (context only) |
| **Colored 3D city buildings** | Enriched Buildings + Economic Color | OSM buildings colored by their tract's `mobilityScore` and `innovationIndex`. **Magenta** = "mismatch." | Cesium ion asset 4980304, made by `enrich_buildings.py` | Rules in `PhilaCesiumMap.jsx` → `buildEconomicStyle()` | **Unknown:** depends on which tract file was used |
| **Photoreal city** | Google 3D Tiles | Google's 3D model of the city | Google Map Tiles API | | Real (context only) |

### Answers to the 9/29 notes

- **"Circles = unspecified"** → The circles are the **Mobility layer**: one per tract, colored by the mobility number. The large **amber/orange circles are mid-mobility tracts, not investment.** They're easy to confuse with the orange investment towers.
- **"Building height = investment level"** → **Not quite.** Research towers and investment towers both use a hand-typed height. Neither is calculated from dollars or deal counts, and they share one height scale.
- **"Buildings = education data"** → The "education" towers are universities, drawn in the **Innovation** layer next to hospitals, a train station, and gap markers. There's **no education dataset** in the app.
- **"Smaller buildings = innovation, economic data"** → The short gray blocks are the two "GAP" markers. They're placeholders the team wrote, not data.

**Danya's point is confirmed in the code:** VC investment and research funding use the **same visual form** (3D towers on the same height scale). The Innovation layer also mixes four different kinds of places.

---

## The panels

### "Philadelphia, PA" snapshot card (`RegionSnapshot.jsx`)

| Shown | How it's calculated | Note |
|---|---|---|
| **$4.4B R&D spending** | Sum of `rdSpend` over **all 15 places**, including hospitals and VC hubs | Placeholder total, not a HERD figure |
| **188 active deals** | Sum of `dealCount` over the 4 investment places | Placeholder |
| **4 universities** | Count of `universityResearch` places | |
| **48 avg mobility** | Average `mobilityScore` over the 11 sample tracts | Sample |
| **"Balanced" / mismatch count** | Count of tracts where `mismatchAlert` is true | A conclusion drawn by combining datasets |

### Click a tract (`InspectPanel.jsx`)

| Shown | Where it comes from | Note |
|---|---|---|
| **Community Benefit Score /10 gauge** | `cbs.js` | A composite that combines datasets |
| R&D nearby / VC deals nearby | Sum of places within 1.5 km | Placeholder inputs |
| Median income, unemployment, mobility | The tract record | Sample |
| **"Capital Growth" bar** | `(1 − unemploymentRate) × 100` | **Mislabeled.** This is the employment rate, not capital growth. |
| **"Dynamism" bar** | Average of mobility and employment rate | **Made-up metric** with no source |
| **"Innovation" bar** | `innovationIndex × 100` | Composite |

### Other panels

- **"Top opportunity gaps"** (`InsightsCard.jsx`) ranks tracts by `innovationIndex − outcomeIndex`. With the sample data, Kensington and Fairhill rank as "gaps" even though they have **zero** innovation nearby. They show up because their outcome numbers are low.
- **The story feed** (`StoryFeed.jsx`) shows headlines auto-written from insight categories, like *"High innovation nearby — resident outcomes lag."*

All three of these (the score, the gaps list, and the story headlines) **draw conclusions by connecting datasets**. That's exactly what the 9/29 guardrails rule out.

---

## The real data that exists but isn't connected

`scripts/phila_tracts_full.geojson` (408 tracts) was built by `fetch_phila_tracts.py`. I checked every record:

| Field | Source | Problems found |
|---|---|---|
| `medianIncome` | ACS 2022 B19013 | **25 tracts show $0.** The Census Bureau marks unavailable values with a code (−666666666), and the script clips that to 0 instead of marking it missing. |
| `unemploymentRate` | ACS 2022 B23025 (unemployed ÷ civilian labor force) | **20 tracts were filled in with 8.0** where data was missing. The unit is **percent** (15.64), while the app's sample file uses a **fraction** (0.085). |
| `mobilityScore` | Opportunity Atlas `kfr_pooled_pooled_p25` × 100 | **57 tracts are actually income stand-ins**, not mobility, plus 1 filled in with 40. The Opportunity Atlas uses **2010** tract boundaries while TIGER 2022 uses **2020** tracts, so without a crosswalk, IDs that changed don't match. |
| `innovationIndex` | none | **0.5 for every tract** (placeholder) |
| `cbs`, `outcomeIndex` | calculated | Built from the fields above |
| `neighborhood` | TIGER tract number | Shows "263.01" instead of a neighborhood name |

**The filled-in values aren't flagged anywhere.** A reader can't tell a real $58,000 from a made-up $0. This is the main reason for the source-of-truth rules in `06_SOURCE_OF_TRUTH.md`.

`public/data/census_tracts/philadelphia_tracts.geojson` has **real 408-tract shapes** but the **same default numbers for every tract**. If the Enriched Buildings asset was built from this file, "Economic Color" paints every building the same mid-mobility yellow.

---

## Two score configs, one used

| Location | Innovation weights | Outcome weights | Used? |
|---|---|---|---|
| `src/data/config.js` → `CBS_CONFIG` | R&D 0.6, VC 0.4 | mobility 0.4, income 0.35, unemployment 0.25 | **Yes** (`cbs.js`) |
| `src/data/philadelphiaBuildings.js` → `CBS_CONFIG` | R&D 0.40, VC 0.30, patents 0.15, startup jobs 0.15 | income 0.35, unemployment 0.25, housing 0.20, mobility 0.20 | No |
| `scripts/fetch_phila_tracts.py` → `compute_cbs()` | fixed 0.5 | mobility 0.4, income 0.35, unemployment 0.25 | Only in the offline file |

Each of these calculates the score differently. If the score is retired (see the spec), all three go.

---

## Issues list for the team

| # | Issue | Where |
|---|---|---|
| 1 | Research and VC use the same tower form and height scale | `innovationLayer.js`, `investmentLayer.js` |
| 2 | Tower height is hand-typed, not calculated from data | `philadelphiaBuildings.js` `height` |
| 3 | The Innovation layer mixes universities, hospitals, transit, and "gap" markers | `innovationLayer.js` `INNOVATION_CATS` |
| 4 | Mobility circles are amber/orange, like the investment towers | `config.js` palette |
| 5 | Mobility is encoded twice (color **and** pulse speed) | `mobilityHeatmapLayer.js` |
| 6 | Tracts are 11 rectangles, not the 408 real shapes | `philadelphiaTracts.js` |
| 7 | The score, gaps list, story headlines, and magenta "mismatch" buildings all imply a relationship between datasets | `cbs.js`, `insightEngine.js`, `InsightsCard.jsx`, `StoryFeed.jsx`, `buildEconomicStyle()` |
| 8 | Mislabeled or made-up bars: "Capital Growth" and "Dynamism" | `InspectPanel.jsx` |
| 9 | The real-data file has hidden filled-in values ($0 incomes, 8.0 unemployment, income stand-ins for mobility) | `fetch_phila_tracts.py` |
| 10 | Opportunity Atlas 2010 tracts are joined to 2020 tracts without a crosswalk | `fetch_phila_tracts.py` |
| 11 | Unemployment unit mismatch: fraction vs percent | sample file vs real file |
| 12 | The Enriched Buildings ion asset doesn't record which tract file it came from | `enrich_buildings.py` |
| 13 | `solutionConnector.js` calls the Anthropic API from the browser | `src/core/solutionConnector.js` |
