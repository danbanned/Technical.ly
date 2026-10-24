
**Two hard rules:**

1. Nothing under `data/_reference/` may be imported by anything in `src/`.
   It documents shape, it does not ship behavior.
2. Only one source of truth per concept. If you find two `getCityData`
   functions, one of them is wrong.

---

## File definitions

### `config.js` — app-wide constants
- **What it is:** Settings file. Data-source manifest, staleness threshold,
  color palettes, initial camera position.
- **What it is not:** A data file. It doesn't contain records.
- **Key exports:** `DATA_SOURCES`, `STALENESS_THRESHOLD_MONTHS`,
  `PALETTES`, `SCENE`.
- **Consumers:** UI shell, narration staleness check, map bootstrap.
- **Status:** Active.

### `feedArticles.js` — article-card factory
- **What it is:** Pure function. Takes tracts, returns article objects
  shaped for the sidebar feed.
- **Input:** Array of tracts (with CBS scores attached).
- **Output:** `{ tractId, neighborhood, centroid, cbs, headline, body,
  category, badge }[]`, sorted by category priority
  (`opportunity_gap` first).
- **Swap point:** `body: insight.resident` → `body: narration.text` when
  AI narration ships. Shape unchanged.
- **Consumers:** Feed component.
- **Status:** Active.

### `philadelphiaBuildings.js` — Philly pilot core
- **What it is:** Five concerns in one file (scheduled for Phase 1 split):
  1. The real `CBS_CONFIG`
  2. `PHILADELPHIA_BUILDINGS` — 15 hand-authored 3D towers with innovation
     inputs (R&D, VC, patents, startup jobs)
  3. CBS scoring engine (`outcomeIndex`, `innovationIndex`,
     `computeCommunityBenefitScore`, `plainLanguageSummary`)
  4. `generatePhiladelphiaTracts()` — deterministic grid of ~100 tracts
  5. Lookup helpers (`getTractByGeoid`, `getTractPanel`, `getInsights`, …)
     and the `PHASE2_CITIES` stub
- **Data status:** Building coordinates are approximate-real and flagged
  `synthetic: true`. Tract outcomes are synthetic placeholders.
- **Consumers:** Map layers, tract panel, insight engine, article feed.
- **Status:** Active. **Scheduled for split** (see Phase 1 prompt).
- **Known issue:** Contains a second `getCityData` that competes with the
  one in `_reference/seedCityData.js`. Delete the buildings-file version.

### `philadelphiaTracts.js` — redundant hand-authored tracts
- **What it is:** 11 hand-written census tracts with real-ish polygons.
- **Why it exists:** Early scaffolding before the generator landed.
- **Why it should go:** The generator in `philadelphiaBuildings.js`
  produces richer, deterministic tracts from the same anchors. Keeping
  both means two tract datasets with different counts, different geoids,
  and different fields.
- **Status:** Pending deletion.

### `_reference/seedCityData.js` — future-scaling schema
- **What it is:** Deep, hardcoded economic profiles for 11 cities.
- **Why it's here:** It is the **target schema** for real ingested data
  once the pipeline lands. Every field — `stats{}`, `universities[]`,
  `techCenters[]`, `hospitals[]`, `financialDistricts[]`,
  `transitHubs[]`, `ecosystemConnections[]`, `beeCounts`, `planeCounts`,
  `landmarks[]` — describes exactly what the real API must return.
- **Why it's under `_reference/`:** The Philly pilot does not consume it.
  Nothing in `src/` imports it. It exists to document shape, not to run.
- **Status:** Reference — not in use.
- **Rule:** Do NOT import from here. When real data arrives, either
  build a new live module that matches this shape, or promote this file
  out of `_reference/` and wire it up deliberately.

---

## Data flow (Philadelphia pilot)

PHILADELPHIA_BUILDINGS (15 towers, hardcoded)
│
▼
generatePhiladelphiaTracts()
│
▼
~100 synthetic tracts
with CBS scores
│
▼
┌───────────┴───────────┐
▼ ▼
getTractPanel(geoid) seedArticlesFromTracts()
→ side panel card → article cards for feed
│ │
└───────────┬───────────┘
▼
useMapStore (Zustand)
│
▼
useImmersionController
(camera + shell + events)
│
▼
activeInsight
│
▼
useNarration
(AI narration)

text


---

## Synthetic data policy

Every dataset carries a `synthetic: true` flag where values are hand-crafted
for demonstration. **Never strip this flag.** The narration pipeline reads it
and should refuse to present synthetic values as production data.

Current synthetic flags:
- Every building in `PHILADELPHIA_BUILDINGS` → `synthetic: true`
- Every tract from `generatePhiladelphiaTracts()` → deterministic but synthetic
- `DATA_SOURCES.syntheticSeed` → the manifest entry labeling them

Real sources already declared in `config.js`:
- `censusACS2022` — ACS 5-year estimates, 2018–2022
- `opportunityAtlas` — Harvard / Census upward-mobility estimates

Staleness: data older than `STALENESS_THRESHOLD_MONTHS` (18) must be flagged
in narration.

---

## Future scaling — how `_reference/seedCityData.js` becomes live

When the real data pipeline lands, the migration looks like:

1. Build an ingest module that fetches real ACS + Opportunity Atlas + HERD
   + Venture Monitor data.
2. Match the output shape to `_reference/seedCityData.js` **exactly**.
   If the real data has different fields, decide whether to reshape the
   ingest or version the schema. Do not silently drop fields.
3. Promote `seedCityData.js` out of `_reference/` into `data/` and rename
   it (e.g. `cities.js`) once a live consumer exists.
4. Add a `DATA_SOURCES` entry for each new real source.
5. Remove the `synthetic: true` flags as each dataset flips to real.

Until step 3 happens, `_reference/seedCityData.js` is a spec, not a dependency.

---

## Adding a new dataset

1. Put the raw file in `data/` (not `_reference/`) if it's consumed today.
2. Add a manifest entry to `DATA_SOURCES` in `config.js` with `lastUpdated`,
   `vintage`, and `synthetic`.
3. Export a lookup function from the file if downstream code needs one.
   Only one per concept.
4. If it's a schema-only artifact, put it under `_reference/` with a header
   comment saying "not imported by src/".

---

## Known issues to fix (Phase 1)

- [ ] `CBS_CONFIG` exists twice with different shapes. One is wrong.
      Consolidate into `data/cbs.js`.
- [ ] `getCityData` exists twice. Keep only the one in `cities.js`.
- [ ] `philadelphiaBuildings.js` mixes five concerns. Split into `cbs.js`,
      `buildings.js`, `tracts.js`.
- [ ] `philadelphiaTracts.js` is redundant. Delete.
- [ ] `DEFAULT_CITY` is Baltimore. Change to Philadelphia.
- [ ] Alias fields (`rdSpend`, `dealCount`) can desync from their canonical
      counterparts. Remove.