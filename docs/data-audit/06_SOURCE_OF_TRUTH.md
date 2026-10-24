# 06 · Source of Truth: Every Metric, Defined Once

**Files:**
- `source_of_truth.json` is the machine-readable registry. It lives at `src/data/source_of_truth.json`.
- This document is the human-readable version. **If the two disagree, the JSON wins.** Fix this document to match.

**Why this exists:** the audit found filled-in values hidden in the data ($0 incomes, a default 8% unemployment, income used as a stand-in for mobility) and composite scores that combine datasets. From now on, **nothing reaches the map unless it's defined here and passes the gate.**

---

## 1. The rules (every value, every time)

| Rule | In plain words |
|---|---|
| **R1 Registered** | If a metric isn't in the registry, the app can't show it. |
| **R2 Status** | Only `live` metrics can be shown, plus `placeholder` metrics **with** the "Sample data" badge. Anything `pipeline_ready`, `not_sourced`, or `retired` is blocked. |
| **R3 Unit and range** | A value has to be in the right unit and inside its valid range. Out-of-range values are **rejected, not clipped**. |
| **R4 Missing is missing** | Blanks and Census "not available" codes become **"No data."** No filling, guessing, defaults, or stand-ins. |
| **R5 Geography** | Tract data has to match the tract map it's drawn on. Opportunity Atlas (2010 tracts) must be converted to 2020 tracts first. |
| **R6 No combining** | No value can be calculated from two or more metrics. Simple math within one source (like unemployed ÷ labor force) has to be written in the metric's `transform`. |
| **R7 Show the source** | Anywhere a value appears, its source and year appear with it. |
| **R8 One metric per layer** | Each layer shows one metric. Only one tract color layer can be on at a time. |

## 2. Status meanings

| Status | Meaning | Can it be shown? |
|---|---|---|
| `live` | Real data that passed every check | Yes |
| `placeholder` | Sample values | Only with the "Sample data" badge |
| `pipeline_ready` | A script pulls real data, but spec fixes are still open | No, not until it's promoted to `live` |
| `not_sourced` | No approved source | No |
| `retired` | Removed by team decision | No. Delete the code that calculates it. |

---

## 3. Sources

| ID | Source | Year / period | License | How we get it |
|---|---|---|---|---|
| `census_acs_2022_5yr` | Census ACS 5-year | 2018–2022 | Public domain | Census API (`fetch_phila_tracts.py`) |
| `opportunity_atlas_2018` | Opportunity Atlas | Kids born 1978–83; released 2018 | Free with citation (confirm terms) | Manual download |
| `census_tiger_2022` | TIGER/Line tracts | 2022 (2020 tracts) | Public domain | Census download |
| `nsf_herd` | NSF HERD Survey | Fiscal year TBD | Public domain | **Not pulled yet** |
| `venture_monitor` | PitchBook-NVCA Venture Monitor via Technical.ly | Quarter TBD | **Proprietary; needs permission** | Via Technical.ly |
| `osm` | OpenStreetMap | Live | ODbL (credit required) | Cesium ion |
| `nih_reporter` | NIH RePORTER (*candidate*) | TBD | Public domain | Not pulled |

---

## 4. Metrics

### Allowed on the map, once they're promoted to `live`

| Metric ID | Label | Source field | Unit | Valid range | Geography | Status | Layer |
|---|---|---|---|---|---|---|---|
| `tract_boundary` | Census tract | TIGER `geometry`, `GEOID` | polygon | 408 expected | tract, 2020 | pipeline_ready | Base for tract layers |
| `median_household_income` | Median household income | `B19013_001E` (MOE `_001M`) | USD | 2,500 – 250,001 | tract, 2020 | pipeline_ready | Tract color layer |
| `unemployment_rate` | Unemployment rate | `B23025_005E ÷ B23025_003E × 100` | percent | 0 – 100 | tract, 2020 | pipeline_ready | Tract color layer |
| `upward_mobility_p25` | Upward mobility (kids from low-income families) | `kfr_pooled_pooled_p25 × 100` | percentile rank | 0 – 100 | tract, **2010 → crosswalk** | pipeline_ready | Tract color layer |
| `university_rd_expenditure` | University research spending | HERD total R&D | USD | 150,000 – 20B | institution | not_sourced | 3D towers |
| `vc_deal_count` | Venture capital deals | Venture Monitor deal count | count/quarter | ≥ 0 | metro | not_sourced | City panel only |
| `vc_capital_invested` | Venture capital invested | Venture Monitor capital | USD/quarter | ≥ 0 | metro | not_sourced | City panel only |
| `hospital_location` | Hospital | OSM `amenity=hospital` | point | n/a | point | not_sourced | Labeled pins |
| `hospital_research_funding` | Hospital research funding | TBD (NIH RePORTER?) | USD | TBD | institution | not_sourced | none yet |

A few range limits worth knowing:
- The **income range starts at $2,500** because ACS reports lower values as "2,500−". A **$0 fails the gate**, which is exactly how the 25 bad tracts get caught.
- ACS **top-codes income at $250,001**.
- HERD only includes schools spending at least **$150K** on research.

### Blocked

| Metric ID | Status | Why |
|---|---|---|
| `patent_activity`, `startup_employment` | not_sourced | No source; out of MVP |
| `housing_cost_burden` | not_sourced | Candidate: ACS B25070. Out of MVP. |
| `state_dynamism` | retired | State level; dormant view only |
| `community_benefit_score` | retired | Combines datasets (R6) |
| `innovation_index`, `outcome_index` | retired | Steps inside the score |
| `mismatch_alert` | retired | A conclusion drawn from the score |
| `vitality_bars` | retired | Mislabeled or made-up metrics |
| `anchor_gap_marker` | retired | Hand-placed, not data |
| `solution_recommendations` | retired | Advice generated from the score in solutionConnector.js (rules, or the Anthropic API from the browser). Violates the 9/29 guardrails. |
| `story_feed_headlines` | retired | Interpretive text from insightEngine categories; header falsely says 'real census tract data'. |

---

## 5. The gate: how "nothing bypasses" is enforced

Every value goes through **`sourceGate()`** before it's drawn or displayed. It checks R1–R5 and returns either the value, or `null` with a reason. The UI shows `null` as "No data." I tested this against the registry: it passes a real income, returns "No data" for Census code −666666666, rejects $0, rejects the retired score, and rejects an unknown metric.

```js
// src/core/sourceGate.js
import registry from '../data/source_of_truth.json';

const RENDERABLE = new Set(['live', 'placeholder']);

/**
 * sourceGate — every value passes through here before the map or a panel shows it.
 * Returns { ok, value, reason, meta }. Rejected or missing values come back as value: null,
 * so the UI shows "No data". Nothing is ever filled in.
 */
export function sourceGate(metricId, raw, record = {}) {
  const metric = registry.metrics[metricId];
  if (!metric) return reject(metricId, 'R1: metricId not in source_of_truth.json');
  if (!RENDERABLE.has(metric.status)) return reject(metricId, `R2: status is "${metric.status}"`);

  const source = registry.sources[metric.sourceId] ?? {};
  const meta = {
    label: metric.label,
    unit: metric.unit,
    source: source.label,
    vintage: source.vintage,
    sample: metric.status === 'placeholder',
  };

  const geo = metric.geography;
  if (geo && record.geographyLevel && record.geographyLevel !== geo.level)
    return reject(metricId, `R5: geography "${record.geographyLevel}" ≠ "${geo.level}"`, meta);
  if (geo?.boundaryVintage && record.boundaryVintage && record.boundaryVintage !== geo.boundaryVintage
      && !(metric.requiresCrosswalk && record.crosswalked))
    return reject(metricId, `R5: boundary vintage ${record.boundaryVintage} ≠ ${geo.boundaryVintage}`, meta);

  const sentinels = source.missingSentinels ?? [];
  if (raw === null || raw === undefined || Number.isNaN(raw) || sentinels.includes(raw))
    return { ok: true, value: null, reason: 'R4: missing → No data', meta };

  if (metric.validRange) {
    const [min, max] = metric.validRange;
    if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < min || raw > max)
      return reject(metricId, `R3: ${raw} outside [${min}, ${max}] ${metric.unit}`, meta);
  }
  return { ok: true, value: raw, reason: null, meta };
}

function reject(metricId, reason, meta = null) {
  console.warn(`[sourceGate] ${metricId}: ${reason}`);
  return { ok: false, value: null, reason, meta };
}
```

**Using it in a layer or panel:**

```js
const g = sourceGate('median_household_income', tract.values.median_household_income,
  { geographyLevel: 'tract', boundaryVintage: 2020 });
// g.value → number or null ("No data")
// g.meta  → { label, unit, source, vintage, sample }  → use it in the legend and tooltip (R7)
```

### Enforcement checklist

- [ ] `loadDataset()` is the **only** way data enters the app, and it runs `sourceGate()` on every value.
- [ ] Layer builders (`src/map/layers/*`) and panels receive gated values only. They never import raw data files.
- [ ] Add a CI check: `grep` for imports of `philadelphiaTracts.js` or `philadelphiaBuildings.js`, and fail the build if either appears after migration.
- [ ] Add a CI check: every `metricId` used in `src/` must exist in `source_of_truth.json`.
- [ ] Scripts write processed files with values stored under metric IDs, plus a `meta` block (`sourceId`, `vintage`, `retrievedAt`, `script`).
- [ ] Scripts never fill in missing values. `fillna(...)` with a number is not allowed in `scripts/`.

---

## 6. Adding or changing a metric

1. Add the source (if new) and the metric to `source_of_truth.json`, with the status set to `not_sourced`.
2. Fill in every field: `sourceField`, `transform`, `unit`, `validRange`, `geography`, `layer`, `encoding`, `caveats`.
3. Write or update the script. Run it, then record in the PR how many records passed, were missing, or were rejected.
4. Set the status to `pipeline_ready`, then have someone else review the numbers against the original source for at least 3 tracts or institutions.
5. Promote it to `live` in a PR. Update this document in the same PR.
6. **Never add a metric that combines other metrics** (R6). If the team wants one, it's a new decision that has to be discussed with Technical.ly first.
