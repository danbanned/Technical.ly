# The `map/` folder, in plain English

Six files. All follow the same pattern: **turn data into renderable specs, no Cesium imports, no side effects.** The map renderer consumes the specs.

---

## The pattern (worth naming first)

Every file here exports `build*Specs(data) → plainObject[]`. Each spec is a description of something to draw — a polygon, a label, a circle, a point. The **renderer** (elsewhere) reads the specs and creates the actual Cesium entities. The layer files never touch Cesium.

That's why none of them import `cesium`. It's a deliberate boundary: **spec builders are pure, renderer is impure.**

---

## The six files

### `interactions.js` — The pick resolver
**What it does:** Two tiny helpers. When Cesium says "the user clicked this entity," this reads the entity's `philaType` and `philaRef` custom properties and returns `{ type, ref }` — or `null` if it's not a Philly entity.

- `resolvePick(entity)` → `{ type: 'building'|'tract', ref: idx|id }` or `null`
- `isPhilaEntity(entity)` → boolean

**One sentence:** Reads the "what did I just click" tags off a Cesium entity and returns a plain reference the store can use.

---

### `viewer.js` — Camera + basemap
**What it does:** Three functions that manipulate the raw Cesium viewer.

- `flyToPhiladelphia(viewer)` — cinematic fly from wherever the camera is to the Philly starting position (from `SCENE.CAMERA` in `config.js`)
- `applyDarkScene(viewer)` — swaps the imagery to CartoDB dark basemap
- `applyLightScene(viewer)` — same but light basemap

**One sentence:** The only file in `map/` that talks to Cesium directly for camera and imagery setup.

---

### `innovationLayer.js` — Buildings for research / health / transit / gaps

**What it does:** Filters the buildings array down to four categories (`universityResearch`, `healthcareAnchor`, `transitHub`, `healthcareGap`), stamps each one into a footprint polygon, runs it through the shape library (`SHAPE_REGISTRY` from `utils/buildingShapes.js`), and returns one polygon spec per shape layer.

- Each building becomes **multiple specs** (one per stacked layer — base, wall, crown, spire, etc.)
- Gap buildings get `alpha: 0.45` (ghosted) instead of the default `0.9`
- Every spec carries `philaType: 'building'`, `philaRef: idx`, `group: 'innovation'` so the pick resolver can identify it later

**One sentence:** Turns the research/health/transit/gap buildings into a flat list of extruded polygon specs.

---

### `investmentLayer.js` — Buildings for VC / incubators

**What it does:** Identical in structure to `innovationLayer.js`, but filters for `ventureCapital` and `startupIncubator` categories, uses `phila-invest-` as the ID prefix, and `group: 'investment'`.

**One sentence:** Same as innovationLayer, but for VC hubs and startup incubators.

⚠️ **These two files are ~90% duplicated.** The only differences:
- the category filter (`INNOVATION_CATS` vs `INVESTMENT_CATS`)
- the ID prefix (`phila-bldg-` vs `phila-invest-`)
- the group name (`innovation` vs `investment`)
- alpha handling for gaps (only innovation has it)

They could be one file with two calls to a shared builder. Not urgent, but flag it.

---

### `labelLayer.js` — Names floating over buildings

**What it does:** Returns one label spec per building (except gap markers — their names are too long). Each spec has `lon`, `lat`, `altitudeM` (building height + 80m), `text`, color, and font size.

**One sentence:** Turns each named building into a floating label spec positioned just above its roof.

---

### `mobilityHeatmapLayer.js` — Tract circles

**What it does:** Turns census tracts into pulsing circle specs, colored by mobility score.

Three exports:

1. **`buildMobilityCircleSpecs(tracts, cbSafeMode, opts)`** — the live one. For each tract:
   - Computes the polygon's area-weighted centroid (shoelace formula)
   - Computes the equal-area circle radius in meters
   - Picks a color from the palette (interpolating low → mid → high)
   - Seeds a deterministic phase + speed from the tract index (no `Math.random()`)
   - Emits an ellipse spec + an optional beacon point spec
   - The `anim` block on each spec is read by the renderer to build a `CallbackProperty` that pulses the circle

2. **`buildMobilitySpecs(tracts, cbSafeMode)`** — a **legacy polygon version**, kept for rollback. Same data, extruded polygon instead of a pulsing circle. Explicitly labeled "Legacy — kept for reference."

3. **`mobilityToColor`, `lerpHex`** — the color helpers, exported for reuse.

**One sentence:** Turns tracts into pulsing, color-coded circle specs sized by the tract's area, plus a beacon dot; also keeps a legacy polygon version for rollback.

---

## The folder at a glance

| File | Input | Output | Group tag |
|---|---|---|---|
| `interactions.js` | Cesium entity | `{ type, ref }` or `null` | — |
| `viewer.js` | viewer | (side effects on the viewer) | — |
| `innovationLayer.js` | buildings | polygon specs | `innovation` |
| `investmentLayer.js` | buildings | polygon specs | `investment` |
| `labelLayer.js` | buildings | label specs | `labels` |
| `mobilityHeatmapLayer.js` | tracts | ellipse + point specs | `mobility` |

**Data flow:**

```
data/buildings.js  ─┐
data/tracts.js     ─┴─▶ map/*Layer.js  ──▶ specs ──▶ (renderer elsewhere) ──▶ Cesium
                                                    │
                                                    ▼
                                        interactions.js resolves picks
                                        back to store selections
```

---

# MAP.md

```markdown
# MAP.md

How the `map/` folder is organized, what each file does, and the rules
for adding new layers.

---

## Folder contract

```
map/
├── interactions.js          ← pick resolver: entity → { type, ref }
├── viewer.js                ← camera + basemap manipulation
├── innovationLayer.js       ← research/health/transit/gap building specs
├── investmentLayer.js       ← VC/incubator building specs
├── labelLayer.js            ← named-building label specs
├── mobilityHeatmapLayer.js  ← tract circle specs (+ legacy polygon version)
└── MAP.md
```

**Two hard rules:**

1. **Layer files are pure.** No file except `viewer.js` imports from
   `cesium`. Layer files return plain object specs; the renderer (which
   may live in `src/` or elsewhere) turns them into Cesium entities.
   This keeps layers testable and portable.

2. **Every pickable spec carries `philaType` + `philaRef` + `group`.**
   That's how `interactions.js` resolves a click back to a store
   selection. Do not create a pickable spec without them.

---

## The spec pattern

Every layer exports a function shaped like:

```js
build*Specs(data, options) → PlainSpec[]
```

A `PlainSpec` is one of:

| `type` | Key fields | Purpose |
|---|---|---|
| `polygon` | `positions`, `height`, `extrudedHeight`, `colorHex`, `alpha`, `outline*` | Extruded 3D geometry |
| `ellipse` | `lon`, `lat`, `colorHex`, `alpha`, `anim` | Ground circle, may pulse |
| `point` | `lon`, `lat`, `colorHex`, `pixelSize` | Screen-space dot |
| `label` | `lon`, `lat`, `altitudeM`, `text`, `colorHex`, `fontSize` | Floating text |

A spec may also carry:
- `philaType` — `'building'` or `'tract'`
- `philaRef` — the index (for buildings) or ID (for tracts)
- `group` — `'innovation'`, `'investment'`, `'mobility'`, `'labels'`
- `anim` — a block of animation params (only mobility circles use it today)
- `clickable` — flag the renderer reads to decide whether to wire pick events

The renderer, not the layer, decides how to turn a spec into a Cesium
entity. This file documents specs, not entities.

---

## File definitions

### `interactions.js` — Pick resolver
- **What it is:** Two helpers that read the `philaType` and `philaRef`
  custom properties off a Cesium entity and return a plain reference.
- **Exports:**
  - `resolvePick(entity) → { type, ref } | null`
  - `isPhilaEntity(entity) → boolean`
- **Used by:** The viewer's click handler.
- **Status:** Active.

### `viewer.js` — Camera + basemap
- **What it is:** The only file in `map/` that talks to Cesium directly.
- **Exports:**
  - `flyToPhiladelphia(viewer)` — cinematic fly to `SCENE.CAMERA`
  - `applyDarkScene(viewer)` — CartoDB dark basemap
  - `applyLightScene(viewer)` — CartoDB light basemap
- **Note:** Both scene functions call `removeAll()` before adding the
  new imagery. This discards any previously-added layer (e.g. a
  building mesh) that was added to `imageryLayers` rather than to the
  entity collection. If a future layer goes through `imageryLayers`,
  this will clobber it.
- **Status:** Active.

### `innovationLayer.js` — Innovation building specs
- **What it is:** Filters buildings to four categories
  (`universityResearch`, `healthcareAnchor`, `transitHub`,
  `healthcareGap`), stamps a footprint polygon, runs the shape library,
  returns one polygon spec per stacked shape layer.
- **Gap handling:** `healthcareGap` buildings are rendered at
  `alpha: 0.45` (ghosted) — they are annotations, not real towers.
- **ID scheme:** `phila-bldg-{idx}-{layerIdx}`.
- **Group tag:** `'innovation'`.
- **Status:** Active.

### `investmentLayer.js` — Investment building specs
- **What it is:** Structurally identical to `innovationLayer.js`, but
  filters for `ventureCapital` and `startupIncubator`.
- **ID scheme:** `phila-invest-{idx}-{layerIdx}`.
- **Group tag:** `'investment'`.
- **Status:** Active.
- **Known duplication:** ~90% identical to `innovationLayer.js`. See
  "Known issues deferred."

### `labelLayer.js` — Label specs
- **What it is:** One label spec per building, positioned
  `building height + 80m` above the roof.
- **Gap exclusion:** `healthcareGap` buildings are skipped — their
  names are too long for labels.
- **ID scheme:** `phila-label-{idx}`.
- **Group tag:** `'labels'`.
- **Status:** Active.

### `mobilityHeatmapLayer.js` — Tract circle specs
- **What it is:** Turns tracts into pulsing, color-coded ellipse specs
  (plus optional beacon points).
- **Geometry:** Area-weighted centroid via shoelace formula; equal-area
  circle radius in metres.
- **Animation:** Deterministic — phase and speed are seeded from the
  tract index, not `Math.random()`. Same input → same animation every
  reload.
- **Color:** Interpolated low → mid → high through the palette from
  `data/config.js` (`PALETTES.mobilityDefault` or `.mobilityCB`).
- **Options:**
  - `coreBeacon` — emit a center point (default `true`)
  - `minRadiusM` / `maxRadiusM` — radius clamps (120 / 520)
  - `fillFactor` — fraction of equal-area radius to use (0.78)
- **Legacy export:** `buildMobilitySpecs(tracts, cbSafeMode)` is a
  polygon-based version kept for rollback. Do not use it in new code.
- **ID schemes:** `phila-tract-{id}` (circle), `phila-tract-beacon-{id}`
  (beacon).
- **Group tag:** `'mobility'`.
- **Status:** Active (circle version). Legacy polygon version is
  rollback-only.

---

## Data flow

```
data/buildings.js  ─┐
data/tracts.js     ─┴─▶  map/*Layer.js  ──▶  PlainSpec[]  ──▶  renderer
                                                              │
                                                              ▼
                                                         Cesium entities
                                                              │
                                                              ▼
                                                    viewer click handler
                                                              │
                                                              ▼
                                                    interactions.js
                                                              │
                                                              ▼
                                                       useMapStore
                                                   (selection, insight)
```

Every layer is a pure function. The renderer is the only impure piece,
and it lives outside this folder.

---

## Rules for adding a layer

1. **Never import `cesium`.** Return plain specs. If the renderer
   needs something Cesium-specific, extend the spec, not the layer.

2. **Every pickable spec carries `philaType`, `philaRef`, and `group`.**
   The pick resolver reads these. Missing them means the entity is
   unclickable.

3. **ID scheme is `phila-{group}-{ref}-{subidx}`.** Deterministic,
   stable across renders, unique within the layer.

4. **Deterministic animation only.** Use a seeded RNG
   (`seededRandom(idx)` in `mobilityHeatmapLayer.js`) — never
   `Math.random()`. Otherwise the layer twitches every re-render.

5. **One concern per file.** `innovationLayer` and `investmentLayer`
   are separate because they tag specs with different `group` values
   that the store uses to filter selections. If they were merged, the
   tag would need a parameter.

6. **Pure geometry helpers stay local.** `footprint`, `polygonCentroid`,
   `polygonRadiusM`, `lerpHex`, `seededRandom` are private to their
   files. If a third file needs one, promote it to
   `utils/geoHelpers.js` (does not exist yet — create deliberately).

---

## Known issues deferred

These are flagged for a future cleanup phase, not fixed today:

- [ ] **`innovationLayer.js` and `investmentLayer.js` are ~90%
      duplicated.** The only differences are the category filter, the
      ID prefix, the group tag, and the gap alpha handling. A shared
      `buildBuildingSpecs(buildings, { categories, idPrefix, group,
      gapAlpha })` helper would collapse them. Defer until a third
      building category appears.
- [ ] **`mobilityHeatmapLayer.js` exports `buildMobilitySpecs` (legacy
      polygon version).** Kept for rollback only. If nothing imports it
      after a release cycle, delete it or move to `map/_reference/`.
- [ ] **`viewer.js` scene functions clobber `imageryLayers`.** If a
      future layer adds to `imageryLayers`, the swap will remove it.
      Consider tagging imagery layers by ID and only removing the
      basemap.
- [ ] **No reference folder exists.** When a layer is retired (like the
      legacy polygon version of mobility), it should go to
      `map/_reference/` following the same pattern as `data/_reference/`
      and `utils/_reference/`. Create it when the first retirement
      happens.
- [ ] **`anim` block only supports circles.** If buildings or labels
      need animation later, the spec shape will need to grow. Document
      the `anim` contract before adding a second consumer.

---

## Adding a reference file

Same pattern as `data/_reference/` and `utils/_reference/`:

1. Create `map/_reference/` if it does not exist.
2. Add a `README.md` inside:
   ```
   # _reference/
   **Nothing in this folder is imported by `src/`.**
   These files document layer implementations that have been retired
   or superseded. They are kept for rollback and reference only.
   Rules:
   - Do not import from here.
   - When a layer here is revived, move it OUT of `_reference/`.
   ```
3. Move the retired file in with `git mv`.
4. Prepend a header comment: "Retired: [date]. Superseded by [file]."
5. Record the move in this file.
```

---

## What this file commits you to

- **The spec pattern is now explicit.** Every layer returns plain objects; only `viewer.js` touches Cesium.
- **The `philaType`/`philaRef`/`group` contract is documented.** Anyone adding a layer knows what makes an entity pickable.
- **The ID scheme is fixed.** Deterministic, greppable, unique.
- **Deterministic animation is a rule.** No `Math.random()` in layers.
- **The duplication is named, not hidden.** `innovationLayer` / `investmentLayer` are flagged as candidates for a shared helper when a third category appears.

The one decision this file doesn't make for you: **when does `innovationLayer` + `investmentLayer` get merged?** That's a real refactor, not a documentation change — but the "Known issues deferred" section points at exactly when it becomes worth doing (when a third category appears, or when a bug has to be fixed in both files).