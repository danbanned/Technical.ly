# technical.me — Build Plan (Philadelphia Pilot MVP)

> **AI-readable build specification.** This file consolidates the project architecture doc, the five MVP scoping decisions, and UI/UX direction extracted from the two reference screenshots. An AI coding agent (or human dev) should be able to build the MVP from this file alone.

---

## 1. One-Sentence Definition

A CesiumJS 3D map of Philadelphia that shows **innovation hotspots** (university/hospital R&D towers, VC deal hubs) alongside a **census-tract mobility heatmap**, with a **click-to-inspect panel** that displays the **Community Benefit Score (0–10)** for any tract.

**Tagline:** One city. One metric. One map. Provable in weeks.

---

## 2. Core Question the Product Answers

> "Did the surrounding neighborhoods actually benefit from nearby innovation activity?"

Most innovation dashboards measure the innovation economy itself (VC flow, research output, startup formation). technical.me measures the **connection between innovation activity and resident outcomes** — the gap nobody is measuring.

---

## 3. Scoping Decisions (Locked)

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | One city: **Philadelphia** | Densest seed data: Penn, Drexel, Temple, Jefferson, CHOP, University City Science Center, transit hubs — already in the dataset |
| 2 | One metric: **Community Benefit Score** | Most direct answer to "did neighborhoods benefit?" Compares R&D + VC density vs. census-tract income & unemployment |
| 3 | **Existing data only** | R&D spend, patents, grad students, VC deal flow, mobility scores, landmark locations already loaded — zero new integrations |
| 4 | **Drop pipeline & leakage metrics** | Both require multi-year individual tracking → Phase 2 |
| 5 | **Single interactive Cesium map** | Viewer already built; MVP only adds a heatmap layer + click panel |

**Primary user: Community Members.** If a resident can open the map and immediately understand their neighborhood, every other user group (ecosystem builders, knowledge workers, stakeholders/nonprofits) benefits automatically. Designing for the least-familiar user forces plain language, clear hierarchy, and accessible color — which satisfies the accessibility requirements by construction.

---

## 4. The Community Benefit Score (CBS)

A single 0–10 number per census tract answering: *how much of nearby innovation activity is translating into resident outcomes?*

**Innovation side (inputs — already in dataset):**
- University R&D spending nearby
- VC deal density
- Patent activity
- Startup employment concentration

**Community side (outcomes — census + mobility index proxies):**
- Median household income (tract)
- Unemployment rate
- Housing cost burden
- Upward mobility score

**Interpretation:**
- High score → innovation correlates with neighborhood benefit
- Low score with high nearby R&D → **mismatch alert** (the key signal the product exists to surface)

**MVP formula (v1, transparent and simple):**
```
innovation_index  = normalize(weighted_sum(rd_spend_within_radius, vc_deal_density, patent_count, startup_emp))
outcome_index     = normalize(weighted_sum(median_income, -unemployment_rate, -housing_cost_burden, mobility_score))
CBS               = round(10 * f(outcome_index, innovation_index), 1)   # f penalizes high innovation + low outcomes
```
Keep weights in a config file; document methodology on a "View Methodology" page (referenced in mockups).

---

## 5. Data

### Sources (all existing — no new pipelines)
| Dataset | Represents | Key fields |
|---|---|---|
| HERD (NSF) | Innovation inputs | university research spending, funding sources, fields |
| Venture Monitor | Innovation outputs | startup funding, deal counts, round sizes |
| State Dynamism Explorer | Opportunity/mobility | mobility scores, business formation, migration |
| Census tract data | Resident outcomes | median income, unemployment, housing cost burden |
| Landmark layer | Anchors | universities, hospitals, tech centers, transit hubs (already geocoded in Cesium) |

### Pipeline (3 stages)
1. **Ingest** — manual quarterly CSV/Excel uploads (MVP cadence)
2. **Process** — clean, normalize field names, geocode to coordinates, dedupe, build time-series snapshots, data-quality checks
3. **Store** — PostgreSQL (Supabase or Neon)

### Schema (PostgreSQL)
```sql
universities(id PK, name, latitude, longitude, research_spending, research_fields, year)
investments(id PK, region_id FK, funding_amount, deal_count, investors, date)
economic_mobility(id PK, tract_geoid, state, mobility_score, business_formation, migration_rate, market_dynamism, year)
tract_outcomes(id PK, tract_geoid, median_income, unemployment_rate, housing_cost_burden, year)
community_benefit_scores(id PK, tract_geoid, score, innovation_index, outcome_index, computed_at)
historical_snapshots(id PK, dataset_type, snapshot_date, description)
```

---

## 6. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router) + React |
| Styling/UI | Tailwind CSS + shadcn/ui |
| 3D Map | CesiumJS (viewer already built) |
| Database | Supabase or Neon PostgreSQL |
| API | Next.js API routes returning JSON |
| Deploy | Vercel |

### API Routes
```
GET /api/universities      ?year=&state=        # towers
GET /api/investments       ?region=&year=       # VC hubs
GET /api/mobility          ?state=&year=        # heatmap tracts
GET /api/tracts/:geoid                          # click-to-inspect payload (CBS + breakdown)
GET /api/insights                               # opportunity gaps, mismatch alerts, top movers
GET /api/metadata                               # available years, last-updated, sources
```

---

## 7. UI/UX Specification (derived from reference screenshots)

### 7.1 Visual direction — what the mockups establish

**Image 1 (target MVP UI — "technical.me MVP: Philadelphia Pilot"):**
- **Dark map theme** — near-black basemap with muted building footprints; data layers carry all the color. This is the correct call: heatmap reds/greens and glowing towers read instantly against dark.
- **Top app bar** — logo + "technical.me – MVP: Philadelphia Pilot" left; centered nav (`MVP Overview` / `About`); compact icon toolbar top-right (search, layers, compare, settings, help `?`).
- **Innovation hotspots as 3D extrusions** — clusters of glowing blue/purple towers at UPenn, Drexel, Temple, Jefferson, CHOP, Hospital Research, University City Science Center; tower height ∝ R&D spend or deal count. Small particle dots show individual VC deals around hubs.
- **Mobility heatmap** — flat census-tract polygons: green = high upward mobility, red = low. Spatial mismatch (red tracts adjacent to glowing towers) is visible at a glance — that contrast IS the product.
- **Labeled landmarks** — pill-style white-on-dark labels (CHOP, UPenn, Drexel, Temple, Jefferson, VC Deal Hub, Center City, West Philadelphia). Keep labels sparse to avoid clutter.
- **Selected neighborhood** — light-gray/white fill with bright outline (see West Philadelphia tract in mockup) so the inspected tract is unmistakable.
- **Legend (bottom-left card):** Innovation Hotspots (R&D/VC activity) · Mobility Heatmap (Green=High, Red=Low) · Selected Neighborhood.
- **Click-to-Inspect Panel (right-side card, closable ✕):**
  1. Header: "Neighborhood Data for Census Tract [number]"
  2. **Community Benefit Score** — large number (e.g., **6.8 / 10**) with a horizontal gradient bar (purple→blue→green) acting as the score gauge
  3. **Nearby Innovation Activity:** R&D spend, VC deal count
  4. **Resident Outcomes:** median household income, unemployment rate
  5. Mini legend at panel bottom
- Cesium attribution bottom-left corner.

**Image 2 (earlier explorations — what to learn and what to cut):**
- Useful patterns to keep for later phases: geocoder search box (top-left), layers panel with checkboxes, **timeline slider with sparkline chart** (2023–2034 scrubber), predictive-insights side panel, **anomaly detection callouts** ("Anomaly Detected in Zone 4B" with red pulse ring), "Run Next Scenario" CTA, capital-flow arcs.
- What to cut for MVP: the neon flow-arc spaghetti, multiple simultaneous chart overlays, satellite imagery basemap, predictive/scenario features. They're visually exciting but violate the "resident can read it in 10 seconds" rule. **MVP = Image 1, not Image 2.** Image 2 features map to Phase 2+.

### 7.2 Design tokens
```
Background:        #0B0E14 (near-black slate)
Surface/cards:     #161B22 at ~95% opacity, 12px radius, subtle border #2A2F3A
Text:              #F0F3F8 primary, #9AA4B2 secondary
Heatmap:           green #2ECC71 → yellow #F1C40F → red #E74C3C (use ColorBrewer RdYlGn alt + patterns for color-blind mode)
Innovation towers: cyan→violet gradient (#4FC3F7 → #7C4DFF), additive glow
Score gauge:       linear-gradient(90deg, #8E44AD, #3498DB, #2ECC71)
Selection:         #E8ECF2 fill @ 40%, 2px #FFFFFF outline
Labels:            pill, #0F1218 bg @ 90%, white text, 12–13px
```

### 7.3 Interaction model
- **Hover** tract → subtle highlight + tooltip with tract number + CBS
- **Click** tract → selection style + inspect panel slides in from right
- **Click** tower/hub → small popover (institution name, R&D spend or deal count)
- **Layer toggles** (toolbar): Innovation Hotspots · Mobility Heatmap · Labels
- **Esc / ✕** closes panel; map remains fully keyboard-navigable (Cesium camera keys + focusable tract list as fallback)
- Camera: default tilted ~45° aerial over Center City/University City; "reset view" control

### 7.4 Accessibility (hard requirements from the brief)
- Plain-language summary string in the inspect panel above raw numbers, e.g. *"This neighborhood is close to major research activity, but incomes here are below the city median."*
- Color-blind-safe alternative palette toggle (blue–orange) + hatching patterns on heatmap
- Clear labels and tooltips on every control
- Keyboard-accessible controls; visible focus states; ARIA labels on panel and legend
- CBS always shown as number + bar (never color alone)

---

## 8. Build Plan — Milestones

### Milestone 0 — Project setup (Days 1–2)
- Next.js + Tailwind + shadcn scaffold, Cesium integration (existing viewer code), Supabase/Neon provisioned, Vercel deploy pipeline
- Load existing landmark + dataset files into Postgres via ingestion scripts

### Milestone 1 — Data foundation (Week 1)
- Geocode/validate Philadelphia tracts (GeoJSON of census tracts)
- Compute v1 Community Benefit Score for every tract; store in `community_benefit_scores`
- Stand up the 6 API routes with JSON contracts above

### Milestone 2 — Map core (Week 2)
- Dark basemap styling; render tract polygons with mobility heatmap coloring
- Render innovation towers (height-scaled extrusions) + VC deal point clusters at known hubs
- Landmark labels (CHOP, UPenn, Drexel, Temple, Jefferson, etc.)

### Milestone 3 — Inspect & legend (Week 3)
- Click-to-inspect panel per spec §7.1 (score, gauge bar, innovation activity, resident outcomes, plain-language summary)
- Selection styling, hover tooltips, legend card, layer toggles
- Accessibility pass: keyboard nav, ARIA, color-blind palette

### Milestone 4 — Polish & validate (Week 4)
- Methodology page; About page; loading/error states; mobile-responsive panel behavior
- User test with 3–5 community members: *"Open the map. What's happening in your neighborhood?"* — success = correct answer in under a minute
- Deploy public pilot URL

**Success criteria:** a user can open the platform, explore the map, toggle layers, click any tract, and quickly understand how innovation activity, investment, and economic opportunity relate in that neighborhood.

---

## 9. Deferred to Phase 2 (do not build now)

- Innovation Inclusion Score (needs education enrollment feeds)
- Local Innovation Pipeline & Innovation Leakage Index (need multi-year individual tracking)
- Multi-city expansion (needs consistent cross-market data)
- Timeline slider + historical animation (Image 2 pattern; needs richer time-series)
- Predictive insights / anomaly detection / scenario runner (Image 2 patterns)
- Region comparison tool, capital-flow arcs, advanced ecosystem-builder analytics
- Automated/real-time data pipeline (MVP stays on quarterly manual uploads)

None of these block validating the core concept; all can layer onto the same Postgres + API + Cesium foundation without redesign.

---

## 10. Team Responsibilities

| Team | Owns |
|---|---|
| Geospatial | Tract GeoJSON, geocoding, Cesium layers, spatial accuracy |
| Data | Cleaning, schema, CBS computation, validation/quality checks |
| Frontend | App shell, inspect panel, legend, toggles, accessibility |
| Product/UX | Plain-language copy, user testing, methodology page, insight definitions |

## 11. Open Questions (carry into team discussion)

1. CBS weighting: equal weights v1, or tune against known-good/bad tracts?
2. Radius for "nearby" innovation activity — fixed 1 mile, or transit-time based?
3. Update cadence beyond quarterly manual uploads — when does automation pay off?
4. Performance budget: how many tract polygons + towers before Cesium needs tiling/LOD?
5. Which automatic insights ship in MVP (mismatch alerts only?) vs. Phase 2?
