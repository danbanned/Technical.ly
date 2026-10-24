# UTILS.md

```markdown
# UTILS.md

How the `utils/` folder is organized, what each file is for, and what is
allowed to live where.

---

## Folder contract

```
utils/
├── _reference/           ← schema/logic templates for future scaling. NOT IMPORTED.
├── buildingShapes.js     ← 3D building silhouette library
├── cesiumHelpers.js      ← data → Cesium entity translation
├── colorScales.js        ← number → color/height encoders
├── particleConfigs.js    ← runtime particle texture generators
├── transitionHelpers.js  ← camera moves + shell opacity tweening
└── UTILS.md
```

**Two hard rules:**

1. Nothing under `utils/_reference/` may be imported by anything in
   `src/`. It documents logic that may be useful later, it does not
   ship behavior.
2. Only one source of truth per concept. If two files encode the same
   number → color mapping, one of them is wrong.

---

## Historical context

This app was originally built at **state level** with multi-state
economic comparison and a scrubbable year timeline. It was later scoped
down to a **city-level Philadelphia pilot** with a present-tense
snapshot model.

Several files under `utils/` were written for the original scope and
are not consumed by the Philly pilot today:

- `mismatchLogic.js` — groups everything by `state`. With one city,
  there is nothing to group.
- `timeData.js` — fills timeline gaps across years. The Philly pilot
  does not scrub across years.

These are **state-level leftovers**, not bugs. They belong in
`utils/_reference/` until a future scope decision promotes them back.

---

## File definitions

### `buildingShapes.js` — 3D building silhouette library
- **What it is:** 15 named parametric shape functions, each returning
  an array of stacked Layer objects that Cesium extrudes into a 3D
  tower. `SHAPE_REGISTRY` maps names → functions.
- **Input shape:** `(footprint, totalHeight, primaryColor) → Layer[]`
- **Used by:** `FakeCityGenerator` (landmark silhouettes + satellite
  buildings)
- **Data status:** Drawing library. No Philly-specific content, no
  data dependency. Fully reusable across cities.
- **Status:** Active.

### `cesiumHelpers.js` — Data → Cesium entity translation
- **What it is:** Four builders that turn plain data into Cesium
  entities, plus one converter that turns a picked entity back into a
  plain object for the store.
- **Exports:**
  - `buildUniversityTower(feature)` → cylinder, height = R&D spend
  - `buildDealPoint(feature)` → pulsing point, size = deal amount
  - `buildStatePolygon(feature)` → extruded polygon, height/color = dynamism
  - `buildDealArc(arc)` → glowing polyline
  - `pickedEntityToSelection(entity)` → plain object
- **Depends on:** `colorScales.js` for all color/height mappings
- **Status:** Active.
- **Note:** `buildStatePolygon` is state-level. If the Philly pilot
  never renders state polygons, this export is a candidate for
  `_reference/` in a future cleanup.

### `colorScales.js` — Visual encoders
- **What it is:** The single place where numbers become colors and
  heights. Every 3D element's appearance flows through here.
- **Exports:**
  - `PALETTE` — named colors used app-wide
  - `researchFieldColor(field)` — research domain → hex
  - `rdSpendingToHeight($)` — $1B ≈ 100,000m, min 5,000m
  - `dealSizeScale($)` — $100K → 8px, $100M → 25px
  - `dynamismColor(score)` — 0–100 → cool/gray/warm
  - `dynamismToHeight(score)` — 0–100 → 0–50,000m
- **Used by:** `cesiumHelpers.js` and any UI that renders a color from
  a numeric score
- **Status:** Active.
- **Rule:** All color and height decisions for the 3D layer live here.
  Do not compute a color inline in a component or a helper — add a
  scale function here instead.

### `particleConfigs.js` — Runtime particle textures
- **What it is:** Generates canvas-based textures at runtime so the
  app does not need to ship PNG assets. Currently exports only
  `getDustTexture()` — a soft radial gradient. Cached after first call.
- **Returns:** An HTMLCanvasElement, or `null` in SSR (no `document`).
- **Used by:** Cesium `ParticleSystem` instances.
- **Status:** Active (small).
- **Note:** If bees, planes, or cars need textures later, this is the
  file to extend. Keep the same pattern: lazy-init, cached, returns
  the canvas, no PNG dependency.

### `transitionHelpers.js` — Camera + shell motion
- **What it is:** The motion layer for the immersion state machine.
- **Exports:**
  - `prefersReducedMotion()` — OS accessibility check
  - `snapCamera(viewer, options)` — instant camera jump, uses
    `lookAt()` then unlocks
  - `flyCamera(viewer, options)` — cinematic `flyTo`, offsets camera
    so its forward ray passes through the target city
  - `animateShellOpacity(targets, duration)` — tweens
    `--shell-*-opacity` CSS vars on `:root`
- **Used by:** `useImmersionController.js`
- **Status:** Active. Load-bearing for the Ambient/Reactive/Immersive
  transitions.

### `_reference/mismatchLogic.js` — state-level mismatch detector
- **What it is:** Detects places where research, capital, and mobility
  diverge — but at the **state** level. Groups universities and deals
  by `properties.state`, computes percentiles across states, and
  returns names of mismatched states.
- **Why it is a reference file:** The Philly pilot is one city. There
  is no set of states to compare. Running this on Philly data would
  produce a single-element result.
- **Why keep it:** The logic — percentile cutoffs, high-research/low-
  deals, high-investment/low-mobility — is the shape of the analysis
  we will eventually want at the **tract** level. This file documents
  that shape.
- **Rule:** Do NOT import from here. When tract-level mismatch detection
  is needed, write a new module that operates on tract data, or
  promote this file out of `_reference/` deliberately.
- **Status:** Reference — not in use.

### `_reference/timeData.js` — timeline year-match fallback
- **What it is:** Picks the nearest earlier record when a requested year
  has no data. Keeps the map populated during timeline scrubbing.
- **Why it is a reference file:** The Philly pilot shows a present-tense
  snapshot. There is no year scrubbing.
- **Why keep it:** The fallback strategy (latest record at or before the
  target year) is subtle and easy to re-derive incorrectly. This file
  documents it in code.
- **Rule:** Do NOT import from here. If a timeline returns in a future
  phase, promote this file out of `_reference/` deliberately.
- **Status:** Reference — not in use.

---

## Data flow (relevant slice)

```
data/buildings.js
        │
        ▼
FakeCityGenerator  ──uses──▶  utils/buildingShapes.js
        │                     utils/colorScales.js
        ▼
Cesium entities  ──built by──▶  utils/cesiumHelpers.js
        │                        │
        │                        └──uses──▶ utils/colorScales.js
        ▼
Viewer (Cesium)
        │
        ▼
useImmersionController
        │
        └──uses──▶ utils/transitionHelpers.js
                     (snapCamera / flyCamera / animateShellOpacity)
```

`particleConfigs.js` sits alongside `cesiumHelpers.js` as a texture
source — consumed by any entity or system that needs a soft sprite.

`_reference/*` files are **not** in this flow.

---

## Rules for adding a utility

1. **One concept per file.** If a utility does two unrelated things,
   split it. `transitionHelpers.js` bundles camera + shell because they
   are two halves of the same motion concern; `particleConfigs.js` and
   `colorScales.js` are separate because they answer different
   questions.

2. **No data.** Utilities operate on data passed in. If a file imports
   a specific city's buildings or tracts, it belongs in `data/`, not
   `utils/`.

3. **No React.** Utilities are framework-agnostic. Hooks belong in
   `hooks/`; utilities they call belong here.

4. **No DOM assumptions at module load.** `particleConfigs.js` guards
   with `typeof document === 'undefined'`. `transitionHelpers.js`
   guards with `typeof window === 'undefined'`. Follow that pattern —
   utilities must be importable in SSR or in a test runner.

5. **State-level logic goes in `_reference/`.** If a function groups
   by `state`, iterates over multiple cities, or assumes a timeline,
   it is a scope leftover, not a live utility.

---

## Known issues deferred

These are flagged for a future cleanup phase, not fixed today:

- [ ] `mismatchLogic.js` and `timeData.js` should move to
      `utils/_reference/` once Step 0 grep confirms nothing imports
      them. Same treatment as `data/_reference/cities.reference.js`.
- [ ] `cesiumHelpers.js` exports `buildStatePolygon`, which is
      state-level. If the Philly pilot never renders state polygons,
      this export is a candidate to move to a reference file or delete.
- [ ] No unit tests exist for `colorScales.js` scales. A future phase
      should add tests asserting boundary values:
      `rdSpendingToHeight(0) === 5000`,
      `dealSizeScale(100_000_000) === 25`, etc.
- [ ] `buildingShapes.js` has no Philly-specific content, so it is
      fully reusable. If future cities are added, no changes needed.
      Note this in `DATA.md` when the multi-city phase lands.

---

## Adding a reference file

Same pattern as `data/_reference/`:

1. Create `utils/_reference/` if it does not exist.
2. Add a `README.md` inside it:
   ```
   # _reference/
   **Nothing in this folder is imported by `src/`.**
   These files document logic that may be useful when scope expands.
   They are specs, not dependencies.
   Rules:
   - Do not import from here.
   - Do not delete a file here without confirming it is superseded.
   - When a file here becomes live, move it OUT of `_reference/`.
   ```
3. `git mv` the file into `_reference/`.
4. Prepend a header comment to the moved file naming its scope
   limitation (e.g. "state-level; not applicable to city-scoped pilot").
5. Update this file to record the move.
```

---

## What this file commits you to

- **`utils/` gets the same folder contract as `data/`.** One source of truth per concept, no imports from `_reference/`, migrations are deliberate.
- **The two state-level leftovers are named, not deleted.** `mismatchLogic.js` and `timeData.js` survive as reference, exactly the way `seedCityData.js` survives as `cities.reference.js`.
- **The four active utilities get a one-paragraph definition each.** Anyone opening `utils/` gets an immediate map.
- **A future test phase has a checklist.** The `colorScales.js` boundary tests are already written into the "Known issues" list.

If you want, I can now write the **Phase 3 prompt** — the one that (a) creates `utils/_reference/`, (b) moves the two state-level leftovers with header comments, (c) writes a `utils/_reference/README.md`, and (d) checks consumers of `buildStatePolygon` to decide whether that export moves too. Same structure as the Phase 1 and Phase 2 prompts you already have.