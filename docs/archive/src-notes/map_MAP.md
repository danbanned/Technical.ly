
# MAP.md

How the `map/` folder is organized, what each file does, and the rules
for adding new layers.

---

## Folder contract
map/
├── interactions.js ← pick resolver: entity → { type, ref }
├── viewer.js ← camera + basemap manipulation
├── innovationLayer.js ← research/health/transit/gap building specs
├── investmentLayer.js ← VC/incubator building specs
├── labelLayer.js ← named-building label specs
├── mobilityHeatmapLayer.js ← tract circle specs (+ legacy polygon version)
└── MAP.md

text

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
A PlainSpec is one of:

type	Key fields	Purpose
polygon	positions, height, extrudedHeight, colorHex, alpha, outline*	Extruded 3D geometry
ellipse	lon, lat, colorHex, alpha, anim	Ground circle, may pulse
point	lon, lat, colorHex, pixelSize	Screen-space dot
label	lon, lat, altitudeM, text, colorHex, fontSize	Floating text
A spec may also carry:

philaType — 'building' or 'tract'

philaRef — the index (for buildings) or ID (for tracts)

group — 'innovation', 'investment', 'mobility', 'labels'

anim — a block of animation params (only mobility circles use it today)

clickable — flag the renderer reads to decide whether to wire pick events

The renderer, not the layer, decides how to turn a spec into a Cesium
entity. This file documents specs, not entities.

File definitions
interactions.js — Pick resolver
What it is: Two helpers that read the philaType and philaRef
custom properties off a Cesium entity and return a plain reference.

Exports:

resolvePick(entity) → { type, ref } | null

isPhilaEntity(entity) → boolean

Used by: The viewer's click handler.

Status: Active.

viewer.js — Camera + basemap
What it is: The only file in map/ that talks to Cesium directly.

Exports:

flyToPhiladelphia(viewer) — cinematic fly to SCENE.CAMERA

applyDarkScene(viewer) — CartoDB dark basemap

applyLightScene(viewer) — CartoDB light basemap

Note: Both scene functions call removeAll() before adding the
new imagery. This discards any previously-added layer (e.g. a
building mesh) that was added to imageryLayers rather than to the
entity collection. If a future layer goes through imageryLayers,
this will clobber it.

Status: Active.

innovationLayer.js — Innovation building specs
What it is: Filters buildings to four categories
(universityResearch, healthcareAnchor, transitHub,
healthcareGap), stamps a footprint polygon, runs the shape library,
returns one polygon spec per stacked shape layer.

Gap handling: healthcareGap buildings are rendered at
alpha: 0.45 (ghosted) — they are annotations, not real towers.

ID scheme: phila-bldg-{idx}-{layerIdx}.

Group tag: 'innovation'.

Status: Active.

investmentLayer.js — Investment building specs
What it is: Structurally identical to innovationLayer.js, but
filters for ventureCapital and startupIncubator.

ID scheme: phila-invest-{idx}-{layerIdx}.

Group tag: 'investment'.

Status: Active.

Known duplication: ~90% identical to innovationLayer.js. See
"Known issues deferred."

labelLayer.js — Label specs
What it is: One label spec per building, positioned
building height + 80m above the roof.

Gap exclusion: healthcareGap buildings are skipped — their
names are too long for labels.

ID scheme: phila-label-{idx}.

Group tag: 'labels'.

Status: Active.

mobilityHeatmapLayer.js — Tract circle specs
What it is: Turns tracts into pulsing, color-coded ellipse specs
(plus optional beacon points).

Geometry: Area-weighted centroid via shoelace formula; equal-area
circle radius in metres.

Animation: Deterministic — phase and speed are seeded from the
tract index, not Math.random(). Same input → same animation every
reload.

Color: Interpolated low → mid → high through the palette from
data/config.js (PALETTES.mobilityDefault or .mobilityCB).

Options:

coreBeacon — emit a center point (default true)

minRadiusM / maxRadiusM — radius clamps (120 / 520)

fillFactor — fraction of equal-area radius to use (0.78)

Legacy export: buildMobilitySpecs(tracts, cbSafeMode) is a
polygon-based version kept for rollback. Do not use it in new code.

ID schemes: phila-tract-{id} (circle), phila-tract-beacon-{id}
(beacon).

Group tag: 'mobility'.

Status: Active (circle version). Legacy polygon version is
rollback-only.

Data flow
text
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
Every layer is a pure function. The renderer is the only impure piece,
and it lives outside this folder.

Rules for adding a layer
Never import cesium. Return plain specs. If the renderer
needs something Cesium-specific, extend the spec, not the layer.

Every pickable spec carries philaType, philaRef, and group.
The pick resolver reads these. Missing them means the entity is
unclickable.

ID scheme is phila-{group}-{ref}-{subidx}. Deterministic,
stable across renders, unique within the layer.

Deterministic animation only. Use a seeded RNG
(seededRandom(idx) in mobilityHeatmapLayer.js) — never
Math.random(). Otherwise the layer twitches every re-render.

One concern per file. innovationLayer and investmentLayer
are separate because they tag specs with different group values
that the store uses to filter selections. If they were merged, the
tag would need a parameter.

Pure geometry helpers stay local. footprint, polygonCentroid,
polygonRadiusM, lerpHex, seededRandom are private to their
files. If a third file needs one, promote it to
utils/geoHelpers.js (does not exist yet — create deliberately).

Known issues deferred
These are flagged for a future cleanup phase, not fixed today:

□ innovationLayer.js and investmentLayer.js are ~90%
duplicated. The only differences are the category filter, the
ID prefix, the group tag, and the gap alpha handling. A shared
buildBuildingSpecs(buildings, { categories, idPrefix, group, gapAlpha }) helper would collapse them. Defer until a third
building category appears.
□ mobilityHeatmapLayer.js exports buildMobilitySpecs (legacy
polygon version). Kept for rollback only. If nothing imports it
after a release cycle, delete it or move to map/_reference/.
□ viewer.js scene functions clobber imageryLayers. If a
future layer adds to imageryLayers, the swap will remove it.
Consider tagging imagery layers by ID and only removing the
basemap.
□ No reference folder exists. When a layer is retired (like the
legacy polygon version of mobility), it should go to
map/_reference/ following the same pattern as data/_reference/
and utils/_reference/. Create it when the first retirement
happens.
□ anim block only supports circles. If buildings or labels
need animation later, the spec shape will need to grow. Document
the anim contract before adding a second consumer.
Adding a reference file
Same pattern as data/_reference/ and utils/_reference/:

Create map/_reference/ if it does not exist.

Add a README.md inside:

text
# _reference/
**Nothing in this folder is imported by `src/`.**
These files document layer implementations that have been retired
or superseded. They are kept for rollback and reference only.
Rules:
- Do not import from here.
- When a layer here is revived, move it OUT of `_reference/`.
Move the retired file in with git mv.

Prepend a header comment: "Retired: [date]. Superseded by [file]."

Record the move in this file.

text

---

## What this file commits you to

- **The spec pattern is now explicit.** Every layer returns plain objects; only `viewer.js` touches Cesium.
- **The `philaType`/`philaRef`/`group` contract is documented.** Anyone adding a layer knows what makes an entity pickable.
- **The ID scheme is fixed.** Deterministic, greppable, unique.
- **Deterministic animation is a rule.** No `Math.random()` in layers.
- **The duplication is named, not hidden.** `innovationLayer` / `investmentLayer` are flagged as candidates for a shared helper when a third category appears.

The one decision this file doesn't make for you: **when does `innovationLayer` + `investmentLayer` get merged?** That's a real refactor, not a documentation change — but the "Known issues deferred" section points at exactly when it becomes worth doing (when a third category appears, or when a bug has to be fixed in both files).