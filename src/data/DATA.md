# Definitions first, then the plan

Before moving anything, here's a clean one-line definition for each file — this becomes the backbone of `DATA.md`.

---

## The five data files, defined

| File | Definition | Status |
|---|---|---|
| **`config.js`** | App-wide constants: data-source manifest, staleness threshold, color palettes, initial camera. **Not** a data file — a settings file that lives in `data/` for convenience. | Active |
| **`feedArticles.js`** | Pure function: tracts → article-card objects. Sorts by category priority. Marks the AI-narration swap point. Holds no data itself. | Active |
| **`philadelphiaBuildings.js`** | The Philly pilot's core: 15 buildings + CBS scoring engine + tract generator + lookups. Five concerns in one file. | Active (scheduled for split) |
| **`philadelphiaTracts.js`** | 11 hand-authored census tracts. **Redundant** with the generator inside `philadelphiaBuildings.js`. | Delete |
| **`seedCityData.js`** | Deep, hardcoded economic profiles for 11 cities — the **target schema** for real ingested data once the pipeline lands. Not used by the Philly pilot today. | **Reference — not in use** |

That last row is the one you're talking about. It's not dead — it's a **contract**. It shows exactly what shape real data must have when you scale.

---

## Proposal: a `_reference/` subfolder

Move "not in use but load-bearing for the future" files into a clearly-marked subfolder inside `data/`:

```
data/
├── _reference/                    ← NOT IMPORTED ANYWHERE. Schema templates.
│   ├── README.md                  ← "This folder is not in use. Do not import."
│   └── seedCityData.js            ← 11-city shape that real data must match
│
├── config.js                      ← active
├── feedArticles.js                ← active
├── philadelphiaBuildings.js       ← active
├── philadelphiaTracts.js          ← to be deleted
└── DATA.md                        ← you are here
```

**Why the underscore?** Convention: underscores sort to the top of the folder, signal "internal / special," and make accidental imports stand out in a diff.

**Why a README inside?** So that six months from now, when someone (or an agent) greps for `getCityData` and finds a hit in `_reference/`, they immediately know it's not the live one.

**The rule:**

> Nothing under `data/_reference/` may be imported by `src/`. It exists to document shape, not to be consumed. The day real data arrives, you either (a) build a new live module that matches this shape, or (b) move the file out of `_reference/` into `data/` and wire it up — deliberately.

---

## Other files to consider for `_reference/`

Same treatment — "not in use, kept for the shape":

| File | Why it belongs in `_reference/` |
|---|---|
| `data/philadelphiaTracts.js` | If you don't delete it, it's a hand-authored example of the tract shape. But I'd still delete it — the generator already produces richer tracts. |
| `PHASE2_CITIES` (block inside buildings file) | If you don't delete it, it's a 10-city stub showing the multi-city shape. Same call — the deep `SEED_CITIES` already covers it. |
| Any `*_legacy.js`, `*_v1.js`, `*_stub.js` you find later | Same rule. |

**My recommendation:** delete the two redundant ones, keep `seedCityData.js` as the single `_reference/` artifact — it's the only one that documents a shape *nothing else* produces.

---

## `DATA.md`

Here's the full file.

```markdown
# DATA.md

How the `data/` folder is organized, what each file is for, and what is
allowed to live where.

---

## Folder contract

```
data/
├── _reference/         ← schema templates for future scaling. NOT IMPORTED.
├── config.js           ← app-wide constants
├── feedArticles.js     ← pure transformer: tracts → article cards
├── philadelphiaBuildings.js
├── philadelphiaTracts.js   (pending deletion)
└── DATA.md
```

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

```
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
                  ▼                       ▼
         getTractPanel(geoid)     seedArticlesFromTracts()
         → side panel card        → article cards for feed
                  │                       │
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
```

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
```

---

## What to do next, concretely

**Step 1 — Create the folder and README:**

```bash
mkdir -p data/_reference
```

Then `data/_reference/README.md`:

```markdown
# _reference/

**Nothing in this folder is imported by `src/`.**

These files document the shape of data we plan to ingest when we scale
beyond the Philadelphia pilot. They are schemas, not dependencies.

Rules:
- Do not import from here.
- Do not delete a file here without confirming it's been superseded.
- When a file here becomes live, move it OUT of `_reference/` and update
  `DATA.md`.

See `../DATA.md` for the full data-layer contract.
```

**Step 2 — Move the file:**

```bash
git mv data/seedCityData.js data/_reference/seedCityData.js
```

Then grep to confirm nothing imports it:

```bash
grep -rn "seedCityData" src/
```

If there are hits, those are consumers you need to decide about — either they should use the buildings-file's lookups instead, or you promote `seedCityData.js` back out of `_reference/` (meaning it *is* in use and my recommendation was wrong).

**Step 3 — Write `DATA.md`** with the content above.

**Step 4 — Do the same scan for other files.** Run:

```bash
grep -rn "from '.*data/" src/ | grep -v node_modules
```

Every import is a consumer. Any file with zero consumers is a candidate for `_reference/` or deletion. Bring me that list and we'll triage it the same way.

---

## One caveat on `seedCityData.js`

Right now `seedCityData.js` **does** have a live consumer: it exports `getCityData`, and something in `src/` is probably calling that. If so, moving the file wholesale breaks that import.

Two options:

**Option A (cleaner long-term):** Keep the lookup function live but move the *data* to `_reference/`. The live `getCityData` in `cities.js` returns only Philadelphia (for now) and points at `_reference/seedCityData.js` with a comment: "the other 10 city shapes are in _reference/ — not served yet."

**Option B (fastest):** Move the whole file to `_reference/`, accept that `getCityData` calls break, and fix them all to return Philadelphia directly.

Either way, the important thing is the **contract is visible**: "we have this shape ready, we just haven't wired the pipeline." `_reference/` + `DATA.md` makes that obvious.

Want me to write the Phase 1 prompt for the `_reference/` move (including the `getCityData` consumer triage), so you have both Phase 1 items queued up?