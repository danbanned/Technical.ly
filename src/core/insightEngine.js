/**
 * insightEngine.js — technical.me · Philadelphia Pilot
 * ----------------------------------------------------------------------------
 * Generates the click-to-inspect "insight" text for a census tract.
 *
 * DOC ALIGNMENT (this is the whole point of the file):
 *   • The doc's Insights Engine asks for "opportunity gaps", "emerging hubs",
 *     "high investment + low mobility" — i.e. PRESENT-TENSE observations about
 *     whether nearby innovation is reaching residents. This file produces those.
 *   • The doc puts COMMUNITY MEMBERS first and frames the product around whether
 *     innovation benefits the people who ALREADY live there. So insights are
 *     written for a resident, never for a buyer/investor.
 *   • Prediction, forecasting and scenario features are explicitly Phase 2.
 *
 * THEREFORE this engine NEVER says: prices will rise, buy here, good investment,
 * returns, get in early, appreciate, flip, etc. A guard (assertDocAligned)
 * blocks that language at runtime so it can't sneak in via future edits.
 *
 * Input: a tract from seedData.js (the integrated PHILADELPHIA.tracts), with
 *   { communityBenefitScore, innovationIndex, outcomeIndex, mismatchAlert,
 *     residentOutcomes:{medianHouseholdIncome, unemploymentRate, ...},
 *     innovationInputs:{nearbyRdSpending, vcDealDensity, ...},
 *     gapFlag? }  — extra fields are ignored.
 * ----------------------------------------------------------------------------
 */

/* ── thresholds (match plainLanguageSummary in seedData.js) ─────────────── */
const INNOVATION_HIGH = 0.45;
const OUTCOME_HIGH     = 0.55;

/* ── guard: language that is OFF-DOC and must never appear in output ─────── */
const BANNED_PATTERNS = [
  // Predictive / investment-advice language
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

  // Staleness false-update language — AI must report data age, never claim to have changed it.
  // Pattern 1: "I've updated / I have refreshed / I corrected ..."
  /\bI(?:'ve| have) (?:updated|refreshed|corrected|revised|fixed)\b/i,
  // Pattern 2: "I updated / I corrected / I fixed ..." — any direct-past claim of AI agency
  /\bI (?:just |now )?(?:updated|corrected|fixed|changed|revised|refreshed)\b/i,
  // Pattern 3: "data has been updated to reflect / as of today" (AI-caused update framing)
  /\b(?:data|figures?|numbers?) (?:has|have) been (?:updated|refreshed|corrected) (?:to reflect|as of)\b/i,
];

/**
 * Dev guard. Throws if any generated string uses predictive / investment-advice
 * language. Call in tests/CI; it's a no-op cost in production if you skip it.
 */
export function assertDocAligned(...strings) {
  for (const s of strings) {
    if (typeof s !== 'string') continue;
    for (const re of BANNED_PATTERNS) {
      if (re.test(s)) {
        throw new Error(`insightEngine: off-doc (predictive/investment/false-update) phrasing detected: "${s}"`);
      }
    }
  }
  return true;
}

/* ── formatting helpers ─────────────────────────────────────────────────── */
const money = v =>
  v >= 1e9 ? `$${(v / 1e9).toFixed(2).replace(/\.?0+$/, '')}B`
  : v >= 1e6 ? `$${(v / 1e6).toFixed(0)}M`
  : `$${Math.round(v).toLocaleString()}`;

/* ── insight categories (mapped to the doc's Insights Engine) ───────────── */
export const INSIGHT_CATEGORY = {
  OPPORTUNITY_GAP:   'opportunity_gap',     // high innovation, low resident outcomes (mismatch)
  ALIGNED_BENEFIT:   'aligned_benefit',     // high innovation, strong outcomes
  STRONG_LOCAL:      'strong_local',        // strong outcomes, little nearby innovation
  UNDERSERVED:       'underserved',         // low innovation + low outcomes
};

/**
 * Build the doc-aligned insight for a tract.
 * Returns a structured object the panel can render directly. All copy is
 * present-tense and community-benefit framed.
 */
export function buildTractInsight(tract, { runGuard = false } = {}) {
  const ii = tract.innovationIndex;
  const oi = tract.outcomeIndex;
  const innHi = ii >= INNOVATION_HIGH;
  const outHi = oi >= OUTCOME_HIGH;
  const isMismatch = tract.mismatchAlert ?? (innHi && oi < 0.40);

  const rd = tract.innovationInputs?.nearbyRdSpending ?? 0;
  const vc = Math.round(tract.innovationInputs?.vcDealDensity ?? 0);
  const income = tract.residentOutcomes?.medianHouseholdIncome;
  const unemp = tract.residentOutcomes?.unemploymentRate;

  let category, badge, headline, resident, builder;

  if (isMismatch || (innHi && !outHi)) {
    category = INSIGHT_CATEGORY.OPPORTUNITY_GAP;
    badge = { label: 'Opportunity gap', tone: 'alert' };
    headline = 'High innovation nearby — resident outcomes lag';
    resident = 'This neighborhood is close to major research and investment activity, but local incomes and mobility are below the city median.';
    builder  = 'A candidate area for workforce development, training, or hiring partnerships — innovation is present but not yet reaching residents here.';
  } else if (innHi && outHi) {
    category = INSIGHT_CATEGORY.ALIGNED_BENEFIT;
    badge = { label: 'Innovation reaching residents', tone: 'positive' };
    headline = 'Nearby innovation and resident outcomes are aligned';
    resident = 'This neighborhood sits near significant research and investment activity, and local incomes and mobility are tracking with it.';
    builder  = 'A reference case — useful for understanding what alignment between innovation activity and community benefit looks like.';
  } else if (!innHi && outHi) {
    category = INSIGHT_CATEGORY.STRONG_LOCAL;
    badge = { label: 'Strong outcomes', tone: 'neutral' };
    headline = 'Solid resident outcomes, limited nearby innovation';
    resident = 'Resident outcomes here are relatively strong, though there is little research or startup activity directly nearby.';
    builder  = 'Outcomes are being driven by factors other than the innovation economy measured here.';
  } else {
    category = INSIGHT_CATEGORY.UNDERSERVED;
    badge = { label: 'Limited activity', tone: 'neutral' };
    headline = 'Limited innovation nearby, outcomes below median';
    resident = tract.gapFlag
      ? 'There is no major university or hospital research anchor near this neighborhood, and resident outcomes are below the city median.'
      : 'There is little research or startup activity near this neighborhood, and resident outcomes are below the city median.';
    builder  = 'A candidate area for new investment, anchor partnerships, or program expansion.';
  }

  // present-tense factual chips (no projections)
  const facts = [
    { label: 'Community Benefit Score', value: `${tract.communityBenefitScore} / 10` },
    { label: 'R&D spend nearby', value: money(rd) },
    { label: 'VC deals nearby', value: `${vc}` },
  ];
  if (income != null) facts.push({ label: 'Median household income', value: `$${income.toLocaleString()}` });
  if (unemp != null)  facts.push({ label: 'Unemployment rate', value: `${unemp}%` });

  const insight = {
    category,
    badge,
    headline,
    resident,                       // primary, community-member-facing
    builder,                        // secondary, ecosystem-builder framing
    facts,
    timeframe: 'present',           // snapshot, NOT a forecast
    dataNote: 'Snapshot of current conditions. Not a forecast.',
    guardrail: 'present-tense, community-benefit framed; no predictive or investment advice',
  };

  if (runGuard) assertDocAligned(insight.headline, insight.resident, insight.builder);
  return insight;
}

/* ════════════════════════════════════════════════════════════════════════
 * PHASE 2 (DISABLED) — trend insights.
 * A doc-aligned forward-looking signal is ONLY acceptable as a clearly-labeled
 * HISTORICAL trend ("resident outcomes here improved over the last N years"),
 * never a promise, and only once real multi-year data exists. Off by default.
 * ════════════════════════════════════════════════════════════════════════ */
export const PHASE2_TREND_INSIGHTS_ENABLED = false;

export function buildTrendInsight(/* tractHistory */) {
  if (!PHASE2_TREND_INSIGHTS_ENABLED) {
    return null; // gated: needs real time-series; do not fabricate trends
  }
  // When enabled: describe OBSERVED historical change only, e.g.
  //   "Resident outcomes here rose from CBS 4.1 to 5.6 between 2019 and 2024."
  // Never phrase as a prediction or recommendation.
}

/* ════════════════════════════════════════════════════════════════════════
 * Store adapter
 * The store tracts use flat fields and slightly different key names.
 * This maps them to the nested shape buildTractInsight expects without
 * changing any upstream data or the engine itself.
 *
 * Store tract → insightEngine shape:
 *   tract.cbs                → communityBenefitScore
 *   tract.medianIncome       → residentOutcomes.medianHouseholdIncome
 *   tract.unemploymentRate   → residentOutcomes.unemploymentRate (×100 → percent)
 *   tract.rdSpendNearby      → innovationInputs.nearbyRdSpending
 *   tract.vcDealsNearby      → innovationInputs.vcDealDensity
 * ════════════════════════════════════════════════════════════════════════ */
export function buildTractInsightFromStore(tract, opts = {}) {
  return buildTractInsight(
    {
      communityBenefitScore: tract.cbs,
      innovationIndex:       tract.innovationIndex,
      outcomeIndex:          tract.outcomeIndex,
      mismatchAlert:         tract.mismatchAlert,
      gapFlag:               tract.gapFlag,
      residentOutcomes: {
        medianHouseholdIncome: tract.medianIncome,
        // unemploymentRate in store is a decimal (0.085 = 8.5%); engine expects percent
        unemploymentRate: tract.unemploymentRate != null
          ? +((tract.unemploymentRate * 100).toFixed(1))
          : undefined,
      },
      innovationInputs: {
        nearbyRdSpending: tract.rdSpendNearby,
        vcDealDensity:    tract.vcDealsNearby,
      },
    },
    opts,
  );
}
