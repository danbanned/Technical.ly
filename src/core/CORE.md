# Looking through `core/` — the big finding first

Before simplifications, one thing you need to see:

**There are TWO complete CBS engines in your codebase**, and they don't agree.

| | `data/philadelphiaBuildings.js` engine | `core/cbs.js` engine |
|---|---|---|
| **Config shape** | `innovationWeights`, `outcomeWeights`, `mismatchAlert`, `ranges` (camelCase, nested) | `INNOVATION_WEIGHTS`, `OUTCOME_WEIGHTS`, `MISMATCH_THRESHOLDS`, `RADIUS_KM` (UPPER_SNAKE) |
| **Config source** | local to that file | imported from `../data/config.js` |
| **Proximity math** | Gaussian falloff | Haversine + hard radius |
| **Normalization** | Fixed ranges from config | Min-max across tract population |
| **CBS formula** | `0.55·outcome + 0.45·(1−gap)` | `0.5·outcome + 0.5·ratio` |
| **Building fields** | `rdSpending`, `vcDealCount` | `rdSpend`, `dealCount` (the aliases) |
| **Tract shape** | Nested (`residentOutcomes.*`) | Flat (`medianIncome`, `unemploymentRate`) |

This is why I flagged the `CBS_CONFIG` collision earlier — it's not just two configs, it's **two entire pipelines with different data contracts**. Every module in `core/` is written against the flat shape, while the generated tracts in the data layer use the nested shape. Somewhere a translation happens. That's fragile.

**Also, two import paths in `core/` will break the data refactor:**

- `core/cbs.js` → `from '../data/config.js'` (config's `CBS_CONFIG` is being deleted in Phase 1)
- `core/solutionConnector.js` → `from '../data/philadelphiaBuildings'` (that file is being deleted)

Fix those when you run the Phase 1 prompt.

Now, per-file simplification.

---

## 1. `core/cbs.js`

**What it does (1 line):** Haversine-radius variant of the CBS scoring — normalizes across the tract population rather than against fixed ranges.

**Issues:**
- Reads the wrong-shaped `CBS_CONFIG` from `data/config.js`
- Uses alias fields (`rdSpend`, `dealCount`)
- Duplicate of the data-layer engine
- Verbose haversine + normalize implementation
- `generateSummary` hand-writes the label logic that `plainLanguageSummary` in the data layer already does

**Simplified:**

```js
import { CBS_CONFIG } from '../data/config.js';

const R = 6371;
const toRad = (d) => (d * Math.PI) / 180;

function haversineKm([lon1, lat1], [lon2, lat2]) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const minmax = (values) => {
  const min = Math.min(...values);
  const span = Math.max(...values) - min;
  return span === 0 ? values.map(() => 0.5) : values.map((v) => (v - min) / span);
};

const round1 = (n) => Math.round(n * 10) / 10;

export function aggregateNearbyInnovation(tract, buildings, radiusKm) {
  let rdSpendNearby = 0;
  let vcDealsNearby = 0;

  for (const b of buildings) {
    if (haversineKm(tract.centroid, [b.lon, b.lat]) > radiusKm) continue;
    if (b.category === 'universityResearch' || b.category === 'healthcareAnchor') {
      rdSpendNearby += b.rdSpend || 0;
    }
    if (b.category === 'ventureCapital' || b.category === 'startupIncubator') {
      vcDealsNearby += b.dealCount || 0;
    }
  }
  return { rdSpendNearby, vcDealsNearby };
}

export function computeAllCBS(tracts, buildings, cfg = CBS_CONFIG) {
  const innovation = tracts.map((t) =>
    aggregateNearbyInnovation(t, buildings, cfg.RADIUS_KM)
  );
  const rdNorm = minmax(innovation.map((d) => d.rdSpendNearby));
  const vcNorm = minmax(innovation.map((d) => d.vcDealsNearby));
  const iw = cfg.INNOVATION_WEIGHTS;

  const innovationIndices = tracts.map((_, i) =>
    iw.rdSpend * rdNorm[i] + iw.vcDensity * vcNorm[i]
  );

  const mobilityNorm = minmax(tracts.map((t) => t.mobilityScore || 0));
  const incomeNorm   = minmax(tracts.map((t) => t.medianIncome || 0));
  const unempNorm    = minmax(tracts.map((t) => 1 - (t.unemploymentRate || 0)));
  const ow = cfg.OUTCOME_WEIGHTS;

  const outcomeIndices = tracts.map((_, i) =>
    ow.mobility * mobilityNorm[i] + ow.income * incomeNorm[i] + ow.unemployment * unempNorm[i]
  );

  const { innovationHigh, outcomeLow } = cfg.MISMATCH_THRESHOLDS;

  return tracts.map((tract, i) => {
    const ii = round1(innovationIndices[i]);
    const oi = round1(outcomeIndices[i]);
    const ratio = Math.min(oi / Math.max(ii, 0.05), 1);
    const cbs = round1(10 * (0.5 * oi + 0.5 * ratio));
    const mismatchAlert = ii > innovationHigh && oi < outcomeLow;
    return { ...tract, innovationIndex: ii, outcomeIndex: oi, cbs, mismatchAlert };
  });
}

export function findTopGaps(tractsWithCBS, n = 3) {
  return [...tractsWithCBS]
    .sort((a, b) => (b.innovationIndex - b.outcomeIndex) - (a.innovationIndex - a.outcomeIndex))
    .slice(0, n);
}

export function generateSummary(tract) {
  if (tract.mismatchAlert) {
    return 'This neighborhood has significant innovation activity nearby (universities, hospitals, or venture capital), but resident outcomes — including income, employment, and upward mobility — remain low. The gap between innovation investment and community benefit is pronounced here.';
  }
  const label = tract.cbs >= 7 ? 'strong' : tract.cbs >= 4 ? 'moderate' : 'weak';
  const verb = label === 'strong' ? 'in line with'
             : label === 'moderate' ? 'partially reflecting'
             : 'not yet reflecting';
  return `This neighborhood shows a ${label} connection between nearby innovation activity and resident outcomes. Economic mobility, income, and employment levels are ${verb} the innovation assets in the surrounding area.`;
}
```

**Nothing functional changed** — same math, same outputs. Just shorter. But **decide:** is this engine live, or is the data-layer one? If it's live, the data-layer one is dead. If it's dead, delete it and repoint callers at the data-layer one.

---

## 2. `core/insightEngine.js`

**What it does (1 line):** Turns a tract into a present-tense, community-benefit-framed insight object, with a runtime guard against investment/prediction language.

**Issues:**
- 30-line header essay
- `PHASE2_TREND_INSIGHTS_ENABLED` + `buildTrendInsight` = dead code
- Dev-only test suite inline at the bottom (bloats the file, runs on every import in dev)
- Adapter `buildTractInsightFromStore` exists only because store tracts use flat fields — this is a design smell, but keep it for now

**Simplified:**

```js
/**
 * insightEngine.js — tract → present-tense, community-benefit insight.
 *
 * Hard rules (enforced at runtime by assertDocAligned):
 *   • Present tense. No predictions.
 *   • No investment language (buy, invest, returns, appreciate, flip).
 *   • No false-update language (AI claiming to have edited data).
 *
 * Copy is written for a resident, not a buyer or investor.
 */

const INNOVATION_HIGH = 0.45;
const OUTCOME_HIGH    = 0.55;

const BANNED_PATTERNS = [
  // Predictive / investment
  /\bwill (go up|rise|increase|grow|appreciate)\b/i,
  /\bprices? (will|are going|should)\b/i,
  /\bbuy (here|now|a house|property)\b/i,
  /\b(good|great|smart) (investment|deal|buy)\b/i,
  /\b(invest|investing) (here|now)\b/i,
  /\breturns?\b/i,
  /\bget in early\b/i,
  /\bflip\b/i,
  /\bguaranteed\b/i,
  /\byou(?:'ll| will) (profit|make money|see gains)\b/i,
  // False-update claims (observer rule)
  /\bI(?:'ve| have) (?:updated|refreshed|corrected|revised|fixed)\b/i,
  /\bI (?:just |now )?(?:updated|corrected|fixed|changed|revised|refreshed)\b/i,
  /\b(?:data|figures?|numbers?) (?:has|have) been (?:updated|refreshed|corrected) (?:to reflect|as of)\b/i,
];

export function assertDocAligned(...strings) {
  for (const s of strings) {
    if (typeof s !== 'string') continue;
    for (const re of BANNED_PATTERNS) {
      if (re.test(s)) throw new Error(`insightEngine: off-doc phrasing: "${s}"`);
    }
  }
  return true;
}

const money = (v) =>
  v >= 1e9 ? `$${(v / 1e9).toFixed(2).replace(/\.?0+$/, '')}B`
: v >= 1e6 ? `$${(v / 1e6).toFixed(0)}M`
: `$${Math.round(v).toLocaleString()}`;

export const INSIGHT_CATEGORY = {
  OPPORTUNITY_GAP: 'opportunity_gap',
  ALIGNED_BENEFIT: 'aligned_benefit',
  STRONG_LOCAL:    'strong_local',
  UNDERSERVED:     'underserved',
};

export function buildTractInsight(tract, { runGuard = false } = {}) {
  const ii = tract.innovationIndex;
  const oi = tract.outcomeIndex;
  const innHi = ii >= INNOVATION_HIGH;
  const outHi = oi >= OUTCOME_HIGH;
  const isMismatch = tract.mismatchAlert ?? (innHi && oi < 0.40);

  const rd     = tract.innovationInputs?.nearbyRdSpending ?? 0;
  const vc     = Math.round(tract.innovationInputs?.vcDealDensity ?? 0);
  const income = tract.residentOutcomes?.medianHouseholdIncome;
  const unemp  = tract.residentOutcomes?.unemploymentRate;

  let category, badge, headline, resident, builder;

  if (isMismatch || (innHi && !outHi)) {
    category = INSIGHT_CATEGORY.OPPORTUNITY_GAP;
    badge    = { label: 'Opportunity gap', tone: 'alert' };
    headline = 'High innovation nearby — resident outcomes lag';
    resident = 'This neighborhood is close to major research and investment activity, but local incomes and mobility are below the city median.';
    builder  = 'A candidate area for workforce development, training, or hiring partnerships — innovation is present but not yet reaching residents here.';
  } else if (innHi && outHi) {
    category = INSIGHT_CATEGORY.ALIGNED_BENEFIT;
    badge    = { label: 'Innovation reaching residents', tone: 'positive' };
    headline = 'Nearby innovation and resident outcomes are aligned';
    resident = 'This neighborhood sits near significant research and investment activity, and local incomes and mobility are tracking with it.';
    builder  = 'A reference case — useful for understanding what alignment between innovation activity and community benefit looks like.';
  } else if (!innHi && outHi) {
    category = INSIGHT_CATEGORY.STRONG_LOCAL;
    badge    = { label: 'Strong outcomes', tone: 'neutral' };
    headline = 'Solid resident outcomes, limited nearby innovation';
    resident = 'Resident outcomes here are relatively strong, though there is little research or startup activity directly nearby.';
    builder  = 'Outcomes are being driven by factors other than the innovation economy measured here.';
  } else {
    category = INSIGHT_CATEGORY.UNDERSERVED;
    badge    = { label: 'Limited activity', tone: 'neutral' };
    headline = 'Limited innovation nearby, outcomes below median';
    resident = tract.gapFlag
      ? 'There is no major university or hospital research anchor near this neighborhood, and resident outcomes are below the city median.'
      : 'There is little research or startup activity near this neighborhood, and resident outcomes are below the city median.';
    builder  = 'A candidate area for new investment, anchor partnerships, or program expansion.';
  }

  const facts = [
    { label: 'Community Benefit Score', value: `${tract.communityBenefitScore} / 10` },
    { label: 'R&D spend nearby', value: money(rd) },
    { label: 'VC deals nearby', value: `${vc}` },
  ];
  if (income != null) facts.push({ label: 'Median household income', value: `$${income.toLocaleString()}` });
  if (unemp  != null) facts.push({ label: 'Unemployment rate',      value: `${unemp}%` });

  const insight = {
    category, badge, headline, resident, builder, facts,
    timeframe: 'present',
    dataNote: 'Snapshot of current conditions. Not a forecast.',
    guardrail: 'present-tense, community-benefit framed; no predictive or investment advice',
  };

  if (runGuard) assertDocAligned(insight.headline, insight.resident, insight.builder);
  return insight;
}

// Store tracts use flat fields. Map them to the nested shape above.
export function buildTractInsightFromStore(tract, opts = {}) {
  return buildTractInsight({
    communityBenefitScore: tract.cbs,
    innovationIndex: tract.innovationIndex,
    outcomeIndex:    tract.outcomeIndex,
    mismatchAlert:   tract.mismatchAlert,
    gapFlag:         tract.gapFlag,
    residentOutcomes: {
      medianHouseholdIncome: tract.medianIncome,
      unemploymentRate: tract.unemploymentRate != null
        ? +((tract.unemploymentRate * 100).toFixed(1))
        : undefined,
    },
    innovationInputs: {
      nearbyRdSpending: tract.rdSpendNearby,
      vcDealDensity:    tract.vcDealsNearby,
    },
  }, opts);
}
```

**Removed:** the Phase 2 stub (dead), the inline test runner (belongs in a test file — see `narrateInsight.js`).

---

## 3. `core/narrateInsight.js`

**What it does (1 line):** Builds a facts payload from a tract, calls the narration API, guards the response, returns text.

**Issues:**
- 20-line header essay
- The system prompt is verbose (but load-bearing — rules matter, keep most of it)
- Dev-only adversarial test runner at module init — bloats the file, runs on every import in dev
- `buildFreshnessContext` isn't exported (fine, but call it once per request)

**Simplified:**

```js
/**
 * narrateInsight.js — tract → AI narration.
 *
 * Fallback chain: POST /api/narrate → window.claude.complete → throw.
 * Every response passes through assertDocAligned before it reaches the UI.
 */

import { buildTractInsightFromStore, assertDocAligned } from './insightEngine.js';
import { DATA_SOURCES, STALENESS_THRESHOLD_MONTHS } from '../data/config.js';

export class NarrationUnavailableError extends Error {
  constructor(msg) { super(msg); this.name = 'NarrationUnavailableError'; }
}

// ── staleness ──────────────────────────────────────────────────────────────

export function computeStaleness(isoDate, now = new Date()) {
  const ageMonths = (now - new Date(isoDate)) / (1000 * 60 * 60 * 24 * 30.44);
  const rounded = Math.round(ageMonths);
  const years = Math.floor(rounded / 12);
  const months = rounded % 12;

  const ageLabel =
    years === 0  ? `${rounded} month${rounded !== 1 ? 's' : ''} old`
  : months === 0 ? `${years} year${years !== 1 ? 's' : ''} old`
  :                `${years} year${years !== 1 ? 's' : ''} and ${months} month${months !== 1 ? 's' : ''} old`;

  return { ageMonths: rounded, ageLabel, isStale: ageMonths > STALENESS_THRESHOLD_MONTHS };
}

function buildFreshnessContext(now = new Date()) {
  const sources = Object.values(DATA_SOURCES).map((src) => {
    if (src.synthetic) {
      return { id: src.id, label: src.label, synthetic: true, note: src.note };
    }
    const s = computeStaleness(src.lastUpdated, now);
    return {
      id: src.id, label: src.label, vintage: src.vintage,
      lastUpdated: src.lastUpdated, ageLabel: s.ageLabel, isStale: s.isStale,
    };
  });

  const hasSyntheticOnly = sources.every((s) => s.synthetic);
  const stale = sources.filter((s) => !s.synthetic && s.isStale);

  const summary = hasSyntheticOnly
    ? 'All figures are synthetic sample data — no real collection dates exist.'
  : stale.length > 0
    ? `${stale.length} source(s) not refreshed in over ${STALENESS_THRESHOLD_MONTHS} months: ` +
      stale.map((s) => `${s.label} (${s.ageLabel})`).join('; ')
  : 'All sources are current.';

  return { sources, hasSyntheticOnly, staleSourceCount: stale.length, summary };
}

// ── prompt ─────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a community benefit analyst writing for technical.me, a civic data tool for Philadelphia.

Write 2–3 sentences describing how nearby innovation activity does or does not reach a specific neighborhood's residents.

RULES (output breaking any rule will be rejected):
1. Present tense only. No predictions or forecasts.
2. No investment language (buy, invest, returns, profit, appreciate, flip).
3. Frame around residents and community benefit, not institutions or investors.
4. End with exactly: "Note: all figures are sample data for demonstration purposes."
5. If any source has isStale: true, mention it once in plain language.
6. NEVER claim to have updated, refreshed, corrected, or fixed data.
7. If dataFreshness.hasSyntheticOnly is true, rule 4 covers it — do not repeat mid-sentence.`;

function buildUserPrompt(tract, insight, now) {
  const facts = {
    neighborhood:         tract.neighborhood,
    communityBenefitScore: `${tract.cbs} / 10`,
    insightCategory:      insight.category,
    innovationIndex:      tract.innovationIndex?.toFixed(2) ?? 'N/A',
    outcomeIndex:         tract.outcomeIndex?.toFixed(2)    ?? 'N/A',
    medianIncome:         tract.medianIncome != null ? `$${tract.medianIncome.toLocaleString()}` : 'N/A',
    unemploymentRate:     tract.unemploymentRate != null
      ? `${(tract.unemploymentRate * 100).toFixed(1)}%`
      : 'N/A',
    mobilityScore:        `${tract.mobilityScore} / 100`,
    nearbyRdSpend:        tract.rdSpendNearby != null
      ? tract.rdSpendNearby >= 1e9
        ? `$${(tract.rdSpendNearby / 1e9).toFixed(1)}B`
        : `$${(tract.rdSpendNearby / 1e6).toFixed(0)}M`
      : 'N/A',
    nearbyVCDeals:        tract.vcDealsNearby ?? 'N/A',
    mismatchAlert:        tract.mismatchAlert ? 'yes' : 'no',
    dataFreshness:        buildFreshnessContext(now),
  };

  return `Write a 2–3 sentence community benefit narrative for this census tract.
If any data source is stale, mention it once in plain language.

Facts:
${JSON.stringify(facts, null, 2)}`;
}

// ── API ────────────────────────────────────────────────────────────────────

async function callNarrationAPI(systemPrompt, userPrompt, signal) {
  if (import.meta.env.VITE_ENABLE_NARRATION !== 'true') {
    throw new NarrationUnavailableError('Narration disabled (VITE_ENABLE_NARRATION != "true")');
  }

  try {
    const res = await fetch('/api/narrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemPrompt, userPrompt }),
      signal,
    });
    if (res.ok) {
      const data = await res.json();
      if (data.text) return data.text;
      if (data.error) console.warn('[narrateInsight] /api/narrate:', data.error);
    }
  } catch (err) {
    if (err.name === 'AbortError') throw err;
  }

  if (typeof window !== 'undefined' && typeof window.claude?.complete === 'function') {
    const text = await window.claude.complete(userPrompt, { system: systemPrompt });
    if (typeof text === 'string' && text.length > 10) return text;
  }

  throw new NarrationUnavailableError('No narration backend reachable');
}

// ── main ───────────────────────────────────────────────────────────────────

export async function narrateTract(tract, { signal, now = new Date() } = {}) {
  const insight = buildTractInsightFromStore(tract);
  const userPrompt = buildUserPrompt(tract, insight, now);
  const raw = await callNarrationAPI(SYSTEM_PROMPT, userPrompt, signal);
  assertDocAligned(raw);
  return { text: raw, tractId: tract.id };
}
```

**Moved out:** the inline `runDocAlignmentTests()` block → put it in `core/__tests__/docAlignment.test.js`. Same assertions, doesn't cost you a module import in production.

---

## 4. `core/solutionConnector.js`

**What it does (1 line):** Generates 4 "solution" recommendations per tract — LLM first, rule-based fallback, cached.

**Issues:**
- Imports from `../data/philadelphiaBuildings` — that file is being deleted in Phase 1
- The rule templates are long but they're the value — can't cut content
- Repeated 4-tuple shape across three branches can be factored

**Simplified** (only the parts that change):

```js
// ⚠ import path changes in Phase 1
import { PHILADELPHIA_BUILDINGS } from '../data/buildings.js';

// …pools + helpers unchanged…

const template = (title, description, why_it_connects, asset) => ({
  title, description, why_it_connects, ...assetRef(asset),
});

function ruleBasedRecs(tract) {
  const { centroid, innovationIndex = 0, outcomeIndex = 0, cbs = 5, mismatchAlert } = tract;

  const uni     = nearest(UNIVERSITIES, centroid);
  const hosp    = nearest(HOSPITALS,    centroid);
  const incub   = nearest(INCUBATORS,   centroid);
  const vc      = nearest(VC_HUBS,      centroid);
  const transit = TRANSIT[0];

  if (mismatchAlert || (innovationIndex > 0.5 && outcomeIndex < 0.45)) {
    return [
      template('Workforce Pipeline Program',
        `Partner ${uni?.name ?? 'nearby university'} with local workforce development to place residents into research and tech jobs.`,
        'Directly links the innovation anchor driving the CBS score to residents who are not yet benefiting.',
        uni),
      template('Transit Access Expansion',
        'Improve last-mile connectivity between this neighborhood and the innovation corridor via expanded bus or bike routes.',
        'Physical access to jobs is the #1 barrier cited in tracts near major employment hubs with low mobility scores.',
        transit),
      template('Small Business Incubator Access',
        `Provide subsidized cohort slots at ${incub?.name ?? 'local incubator'} reserved for founders from this census tract.`,
        'VC deal flow is concentrated nearby but community entrepreneurs lack on-ramps to existing capital networks.',
        incub ?? vc),
      template('Affordable Housing Near Innovation Zone',
        'Create a community land trust or inclusionary zoning covenant on parcels within 0.5 miles of the research anchor.',
        'Rising innovation density drives displacement; locking in affordable units preserves resident economic benefit.',
        hosp),
    ];
  }

  if (cbs < 4) {
    return [
      template('Tech Literacy & Digital Skills Hub',
        `Establish a community digital-skills center in partnership with ${uni?.name ?? 'area universities'}.`,
        'Building local human capital is the first step toward drawing innovation investment to underserved areas.',
        uni),
      template('Community Health Outreach',
        `Expand ${hosp?.name ?? 'local hospital'} satellite health services into the neighborhood to address preventable conditions that limit workforce participation.`,
        'Health outcomes strongly predict economic mobility — connecting residents to care builds the preconditions for economic growth.',
        hosp),
      template('Neighborhood Micro-Enterprise Fund',
        `Create a $2M revolving micro-loan fund administered through ${vc?.name ?? 'area VC networks'} for resident-owned businesses.`,
        'Micro-enterprise activity raises local income and creates demand for innovation services, seeding a virtuous cycle.',
        vc),
      template('Innovation Corridor Anchor Strategy',
        `Work with ${incub?.name ?? 'UC Science Center'} to open a satellite co-working space in this tract.`,
        'Physical presence of innovation activity is the highest-leverage action for raising the CBS in an unserved tract.',
        incub),
    ];
  }

  return [
    template('Expand Local Hiring Commitments',
      `Negotiate community benefit agreements with ${uni?.name ?? 'anchor institutions'} requiring 30 % local hire targets for all new construction and service contracts.`,
      'Formalizing hiring pipelines sustains CBS gains and insulates residents from future displacement.',
      uni),
    template('Community Equity Fund',
      `Launch a neighborhood investment fund backed by ${vc?.name ?? 'local venture capital'} with resident advisory governance.`,
      'Shared ownership of innovation returns converts economic activity into durable community wealth.',
      vc),
    template('Affordable Commercial Space Preservation',
      `Designate ground-floor commercial space at ${incub?.name ?? 'Pennovation Works'} for below-market lease to resident-owned businesses.`,
      'Protecting affordable commercial space prevents the "innovation premium" from pricing out local entrepreneurs.',
      incub),
    template('Community Health Partnership Expansion',
      `Scale ${hosp?.name ?? 'anchor hospital'} community health worker program to reach every block in the tract.`,
      'Health access is the most underinvested lever in already-aligned tracts — closing it prevents future CBS regression.',
      hosp),
    ],
  ];
}
```

Same output, one helper, all three branches read as parallel structures.

---

## Summary table

| File | Lines before | Lines after | What was cut |
|---|---|---|---|
| `core/cbs.js` | ~110 | ~85 | Verbose haversine, duplicate normalize, redundant branching |
| `core/insightEngine.js` | ~180 | ~120 | Header essay, dead Phase 2 stub, inline test suite |
| `core/narrateInsight.js` | ~290 | ~150 | Header essay, expanded prompt boilerplate, inline test suite |
| `core/solutionConnector.js` | ~180 | ~150 | Redundant object literals, tighter templates |

## Decisions only you can make

1. **Which CBS engine survives?** `core/cbs.js` (haversine) or the data-layer one (gaussian)? They produce different scores on the same input. You cannot keep both and have a coherent app.
2. **Are the inline dev-test runners worth keeping?** They run on every `import` in dev — real cost in startup time. Move to `__tests__/` and run them with `vitest` or `node --test`. That's a Phase 2 concern, but flag it now.
3. **Where do `core/*` files get their building data after Phase 1?** All four currently import from paths that are changing (`data/config.js`, `data/philadelphiaBuildings`). Budget for those import fixes in the same commit.

Want me to write the Phase 1.5 prompt that (a) collapses the two CBS engines into one, and (b) moves the dev test runners into proper test files?