# 03 · Our Data, Explained

This covers what each dataset is, what it measures, what it does on our map, and what it **can't** tell us. Read this before you present or change a layer.

**The rule from 9/29:** we **show** data. We don't draw conclusions, claim one thing causes another, or combine datasets to imply a relationship. Each dataset below stands on its own.

---

## Economic mobility

### Opportunity Atlas (Opportunity Insights + U.S. Census Bureau)

- **What it is:** Researchers followed millions of people who were kids in the 1980s. For each census tract, they measured how those kids were doing financially as adults.
- **The number we use:** `kfr_pooled_pooled_p25`. For kids who grew up in the tract **with low-income parents** (at the 25th percentile), it's their average household income **rank** as adults, on a 0–100 scale.
  - Example: 34 means those kids grew up to earn more than about 34% of Americans their age.
  - This matches how the team defined it: *economic mobility is where you start compared to where you end up.*
- **Geography:** census tracts, using **2010** tract boundaries.
- **Time period:** kids born 1978–1983, with adult income measured in their mid-30s. The data was released in 2018.
- **What it does on the map:** colors each tract by upward mobility.
- **What it can't tell us:**
  - It describes a past generation, not people living there today.
  - It isn't a "score" of the neighborhood.
  - It doesn't explain *why* mobility is high or low.
- **In the repo:** pulled by `fetch_phila_tracts.py` from a file you download by hand. The app calls it `mobilityScore`, but a clearer name would be "upward mobility rank." **It isn't live.** The live map uses sample values.
- **Link:** https://www.opportunityatlas.org/

---

## Economic conditions today

### American Community Survey (ACS), 5-year estimates (U.S. Census Bureau)

- **What it is:** The Census Bureau's ongoing survey of households. The 5-year version combines 2018–2022 responses, so it's reliable for small areas like tracts.
- **The numbers we use:**
  - **Median household income** (table `B19013`, field `B19013_001E`): the middle household's yearly income in the tract, in dollars.
  - **Unemployment rate** (table `B23025`): unemployed people (`B23025_005E`) divided by the civilian labor force (`B23025_003E`). People not looking for work aren't counted as unemployed.
- **Geography:** census tracts (2020 boundaries).
- **What it does on the map:** a tract can be colored by income or by unemployment. That should be one choice at a time, and never blended together.
- **What it can't tell us:**
  - These are **estimates with a margin of error**, which can be large for small tracts.
  - When a sample is too small, the Census Bureau returns a code meaning "not available." That's missing data, **not zero**.
- **In the repo:** pulled by `fetch_phila_tracts.py`. **It isn't live.** The live map uses sample values.
- **Link:** https://data.census.gov/all?q=Income

### Census TIGER/Line tract boundaries

- **What it is:** the official shapes of census tracts.
- **What it does:** it's the "canvas" every tract layer is drawn on. Philadelphia has 408 tracts.
- **In the repo:** real shapes exist in `public/data/census_tracts/philadelphia_tracts.geojson` and `scripts/phila_tracts_full.geojson`. **The live map uses 11 hand-drawn rectangles instead.**

---

## Research funding

### HERD Survey (National Science Foundation, NCSES)

- **What it is:** The Higher Education Research and Development Survey. Each year, U.S. colleges and universities report how much they spent on research.
- **The number we use:** **total R&D spending** per institution, in dollars, for one fiscal year.
- **Geography:** one number for each **institution**. It isn't broken down by building or by campus.
- **What it does on the map:** a university shown as a tower whose height is **calculated** from its R&D spending.
- **What it can't tell us:**
  - Where on campus the money is spent.
  - Who it benefits.
  - Hospital research that isn't reported through a university.
- **In the repo:** **not pulled yet.** The live numbers are placeholders.
- **Link:** [HERD Survey](https://www.google.com/goto?url=CAESgAEB6zswFWzv1-L-llW5DNRE8tGSLY-LtpeH8NS86gi0bl1kq8a9P52qwO1ZFg-0UygvV91GohKTX3QI1Ia4qOn4McM-9cr4o_YBqT-TH8XpsMrToKdO0v7OeizFLVXdBQLMnIFRRuzarCN5KbvY8NeGukUOwJUocII2JcHugyqTXQ). The direct link from our notes is `ncsesdata.nsf.gov/profiles/site?method=rankingbysource&ds=herd`.

### Hospital research (no source yet)

- CHOP, Penn Medicine, Temple Hospital, and Jefferson Health are on the map with placeholder R&D numbers.
- Hospitals mostly **aren't in HERD**. One candidate source is **NIH RePORTER**, which lists federal research grants by organization. Confirm it before using it.
- Until then, hospitals should either stay off the research layer or appear as **labeled locations only**, with no size or number.

---

## Investment

### PitchBook-NVCA Venture Monitor (reported by Technical.ly)

- **What it is:** quarterly counts of venture capital deals and dollars invested.
- **The numbers we use:** **number of deals** and **capital invested**, per quarter.
- **Geography:** as Technical.ly reports it, **by metro area and state**, not by neighborhood or building.
- **What it does on the map:** at metro level, it's a city-wide number in the snapshot panel. Plotting deals **at locations inside the city** would need deal-level addresses from Technical.ly.
- **What it can't tell us:**
  - Where in the city deals happened, unless we get the deal-level data.
  - Anything about research funding. This is private investment, and **it must stay visually separate from research money.** That was Danya's key point.
- **In the repo:** **not pulled.** The 4 "investment" towers use placeholder deal counts.
- **License:** proprietary PitchBook data. We need Technical.ly's permission to use it.
- **Link:** [VC Investment Data 2025](https://www.google.com/goto?url=CAESdwHrOzAVRkNDJbZyKI26Qbmlh9G5up5fGA9Qxv6lT5f6ZWNqDZ-Nbc8xLfWIRnVrlBDgQdTszaBY1JS15RzbU3eZU6wJt1zPxZUZXT9OqZBirKSk7THDLLTyJUF_1TE_o9-9LrWwy7y4r7TvmCJTle_NAKlb61fF). The direct link from our notes is `technical.ly/venture-monitor-snapshots/`.

---

## Context layers (the backdrop, not data)

| Layer | What it is | Rule |
|---|---|---|
| OpenStreetMap buildings | Community-mapped building footprints and heights | Neutral gray. **Don't color them by tract data.** That makes a building look like it "has" a mobility value. |
| Google Photorealistic 3D Tiles | Google's 3D city model | Backdrop only |
| Basemap (CARTO or Esri) | The street map | Backdrop only |

---

## Things in the app that aren't datasets

These are **calculations or placeholders the team made**, not data from any source:

| Item | What it really is |
|---|---|
| Community Benefit Score / Community Opportunity Indicator | Our own formula blending research, deals, income, unemployment, and mobility |
| `innovationIndex`, `outcomeIndex` | Steps inside that formula |
| "Top opportunity gaps," "mismatch," magenta buildings | Conclusions drawn from that formula |
| Story feed headlines | Text written from those conclusions |
| "Capital Growth," "Dynamism" bars | Relabeled versions of employment rate and mobility |
| "GAP" markers | Places the team marked by hand |
| Patents, startup employment, housing cost burden | Listed as inputs, but **there's no source for any of them** |
| EIG State Dynamism (PA 52, MD 58) | State-level, only in the old multi-city view |

Under the 9/29 guardrails, **all of these come off the map.** See `05_MAP_SPEC.md`.
