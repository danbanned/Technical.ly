# STORE.md

How the `store/` folder is organized, what the store holds, and what is
allowed to live there.

---

## Folder contract

store/
├── useMapStore.js ← the entire global state
└── STORE.md


**Hard rules:**

1. **One store.** The app has exactly one Zustand store. Do not add
   a second store. If state must be shared across components, it goes
   here. If it only matters inside one component, use `useState`.

2. **Actions live next to the state they modify.** Zustand allows
   actions to be defined anywhere in the store object; keep them
   adjacent to their slice so the file reads top-to-bottom as a list
   of concerns.

3. **Naming convention distinguishes scope.** State added for the
   Philadelphia pilot is prefixed `phila`. State added for the
   immersion experience is unprefixed but lives in its own labeled
   section. State from the original state-level scope is unprefixed
   and legacy. See "Historical layering" below.

4. **The viewer handle is non-reactive.** `viewer` holds the Cesium
   `Viewer` instance. It is set imperatively via `setViewer` and must
   never appear in a React dependency array — Cesium objects are not
   shallow-comparable.

---

## Historical layering

This store was written for the original **state-level "Innovation &
Opportunity Mapper"**, then extended when the app was scoped down to a
**city-level Philadelphia pilot**. The three layers are visible in the
file's structure:

### Layer 1 — State-level (legacy, unprefixed)
- `universityLayerVisible`, `dealFlowLayerVisible`,
  `mobilityLayerVisible`, `arcsLayerVisible`
- `currentYear`, `yearRange`
- `selectedEntity`, `selectedEntities`
- `mismatchModeEnabled`, `mismatchThresholds`, `mismatches`
- `showStatsPanel`, `showComparisonPanel`, `showGuidedTour`,
  `guidedTourStep`, `mobileSheetOpen`, `deiLens`

These power the multi-state, timeline-scrubbing comparison tool.
Many of them may still be consumed by UI that hasn't been cut yet.
Do not delete without a Step 0 grep.

### Layer 2 — Immersion state machine (Philly-adjacent)
- `immersionMode`, `previousImmersionMode`, `focusedCity`
- `isTransitioning`, `transitionQueue`
- `shellOpacity`, `focusedCityStats`
- `setImmersionMode`, `setFocusedCity`, `setIsTransitioning`,
  `enqueueTransition`, `dequeueTransition`, `setShellOpacity`,
  `setFocusedCityStats`, `fetchCityStats`

Added when the "living article" immersion experience was designed.
Drives camera moves, shell opacity, and the queue that serializes
transitions.

### Layer 3 — Philadelphia pilot (prefixed `phila*`)
- `philaLayerVisibility`, `philaCBSafeMode`, `philaOSMBuildings`,
  `philaOSMHeightScale`, `philaGoogleTiles`,
  `philaEnrichedBuildings`, `philaEconomicColor`,
  `philaHeightDebug`, `philaFilterColor`, `philaLegendExpanded`
- `philaBuildingHeightScale`, `philaSelectedTract`,
  `philaSelectedBuilding`, `philaCompareTracts`,
  `philaTractsWithCBS`, `philaBuildings`
- `philaConnectMode`
- `activeInsight`, `narration`, `narrationLoading`, `narrationError`

Everything the Philly pilot added. The `phila` prefix is intentional
and should be applied to any new state added for this scope.

---

## State slices, defined

### Layer visibility
- **What:** Boolean flags for which Cesium layers are on.
- **Read by:** Layer components in `src/`.
- **Toggled by:** `toggleLayer(name)`.
- **Status:** Legacy. Likely still used by the map shell.

### Time
- **What:** `currentYear` (number) + `yearRange` (tuple).
- **Read by:** Timeline scrubber, `utils/timeData.js`.
- **Status:** Legacy. The Philly pilot is a present-tense snapshot.
  If the timeline UI is gone, this slice is a deletion candidate.

### Selection
- **What:** `selectedEntity` (single) + `selectedEntities` (array, for
  comparison).
- **Set by:** `selectEntity(entity, { shift })`, `resetSelection()`.
- **Behavior:** Shift-click pairs two entities and opens the comparison
  panel.
- **Status:** Legacy (state-level comparison tool).

### Mismatch
- **What:** `mismatchModeEnabled` (bool), `mismatchThresholds` (two
  percentiles), `mismatches` (computed results).
- **Fed by:** `utils/mismatchLogic.js` `detectMismatches()`, which
  groups by `state`.
- **Status:** Legacy state-level logic. Moves to `utils/_reference/`
  when the state-level mismatch feature is retired.

### UI panels
- **What:** `showStatsPanel`, `showComparisonPanel`, `showGuidedTour`,
  `guidedTourStep`, `mobileSheetOpen`, `deiLens`.
- **Purpose:** Which panels are open and how they're configured.
- **Status:** Mixed. Some still used by the Philly pilot shell; some
  legacy. Audit each before deleting.

### Viewer
- **What:** The Cesium `Viewer` instance.
- **Why non-reactive:** Set imperatively via `setViewer(viewer)` at
  bootstrap. Never read reactively.
- **Rule:** Never put `viewer` in a React dependency array.

### Immersion state machine
- **What:** The Ambient / Reactive / Immersive mode + the target city
  + the transition queue.
- **Read by:** `useImmersionController`, `useHoverImmerse`,
  `useNarration`.
- **Key invariant:** A single transition runs at a time. New requests
  are pushed onto `transitionQueue` and dequeued when the current one
  finishes.
- **Status:** Active. Load-bearing for the immersion experience.

### focusedCityStats
- **What:** Pre-computed metrics for the currently immersed city.
- **Populated by:** `fetchCityStats(cityName)` — fetches
  `/data/city-stats/{slug}.json`.
- **Failure mode:** On fetch error, logs a warning and leaves the
  existing stats in place. Never crashes the immersion transition.
- **Status:** Active.

### shellOpacity
- **What:** Target opacity for the header, sidebar, and article feed
  chrome. Mirrors the CSS variables `--shell-*-opacity` on `:root`.
- **Tweened by:** `utils/transitionHelpers.js::animateShellOpacity`.
- **Status:** Active.

### Philadelphia pilot state
- **What:** Layer toggles, selections, height scales, compare slots,
  building/tract caches.
- **Naming:** All prefixed `phila`.
- **Mutually-exclusive toggles:**
  - `philaOSMBuildings` and `philaGoogleTiles` are exclusive.
  - `philaEnrichedBuildings` and `philaGoogleTiles` are exclusive.
  - OSM and Enriched **can** stack.
  - Reason: Google 3D Tiles ships its own imagery + mesh and burns GPU
    memory; running it alongside other building layers risks running
    out.
- **Status:** Active.

### activeInsight
- **What:** The pinned tract object (or null) that the insight card
  renders.
- **Set by:** `setActiveInsight(tract)` and `selectPhilaTract(id)`.
- **Cleared by:** `clearActiveInsight()`, which also wipes narration.
- **Status:** Active.

### Narration
- **What:** `narration` (result object), `narrationLoading` (bool),
  `narrationError` (string or null).
- **Written by:** `useNarration` hook via `setNarration`,
  `setNarrationLoading`, `setNarrationError`.
- **Read by:** The insight panel.
- **Rule:** Components read these; they never call `narrateTract`
  directly.
- **Status:** Active.

### Solution Connector
- **What:** `philaConnectMode` (bool) — whether the solution
  recommendations panel is active for the selected tract.
- **Status:** Active.

---

## Action reference

All actions are defined inline next to their slice. Grouped by concern:

### Immersion
setImmersionMode(mode)
setFocusedCity(city)
setIsTransitioning(flag)
enqueueTransition(mode, city)
dequeueTransition() → { mode, city } | null
setShellOpacity({ header, sidebar, articleFeed })
setFocusedCityStats(stats)
fetchCityStats(cityName) → Promise<stats | null>


### Selection (legacy)
toggleLayer(layerName)
setYear(year)
selectEntity(entity, { shift })
toggleMismatchMode()
setMismatches(mismatches)
setDeiLens(lens)
setMobileSheetOpen(open)
setGuidedTour(show, step)
resetSelection()


### Philadelphia pilot

setPhilaLayerVisibility(key, val)
setPhilaCBSafeMode(flag)
setPhilaOSMBuildings(flag) ← exclusive with GoogleTiles
setPhilaOSMHeightScale(scale)
setPhilaGoogleTiles(flag) ← exclusive with OSM + Enriched
setPhilaEnrichedBuildings(flag) ← exclusive with GoogleTiles
setPhilaEconomicColor(flag)
setPhilaHeightDebug(flag)
setPhilaFilterColor(key)
setPhilaLegendExpanded(flag)
setPhilaBuildingHeightScale(scale)
selectPhilaTract(tractIdOrNull)
selectPhilaBuilding(idxOrNull)
addPhilaToCompare(tract)
clearPhilaCompare()
setPhilaTractsWithCBS(tracts)
setPhilaBuildings(buildings)


### Insight + narration

setActiveInsight(tract)
clearActiveInsight() ← also wipes narration state
setNarration(n)
setNarrationLoading(b)
setNarrationError(e)


### Solution Connector
setPhilaConnectMode(flag)


### Viewer
setViewer(viewer)


---

## Data flow
┌─────────────────────────────────────────────────────────┐
│ useMapStore │
│ (single source of truth for cross-component state) │
└─────────────────────────────────────────────────────────┘
▲ ▲ ▲
│ │ │
│ read/write │ read/write │ read only
│ │ │
┌────┴──────┐ ┌──────┴──────┐ ┌──────┴──────┐
│ Hooks │ │ Actions │ │ UI │
│ │ │ (Cesium, │ │ components │
│ useHover │ │ fetch) │ │ │
│ useImmersion │ │ │ │
│ useNarration │ │ │ │
└───────────┘ └─────────────┘ └─────────────┘


- **Hooks** subscribe to specific slices (using selectors like
  `useMapStore((s) => s.immersionMode)`) to avoid re-rendering on
  unrelated changes.
- **Actions** are called imperatively, either from hooks or from
  event handlers.
- **UI components** read state; they rarely write.

---

## Rules for adding state

1. **Ask first: does it need to be shared?** If only one component
   reads it, use `useState`. If two unrelated components read it, put
   it here.

2. **Prefix by scope.** New Philly-pilot state gets `phila`.
   New immersion state goes in the immersion section. New
   state-level features do not get added — the app is scoped to one
   city.

3. **Pair state with its actions.** Define the initial value, then
   the setter, in the same block. Do not scatter.

4. **Never put Cesium objects in reactive state** except via a
   dedicated `setX` that does an imperative set. `viewer` is the
   example.

5. **Document exclusive toggles.** If two booleans must never both be
   true (like `philaOSMBuildings` and `philaGoogleTiles`), the setter
   handles it in one atomic `set(...)` call, and the reason is
   stated in a comment.

6. **Selectors, not whole-store reads.** Components should read
   `useMapStore((s) => s.someSlice)` — never `useMapStore()` with no
   selector. Reading the whole store subscribes the component to
   every change.

---

## Known issues deferred

These are flagged for future cleanup phases, not fixed today:

- [ ] **State-level slices may be unused.** `currentYear`, `yearRange`,
      `setYear`, `selectedEntity`, `selectedEntities`, `mismatchMode*`,
      `mismatches`, `showGuidedTour`, `guidedTourStep`, `deiLens`,
      `showComparisonPanel` all belong to the original multi-state
      tool. Grep for consumers; move dead state into a
      `_reference/legacyStore.md` or delete outright.
- [ ] **`fetchCityStats` slugification.** Currently
      `cityName.toLowerCase().replace(/[^a-z0-9]+/g, '-')`. For the
      Philly pilot, only `philadelphia` matters, but the function is
      written generically. If only one city is supported, simplify.
- [ ] **`focusedCityStats` default is a seven-field object literal.**
      If a future stat is added to `/data/city-stats/{slug}.json`,
      the default must be updated too. Consider deriving the default
      from the fetch shape.
- [ ] **No selector memoization guidance.** As state grows, components
      may subscribe to derived values (e.g. "is the selected tract a
      mismatch?"). Recommend `useMemo` over manual selectors to keep
      this explicit.
- [ ] **Narration state sits in its own mini-section but is
      coupled to `activeInsight`.** `clearActiveInsight` wipes both,
      which is correct but implicit. A future refactor might extract
      an "insight pipeline" slice that owns both.

---

## Adding a reference file

Same pattern as `data/_reference/` and `utils/_reference/`:

1. Create `store/_reference/` if it does not exist.
2. Add a `README.md` inside:


_reference/
Nothing in this folder is imported by src/.
These files document store shapes that may be useful when scope
expands (multi-city, timeline, comparison). They are specs, not
dependencies.
Rules:

Do not import from here.

When a slice is revived, move it back into useMapStore.js
deliberately.

3. Document the legacy slice's shape and rationale.
4. Record the move in this file.