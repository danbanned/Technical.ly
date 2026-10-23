# 05 · Map Spec: Put Each Dataset Where It Belongs

**Status:** draft for team review
**Applies to:** the next prototype after the 9/29 client call
**Depends on:** `06_SOURCE_OF_TRUTH.md` and `source_of_truth.json`

---

## 1. Purpose and guardrails

The map's job is to **show data clearly**. That's it. These rules come from the 9/29 call with Danya:

1. **We show data. We don't draw conclusions.** No scores, rankings, "gaps," "mismatches," or headlines that interpret what the data means.
2. **We don't claim cause, and we don't connect datasets to imply a relationship.** Layers can be turned on together, but the map never combines them into a single number.
3. **One visual layer = one dataset.** No layer mixes sources. Each dataset gets its own visual form, so nothing can be confused with anything else.
4. **Research funding and venture capital must look different.** They're different kinds of money.
5. **Anyone should know what they're seeing at first glance.** Every active layer has a legend entry that says what the layer is, its source, and its year.
6. **Framing stays neutral.** Nothing on the map suggests that residents cause what's being shown.

---

## 2. The layer plan

### Data layers

| # | Layer name (UI) | Dataset → metric ID | Drawn on | Visual form | Encoding | Status / blocker |
|---|---|---|---|---|---|---|
| 1 | **Upward mobility** | Opportunity Atlas → `upward_mobility_p25` | 408 real tract shapes | **Flat color fill** on the ground (choropleth) | Sequential color, 5 classes, low → high. Gray with a hatch pattern = no data. | Pipeline ready. Needs a 2010→2020 tract crosswalk (§6). |
| 2 | **Median household income** | ACS → `median_household_income` | 408 tract shapes | Flat color fill | Sequential color, 5 classes. Gray = no data. | Pipeline ready. Needs the missing-value fix (§6). |
| 3 | **Unemployment rate** | ACS → `unemployment_rate` | 408 tract shapes | Flat color fill | Sequential color, 5 classes. Gray = no data. | Pipeline ready. Needs the missing-value fix (§6). |
| 4 | **University research spending** | HERD → `university_rd_expenditure` | One point per university | **3D tower** | Height **calculated** from dollars (square-root scale). One color (blue). | Blocked: pull HERD. |
| 5 | **Venture capital deals** | Venture Monitor → `vc_deal_count`, `vc_capital_invested` | **Metro level only** for now | A number in the city panel, **not on the map** | Deal count and dollars per quarter | Blocked: Technical.ly permission and data. Plotting inside the city needs deal-level locations. |
| 6 | **Hospitals** (reference) | none yet → `hospital_location` | One point per hospital | **Labeled pin** only, no size or height | Location only | Research dollars are blocked until a source is chosen (NIH RePORTER is a candidate). |

**Tract layers 1–3 work as a single choice** (radio buttons, not checkboxes). Only one tract color layer can be on at a time, so two datasets are never blended into one fill.

### Context layers (the backdrop)

| Layer | Rule |
|---|---|
| Basemap (CARTO Voyager, or Esri with no key) | Always on |
| OSM Buildings / Google 3D Tiles | One at a time (already enforced). **Neutral gray. Never colored by data.** |
| Labels | Place names only |

### Coming off the map

| Item | Why |
|---|---|
| Community Benefit Score / Community Opportunity Indicator, gauge, and `/10` badge | It combines datasets into a conclusion |
| `innovationIndex`, `outcomeIndex`, `mismatchAlert` | Same reason |
| "Top opportunity gaps" card | A ranking built from combined data |
| Story feed headlines | Interpretation, not data |
| "Capital Growth," "Dynamism," "Innovation" bars | Mislabeled or made-up metrics |
| Magenta "mismatch" buildings and the "Economic Color" mode | They color real buildings with combined data |
| Enriched Buildings layer | Source tract file is unknown; replaced by layers 1–3 |
| "GAP" markers | Hand-placed conclusions |
| 30th Street Station in the Innovation layer | Transit isn't research data |
| Pulsing animation on tract circles | The animation encodes mobility a second time. Tracts become flat shapes. |
| AI narration | Not in scope for Technical.ly |
| Patents, startup employment, housing cost burden | No source |

---

## 3. Visual rules

- **Each dataset gets its own visual form.**
  - Tracts are **flat color on the ground**.
  - University research is **vertical towers**.
  - Hospitals are **pins**.
  - VC is a **number in a panel** until location-level data exists.
- **Don't reuse a color across datasets.**
  - Research towers are blue. VC is orange (in the panel only, for now). Hospital pins are white or gray.
  - Tract layers use their own sequential palette, such as viridis (purple → teal → yellow). **Don't use red/green or orange**, so tract colors can't be mistaken for VC orange, and "red" doesn't read as a judgment on a neighborhood.
  - Each tract palette must have a color-blind-safe version. Viridis already is.
- **Heights must be calculated from data, never typed by hand.**
  - Research tower height = √(R&D dollars) × a constant, so a tower with 4× the dollars is 2× as tall.
  - The legend shows two reference towers with their dollar values.
- **Missing data is shown as missing.** Gray with a hatch pattern, labeled "No data." It's never filled with a guess.
- **Use the same class breaks every time.** Tract colors use quantile breaks (5 classes) computed across all 408 tracts, and the legend lists the break values.
- **No motion.** Nothing pulses or animates to encode a value.

---

## 4. Panels

### City panel (replaces "Philadelphia, PA" snapshot)

Each line shows **a value, then its source and year**, and nothing else:

```
University research spending   $X.XB    HERD, FY20XX      (sum of Philadelphia universities in HERD)
VC deals                       N deals  Venture Monitor, Q_ 20XX (Philadelphia metro)
VC capital invested            $X.XM    Venture Monitor, Q_ 20XX (Philadelphia metro)
Census tracts shown            408      Census TIGER 2022
```

Drop "Avg mobility," "Balanced," and the mismatch count.

### Click a tract

```
Census Tract 263.01   [neighborhood name if we add a lookup]
Upward mobility (kids from low-income families)   34 / 100     Opportunity Atlas, 2018
Median household income                            $57,992 ± $X  ACS 2018–2022
Unemployment rate                                  15.6% ± X%   ACS 2018–2022
```

- Show the **margin of error** for ACS values.
- Show "No data" when a value is missing.
- No score, no gauge, no bars, no summary sentence.

### Click a university or hospital

- **University:** name, R&D spending, fiscal year, and a source link.
- **Hospital:** name and "Research funding: not yet sourced."

### Legend (always visible)

For each active layer:

```
[swatch or icon]  Upward mobility
                  What: adult income rank of kids who grew up here with low-income parents (0–100)
                  Source: Opportunity Atlas · 2018
                  [5 color classes with values]  [gray hatch = No data]
```

A permanent line at the bottom of the legend:

> *Each layer shows one dataset. Turning on more than one layer places them side by side. The map does not measure whether one affects another.*

---

## 5. How data gets into the app

```
scripts/ (offline)                      public/data/processed/           app (runtime)
───────────────────                     ──────────────────────           ─────────────
fetch_phila_tracts.py  ──►  tracts_acs_2022.geojson        ──►  loadDataset()
fetch_atlas.py (new)   ──►  tracts_atlas_2018.geojson      ──►    └─ sourceGate()  ──► layers + panels
fetch_herd.py (new)    ──►  universities_herd_fy20XX.json  ──►        (rejects anything
(manual, with permission) ► vc_metro_venture_monitor.json  ──►         not in the registry)
```

- **One file per dataset.** Don't merge ACS and Atlas values into one tract file.
- **Every processed file carries a `meta` block** (`metricIds`, `sourceId`, `vintage`, `retrievedAt`, `script`) and stores values under their **metric ID** from `source_of_truth.json`.
- **The app loads data at runtime from `public/data/processed/`** through a single `loadDataset()` function. The hand-typed JS data files (`philadelphiaTracts.js`, `philadelphiaBuildings.js`) are retired.
- **Every value passes `sourceGate()`** before it's drawn (see `06_SOURCE_OF_TRUTH.md`). If a value fails, it's shown as "No data" and logged. It's never hidden and never guessed.

---

## 6. Data fixes needed before any layer goes live

| Fix | Detail |
|---|---|
| Census missing-value codes | Treat −666666666, −999999999, −888888888, −555555555, −333333333, and −222222222 as **null** (the six codes in `source_of_truth.json`). Remove `.clip(lower=0)` for income. |
| No filled-in values | Delete the `fillna(45000)`, `fillna(8.0)`, `fillna(40.0)`, and income-for-mobility substitutions in `fetch_phila_tracts.py`. Missing stays missing. |
| Opportunity Atlas tract years | Convert 2010 tract IDs to 2020 tracts using the Census Bureau's 2020↔2010 tract relationship file, before joining. Record how many tracts matched cleanly, split, or merged. |
| One unit per metric | Unemployment stored as **percent** (0–100) everywhere. |
| Margins of error | Also pull `B19013_001M`, `B23025_003M`, and `B23025_005M`, so the tract panel can show "±". |
| Tract names | Label tracts "Census Tract 263.01." Adding a neighborhood name needs a separately sourced lookup, and that lookup needs its own registry entry. |
| HERD | Pull total R&D for Penn, Drexel, Temple, and Jefferson for one fiscal year. Use the institution's main campus coordinates and say so in the legend. |

---

## 7. Acceptance criteria for the next demo

- [ ] Every visible value traces to one entry in `source_of_truth.json`.
- [ ] No composite score, ranking, or interpretive text appears anywhere.
- [ ] Research and VC are visually distinct. VC isn't drawn as a tower.
- [ ] Tract layers use the 408 real shapes, with one tract layer on at a time.
- [ ] Missing values show as "No data." No value in the app was filled in with a guess.
- [ ] The legend names what, source, and year for every active layer.
- [ ] Someone who has never seen the map can say what each visual is within 30 seconds. **Test this with someone outside the team.**
- [ ] Tower heights are calculated from data.
- [ ] The "Sample data" badge appears only on layers still marked placeholder in the registry.

---

## 8. Phases and owners

| Phase | Work | Owner |
|---|---|---|
| A | Everyone reads 01–03. Yara confirms 02 against the repo. | Yara (lead), all |
| B | Add the registry files (`06`, `source_of_truth.json`) and `sourceGate()` | Danny |
| C | Fix `fetch_phila_tracts.py` (§6) and add `fetch_atlas.py` with the crosswalk | TBD |
| D | Draw tract layers 1–3 as a flat color fill with a radio group, a legend, and the new tract panel | TBD |
| E | Remove everything in "Coming off the map" | TBD |
| F | Add HERD towers (after the pull) | TBD |
| G | Add VC to the city panel (after Technical.ly approves) | TBD |

---

## 9. Questions for Technical.ly

1. Can we use Venture Monitor data, and do you have deal-level locations inside the city, or only metro totals?
2. Is showing mobility, income, and unemployment as three separate tract layers the right set?
3. Hospitals: should they appear at all before we have a research funding source?
4. Which HERD fiscal year should we show?
5. Given your concern about data that's too granular to keep updated, is tract level acceptable?
